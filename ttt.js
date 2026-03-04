(async function() {
    // 1. PREVENT DUPLICATES (If you run the script twice, it won't spawn two widgets)
    if (document.getElementById('lab-deployer-widget')) {
        document.getElementById('lab-deployer-widget').remove();
    }

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. INJECT EXACT CSS
    const style = document.createElement('style');
    style.textContent = `
        #lab-deployer-widget {
          position: fixed; top: 20px; left: 20px; width: 550px; height: 480px; 
          z-index: 2147483647 !important; background: #ffffff;
          border: 1px solid #ddd; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
          isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
          min-width: 260px; min-height: 45px; touch-action: none;
        }
        #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }

        #widget-main { display: flex; flex-direction: column; flex-grow: 1; }

        .resizer {
          width: 15px; height: 15px; position: absolute; right: 2px; bottom: 2px;
          cursor: nwse-resize; z-index: 2147483648;
          background-image: linear-gradient(135deg, transparent 20%, #bbb 20%, #bbb 35%, transparent 35%, transparent 50%, #bbb 50%, #bbb 65%, transparent 65%);
          background-size: 10px 10px;
        }

        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; height: 45px; cursor: move; user-select: none; flex-shrink: 0; }
        .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }

        .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; }
        .tabs::-webkit-scrollbar { display: none; }
        .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; white-space: nowrap; }
        .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }

        .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .lab-hidden { display: none !important; }

        .timer-box { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
        .base-timer { position: relative; width: 60px; height: 60px; }
        .base-timer__svg { transform: scaleX(-1); }
        .base-timer__circle { fill: none; stroke: none; }
        .base-timer__path-elapsed { stroke-width: 7px; stroke: #eee; }
        .base-timer__path-remaining { stroke-width: 7px; stroke-linecap: round; transform: rotate(90deg); transform-origin: center; transition: 1s linear all; fill-rule: nonzero; stroke: currentColor; }
        .base-timer__path-remaining.green { color: #28a745; }
        .base-timer__path-remaining.orange { color: #fd7e14; }
        .base-timer__path-remaining.red { color: #dc3545; }
        .base-timer__label { position: absolute; width: 60px; height: 60px; top: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; font-family: monospace; color: #333; }

        /* FIX: Added text-align: left; to ensure terminal text is properly aligned */
        #copyContainer { position: relative; background: #1c1c1c; color: #eee; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; text-align: left; }
        #CommandtoPasteRun { white-space: pre-wrap; word-break: break-all; margin: 0; color: #00ff00; max-height: 180px; overflow-y: auto; text-align: left; }
        #instructionText { margin-top: 10px; font-size: 11px; color: #00f9e2; border-top: 1px solid #333; padding-top: 8px; line-height: 1.4; text-align: left; }

        .status-actions { display: flex; gap: 10px; margin-top: 15px; }
        .btn-ext { background: #28a745; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }
        .btn-des { background: darkred; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }

        .credit-card-box { text-align:center; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; }
        .contact-box { text-align: center; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; }
        .email-link { color: #007bff; font-weight: bold; text-decoration: none; font-size: 14px; display: block; margin: 10px 0; }
        .btn-email { display: inline-block; background: #007bff; color: white; padding: 8px 16px; border-radius: 5px; text-decoration: none; font-size: 12px; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // 4. INJECT EXACT HTML
    const widget = document.createElement('div');
    widget.id = 'lab-deployer-widget';
    widget.innerHTML = `
      <div class="widget-header" id="drag-handle">
        <div style="display: flex; align-items: center; pointer-events: none;">
          <span class="status-indicator"></span>
          <h4 style="margin:0; font-size:14px; color: #333;">CyberXPT Lab</h4>
        </div>
        <button id="toggle-visibility-btn" style="background:none; border:none; cursor:pointer; font-size: 20px; font-weight: bold; color: #666; width:30px; position: relative; z-index: 10;">−</button>
      </div>
      <div id="widget-main">
        <div class="tabs" id="auth-tabs" style="display:none;">
          <button class="tab-btn active" id="tab-deploy">Deployer</button>
          <button class="tab-btn" id="tab-status">Live Status</button>
          <button class="tab-btn" id="tab-credits">Credits</button>
          <button class="tab-btn" id="tab-contact">Contact Us</button>
        </div>
        <div class="content-area">
          <div id="logged-out-view" style="display:none; text-align: center; padding: 20px;">
            <p style="font-size: 13px;">Please login to continue</p>
            <button id="loginBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
          </div>
          
          <div id="deploy-tab-content" class="tab-content">
            <label style="font-size:12px; color:#666; display:block; margin-bottom:5px;">Select Chapter:</label>
            <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc;"><option value="invalid">Loading Labs...</option></select>
            <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
            <div id="deploy-loader" style="display:none; text-align:center; margin-top:10px; color:#007bff; font-weight:bold; font-size:12px;">⏳ Sending Request...</div>
            <div id="output" style="font-size: 12px; margin-top:10px; color:#007bff; white-space: pre-wrap;"></div>
          </div>

          <div id="status-tab-content" class="tab-content lab-hidden">
            <div id="copyContainer" style="display:none;">
              <div style="color: #aaa; margin-bottom: 5px; font-size: 10px;">REMOTE TERMINAL ACCESS:</div>
              <button id="copyBtn" style="position:absolute; top:8px; right:8px; background:none; border:none; cursor:pointer; font-size:16px;">📋</button>
              <span id="copyStatus" style="position:absolute; top:10px; right:35px; color:lightgreen; font-size:10px; display:none;">Copied!</span>
              <pre id="CommandtoPasteRun" data-copy=""></pre>
              <div id="instructionText"></div>
            </div>
            <div id="no-lab-msg" style="text-align: center; padding: 20px; color: #666; font-size: 13px;">ℹ️ Checking lab status...</div>
            <div id="active-timer-section" style="display:none;">
              <div class="timer-box">
                <div class="base-timer">
                  <svg class="base-timer__svg" viewBox="0 0 100 100"><g class="base-timer__circle"><circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle><path id="base-timer-path-remaining" stroke-dasharray="283" class="base-timer__path-remaining green" d="M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0"></path></g></svg>
                  <span id="base-timer-label" class="base-timer__label">00:00:00</span>
                </div>
                <div style="font-size: 12px;">
                  <div id="status-msg" style="font-weight:bold; color: #333;">Lab Active</div>
                  <div style="color:#666; font-size:11px;">Auto-Teardown Timer</div>
                </div>
              </div>
              <div class="status-actions">
                <button class="btn-ext" id="extendBtn">⏩ Extend</button>
                <button class="btn-des" id="destroyBtn">🗑️ Destroy</button>
              </div>
            </div>
          </div>

          <div id="credits-tab-content" class="tab-content lab-hidden">
            <div class="credit-card-box">
              <div style="font-size: 12px; color: #666;">Account Subscription</div>
              <div id="subscription-status" style="font-size: 24px; font-weight: bold; color: #166534; margin: 10px 0;">Fetching...</div>
              <div id="expiry-notice" style="font-size: 11px; color: #dc3545; margin-top: 10px; font-style: italic;"></div>
            </div>
          </div>

          <div id="contact-tab-content" class="tab-content lab-hidden">
            <div class="contact-box">
              <p style="font-size: 13px; color: #475569;">Encountered an issue or have an enquiry?</p>
              <a href="mailto:info@cyberxpt.com" class="email-link">info@cyberxpt.com</a>
              <a href="mailto:info@cyberxpt.com?subject=Lab Enquiry" class="btn-email">📧 Send Email</a>
              <p style="font-size: 11px; color: #94a3b8; margin-top: 15px;">Include your Student ID for faster support.</p>
            </div>
          </div>

          <div id="footer-actions" style="margin-top:auto; border-top:1px solid #eee; padding-top:10px; display:none; text-align: right;">
            <button id="logoutBtn" style="font-size: 11px; background: none; border: none; color: #dc3545; cursor: pointer;">Sign Out</button>
          </div>
        </div>
      </div>
      <div class="resizer" id="resizer-handle"></div>
    `;
    
    // Append the widget to the DOM safely
    document.body.appendChild(widget);

    // 5. EXACT FIREBASE LOGIC & UI BEHAVIORS
    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    let countdownInterval = null;
    let pollInterval = null;
    const FULL_DASH_ARRAY = 283;

    // --- UI RESET HELPER ---
    const resetLiveStatusUI = () => {
      const noLabMsg = document.getElementById("no-lab-msg");
      const copyBox = document.getElementById("copyContainer");
      const timerSect = document.getElementById("active-timer-section");
      const terminal = document.getElementById("CommandtoPasteRun");
      const instructions = document.getElementById("instructionText");

      noLabMsg.style.display = "block";
      noLabMsg.innerText = "ℹ️ There is no lab running";
      copyBox.style.display = "none";
      timerSect.style.display = "none";
      terminal.innerHTML = "";
      terminal.setAttribute("data-copy", "");
      instructions.innerHTML = "";
      
      clearInterval(countdownInterval);
      stopPolling();
    };

    const startPolling = () => {
      stopPolling();
      pollInterval = setInterval(() => checkDeploymentStatus(true), 20000); 
    };
    const stopPolling = () => { clearInterval(pollInterval); pollInterval = null; };

    // --- UI UPDATE (Handles Building vs Deployed vs Empty states) ---
    const updateUI = (data) => {
      if (!data) return;
      const noLabMsg = document.getElementById("no-lab-msg");
      const copyBox = document.getElementById("copyContainer");
      const timerSect = document.getElementById("active-timer-section");
      const terminal = document.getElementById("CommandtoPasteRun");
      const instructions = document.getElementById("instructionText");

      const isDeploying = sessionStorage.getItem("is_deploying") === "true";

      if (data.deployed) {
        // SUCCESS: Lab is live
        sessionStorage.removeItem("is_deploying"); 
        noLabMsg.style.display = "none";
        copyBox.style.display = "block";
        timerSect.style.display = "block";
        terminal.setAttribute("data-copy", data.command);
        terminal.innerHTML = data.terminal;
        instructions.innerHTML = data.instruction || "";
        startDestroyCountdown(data.destroy_time, data.start_time);
        stopPolling();
      } else if (isDeploying) {
        // PERSISTENCE: Still building
        copyBox.style.display = "none";
        timerSect.style.display = "none";
        noLabMsg.style.display = "block";
        noLabMsg.innerText = "⏳ Lab is building (approx 5 mins)...";
        startPolling(); 
      } else {
        // RESET: No lab and not currently building
        resetLiveStatusUI();
        const activeTab = document.querySelector('.tab-btn.active');
        if (activeTab && activeTab.id === 'tab-status') {
          switchTab('deploy');
        }
      }
    };

    // --- DUAL-LAYER FETCHING (Storage First -> Background API Truth) ---
    const checkDeploymentStatus = async (forceFetch = false, initialLoad = false) => {
      const cached = sessionStorage.getItem("lab_status");
      const isDeploying = sessionStorage.getItem("is_deploying") === "true";
      let hasActiveState = false;

      // 1. Check local storage state first for instant UI response
      if (isDeploying) {
        updateUI({ deployed: false }); 
        hasActiveState = true;
        if (initialLoad) switchTab('status');
      } else if (cached && !forceFetch) {
        const cachedData = JSON.parse(cached);
        if (cachedData.deployed) {
          updateUI(cachedData);
          hasActiveState = true;
          if (initialLoad) switchTab('status');
        }
      }

      // 2. Secret background sync to confirm absolute truth
      if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          const res = await fetch("https://labdep.tehwinsam.com/api/status", {
            method: "POST", 
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
          });
          const freshData = await res.json();
          
          // Always store the latest truth
          sessionStorage.setItem("lab_status", JSON.stringify(freshData));
          
          // Update UI with fresh data
          updateUI(freshData);
          
          // If API found a lab we didn't know about in cache, switch now
          if (!hasActiveState && initialLoad && freshData.deployed) {
            switchTab('status');
          }
        } catch (e) {
          console.error("Background sync error", e);
        }
      }
    };

    function startDestroyCountdown(destroyTimeISO, startTimeISO) {
      clearInterval(countdownInterval);
      const dTime = new Date(destroyTimeISO).getTime();
      const sTime = new Date(startTimeISO).getTime();
      const totalDuration = (dTime - sTime) / 1000;
      const label = document.getElementById("base-timer-label");
      const path = document.getElementById("base-timer-path-remaining");

      countdownInterval = setInterval(() => {
        const timeLeft = (dTime - Date.now()) / 1000;
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          label.innerText = "00:00:00";
          path.setAttribute("stroke-dasharray", `0 ${FULL_DASH_ARRAY}`);
          checkDeploymentStatus(true);
          return;
        }
        const h = Math.floor(timeLeft / 3600), m = Math.floor((timeLeft % 3600) / 60), s = Math.floor(timeLeft % 60);
        label.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        path.classList.remove("green", "orange", "red");
        if (timeLeft <= 300) path.classList.add("red");
        else if (timeLeft <= 600) path.classList.add("orange");
        else path.classList.add("green");
        path.setAttribute("stroke-dasharray", `${((timeLeft / totalDuration) * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`);
      }, 1000);
    }

    const switchTab = (tab) => {
      ['deploy', 'status', 'credits', 'contact'].forEach(t => {
        const content = document.getElementById(`${t}-tab-content`);
        const btn = document.getElementById(`tab-${t}`);
        if(content) content.classList.add('lab-hidden');
        if(btn) btn.classList.remove('active');
      });
      
      const targetContent = document.getElementById(`${tab}-tab-content`);
      const targetBtn = document.getElementById(`tab-${tab}`);
      if(targetContent) targetContent.classList.remove('lab-hidden');
      if(targetBtn) targetBtn.classList.add('active');

      widget.style.width = "550px";
      widget.style.height = "480px";

      if (tab === 'status') checkDeploymentStatus();
      if (tab === 'credits') fetchSubscription();
    };

    document.getElementById('tab-deploy').onclick = () => switchTab('deploy');
    document.getElementById('tab-status').onclick = () => switchTab('status');
    document.getElementById('tab-credits').onclick = () => switchTab('credits');
    document.getElementById('tab-contact').onclick = () => switchTab('contact');
    
    document.getElementById('toggle-visibility-btn').onclick = () => {
      const main = document.getElementById('widget-main');
      main.classList.toggle('lab-hidden');
      widget.classList.toggle('lab-hidden-state');
      document.getElementById('toggle-visibility-btn').textContent = main.classList.contains('lab-hidden') ? '+' : '−';
    };

    document.getElementById('deployBtn').onclick = async () => {
      const btn = document.getElementById('deployBtn');
      const loader = document.getElementById('deploy-loader');
      btn.disabled = true; loader.style.display = "block";
      
      sessionStorage.setItem("is_deploying", "true");
      switchTab('status');
      
      const idToken = await auth.currentUser.getIdToken();
      try {
        await fetch("https://labdep.tehwinsam.com/api/deploy", {
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
          body: JSON.stringify({ chapter: document.getElementById("chapter").value })
        });
        loader.style.display = "none"; 
        btn.disabled = false;
        // Background check will eventually see 'deployed: true' and flip the UI
      } catch (e) { 
        btn.disabled = false; 
        loader.style.display = "none";
        sessionStorage.removeItem("is_deploying");
        document.getElementById("no-lab-msg").innerText = "❌ Deployment failed."; 
      }
    };

    document.getElementById('destroyBtn').onclick = async () => {
      if (!confirm("Are you sure you want to destroy this lab?")) return;
      const idToken = await auth.currentUser.getIdToken();
      
      // UI Feedback: Wipe and switch immediately
      resetLiveStatusUI(); 
      sessionStorage.removeItem("lab_status"); 
      sessionStorage.removeItem("is_deploying");
      switchTab('deploy');

      await fetch("https://labdep.tehwinsam.com/api/destroy", { 
        method: "POST", 
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` } 
      });
    };

    document.getElementById('extendBtn').onclick = async () => {
      const btn = document.getElementById("extendBtn");
      const originalText = btn.innerText;
      btn.disabled = true; btn.innerText = "⏳ Extending...";
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/extend", { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` } 
        });
        if (res.ok) { 
          await checkDeploymentStatus(true); 
          alert("✅ Success: Extended!"); 
        }
      } catch (e) { alert("❌ Connection error."); }
      finally { btn.disabled = false; btn.innerText = originalText; }
    };

    document.getElementById('copyBtn').onclick = () => {
      navigator.clipboard.writeText(document.getElementById("CommandtoPasteRun").getAttribute("data-copy"));
      const s = document.getElementById("copyStatus"); 
      s.style.display = "inline"; 
      setTimeout(() => s.style.display = "none", 1500);
    };

    async function fetchSubscription() {
      if(!auth.currentUser) return;
      const subEl = document.getElementById("subscription-status");
      const expiryEl = document.getElementById("expiry-notice");
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/subscription", { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` } 
        });
        const data = await res.json();
        subEl.innerText = data.msg || "0 Credits";
        if (data.expiry) {
          const dateObj = new Date(data.expiry);
          expiryEl.innerHTML = `⚠️ Lab access expires on <strong>${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`;
        } else { expiryEl.innerText = ""; }
      } catch (e) { subEl.innerText = "Error loading credits"; }
    }

    async function loadChapters() {
      try {
        const currentUrl = window.location.href;
        const idMatch = currentUrl.match(/ebook([0-9a-f]{24})/i);
        if (!idMatch) {
          document.getElementById("chapter").innerHTML = '<option value="invalid">No unit ID detected</option>';
          return;
        }
        const unitId = idMatch[1];
        const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/${unitId}.txt`);
        if (!res.ok) throw new Error();
        const text = await res.text();
        const lines = text.split("\n").filter(l => l.trim());
        let optionsHtml = "";
        lines.forEach(line => {
          const parts = line.split(",");
          const val = parts[0].trim();
          const label = parts[1] ? parts[1].trim() : val;
          optionsHtml += `<option value="${val}">${label}</option>`;
        });
        document.getElementById("chapter").innerHTML = optionsHtml || '<option value="invalid">Unit file is empty</option>';
      } catch (e) { document.getElementById("chapter").innerHTML = '<option value="invalid">No labs available</option>'; }
    }

    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
    document.getElementById('logoutBtn').onclick = () => { signOut(auth); sessionStorage.clear(); };

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        document.getElementById("logged-out-view").style.display = "none";
        document.getElementById("auth-tabs").style.display = "flex";
        document.getElementById("footer-actions").style.display = "block";
        document.getElementById("deploy-tab-content").classList.remove('lab-hidden');
        await loadChapters();
        
        // Trigger dual-layer status check on login/refresh
        checkDeploymentStatus(false, true); 
      } else {
        document.getElementById("logged-out-view").style.display = "block";
        document.getElementById("auth-tabs").style.display = "none";
        document.getElementById("footer-actions").style.display = "none";
        document.getElementById("deploy-tab-content").classList.add('lab-hidden');
        ['status', 'credits', 'contact'].forEach(t => {
            const c = document.getElementById(`${t}-tab-content`);
            if(c) c.classList.add('lab-hidden');
        });
        clearInterval(countdownInterval);
        stopPolling();
      }
    });

    function initInteractions(el) {
      let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
      const header = document.getElementById("drag-handle");
      const resizer = document.getElementById("resizer-handle");

      const startDrag = (e) => {
        if (e.target.id === 'toggle-visibility-btn') return;
        const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        p3 = x; p4 = y;
        document.onmousemove = document.ontouchmove = (ev) => {
          const cx = ev.clientX || (ev.touches ? ev.touches[0].clientX : 0);
          const cy = ev.clientY || (ev.touches ? ev.touches[0].clientY : 0);
          p1 = p3 - cx; p2 = p4 - cy; p3 = cx; p4 = cy;
          el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, el.offsetTop - p2)) + "px";
          el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, el.offsetLeft - p1)) + "px";
        };
        document.onmouseup = document.ontouchend = () => { document.onmousemove = document.ontouchmove = null; };
      };

      const startResize = (e) => {
        e.preventDefault();
        const sw = el.offsetWidth, sh = el.offsetHeight;
        const sx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
        const sy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
        document.onmousemove = document.ontouchmove = (ev) => {
          const cx = ev.clientX || (ev.touches ? ev.touches[0].clientX : 0);
          const cy = ev.clientY || (ev.touches ? ev.touches[0].clientY : 0);
          if (sw + (cx - sx) > 260) el.style.width = (sw + (cx - sx)) + "px";
          if (sh + (cy - sy) > 45) el.style.height = (sh + (cy - sy)) + "px";
        };
        document.onmouseup = document.ontouchend = () => { document.onmousemove = document.ontouchmove = null; };
      };

      header.onmousedown = header.ontouchstart = startDrag;
      resizer.onmousedown = resizer.ontouchstart = startResize;
    }
    initInteractions(widget);

})();

(function() {
  // 1. INJECT UPDATED CSS (Including Resize Handle and Flexible Sizing)
  const style = document.createElement('style');
  style.textContent = `
    #lab-deployer-widget {
      position: fixed; top: 20px; left: 20px; width: 320px;
      z-index: 2147483647 !important; background: #ffffff;
      border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
      isolation: isolate; overflow: hidden;
      touch-action: none; display: flex; flex-direction: column;
      min-width: 200px; min-height: 45px;
    }
    #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
    
    /* The Resize Handle */
    .resizer {
      width: 15px; height: 15px; position: absolute; right: 0; bottom: 0;
      cursor: nwse-resize; z-index: 2147483648;
    }

    .widget-header { 
      padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; 
      display: flex; justify-content: space-between; align-items: center; height: 45px; 
      cursor: move; user-select: none; flex-shrink: 0;
    }

    .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; vertical-align: middle; }
    @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }
    
    .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; white-space: nowrap; }
    .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }
    
    .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; }
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
    
    #copyContainer { position: relative; background: #1c1c1c; color: #eee; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; }
    #CommandtoPasteRun { white-space: pre-wrap; word-break: break-word; margin: 0; color: #00ff00; max-height: 180px; overflow-y: auto; }
    #instructionText { margin-top: 10px; font-size: 11px; color: #00f9e2; border-top: 1px solid #333; padding-top: 8px; line-height: 1.4; }
    
    .status-actions { display: flex; gap: 10px; margin-top: 15px; }
    .btn-ext { background: #28a745; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }
    .btn-des { background: darkred; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }
    
    .credit-card-box { text-align:center; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; }
    .contact-box { text-align: center; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; }
    .email-link { color: #007bff; font-weight: bold; text-decoration: none; font-size: 14px; display: block; margin: 10px 0; }
    .btn-email { display: inline-block; background: #007bff; color: white; padding: 8px 16px; border-radius: 5px; text-decoration: none; font-size: 12px; font-weight: bold; }
  `;
  document.head.appendChild(style);

  // 2. INJECT ORIGINAL HTML CONTENT
  const widgetDiv = document.createElement('div');
  widgetDiv.id = 'lab-deployer-widget';
  widgetDiv.innerHTML = `
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
        <div id="deploy-tab-content" class="tab-content lab-hidden">
          <label style="font-size:12px; color:#666;">Select Chapter:</label>
          <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc;"><option value="invalid">Loading Labs...</option></select>
          <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
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
          <div id="no-lab-msg" style="text-align: center; padding: 20px; color: #666; font-size: 13px;">ℹ️ There is no lab running</div>
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
              <button class="btn-ext" id="btn-extend-action">⏩ Extend</button>
              <button class="btn-des" id="btn-destroy-action">🗑️ Destroy</button>
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
        <div id="footer-actions" style="margin-top:15px; border-top:1px solid #eee; padding-top:10px; display:none; text-align: right;">
          <button id="signOutBtn" style="font-size: 11px; background: none; border: none; color: #dc3545; cursor: pointer;">Sign Out</button>
        </div>
      </div>
    </div>
    <div class="resizer" id="resizer-handle"></div>
  `;
  document.body.appendChild(widgetDiv);

  // 3. LOAD FIREBASE AND LOGIC
  const startApp = async () => {
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    let countdownInterval = null;
    const FULL_DASH_ARRAY = 283;

    // --- Interaction (Drag & Resize) ---
    const initInteractions = (el) => {
      let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
      const header = el.querySelector(".widget-header");
      const resizer = el.querySelector("#resizer-handle");

      header.onmousedown = (e) => {
        if (e.target.id === 'toggle-visibility-btn') return;
        e.preventDefault();
        p3 = e.clientX; p4 = e.clientY;
        document.onmouseup = () => { document.onmouseup = null; document.onmousemove = null; };
        document.onmousemove = (e) => {
          p1 = p3 - e.clientX; p2 = p4 - e.clientY;
          p3 = e.clientX; p4 = e.clientY;
          el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, el.offsetTop - p2)) + "px";
          el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, el.offsetLeft - p1)) + "px";
        };
      };

      resizer.onmousedown = (e) => {
        e.preventDefault();
        const startW = el.offsetWidth, startH = el.offsetHeight, startX = e.clientX, startY = e.clientY;
        document.onmousemove = (e) => {
          const nw = startW + (e.clientX - startX);
          const nh = startH + (e.clientY - startY);
          // Allows resizing to any size larger than the header/min-width
          if (nw > 200) el.style.width = nw + "px";
          if (nh > 45) el.style.height = nh + "px";
        };
        document.onmouseup = () => { document.onmousemove = null; };
      };
    };
    initInteractions(widgetDiv);

    // --- UI State Logic ---
    const switchTab = (tab) => {
      const widget = document.getElementById('lab-deployer-widget');
      ['deploy', 'status', 'credits', 'contact'].forEach(t => {
        document.getElementById(`${t}-tab-content`).classList.add('lab-hidden');
        document.getElementById(`tab-${t}`).classList.remove('active');
      });
      document.getElementById(`${tab}-tab-content`).classList.remove('lab-hidden');
      document.getElementById(`tab-${tab}`).classList.add('active');

      if (['status', 'credits', 'contact'].includes(tab)) {
        widget.style.width = "550px";
        widget.style.height = "480px";
        if (tab === 'status') checkDeploymentStatus();
        if (tab === 'credits') fetchSubscription();
      } else {
        widget.style.width = "320px";
        widget.style.height = "auto";
      }
    };

    const toggleWidgetView = () => {
      const main = document.getElementById('widget-main');
      const widget = document.getElementById('lab-deployer-widget');
      const btn = document.getElementById('toggle-visibility-btn');
      main.classList.toggle('lab-hidden');
      widget.classList.toggle('lab-hidden-state');
      btn.textContent = main.classList.contains('lab-hidden') ? '+' : '−';
    };

    // --- Auth & Data Logic ---
    const checkDeploymentStatus = async () => {
      if (!auth.currentUser) return;
      const idToken = await auth.currentUser.getIdToken();
      try {
        const res = await fetch("https://labdep.tehwinsam.com/api/status", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        const timerSect = document.getElementById("active-timer-section");
        const copyBox = document.getElementById("copyContainer");
        const noLab = document.getElementById("no-lab-msg");
        if (res.ok && data.deployed) {
          copyBox.style.display = "block"; timerSect.style.display = "block"; noLab.style.display = "none";
          document.getElementById("CommandtoPasteRun").setAttribute("data-copy", data.command);
          document.getElementById("CommandtoPasteRun").innerHTML = data.terminal;
          document.getElementById("instructionText").innerText = data.instruction || "";
          if (data.destroy_time) startDestroyCountdown(data.destroy_time, data.start_time);
        } else {
          copyBox.style.display = "none"; timerSect.style.display = "none"; noLab.style.display = "block";
          clearInterval(countdownInterval);
        }
      } catch (e) {}
    };

    const startDestroyCountdown = (destroyTimeISO, startTimeISO) => {
      clearInterval(countdownInterval);
      const dTime = new Date(destroyTimeISO).getTime();
      const sTime = new Date(startTimeISO).getTime();
      const total = (dTime - sTime) / 1000;
      countdownInterval = setInterval(() => {
        const left = (dTime - Date.now()) / 1000;
        if (left <= 0) { clearInterval(countdownInterval); checkDeploymentStatus(); return; }
        const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = Math.floor(left % 60);
        document.getElementById("base-timer-label").innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const path = document.getElementById("base-timer-path-remaining");
        path.classList.remove("green", "orange", "red");
        path.classList.add(left <= 300 ? "red" : (left <= 600 ? "orange" : "green"));
        path.setAttribute("stroke-dasharray", `${((left / total) * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`);
      }, 1000);
    };

    const fetchSubscription = async () => {
      if(!auth.currentUser) return;
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/subscription", {
          method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        document.getElementById("subscription-status").innerText = data.msg || "0 Credits";
        if (data.expiry) {
          const formattedDate = new Date(data.expiry).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          document.getElementById("expiry-notice").innerHTML = `⚠️ Lab access expires on <strong>${formattedDate}</strong>`;
        }
      } catch (e) {}
    };

    const loadChapters = async () => {
      const match = window.location.href.match(/ebook([0-9a-f]{24})/i);
      if (!match) return;
      try {
        const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/${match[1]}.txt`);
        const text = await res.text();
        const lines = text.split("\n").filter(l => l.trim());
        document.getElementById("chapter").innerHTML = lines.map(l => {
          const p = l.split(",");
          return `<option value="${p[0].trim()}">${(p[1] || p[0]).trim()}</option>`;
        }).join("");
      } catch (e) {}
    };

    // --- Events ---
    document.getElementById('toggle-visibility-btn').onclick = toggleWidgetView;
    document.getElementById('tab-deploy').onclick = () => switchTab('deploy');
    document.getElementById('tab-status').onclick = () => switchTab('status');
    document.getElementById('tab-credits').onclick = () => switchTab('credits');
    document.getElementById('tab-contact').onclick = () => switchTab('contact');
    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
    document.getElementById('signOutBtn').onclick = () => signOut(auth);
    document.getElementById('copyBtn').onclick = () => {
      navigator.clipboard.writeText(document.getElementById("CommandtoPasteRun").getAttribute("data-copy"));
      document.getElementById("copyStatus").style.display = "inline";
      setTimeout(() => document.getElementById("copyStatus").style.display = "none", 1500);
    };
    document.getElementById('deployBtn').onclick = async () => {
      document.getElementById("output").innerText = "⏳ Deploying...";
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("https://labdep.tehwinsam.com/api/deploy", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ chapter: document.getElementById("chapter").value })
      });
      if (res.ok) { document.getElementById("output").innerText = "🚀 Deployed!"; setTimeout(() => switchTab('status'), 800); }
      else document.getElementById("output").innerText = "❌ Error.";
    };
    document.getElementById('btn-destroy-action').onclick = async () => {
      if (!confirm("Destroy lab?")) return;
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("https://labdep.tehwinsam.com/api/destroy", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
      });
      if (res.ok) { clearInterval(countdownInterval); switchTab('deploy'); }
    };
    document.getElementById('btn-extend-action').onclick = async () => {
      const btn = document.getElementById("btn-extend-action");
      btn.innerText = "⏳...";
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("https://labdep.tehwinsam.com/api/extend", {
        method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
      });
      if (res.ok) { await checkDeploymentStatus(); alert("✅ Extended!"); }
      btn.innerText = "⏩ Extend";
    };

    onAuthStateChanged(auth, (user) => {
      if (user) {
        document.getElementById("logged-out-view").style.display = "none";
        document.getElementById("auth-tabs").style.display = "flex";
        document.getElementById("footer-actions").style.display = "block";
        document.getElementById("deploy-tab-content").classList.remove('lab-hidden');
        loadChapters(); checkDeploymentStatus();
      } else {
        document.getElementById("logged-out-view").style.display = "block";
        document.getElementById("auth-tabs").style.display = "none";
        document.getElementById("footer-actions").style.display = "none";
        document.getElementById("deploy-tab-content").classList.add('lab-hidden');
      }
    });
  };

  startApp();
})();

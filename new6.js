(async function () {
  // ─── 1. PREVENT DUPLICATES ───────────────────────────────────────────────────
  if (document.getElementById('lab-deployer-widget')) document.getElementById('lab-deployer-widget').remove();
  if (document.getElementById('lab-notification-overlay')) document.getElementById('lab-notification-overlay').remove();

  // ─── 2. DYNAMICALLY IMPORT FIREBASE ─────────────────────────────────────────
  const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
  const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

  // ─── 3. INJECT ALL CSS ───────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
    /* ── DEPLOYER WIDGET ── */
    #lab-deployer-widget {
      position: fixed; top: 20px; left: 20px; width: 550px; height: 480px;
      z-index: 2147483640 !important; background: #ffffff;
      border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
      isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
      min-width: 260px; min-height: 45px; touch-action: none;
      /* Blocked state: pointer-events disabled until notification is acknowledged */
    }
    #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
    #lab-deployer-widget.lab-blocked {
      pointer-events: none;
      user-select: none;
      filter: blur(1.5px) brightness(0.85);
    }

    #widget-main { display: flex; flex-direction: column; flex-grow: 1; }

    .resizer {
      width: 15px; height: 15px; position: absolute; right: 2px; bottom: 2px;
      cursor: nwse-resize; z-index: 2147483641;
      background-image: linear-gradient(135deg, transparent 20%, #bbb 20%, #bbb 35%, transparent 35%, transparent 50%, #bbb 50%, #bbb 65%, transparent 65%);
      background-size: 10px 10px;
    }
    .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; height: 45px; cursor: move; user-select: none; flex-shrink: 0; }
    .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
    @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40,167,69,0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40,167,69,0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40,167,69,0); } }

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

    /* ── NOTIFICATION MODAL — DEEP OCEAN THEME ── */
    #lab-notification-overlay {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      z-index: 2147483647 !important;
      opacity: 0; pointer-events: none;
      transition: opacity .3s ease;
      background: radial-gradient(ellipse at center, rgba(0,20,60,.72) 0%, rgba(0,5,25,.82) 100%);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }
    #lab-notification-overlay.visible { opacity: 1; pointer-events: all; }

    .lab-modal {
      width: 520px; border-radius: 28px; overflow: hidden; position: relative;
      background: linear-gradient(135deg, rgba(0,30,80,.92) 0%, rgba(0,15,50,.88) 50%, rgba(0,40,100,.84) 100%);
      backdrop-filter: blur(40px) saturate(180%); -webkit-backdrop-filter: blur(40px) saturate(180%);
      border: 1px solid rgba(0,200,255,.25);
      box-shadow: 0 0 0 1px rgba(0,100,200,.2) inset, 0 32px 64px rgba(0,0,0,.55), 0 0 40px rgba(0,150,255,.12), 0 8px 24px rgba(0,0,0,.35);
      font-family: -apple-system,'Helvetica Neue',sans-serif;
      animation: labFloatIn .55s cubic-bezier(.34,1.4,.64,1);
    }
    .lab-modal::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 48%;
      background: linear-gradient(180deg, rgba(0,180,255,.08) 0%, transparent 100%);
      border-radius: 28px 28px 0 0; pointer-events: none; z-index: 2;
    }
    .lab-modal.closing { animation: labFloatOut .35s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes labFloatIn { from { transform: scale(.84) translateY(28px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    @keyframes labFloatOut { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(.9) translateY(-16px); opacity: 0; } }

    .lab-modal-header {
      background: linear-gradient(135deg, rgba(0,50,120,.92), rgba(0,20,70,.92));
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0,200,255,.2); padding: 18px 24px;
      display: flex; align-items: center; gap: 12px; position: relative; z-index: 3;
    }
    .lab-modal-icon { font-size: 20px; }
    .lab-modal-title { font-size: 15px; font-weight: 800; color: rgba(100,220,255,.95); letter-spacing: .02em; }
    .lab-modal-body { padding: 22px 20px 16px; position: relative; z-index: 3; }
    .lab-modal-label { font-size: 10px; font-weight: 600; color: rgba(0,200,255,.55); letter-spacing: .16em; text-transform: uppercase; margin-bottom: 10px; }
    .lab-message-card {
      background: rgba(0,100,200,.12); border: 1px solid rgba(0,200,255,.18);
      border-radius: 14px; padding: 14px 16px; box-shadow: 0 1px 0 rgba(0,200,255,.1) inset;
    }
    .lab-message-text { font-size: 15px; font-weight: 400; color: rgba(180,230,255,.9); line-height: 1.55; letter-spacing: -.1px; white-space: pre-wrap; }
    .lab-modal-footer { padding: 12px 16px 20px; position: relative; z-index: 3; }
    .lab-btn-ack {
      width: 100%; padding: 15px; border-radius: 16px; border: none; cursor: not-allowed;
      font-family: -apple-system,'Helvetica Neue',sans-serif; font-size: 16px; font-weight: 600; letter-spacing: -.2px;
      position: relative; overflow: hidden;
      background: linear-gradient(160deg, rgba(0,180,255,.35) 0%, rgba(0,100,200,.2) 50%, rgba(0,60,150,.15) 100%);
      color: rgba(180,240,255,.95);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(0,200,255,.3);
      box-shadow: 0 0 20px rgba(0,150,255,.2), 0 4px 16px rgba(0,0,0,.3);
      text-shadow: 0 0 10px rgba(0,200,255,.4);
      transition: transform .14s ease, box-shadow .14s ease;
      opacity: 0.65;
    }
    .lab-btn-ack::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
      background: linear-gradient(180deg, rgba(0,200,255,.12) 0%, transparent 100%);
      border-radius: 16px 16px 0 0; pointer-events: none; z-index: 2;
    }
    .lab-btn-ack::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(0,180,255,.28) 0%, rgba(0,220,255,.18) 100%);
      border-radius: 16px;
      transform: translateX(-100%);
      transition: none;
      z-index: 1;
    }
    .lab-btn-ack.ack-counting::after {
      transform: translateX(0%);
      transition: transform 3s linear;
    }
    .lab-btn-ack.ack-ready { cursor: pointer; opacity: 1; }
    .lab-btn-ack.ack-ready:hover { transform: scale(1.015); box-shadow: 0 0 28px rgba(0,180,255,.35), 0 4px 16px rgba(0,0,0,.3); }
    .lab-btn-ack.ack-ready:active { transform: scale(.97); }
    .lab-btn-ack span { position: relative; z-index: 3; }
  `;
  document.head.appendChild(style);

  // ─── 4. INJECT NOTIFICATION MODAL HTML ──────────────────────────────────────
  const notifOverlay = document.createElement('div');
  notifOverlay.id = 'lab-notification-overlay';
  notifOverlay.innerHTML = `
    <div class="lab-modal" id="labModal">
      <div class="lab-modal-header">
        <span class="lab-modal-icon">⚠️</span>
        <span class="lab-modal-title">Lab Notification</span>
      </div>
      <div class="lab-modal-body">
        <div class="lab-modal-label">Issue Detected</div>
        <div class="lab-message-card">
          <div class="lab-message-text" id="labMessageText">Checking lab status...</div>
        </div>
      </div>
      <div class="lab-modal-footer">
        <button class="lab-btn-ack" id="labAckBtn" disabled><span id="labAckLabel">Read message — 3s</span></button>
      </div>
    </div>
  `;
  document.body.appendChild(notifOverlay);

  // ─── 5. INJECT DEPLOYER WIDGET HTML ─────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'lab-deployer-widget';
  // Start blocked until we know if notification is needed
  widget.classList.add('lab-blocked');
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
  document.body.appendChild(widget);

  // ─── 6. NOTIFICATION MODAL LOGIC ─────────────────────────────────────────────
  // Fetches alert message from GitHub. If found → show modal and block widget.
  // If no alert → immediately unblock widget.
  const unblockWidget = () => {
    widget.classList.remove('lab-blocked');
  };

  const showNotification = (message) => {
    document.getElementById('labMessageText').textContent = message;
    notifOverlay.classList.add('visible');

    // ── 3-second countdown before button becomes clickable ──
    const btn = document.getElementById('labAckBtn');
    const label = document.getElementById('labAckLabel');
    let seconds = 3;

    // Tick label immediately
    label.textContent = `Read message — ${seconds}s`;

    // Trigger the CSS progress bar fill (must be on next frame so transition fires)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { btn.classList.add('ack-counting'); });
    });

    const tick = setInterval(() => {
      seconds--;
      if (seconds > 0) {
        label.textContent = `Read message — ${seconds}s`;
      } else {
        clearInterval(tick);
        label.textContent = 'Acknowledge';
        btn.disabled = false;
        btn.classList.add('ack-ready');
      }
    }, 1000);
  };

  const acknowledgeNotification = () => {
    const btn = document.getElementById('labAckBtn');
    if (btn.disabled) return; // Guard: ignore clicks during countdown
    const modal = document.getElementById('labModal');
    modal.classList.add('closing');
    setTimeout(() => {
      notifOverlay.classList.remove('visible');
      modal.classList.remove('closing');
      unblockWidget();
    }, 380);
  };

  document.getElementById('labAckBtn').onclick = acknowledgeNotification;

  // Check for a lab notification from GitHub
  (async () => {
    try {
      const currentUrl = window.location.href;
      const idMatch = currentUrl.match(/ebook([0-9a-f]{24})/i);
      if (!idMatch) {
        // No lab ID → no notification possible → unblock immediately
        unblockWidget();
        return;
      }
      const unitId = idMatch[1];
      const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labalertprompt/refs/heads/main/${unitId}.txt`);
      if (!res.ok) { unblockWidget(); return; }
      const text = await res.text();
      if (!text || !text.trim()) { unblockWidget(); return; }
      showNotification(text.trim());
    } catch (e) {
      // On any error, don't block the user
      unblockWidget();
    }
  })();

  // ─── 7. FIREBASE & DEPLOYER LOGIC (unchanged from original) ──────────────────
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

  const startPolling = () => { stopPolling(); pollInterval = setInterval(() => checkDeploymentStatus(true), 20000); };
  const stopPolling = () => { clearInterval(pollInterval); pollInterval = null; };

  const updateUI = (data) => {
    if (!data) return;
    const noLabMsg = document.getElementById("no-lab-msg");
    const copyBox = document.getElementById("copyContainer");
    const timerSect = document.getElementById("active-timer-section");
    const terminal = document.getElementById("CommandtoPasteRun");
    const instructions = document.getElementById("instructionText");
    const isDeploying = sessionStorage.getItem("is_deploying") === "true";

    if (data.deployed) {
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
      copyBox.style.display = "none";
      timerSect.style.display = "none";
      noLabMsg.style.display = "block";
      noLabMsg.innerText = "⏳ Lab is building (approx 5 mins)...";
      startPolling();
    } else {
      resetLiveStatusUI();
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.id === 'tab-status') switchTab('deploy');
    }
  };

  const checkDeploymentStatus = async (forceFetch = false, initialLoad = false) => {
    const cached = sessionStorage.getItem("lab_status");
    const isDeploying = sessionStorage.getItem("is_deploying") === "true";
    let hasActiveState = false;

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

    if (auth.currentUser) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const freshData = await res.json();
        sessionStorage.setItem("lab_status", JSON.stringify(freshData));
        updateUI(freshData);
        if (!hasActiveState && initialLoad && freshData.deployed) switchTab('status');
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
      path.classList.remove("green","orange","red");
      if (timeLeft <= 300) path.classList.add("red");
      else if (timeLeft <= 600) path.classList.add("orange");
      else path.classList.add("green");
      path.setAttribute("stroke-dasharray", `${((timeLeft / totalDuration) * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`);
    }, 1000);
  }

  const switchTab = (tab) => {
    ['deploy','status','credits','contact'].forEach(t => {
      const content = document.getElementById(`${t}-tab-content`);
      const btn = document.getElementById(`tab-${t}`);
      if (content) content.classList.add('lab-hidden');
      if (btn) btn.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tab}-tab-content`);
    const targetBtn = document.getElementById(`tab-${tab}`);
    if (targetContent) targetContent.classList.remove('lab-hidden');
    if (targetBtn) targetBtn.classList.add('active');
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
    sessionStorage.setItem("is_deploying","true");
    switchTab('status');
    const idToken = await auth.currentUser.getIdToken();
    try {
      await fetch("https://labdep.tehwinsam.com/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ chapter: document.getElementById("chapter").value })
      });
      loader.style.display = "none"; btn.disabled = false;
    } catch (e) {
      btn.disabled = false; loader.style.display = "none";
      sessionStorage.removeItem("is_deploying");
      document.getElementById("no-lab-msg").innerText = "❌ Deployment failed.";
    }
  };

  document.getElementById('destroyBtn').onclick = async () => {
    if (!confirm("Are you sure you want to destroy this lab?")) return;
    const idToken = await auth.currentUser.getIdToken();
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
      if (res.ok) { await checkDeploymentStatus(true); alert("✅ Success: Extended!"); }
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
    if (!auth.currentUser) return;
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
        expiryEl.innerHTML = `⚠️ Lab access expires on <strong>${dateObj.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</strong>`;
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
    } catch (e) {
      document.getElementById("chapter").innerHTML = '<option value="invalid">No labs available</option>';
    }
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
      checkDeploymentStatus(false, true);
    } else {
      document.getElementById("logged-out-view").style.display = "block";
      document.getElementById("auth-tabs").style.display = "none";
      document.getElementById("footer-actions").style.display = "none";
      document.getElementById("deploy-tab-content").classList.add('lab-hidden');
      ['status','credits','contact'].forEach(t => {
        const c = document.getElementById(`${t}-tab-content`);
        if (c) c.classList.add('lab-hidden');
      });
      clearInterval(countdownInterval);
      stopPolling();
    }
  });

  // ─── 8. DRAG & RESIZE ────────────────────────────────────────────────────────
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

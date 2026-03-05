(async function() {
    // 1. PREVENT DUPLICATES
    if (document.getElementById('lab-deployer-widget')) {
        document.getElementById('lab-deployer-widget').remove();
    }

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. INJECT CSS
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
        .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; flex-shrink: 0; }
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
        #CommandtoPasteRun { white-space: pre-wrap; word-break: break-all; margin: 0; color: #00ff00; max-height: 180px; overflow-y: auto; }
        #instructionText { margin-top: 10px; font-size: 11px; color: #00f9e2; border-top: 1px solid #333; padding-top: 8px; line-height: 1.4; }
        .status-actions { display: flex; gap: 10px; margin-top: 15px; }
        .btn-ext { background: #28a745; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }
        .btn-des { background: darkred; color: white; border: none; padding: 10px; border-radius: 6px; flex: 1; cursor: pointer; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // 4. INJECT HTML
    const widget = document.createElement('div');
    widget.id = 'lab-deployer-widget';
    widget.innerHTML = `
      <div class="widget-header" id="drag-handle">
        <div style="display: flex; align-items: center; pointer-events: none;">
          <span class="status-indicator"></span>
          <h4 style="margin:0; font-size:14px; color: #333;">CyberXPT Lab</h4>
        </div>
        <button id="toggle-visibility-btn" style="background:none; border:none; cursor:pointer; font-size: 20px; font-weight: bold; color: #666; width:30px;">−</button>
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
          </div>
          <div id="status-tab-content" class="tab-content lab-hidden">
             <div id="copyContainer" style="display:none;">
              <button id="copyBtn" style="position:absolute; top:8px; right:8px; background:none; border:none; cursor:pointer;">📋</button>
              <pre id="CommandtoPasteRun" data-copy=""></pre>
              <div id="instructionText"></div>
            </div>
            <div id="no-lab-msg" style="text-align: center; padding: 20px; color: #666;">ℹ️ Checking lab status...</div>
            <div id="active-timer-section" style="display:none;">
                <div class="timer-box">
                    <div class="base-timer">
                        <svg class="base-timer__svg" viewBox="0 0 100 100"><g class="base-timer__circle"><circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle><path id="base-timer-path-remaining" stroke-dasharray="283" class="base-timer__path-remaining green" d="M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0"></path></g></svg>
                        <span id="base-timer-label" class="base-timer__label">00:00:00</span>
                    </div>
                </div>
                <div class="status-actions">
                    <button class="btn-ext" id="extendBtn">⏩ Extend</button>
                    <button class="btn-des" id="destroyBtn">🗑️ Destroy</button>
                </div>
            </div>
          </div>
          <div id="credits-tab-content" class="tab-content lab-hidden">
             <div id="subscription-status" style="font-size: 24px; font-weight: bold; text-align:center;">Fetching...</div>
          </div>
          <div id="contact-tab-content" class="tab-content lab-hidden">
             <div style="text-align:center; padding:20px;">Support: <a href="mailto:info@cyberxpt.com">info@cyberxpt.com</a></div>
          </div>
          <div id="footer-actions" style="margin-top:auto; border-top:1px solid #eee; padding-top:10px; display:none; text-align: right;">
            <button id="logoutBtn" style="font-size: 11px; background: none; border: none; color: #dc3545; cursor: pointer;">Sign Out</button>
          </div>
        </div>
      </div>
      <div class="resizer" id="resizer-handle"></div>
    `;
    document.body.appendChild(widget);

    // 5. FIREBASE INITIALIZATION
    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    // --- LOGIC FUNCTIONS (Simplified for brevity, matches your source) ---
    // ... Logic for checkDeploymentStatus, startDestroyCountdown, switchTab, etc ...
    // (See your original code for the full logic implementation)

    // 6. INITIALIZE INTERACTIONS (DRAG/RESIZE)
    function initInteractions(el) {
        let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
        const header = document.getElementById("drag-handle");
        const resizer = document.getElementById("resizer-handle");

        header.onmousedown = (e) => {
            if (e.target.id === 'toggle-visibility-btn') return;
            p3 = e.clientX; p4 = e.clientY;
            document.onmousemove = (ev) => {
                p1 = p3 - ev.clientX; p2 = p4 - ev.clientY; p3 = ev.clientX; p4 = ev.clientY;
                el.style.top = (el.offsetTop - p2) + "px"; el.style.left = (el.offsetLeft - p1) + "px";
            };
            document.onmouseup = () => { document.onmousemove = null; };
        };

        resizer.onmousedown = (e) => {
            const sw = el.offsetWidth, sh = el.offsetHeight, sx = e.clientX, sy = e.clientY;
            document.onmousemove = (ev) => {
                el.style.width = (sw + (ev.clientX - sx)) + "px";
                el.style.height = (sh + (ev.clientY - sy)) + "px";
            };
            document.onmouseup = () => { document.onmousemove = null; };
        };
    }

    initInteractions(widget);

    // Final Auth listener to trigger UI
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById("logged-out-view").style.display = "none";
            document.getElementById("auth-tabs").style.display = "flex";
            document.getElementById("footer-actions").style.display = "block";
            // ... load chapters and check status ...
        } else {
            document.getElementById("logged-out-view").style.display = "block";
        }
    });

})();

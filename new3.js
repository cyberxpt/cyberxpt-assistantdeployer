(async function() {
    // 1. CLEANUP & PREVENT DUPLICATES
    ['lab-deployer-widget', 'labModalOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. CONSOLIDATED STYLES (Z-Index Hierarchy + CSS Isolation)
    const style = document.createElement('style');
    style.textContent = `
        /* --- LAYER 1: THE LAB DEPLOYER WIDGET (EXACT UI) --- */
        #lab-deployer-widget {
          position: fixed; top: 20px; left: 20px; width: 550px; height: 480px; 
          z-index: 1000000 !important; background: #ffffff;
          border: 1px solid #ddd; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
          isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
          min-width: 260px; min-height: 45px; touch-action: none; text-align: left;
        }
        #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
        #widget-main { display: flex; flex-direction: column; flex-grow: 1; }

        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; height: 45px; cursor: move; user-select: none; flex-shrink: 0; }
        .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }

        .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; }
        .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; white-space: nowrap; }
        .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }

        .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; font-size: 13px; }
        .lab-hidden { display: none !important; }

        /* TERMINAL STYLES */
        #copyContainer { position: relative; background: #1c1c1c; color: #eee; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; text-align: left; margin-top: 10px; }
        #CommandtoPasteRun { white-space: pre-wrap; word-break: break-all; margin: 0; color: #00ff00; max-height: 180px; overflow-y: auto; }

        /* --- LAYER 2: THE NOTIFICATION MODAL (TOP PRIORITY) --- */
        #labModalOverlay {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 2147483647 !important; 
          opacity: 0; pointer-events: none; transition: opacity .4s ease;
          background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(12px);
        }
        #labModalOverlay.visible { opacity: 1; pointer-events: all; }
        .lab-modal {
          width: 520px; border-radius: 28px; background: white; font-family: sans-serif;
          box-shadow: 0 32px 64px rgba(0,0,0,0.7); animation: labFloatIn .55s cubic-bezier(.34,1.4,.64,1); overflow: hidden;
        }
        .lab-modal-header { background: #000; color: #fff; padding: 18px 24px; display: flex; gap: 12px; align-items: center; font-weight: bold; }
        .lab-message-card { background: #f4f4f4; border: 1px solid #ddd; border-radius: 14px; padding: 20px; margin: 20px; color: #111; line-height: 1.6; font-size: 15px; text-align: left; }
        .lab-btn-ack { 
          width: calc(100% - 40px); margin: 0 20px 20px; padding: 16px; border-radius: 16px; 
          border: none; background: #007bff; color: #fff; font-weight: bold; cursor: pointer; font-size: 16px;
        }
        .lab-btn-ack:disabled { background: #444; color: #aaa; cursor: not-allowed; }

        /* TIMER SVG STYLES */
        .base-timer { position: relative; width: 60px; height: 60px; }
        .base-timer__svg { transform: scaleX(-1); }
        .base-timer__path-elapsed { stroke-width: 7px; stroke: #eee; fill: none; }
        .base-timer__path-remaining { stroke-width: 7px; stroke-linecap: round; transform: rotate(90deg); transform-origin: center; transition: 1s linear all; fill: none; stroke: currentColor; }
        .base-timer__label { position: absolute; width: 60px; height: 60px; top: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; font-family: monospace; }
        
        @keyframes labFloatIn { from { transform: scale(.8) translateY(40px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    `;
    document.head.appendChild(style);

    // 4. INJECT HTML (MODAL + FULL WIDGET)
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="lab-deployer-widget">
        <div class="widget-header" id="drag-handle">
          <div style="display: flex; align-items: center; pointer-events: none;">
            <span class="status-indicator"></span>
            <span style="font-size:14px; font-weight:bold; color:#333;">CyberXPT Lab</span>
          </div>
          <button id="toggle-visibility-btn" style="background:none; border:none; cursor:pointer; font-size: 20px; font-weight: bold; color: #666;">−</button>
        </div>
        <div id="widget-main">
          <div class="tabs" id="auth-tabs" style="display:none;">
            <button class="tab-btn active" id="tab-deploy">Deployer</button>
            <button class="tab-btn" id="tab-status">Live Status</button>
            <button class="tab-btn" id="tab-credits">Credits</button>
          </div>
          <div class="content-area">
            <div id="logged-out-view" style="display:none; text-align: center; padding: 20px;">
              <button id="loginBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
            </div>
            <div id="deploy-tab-content" class="tab-content">
              <label style="font-size:11px; color:#666;">Select Lab:</label>
              <select id="chapter" style="width:100%; padding:8px; margin:5px 0 10px; border-radius:4px;"></select>
              <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:12px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
            </div>
            <div id="status-tab-content" class="tab-content lab-hidden">
                <div id="copyContainer" style="display:none;">
                    <pre id="CommandtoPasteRun" data-copy=""></pre>
                </div>
                <div id="no-lab-msg" style="text-align: center; padding: 20px; color: #666;">ℹ️ Checking lab status...</div>
            </div>
          </div>
        </div>
      </div>

      <div id="labModalOverlay">
        <div class="lab-modal" id="labModal">
          <div class="lab-modal-header">⚠️ CRITICAL NOTIFICATION</div>
          <div class="lab-message-card" id="labMessageText">Fetching lab status...</div>
          <button class="lab-btn-ack" id="ackBtn" disabled>Read Message (3s)...</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // 5. ALERT LOGIC (Checking for URL Lab ID and fetching alert)
    const currentUrl = window.location.href;
    const idMatch = currentUrl.match(/ebook([0-9a-f]{24})/i);
    if (idMatch) {
        const unitId = idMatch[1];
        try {
            const res = await fetch(\`https://raw.githubusercontent.com/cyberxpt/labalertprompt/refs/heads/main/\${unitId}.txt\`);
            if (res.ok) {
                const text = await res.text();
                if (text.trim()) {
                    document.getElementById('labMessageText').textContent = text.trim();
                    document.getElementById('labModalOverlay').classList.add('visible');
                    
                    let countdown = 3;
                    const btn = document.getElementById('ackBtn');
                    const timerId = setInterval(() => {
                        countdown--;
                        if (countdown <= 0) {
                            btn.disabled = false;
                            btn.textContent = "Acknowledge & Continue";
                            clearInterval(timerId);
                        } else {
                            btn.textContent = \`Read Message (\${countdown}s)...\`;
                        }
                    }, 1000);
                }
            }
        } catch(e) {}
    }

    // 6. FIREBASE & AUTH CONFIG (Restored from your original)
    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        document.getElementById('logged-out-view').style.display = user ? 'none' : 'block';
        document.getElementById('auth-tabs').style.display = user ? 'flex' : 'none';
        if (user) loadChapters();
    });

    // 7. INTERACTION HANDLERS
    document.getElementById('ackBtn').onclick = () => {
        document.getElementById('labModalOverlay').classList.remove('visible');
    };

    document.getElementById('toggle-visibility-btn').onclick = () => {
        const main = document.getElementById('widget-main');
        const widget = document.getElementById('lab-deployer-widget');
        main.classList.toggle('lab-hidden');
        widget.classList.toggle('lab-hidden-state');
        document.getElementById('toggle-visibility-btn').textContent = main.classList.contains('lab-hidden') ? '+' : '−';
    };

    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());

    // 8. DRAG LOGIC
    const widget = document.getElementById('lab-deployer-widget');
    const header = document.getElementById('drag-handle');
    header.onmousedown = (e) => {
        let p3 = e.clientX, p4 = e.clientY;
        document.onmousemove = (ev) => {
            widget.style.top = (widget.offsetTop - (p4 - ev.clientY)) + "px";
            widget.style.left = (widget.offsetLeft - (p3 - ev.clientX)) + "px";
            p3 = ev.clientX; p4 = ev.clientY;
        };
        document.onmouseup = () => document.onmousemove = null;
    };

    async function loadChapters() {
        // Your logic for fetching unitId from URL and populating <select>
        const idMatch = window.location.href.match(/ebook([0-9a-f]{24})/i);
        if (idMatch) {
            const unitId = idMatch[1];
            const res = await fetch(\`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/\${unitId}.txt\`);
            if (res.ok) {
                const text = await res.text();
                const lines = text.split("\\n").filter(l => l.trim());
                let options = "";
                lines.forEach(l => {
                    const p = l.split(",");
                    options += \`<option value="\${p[0].trim()}">\${p[1] ? p[1].trim() : p[0]}</option>\`;
                });
                document.getElementById('chapter').innerHTML = options;
            }
        }
    }
})();

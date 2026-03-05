(async function() {
    // 1. PREVENT DUPLICATES
    ['lab-deployer-widget', 'labModalOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. CONSOLIDATED STYLES (Widget + Notification Modal)
    const style = document.createElement('style');
    style.textContent = `
        /* --- WIDGET STYLES --- */
        #lab-deployer-widget {
          position: fixed; top: 20px; left: 20px; width: 550px; height: 480px; 
          z-index: 2147483647 !important; background: #ffffff;
          border: 1px solid #ddd; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
          isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
          min-width: 260px; min-height: 45px; touch-action: none;
        }
        #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; height: 45px; cursor: move; user-select: none; }
        .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }
        .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; }
        .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; }
        .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }
        .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .lab-hidden { display: none !important; }
        
        /* --- NOTIFICATION MODAL STYLES --- */
        .lab-modal-overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999999;opacity:0;pointer-events:none;transition:opacity .3s ease; background: rgba(0,0,0,0.4);}
        .lab-modal-overlay.visible{opacity:1;pointer-events:all}
        .lab-modal{width:520px;border-radius:28px;overflow:hidden;position:relative;background:linear-gradient(135deg,rgba(255,255,255,.26) 0%,rgba(255,255,255,.10) 40%,rgba(255,255,255,.06) 100%);backdrop-filter:blur(40px) saturate(180%);-webkit-backdrop-filter:blur(40px) saturate(180%);border:1px solid rgba(255,255,255,.32);box-shadow:0 32px 64px rgba(0,0,0,.38);animation:labFloatIn .55s cubic-bezier(.34,1.4,.64,1)}
        .lab-modal.closing{animation:labFloatOut .35s cubic-bezier(.4,0,.2,1) forwards}
        @keyframes labFloatIn{from{transform:scale(.84) translateY(28px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes labFloatOut{from{transform:scale(1) translateY(0);opacity:1}to{transform:scale(.9) translateY(-16px);opacity:0}}
        .lab-modal-header{background:rgba(0,0,0,.75);padding:18px 24px;display:flex;align-items:center;gap:12px;color:white;}
        .lab-message-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:14px 16px;}
        .lab-btn-ack{width:100%;padding:15px;border-radius:16px;border:1px solid rgba(255,255,255,.32);cursor:pointer;font-weight:600;background:rgba(255,255,255,.12);backdrop-filter:blur(20px);}
    `;
    document.head.appendChild(style);

    // 4. INJECT HTML (Widget + Notification Modal)
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = `
      <div id="lab-deployer-widget">
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
          </div>
          <div class="content-area">
            <div id="logged-out-view" style="display:none; text-align: center; padding: 20px;">
              <button id="loginBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
            </div>
            <div id="deploy-tab-content" class="tab-content">
               <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px;"><option value="invalid">Loading Labs...</option></select>
               <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">🚀 Deploy Lab</button>
            </div>
            <div id="status-tab-content" class="tab-content lab-hidden">
               <div id="no-lab-msg" style="text-align: center; padding: 20px; color: #666;">ℹ️ No lab active</div>
            </div>
          </div>
        </div>
      </div>

      <div class="lab-modal-overlay" id="labModalOverlay">
        <div class="lab-modal" id="labModal">
          <div class="lab-modal-header">
            <span>⚠️</span> <span style="font-size:15px; font-weight:800;">Lab Notification</span>
          </div>
          <div style="padding:22px 20px;">
            <div style="font-size:10px; font-weight:600; color:rgba(0,0,0,0.5); letter-spacing:.16em; margin-bottom:10px;">ISSUE DETECTED</div>
            <div class="lab-message-card">
              <div id="labMessageText" style="font-size:15px; color:rgba(0,0,0,0.85); line-height:1.55;">Checking lab status...</div>
            </div>
          </div>
          <div style="padding:12px 16px 20px;">
            <button class="lab-btn-ack" id="ackBtn">Acknowledge</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(widgetContainer);

    // 5. SHARED LOGIC: EXTRACT UNIT ID
    const currentUrl = window.location.href;
    const idMatch = currentUrl.match(/ebook([0-9a-f]{24})/i);
    const unitId = idMatch ? idMatch[1] : null;

    // 6. LAB ALERT SYSTEM LOGIC
    if (unitId) {
        try {
            const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labalertprompt/refs/heads/main/${unitId}.txt`);
            if (res.ok) {
                const text = await res.text();
                if (text && text.trim()) {
                    document.getElementById('labMessageText').textContent = text.trim();
                    document.getElementById('labModalOverlay').classList.add('visible');
                }
            }
        } catch(e) {}
    }

    document.getElementById('ackBtn').onclick = () => {
        const modal = document.getElementById('labModal');
        modal.classList.add('closing');
        setTimeout(() => {
            document.getElementById('labModalOverlay').classList.remove('visible');
            modal.classList.remove('closing');
        }, 380);
    };

    // 7. FIREBASE & WIDGET LOGIC
    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        const loggedOutView = document.getElementById("logged-out-view");
        const authTabs = document.getElementById("auth-tabs");
        if (user) {
            loggedOutView.style.display = "none";
            authTabs.style.display = "flex";
        } else {
            loggedOutView.style.display = "block";
            authTabs.style.display = "none";
        }
    });

    // 8. WIDGET INTERACTIONS (DRAG)
    const widget = document.getElementById('lab-deployer-widget');
    const header = document.getElementById('drag-handle');
    header.onmousedown = (e) => {
        let p3 = e.clientX, p4 = e.clientY;
        document.onmousemove = (ev) => {
            let p1 = p3 - ev.clientX, p2 = p4 - ev.clientY;
            p3 = ev.clientX; p4 = ev.clientY;
            widget.style.top = (widget.offsetTop - p2) + "px";
            widget.style.left = (widget.offsetLeft - p1) + "px";
        };
        document.onmouseup = () => { document.onmousemove = null; };
    };

    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
})();

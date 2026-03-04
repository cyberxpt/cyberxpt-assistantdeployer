(async function() {
    // 1. DYNAMICALLY IMPORT FIREBASE (Ensures it stays a sub-window logic)
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 2. INJECT CSS
    const style = document.createElement('style');
    style.textContent = `
        #lab-deployer-widget {
            position: fixed; top: 20px; left: 20px; width: 320px; height: auto;
            z-index: 2147483647 !important; background: #ffffff;
            border: 1px solid #ddd; border-radius: 8px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
            isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
            min-width: 280px; min-height: 45px; touch-action: none;
        }
        #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
        .resizer { width: 15px; height: 15px; position: absolute; right: 0; bottom: 0; cursor: nwse-resize; z-index: 2147483648; background: transparent; }
        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; height: 45px; cursor: move; user-select: none; flex-shrink: 0; }
        .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
        @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }
        .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
        .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; white-space: nowrap; }
        .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }
        .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; display: flex; flex-direction: column; }
        .lab-hidden { display: none !important; }
        #copyContainer { position: relative; background: #1c1c1c; color: #eee; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 11px; margin-bottom: 10px; }
        #CommandtoPasteRun { white-space: pre-wrap; word-break: break-all; color: #00ff00; margin: 0; }
        .btn-ext { background: #28a745; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold; }
        .btn-des { background: #dc3545; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; font-weight: bold; }
        .timer-box { display: flex; align-items: center; gap: 10px; margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px; }
        .base-timer__label { font-weight: bold; font-family: monospace; font-size: 14px; }
    `;
    document.head.appendChild(style);

    // 3. INJECT HTML
    const widget = document.createElement('div');
    widget.id = 'lab-deployer-widget';
    widget.innerHTML = `
      <div class="widget-header" id="drag-handle">
        <div style="display: flex; align-items: center; pointer-events: none;">
          <span class="status-indicator"></span>
          <h4 style="margin:0; font-size:14px; color: #333;">CyberXPT Lab</h4>
        </div>
        <button id="toggle-visibility-btn" style="background:none; border:none; cursor:pointer; font-size: 20px; font-weight: bold; color: #666;">−</button>
      </div>
      <div id="widget-main">
        <div class="tabs" id="auth-tabs" style="display:none;">
          <button class="tab-btn active" id="tab-deploy">Deployer</button>
          <button class="tab-btn" id="tab-status">Status</button>
          <button class="tab-btn" id="tab-credits">Credits</button>
          <button class="tab-btn" id="tab-contact">Contact</button>
        </div>
        <div class="content-area">
          <div id="logged-out-view" style="text-align: center; padding: 20px;">
            <button id="loginBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
          </div>
          <div id="deploy-tab-content" class="tab-content lab-hidden">
            <label style="font-size:11px; color:#666;">Select Lab Chapter:</label>
            <select id="chapter" style="width:100%; padding:8px; margin:5px 0 10px; border-radius:4px; border:1px solid #ccc;"><option>Loading...</option></select>
            <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
            <div id="output" style="font-size: 11px; margin-top:10px; color:#007bff;"></div>
          </div>
          <div id="status-tab-content" class="tab-content lab-hidden">
            <div id="no-lab-msg">ℹ️ Checking for active labs...</div>
            <div id="active-lab-ui" style="display:none;">
                <div id="copyContainer">
                    <div style="color:#888; font-size:9px; margin-bottom:5px;">TERMINAL COMMAND:</div>
                    <pre id="CommandtoPasteRun" data-copy=""></pre>
                    <button id="copyBtn" style="margin-top:10px; cursor:pointer;">📋 Copy Command</button>
                </div>
                <div class="timer-box">
                    <span style="font-size:11px; color:#666;">Remaining:</span>
                    <span id="base-timer-label" class="base-timer__label">00:00:00</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <button class="btn-ext" id="btn-extend-action">⏩ Extend</button>
                    <button class="btn-des" id="btn-destroy-action">🗑️ Destroy</button>
                </div>
            </div>
          </div>
          <div id="credits-tab-content" class="tab-content lab-hidden">
             <div style="text-align:center; padding:15px; background:#f0fdf4; border-radius:8px;">
                <div id="subscription-status" style="font-size:20px; font-weight:bold; color:#166534;">Fetching...</div>
             </div>
          </div>
          <div id="contact-tab-content" class="tab-content lab-hidden">
             <div style="text-align:center; padding:10px;">
                <p style="font-size:12px;">Need help? Email us:</p>
                <a href="mailto:info@cyberxpt.com" style="color:#007bff; font-weight:bold; text-decoration:none;">info@cyberxpt.com</a>
             </div>
          </div>
          <div id="footer-actions" style="margin-top:auto; padding-top:10px; display:none; text-align:right; border-top:1px solid #eee;">
            <button id="signOutBtn" style="font-size:10px; background:none; border:none; color:#dc3545; cursor:pointer;">Logout</button>
          </div>
        </div>
      </div>
      <div class="resizer" id="resizer-handle"></div>
    `;
    document.body.appendChild(widget);

    // 4. FIREBASE SETUP
    const firebaseConfig = { apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw", authDomain: "personal-web-a7f48.firebaseapp.com", projectId: "personal-web-a7f48", appId: "1:314747527325:web:af3fcf13fae585df873474" };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    let countdownInterval = null;

    // 5. HELPER FUNCTIONS
    const switchTab = (tab) => {
        ['deploy', 'status', 'credits', 'contact'].forEach(t => {
            document.getElementById(`${t}-tab-content`).classList.add('lab-hidden');
            document.getElementById(`tab-${t}`).classList.remove('active');
        });
        document.getElementById(`${tab}-tab-content`).classList.remove('lab-hidden');
        document.getElementById(`tab-${tab}`).classList.add('active');
        if (tab === 'status') checkStatus();
        if (tab === 'credits') fetchCredits();
    };

    const checkStatus = async () => {
        if (!auth.currentUser) return;
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/status", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        if (data.deployed) {
            document.getElementById('no-lab-msg').style.display = 'none';
            document.getElementById('active-lab-ui').style.display = 'block';
            document.getElementById('CommandtoPasteRun').innerText = data.terminal;
            document.getElementById('CommandtoPasteRun').setAttribute('data-copy', data.command);
            startTimer(data.destroy_time);
        } else {
            document.getElementById('no-lab-msg').style.display = 'block';
            document.getElementById('active-lab-ui').style.display = 'none';
        }
    };

    const startTimer = (expiry) => {
        clearInterval(countdownInterval);
        const end = new Date(expiry).getTime();
        countdownInterval = setInterval(() => {
            const now = Date.now();
            const diff = end - now;
            if (diff <= 0) { clearInterval(countdownInterval); checkStatus(); return; }
            const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
            document.getElementById('base-timer-label').innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    };

    const fetchCredits = async () => {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/subscription", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const data = await res.json();
        document.getElementById('subscription-status').innerText = data.msg || "No Credits";
    };

    // 6. EVENT HANDLERS
    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
    document.getElementById('signOutBtn').onclick = () => signOut(auth).then(() => location.reload());
    document.getElementById('tab-deploy').onclick = () => switchTab('deploy');
    document.getElementById('tab-status').onclick = () => switchTab('status');
    document.getElementById('tab-credits').onclick = () => switchTab('credits');
    document.getElementById('tab-contact').onclick = () => switchTab('contact');

    document.getElementById('deployBtn').onclick = async () => {
        document.getElementById('output').innerText = "⏳ Requesting deployment...";
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch("https://labdep.tehwinsam.com/api/deploy", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
            body: JSON.stringify({ chapter: document.getElementById('chapter').value })
        });
        if (res.ok) { document.getElementById('output').innerText = "✅ Success! Switching..."; setTimeout(() => switchTab('status'), 1000); }
    };

    document.getElementById('btn-destroy-action').onclick = async () => {
        if (!confirm("Destroy active lab?")) return;
        const idToken = await auth.currentUser.getIdToken();
        await fetch("https://labdep.tehwinsam.com/api/destroy", {
            method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        checkStatus();
    };

    document.getElementById('copyBtn').onclick = () => {
        const cmd = document.getElementById('CommandtoPasteRun').getAttribute('data-copy');
        navigator.clipboard.writeText(cmd);
        alert("Command Copied!");
    };

    // DRAG LOGIC
    (function(el) {
        let p1=0, p2=0, p3=0, p4=0;
        const h = el.querySelector("#drag-handle");
        h.onmousedown = (e) => {
            p3 = e.clientX; p4 = e.clientY;
            document.onmousemove = (ev) => {
                p1 = p3 - ev.clientX; p2 = p4 - ev.clientY; p3 = ev.clientX; p4 = ev.clientY;
                el.style.top = (el.offsetTop - p2) + "px"; el.style.left = (el.offsetLeft - p1) + "px";
            };
            document.onmouseup = () => document.onmousemove = null;
        };
    })(widget);

    // RESIZE LOGIC
    (function(el) {
        const r = el.querySelector("#resizer-handle");
        r.onmousedown = (e) => {
            const startW = el.offsetWidth, startH = el.offsetHeight, startX = e.clientX, startY = e.clientY;
            document.onmousemove = (ev) => {
                el.style.width = (startW + (ev.clientX - startX)) + "px";
                el.style.height = (startH + (ev.clientY - startY)) + "px";
            };
            document.onmouseup = () => document.onmousemove = null;
        };
    })(widget);

    // TOGGLE
    document.getElementById('toggle-visibility-btn').onclick = () => {
        const main = document.getElementById('widget-main');
        main.classList.toggle('lab-hidden');
        widget.classList.toggle('lab-hidden-state');
        document.getElementById('toggle-visibility-btn').innerText = main.classList.contains('lab-hidden') ? '+' : '−';
    };

    // AUTH LISTENER
    onAuthStateChanged(auth, (user) => {
        if (user) {
            document.getElementById('logged-out-view').style.display = 'none';
            document.getElementById('auth-tabs').style.display = 'flex';
            document.getElementById('footer-actions').style.display = 'block';
            switchTab('deploy');
            // Mock Chapter Loading
            const match = window.location.href.match(/ebook([0-9a-f]{24})/i);
            if (match) {
               fetch(`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/${match[1]}.txt`)
               .then(r => r.text()).then(t => {
                   document.getElementById('chapter').innerHTML = t.split('\n').map(l => {
                       const p = l.split(','); return `<option value="${p[0]}">${p[1]||p[0]}</option>`;
                   }).join('');
               });
            }
        }
    });

})();

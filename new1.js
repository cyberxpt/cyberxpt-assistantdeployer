(async function() {
    // 1. CLEANUP PREVIOUS INSTANCES
    ['lab-deployer-widget', 'labModalOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. CONSOLIDATED STYLES (Priority Managed)
    const style = document.createElement('style');
    style.textContent = `
        /* --- LAB DEPLOYER WIDGET (Layer 1) --- */
        #lab-deployer-widget {
          position: fixed; top: 20px; left: 20px; width: 550px; height: 480px; 
          z-index: 1000000 !important; /* High, but lower than Modal */
          background: #ffffff; border: 1px solid #ddd; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
          isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
        }
        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: move; }
        
        /* --- NOTIFICATION MODAL (Layer 2 - TOP PRIORITY) --- */
        .lab-modal-overlay {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 2147483647 !important; /* Absolute highest possible z-index */
          opacity: 0; pointer-events: none; transition: opacity .3s ease;
          background: rgba(0, 0, 0, 0.6); /* Dim the background to force focus */
          backdrop-filter: blur(4px);
        }
        .lab-modal-overlay.visible { opacity: 1; pointer-events: all; }
        .lab-modal {
          width: 520px; border-radius: 28px; background: white;
          border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 32px 64px rgba(0,0,0,0.4);
          animation: labFloatIn .55s cubic-bezier(.34,1.4,.64,1); overflow: hidden;
        }
        .lab-modal-header { background: #000; color: #fff; padding: 18px 24px; display: flex; gap: 12px; align-items: center; }
        .lab-message-card { background: #f9f9f9; border: 1px solid #ddd; border-radius: 14px; padding: 16px; margin: 20px; }
        .lab-btn-ack { 
          width: calc(100% - 40px); margin: 0 20px 20px; padding: 15px; border-radius: 16px; 
          border: none; background: #000; color: #fff; font-weight: 600; cursor: pointer; 
        }
        
        @keyframes labFloatIn { from { transform: scale(.9) translateY(20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .lab-modal.closing { transform: scale(.95); opacity: 0; transition: .3s; }
    `;
    document.head.appendChild(style);

    // 4. INJECT HTML
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="lab-deployer-widget">
        <div class="widget-header" id="drag-handle">
           <span style="font-size:14px; font-weight:bold;">CyberXPT Lab Deployer</span>
           <button id="min-btn" style="background:none; border:none; cursor:pointer;">−</button>
        </div>
        <div id="widget-content" style="padding:20px;">
           <div id="logged-out">
              <button id="loginBtn" style="width:100%; padding:10px; background:#007bff; color:white; border:none; border-radius:4px;">Login to Deploy</button>
           </div>
           <div id="logged-in" style="display:none;">
              <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px;"></select>
              <button id="deployBtn" style="width:100%; padding:10px; background:#28a745; color:white; border:none; border-radius:4px;">Deploy Lab</button>
           </div>
        </div>
      </div>

      <div class="lab-modal-overlay" id="labModalOverlay">
        <div class="lab-modal" id="labModal">
          <div class="lab-modal-header"><span>⚠️</span> <strong>Lab Notification</strong></div>
          <div class="lab-message-card" id="labMessageText">Fetching status...</div>
          <button class="lab-btn-ack" id="ackBtn">Acknowledge</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // 5. FETCH ALERT (Priority Execution)
    const currentUrl = window.location.href;
    const idMatch = currentUrl.match(/ebook([0-9a-f]{24})/i);
    if (idMatch) {
        const unitId = idMatch[1];
        try {
            const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labalertprompt/refs/heads/main/${unitId}.txt`);
            if (res.ok) {
                const text = await res.text();
                if (text.trim()) {
                    document.getElementById('labMessageText').textContent = text.trim();
                    document.getElementById('labModalOverlay').classList.add('visible');
                }
            }
        } catch(e) {}
    }

    // 6. FIREBASE & UI LOGIC
    const firebaseConfig = {
      apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
      authDomain: "personal-web-a7f48.firebaseapp.com",
      projectId: "personal-web-a7f48",
      appId: "1:314747527325:web:af3fcf13fae585df873474"
    };
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);

    onAuthStateChanged(auth, (user) => {
        document.getElementById('logged-out').style.display = user ? 'none' : 'block';
        document.getElementById('logged-in').style.display = user ? 'block' : 'none';
    });

    // 7. INTERACTION HANDLERS
    document.getElementById('ackBtn').onclick = () => {
        document.getElementById('labModal').classList.add('closing');
        setTimeout(() => document.getElementById('labModalOverlay').classList.remove('visible'), 300);
    };

    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());

    // Drag Logic
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
})();

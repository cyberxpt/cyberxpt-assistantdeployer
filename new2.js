(async function() {
    // 1. CLEANUP PREVIOUS INSTANCES
    ['lab-deployer-widget', 'labModalOverlay'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });

    // 2. DYNAMICALLY IMPORT FIREBASE
    const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
    const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

    // 3. CONSOLIDATED STYLES (Z-Index Hierarchy)
    const style = document.createElement('style');
    style.textContent = `
        /* DEPLOYER WIDGET (Behind Alert) */
        #lab-deployer-widget {
          position: fixed; top: 20px; left: 20px; width: 550px; height: 480px; 
          z-index: 10000 !important; 
          background: #ffffff; border: 1px solid #ddd; border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
          display: flex; flex-direction: column; overflow: hidden;
        }
        .widget-header { padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; cursor: move; }

        /* ALERT OVERLAY (Absolute Front + Lock) */
        #labModalOverlay {
          position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 2147483647 !important; /* Max Possible Priority */
          opacity: 0; pointer-events: none; transition: opacity .4s ease;
          background: rgba(0, 0, 0, 0.85); 
          backdrop-filter: blur(12px); /* Blurs deployer behind it */
        }
        #labModalOverlay.visible { opacity: 1; pointer-events: all; }

        .lab-modal {
          width: 520px; border-radius: 28px; background: white;
          border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 32px 64px rgba(0,0,0,0.7);
          animation: labFloatIn .55s cubic-bezier(.34,1.4,.64,1); overflow: hidden;
        }
        .lab-modal-header { background: #000; color: #fff; padding: 18px 24px; display: flex; gap: 12px; align-items: center; }
        .lab-message-card { background: #f4f4f4; border: 1px solid #ddd; border-radius: 14px; padding: 20px; margin: 20px; color: #111; line-height: 1.6; font-size: 15px; }
        .lab-btn-ack { 
          width: calc(100% - 40px); margin: 0 20px 20px; padding: 16px; border-radius: 16px; 
          border: none; background: #007bff; color: #fff; font-weight: bold; cursor: pointer; font-size: 16px;
        }
        .lab-btn-ack:disabled { background: #444; color: #aaa; cursor: not-allowed; }
        
        @keyframes labFloatIn { from { transform: scale(.8) translateY(40px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .lab-modal.closing { transform: scale(.9); opacity: 0; transition: .3s; }
    `;
    document.head.appendChild(style);

    // 4. INJECT HTML
    const container = document.createElement('div');
    container.innerHTML = `
      <div id="lab-deployer-widget">
        <div class="widget-header" id="drag-handle">
           <span style="font-size:14px; font-weight:bold;">CyberXPT Lab Deployer</span>
           <button style="background:none; border:none; cursor:pointer;">−</button>
        </div>
        <div id="widget-content" style="padding:20px;">
           <div id="logged-out">
              <button id="loginBtn" style="width:100%; padding:10px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Login with Google</button>
           </div>
           <div id="logged-in" style="display:none;">
              <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px; border:1px solid #ccc;"></select>
              <button id="deployBtn" style="width:100%; padding:12px; background:#28a745; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">🚀 Deploy Lab</button>
           </div>
        </div>
      </div>

      <div id="labModalOverlay">
        <div class="lab-modal" id="labModal">
          <div class="lab-modal-header"><span>⚠️</span> <strong>CRITICAL NOTIFICATION</strong></div>
          <div style="padding: 20px 20px 0 20px; font-size: 11px; color: #888; font-weight: bold; letter-spacing: 1px;">LAB ALERT SYSTEM</div>
          <div class="lab-message-card" id="labMessageText">Fetching lab status...</div>
          <button class="lab-btn-ack" id="ackBtn" disabled>Read Message (3s)...</button>
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // 5. FETCH ALERT & ACTIVATE LOCK
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
                    
                    let countdown = 3;
                    const btn = document.getElementById('ackBtn');
                    const timerId = setInterval(() => {
                        countdown--;
                        if (countdown <= 0) {
                            btn.disabled = false;
                            btn.textContent = "Acknowledge & Continue";
                            clearInterval(timerId);
                        } else {
                            btn.textContent = `Read Message (${countdown}s)...`;
                        }
                    }, 1000);
                }
            }
        } catch(e) {}
    }

    // 6. FIREBASE
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

    // 7. EVENT HANDLERS
    document.getElementById('ackBtn').onclick = () => {
        const modal = document.getElementById('labModal');
        modal.classList.add('closing');
        setTimeout(() => document.getElementById('labModalOverlay').classList.remove('visible'), 300);
    };

    document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());

    // DRAG LOGIC
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

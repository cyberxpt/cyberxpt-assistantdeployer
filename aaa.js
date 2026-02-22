import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

// 1. INJECT CSS
const style = document.createElement('style');
style.textContent = `
  #lab-deployer-widget {
    position: fixed; top: 20px; left: 20px; width: 320px; height: auto;
    z-index: 2147483647 !important; background: #ffffff;
    border: 1px solid #ddd; border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
    isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
    min-width: 220px; min-height: 45px; touch-action: none;
  }
  #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; min-height: 45px !important; }
  
  .resizer {
    width: 16px; height: 16px; position: absolute; right: 0; bottom: 0;
    cursor: nwse-resize; z-index: 2147483648;
    background: linear-gradient(135deg, transparent 50%, #ccc 50%, #ccc 60%, transparent 60%, transparent 70%, #ccc 70%);
  }

  .widget-header { 
    padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; 
    display: flex; justify-content: space-between; align-items: center; height: 45px; 
    cursor: move; user-select: none; flex-shrink: 0;
  }

  .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; }
  @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }
  
  .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; scrollbar-width: none; flex-shrink: 0; }
  .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 11px; color: #666; white-space: nowrap; }
  .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }
  
  .content-area { padding: 15px; flex-grow: 1; overflow-y: auto; }
  .lab-hidden { display: none !important; }
  
  #copyContainer { position: relative; background: #1c1c1c; color: #eee; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 11px; margin-bottom: 10px; }
  #CommandtoPasteRun { white-space: pre-wrap; word-break: break-word; margin: 0; color: #00ff00; max-height: 120px; overflow-y: auto; }
  
  .timer-box { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
  .base-timer { position: relative; width: 50px; height: 50px; }
  .base-timer__path-remaining { stroke-width: 7px; stroke-linecap: round; transform: rotate(90deg); transform-origin: center; transition: 1s linear all; fill: none; stroke: currentColor; }
  .base-timer__path-remaining.green { color: #28a745; }
  .base-timer__label { position: absolute; width: 50px; height: 50px; top: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; }
  
  .btn-ext { background: #28a745; color: white; border: none; padding: 8px; border-radius: 4px; flex: 1; cursor: pointer; font-size: 11px; }
  .btn-des { background: #dc3545; color: white; border: none; padding: 8px; border-radius: 4px; flex: 1; cursor: pointer; font-size: 11px; }
`;
document.head.appendChild(style);

// 2. INJECT HTML
const widgetDiv = document.createElement('div');
widgetDiv.id = 'lab-deployer-widget';
widgetDiv.innerHTML = `
  <div class="widget-header" id="drag-handle">
    <div style="display: flex; align-items: center; pointer-events: none;">
      <span class="status-indicator"></span>
      <h4 style="margin:0; font-size:13px; color: #333;">CyberXPT Lab</h4>
    </div>
    <button id="toggle-visibility-btn" style="background:none; border:none; cursor:pointer; font-size: 18px; font-weight: bold; color: #666; width:30px;">−</button>
  </div>
  <div id="widget-main">
    <div class="tabs" id="auth-tabs" style="display:none;">
      <button class="tab-btn active" id="tab-deploy">Deployer</button>
      <button class="tab-btn" id="tab-status">Status</button>
      <button class="tab-btn" id="tab-credits">Credits</button>
    </div>
    <div class="content-area">
      <div id="logged-out-view" style="display:none; text-align: center;">
        <p style="font-size: 12px;">Authentication Required</p>
        <button id="loginBtn" style="width:100%; background:#007bff; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
      </div>
      
      <div id="deploy-tab-content" class="tab-content lab-hidden">
        <select id="chapter" style="width:100%; padding:6px; margin-bottom:10px; font-size:12px;"></select>
        <button id="deployBtn" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
        <div id="output" style="font-size: 11px; margin-top:8px; color:#007bff;"></div>
      </div>

      <div id="status-tab-content" class="tab-content lab-hidden">
        <div id="copyContainer" style="display:none;">
          <button id="copyBtn" style="position:absolute; top:5px; right:5px; background:none; border:none; cursor:pointer;">📋</button>
          <pre id="CommandtoPasteRun" data-copy=""></pre>
        </div>
        <div id="no-lab-msg" style="text-align:center; font-size:12px; color:#666;">ℹ️ No active lab</div>
        <div id="active-timer-section" style="display:none;">
          <div class="timer-box">
            <div class="base-timer">
              <svg viewBox="0 0 100 100"><path id="base-timer-path-remaining" stroke-dasharray="283" class="base-timer__path-remaining green" d="M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0"></path></svg>
              <span id="base-timer-label" class="base-timer__label">00:00</span>
            </div>
            <div style="flex:1; display:flex; gap:5px;">
              <button class="btn-ext" id="btn-extend-action">Extend</button>
              <button class="btn-des" id="btn-destroy-action">Destroy</button>
            </div>
          </div>
        </div>
      </div>

      <div id="credits-tab-content" class="tab-content lab-hidden">
        <div style="text-align:center;">
          <div id="subscription-status" style="font-size:18px; font-weight:bold; color:#28a745;">-</div>
          <div id="expiry-notice" style="font-size:10px; color:#dc3545; margin-top:5px;"></div>
        </div>
      </div>

      <div id="footer-actions" style="margin-top:10px; border-top:1px solid #eee; padding-top:8px; display:none; text-align:right;">
        <button id="signOutBtn" style="font-size:10px; background:none; border:none; color:#dc3545; cursor:pointer;">Sign Out</button>
      </div>
    </div>
  </div>
  <div class="resizer" id="resizer-handle"></div>
`;
document.body.appendChild(widgetDiv);

// 3. INTERACTION LOGIC (Drag & Resize)
(function initInteractions(el) {
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  const header = el.querySelector(".widget-header");
  const resizer = el.querySelector("#resizer-handle");

  header.onmousedown = (e) => {
    if (e.target.id === 'toggle-visibility-btn') return;
    e.preventDefault();
    p3 = e.clientX; p4 = e.clientY;
    document.onmousemove = (e) => {
      p1 = p3 - e.clientX; p2 = p4 - e.clientY;
      p3 = e.clientX; p4 = e.clientY;
      el.style.top = Math.max(0, el.offsetTop - p2) + "px";
      el.style.left = Math.max(0, el.offsetLeft - p1) + "px";
    };
    document.onmouseup = () => { document.onmousemove = null; };
  };

  resizer.onmousedown = (e) => {
    e.preventDefault();
    const startW = el.offsetWidth, startH = el.offsetHeight, startX = e.clientX, startY = e.clientY;
    document.onmousemove = (e) => {
      const nw = startW + (e.clientX - startX);
      const nh = startH + (e.clientY - startY);
      if (nw > 200) el.style.width = nw + "px";
      if (nh > 45) el.style.height = nh + "px";
    };
    document.onmouseup = () => { document.onmousemove = null; };
  };
})(widgetDiv);

// 4. FIREBASE CONFIG & APP
const firebaseConfig = {
  apiKey: "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
  authDomain: "personal-web-a7f48.firebaseapp.com",
  projectId: "personal-web-a7f48",
  appId: "1:314747527325:web:af3fcf13fae585df873474"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
let countdownInterval = null;

// 5. APP FUNCTIONS
const switchTab = (tab) => {
  ['deploy', 'status', 'credits'].forEach(t => {
    document.getElementById(`${t}-tab-content`).classList.add('lab-hidden');
    document.getElementById(`tab-${t}`).classList.remove('active');
  });
  document.getElementById(`${tab}-tab-content`).classList.remove('lab-hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');
  if (tab === 'status') checkStatus();
  if (tab === 'credits') fetchSub();
};

async function checkStatus() {
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
      document.getElementById("CommandtoPasteRun").innerText = data.terminal;
      if (data.destroy_time) startTimer(data.destroy_time, data.start_time);
    } else {
      copyBox.style.display = "none"; timerSect.style.display = "none"; noLab.style.display = "block";
    }
  } catch (e) {}
}

function startTimer(dTimeISO, sTimeISO) {
  clearInterval(countdownInterval);
  const dTime = new Date(dTimeISO).getTime();
  const total = (dTime - new Date(sTimeISO).getTime()) / 1000;
  countdownInterval = setInterval(() => {
    const left = (dTime - Date.now()) / 1000;
    if (left <= 0) { clearInterval(countdownInterval); checkStatus(); return; }
    const m = Math.floor(left / 60), s = Math.floor(left % 60);
    document.getElementById("base-timer-label").innerText = `${m}:${String(s).padStart(2,'0')}`;
    document.getElementById("base-timer-path-remaining").setAttribute("stroke-dasharray", `${((left / total) * 283).toFixed(0)} 283`);
  }, 1000);
}

async function loadChapters() {
  const match = window.location.href.match(/ebook([0-9a-f]{24})/i);
  if (!match) return;
  try {
    const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/${match[1]}.txt`);
    const text = await res.text();
    document.getElementById("chapter").innerHTML = text.split("\n").filter(l => l.trim()).map(l => {
      const p = l.split(",");
      return `<option value="${p[0].trim()}">${(p[1] || p[0]).trim()}</option>`;
    }).join("");
  } catch (e) {}
}

async function fetchSub() {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch("https://labdep.tehwinsam.com/api/subscription", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
  });
  const data = await res.json();
  document.getElementById("subscription-status").innerText = data.msg || "No Credits";
}

// 6. EVENT LISTENERS
document.getElementById('toggle-visibility-btn').onclick = () => {
  const main = document.getElementById('widget-main');
  main.classList.toggle('lab-hidden');
  widgetDiv.classList.toggle('lab-hidden-state');
  document.getElementById('toggle-visibility-btn').textContent = main.classList.contains('lab-hidden') ? '+' : '−';
};
document.getElementById('tab-deploy').onclick = () => switchTab('deploy');
document.getElementById('tab-status').onclick = () => switchTab('status');
document.getElementById('tab-credits').onclick = () => switchTab('credits');
document.getElementById('loginBtn').onclick = () => signInWithPopup(auth, new GoogleAuthProvider());
document.getElementById('signOutBtn').onclick = () => signOut(auth);
document.getElementById('copyBtn').onclick = () => {
  navigator.clipboard.writeText(document.getElementById("CommandtoPasteRun").getAttribute("data-copy"));
};
document.getElementById('deployBtn').onclick = async () => {
  document.getElementById("output").innerText = "Deploying...";
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch("https://labdep.tehwinsam.com/api/deploy", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
    body: JSON.stringify({ chapter: document.getElementById("chapter").value })
  });
  if (res.ok) { document.getElementById("output").innerText = "Success!"; setTimeout(() => switchTab('status'), 1000); }
};

onAuthStateChanged(auth, (user) => {
  const loggedOut = document.getElementById("logged-out-view");
  const tabs = document.getElementById("auth-tabs");
  const footer = document.getElementById("footer-actions");
  if (user) {
    loggedOut.style.display = "none"; tabs.style.display = "flex"; footer.style.display = "block";
    document.getElementById("deploy-tab-content").classList.remove('lab-hidden');
    loadChapters(); checkStatus();
  } else {
    loggedOut.style.display = "block"; tabs.style.display = "none"; footer.style.display = "none";
    document.getElementById("deploy-tab-content").classList.add('lab-hidden');
  }
});

import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

// 1. INJECT CSS
const style = document.createElement('style');
style.textContent = `
  #lab-deployer-widget {
    position: fixed; top: 20px; left: 20px; width: 320px;
    z-index: 2147483647 !important; background: #ffffff;
    border: 1px solid #ddd; border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
    transition: width 0.3s ease, height 0.3s ease; /* Removed 'all' to prevent lag during drag */
    isolation: isolate; overflow: hidden;
    touch-action: none; /* Prevents scrolling while dragging on mobile */
  }
  #lab-deployer-widget.expanded:not(.lab-hidden-state) { width: 550px; min-height: 480px; }
  #lab-deployer-widget.lab-hidden-state { width: 260px !important; height: 45px !important; }
  
  .widget-header { 
    padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee; 
    display: flex; justify-content: space-between; align-items: center; height: 45px; 
    cursor: move; /* Indication that it is draggable */
    user-select: none;
  }

  .status-indicator { height: 8px; width: 8px; background-color: #28a745; border-radius: 50%; display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite; vertical-align: middle; }
  @keyframes pulse-green { 0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7); } 70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(40, 167, 69, 0); } 100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40, 167, 69, 0); } }
  
  .tabs { display: flex; background: #eee; padding: 5px 10px 0; overflow-x: auto; scrollbar-width: none; }
  .tabs::-webkit-scrollbar { display: none; }
  .tab-btn { padding: 8px 12px; border: none; background: #ddd; cursor: pointer; border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px; color: #666; white-space: nowrap; }
  .tab-btn.active { background: #fff; color: #007bff; font-weight: bold; border: 1px solid #ddd; border-bottom: none; }
  
  .content-area { padding: 15px; }
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

// 2. INJECT HTML
const widgetDiv = document.createElement('div');
widgetDiv.id = 'lab-deployer-widget';
widgetDiv.innerHTML = `
  <div class="widget-header" id="drag-handle">
    <div style="display: flex; align-items: center; pointer-events: none;">
      <span class="status-indicator"></span>
      <h4 style="margin:0; font-size:14px; color: #333;">CyberXPT Lab</h4>
    </div>
    <button id="toggle-visibility-btn" onclick="toggleWidgetView()" style="background:none; border:none; cursor:pointer; font-size: 20px; font-weight: bold; color: #666; width:30px; position: relative; z-index: 10;">−</button>
  </div>
  <div id="widget-main">
    <div class="tabs" id="auth-tabs" style="display:none;">
      <button class="tab-btn active" id="tab-deploy" onclick="switchTab('deploy')">Deployer</button>
      <button class="tab-btn" id="tab-status" onclick="switchTab('status')">Live Status</button>
      <button class="tab-btn" id="tab-credits" onclick="switchTab('credits')">Credits</button>
      <button class="tab-btn" id="tab-contact" onclick="switchTab('contact')">Contact Us</button>
    </div>
    <div class="content-area">
      <div id="logged-out-view" style="display:none; text-align: center; padding: 20px;">
        <p style="font-size: 13px;">Please login to continue</p>
        <button onclick="loginWithGoogle()" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer;">Sign in with Google</button>
      </div>
      
      <div id="deploy-tab-content" class="tab-content lab-hidden">
        <label style="font-size:12px; color:#666;">Select Chapter:</label>
        <select id="chapter" style="width:100%; padding:8px; margin-bottom:10px; border-radius:4px; border:1px solid #ccc;"><option value="invalid">Loading Labs...</option></select>
        <button id="deployBtn" onclick="deployLab()" style="width:100%; background:#007bff; color:white; border:none; padding:10px; border-radius:4px; cursor:pointer; font-weight:bold;">🚀 Deploy Lab</button>
        <div id="output" style="font-size: 12px; margin-top:10px; color:#007bff; white-space: pre-wrap;"></div>
      </div>

      <div id="status-tab-content" class="tab-content lab-hidden">
        <div id="copyContainer" style="display:none;">
          <div style="color: #aaa; margin-bottom: 5px; font-size: 10px;">REMOTE TERMINAL ACCESS:</div>
          <button onclick="copyToClipboard()" style="position:absolute; top:8px; right:8px; background:none; border:none; cursor:pointer; font-size:16px;">📋</button>
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
            <button class="btn-ext" id="btn-extend-action" onclick="extendlab()">⏩ Extend</button>
            <button class="btn-des" onclick="destroyLab()">🗑️ Destroy</button>
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
        <button onclick="logoutUser()" style="font-size: 11px; background: none; border: none; color: #dc3545; cursor: pointer;">Sign Out</button>
      </div>
    </div>
  </div>
`;
document.body.appendChild(widgetDiv);

// 3. DRAGGABLE LOGIC
function makeDraggable(el) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  const header = el.querySelector(".widget-header");

  header.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    if (e.target.id === 'toggle-visibility-btn') return;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    
    let newTop = el.offsetTop - pos2;
    let newLeft = el.offsetLeft - pos1;

    // Boundary check
    if (newTop < 0) newTop = 0;
    if (newLeft < 0) newLeft = 0;
    if (newTop + el.offsetHeight > window.innerHeight) newTop = window.innerHeight - el.offsetHeight;
    if (newLeft + el.offsetWidth > window.innerWidth) newLeft = window.innerWidth - el.offsetWidth;

    el.style.top = newTop + "px";
    el.style.left = newLeft + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}
makeDraggable(widgetDiv);

// 4. FIREBASE & LOGIC
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

window.toggleWidgetView = () => {
  const main = document.getElementById('widget-main');
  const widget = document.getElementById('lab-deployer-widget');
  const btn = document.getElementById('toggle-visibility-btn');
  main.classList.toggle('lab-hidden');
  widget.classList.toggle('lab-hidden-state');
  btn.textContent = main.classList.contains('lab-hidden') ? '+' : '−';
};

window.switchTab = (tab) => {
  const widget = document.getElementById('lab-deployer-widget');
  ['deploy', 'status', 'credits', 'contact'].forEach(t => {
    document.getElementById(`${t}-tab-content`).classList.add('lab-hidden');
    document.getElementById(`tab-${t}`).classList.remove('active');
  });
  document.getElementById(`${tab}-tab-content`).classList.remove('lab-hidden');
  document.getElementById(`tab-${tab}`).classList.add('active');

  if (['status', 'credits', 'contact'].includes(tab)) {
    widget.classList.add('expanded');
    if (tab === 'status') checkDeploymentStatus();
    if (tab === 'credits') fetchSubscription();
  } else {
    widget.classList.remove('expanded');
  }
};

async function checkDeploymentStatus() {
  const user = auth.currentUser;
  if (!user) return;
  const idToken = await user.getIdToken();
  try {
    const res = await fetch("https://labdep.tehwinsam.com/api/status", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
    });
    const data = await res.json();
    const timerSection = document.getElementById("active-timer-section");
    const copyBox = document.getElementById("copyContainer");
    const noLabMsg = document.getElementById("no-lab-msg");

    if (res.ok && data.deployed) {
      copyBox.style.display = "block";
      timerSection.style.display = "block";
      noLabMsg.style.display = "none";
      document.getElementById("CommandtoPasteRun").setAttribute("data-copy", data.command);
      document.getElementById("CommandtoPasteRun").innerHTML = data.terminal;
      document.getElementById("instructionText").innerText = data.instruction || "";
      if (data.destroy_time) startDestroyCountdown(data.destroy_time, data.start_time);
    } else {
      copyBox.style.display = "none";
      timerSection.style.display = "none";
      noLabMsg.style.display = "block";
      noLabMsg.innerText = (data.outputs && data.outputs.msg) ? "ℹ️ No lab running" : (data.outputs || "ℹ️ There is no lab running");
      clearInterval(countdownInterval);
    }
  } catch (e) { document.getElementById("no-lab-msg").innerText = "ℹ️ There is no lab running"; }
}

function startDestroyCountdown(destroyTimeISO, startTimeISO) {
  clearInterval(countdownInterval);
  const destroyTime = new Date(destroyTimeISO).getTime();
  const startTime = new Date(startTimeISO).getTime();
  const totalDuration = (destroyTime - startTime) / 1000;
  const label = document.getElementById("base-timer-label");
  const path = document.getElementById("base-timer-path-remaining");

  countdownInterval = setInterval(() => {
    const timeLeft = (destroyTime - Date.now()) / 1000;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      label.innerText = "00:00:00";
      path.setAttribute("stroke-dasharray", `0 ${FULL_DASH_ARRAY}`);
      checkDeploymentStatus();
      return;
    }
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = Math.floor(timeLeft % 60);
    label.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;

    path.classList.remove("green", "orange", "red");
    if (timeLeft <= 300) path.classList.add("red");
    else if (timeLeft <= 600) path.classList.add("orange");
    else path.classList.add("green");

    const dashArray = `${((timeLeft / totalDuration) * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`;
    path.setAttribute("stroke-dasharray", dashArray);
  }, 1000);
}

window.extendlab = async () => {
  const btn = document.getElementById("btn-extend-action");
  const originalText = btn.innerText;
  btn.disabled = true; btn.innerText = "⏳ Extending...";
  const idToken = await auth.currentUser.getIdToken();
  try {
    const res = await fetch("https://labdep.tehwinsam.com/api/extend", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
    });
    if (res.ok) { await checkDeploymentStatus(); alert("✅ Success: Extended!"); }
  } catch (e) { alert("❌ Connection error."); }
  finally { btn.disabled = false; btn.innerText = originalText; }
};

window.deployLab = async () => {
  const output = document.getElementById("output");
  output.innerText = "⏳ Deploying...";
  const idToken = await auth.currentUser.getIdToken();
  try {
    const res = await fetch("https://labdep.tehwinsam.com/api/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
      body: JSON.stringify({ chapter: document.getElementById("chapter").value })
    });
    if (res.ok) { output.innerText = "🚀 Deployed!"; setTimeout(() => switchTab('status'), 800); }
  } catch (e) { output.innerText = "❌ Error."; }
};

window.destroyLab = async () => {
  if (!confirm("Destroy lab?")) return;
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch("https://labdep.tehwinsam.com/api/destroy", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
  });
  if (res.ok) { clearInterval(countdownInterval); switchTab('deploy'); }
};

window.copyToClipboard = () => {
  const cmd = document.getElementById("CommandtoPasteRun").getAttribute("data-copy");
  navigator.clipboard.writeText(cmd);
  const status = document.getElementById("copyStatus");
  status.style.display = "inline"; setTimeout(() => status.style.display = "none", 1500);
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("logged-out-view").style.display = "none";
    document.getElementById("auth-tabs").style.display = "flex";
    document.getElementById("footer-actions").style.display = "block";
    document.getElementById("deploy-tab-content").classList.remove('lab-hidden');
    loadChapters();
    checkDeploymentStatus();
  } else {
    document.getElementById("logged-out-view").style.display = "block";
    document.getElementById("auth-tabs").style.display = "none";
    document.getElementById("footer-actions").style.display = "none";
    document.getElementById("deploy-tab-content").classList.add('lab-hidden');
    ['status', 'credits', 'contact'].forEach(t => document.getElementById(`${t}-tab-content`).classList.add('lab-hidden'));
    clearInterval(countdownInterval);
  }
});

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
    const options = text.split("\n").filter(l => l.trim()).map(c => `<option value="${c.trim()}">${c.trim()}</option>`).join("");
    document.getElementById("chapter").innerHTML = options || '<option value="invalid">Unit file is empty</option>';
  } catch (e) { document.getElementById("chapter").innerHTML = '<option value="invalid">No labs available</option>'; }
}

window.loginWithGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logoutUser = () => signOut(auth);

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
      const formattedDate = dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      expiryEl.innerHTML = `⚠️ Lab access expires on <strong>${formattedDate}</strong>`;
    } else {
      expiryEl.innerText = "";
    }
  } catch (e) { subEl.innerText = "Error loading credits"; }
}

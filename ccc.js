(async function () {

  // ─── 1. PREVENT DUPLICATES ───────────────────────────────────────────────────
  if (document.getElementById('lab-deployer-widget'))      document.getElementById('lab-deployer-widget').remove();
  if (document.getElementById('lab-notification-overlay')) document.getElementById('lab-notification-overlay').remove();

  // ─── 2. DYNAMICALLY IMPORT FIREBASE ─────────────────────────────────────────
  const { initializeApp, getApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js");
  const { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup } = await import("https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js");

  // ─── 3. INJECT ALL CSS ───────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `

    /* ══════════════════════════════════════════════
       DEPLOYER WIDGET
    ══════════════════════════════════════════════ */
    #lab-deployer-widget {
      position: fixed; top: 20px; left: 20px; width: 550px; height: 480px;
      z-index: 2147483640 !important; background: #ffffff;
      border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2); font-family: sans-serif;
      isolation: isolate; overflow: hidden; display: flex; flex-direction: column;
      min-width: 260px; min-height: 45px; touch-action: none;
    }
    #lab-deployer-widget.lab-hidden-state {
      width: 260px !important; height: 45px !important; min-height: 45px !important;
    }
    #lab-deployer-widget.lab-blocked {
      pointer-events: none; user-select: none;
      filter: blur(1.5px) brightness(0.85);
    }

    #widget-main { display: flex; flex-direction: column; flex-grow: 1; }

    .resizer {
      width: 15px; height: 15px; position: absolute; right: 2px; bottom: 2px;
      cursor: nwse-resize; z-index: 2147483641;
      background-image: linear-gradient(135deg, transparent 20%, #bbb 20%, #bbb 35%, transparent 35%,
                        transparent 50%, #bbb 50%, #bbb 65%, transparent 65%);
      background-size: 10px 10px;
    }

    .widget-header {
      padding: 10px 15px; background: #f8f9fa; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
      height: 45px; cursor: move; user-select: none; flex-shrink: 0;
    }
    .status-indicator {
      height: 8px; width: 8px; background-color: #28a745; border-radius: 50%;
      display: inline-block; margin-right: 8px; animation: pulse-green 2s infinite;
    }
    @keyframes pulse-green {
      0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40,167,69,0.7); }
      70%  { transform: scale(1);    box-shadow: 0 0 0 5px rgba(40,167,69,0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(40,167,69,0); }
    }

    .tabs {
      display: flex; background: #eee; padding: 5px 10px 0;
      overflow-x: auto; flex-shrink: 0; scrollbar-width: none;
    }
    .tabs::-webkit-scrollbar { display: none; }
    .tab-btn {
      padding: 8px 12px; border: none; background: #ddd; cursor: pointer;
      border-radius: 5px 5px 0 0; margin-right: 5px; font-size: 12px;
      color: #666; white-space: nowrap;
    }
    .tab-btn.active {
      background: #fff; color: #007bff; font-weight: bold;
      border: 1px solid #ddd; border-bottom: none;
    }

    .content-area {
      padding: 15px; flex-grow: 1; overflow-y: auto;
      display: flex; flex-direction: column;
    }
    .lab-hidden { display: none !important; }

    /* ── Timer ── */
    .timer-box { display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; }
    .base-timer { position: relative; width: 60px; height: 60px; }
    .base-timer__svg { transform: scaleX(-1); }
    .base-timer__circle { fill: none; stroke: none; }
    .base-timer__path-elapsed { stroke-width: 7px; stroke: #eee; }
    .base-timer__path-remaining {
      stroke-width: 7px; stroke-linecap: round;
      transform: rotate(90deg); transform-origin: center;
      transition: 1s linear all; fill-rule: nonzero; stroke: currentColor;
    }
    .base-timer__path-remaining.green  { color: #28a745; }
    .base-timer__path-remaining.orange { color: #fd7e14; }
    .base-timer__path-remaining.red    { color: #dc3545; }
    .base-timer__label {
      position: absolute; width: 60px; height: 60px; top: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: bold; font-family: monospace; color: #333;
    }

    /* ── Terminal ── */
    #copyContainer {
      position: relative; background: #1c1c1c; color: #eee;
      border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; text-align: left;
    }
    #CommandtoPasteRun {
      white-space: pre-wrap; word-break: break-all; margin: 0;
      color: #00ff00; max-height: 180px; overflow-y: auto; text-align: left;
    }
    #instructionText {
      margin-top: 10px; font-size: 11px; color: #00f9e2;
      border-top: 1px solid #333; padding-top: 8px;
      line-height: 1.4; text-align: left; white-space: pre-wrap;
    }

    /* ── Action Grid ── */
    .action-grid { display: grid; gap: 10px; margin-top: 14px; }
    .action-grid--4 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
    .action-grid--3 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
    .action-grid--3 .cell-timer { grid-column: 1 / -1; }
    .grid-cell {
      border-radius: 14px; padding: 14px 12px;
      display: flex; align-items: center; gap: 10px;
      cursor: pointer; border: none; font-family: sans-serif;
      transition: all .22s; box-sizing: border-box; width: 100%; text-align: left;
    }
    .cell-timer { background: linear-gradient(135deg,#f5f3ff,#eff6ff); border: 1.5px solid #c4b5fd; cursor: default; gap: 12px; }
    .cell-timer-info  { flex: 1; }
    .cell-timer-status { font-size: 13px; font-weight: 700; color: #3730a3; }
    .cell-timer-sub    { font-size: 10px; color: #a78bfa; margin-top: 2px; }
    .cell-kali { background: linear-gradient(135deg,#f5f3ff,#eff6ff); border: 1.5px solid #c4b5fd; flex-direction: row; }
    .cell-kali:hover { border-color: #9333ea; transform: translateY(-1px); box-shadow: 0 6px 18px rgba(147,51,234,0.15); }
    .kali-pill-icon { background: linear-gradient(135deg,#9333ea,#6366f1); border-radius: 50px; padding: 7px 10px; font-size: 16px; flex-shrink: 0; box-shadow: 0 3px 8px rgba(147,51,234,0.25); }
    .kali-cell-text  { flex: 1; }
    .kali-cell-title { font-size: 12px; color: #3730a3; font-weight: 700; }
    .kali-cell-sub   { font-size: 10px; color: #a78bfa; margin-top: 2px; }
    .kali-cell-arrow { color: #9333ea; font-size: 18px; flex-shrink: 0; }
    .cell-extend { background: #f0fdf4; border: 1.5px solid #86efac; flex-direction: column; justify-content: center; align-items: center; gap: 6px; padding: 14px 8px; }
    .cell-extend:hover { background: #dcfce7; border-color: #22c55e; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34,197,94,0.15); }
    .cell-extend .cell-icon  { font-size: 20px; }
    .cell-extend .cell-label { font-size: 12px; font-weight: 700; color: #15803d; }
    .cell-destroy { background: #fff1f2; border: 1.5px solid #fda4af; flex-direction: column; justify-content: center; align-items: center; gap: 6px; padding: 14px 8px; }
    .cell-destroy:hover { background: #ffe4e6; border-color: #f43f5e; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(244,63,94,0.15); }
    .cell-destroy .cell-icon  { font-size: 20px; }
    .cell-destroy .cell-label { font-size: 12px; font-weight: 700; color: #be123c; }

    /* ── Credits / Contact ── */
    .credit-card-box { text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7; }
    .contact-box { text-align: center; padding: 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; }
    .email-link { color: #007bff; font-weight: bold; text-decoration: none; font-size: 14px; display: block; margin: 10px 0; }
    .btn-email { display: inline-block; background: #007bff; color: white; padding: 8px 16px; border-radius: 5px; text-decoration: none; font-size: 12px; font-weight: bold; }
    .discord-box { text-align: center; padding: 16px; background: #f0f0ff; border: 1.5px solid #c7d2fe; border-radius: 8px; }
    .btn-discord { display: inline-block; background: #5865F2; color: white; padding: 9px 20px; border-radius: 6px; text-decoration: none; font-size: 12px; font-weight: 700; transition: background .18s; }
    .btn-discord:hover { background: #4752c4; }

    /* ══════════════════════════════════════════════
       NOTIFICATION MODAL — ARCTIC WHITE THEME
    ══════════════════════════════════════════════ */
    #lab-notification-overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 2147483647 !important;
      opacity: 0; pointer-events: none;
      transition: opacity .3s ease;
      background: radial-gradient(ellipse at center, rgba(160,185,255,.35) 0%, rgba(80,100,200,.25) 100%);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    }
    #lab-notification-overlay.visible { opacity: 1; pointer-events: all; }

    .lab-modal {
      width: 520px; border-radius: 28px; overflow: hidden; position: relative;
      background: linear-gradient(135deg, rgba(235,242,255,.97) 0%, rgba(215,228,255,.94) 50%, rgba(225,236,255,.96) 100%);
      backdrop-filter: blur(40px) saturate(160%); -webkit-backdrop-filter: blur(40px) saturate(160%);
      border: 1px solid rgba(140,180,255,.35);
      box-shadow: 0 2px 0 rgba(255,255,255,.9) inset,
                  0 32px 64px rgba(80,120,255,.18),
                  0 8px 24px rgba(100,140,255,.12);
      font-family: -apple-system, 'Helvetica Neue', sans-serif;
      animation: labFloatIn .55s cubic-bezier(.34,1.4,.64,1);
    }
    .lab-modal::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 48%;
      background: linear-gradient(180deg, rgba(255,255,255,.6) 0%, transparent 100%);
      border-radius: 28px 28px 0 0; pointer-events: none; z-index: 2;
    }
    .lab-modal.closing { animation: labFloatOut .35s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes labFloatIn  { from { transform: scale(.84) translateY(28px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    @keyframes labFloatOut { from { transform: scale(1) translateY(0); opacity: 1; } to { transform: scale(.9) translateY(-16px); opacity: 0; } }

    .lab-modal-header {
      background: linear-gradient(135deg, rgba(195,215,255,.97), rgba(175,200,255,.97));
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(120,165,255,.25);
      padding: 18px 24px; display: flex; align-items: center; gap: 12px;
      position: relative; z-index: 3;
    }
    .lab-modal-icon  { font-size: 20px; }
    .lab-modal-title { font-size: 15px; font-weight: 800; color: rgba(30,60,160,.9); letter-spacing: .02em; }

    .lab-modal-body  { padding: 22px 20px 16px; position: relative; z-index: 3; }
    .lab-modal-label {
      font-size: 10px; font-weight: 600; color: rgba(60,100,210,.5);
      letter-spacing: .16em; text-transform: uppercase; margin-bottom: 10px;
    }
    .lab-message-card {
      background: rgba(100,140,255,.08); border: 1px solid rgba(120,165,255,.22);
      border-radius: 14px; padding: 14px 16px;
      box-shadow: 0 1px 0 rgba(255,255,255,.8) inset;
    }
    .lab-message-text {
      font-size: 15px; font-weight: 400; color: rgba(25,55,140,.85);
      line-height: 1.55; letter-spacing: -.1px; white-space: pre-wrap;
    }

    .lab-modal-footer { padding: 12px 16px 20px; position: relative; z-index: 3; }
    .lab-btn-ack {
      width: 100%; padding: 15px; border-radius: 16px; border: none;
      cursor: not-allowed; opacity: 0.6;
      font-family: -apple-system,'Helvetica Neue',sans-serif;
      font-size: 16px; font-weight: 600; letter-spacing: -.2px;
      position: relative; overflow: hidden;
      background: linear-gradient(160deg, rgba(100,145,255,.28) 0%, rgba(60,100,230,.16) 50%, rgba(40,80,210,.12) 100%);
      color: rgba(25,60,170,.92);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(100,145,255,.32);
      box-shadow: 0 1px 0 rgba(255,255,255,.75) inset, 0 4px 16px rgba(80,120,255,.15);
      transition: transform .14s ease, box-shadow .14s ease;
    }
    .lab-btn-ack::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
      background: linear-gradient(180deg, rgba(255,255,255,.45) 0%, transparent 100%);
      border-radius: 16px 16px 0 0; pointer-events: none; z-index: 2;
    }
    .lab-btn-ack::after {
      content: ''; position: absolute; inset: 0;
      background: linear-gradient(90deg, rgba(100,145,255,.22) 0%, rgba(80,130,255,.14) 100%);
      border-radius: 16px; transform: translateX(-100%); transition: none; z-index: 1;
    }
    .lab-btn-ack.ack-counting::after { transform: translateX(0%); transition: transform 3s linear; }
    .lab-btn-ack.ack-ready  { cursor: pointer; opacity: 1; }
    .lab-btn-ack.ack-ready:hover  { transform: scale(1.015); box-shadow: 0 1px 0 rgba(255,255,255,.75) inset, 0 6px 22px rgba(80,120,255,.25); }
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
        <button class="lab-btn-ack" id="labAckBtn" disabled>
          <span id="labAckLabel">Read message — 3s</span>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(notifOverlay);

  // ─── 5. INJECT DEPLOYER WIDGET HTML ─────────────────────────────────────────
  const widget = document.createElement('div');
  widget.id = 'lab-deployer-widget';
  widget.classList.add('lab-blocked'); // blocked until notification resolved
  widget.innerHTML = `
    <div class="widget-header" id="drag-handle">
      <div style="display:flex;align-items:center;pointer-events:none;">
        <span class="status-indicator"></span>
        <h4 style="margin:0;font-size:14px;color:#333;">CyberXPT Lab</h4>
      </div>
      <button id="toggle-visibility-btn" style="background:none;border:none;cursor:pointer;font-size:20px;font-weight:bold;color:#666;width:30px;position:relative;z-index:10;">−</button>
    </div>

    <div id="widget-main">
      <div class="tabs" id="auth-tabs" style="display:none;">
        <button class="tab-btn active" id="tab-deploy">Deployer</button>
        <button class="tab-btn"        id="tab-status">Live Status</button>
        <button class="tab-btn"        id="tab-credits">Credits</button>
        <button class="tab-btn"        id="tab-contact">Contact Us</button>
      </div>

      <div class="content-area">

        <!-- Logged-out view -->
        <div id="logged-out-view" style="display:none;text-align:center;padding:20px;">
          <p style="font-size:13px;">Please login to continue</p>
          <button id="loginBtn" style="width:100%;background:#007bff;color:white;border:none;padding:10px;border-radius:4px;cursor:pointer;">Sign in with Google</button>
        </div>

        <!-- ── DEPLOY TAB ── -->
        <div id="deploy-tab-content" class="tab-content">
          <label style="font-size:12px;color:#666;display:block;margin-bottom:5px;">Select Chapter:</label>
          <select id="chapter" style="width:100%;padding:8px;margin-bottom:12px;border-radius:4px;border:1px solid #ccc;">
            <option value="invalid">Loading Labs...</option>
          </select>

          <!-- Kali Linux Card -->
          <div id="kali-toggle-wrapper" style="margin-bottom:12px;background:linear-gradient(135deg,#1e293b 0%,#0f172a 100%);border-radius:10px;padding:12px 14px;position:relative;overflow:hidden;border:1px solid #334155;">
            <div style="position:absolute;top:-28px;right:-28px;width:70px;height:70px;background:radial-gradient(circle,rgba(99,102,241,0.25) 0%,transparent 70%);pointer-events:none;"></div>
            <div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;position:relative;">
              <div style="width:30px;height:30px;background:rgba(99,102,241,0.18);border:1px solid rgba(99,102,241,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">🐉</div>
              <div style="flex:1;">
                <div style="font-size:12px;font-weight:600;color:#e2e8f0;font-family:sans-serif;line-height:1.2;">Kali Linux Environment</div>
                <div style="font-size:10px;color:#475569;font-family:sans-serif;margin-top:1px;">No Kali? We'll provision a remote instance auto-destroyed with your lab.</div>
              </div>
              <span style="font-size:9px;background:rgba(99,102,241,0.18);color:#a78bfa;border:1px solid rgba(139,92,246,0.3);padding:2px 7px;border-radius:100px;white-space:nowrap;flex-shrink:0;">OPTIONAL</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;position:relative;">
              <span id="kali-status-label" style="font-size:11px;color:#475569;font-family:sans-serif;transition:color .25s;">Off - not included</span>
              <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0;">
                <input type="checkbox" id="kali-toggle-checkbox" style="opacity:0;width:0;height:0;position:absolute;">
                <span id="kali-toggle-track" style="position:absolute;inset:0;background:#2d3748;border-radius:100px;transition:background .25s;border:1px solid #4a5568;"></span>
                <span id="kali-toggle-thumb" style="position:absolute;width:18px;height:18px;background:white;border-radius:50%;top:3px;left:3px;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.4);"></span>
              </label>
            </div>
            <div id="kali-warning" style="display:none;margin-top:10px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.3);border-radius:6px;padding:9px 11px;">
              <div style="display:flex;align-items:flex-start;gap:7px;">
                <span style="font-size:14px;flex-shrink:0;">⚠️</span>
                <div>
                  <div style="font-size:11px;font-weight:700;color:#fbbf24;margin-bottom:3px;font-family:sans-serif;">Longer Deployment Time</div>
                  <div style="font-size:10px;color:#a8956a;line-height:1.6;font-family:sans-serif;">Including Kali Linux may take <strong style="color:#fbbf24;">10 – 15 minutes</strong> to fully deploy. The entire lab including the Kali instance will be ready once deployment completes.</div>
                </div>
              </div>
            </div>
          </div>
          <!-- End Kali Card -->

          <!-- Deploy Button -->
          <button id="deployBtn" style="width:100%;padding:10px 14px;background:#fff;border:1px solid #e5e7eb;border-left:3px solid #6366f1;border-radius:6px;display:flex;align-items:center;gap:10px;cursor:pointer;font-family:sans-serif;transition:all .18s;">
            <span style="font-size:15px;flex-shrink:0;">🚀</span>
            <div style="flex:1;text-align:left;">
              <div style="font-size:12px;font-weight:600;color:#111;line-height:1.3;">Deploy Lab</div>
              <div style="font-size:10px;color:#9ca3af;">Ready to launch</div>
            </div>
            <span style="color:#6366f1;font-size:16px;font-weight:300;">›</span>
          </button>

          <div id="deploy-loader" style="display:none;text-align:center;margin-top:10px;color:#007bff;font-weight:bold;font-size:12px;">⏳ Sending Request...</div>
          <div id="output" style="font-size:12px;margin-top:10px;color:#007bff;white-space:pre-wrap;"></div>
        </div>

        <!-- ── STATUS TAB ── -->
        <div id="status-tab-content" class="tab-content lab-hidden">
          <div id="copyContainer" style="display:none;">
            <div style="color:#aaa;margin-bottom:5px;font-size:10px;">REMOTE TERMINAL ACCESS:</div>
            <button id="copyBtn" style="position:absolute;top:8px;right:8px;background:none;border:none;cursor:pointer;font-size:16px;">📋</button>
            <span id="copyStatus" style="position:absolute;top:10px;right:35px;color:lightgreen;font-size:10px;display:none;">Copied!</span>
            <pre id="CommandtoPasteRun" data-copy=""></pre>
            <div id="instructionText"></div>
          </div>
          <div id="no-lab-msg" style="text-align:center;padding:20px;color:#666;font-size:13px;">ℹ️ Checking lab status...</div>
          <div id="active-timer-section" style="display:none;">
            <div id="action-grid" class="action-grid action-grid--4">

              <!-- Cell 1: Timer -->
              <div class="grid-cell cell-timer">
                <div class="base-timer">
                  <svg class="base-timer__svg" viewBox="0 0 100 100">
                    <g class="base-timer__circle">
                      <circle class="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
                      <path id="base-timer-path-remaining" stroke-dasharray="283"
                        class="base-timer__path-remaining green"
                        d="M 50, 50 m -45, 0 a 45,45 0 1,0 90,0 a 45,45 0 1,0 -90,0"></path>
                    </g>
                  </svg>
                  <span id="base-timer-label" class="base-timer__label">00:00:00</span>
                </div>
                <div class="cell-timer-info">
                  <div id="status-msg" class="cell-timer-status">Lab Active</div>
                  <div class="cell-timer-sub">Auto Teardown</div>
                </div>
              </div>

              <!-- Cell 2: Kali launch (hidden until kali IP returned) -->
              <a id="kali-launch-btn" href="#" target="_blank" class="grid-cell cell-kali" style="display:none;text-decoration:none;">
                <div class="kali-pill-icon">🐉</div>
                <div class="kali-cell-text">
                  <div class="kali-cell-title">Open Kali</div>
                  <div class="kali-cell-sub">Browser desktop</div>
                </div>
                <span class="kali-cell-arrow">›</span>
              </a>

              <!-- Cell 3: Extend -->
              <button class="grid-cell cell-extend" id="extendBtn">
                <span class="cell-icon">⏩</span>
                <div class="cell-label">Extend</div>
              </button>

              <!-- Cell 4: Destroy -->
              <button class="grid-cell cell-destroy" id="destroyBtn">
                <span class="cell-icon">🗑️</span>
                <div class="cell-label">Destroy</div>
              </button>

            </div>
          </div>
        </div>

        <!-- ── CREDITS TAB ── -->
        <div id="credits-tab-content" class="tab-content lab-hidden">
          <div class="credit-card-box">
            <div style="font-size:12px;color:#666;">Account Subscription</div>
            <div id="subscription-status" style="font-size:24px;font-weight:bold;color:#166534;margin:10px 0;">Fetching...</div>
            <div id="expiry-notice" style="font-size:11px;color:#dc3545;margin-top:10px;font-style:italic;"></div>
          </div>
        </div>

        <!-- ── CONTACT TAB ── -->
        <div id="contact-tab-content" class="tab-content lab-hidden">
          <div class="contact-box">
            <p style="font-size:13px;color:#475569;">Encountered an issue or have an enquiry?</p>
            <a href="mailto:info@cyberxpt.com" class="email-link">info@cyberxpt.com</a>
            <a href="mailto:info@cyberxpt.com?subject=Lab Enquiry" class="btn-email">📧 Send Email</a>
            <p style="font-size:11px;color:#94a3b8;margin-top:15px;">Include your Student ID for faster support.</p>
          </div>
          <div style="display:flex;align-items:center;gap:10px;margin:14px 0;">
            <div style="flex:1;height:1px;background:#e2e8f0;"></div>
            <span style="font-size:11px;color:#94a3b8;font-weight:600;letter-spacing:.5px;">OR</span>
            <div style="flex:1;height:1px;background:#e2e8f0;"></div>
          </div>
          <div class="discord-box">
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:6px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#5865F2" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 13.845 13.845 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span style="font-size:13px;font-weight:700;color:#5865F2;">Join our Discord</span>
            </div>
            <p style="font-size:11px;color:#64748b;margin:0 0 12px;">Connect with the CyberXPT community, get help, and stay updated.</p>
            <a id="discord-invite-link" href="https://discord.gg/GKVJHh3M" target="_blank" class="btn-discord">Join Server →</a>
          </div>
        </div>

        <!-- Footer -->
        <div id="footer-actions" style="margin-top:auto;border-top:1px solid #eee;padding-top:10px;display:none;text-align:right;">
          <button id="logoutBtn" style="font-size:11px;background:none;border:none;color:#dc3545;cursor:pointer;">Sign Out</button>
        </div>

      </div>
    </div>
    <div class="resizer" id="resizer-handle"></div>
  `;
  document.body.appendChild(widget);

  // ─── 6. NOTIFICATION MODAL LOGIC ─────────────────────────────────────────────
  const unblockWidget = () => widget.classList.remove('lab-blocked');

  const showNotification = (message) => {
    document.getElementById('labMessageText').textContent = message;
    notifOverlay.classList.add('visible');

    const btn   = document.getElementById('labAckBtn');
    const label = document.getElementById('labAckLabel');
    let seconds = 3;
    label.textContent = `Read message — ${seconds}s`;

    // Trigger CSS progress sweep on next paint
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
    if (btn.disabled) return;
    const modal = document.getElementById('labModal');
    modal.classList.add('closing');
    setTimeout(() => {
      notifOverlay.classList.remove('visible');
      modal.classList.remove('closing');
      unblockWidget();
    }, 380);
  };

  document.getElementById('labAckBtn').onclick = acknowledgeNotification;

  // Fetch alert from GitHub — unblock immediately if nothing found
  (async () => {
    try {
      const idMatch = window.location.href.match(/ebook([0-9a-f]{24})/i);
      if (!idMatch) { unblockWidget(); return; }
      const res  = await fetch(`https://raw.githubusercontent.com/cyberxpt/labalertprompt/refs/heads/main/${idMatch[1]}.txt`);
      if (!res.ok) { unblockWidget(); return; }
      const text = (await res.text()).trim();
      if (!text)  { unblockWidget(); return; }
      showNotification(text);
    } catch (e) { unblockWidget(); }
  })();

  // ─── 7. KALI TOGGLE ──────────────────────────────────────────────────────────
  const handleKaliToggle = (enabled) => {
    const track   = document.getElementById('kali-toggle-track');
    const thumb   = document.getElementById('kali-toggle-thumb');
    const label   = document.getElementById('kali-status-label');
    const warning = document.getElementById('kali-warning');
    if (enabled) {
      track.style.background  = '#6366f1';
      track.style.borderColor = '#4f46e5';
      thumb.style.transform   = 'translateX(20px)';
      label.style.color       = '#c4b5fd';
      label.innerText         = 'On - Kali will be provisioned';
      warning.style.display   = 'block';
    } else {
      track.style.background  = '#2d3748';
      track.style.borderColor = '#4a5568';
      thumb.style.transform   = 'translateX(0px)';
      label.style.color       = '#475569';
      label.innerText         = 'Off - not included';
      warning.style.display   = 'none';
    }
  };
  document.getElementById('kali-toggle-checkbox').addEventListener('change', function () {
    if (this.disabled) { this.checked = false; return; } // hard stop if locked
    handleKaliToggle(this.checked);
  });

  // ─── 8. FIREBASE SETUP ───────────────────────────────────────────────────────
  const firebaseConfig = {
    apiKey:     "AIzaSyAST9H3CCj8nrJuNUq0h4jqsyKl10anBrw",
    authDomain: "personal-web-a7f48.firebaseapp.com",
    projectId:  "personal-web-a7f48",
    appId:      "1:314747527325:web:af3fcf13fae585df873474"
  };
  const app  = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);

  // ─── 9. DEPLOYER STATE & HELPERS ─────────────────────────────────────────────
  let countdownInterval = null;
  let pollInterval      = null;
  const FULL_DASH_ARRAY = 283;
  const DISCORD_INVITE  = "https://discord.gg/GKVJHh3M";
  document.getElementById('discord-invite-link').href = DISCORD_INVITE;

  const setGridMode = (hasKali) => {
    const grid    = document.getElementById('action-grid');
    const kaliBtn = document.getElementById('kali-launch-btn');
    if (hasKali) {
      grid.className        = 'action-grid action-grid--4';
      kaliBtn.style.display = 'flex';
    } else {
      grid.className        = 'action-grid action-grid--3';
      kaliBtn.style.display = 'none';
    }
  };

  const resetLiveStatusUI = () => {
    document.getElementById("no-lab-msg").style.display           = "block";
    document.getElementById("no-lab-msg").innerText               = "ℹ️ There is no lab running";
    document.getElementById("copyContainer").style.display        = "none";
    document.getElementById("active-timer-section").style.display = "none";
    document.getElementById("CommandtoPasteRun").innerHTML        = "";
    document.getElementById("CommandtoPasteRun").setAttribute("data-copy", "");
    document.getElementById("instructionText").innerHTML          = "";
    setGridMode(false);
    clearInterval(countdownInterval);
    stopPolling();
  };

  const startPolling = () => { stopPolling(); pollInterval = setInterval(() => checkDeploymentStatus(true), 20000); };
  const stopPolling  = () => { clearInterval(pollInterval); pollInterval = null; };

  // ─── 10. UI UPDATE ───────────────────────────────────────────────────────────
  const updateUI = (data) => {
    if (!data) return;
    const noLabMsg     = document.getElementById("no-lab-msg");
    const copyBox      = document.getElementById("copyContainer");
    const timerSect    = document.getElementById("active-timer-section");
    const terminal     = document.getElementById("CommandtoPasteRun");
    const instructions = document.getElementById("instructionText");
    const isDeploying  = sessionStorage.getItem("is_deploying") === "true";

    if (data.deployed) {
      sessionStorage.removeItem("is_deploying");
      noLabMsg.style.display  = "none";
      copyBox.style.display   = "block";
      timerSect.style.display = "block";
      terminal.setAttribute("data-copy", data.command);
      terminal.innerHTML      = data.terminal;
      instructions.innerHTML  = data.instruction || "";
      startDestroyCountdown(data.destroy_time, data.start_time);
      stopPolling();
      // Detect Kali IP — matches _3_kali_public_ip, _10_kali_public_ip, etc.
      const kaliKey = data.outputs && Object.keys(data.outputs).find(k => /^_\d+_kali_public_ip$/.test(k));
      const kaliIp  = kaliKey && data.outputs[kaliKey].value;
      if (kaliIp) {
        document.getElementById('kali-launch-btn').href = `http://${kaliIp}:80/vnc.html?autoconnect=true&resize=scale&quality=6&password=cyberxpt`;
        setGridMode(true);
      } else {
        setGridMode(false);
      }
    } else if (isDeploying) {
      copyBox.style.display   = "none";
      timerSect.style.display = "none";
      noLabMsg.style.display  = "block";
      noLabMsg.innerText      = "⏳ Lab is building (approx 5 mins)...";
      startPolling();
    } else {
      resetLiveStatusUI();
      const activeTab = document.querySelector('.tab-btn.active');
      if (activeTab && activeTab.id === 'tab-status') switchTab('deploy');
    }
  };

  // ─── 11. DUAL-LAYER STATUS CHECK ─────────────────────────────────────────────
  const checkDeploymentStatus = async (forceFetch = false, initialLoad = false) => {
    const cached      = sessionStorage.getItem("lab_status");
    const isDeploying = sessionStorage.getItem("is_deploying") === "true";
    let hasActiveState = false;

    if (isDeploying) {
      updateUI({ deployed: false });
      hasActiveState = true;
      if (initialLoad) switchTab('status');
    } else if (cached && !forceFetch) {
      const cachedData = JSON.parse(cached);
      if (cachedData.deployed) { updateUI(cachedData); hasActiveState = true; if (initialLoad) switchTab('status'); }
    }

    if (auth.currentUser) {
      try {
        const idToken   = await auth.currentUser.getIdToken();
        const res       = await fetch("https://labdep.cyberxpt.com/api/status", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
        });
        const freshData = await res.json();
        sessionStorage.setItem("lab_status", JSON.stringify(freshData));
        updateUI(freshData);
        if (!hasActiveState && initialLoad && freshData.deployed) switchTab('status');
      } catch (e) { console.error("Background sync error", e); }
    }
  };

  // ─── 12. COUNTDOWN TIMER ─────────────────────────────────────────────────────
  function startDestroyCountdown(destroyTimeISO, startTimeISO) {
    clearInterval(countdownInterval);
    const dTime         = new Date(destroyTimeISO).getTime();
    const sTime         = new Date(startTimeISO).getTime();
    const totalDuration = (dTime - sTime) / 1000;
    const label         = document.getElementById("base-timer-label");
    const path          = document.getElementById("base-timer-path-remaining");

    countdownInterval = setInterval(() => {
      const timeLeft = (dTime - Date.now()) / 1000;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        label.innerText = "00:00:00";
        path.setAttribute("stroke-dasharray", `0 ${FULL_DASH_ARRAY}`);
        checkDeploymentStatus(true);
        return;
      }
      const h = Math.floor(timeLeft / 3600);
      const m = Math.floor((timeLeft % 3600) / 60);
      const s = Math.floor(timeLeft % 60);
      label.innerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      path.classList.remove("green", "orange", "red");
      if      (timeLeft <= 300) path.classList.add("red");
      else if (timeLeft <= 600) path.classList.add("orange");
      else                      path.classList.add("green");
      path.setAttribute("stroke-dasharray", `${((timeLeft / totalDuration) * FULL_DASH_ARRAY).toFixed(0)} ${FULL_DASH_ARRAY}`);
    }, 1000);
  }

  // ─── 13. TAB SWITCHER ────────────────────────────────────────────────────────
  const switchTab = (tab) => {
    ['deploy', 'status', 'credits', 'contact'].forEach(t => {
      const content = document.getElementById(`${t}-tab-content`);
      const btn     = document.getElementById(`tab-${t}`);
      if (content) content.classList.add('lab-hidden');
      if (btn)     btn.classList.remove('active');
    });
    const targetContent = document.getElementById(`${tab}-tab-content`);
    const targetBtn     = document.getElementById(`tab-${tab}`);
    if (targetContent) targetContent.classList.remove('lab-hidden');
    if (targetBtn)     targetBtn.classList.add('active');
    widget.style.width  = "550px";
    widget.style.height = "480px";
    if (tab === 'status')  checkDeploymentStatus();
    if (tab === 'credits') fetchSubscription();
  };

  document.getElementById('tab-deploy').onclick  = () => switchTab('deploy');
  document.getElementById('tab-status').onclick  = () => switchTab('status');
  document.getElementById('tab-credits').onclick = () => switchTab('credits');
  document.getElementById('tab-contact').onclick = () => switchTab('contact');

  // ─── 14. TOGGLE VISIBILITY ───────────────────────────────────────────────────
  document.getElementById('toggle-visibility-btn').onclick = () => {
    const main = document.getElementById('widget-main');
    main.classList.toggle('lab-hidden');
    widget.classList.toggle('lab-hidden-state');
    document.getElementById('toggle-visibility-btn').textContent =
      main.classList.contains('lab-hidden') ? '+' : '−';
  };

  // ─── 15. DEPLOY ──────────────────────────────────────────────────────────────
  const deployBtn = document.getElementById('deployBtn');
  deployBtn.onmouseover = () => { deployBtn.style.background = '#fafafa'; deployBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,.07)'; };
  deployBtn.onmouseout  = () => { deployBtn.style.background = '#fff';    deployBtn.style.boxShadow = 'none'; };

  deployBtn.onclick = async () => {
    const loader = document.getElementById('deploy-loader');
    deployBtn.disabled       = true;
    deployBtn.style.opacity  = "0.5";
    deployBtn.style.cursor   = "not-allowed";
    loader.style.display     = "block";
    sessionStorage.setItem("is_deploying", "true");
    switchTab('status');

    try {
      const idToken     = await auth.currentUser.getIdToken();
      const includeKali = document.getElementById("kali-toggle-checkbox").checked;
      await fetch("https://labdep.cyberxpt.com/api/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ chapter: document.getElementById("chapter").value, kali: includeKali })
      });
    } catch (e) {
      sessionStorage.removeItem("is_deploying");
      document.getElementById("no-lab-msg").innerText = "❌ Deployment failed.";
    } finally {
      loader.style.display    = "none";
      deployBtn.disabled      = false;
      deployBtn.style.opacity = "1";
      deployBtn.style.cursor  = "pointer";
    }
  };

  // ─── 16. DESTROY ─────────────────────────────────────────────────────────────
  document.getElementById('destroyBtn').onclick = async () => {
    if (!confirm("Are you sure you want to destroy this lab?")) return;
    const idToken = await auth.currentUser.getIdToken();
    resetLiveStatusUI();
    sessionStorage.removeItem("lab_status");
    sessionStorage.removeItem("is_deploying");
    switchTab('deploy');
    await fetch("https://labdep.cyberxpt.com/api/destroy", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
    });
  };

  // ─── 17. EXTEND ──────────────────────────────────────────────────────────────
  document.getElementById('extendBtn').onclick = async () => {
    const btn  = document.getElementById("extendBtn");
    const orig = btn.querySelector('.cell-label').innerText;
    btn.disabled = true;
    btn.querySelector('.cell-label').innerText = "Wait...";
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch("https://labdep.cyberxpt.com/api/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
      });
      if (res.ok) { await checkDeploymentStatus(true); alert("✅ Success: Extended!"); }
    } catch (e) { alert("❌ Connection error."); }
    finally { btn.disabled = false; btn.querySelector('.cell-label').innerText = orig; }
  };

  // ─── 18. COPY BUTTON ─────────────────────────────────────────────────────────
  document.getElementById('copyBtn').onclick = () => {
    navigator.clipboard.writeText(document.getElementById("CommandtoPasteRun").getAttribute("data-copy"));
    const s = document.getElementById("copyStatus");
    s.style.display = "inline";
    setTimeout(() => s.style.display = "none", 1500);
  };

  // ─── 19. SUBSCRIPTION ────────────────────────────────────────────────────────
  async function fetchSubscription() {
    if (!auth.currentUser) return;
    const subEl    = document.getElementById("subscription-status");
    const expiryEl = document.getElementById("expiry-notice");
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res     = await fetch("https://labdep.cyberxpt.com/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` }
      });
      const data = await res.json();
      subEl.innerText = data.msg || "0 Credits";
      if (data.expiry) {
        const dateObj = new Date(data.expiry);
        expiryEl.innerHTML = `⚠️ Lab access expires on <strong>${dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>`;
      } else {
        expiryEl.innerText = "";
      }
    } catch (e) { subEl.innerText = "Error loading credits"; }
  }

  // ─── 20. LOAD CHAPTERS ───────────────────────────────────────────────────────
  async function loadChapters() {
    try {
      const idMatch = window.location.href.match(/ebook([0-9a-f]{24})/i);
      if (!idMatch) {
        document.getElementById("chapter").innerHTML = '<option value="invalid">No unit ID detected</option>';
        return;
      }
      const res = await fetch(`https://raw.githubusercontent.com/cyberxpt/labtracker/refs/heads/main/${idMatch[1]}.txt`);
      if (!res.ok) throw new Error();
      const lines = (await res.text()).split("\n").filter(l => l.trim());

      // First line is the Kali flag: "1" = enabled, "0" or absent = disabled
      const firstLine = lines[0]?.trim();
      const kaliFlag  = (firstLine === "0" || firstLine === "1") ? parseInt(firstLine) : null;
      const chapterLines = kaliFlag !== null ? lines.slice(1) : lines;

      const kaliWrapper  = document.getElementById("kali-toggle-wrapper");
      const kaliCheckbox = document.getElementById("kali-toggle-checkbox");
      const kaliTrack    = document.getElementById("kali-toggle-track");
      const kaliThumb    = document.getElementById("kali-toggle-thumb");
      const kaliLabel    = document.getElementById("kali-status-label");

      if (kaliFlag === 1) {
        // Explicitly enabled — unlock toggle
        kaliCheckbox.disabled              = false;
        kaliWrapper.style.opacity          = "1";
        kaliWrapper.style.cursor           = "default";
        kaliWrapper.style.pointerEvents    = "auto";
        document.querySelector('#kali-toggle-wrapper label').style.cursor = "pointer";
      } else {
        // flag is 0, or missing entirely — disable and lock
        kaliCheckbox.disabled              = true;
        kaliCheckbox.checked               = false;
        kaliTrack.style.background         = "#1a1a2e";
        kaliTrack.style.borderColor        = "#2d3748";
        kaliThumb.style.background         = "#4a5568";
        kaliThumb.style.transform          = "translateX(0px)";
        kaliLabel.style.color              = "#374151";
        kaliLabel.innerText                = "Not available for this lab";
        kaliWrapper.style.opacity          = "0.5";
        kaliWrapper.style.cursor           = "not-allowed";
        kaliWrapper.style.pointerEvents    = "none";
        document.getElementById("kali-warning").style.display = "none";
      }

      let optionsHtml = "";
      chapterLines.forEach(line => {
        const parts = line.split(",");
        const val   = parts[0].trim();
        const lbl   = parts[1] ? parts[1].trim() : val;
        optionsHtml += `<option value="${val}">${lbl}</option>`;
      });
      document.getElementById("chapter").innerHTML = optionsHtml || '<option value="invalid">Unit file is empty</option>';
    } catch (e) {
      document.getElementById("chapter").innerHTML = '<option value="invalid">No labs available</option>';
    }
  }

  // ─── 21. AUTH ────────────────────────────────────────────────────────────────
  document.getElementById('loginBtn').onclick  = () => signInWithPopup(auth, new GoogleAuthProvider());
  document.getElementById('logoutBtn').onclick = () => { signOut(auth); sessionStorage.clear(); };

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      document.getElementById("logged-out-view").style.display  = "none";
      document.getElementById("auth-tabs").style.display        = "flex";
      document.getElementById("footer-actions").style.display   = "block";
      document.getElementById("deploy-tab-content").classList.remove('lab-hidden');
      await loadChapters();
      checkDeploymentStatus(false, true);
    } else {
      document.getElementById("logged-out-view").style.display  = "block";
      document.getElementById("auth-tabs").style.display        = "none";
      document.getElementById("footer-actions").style.display   = "none";
      document.getElementById("deploy-tab-content").classList.add('lab-hidden');
      ['status', 'credits', 'contact'].forEach(t => {
        const c = document.getElementById(`${t}-tab-content`);
        if (c) c.classList.add('lab-hidden');
      });
      clearInterval(countdownInterval);
      stopPolling();
    }
  });

  // ─── 22. DRAG & RESIZE ───────────────────────────────────────────────────────
  function initInteractions(el) {
    let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
    const header  = document.getElementById("drag-handle");
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
        el.style.top  = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, el.offsetTop  - p2)) + "px";
        el.style.left = Math.max(0, Math.min(window.innerWidth  - el.offsetWidth,  el.offsetLeft - p1)) + "px";
      };
      document.onmouseup = document.ontouchend = () => { document.onmousemove = document.ontouchmove = null; };
    };

    const startResize = (e) => {
      e.preventDefault();
      const sw = el.offsetWidth,  sh = el.offsetHeight;
      const sx = e.clientX || (e.touches ? e.touches[0].clientX : 0);
      const sy = e.clientY || (e.touches ? e.touches[0].clientY : 0);
      document.onmousemove = document.ontouchmove = (ev) => {
        const cx = ev.clientX || (ev.touches ? ev.touches[0].clientX : 0);
        const cy = ev.clientY || (ev.touches ? ev.touches[0].clientY : 0);
        if (sw + (cx - sx) > 260) el.style.width  = (sw + (cx - sx)) + "px";
        if (sh + (cy - sy) > 45)  el.style.height = (sh + (cy - sy)) + "px";
      };
      document.onmouseup = document.ontouchend = () => { document.onmousemove = document.ontouchmove = null; };
    };

    header.onmousedown  = header.ontouchstart  = startDrag;
    resizer.onmousedown = resizer.ontouchstart = startResize;
  }
  initInteractions(widget);

})();

(() => {
  if (document.getElementById('nfb-host')) return;
  const NFB = globalThis.NFB;
  const A = Object.values(NFB.adapters).find((a) => a.match());
  if (!A) return;
  const K = (n) => `nfb_${n}_${A.id}`;
  const scanKey = K('scan'),
    listsKey = K('lists'),
    keepKey = K('keep'),
    selKey = K('sel'),
    goneKey = K('gone'),
    histKey = K('hist'),
    runKey = K('run'),
    stopKey = K('stop');
  const allowKey = 'allowScan_' + A.id;
  const IS_BETA = !!(NFB.PLATFORMS.find((p) => p.id === A.id) || {}).beta;

  const LOGO = `<svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true"><defs><linearGradient id="nfbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0095f6"/><stop offset="1" stop-color="#833ab4"/></linearGradient></defs><rect width="64" height="64" rx="15" fill="url(#nfbg)"/><circle cx="25" cy="21" r="9" fill="#fff"/><path d="M7 49a18 18 0 0 1 36 0z" fill="#fff"/><circle cx="46" cy="45" r="12" fill="#ff3b5c" stroke="#6f55d9" stroke-width="3"/><rect x="40" y="43.5" width="12" height="3" rx="1.5" fill="#fff"/></svg>`;

  // ---------- UI (Shadow DOM so the site's CSS/dark mode can't affect it) ----------
  const host = document.createElement('div');
  host.id = 'nfb-host';
  host.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;display:none;';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    ${NFB.themeCSS}
    ${NFB.uiCSS}
    ${NFB.settingsCSS}
    .app { display: contents; }
    button { font-family: inherit; }

    /* floating button */
    .fab { position: fixed; left: 0; top: 0; visibility: hidden; height: 44px; padding: 0 18px 0 14px; border: 0; border-radius: 22px;
           background: var(--accent); color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
           user-select: none; touch-action: none; box-shadow: 0 6px 18px rgba(0,0,0,.35); }
    .fab.drag { cursor: grab; }
    .fab.drag:active { cursor: grabbing; }

    /* panel */
    .panel { position: fixed; left: 0; top: 0; display: none; flex-direction: column; width: 440px; max-width: calc(100vw - 32px); height: 86vh;
             background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 18px;
             box-shadow: 0 18px 48px rgba(0,0,0,.38); overflow: hidden; }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid var(--border); }
    .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .brand .title { font-size: 15px; font-weight: 700; color: var(--fg); }
    .brand .sub { font-size: 12px; color: var(--fg2); display: flex; align-items: center; gap: 6px; }
    .hbtns { display: flex; gap: 2px; }
    .iconbtn { width: 32px; height: 32px; border-radius: 10px; border: 1px solid transparent; background: transparent; color: var(--fg);
               cursor: pointer; font-size: 15px; display: flex; align-items: center; justify-content: center; }
    .iconbtn:hover { background: var(--hover); border-color: var(--border); }
    .main { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .setview { display: none; flex: 1; overflow-y: auto; padding: 14px; background: var(--bg2); color: var(--fg); }

    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 12px 14px 0; }
    .stat { background: var(--bg2); border-radius: 12px; padding: 8px 10px; }
    .stat b { display: block; font-size: 16px; font-weight: 700; color: var(--fg); }
    .stat span { font-size: 11px; color: var(--fg2); }
    .chips { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 14px 0; }
    .chip { font-size: 12px; font-weight: 600; padding: 5px 10px; border-radius: 999px; background: var(--bg2); color: var(--fg); }
    .chip.ok { background: var(--ok-soft); color: var(--green); }
    .chip.warn { background: var(--warn-soft); color: #b45309; }
    .chip.info { background: var(--accent-soft); color: var(--accent); }
    .notice { margin: 10px 14px 0; padding: 9px 12px; border-radius: 12px; background: var(--bg2); font-size: 12.5px; line-height: 1.45; color: var(--fg); }
    .notice:empty { display: none; }
    .scan { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px 14px; }
    .scan .lbl { font-size: 12.5px; color: var(--fg2); }
    .scan .num { width: 62px; text-align: center; }

    .tabs { display: flex; gap: 2px; padding: 0 10px; overflow-x: auto; border-bottom: 1px solid var(--border); scrollbar-width: none; }
    .tabs::-webkit-scrollbar { display: none; }
    .tab { flex: none; padding: 10px 9px; font-size: 13px; font-weight: 600; color: var(--fg2); background: none; border: 0;
           border-bottom: 2px solid transparent; cursor: pointer; white-space: nowrap; }
    .tab:hover { color: var(--fg); }
    .tab.on { color: var(--accent); border-bottom-color: var(--accent); }
    .tab .n { font-weight: 500; opacity: .75; margin-left: 4px; font-size: 12px; }
    .toolbar { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; padding: 10px 14px 6px; }
    .toolbar .search { flex: 1; min-width: 150px; }
    .sel2 { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; padding: 0 14px 6px; }
    .sel2 .num { width: 56px; text-align: center; }
    .note { margin: 0 14px 6px; font-size: 12px; color: var(--fg2); }
    .note:empty { display: none; }

    .list { flex: 1; overflow-y: auto; min-height: 60px; }
    .list::-webkit-scrollbar { width: 8px; }
    .list::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 8px; }
    .row { display: flex; align-items: center; gap: 12px; padding: 8px 14px; }
    label.row { cursor: pointer; }
    .row:hover { background: var(--hover); }
    .row input[type=checkbox] { width: 18px; height: 18px; flex: none; accent-color: var(--accent); }
    .av { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex: none; background: var(--av-bg); }
    .ph { display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; color: #fff; background: #8e8e93; }
    .who { flex: 1; min-width: 0; }
    .un { font-size: 14px; font-weight: 600; color: var(--fg); text-decoration: none; display: block;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .un:hover { text-decoration: underline; }
    .fn { font-size: 12.5px; color: var(--fg2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tag { flex: none; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 999px; background: var(--bg2); color: var(--fg2); white-space: nowrap; }
    .tag.ok { background: var(--ok-soft); color: var(--green); }
    .tag.warn { background: var(--warn-soft); color: #b45309; }
    .tag.info { background: var(--accent-soft); color: var(--accent); }
    .empty { padding: 36px 24px; color: var(--fg2); font-size: 13.5px; text-align: center; line-height: 1.5; }

    .footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--border); background: var(--bg); }
    .footer .count { font-size: 13px; font-weight: 600; color: var(--fg); }
    .footer .count span { display: block; font-size: 11.5px; font-weight: 400; color: var(--fg2); }
    .footer .acts { display: flex; gap: 8px; }
    details.log { border-top: 1px solid var(--border); background: var(--bg); color: var(--fg); }
    details.log summary { padding: 8px 14px; font-size: 12px; cursor: pointer; color: var(--fg2); }
    .logbox { max-height: 110px; overflow-y: auto; padding: 0 14px 10px; font-size: 11.5px; line-height: 1.5;
              font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--fg); }

    /* progress card (top of the screen while unfollowing) */
    .runcard { position: fixed; top: 14px; left: 50%; transform: translateX(-50%); display: none; width: min(440px, calc(100vw - 24px));
               background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 16px;
               box-shadow: 0 12px 34px rgba(0,0,0,.35); padding: 12px 14px; }
    .rc-top { display: flex; align-items: center; gap: 12px; }
    .rc-av { position: relative; width: 44px; height: 44px; flex: none; }
    .rc-av .av { width: 44px; height: 44px; }
    .rc-badge { position: absolute; right: -4px; bottom: -4px; width: 20px; height: 20px; border-radius: 50%; font-size: 12px; font-weight: 800;
                display: flex; align-items: center; justify-content: center; color: #fff; background: var(--accent); border: 2px solid var(--bg); }
    .rc-badge.ok { background: #16a34a; }
    .rc-badge.warn { background: #d97706; }
    .rc-badge.spin::after { content: ""; width: 9px; height: 9px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; animation: nfbspin .8s linear infinite; }
    @keyframes nfbspin { to { transform: rotate(360deg); } }
    .rc-txt { flex: 1; min-width: 0; }
    .rc-title { font-size: 14px; font-weight: 700; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rc-sub { font-size: 12px; color: var(--fg2); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rc-bar { height: 5px; border-radius: 4px; background: var(--bg2); margin-top: 10px; overflow: hidden; }
    .rc-bar i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .4s; }
    .toasts { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); display: flex; flex-direction: column; gap: 8px; align-items: center; pointer-events: none; }
    .toast { background: #1f2933; color: #fff; font-size: 13px; padding: 9px 14px; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,.35); max-width: 380px; }
  </style>
  <div class="app" id="app" data-theme="system">
    <button class="fab" id="fab"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><circle cx="10" cy="8" r="4"/><path d="M2 21a8 8 0 0 1 16 0"/><path d="M16 12h6"/></svg><span>Unfollow Guard</span></button>

    <div class="panel" id="panel">
      <div class="head">
        <div class="brand">${LOGO}<div><div class="title">Unfollow Guard</div>
          <div class="sub">${A.label}${IS_BETA ? ' <span class="badge" title="Facebook support is not fully tested yet">BETA</span>' : ''}</div></div></div>
        <div class="hbtns">
          <button class="iconbtn" id="themeBtn" title="Change theme">◐</button>
          <button class="iconbtn" id="gear" title="Settings">⚙</button>
          <button class="iconbtn" id="closeBtn" title="Close">✕</button>
        </div>
      </div>

      <div class="main" id="main">
        <div class="stats">
          <div class="stat"><b id="stFollowing">–</b><span>Following</span></div>
          <div class="stat"><b id="stFollowers">–</b><span>Followers</span></div>
          <div class="stat"><b id="stMutual">–</b><span>Mutual</span></div>
          <div class="stat"><b id="stTodo">–</b><span>To unfollow</span></div>
        </div>
        <div class="chips"><span class="chip" id="chipTime"></span><span class="chip" id="chipCap"></span></div>
        <div class="notice" id="status"></div>
        <div class="scan">
          <span class="lbl">Check</span>
          <select class="field" id="lim">
            <option value="50">first 50</option><option value="100">first 100</option>
            <option value="250">first 250</option><option value="500">first 500</option><option value="0">all</option>
          </select>
          <span class="lbl" id="startwrap">from # <input class="field num" id="start" type="number" min="1" value="1"></span>
          <button class="btn primary" id="scan" style="margin-left:auto">Scan</button>
        </div>
        <div class="tabs" id="tabs"></div>
        <div class="toolbar"><input class="field search" id="q" type="search" placeholder="Search name or username"></div>
        <div class="sel2" id="sel2">
          <button class="btn sm" id="selN">Select first</button>
          <input class="field num" id="n" type="number" min="1" value="30">
          <button class="btn sm" id="all">Select all</button>
          <button class="btn sm" id="clr">Clear</button>
        </div>
        <div class="note" id="listNote"></div>
        <div class="list" id="list"></div>
        <div class="footer" id="footer">
          <div class="count"><span id="selSub"></span><div id="selLabel"></div></div>
          <div class="acts">
            <button class="btn" id="keepSel">Keep</button>
            <button class="btn danger" id="del">Unfollow</button>
          </div>
        </div>
        <details class="log"><summary>Activity log</summary><div class="logbox" id="log"></div></details>
      </div>
      <div class="setview" id="setview">${NFB.settingsHTML}</div>
    </div>

    <div class="runcard" id="runcard">
      <div class="rc-top">
        <div class="rc-av"><span id="rcAv"></span><span class="rc-badge spin" id="rcBadge"></span></div>
        <div class="rc-txt"><div class="rc-title" id="rcTitle"></div><div class="rc-sub" id="rcSub"></div></div>
        <button class="btn danger sm" id="runstop">Stop</button>
      </div>
      <div class="rc-bar"><i id="rcFill"></i></div>
    </div>
    <div class="toasts" id="toasts"></div>
    <div id="modalhost"></div>
  </div>`;
  document.body.append(host);

  const $ = (id) => shadow.getElementById(id);
  NFB.watchTheme($('app'));
  const panel = $('panel'),
    listEl = $('list'),
    modalHost = $('modalhost');
  const scanBtn = $('scan'),
    delBtn = $('del'),
    keepBtn = $('keepSel'),
    stopBtn = $('runstop');
  const ask = (o) => NFB.dialog(modalHost, o);
  const fmtN = (v) => (typeof v === 'number' ? v.toLocaleString() : '–');

  const setStatus = (t) => ($('status').textContent = t || '');
  const toast = (t) => {
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = t;
    $('toasts').append(d);
    setTimeout(() => d.remove(), 3200);
  };
  const logBox = $('log');
  const log = (t) => {
    const d = document.createElement('div');
    d.textContent = new Date().toLocaleTimeString() + '  ' + t;
    logBox.prepend(d);
    while (logBox.childElementCount > 80) logBox.lastChild.remove();
    console.log('[Unfollow Guard]', t);
  };

  const placeholder = (u) => {
    const d = document.createElement('div');
    d.className = 'av ph';
    d.textContent = ((u && u.username) || '?').trim().charAt(0).toUpperCase();
    return d;
  };
  const avatarEl = (u) => {
    if (!u || !u.pic) return placeholder(u);
    const img = new Image();
    img.className = 'av';
    img.alt = '';
    img.decoding = 'async';
    img.src = u.pic;
    img.onerror = () => img.replaceWith(placeholder(u));
    return img;
  };

  // ---------- header buttons: settings / theme / close ----------
  let inSettings = false;
  $('gear').onclick = () => {
    inSettings = !inSettings;
    $('main').style.display = inSettings ? 'none' : 'flex';
    $('setview').style.display = inSettings ? 'block' : 'none';
    $('gear').textContent = inSettings ? '←' : '⚙';
    $('gear').title = inSettings ? 'Back' : 'Settings';
  };
  const THEMES = ['system', 'light', 'dark'];
  const THEME_ICON = { system: '◐', light: '☀', dark: '☾' };
  let theme = 'system';
  const showTheme = (t) => {
    theme = THEMES.includes(t) ? t : 'system';
    $('themeBtn').textContent = THEME_ICON[theme];
    $('themeBtn').title =
      'Theme: ' +
      theme[0].toUpperCase() +
      theme.slice(1) +
      ' (click to change)';
  };
  $('themeBtn').onclick = () =>
    chrome.storage.local.set({
      theme: THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length],
    });
  NFB.getSettings().then((s) => showTheme(s.theme));
  $('closeBtn').onclick = () => (panel.style.display = 'none');

  // ---------- button placement + dragging ----------
  const fab = $('fab');
  const M = 16;
  let cfg = { position: 'bottom-right', draggable: true };
  let custom = null;
  const vw = () => document.documentElement.clientWidth;
  const vh = () => window.innerHeight;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  function fabXY() {
    const w = fab.offsetWidth,
      h = fab.offsetHeight;
    const maxX = Math.max(0, vw() - w),
      maxY = Math.max(0, vh() - h);
    if (cfg.draggable && custom)
      return { x: custom.fx * maxX, y: custom.fy * maxY, w, h };
    const p = cfg.position || 'bottom-right';
    return {
      x: clamp(p.endsWith('left') ? M : maxX - M, 0, maxX),
      y: clamp(p.startsWith('top') ? M : maxY - M, 0, maxY),
      w,
      h,
    };
  }
  function placePanel(f) {
    const W = vw(),
      H = vh();
    const pw = Math.min(440, W - 2 * M);
    const above = f.y + f.h / 2 > H / 2;
    const space = above ? f.y - 8 - M : H - (f.y + f.h) - 8 - M;
    const ph = Math.max(Math.min(340, H - 2 * M), Math.min(H * 0.88, space));
    const rightAlign = f.x + f.w / 2 > W / 2;
    const x = clamp(
      rightAlign ? f.x + f.w - pw : f.x,
      M,
      Math.max(M, W - pw - M),
    );
    const y = clamp(
      above ? f.y - 8 - ph : f.y + f.h + 8,
      M,
      Math.max(M, H - ph - M),
    );
    panel.style.width = pw + 'px';
    panel.style.height = ph + 'px';
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
  }
  function place(override) {
    const f = override || fabXY();
    fab.style.left = f.x + 'px';
    fab.style.top = f.y + 'px';
    if (panel.style.display === 'flex') placePanel(f);
  }
  async function loadCfg() {
    const s = await NFB.getSettings();
    cfg = { position: s.position, draggable: !!s.draggable };
    const o = await chrome.storage.local.get('fabPos_' + A.id);
    custom = o['fabPos_' + A.id] || null;
    fab.classList.toggle('drag', cfg.draggable);
    place();
    fab.style.visibility = 'visible';
  }
  window.addEventListener('resize', () => place());
  const togglePanel = () => {
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
    place();
    if (panel.style.display === 'flex') fillView();
  };
  let drag = null;
  fab.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const f = fabXY();
    drag = {
      sx: e.clientX,
      sy: e.clientY,
      ox: f.x,
      oy: f.y,
      w: f.w,
      h: f.h,
      moved: false,
    };
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove', (e) => {
    if (!drag || !cfg.draggable) return;
    const dx = e.clientX - drag.sx,
      dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    drag.x = clamp(drag.ox + dx, 0, Math.max(0, vw() - drag.w));
    drag.y = clamp(drag.oy + dy, 0, Math.max(0, vh() - drag.h));
    place({ x: drag.x, y: drag.y, w: drag.w, h: drag.h });
  });
  fab.addEventListener('pointerup', async (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    try {
      fab.releasePointerCapture(e.pointerId);
    } catch {}
    if (!d.moved) return togglePanel();
    const maxX = Math.max(1, vw() - d.w),
      maxY = Math.max(1, vh() - d.h);
    custom = { fx: d.x / maxX, fy: d.y / maxY };
    await chrome.storage.local.set({ ['fabPos_' + A.id]: custom });
  });
  fab.addEventListener('pointercancel', () => {
    drag = null;
    place();
  });

  // ---------- state ----------
  // Big data (scan, lists) is read once and cached; small data (keep, gone, history, selection) is saved separately,
  // so ticking, keeping and unfollowing never rewrite the big lists.
  let scanCache = null; // last saved scan (users = non-followers)
  let lists = null; // {followers, following, followingComplete}
  let users = []; // non-followers still to decide on
  let keep = {}; // pk -> user kept
  let gone = new Set(); // unfollowed since the last scan
  let hist = []; // unfollow history [{pk, username, full_name, pic, at}]
  let selected = new Set();
  let followerSet = new Set(),
    followingSet = new Set(),
    histSet = new Set(),
    mutual = [];
  let tab = 'todo',
    query = '';
  let capInfo = { cap: 40, used: 0 };
  let scanning = false,
    unfollowing = false,
    stop = false,
    enabled = true;
  let runNextAt = 0;
  NFB.shouldStop = () => stop;

  const maxSel = () => Math.max(0, capInfo.cap - capInfo.used);
  const capMsg = () =>
    `Daily limit: ${capInfo.cap}. You've already unfollowed ${capInfo.used} today, so you can select at most ${maxSel()} more. Change the limit in ⚙ Settings.`;
  const esc = (v) =>
    window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"');

  let selT;
  const saveSel = () => {
    clearTimeout(selT);
    selT = setTimeout(
      () => chrome.storage.local.set({ [selKey]: [...selected] }),
      150,
    );
  };
  const saveKeep = () => chrome.storage.local.set({ [keepKey]: keep });
  const saveHist = () => chrome.storage.local.set({ [histKey]: hist });

  function derive() {
    const fol = (lists && lists.followers) || null;
    const fing = (lists && lists.following) || [];
    followerSet = new Set((fol || []).map((u) => u.pk));
    followingSet = new Set(fing.map((u) => u.pk));
    histSet = new Set(hist.map((h) => h.pk));
    mutual = fol
      ? fing.filter((u) => followerSet.has(u.pk) && !histSet.has(u.pk))
      : [];
  }

  // ---------- tabs + list (renders in chunks: big lists stay fast) ----------
  const TABS = [
    {
      id: 'todo',
      label: 'To unfollow',
      count: () => users.length,
      items: () => users,
    },
    {
      id: 'keep',
      label: 'Kept',
      count: () => Object.keys(keep).length,
      items: () => Object.values(keep),
    },
    {
      id: 'mutual',
      label: 'Mutuals',
      count: () => mutual.length,
      items: () => mutual,
    },
    {
      id: 'followers',
      label: 'Followers',
      count: () => (lists && lists.followers ? lists.followers.length : 0),
      items: () => (lists && lists.followers) || [],
    },
    {
      id: 'following',
      label: 'Following',
      count: () => (lists && lists.following ? lists.following.length : 0),
      items: () => (lists && lists.following) || [],
    },
    {
      id: 'history',
      label: 'Unfollowed',
      count: () => hist.length,
      items: () => hist.slice().reverse(),
    },
  ];
  const tabsEl = $('tabs');
  TABS.forEach((t) => {
    const b = document.createElement('button');
    b.className = 'tab';
    b.dataset.id = t.id;
    b.innerHTML = `${t.label}<span class="n">0</span>`;
    b.onclick = () => showTab(t.id);
    tabsEl.append(b);
  });

  const EMPTY = {
    todo: "No accounts to unfollow yet. Click Scan to find who doesn't follow you back.",
    keep: 'Nothing kept yet. Use Keep on an account you never want to unfollow. Kept accounts stay out of future scans.',
    mutual: () =>
      lists && lists.followers
        ? 'No mutual follows found.'
        : 'Mutuals need your full followers list. Run a scan (with a small follower count, or Check → all).',
    followers: () =>
      lists && lists.followers === null
        ? "Followers weren't fetched in the last scan (you have many followers)."
        : 'No followers saved yet. Run a scan.',
    following: 'No following list saved yet. Run a scan.',
    history: "You haven't unfollowed anyone with this extension yet.",
  };
  const emptyEl = () => {
    const d = document.createElement('div');
    d.className = 'empty';
    const e = EMPTY[tab];
    d.textContent = query ? 'No matches.' : typeof e === 'function' ? e() : e;
    return d;
  };

  const rows = new Map(); // pk -> {row, cb} for the To-unfollow tab
  const BATCH = 60;
  let filtered = [],
    shown = 0;

  const matches = (u) =>
    !query ||
    ((u.username || '') + ' ' + (u.full_name || ''))
      .toLowerCase()
      .includes(query);
  const tabItems = () => TABS.find((t) => t.id === tab).items();

  const tagEl = (text, kind) => {
    const s = document.createElement('span');
    s.className = 'tag' + (kind ? ' ' + kind : '');
    s.textContent = text;
    return s;
  };

  function buildRow(u) {
    const todo = tab === 'todo';
    const row = document.createElement(todo ? 'label' : 'div');
    row.className = 'row';
    row.dataset.pk = u.pk;
    let cb = null;
    if (todo) {
      cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = selected.has(u.pk);
      cb.onchange = () => {
        if (cb.checked) {
          if (selected.size >= maxSel()) {
            cb.checked = false;
            toast(capMsg());
            return;
          }
          selected.add(u.pk);
        } else selected.delete(u.pk);
        saveSel();
        updateChrome();
      };
      row.append(cb);
    }
    const who = document.createElement('div');
    who.className = 'who';
    const a = document.createElement('a');
    a.className = 'un';
    a.href = A.profileUrl(u);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = u.username + (u.verified ? ' ✔' : '');
    a.onclick = (e) => e.stopPropagation();
    const fn = document.createElement('div');
    fn.className = 'fn';
    fn.textContent =
      tab === 'history' ? `Unfollowed ${NFB.fmtWhen(u.at)}` : u.full_name || '';
    who.append(a, fn);
    row.append(avatarEl(u), who);

    if (tab === 'todo') {
      const b = document.createElement('button');
      b.className = 'btn sm';
      b.textContent = 'Keep';
      b.title = 'Never unfollow this account (hides it from future scans)';
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        keepUsers([u.pk]);
      };
      row.append(b);
    } else if (tab === 'keep') {
      const b = document.createElement('button');
      b.className = 'btn sm';
      b.textContent = 'Move back';
      b.title = 'Put this account back in the unfollow list';
      b.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        unkeepUsers([u.pk]);
      };
      row.append(b);
    } else if (tab === 'mutual') {
      row.append(tagEl('Mutual', 'ok'));
    } else if (tab === 'followers') {
      if (followingSet.has(u.pk)) row.append(tagEl('Mutual', 'ok'));
      else if (lists && lists.following)
        row.append(tagEl("You don't follow back", ''));
    } else if (tab === 'following') {
      if (histSet.has(u.pk)) row.append(tagEl('Unfollowed', 'warn'));
      else if (lists && lists.followers)
        row.append(
          followerSet.has(u.pk)
            ? tagEl('Follows you', 'ok')
            : tagEl('Not following back', 'warn'),
        );
    }
    return { row, cb };
  }

  function appendMore() {
    const end = Math.min(filtered.length, shown + BATCH);
    const frag = document.createDocumentFragment();
    for (let i = shown; i < end; i++) {
      const r = buildRow(filtered[i]);
      frag.append(r.row);
      if (r.cb) rows.set(filtered[i].pk, r);
    }
    shown = end;
    listEl.append(frag);
  }
  function fillView() {
    if (!listEl.clientHeight) return; // panel hidden: render more once it is shown
    let guard = 0;
    while (
      shown < filtered.length &&
      listEl.scrollHeight <= listEl.clientHeight + 160 &&
      guard++ < 25
    )
      appendMore();
  }
  listEl.addEventListener('scroll', () => {
    if (
      shown < filtered.length &&
      listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 320
    )
      appendMore();
  });

  function renderList() {
    listEl.replaceChildren();
    rows.clear();
    filtered = tabItems().filter(matches);
    shown = 0;
    if (!filtered.length) listEl.append(emptyEl());
    else {
      appendMore();
      fillView();
    }
    updateChrome();
  }
  function removeFromList(pk) {
    const i = filtered.findIndex((u) => u.pk === pk);
    if (i >= 0) {
      filtered.splice(i, 1);
      if (i < shown) shown--;
    }
    const el = listEl.querySelector(`.row[data-pk="${esc(pk)}"]`);
    if (el) el.remove();
    rows.delete(pk);
    if (!filtered.length) {
      listEl.replaceChildren(emptyEl());
    } else fillView();
  }
  function addToList(u) {
    if (!matches(u)) return;
    const e = listEl.querySelector('.empty');
    if (e) e.remove();
    filtered.unshift(u);
    shown++;
    const r = buildRow(u);
    listEl.prepend(r.row);
    if (r.cb) rows.set(u.pk, r);
  }
  function syncChecks() {
    rows.forEach(({ cb }, pk) => (cb.checked = selected.has(pk)));
  }

  function showTab(id) {
    tab = id;
    renderList();
    listEl.scrollTop = 0;
  }
  let qT;
  $('q').oninput = () => {
    clearTimeout(qT);
    qT = setTimeout(() => {
      query = $('q').value.trim().toLowerCase();
      renderList();
    }, 140);
  };

  // ---------- header numbers, chips, footer ----------
  function updateChrome() {
    const fing =
      scanCache && typeof scanCache.following === 'number'
        ? scanCache.following
        : lists && lists.following
          ? lists.following.length
          : null;
    const fol =
      scanCache && typeof scanCache.followers === 'number'
        ? scanCache.followers
        : lists && lists.followers
          ? lists.followers.length
          : null;
    $('stFollowing').textContent = fmtN(fing);
    $('stFollowers').textContent = fmtN(fol);
    $('stMutual').textContent =
      lists && lists.followers ? fmtN(mutual.length) : '–';
    $('stTodo').textContent = fmtN(users.length);
    tabsEl.querySelectorAll('.tab').forEach((b) => {
      const t = TABS.find((x) => x.id === b.dataset.id);
      b.classList.toggle('on', t.id === tab);
      b.querySelector('.n').textContent = fmtN(t.count());
    });
    const todo = tab === 'todo';
    $('sel2').style.display = todo ? 'flex' : 'none';
    $('footer').style.display = todo ? 'flex' : 'none';
    $('selLabel').textContent = `${selected.size} selected`;
    $('selSub').textContent = `${maxSel()} left today`;
    delBtn.textContent = selected.size
      ? `Unfollow ${selected.size}`
      : 'Unfollow';
    delBtn.disabled = unfollowing || !selected.size;
    keepBtn.disabled = unfollowing || !selected.size;
    const partial =
      lists &&
      lists.followingComplete === false &&
      (tab === 'following' || tab === 'mutual');
    $('listNote').textContent = partial
      ? 'Showing only the accounts fetched in the last scan (it was limited). Use Check → all for the full lists.'
      : '';
    tick();
  }

  let lastDay = NFB.today();
  function tick() {
    const chip = $('chipTime');
    let txt, kind;
    if (unfollowing && runNextAt > Date.now()) {
      txt = `⏱ Next unfollow in ${NFB.fmtClock((runNextAt - Date.now()) / 1000)}`;
      kind = 'info';
    } else if (unfollowing) {
      txt = '⏱ Unfollowing…';
      kind = 'info';
    } else if (maxSel() <= 0) {
      txt = `⏳ Daily limit reached · resets in ${NFB.fmtHM(NFB.msToMidnight())}`;
      kind = 'warn';
    } else {
      txt = '✓ Ready to unfollow';
      kind = 'ok';
    }
    chip.textContent = txt;
    chip.className = 'chip ' + kind;
    $('chipCap').textContent = `${capInfo.used} / ${capInfo.cap} today`;
    if (NFB.today() !== lastDay) {
      lastDay = NFB.today();
      refreshCap();
    }
  }
  setInterval(tick, 1000);

  async function refreshCap() {
    const s = await NFB.getSettings();
    const d = await NFB.getDaily(A.id);
    capInfo = { cap: s['dailyCap_' + A.id], used: d.count };
    if (selected.size > maxSel()) {
      selected = new Set([...selected].slice(0, maxSel()));
      syncChecks();
      saveSel();
    }
    updateChrome();
  }

  // ---------- keep list (changes rows in place: no re-render, no flicker) ----------
  function keepUsers(pks) {
    let n = 0;
    pks.forEach((pk) => {
      const u = users.find((x) => x.pk === pk);
      if (!u) return;
      keep[pk] = u;
      selected.delete(pk);
      if (tab === 'todo') removeFromList(pk);
      n++;
    });
    if (!n) return toast('Select at least one account first.');
    users = users.filter((x) => !keep[x.pk]);
    saveKeep();
    saveSel();
    updateChrome();
    toast(
      `Kept ${n} account${n > 1 ? 's' : ''}. They won't appear in future scans.`,
    );
  }
  function unkeepUsers(pks) {
    let n = 0;
    pks.forEach((pk) => {
      const u = keep[pk];
      if (!u) return;
      delete keep[pk];
      if (!gone.has(pk)) users.unshift(u);
      if (tab === 'keep') removeFromList(pk);
      n++;
    });
    if (!n) return;
    saveKeep();
    updateChrome();
    toast(`Moved ${n} account${n > 1 ? 's' : ''} back to "To unfollow".`);
  }
  keepBtn.onclick = () => keepUsers([...selected]);

  // ---------- scan ----------
  if (!A.supportsStart) $('startwrap').style.display = 'none';
  const getOpts = () => ({
    limit: parseInt($('lim').value, 10) || 0,
    start: A.supportsStart
      ? Math.max(0, (parseInt($('start').value, 10) || 1) - 1)
      : 0,
  });
  const saveOpts = () =>
    chrome.storage.local.set({
      nfb_opts: { lim: $('lim').value, start: $('start').value },
    });
  $('lim').onchange = saveOpts;
  $('start').onchange = saveOpts;

  async function refreshButtons() {
    const s = await NFB.getSettings();
    const allow = !!s[allowKey];
    scanBtn.disabled =
      scanning || unfollowing || !allow || !A.canScan(scanCache);
    $('lim').disabled = $('start').disabled = scanBtn.disabled;
    scanBtn.textContent = scanning
      ? 'Scanning…'
      : allow
        ? A.scanLabel(scanCache)
        : '🔒 Scan locked';
    scanBtn.title = allow
      ? ''
      : 'Scanning locks itself after each scan to avoid repeat requests. Turn on “Allow scanning” in ⚙ Settings.';
  }
  setInterval(refreshButtons, 1500);

  const mergeLists = (cur, add) => {
    const out = { ...(cur || {}) };
    Object.keys(add || {}).forEach((k) => {
      if (add[k] !== undefined) out[k] = add[k];
    });
    return out;
  };

  scanBtn.onclick = async () => {
    if (scanning || unfollowing) return;
    const s = await NFB.getSettings();
    if (!s[allowKey]) return;
    if (!A.canScan(scanCache)) return setStatus(A.cannotScanMessage(scanCache));
    const opts = getOpts();
    const ok = await ask({
      title: `Scan ${A.label}?`,
      body: A.scanConfirm(opts),
      confirmText: 'Start scan',
    });
    if (!ok) return;

    scanning = true;
    refreshButtons();
    try {
      const res = await A.scan({ setStatus, prev: scanCache, opts });
      scanCache = res.scan;
      lists = mergeLists(lists, res.lists);
      gone = new Set();
      await chrome.storage.local.set({
        [scanKey]: res.scan,
        [listsKey]: lists,
        [goneKey]: [],
      });
      if (res.complete) await chrome.storage.local.set({ [allowKey]: false });
      const all = res.scan.users || [];
      users = all.filter((u) => !keep[u.pk]);
      const hidden = all.length - users.length;
      const have = new Set(users.map((u) => u.pk));
      selected = new Set([...selected].filter((pk) => have.has(pk)));
      saveSel();
      derive();
      showTab('todo');
      setStatus(
        res.message + (hidden ? ` ${hidden} kept account(s) hidden.` : ''),
      );
    } catch (e) {
      setStatus('Error: ' + e.message);
    }
    scanning = false;
    refreshButtons();
  };

  // ---------- selection (limited by the daily cap) ----------
  const todoFirst = () => {
    if (tab !== 'todo') showTab('todo');
  };
  const selectPks = (pks, wanted) => {
    selected = new Set(pks.slice(0, maxSel()));
    syncChecks();
    saveSel();
    updateChrome();
    if (wanted > maxSel()) toast(capMsg());
  };
  $('selN').onclick = () => {
    todoFirst();
    const n = Math.max(1, parseInt($('n').value, 10) || 30);
    selectPks(
      filtered.slice(0, n).map((u) => u.pk),
      n,
    );
  };
  $('all').onclick = () => {
    todoFirst();
    selectPks(
      filtered.map((u) => u.pk),
      filtered.length,
    );
  };
  $('clr').onclick = () => {
    selected.clear();
    syncChecks();
    saveSel();
    updateChrome();
  };

  // ---------- progress card ----------
  let rcUser = null,
    hideT;
  function banner({ user, title, sub, pct, tone, spin }) {
    clearTimeout(hideT);
    $('runcard').style.display = 'block';
    if (!rcUser || !user || rcUser.username !== user.username) {
      $('rcAv').replaceChildren(avatarEl(user));
      rcUser = user;
    }
    $('rcTitle').textContent = title;
    $('rcSub').textContent = sub || '';
    $('rcFill').style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
    const b = $('rcBadge');
    b.className = 'rc-badge ' + (spin ? 'spin' : tone || '');
    b.textContent = spin
      ? ''
      : tone === 'ok'
        ? '✓'
        : tone === 'warn'
          ? '!'
          : '';
  }
  function drawRun(run, mode, u) {
    const pct = run.total ? (run.done / run.total) * 100 : 0;
    const left = users.length.toLocaleString();
    if (mode === 'wait' && run.last) {
      const l = run.last;
      banner({
        user: l,
        title: l.ok
          ? `Unfollowed @${l.username}`
          : `Couldn't unfollow @${l.username}`,
        sub: `${run.done}/${run.total} done · next in ${NFB.fmtClock((run.nextAt - Date.now()) / 1000)} · ${left} left in list`,
        pct,
        tone: l.ok ? 'ok' : 'warn',
      });
    } else if (mode === 'open') {
      banner({
        user: u,
        title: `Opening @${u.username}'s profile…`,
        sub: `${run.idx + 1} of ${run.total}`,
        pct,
        spin: true,
      });
    } else {
      banner({
        user: u,
        title: `Unfollowing @${u.username}`,
        sub: `${run.idx + 1} of ${run.total}`,
        pct,
        spin: true,
      });
    }
  }
  function finishBanner(msg, run, tone) {
    banner({
      user: run && run.last ? run.last : rcUser,
      title: msg,
      sub: run
        ? `${run.done} unfollowed · ${users.length.toLocaleString()} left in list`
        : '',
      pct: run && run.total ? (run.done / run.total) * 100 : 0,
      tone,
    });
    stopBtn.style.display = 'none';
    hideT = setTimeout(() => ($('runcard').style.display = 'none'), 7000);
  }

  // ---------- unfollow (resumable: the browser-click method opens each profile in turn) ----------
  const OWNER = (() => {
    try {
      let o = sessionStorage.getItem('nfb_owner');
      if (!o) {
        o = Math.random().toString(36).slice(2);
        sessionStorage.setItem('nfb_owner', o);
      }
      return o;
    } catch {
      return 'x';
    }
  })();
  const STALE_MS = 5 * 60 * 1000;
  const loadRun = async () =>
    (await chrome.storage.local.get(runKey))[runKey] || null;
  const saveRun = (r) => {
    r.beat = Date.now();
    return chrome.storage.local.set({ [runKey]: r });
  };
  // only this loop writes the run; Stop uses its own key, so nothing can be overwritten
  const patchRun = async (patch) => {
    const r = await loadRun();
    if (!r) return null;
    Object.assign(r, patch);
    await saveRun(r);
    return r;
  };
  const endRun = () => chrome.storage.local.remove(runKey);
  const samePage = (url) => {
    try {
      const p = (x) =>
        new URL(x, location.href).pathname.replace(/\/+$/, '').toLowerCase();
      return p(url) === p(location.href);
    } catch {
      return true;
    }
  };
  const sleepStop = async (ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms && !stop) await NFB.sleep(Math.min(250, ms));
  };
  const setRunning = (on) => {
    unfollowing = on;
    if (on) {
      stopBtn.style.display = '';
      stopBtn.disabled = false;
      stopBtn.textContent = 'Stop';
    }
    refreshButtons();
    updateChrome();
  };
  const doStop = async () => {
    stop = true;
    stopBtn.disabled = true;
    stopBtn.textContent = 'Stopping…';
    await chrome.storage.local.set({ [stopKey]: Date.now() });
  };
  stopBtn.onclick = doStop;

  async function runLoop() {
    if (unfollowing) return;
    let run = await loadRun();
    if (!run || run.owner !== OWNER) return;
    stop = !!(await chrome.storage.local.get(stopKey))[stopKey];
    setRunning(true);
    if (run.last && run.nextAt) drawRun(run, 'wait');
    let endMsg = '',
      tone = 'ok';

    try {
      while (true) {
        run = await loadRun();
        if (!run) {
          endMsg = 'Batch ended';
          tone = 'warn';
          break;
        }
        if (stop) {
          endMsg = 'Stopped';
          tone = 'warn';
          break;
        }
        if (run.idx >= run.queue.length) {
          endMsg = `Finished — ${run.done} unfollowed`;
          break;
        }
        const s0 = await NFB.getSettings();
        const s = run.forceUI ? { ...s0, igMethod: 'ui' } : s0;

        // wait out the delay since the previous unfollow (this also works across page loads)
        let ticks = 0;
        while (run.nextAt && Date.now() < run.nextAt && !stop) {
          runNextAt = run.nextAt;
          drawRun(run, 'wait');
          await NFB.sleep(500);
          if (++ticks % 30 === 0) await patchRun({});
        }
        runNextAt = 0;
        if (stop) {
          endMsg = 'Stopped';
          tone = 'warn';
          break;
        }

        await refreshCap();
        if (maxSel() <= 0) {
          endMsg = `Daily limit of ${capInfo.cap} reached`;
          tone = 'warn';
          break;
        }

        const t = run.queue[run.idx];
        const u = users.find((x) => x.pk === t.pk) || t;

        // Browser-click method: go to the account's profile first (the page reloads and this loop resumes there).
        const target = A.navigateTo ? A.navigateTo(u, s) : null;
        if (target && !samePage(target) && run.navFor !== run.idx) {
          await patchRun({ navFor: run.idx });
          drawRun(run, 'open', u);
          location.assign(target);
          return;
        }

        drawRun(run, 'work', u);
        if (target) await sleepStop(NFB.rand(2000, 4000));
        if (stop) {
          endMsg = 'Stopped';
          tone = 'warn';
          break;
        }

        let ok = false,
          errMsg = '',
          fatal = false;
        try {
          await A.unfollow(u, s);
          ok = true;
          log(`✓ ${u.username} unfollowed`);
        } catch (e) {
          if (e.stopped) {
            endMsg = 'Stopped';
            tone = 'warn';
            break;
          }
          errMsg = e.message;
          log(`✗ ${u.username} — ${e.message}`);
          if (e.useUI && !run.forceUI) {
            await patchRun({ forceUI: true });
            log(
              'Direct API was rejected: switching to browser clicks for the rest of this batch',
            );
            continue; // retry this same account with the browser-click method
          }
          fatal = !!e.fatal;
        }

        const fails = ok ? 0 : (run.fails || 0) + 1;
        if (!ok && (fatal || fails >= 3)) {
          run =
            (await patchRun({
              last: { username: u.username, pic: u.pic || '', ok: false },
            })) || run;
          endMsg = fatal
            ? `Stopped: ${errMsg}`
            : `Stopped after 3 failures in a row: ${errMsg}`;
          tone = 'warn';
          break;
        }
        if (ok) {
          await NFB.bumpDaily(A.id);
          users = users.filter((x) => x.pk !== u.pk);
          selected.delete(u.pk);
          gone.add(u.pk);
          hist.push({
            pk: u.pk,
            username: u.username,
            full_name: u.full_name || '',
            pic: u.pic || '',
            at: Date.now(),
          });
          if (hist.length > 5000) hist = hist.slice(-5000);
          derive();
          if (tab === 'todo') removeFromList(u.pk);
          await chrome.storage.local.set({
            [goneKey]: [...gone],
            [selKey]: [...selected],
            [histKey]: hist,
          });
          await refreshCap();
        }
        const nextIdx = run.idx + 1;
        const nextAt =
          nextIdx < run.queue.length
            ? Date.now() + Math.round(NFB.rand(s.minDelay, s.maxDelay)) * 1000
            : 0;
        run =
          (await patchRun({
            idx: nextIdx,
            done: run.done + (ok ? 1 : 0),
            fails,
            nextAt,
            last: { username: u.username, pic: u.pic || '', ok },
          })) || run;
      }
    } catch (e) {
      endMsg = 'Error: ' + e.message;
      tone = 'warn';
      log(endMsg);
    }

    const finalRun = await loadRun();
    log(endMsg);
    await endRun();
    await chrome.storage.local.remove(stopKey);
    stop = false;
    runNextAt = 0;
    setRunning(false);
    finishBanner(endMsg, finalRun, tone);
    setStatus(endMsg);
  }

  delBtn.onclick = async () => {
    if (unfollowing) return;
    await refreshCap();
    const chosen = users.filter((u) => selected.has(u.pk)).slice(0, maxSel());
    if (!chosen.length)
      return toast(
        maxSel() <= 0 ? capMsg() : 'Select at least one account first.',
      );
    const s = await NFB.getSettings();
    const browserMode = !!(A.navigateTo && A.navigateTo(chosen[0], s));

    const body = document.createElement('div');
    const p1 = document.createElement('div');
    p1.textContent = `They will be unfollowed one at a time, ${s.minDelay}–${s.maxDelay} seconds apart. Daily limit: ${capInfo.used} of ${capInfo.cap} used.`;
    const stack = document.createElement('div');
    stack.className = 'mstack';
    chosen.slice(0, 6).forEach((u) => stack.append(avatarEl(u)));
    if (chosen.length > 6) {
      const more = document.createElement('div');
      more.className = 'more';
      more.textContent = '+' + (chosen.length - 6);
      stack.append(more);
    }
    body.append(p1, stack);
    if (browserMode) {
      const p2 = document.createElement('div');
      p2.style.marginTop = '8px';
      p2.textContent =
        'The page will open each profile in turn. Keep this tab open until it finishes.';
      body.append(p2);
    }
    const ok = await ask({
      title: `Unfollow ${chosen.length} account${chosen.length > 1 ? 's' : ''}?`,
      body,
      confirmText: `Unfollow ${chosen.length}`,
      danger: true,
    });
    if (!ok) return;

    await chrome.storage.local.remove(stopKey);
    stop = false;
    await saveRun({
      owner: OWNER,
      queue: chosen.map((u) => ({
        pk: u.pk,
        username: u.username,
        full_name: u.full_name || '',
        pic: u.pic || '',
      })),
      idx: 0,
      done: 0,
      fails: 0,
      total: chosen.length,
      nextAt: 0,
      navFor: -1,
      forceUI: false,
      last: null,
    });
    log(`Starting batch of ${chosen.length}`);
    runLoop();
  };

  // ---------- enable / disable ----------
  function applyEnabled(on) {
    enabled = on;
    host.style.display = on ? '' : 'none';
    if (!on) {
      panel.style.display = 'none';
      if (unfollowing) doStop();
    }
  }

  chrome.storage.onChanged.addListener((ch) => {
    if (ch.enabled) applyEnabled(!!ch.enabled.newValue);
    if (ch.theme) showTheme(ch.theme.newValue);
    if (ch.position || ch.draggable || ch['fabPos_' + A.id]) loadCfg();
    if (ch['dailyCap_' + A.id] || ch['nfb_daily_' + A.id]) refreshCap();
    if (ch[scanKey]) scanCache = ch[scanKey].newValue || null;
    if (ch[scanKey] || ch[allowKey]) refreshButtons();
    if (ch[stopKey] && ch[stopKey].newValue) stop = true;
  });

  // ---------- init ----------
  (async () => {
    await NFB.migrate();
    const s = await NFB.getSettings();
    applyEnabled(!!s.enabled);
    await loadCfg();
    await NFB.bindSettings(shadow, modalHost);
    const o = await chrome.storage.local.get([
      scanKey,
      listsKey,
      keepKey,
      selKey,
      goneKey,
      histKey,
      'nfb_opts',
    ]);
    scanCache = o[scanKey] || null;
    lists = o[listsKey] || null;
    keep = o[keepKey] || {};
    gone = new Set(o[goneKey] || []);
    hist = o[histKey] || [];
    users = ((scanCache && scanCache.users) || []).filter(
      (u) => !keep[u.pk] && !gone.has(u.pk),
    );
    const have = new Set(users.map((u) => u.pk));
    selected = new Set((o[selKey] || []).filter((pk) => have.has(pk)));
    if (o.nfb_opts) {
      $('lim').value = o.nfb_opts.lim;
      $('start').value = o.nfb_opts.start;
    }
    derive();
    await refreshCap();
    renderList();
    if (users.length)
      setStatus(
        `Saved scan: ${users.length.toLocaleString()} accounts don't follow you back. ${selected.size} selected.`,
      );
    else
      setStatus(
        A.id === 'facebook'
          ? 'Beta: open your Followers tab and click Collect, then do the same on your Following tab.'
          : 'Click Scan to compare who you follow with who follows you.',
      );
    refreshButtons();

    // A batch started in this tab keeps going after the page reloads (browser-click method).
    const run = await loadRun();
    if (run) {
      const fresh = Date.now() - run.beat < STALE_MS;
      if (run.owner === OWNER && fresh && enabled) runLoop();
      else if (!fresh || (run.owner === OWNER && !enabled)) await endRun(); // abandoned batch
    }
  })();
})();

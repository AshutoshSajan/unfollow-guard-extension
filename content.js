(() => {
  if (document.getElementById("nfb-host")) return;
  const NFB = globalThis.NFB;
  const A = Object.values(NFB.adapters).find((a) => a.match());
  if (!A) return;
  const scanKey = "nfb_scan_" + A.id;
  const allowKey = "allowScan_" + A.id;
  const keepKey = "nfb_keep_" + A.id;
  const selKey = "nfb_sel_" + A.id;
  const goneKey = "nfb_gone_" + A.id;
  const runKey = "nfb_run_" + A.id;

  // ---------- UI (Shadow DOM so the site's CSS/dark mode can't affect it) ----------
  const host = document.createElement("div");
  host.id = "nfb-host";
  host.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
  <style>
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
    ${NFB.themeCSS}
    .app { display: contents; }
    .fab { position: fixed; left: 0; top: 0; visibility: hidden; padding: 12px 18px; border: 0; border-radius: 24px;
           background: #0095f6; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
           user-select: none; touch-action: none; box-shadow: 0 2px 10px rgba(0,0,0,.35); }
    .fab.drag { cursor: grab; }
    .fab.drag:active { cursor: grabbing; }
    .panel { position: fixed; left: 0; top: 0; display: none; flex-direction: column; width: 420px; max-width: calc(100vw - 32px); height: 86vh;
             background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: 14px;
             box-shadow: 0 6px 28px rgba(0,0,0,.4); overflow: hidden; }
    .head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px;
            background: var(--bg); border-bottom: 1px solid var(--border); }
    .head b { font-size: 15px; color: var(--fg); }
    .icon { background: var(--bg); color: var(--fg); border: 1px solid var(--border2); border-radius: 8px; padding: 4px 10px;
            font-size: 13px; cursor: pointer; }
    .hbtns { display: flex; gap: 6px; }
    .main { display: flex; flex-direction: column; flex: 1; min-height: 0; }
    .setview { display: none; flex: 1; overflow-y: auto; padding: 12px 14px; background: var(--bg2); color: var(--fg); }
    .status { padding: 8px 12px; font-size: 13px; line-height: 1.4; background: var(--bg2); color: var(--fg);
              border-bottom: 1px solid var(--border); min-height: 38px; }
    .bar { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 12px;
           background: var(--bg); border-bottom: 1px solid var(--border); }
    .btn { padding: 7px 10px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
           border: 1px solid var(--border2); background: var(--bg); color: var(--fg); }
    .btn.primary { background: #0095f6; border-color: #0095f6; color: #fff; }
    .btn.danger { background: #e0245e; border-color: #e0245e; color: #fff; }
    .btn:disabled { background: var(--dis-bg); border-color: var(--dis-border); color: var(--dis-fg); cursor: not-allowed; }
    .num, .sel { padding: 6px; font-size: 13px; color: var(--fg); background: var(--input-bg); border: 1px solid var(--border2); border-radius: 6px; }
    .num { width: 54px; }
    .lbl { font-size: 13px; color: var(--fg); }
    .tabs { display: flex; align-items: center; gap: 6px; padding: 8px 12px 0; background: var(--bg); }
    .tab { padding: 6px 10px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
           border: 1px solid var(--border2); background: var(--bg); color: var(--fg); }
    .tab.on { background: #0095f6; border-color: #0095f6; color: #fff; }
    .selc { margin-left: auto; font-size: 12px; color: var(--fg2); text-align: right; }
    .search { margin: 8px 12px 0; padding: 8px 10px; font-size: 14px; color: var(--fg); background: var(--input-bg);
              border: 1px solid var(--border2); border-radius: 8px; }
    .list { flex: 1; overflow-y: auto; padding: 6px 0; background: var(--bg); min-height: 80px; }
    .row { display: flex; align-items: center; gap: 10px; padding: 7px 12px; cursor: pointer; background: var(--bg); }
    .row:hover { background: var(--hover); }
    .row input { width: 18px; height: 18px; flex: none; }
    .av { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; flex: none; background: var(--av-bg); }
    .ph { display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; background: #8e8e93; }
    .who { flex: 1; min-width: 0; }
    .un { font-size: 14px; font-weight: 600; color: var(--fg); text-decoration: none; display: block;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .un:hover { text-decoration: underline; }
    .fn { font-size: 13px; color: var(--fg2); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mini { padding: 5px 9px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer; flex: none;
            border: 1px solid var(--border2); background: var(--bg); color: var(--fg); }
    .empty { padding: 24px 14px; color: var(--fg2); font-size: 14px; text-align: center; }
    details.log { border-top: 1px solid var(--border); background: var(--bg); color: var(--fg); }
    details.log summary { padding: 6px 12px; font-size: 12px; cursor: pointer; color: var(--fg2); }
    .logbox { max-height: 110px; overflow-y: auto; padding: 0 12px 8px; font-size: 12px; line-height: 1.45;
              font-family: ui-monospace, Menlo, Consolas, monospace; color: var(--fg); }
    .runbar { position: fixed; top: 12px; left: 50%; transform: translateX(-50%); display: none; align-items: center; gap: 10px;
              padding: 8px 12px; max-width: min(92vw, 560px); background: var(--bg); color: var(--fg); font-size: 13px;
              border: 1px solid var(--border2); border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,.35); }
    ${NFB.settingsCSS}
  </style>
  <div class="app" id="app" data-theme="system">
  <div class="panel" id="panel">
    <div class="head"><b>Unfollow Guard · ${A.label}</b>
      <div class="hbtns"><button class="icon" id="themeBtn" title="Change theme">◐ System</button><button class="icon" id="gear">⚙ Settings</button></div></div>
    <div class="main" id="main">
      <div class="status" id="status"></div>
      <div class="bar">
        <span class="lbl">Check</span>
        <select class="sel" id="lim">
          <option value="50">first 50</option><option value="100">first 100</option>
          <option value="250">first 250</option><option value="500">first 500</option>
          <option value="0">all</option>
        </select>
        <span class="lbl">following</span>
        <span class="lbl" id="startwrap">from # <input class="num" id="start" type="number" min="1" value="1"></span>
      </div>
      <div class="bar">
        <button class="btn primary" id="scan">Scan</button>
        <button class="btn" id="selN">Select first</button>
        <input class="num" id="n" type="number" min="1" value="30">
        <button class="btn" id="all">Select all</button>
        <button class="btn" id="clr">Unselect all</button>
      </div>
      <div class="bar">
        <button class="btn danger" id="del">Unfollow selected</button>
        <button class="btn" id="keepSel">Keep selected</button>
        <button class="btn" id="stop" disabled>Stop</button>
      </div>
      <div class="tabs">
        <button class="tab on" id="tabList">To unfollow (0)</button>
        <button class="tab" id="tabKeep">Kept (0)</button>
        <span class="selc" id="selCount"></span>
      </div>
      <input class="search" id="q" type="search" placeholder="Search name">
      <div class="list" id="list"></div>
      <div class="list" id="keepList" style="display:none"></div>
      <details class="log"><summary>Activity log</summary><div class="logbox" id="log"></div></details>
    </div>
    <div class="setview" id="setview">${NFB.settingsHTML}</div>
  </div>
  <button class="fab" id="fab">Unfollow Guard</button>
  <div class="runbar" id="runbar"><span id="runtext"></span><button class="btn danger" id="runstop">Stop</button></div>
  </div>`;
  document.body.append(host);

  const $ = (id) => shadow.getElementById(id);
  NFB.watchTheme($("app"));
  const panel = $("panel"), statusEl = $("status"), listEl = $("list"), keepEl = $("keepList");
  const scanBtn = $("scan"), delBtn = $("del"), stopBtn = $("stop"), keepSelBtn = $("keepSel");
  const setStatus = (t) => (statusEl.textContent = t);

  const logBox = $("log");
  const log = (t) => {
    const d = document.createElement("div");
    d.textContent = new Date().toLocaleTimeString() + "  " + t;
    logBox.prepend(d);
    while (logBox.childElementCount > 60) logBox.lastChild.remove();
    console.log("[Unfollow Guard]", t);
  };

  let inSettings = false;
  $("gear").onclick = () => {
    inSettings = !inSettings;
    $("main").style.display = inSettings ? "none" : "flex";
    $("setview").style.display = inSettings ? "block" : "none";
    $("gear").textContent = inSettings ? "← Back" : "⚙ Settings";
  };

  // ---------- theme button (cycles System → Light → Dark) ----------
  const THEMES = ["system", "light", "dark"];
  const THEME_LABEL = { system: "◐ System", light: "☀ Light", dark: "☾ Dark" };
  let theme = "system";
  const showTheme = (t) => { theme = THEMES.includes(t) ? t : "system"; $("themeBtn").textContent = THEME_LABEL[theme]; };
  $("themeBtn").onclick = () => chrome.storage.local.set({ theme: THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length] });
  NFB.getSettings().then((s) => showTheme(s.theme));

  // ---------- button placement + dragging ----------
  const fab = $("fab");
  const M = 16;
  let cfg = { position: "bottom-right", draggable: true };
  let custom = null; // dragged spot, as fractions of the free space {fx, fy}
  const vw = () => document.documentElement.clientWidth;
  const vh = () => window.innerHeight;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function fabXY() {
    const w = fab.offsetWidth, h = fab.offsetHeight;
    const maxX = Math.max(0, vw() - w), maxY = Math.max(0, vh() - h);
    if (cfg.draggable && custom) return { x: custom.fx * maxX, y: custom.fy * maxY, w, h };
    const p = cfg.position || "bottom-right";
    return {
      x: clamp(p.endsWith("left") ? M : maxX - M, 0, maxX),
      y: clamp(p.startsWith("top") ? M : maxY - M, 0, maxY),
      w, h,
    };
  }
  function placePanel(f) {
    const W = vw(), H = vh();
    const pw = Math.min(420, W - 2 * M);
    const above = f.y + f.h / 2 > H / 2;
    const space = above ? f.y - 8 - M : H - (f.y + f.h) - 8 - M;
    const ph = Math.max(Math.min(320, H - 2 * M), Math.min(H * 0.86, space));
    const rightAlign = f.x + f.w / 2 > W / 2;
    const x = clamp(rightAlign ? f.x + f.w - pw : f.x, M, Math.max(M, W - pw - M));
    const y = clamp(above ? f.y - 8 - ph : f.y + f.h + 8, M, Math.max(M, H - ph - M));
    panel.style.width = pw + "px";
    panel.style.height = ph + "px";
    panel.style.left = x + "px";
    panel.style.top = y + "px";
  }
  function place(override) {
    const f = override || fabXY();
    fab.style.left = f.x + "px";
    fab.style.top = f.y + "px";
    if (panel.style.display === "flex") placePanel(f);
  }
  async function loadCfg() {
    const s = await NFB.getSettings();
    cfg = { position: s.position, draggable: !!s.draggable };
    const o = await chrome.storage.local.get("fabPos_" + A.id);
    custom = o["fabPos_" + A.id] || null;
    fab.classList.toggle("drag", cfg.draggable);
    place();
    fab.style.visibility = "visible";
  }
  window.addEventListener("resize", () => place());
  const togglePanel = () => {
    panel.style.display = panel.style.display === "flex" ? "none" : "flex";
    place();
  };
  let drag = null;
  fab.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const f = fabXY();
    drag = { sx: e.clientX, sy: e.clientY, ox: f.x, oy: f.y, w: f.w, h: f.h, moved: false };
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener("pointermove", (e) => {
    if (!drag || !cfg.draggable) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    drag.x = clamp(drag.ox + dx, 0, Math.max(0, vw() - drag.w));
    drag.y = clamp(drag.oy + dy, 0, Math.max(0, vh() - drag.h));
    place({ x: drag.x, y: drag.y, w: drag.w, h: drag.h });
  });
  fab.addEventListener("pointerup", async (e) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    try { fab.releasePointerCapture(e.pointerId); } catch {}
    if (!d.moved) return togglePanel();
    const maxX = Math.max(1, vw() - d.w), maxY = Math.max(1, vh() - d.h);
    custom = { fx: d.x / maxX, fy: d.y / maxY };
    await chrome.storage.local.set({ ["fabPos_" + A.id]: custom });
  });
  fab.addEventListener("pointercancel", () => { drag = null; place(); });

  // ---------- state ----------
  // Big data (the scan) is read once and cached; small data (keep, gone, selection) is saved separately,
  // so ticking, keeping and unfollowing never rewrite the whole list.
  let scanCache = null;      // last saved scan
  let users = [];            // non-followers still to decide on (scan minus kept minus unfollowed)
  let keep = {};             // pk -> user you chose to keep following
  let gone = new Set();      // pks unfollowed since the last scan
  let selected = new Set();  // pks ticked for unfollowing
  let view = "list";         // "list" | "keep"
  let capInfo = { cap: 40, used: 0 };
  let scanning = false, unfollowing = false, stop = false;
  const rows = new Map();    // pk -> {row, cb} (list view)

  const maxSel = () => Math.max(0, capInfo.cap - capInfo.used);
  const capMsg = () =>
    `Daily cap is ${capInfo.cap} and ${capInfo.used} were already unfollowed today, so you can select at most ${maxSel()} more. Change the cap in ⚙ Settings.`;
  const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : String(v).replace(/"/g, '\\"'));

  let selT;
  const saveSel = () => {
    clearTimeout(selT);
    selT = setTimeout(() => chrome.storage.local.set({ [selKey]: [...selected] }), 150);
  };
  const saveKeep = () => chrome.storage.local.set({ [keepKey]: keep });

  function syncChecks() { rows.forEach(({ cb }, pk) => (cb.checked = selected.has(pk))); }

  function updateCount() {
    $("selCount").textContent = `${selected.size} selected · ${maxSel()} left today`;
    $("tabList").textContent = `To unfollow (${users.length})`;
    $("tabKeep").textContent = `Kept (${Object.keys(keep).length})`;
  }

  async function refreshCap() {
    const s = await NFB.getSettings();
    const d = await NFB.getDaily(A.id);
    capInfo = { cap: s["dailyCap_" + A.id], used: d.count };
    if (selected.size > maxSel()) {
      selected = new Set([...selected].slice(0, maxSel()));
      syncChecks();
      saveSel();
    }
    updateCount();
  }

  chrome.storage.onChanged.addListener((ch) => {
    if (ch.theme) showTheme(ch.theme.newValue);
    if (ch.position || ch.draggable || ch["fabPos_" + A.id]) loadCfg();
    if (ch["dailyCap_" + A.id] || ch["nfb_daily_" + A.id]) refreshCap();
    if (ch[scanKey]) scanCache = ch[scanKey].newValue || null;
    if (ch[scanKey] || ch[allowKey]) refreshButtons();
  });

  // ---------- list rendering ----------
  const placeholder = (u) => {
    const d = document.createElement("div");
    d.className = "av ph";
    d.textContent = (u.username || "?").trim().charAt(0).toUpperCase();
    return d;
  };
  // Pictures load only when scrolled near, and stay loaded (rows are never rebuilt just because something changed).
  const makeObserver = (root) => new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.src = e.target.dataset.src;
      e.target.__io && e.target.__io.unobserve(e.target);
    }),
    { root, rootMargin: "300px" }
  );
  const ioList = makeObserver(listEl);
  const ioKeep = makeObserver(keepEl);
  const makeAvatar = (u, io) => {
    if (!u.pic) return placeholder(u);
    const img = document.createElement("img");
    img.className = "av";
    img.alt = "";
    img.dataset.src = u.pic;
    img.__io = io;
    img.onerror = () => {
      console.warn("[Unfollow Guard] profile picture failed to load:", u.pic);
      img.replaceWith(placeholder(u));
    };
    io.observe(img);
    return img;
  };

  function buildRow(u, kept) {
    const row = document.createElement("label");
    row.className = "row";
    row.dataset.pk = u.pk;
    row.dataset.s = (u.username + " " + (u.full_name || "")).toLowerCase();
    let cb = null;
    if (!kept) {
      cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = selected.has(u.pk);
      cb.onchange = () => {
        if (cb.checked) {
          if (selected.size >= maxSel()) { cb.checked = false; return setStatus(capMsg()); }
          selected.add(u.pk);
        } else selected.delete(u.pk);
        saveSel();
        updateCount();
      };
    }
    const who = document.createElement("div");
    who.className = "who";
    const a = document.createElement("a");
    a.className = "un";
    a.href = A.profileUrl(u);
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = u.username + (u.verified ? " ✔" : "");
    a.onclick = (e) => e.stopPropagation();
    const fn = document.createElement("div");
    fn.className = "fn";
    fn.textContent = u.full_name || "";
    who.append(a, fn);
    const btn = document.createElement("button");
    btn.className = "mini";
    btn.textContent = kept ? "Move back" : "Keep";
    btn.title = kept ? "Put this account back in the unfollow list" : "Never unfollow this account (hides it from future scans)";
    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); kept ? unkeepUsers([u.pk]) : keepUsers([u.pk]); };
    if (cb) row.append(cb);
    row.append(makeAvatar(u, kept ? ioKeep : ioList), who, btn);
    return { row, cb };
  }

  const addEmpty = (el, text) => {
    if (el.querySelector(".empty")) return;
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = text;
    el.append(e);
  };
  const LIST_EMPTY = "No accounts in the list. Click Scan to find who doesn't follow you back.";
  const KEEP_EMPTY = "Nothing kept yet. Use the Keep button on an account you never want to unfollow.";

  function renderList() {
    ioList.disconnect();
    listEl.replaceChildren();
    rows.clear();
    if (!users.length) addEmpty(listEl, LIST_EMPTY);
    const frag = document.createDocumentFragment();
    users.forEach((u) => {
      const r = buildRow(u, false);
      frag.append(r.row);
      rows.set(u.pk, r);
    });
    listEl.append(frag);
    updateCount();
    applyFilter();
  }
  function renderKeep() {
    ioKeep.disconnect();
    keepEl.replaceChildren();
    const list = Object.values(keep);
    if (!list.length) addEmpty(keepEl, KEEP_EMPTY);
    const frag = document.createDocumentFragment();
    list.forEach((u) => frag.append(buildRow(u, true).row));
    keepEl.append(frag);
    applyFilter();
  }

  function applyFilter() {
    const q = $("q").value.trim().toLowerCase();
    (view === "list" ? listEl : keepEl).querySelectorAll(".row").forEach((row) => {
      row.style.display = !q || row.dataset.s.includes(q) ? "flex" : "none";
    });
  }
  $("q").oninput = applyFilter;

  function showView(v) {
    view = v;
    $("tabList").classList.toggle("on", v === "list");
    $("tabKeep").classList.toggle("on", v === "keep");
    listEl.style.display = v === "list" ? "block" : "none";
    keepEl.style.display = v === "keep" ? "block" : "none";
    if (v === "keep") renderKeep(); else applyFilter();
    updateCount();
  }
  $("tabList").onclick = () => showView("list");
  $("tabKeep").onclick = () => showView("keep");

  // ---------- keep list (changes rows in place: no re-render, no flicker) ----------
  function keepUsers(pks) {
    let n = 0;
    pks.forEach((pk) => {
      const u = users.find((x) => x.pk === pk);
      if (!u) return;
      keep[pk] = u;
      selected.delete(pk);
      const r = rows.get(pk);
      if (r) { r.row.remove(); rows.delete(pk); }
      n++;
    });
    if (!n) return setStatus("Select at least one account first.");
    users = users.filter((x) => !keep[x.pk]);
    if (!rows.size) addEmpty(listEl, "No accounts left in the list.");
    saveKeep();
    saveSel();
    updateCount();
    setStatus(`Kept ${n} account(s). They won't appear in future scans. Find them under "Kept".`);
  }
  function unkeepUsers(pks) {
    let n = 0;
    pks.forEach((pk) => {
      const u = keep[pk];
      if (!u) return;
      delete keep[pk];
      if (!gone.has(pk)) {
        users.unshift(u);
        const r = buildRow(u, false);
        const e = listEl.querySelector(".empty");
        if (e) e.remove();
        listEl.prepend(r.row);
        rows.set(pk, r);
      }
      const el = keepEl.querySelector(`.row[data-pk="${esc(pk)}"]`);
      if (el) el.remove();
      n++;
    });
    if (!n) return;
    if (!keepEl.querySelector(".row")) addEmpty(keepEl, KEEP_EMPTY);
    saveKeep();
    applyFilter();
    updateCount();
    setStatus(`Moved ${n} account(s) back to "To unfollow".`);
  }
  keepSelBtn.onclick = () => keepUsers([...selected]);

  // ---------- scan size options ----------
  if (!A.supportsStart) $("startwrap").style.display = "none";
  const getOpts = () => ({
    limit: parseInt($("lim").value, 10) || 0,
    start: A.supportsStart ? Math.max(0, (parseInt($("start").value, 10) || 1) - 1) : 0,
  });
  const saveOpts = () => chrome.storage.local.set({ nfb_opts: { lim: $("lim").value, start: $("start").value } });
  $("lim").onchange = saveOpts;
  $("start").onchange = saveOpts;

  async function refreshButtons() {
    const s = await NFB.getSettings();
    const allow = !!s[allowKey];
    scanBtn.disabled = scanning || unfollowing || !allow || !A.canScan(scanCache);
    $("lim").disabled = $("start").disabled = scanBtn.disabled;
    scanBtn.textContent = allow ? A.scanLabel(scanCache) : "Scan (locked)";
    scanBtn.title = allow ? "" : "Locked to prevent repeat requests. Enable it under ⚙ Settings.";
  }
  setInterval(refreshButtons, 1500); // also follows page navigation on single-page sites

  // ---------- Scan ----------
  scanBtn.onclick = async () => {
    if (scanning) return;
    const s = await NFB.getSettings();
    if (!s[allowKey]) return;
    if (!A.canScan(scanCache)) return setStatus(A.cannotScanMessage(scanCache));
    const opts = getOpts();
    if (!confirm(A.scanConfirm(opts))) return;

    scanning = true;
    refreshButtons();
    try {
      const res = await A.scan({ setStatus, prev: scanCache, opts });
      scanCache = res.scan;
      gone = new Set();
      await chrome.storage.local.set({ [scanKey]: res.scan, [goneKey]: [] });
      if (res.complete) await chrome.storage.local.set({ [allowKey]: false });
      const all = res.scan.users || [];
      users = all.filter((u) => !keep[u.pk]);
      const hidden = all.length - users.length;
      const have = new Set(users.map((u) => u.pk));
      selected = new Set([...selected].filter((pk) => have.has(pk)));
      saveSel();
      renderList();
      showView("list");
      setStatus(res.message + (hidden ? ` ${hidden} kept account(s) hidden.` : ""));
    } catch (e) {
      setStatus("Error: " + e.message);
    }
    scanning = false;
    refreshButtons();
  };

  // ---------- selection (limited by the daily cap) ----------
  const visiblePks = () =>
    [...listEl.querySelectorAll(".row")].filter((r) => r.style.display !== "none").map((r) => r.dataset.pk);
  const selectPks = (pks, wanted) => {
    selected = new Set(pks.slice(0, maxSel()));
    syncChecks();
    saveSel();
    updateCount();
    if (wanted > maxSel()) setStatus(capMsg());
  };
  $("selN").onclick = () => {
    if (view !== "list") showView("list");
    const n = Math.max(1, parseInt($("n").value, 10) || 30);
    selectPks(visiblePks().slice(0, n), n);
  };
  $("all").onclick = () => {
    if (view !== "list") showView("list");
    const v = visiblePks();
    selectPks(v, v.length);
  };
  $("clr").onclick = () => { selected.clear(); syncChecks(); saveSel(); updateCount(); };

  // ---------- Unfollow (resumable: the browser-click method opens each profile in turn) ----------
  const OWNER = (() => {
    try {
      let o = sessionStorage.getItem("nfb_owner");
      if (!o) { o = Math.random().toString(36).slice(2); sessionStorage.setItem("nfb_owner", o); }
      return o;
    } catch { return "x"; }
  })();
  const STALE_MS = 5 * 60 * 1000;
  const loadRun = async () => (await chrome.storage.local.get(runKey))[runKey] || null;
  const saveRun = (r) => { r.beat = Date.now(); return chrome.storage.local.set({ [runKey]: r }); };
  const touchRun = async () => { const r = await loadRun(); if (r) await saveRun(r); };
  const endRun = () => chrome.storage.local.remove(runKey);
  const samePage = (url) => {
    try {
      const p = (x) => new URL(x, location.href).pathname.replace(/\/+$/, "").toLowerCase();
      return p(url) === p(location.href);
    } catch { return true; }
  };
  const runText = (t) => { setStatus(t); $("runtext").textContent = t; };
  const setRunning = (on) => {
    unfollowing = on;
    delBtn.disabled = on;
    stopBtn.disabled = !on;
    $("runbar").style.display = on ? "flex" : "none";
    refreshButtons();
  };
  const doStop = async () => {
    stop = true;
    const r = await loadRun();
    if (r) { r.stop = true; await saveRun(r); }
  };
  stopBtn.onclick = doStop;
  $("runstop").onclick = doStop;

  async function runLoop() {
    if (unfollowing) return;
    let run = await loadRun();
    if (!run || run.owner !== OWNER) return;
    setRunning(true);
    stop = false;
    let endMsg = "";

    while (true) {
      run = await loadRun();
      if (!run) { endMsg = "Batch ended."; break; }
      if (stop || run.stop) { endMsg = "Stopped by you."; break; }
      if (run.idx >= run.queue.length) { endMsg = `Finished. Unfollowed ${run.done}. ${users.length} left in the list.`; break; }
      const s0 = await NFB.getSettings();
      const s = run.forceUI ? { ...s0, igMethod: "ui" } : s0;

      // wait out the delay since the previous unfollow (this also works across page loads)
      let ticks = 0;
      while (run.nextAt && Date.now() < run.nextAt && !stop) {
        const left = Math.ceil((run.nextAt - Date.now()) / 1000);
        runText(`Unfollowed ${run.done}/${run.total}. Next in ${left}s… (${users.length} left in the list)`);
        await NFB.sleep(1000);
        if (++ticks % 15 === 0) await touchRun();
      }
      if (stop) { endMsg = "Stopped by you."; break; }

      await refreshCap();
      if (maxSel() <= 0) { endMsg = `Daily cap of ${capInfo.cap} reached. Come back tomorrow.`; break; }

      const t = run.queue[run.idx];
      const u = users.find((x) => x.pk === t.pk) || { pk: t.pk, username: t.username };

      // Browser-click method: go to the account's profile first (the page reloads and this loop resumes there).
      const target = A.navigateTo ? A.navigateTo(u, s) : null;
      if (target && !samePage(target) && run.navFor !== run.idx) {
        run.navFor = run.idx;
        runText(`Opening ${u.username}'s profile (${run.idx + 1}/${run.total})…`);
        await saveRun(run);
        location.assign(target);
        return;
      }

      runText(`Unfollowing ${u.username} (${run.idx + 1}/${run.total})…`);
      if (target) await NFB.sleep(NFB.rand(2000, 4000)); // let the profile settle, like a person would
      let ok = false;
      try {
        await A.unfollow(u, s);
        ok = true;
        log(`✓ ${u.username} unfollowed`);
      } catch (e) {
        log(`✗ ${u.username} — ${e.message}`);
        if (e.useUI && !run.forceUI) {
          run.forceUI = true;
          log("Direct API was rejected: switching to browser clicks for the rest of this batch");
          await saveRun(run);
          continue; // retry this same account with the browser-click method
        }
        run.fails = (run.fails || 0) + 1;
        if (e.fatal) { endMsg = `Stopped: ${e.message}`; break; }
        if (run.fails >= 3) { endMsg = `Stopped after 3 failures in a row. Last: ${e.message}`; break; }
      }

      if (ok) {
        run.fails = 0;
        run.done++;
        await NFB.bumpDaily(A.id);
        users = users.filter((x) => x.pk !== u.pk);
        selected.delete(u.pk);
        gone.add(u.pk);
        const r = rows.get(u.pk);
        if (r) { r.row.remove(); rows.delete(u.pk); }
        if (!rows.size) addEmpty(listEl, "No accounts left in the list.");
        await chrome.storage.local.set({ [goneKey]: [...gone], [selKey]: [...selected] });
        await refreshCap();
      }
      run.idx++;
      run.nextAt = run.idx < run.queue.length ? Date.now() + Math.round(NFB.rand(s.minDelay, s.maxDelay)) * 1000 : 0;
      await saveRun(run);
    }

    log(endMsg);
    await endRun();
    setRunning(false);
    setStatus(endMsg);
  }

  delBtn.onclick = async () => {
    if (unfollowing) return;
    await refreshCap();
    const chosen = users.filter((u) => selected.has(u.pk)).slice(0, maxSel());
    if (!chosen.length) return setStatus(maxSel() <= 0 ? capMsg() : "Nothing selected. Tick one or more accounts first.");
    const s = await NFB.getSettings();
    const browserMode = A.navigateTo && A.navigateTo(chosen[0], s);
    if (!confirm(
      `Unfollow ${chosen.length} account(s), ${s.minDelay}–${s.maxDelay}s apart? Daily cap: ${capInfo.cap} (${capInfo.used} used today).` +
      (browserMode ? "\n\nThe page will open each profile in turn. Leave this tab open until it finishes." : "")
    )) return;

    await saveRun({
      owner: OWNER,
      queue: chosen.map((u) => ({ pk: u.pk, username: u.username })),
      idx: 0, done: 0, fails: 0, total: chosen.length, stop: false, nextAt: 0, navFor: -1, forceUI: false,
    });
    log(`Starting batch of ${chosen.length}`);
    runLoop();
  };

  // ---------- init ----------
  (async () => {
    await NFB.migrate();
    await loadCfg();
    await NFB.bindSettings(shadow);
    const o = await chrome.storage.local.get([scanKey, keepKey, selKey, goneKey, "nfb_opts"]);
    scanCache = o[scanKey] || null;
    keep = o[keepKey] || {};
    gone = new Set(o[goneKey] || []);
    users = ((scanCache && scanCache.users) || []).filter((u) => !keep[u.pk] && !gone.has(u.pk));
    const have = new Set(users.map((u) => u.pk));
    selected = new Set((o[selKey] || []).filter((pk) => have.has(pk)));
    if (o.nfb_opts) { $("lim").value = o.nfb_opts.lim; $("start").value = o.nfb_opts.start; }
    await refreshCap();
    renderList();
    if (users.length) setStatus(`Saved scan: ${users.length} non-followers left. ${selected.size} selected.`);
    else setStatus(A.id === "facebook"
      ? "Open your Followers tab and click Collect, then do the same on your Following tab."
      : "Click Scan once to compare following vs followers.");
    refreshButtons();

    // A batch started in this tab keeps going after the page reloads (browser-click method).
    const run = await loadRun();
    if (run) {
      if (run.owner === OWNER && Date.now() - run.beat < STALE_MS) runLoop();
      else if (Date.now() - run.beat >= STALE_MS) await endRun(); // abandoned batch
    }
  })();
})();

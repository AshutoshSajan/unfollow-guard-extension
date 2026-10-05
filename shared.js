// Shared helpers: settings, storage, and the settings form used by both the toolbar popup and the in-page panel.
(() => {
  const NFB = (globalThis.NFB = globalThis.NFB || {});
  NFB.adapters = NFB.adapters || {};
  NFB.PLATFORMS = [
    { id: "instagram", label: "Instagram" },
    { id: "facebook", label: "Facebook" },
  ];
  NFB.DEFAULTS = {
    allowScan_instagram: true,
    allowScan_facebook: true,
    dailyCap_instagram: 40,
    dailyCap_facebook: 20,
    minDelay: 20,
    maxDelay: 60,
    theme: "system",
    position: "bottom-right",
    draggable: true,
    igMethod: "api",
  };
  NFB.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  NFB.rand = (a, b) => a + Math.random() * (b - a);
  NFB.today = () => new Date().toLocaleDateString("en-CA");

  NFB.getSettings = async () => ({ ...NFB.DEFAULTS, ...(await chrome.storage.local.get(Object.keys(NFB.DEFAULTS))) });

  NFB.getDaily = async (p) => {
    const o = await chrome.storage.local.get("nfb_daily_" + p);
    const d = o["nfb_daily_" + p];
    return d && d.date === NFB.today() ? d : { date: NFB.today(), count: 0 };
  };
  NFB.bumpDaily = async (p) => {
    const d = await NFB.getDaily(p);
    d.count++;
    await chrome.storage.local.set({ ["nfb_daily_" + p]: d });
    return d.count;
  };

  // Moves data saved by v1.0/v1.1 (Instagram only) to the per-platform keys.
  NFB.migrate = async () => {
    // v1.3: direct API (with the site's own tokens) is the default again; it falls back to browser clicks by itself.
    const flag = await chrome.storage.local.get("igMethodV2");
    if (!flag.igMethodV2) await chrome.storage.local.set({ igMethod: "api", igMethodV2: true });
    const o = await chrome.storage.local.get(["nfb_scan", "nfb_scan_instagram", "allowScan", "dailyCap", "nfb_daily"]);
    const upd = {};
    if (o.nfb_scan && !o.nfb_scan_instagram) upd.nfb_scan_instagram = o.nfb_scan;
    if (o.allowScan !== undefined) upd.allowScan_instagram = o.allowScan;
    if (o.dailyCap !== undefined) upd.dailyCap_instagram = o.dailyCap;
    if (o.nfb_daily) upd.nfb_daily_instagram = o.nfb_daily;
    if (Object.keys(upd).length) {
      await chrome.storage.local.set(upd);
      await chrome.storage.local.remove(["nfb_scan", "allowScan", "dailyCap", "nfb_daily"]);
    }
  };

  NFB.describeScan = (p, sc) => {
    const n = (sc.users || []).length;
    if (p === "facebook") {
      const f1 = sc.followersList ? sc.followersList.length : "not collected";
      const f2 = sc.followingList ? sc.followingList.length : "not collected";
      return `Followers list: ${f1} · Following list: ${f2} · ${n} non-followers left`;
    }
    const chk = sc.range ? `checked #${sc.range.from}–${sc.range.to} of ${sc.following}` : `following ${sc.following}`;
    return `Scanned ${new Date(sc.at).toLocaleDateString()} · ${chk}, followers ${sc.followers ?? "?"} · ${n} non-followers left`;
  };

  const DARK = `--bg:#1c1e21; --bg2:#242628; --fg:#f0f2f5; --fg2:#b0b3b8; --border:#3a3b3c; --border2:#5a5d61;
    --input-bg:#2b2d30; --hover:#2e3033; --dis-bg:#3a3b3c; --dis-fg:#8a8d91; --dis-border:#4a4b4c;
    --green:#4cd07d; --red:#ff6b6b; --av-bg:#3a3b3c;`;
  NFB.themeCSS = `
    .app { --bg:#fff; --bg2:#f1f3f5; --fg:#111; --fg2:#555; --border:#e0e0e0; --border2:#bbb;
           --input-bg:#fff; --hover:#f5f8fa; --dis-bg:#e6e6e6; --dis-fg:#666; --dis-border:#d0d0d0;
           --green:#187a3a; --red:#c62828; --av-bg:#ddd; }
    .app[data-theme="dark"] { ${DARK} }
    @media (prefers-color-scheme: dark) { .app[data-theme="system"] { ${DARK} } }
  `;

  NFB.settingsCSS = `
    .sblock { border: 1px solid var(--border); border-radius: 10px; padding: 4px 12px; margin-bottom: 12px; background: var(--bg); color: var(--fg); }
    .stitle { font-weight: 700; font-size: 14px; padding: 8px 0 4px; color: var(--fg); }
    .srow { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0;
            border-top: 1px solid var(--border); color: var(--fg); font-size: 13px; }
    .stitle + .srow { border-top: 0; }
    .hint { color: var(--fg2); font-size: 12px; margin-top: 3px; line-height: 1.35; font-weight: 400; }
    .snum, .ssel { padding: 6px; font-size: 13px; color: var(--fg); background: var(--input-bg); border: 1px solid var(--border2); border-radius: 6px; }
    .snum { width: 62px; }
    .sbtn { padding: 6px 12px; border-radius: 8px; border: 1px solid var(--red); background: var(--bg); color: var(--red);
            font-size: 12px; font-weight: 600; cursor: pointer; flex: none; }
    .ssaved { color: var(--green); font-size: 13px; min-height: 18px; }
    .srow input[type=checkbox] { width: 20px; height: 20px; flex: none; }
  `;

  // Keeps the data-theme attribute of `el` in sync with the saved theme (light | dark | system).
  NFB.watchTheme = async (el) => {
    const s = await NFB.getSettings();
    el.setAttribute("data-theme", s.theme || "system");
    chrome.storage.onChanged.addListener((ch) => {
      if (ch.theme) el.setAttribute("data-theme", ch.theme.newValue || "system");
    });
  };

  const block = (p) => `
    <div class="sblock">
      <div class="stitle">${p.label}</div>
      <div class="srow"><div><b>Allow scanning</b>
        <div class="hint">Locks itself after a successful scan. Turn it on only when you really want to fetch again.</div></div>
        <input type="checkbox" id="allowScan_${p.id}"></div>
      <div class="srow"><div><b>Daily unfollow cap</b><div class="hint">1–100 per day</div></div>
        <input class="snum" type="number" id="dailyCap_${p.id}" min="1" max="100"></div>
      <div class="srow"><div><b>Saved scan</b><div class="hint" id="info_${p.id}">No saved scan.</div></div>
        <button class="sbtn" id="clear_${p.id}">Clear</button></div>
      <div class="srow"><div><b>Kept accounts</b><div class="hint" id="keepinfo_${p.id}">None</div></div>
        <button class="sbtn" id="clearKeep_${p.id}">Clear</button></div>
    </div>`;
  const appearance = `
    <div class="sblock">
      <div class="stitle">Appearance</div>
      <div class="srow"><div><b>Theme</b><div class="hint">System follows your device's light/dark setting.</div></div>
        <select class="ssel" id="theme"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div>
      <div class="srow"><div><b>Button position</b><div class="hint">Where the Unfollow Guard button sits. Used when dragging is off, or after a reset.</div></div>
        <select class="ssel" id="position"><option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option></select></div>
      <div class="srow"><div><b>Allow dragging</b><div class="hint">Drag the button anywhere. Its spot is remembered for each site.</div></div>
        <input type="checkbox" id="draggable"></div>
      <div class="srow"><div><b>Reset dragged position</b><div class="hint">Puts the button back at the position chosen above.</div></div>
        <button class="sbtn" id="resetPos">Reset</button></div>
    </div>`;
  const method = `
    <div class="sblock">
      <div class="stitle">Instagram unfollow method</div>
      <div class="srow"><div><b>Method</b>
        <div class="hint">Direct API sends the same request Instagram's own page sends. If Instagram rejects it, the batch switches to Browser clicks (opens each profile and clicks Following → Unfollow; Instagram must be set to English).</div></div>
        <select class="ssel" id="igMethod"><option value="api">Direct API (falls back to browser clicks)</option><option value="ui">Browser clicks only</option></select></div>
    </div>`;
  NFB.settingsHTML =
    `<div id="nfbset">` + appearance + method + NFB.PLATFORMS.map(block).join("") +
    `<div class="sblock"><div class="stitle">Delay between unfollows</div>
       <div class="srow"><div class="hint">Random delay in seconds (min – max)</div>
       <div><input class="snum" type="number" id="minDelay" min="10" max="600"> – <input class="snum" type="number" id="maxDelay" min="10" max="600"></div></div></div>
     <div class="ssaved" id="ssaved"></div></div>`;

  // root: document (popup) or a ShadowRoot (in-page panel)
  NFB.bindSettings = async (root) => {
    const $ = (id) => root.getElementById(id);
    let timer;
    const flash = (m) => {
      $("ssaved").textContent = m;
      clearTimeout(timer);
      timer = setTimeout(() => ($("ssaved").textContent = ""), 1800);
    };
    const refreshInfo = async () => {
      const s = await NFB.getSettings();
      $("theme").value = s.theme || "system"; // stays in sync with the panel's theme button
      for (const p of NFB.PLATFORMS) {
        $("allowScan_" + p.id).checked = !!s["allowScan_" + p.id];
        const o = await chrome.storage.local.get("nfb_scan_" + p.id);
        const sc = o["nfb_scan_" + p.id];
        $("info_" + p.id).textContent = sc ? NFB.describeScan(p.id, sc) : "No saved scan.";
        const ko = await chrome.storage.local.get("nfb_keep_" + p.id);
        const kn = (ko["nfb_keep_" + p.id] || []).length;
        $("keepinfo_" + p.id).textContent = kn ? `${kn} hidden from the list (never unfollowed)` : "None";
      }
    };
    const loadAll = async () => {
      const s = await NFB.getSettings();
      for (const p of NFB.PLATFORMS) $("dailyCap_" + p.id).value = s["dailyCap_" + p.id];
      $("theme").value = s.theme || "system";
      $("position").value = s.position;
      $("igMethod").value = s.igMethod || "api";
      $("draggable").checked = !!s.draggable;
      $("minDelay").value = s.minDelay;
      $("maxDelay").value = s.maxDelay;
      await refreshInfo();
    };
    const save = async () => {
      const upd = {};
      for (const p of NFB.PLATFORMS) {
        upd["allowScan_" + p.id] = $("allowScan_" + p.id).checked;
        upd["dailyCap_" + p.id] = Math.min(100, Math.max(1, parseInt($("dailyCap_" + p.id).value, 10) || NFB.DEFAULTS["dailyCap_" + p.id]));
      }
      let mn = Math.max(10, parseInt($("minDelay").value, 10) || 20);
      let mx = Math.max(10, parseInt($("maxDelay").value, 10) || 60);
      if (mx < mn) mx = mn;
      upd.theme = $("theme").value;
      upd.position = $("position").value;
      upd.igMethod = $("igMethod").value;
      upd.draggable = $("draggable").checked;
      upd.minDelay = mn;
      upd.maxDelay = mx;
      await chrome.storage.local.set(upd);
      flash("Saved");
    };
    $("nfbset").querySelectorAll("input, select").forEach((i) => i.addEventListener("change", save));
    const FABPOS = NFB.PLATFORMS.map((p) => "fabPos_" + p.id);
    $("position").addEventListener("change", () => chrome.storage.local.remove(FABPOS)); // a preset overrides a dragged spot
    $("resetPos").addEventListener("click", async () => {
      await chrome.storage.local.remove(FABPOS);
      flash("Position reset");
    });
    for (const p of NFB.PLATFORMS) {
      $("clear_" + p.id).addEventListener("click", async () => {
        if (!confirm(`Clear the saved ${p.label} scan? You will need to scan again.`)) return;
        await chrome.storage.local.remove("nfb_scan_" + p.id);
        await chrome.storage.local.set({ ["allowScan_" + p.id]: true });
        await loadAll();
        flash("Cleared. Scanning is allowed again.");
      });
    }
    for (const p of NFB.PLATFORMS) {
      $("clearKeep_" + p.id).addEventListener("click", async () => {
        if (!confirm(`Clear the ${p.label} kept list? Those accounts can show up in scans again.`)) return;
        await chrome.storage.local.remove("nfb_keep_" + p.id);
        await refreshInfo();
        flash("Kept list cleared");
      });
    }
    let infoT;
    chrome.storage.onChanged.addListener((ch) => {
      // only react to settings/scan changes, not to every selection tick
      if (!Object.keys(ch).some((k) => k.startsWith("nfb_scan_") || k.startsWith("allowScan_") || k === "theme")) return;
      clearTimeout(infoT);
      infoT = setTimeout(refreshInfo, 300);
    });
    await loadAll();
  };
})();

(() => {
  const NFB = globalThis.NFB;
  const APP_ID = "936619743392459";
  const getCookie = (n) => (document.cookie.split("; ").find((c) => c.startsWith(n + "=")) || "").split("=")[1];
  const hdrs = () => ({
    "x-ig-app-id": APP_ID,
    "x-csrftoken": getCookie("csrftoken") || "",
    "x-requested-with": "XMLHttpRequest",
  });

  // Values the site's own requests used (collected by hook.js).
  const captured = () => {
    try { return JSON.parse(document.documentElement.getAttribute("data-nfb") || "{}"); } catch { return {}; }
  };

  let rollout;
  const getRollout = () => {
    if (rollout !== undefined) return rollout;
    rollout = "";
    for (const sc of document.scripts) {
      const m = /"rollout_hash":"([^"]+)"/.exec(sc.textContent || "");
      if (m) { rollout = m[1]; break; }
    }
    return rollout;
  };

  let dtsgCache = "";
  const getDtsg = () => {
    const c = captured();
    if (c.fb_dtsg) return c.fb_dtsg;
    if (dtsgCache) return dtsgCache;
    const inp = document.querySelector('input[name="fb_dtsg"]');
    if (inp && inp.value) return (dtsgCache = inp.value);
    for (const sc of document.scripts) {
      const t = sc.textContent || "";
      if (!t.includes("DTSG")) continue;
      const m = /"DTSGInitialData",\[\],\{"token":"([^"]+)"/.exec(t) ||
                /"DTSGInitData",\[\],\{"token":"([^"]+)"/.exec(t) ||
                /"dtsg":\{"token":"([^"]+)"/.exec(t);
      if (m) return (dtsgCache = m[1]);
    }
    return "";
  };
  const jazoestFor = (dtsg) => {
    const c = captured();
    if (c.jazoest) return c.jazoest;
    let sum = 0;
    for (let i = 0; i < dtsg.length; i++) sum += dtsg.charCodeAt(i);
    return "2" + sum;
  };

  const unfollowHeaders = () => {
    const c = captured();
    let claim = c["x-ig-www-claim"];
    if (!claim) { try { claim = sessionStorage.getItem("www-claim-v2"); } catch {} }
    const h = {
      ...hdrs(),
      "content-type": "application/x-www-form-urlencoded",
      "x-ig-www-claim": claim || "0",
      "x-ig-max-touch-points": c["x-ig-max-touch-points"] || "0",
    };
    const ajax = c["x-instagram-ajax"] || getRollout();
    if (ajax) h["x-instagram-ajax"] = ajax;
    if (c["x-asbd-id"]) h["x-asbd-id"] = c["x-asbd-id"];
    if (c["x-web-session-id"]) h["x-web-session-id"] = c["x-web-session-id"];
    if (c["x-ig-app-id"]) h["x-ig-app-id"] = c["x-ig-app-id"];
    return h;
  };

  // max = 0 means "everything"; otherwise stop as soon as `max` accounts are fetched.
  async function fetchList(kind, uid, onProgress, max = 0) {
    const out = [];
    let maxId = "";
    while (true) {
      const count = max ? Math.min(100, max - out.length) : 100;
      const url = `/api/v1/friendships/${uid}/${kind}/?count=${count}` + (maxId ? `&max_id=${maxId}` : "");
      const r = await fetch(url, { headers: hdrs(), credentials: "include" });
      if (!r.ok) throw new Error(`Fetching ${kind} failed (HTTP ${r.status}). Wait a while before retrying.`);
      const j = await r.json();
      out.push(...(j.users || []));
      onProgress(out.length);
      if (!j.next_max_id || (max && out.length >= max)) break;
      maxId = j.next_max_id;
      await NFB.sleep(NFB.rand(1200, 2800));
    }
    return max ? out.slice(0, max) : out;
  }

  const BLOCK_RE = /feedback_required|checkpoint|spam|wait a few minutes|try again later|temporarily|action blocked|we restrict/i;

  async function friendshipApi(kind, u) {
    const dtsg = getDtsg();
    if (!dtsg) {
      const err = new Error("Couldn't find Instagram's page token (fb_dtsg)");
      err.useUI = true;
      throw err;
    }
    const lang = (document.documentElement.lang || "en").split("-")[0] || "en";
    const r = await fetch(`/api/v1/friendships/${kind}/${u.pk}/?hl=${lang}`, {
      method: "POST",
      headers: unfollowHeaders(),
      credentials: "include",
      body: new URLSearchParams({
        container_module: "profile",
        nav_chain: "PolarisProfilePostsTabRoot:profilePage:1:via_cold_start",
        user_id: String(u.pk),
        jazoest: jazoestFor(dtsg),
        fb_dtsg: dtsg,
      }).toString(),
    });
    const text = await r.text();
    if (/^\s*<(!doctype|html)/i.test(text)) {
      const err = new Error("Instagram answered with a web page instead of data (direct API rejected)");
      err.useUI = true;
      throw err;
    }
    let j = null;
    try { j = JSON.parse(text); } catch {}
    if (!r.ok || !j || j.status !== "ok") {
      const msg = (j && (j.message || j.feedback_message)) || text.slice(0, 120).replace(/\s+/g, " ");
      const err = new Error(`HTTP ${r.status}${msg ? " – " + msg : ""}`);
      err.block = r.status === 429 || BLOCK_RE.test(text);                 // blocked / rate-limited: starts a cool-down
      err.fatal = err.block || [401, 403].includes(r.status) || /login_required/i.test(text);
      throw err;
    }
    const fs = j.friendship_status;
    if (kind === "destroy" && fs && fs.following === true) {
      throw new Error("Instagram accepted the request but you still follow this account");
    }
    if (kind === "create" && fs && fs.following === false && !fs.outgoing_request) {
      throw new Error("Instagram accepted the request but you don't follow this account");
    }
    return fs || {};
  }
  const unfollowViaApi = (u) => friendshipApi("destroy", u);

  // ---- Browser-click method: runs on the profile page of the account ----
  const stopCheck = () => {
    if (NFB.shouldStop && NFB.shouldStop()) { const e = new Error("Stopped"); e.stopped = true; throw e; }
  };
  const waitFor = async (fn, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      stopCheck();
      const v = fn();
      if (v) return v;
      await NFB.sleep(300);
    }
    return null;
  };
  // innerText ignores the hidden <title> inside icons (textContent would read "FollowingDown chevron icon").
  const labelOf = (el) => (((el.innerText || el.textContent || "").trim().split("\n")[0]) || "").trim();
  // Button words in common languages (best effort). Anything else can be typed into the settings.
  const LABELS = {
    following: ["Following", "Siguiendo", "Abonné(e)", "Abonné", "Gefolgt", "Seguindo", "Segui già", "Seguito", "Volgend", "Takiptesin", "Mengikuti", "Вы подписаны", "フォロー中", "팔로잉", "फ़ॉलो कर रहे हैं"],
    follow: ["Follow", "Seguir", "S'abonner", "Folgen", "Segui", "Volgen", "Takip Et", "Ikuti", "Подписаться", "フォローする", "팔로우", "फ़ॉलो करें"],
    followBack: ["Follow Back", "Seguir también", "S'abonner en retour", "Zurückfolgen", "Seguir de volta", "Segui anche tu", "Terug volgen", "Sen de Takip Et", "Ikuti Balik", "Подписаться в ответ", "フォローバックする", "맞팔로우하기", "फ़ॉलो बैक करें"],
    requested: ["Requested", "Solicitado", "Demandé", "Angefragt", "Richiesto", "Aangevraagd", "İstek Gönderildi", "Diminta", "Запрос отправлен", "リクエスト済み", "요청됨", "अनुरोध किया गया"],
    unfollow: ["Unfollow", "Dejar de seguir", "Se désabonner", "Nicht mehr folgen", "Deixar de seguir", "Smetti di seguire", "Ontvolgen", "Takibi Bırak", "Berhenti Mengikuti", "Отменить подписку", "フォローをやめる", "팔로우 취소", "अनफ़ॉलो करें"],
  };
  const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const custom = (t) => String(t || "").split(",").map((x) => x.trim()).filter(Boolean);
  const matcher = (list, extra) => new RegExp("^(?:" + [...list, ...extra].map(escRe).join("|") + ")$", "i");
  const labelSet = (s) => {
    const fol = matcher(LABELS.following, custom(s && s.labelFollowing));
    const notFol = matcher([...LABELS.follow, ...LABELS.followBack], []);
    const req = matcher(LABELS.requested, []);
    return { fol, notFol, req, rel: new RegExp(`(?:${fol.source})|(?:${notFol.source})|(?:${req.source})`, "i"), unf: matcher(LABELS.unfollow, custom(s && s.labelUnfollow)) };
  };
  const btnWithText = (root, re) =>
    [...root.querySelectorAll('button, [role="button"]')].find((b) => re.test(labelOf(b)));
  const realClick = (el) => {
    el.scrollIntoView({ block: "center" });
    for (const t of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    }
  };
  const profileHeader = (u) => {
    const hs = [...document.querySelectorAll("header")];
    return hs.find((h) => (h.innerText || "").toLowerCase().includes(u.username.toLowerCase())) || hs[0] || null;
  };
  const findUnfollow = (re) => {
    for (const d of document.querySelectorAll('[role="dialog"], [role="menu"]')) {
      const b = btnWithText(d, re);
      if (b) return b;
    }
    return btnWithText(document, re);
  };
  const BLOCKED = /try again later|action blocked|we restrict certain activity|temporarily blocked/i;

  async function unfollowViaUI(u, s) {
    const L = labelSet(s);
    const head = await waitFor(() => profileHeader(u), 15000);
    if (!head) throw new Error(`The profile page of ${u.username} didn't load`);
    const rel = await waitFor(() => {
      const h = profileHeader(u);
      return h && btnWithText(h, L.rel);
    }, 15000);
    if (!rel) {
      const seen = [...(profileHeader(u) || head).querySelectorAll('button, [role="button"]')].map(labelOf).filter(Boolean).slice(0, 8);
      throw new Error(`Couldn't find the Following button on ${u.username}'s profile. Buttons seen: [${seen.join(" | ")}]. Instagram must be set to English.`);
    }
    const label = labelOf(rel);
    if (L.notFol.test(label)) return;                          // already not following
    if (L.req.test(label)) throw new Error(`${u.username}: a follow request is pending, nothing to unfollow`);

    realClick(rel);
    for (let n = 0; n < 2; n++) {                              // menu item, then (private accounts) a confirm button
      const un = await waitFor(() => findUnfollow(L.unf), n === 0 ? 8000 : 3000);
      if (!un) break;
      realClick(un);
      await NFB.sleep(NFB.rand(900, 1600));
    }
    // success = the "Following" button is gone (works in any language, even with custom labels)
    const done = await waitFor(() => {
      const h = profileHeader(u);
      return h && h.querySelector('button, [role="button"]') && !btnWithText(h, L.fol);
    }, 10000);
    if (!done) {
      const dlg = [...document.querySelectorAll('[role="dialog"]')].map((d) => d.textContent || "").join(" ");
      if (BLOCKED.test(dlg)) {
        const err = new Error("Instagram is blocking this action right now: " + dlg.slice(0, 120));
        err.fatal = true;
        err.block = true;
        throw err;
      }
      throw new Error(`Couldn't confirm that ${u.username} was unfollowed (no Unfollow option appeared, or it didn't take effect)`);
    }
  }

  async function getCounts(uid) {
    try {
      const r = await fetch(`/api/v1/users/${uid}/info/`, { headers: hdrs(), credentials: "include" });
      if (!r.ok) return null;
      const j = await r.json();
      return { followers: j.user.follower_count, following: j.user.following_count, username: j.user.username || "" };
    } catch { return null; }
  }

  async function followsYou(pk) {
    const r = await fetch(`/api/v1/friendships/show/${pk}/`, { headers: hdrs(), credentials: "include" });
    if (!r.ok) throw new Error(`Checking a profile failed (HTTP ${r.status}). Wait a while before retrying.`);
    const j = await r.json();
    return !!j.followed_by;
  }

  const toUser = (u) => ({
    pk: String(u.pk || u.id),
    username: u.username,
    full_name: u.full_name || "",
    pic: u.profile_pic_url || "",
    verified: !!u.is_verified,
  });

  NFB.adapters.instagram = {
    id: "instagram",
    label: "Instagram",
    supportsStart: true,
    followerDiff: true,                       // follower lists are complete, so changes between scans can be logged
    accountId: () => getCookie("ds_user_id") || "default",
    match: () => location.hostname.endsWith("instagram.com"),
    scanConfirm: (o) =>
      o.limit
        ? `Check ${o.limit} accounts you follow, starting at #${o.start + 1}? This makes requests to Instagram.`
        : "Fetch ALL followers and following? This makes many requests to Instagram.",
    canScan: () => true,
    cannotScanMessage: () => "",
    scanLabel: () => "Scan",
    profileUrl: (u) => `https://www.instagram.com/${u.username}/`,

    async scan({ setStatus, opts }) {
      const uid = getCookie("ds_user_id");
      if (!uid) throw new Error("Couldn't find your user id. Are you logged in to Instagram?");
      const limit = opts.limit || 0, start = opts.start || 0;
      const counts = await getCounts(uid);

      const need = limit ? start + limit : 0;
      setStatus("Fetching following…");
      const all = await fetchList("following", uid, (n) => setStatus(`Fetching following… ${n}${need ? " of " + need : ""}`), need);
      const following = limit ? all.slice(start, start + limit) : all;
      if (!following.length) throw new Error("No accounts in that range. Lower the 'from #' number.");

      // A partial following list must still be compared against ALL of your followers (or checked one by one),
      // otherwise people who do follow you would be wrongly listed as non-followers.
      const fewFollowers = counts && counts.followers <= 2000;
      let users = [], followersCount = counts ? counts.followers : undefined, followersArr = null, followersComplete = null;
      if (!limit || fewFollowers) {
        setStatus("Fetching followers…");
        const followers = await fetchList("followers", uid, (n) => setStatus(`Fetching followers… ${n}`));
        followersCount = followers.length;
        followersArr = followers;
        // Compare with Instagram's own follower count so a partly-loaded list is never mistaken for lost followers.
        followersComplete = !counts || Math.abs(followers.length - counts.followers) <= Math.max(2, Math.round(counts.followers * 0.02));
        const fset = new Set(followers.map((u) => String(u.pk || u.id)));
        users = following.filter((u) => !fset.has(String(u.pk || u.id))).map(toUser);
      } else {
        let i = 0;
        for (const u of following) {
          setStatus(`Checking ${++i}/${following.length} individually (you have many followers)…`);
          await NFB.sleep(NFB.rand(1200, 2800));
          if (!(await followsYou(String(u.pk || u.id)))) users.push(toUser(u));
        }
      }

      const range = limit ? ` (#${start + 1}–${start + following.length})` : "";
      return {
        complete: true,
        lists: {
          at: Date.now(),
          followers: followersArr ? followersArr.map(toUser) : null,
          following: all.map(toUser),
          followingComplete: !limit,
          followersComplete,
        },
        scan: {
          at: Date.now(),
          followers: followersCount,
          following: counts ? counts.following : all.length,
          checked: following.length,
          username: counts ? counts.username : "",
          range: limit ? { from: start + 1, to: start + following.length } : null,
          users,
        },
        message: `Checked ${following.length} accounts${range}: ${users.length} don't follow you back. Scan is now locked.`,
      };
    },

    // "api" sends the same request the site does; "ui" opens the profile and clicks Following → Unfollow.
    navigateTo: (u, s) => (s && s.igMethod === "ui" ? `https://www.instagram.com/${u.username}/` : null),
    unfollow: (u, s) => (s && s.igMethod === "ui" ? unfollowViaUI(u, s) : unfollowViaApi(u)),
    follow: (u) => friendshipApi("create", u),   // used by "Re-follow" on the Unfollowed tab
  };
})();

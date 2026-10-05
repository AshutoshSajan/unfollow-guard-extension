# 🛡️ Unfollow Guard — Instagram & Facebook Cleanup

> Find who doesn't follow you back — and unfollow them slowly, in small safe batches.

![version](https://img.shields.io/badge/version-1.4.0-blue)
![manifest](https://img.shields.io/badge/manifest-V3-green)
![platform](https://img.shields.io/badge/platform-Chrome-blue)
![permissions](https://img.shields.io/badge/permissions-storage_%2B_unlimitedStorage-lightgrey)
![license](https://img.shields.io/badge/license-MIT-yellow)

No dashboards, no logins, no servers. Everything runs locally in your browser, on the page you already have open.

> **Facebook support is BETA** — it works, but hasn't been tested much. Expect rough edges (Instagram is the mature path).

---

## ✨ What it does

- **Instagram:** compares your Following vs Followers and lists accounts that don't follow you back.
- **Facebook (BETA):** collects your Followers and Following tabs (by scrolling, like a human would) and lists non-mutuals, Pages included.
- **Safe unfollow:** unfollows in small batches with a random delay (default 20–60s) and a **daily limit** (default 40/day IG, 20/day FB).
- **Keep list:** mark accounts you want to keep — they stay hidden from all future scans.
- **Full picture:** 6 tabs — To unfollow, Kept, Mutuals, Followers, Following, Unfollowed — plus a stats header and a permanent unfollow history (last 5000, with timestamps).
- **Resume-safe:** if a tab reloads mid-batch (browser-click mode), the batch resumes where it left off.
- **Private by design:** only permissions are `storage` + `unlimitedStorage` (to remember settings, scans and history). No tracking, no backend, no analytics.

## 🧩 Features

| Feature | Details |
|---|---|
| 🔍 Partial or full scan | Check first 50 / 100 / 250 / 500 or all, optionally from #N |
| 🧠 Smart IG check | Small accounts: full follower fetch. Large accounts (>2000 followers): individual `followed_by` checks so partial scans stay correct |
| 📚 Full lists saved | Following list is kept separately; Followers list too when fetched. Mutuals / Followers / Following tabs work offline from the last scan |
| ⚠️ Partial-scan honesty | If a scan was limited, the Following/Mutuals tabs say so and suggest Check → all |
| 🖱️ Two IG unfollow methods | Direct API (same request the site sends) → auto-fallback to browser clicks (Following → Unfollow), with real mouse events and username-scoped matching |
| 📜 Facebook on-page mode | Scroll-collect + click Unfollow on your Following tab (English UI) |
| ⭐ Keep / Move back | Never unfollow close friends, family, creators you like — managed in the Kept tab |
| 🕘 Unfollowed history | Every unfollow is recorded with its timestamp (kept across scans, up to 5000) |
| 🎚️ Daily limit + delay | 1–100/day, random min–max seconds between unfollows |
| ⏱️ Live status chips | Countdown to the next unfollow while running; countdown to the midnight limit reset when capped; `used / cap today` always visible |
| 🔒 Scan lock | Scan locks after success (`🔒 Scan locked`) to prevent accidental repeat requests |
| 🔎 Search + bulk select | Search by name, Select first N, Select all visible, Clear |
| 🪟 Draggable button | Floating button with logo, draggable, remembers position per site; global on/off switch in popup and settings |
| 🪪 Custom dialogs | In-page confirmation cards (scan + unfollow with avatar preview) instead of browser `confirm()` popups |
| 📇 Progress card | Per-account avatar, live title, progress bar and Stop — replaces the old run bar |
| 🍞 Toasts | Short confirmations (kept, stopped, limit reached) without losing your place |
| ⚡ Chunked rendering | Big lists render 60 rows at a time with infinite scroll, so 10k+ accounts stay smooth |
| 🛑 Stop that actually stops | Dedicated stop signal + cooperative checks inside waits, so Stop works even mid-delay or mid-click |
| 🌗 Theme | System / Light / Dark, Shadow-DOM isolated so site CSS can't break it |
| 📋 Activity log | Last 80 actions with timestamps, mirrored to console |

## 🚀 Install (Load unpacked)

1. Download / clone this repo:
   ```bash
   git clone https://github.com/AshutoshSajan/unfollow-guard-extension.git
   ```
2. Open `chrome://extensions` in Chrome (or Brave / Edge / Chromium).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select this folder (the one containing `manifest.json`).
5. Pin the extension (puzzle icon → pin **Unfollow Guard**) to reach settings faster.

> To update: `git pull`, then go to `chrome://extensions` → ↻ **Reload** on the extension card.

## 📖 Usage

The floating **Unfollow Guard** button appears on `instagram.com` and `facebook.com`. Drag it anywhere; click it to open the panel (✕ closes it). The same settings live in the toolbar popup — which also has a master **Enable** switch that hides the button on every site.

### Instagram

1. Log in to `https://www.instagram.com` (set language to **English** if you use browser-click mode).
2. Click the floating button → stats header shows Following / Followers / Mutual / To unfollow from the last scan.
3. Choose **Check first 50/100/250/500/all** (+ optional **from #**), click **Scan**, confirm the in-page card. Wait — it fetches with human-like pauses.
4. Work the **To unfollow** tab: tick accounts (or **Select first 30**), use **Keep** (footer) for friends.
5. Browse the other tabs anytime: **Kept**, **Mutuals**, **Followers**, **Following**, **Unfollowed** (history with timestamps).
6. Click **Unfollow** in the footer → review the avatar-stack confirmation → leave the tab open. The progress card shows each account, the countdown, and **Stop**.
7. Scan locks after success (`🔒 Scan locked`). To scan again, re-enable it in ⚙ Settings → Instagram → **Allow scanning**.

### Facebook (BETA)

1. Go to your profile → **Followers** tab (`facebook.com/<you>/followers`).
2. Click the floating button → **Collect followers** (page auto-scrolls, be patient).
3. Go to your **Following** tab (`facebook.com/<you>/following`).
4. Click the floating button → **Collect following**. The diff (non-followers) is computed.
5. Stay on the **Following** tab, select accounts, click **Unfollow**.

### Stopping a batch

Click **Stop** on the progress card. It stops gracefully even mid-delay. Daily progress (`nfb_daily_*`) and the unfollow history are kept, so the limit still applies correctly.

### If the button is missing

Check the master switch: toolbar popup → **Enabled**, or ⚙ Settings → General → **Enable extension**. When off, the floating button is hidden everywhere and any running batch is stopped.

## ⚙️ Settings

| Setting | Default | Notes |
|---|---|---|
| Enable extension | ON | Hides the floating button on every site when off; stops a running batch |
| Allow scanning (per platform) | ON | Auto-locks after a successful scan |
| Daily unfollow limit | IG 40 / FB 20 | 1–100, resets at midnight local time |
| Delay between unfollows | 20–60s | Random in range, min 10s enforced |
| IG unfollow method | Direct API | Falls back to **Browser clicks** automatically if rejected; choose Browser clicks directly if API fails a lot (IG must be in English) |
| Theme | System | Light / Dark / System |
| Button position / dragging | Bottom-right, draggable | Per-site position is remembered |
| Saved scan → Clear | — | Removes scan + saved lists + since-scan progress; kept accounts and history are untouched |

Kept accounts are managed in the panel's **Kept** tab (Keep / Move back), not in settings.

Storage keys used (all in `chrome.storage.local`, nothing leaves your machine): `nfb_scan_*`, `nfb_lists_*`, `nfb_keep_*`, `nfb_sel_*`, `nfb_gone_*`, `nfb_hist_*`, `nfb_run_*`, `nfb_stop_*`, `nfb_daily_*`, `fabPos_*`, plus theme/position/delays/caps/enabled.

## 🛡️ Safety & rate limits

This tool throttles itself (1–3s between reads, 20–60s between unfollows, daily limits), but Instagram/Facebook ultimately decide what counts as spam.

- Start small (e.g. 20–30/day for a few days), unfollow during hours you'd normally browse.
- Never run two unfollow tools at once. Don't scan repeatedly — one scan per need is enough.
- If you see `feedback_required`, `checkpoint`, `action blocked`, or `try again later` — **stop for 24–48h**. The extension treats HTTP 401/403/429 + those phrases as fatal and aborts the batch on purpose.
- Browser-click mode opens each IG profile in turn — leave that tab alone until it finishes.
- Use at your own risk. The authors are not responsible for temporary blocks or account restrictions.

## 🔐 Privacy

- Permissions: **`storage`** (settings, scans, history) + **`unlimitedStorage`** (large follower/following lists and up to 5000 history entries can exceed the normal quota). Still 100% local — no `tabs`, no `cookies`, no remote hosts.
- `hook.js` (MAIN world) **only observes** the site's own API requests to reuse their headers/tokens for the unfollow call — it sends nothing anywhere else.
- No analytics, no external requests, no data collection. Uninstalling / clearing extension storage wipes everything.

## 🗂️ Project structure

```
.
├── manifest.json      # MV3 manifest (storage + unlimitedStorage)
├── hook.js            # MAIN-world observer: captures IG headers/tokens (no exfiltration)
├── shared.js          # Settings, daily-limit, theme, custom dialog, styles + settings form (popup + panel)
├── instagram.js       # IG adapter: scan + unfollowViaApi / unfollowViaUI (real clicks, stop-aware)
├── facebook.js        # FB adapter (BETA): scroll-collect + click-to-unfollow (English UI)
├── content.js         # Shadow-DOM panel: FAB, stats, chips, 6 tabs, footer, progress card, toasts, batch runner, log
├── popup.html / popup.js  # Toolbar popup: enable switch + settings shortcut
├── icons/             # icon16/32/48/128.png + icon.svg source
├── LICENSE            # MIT license
└── .gitignore         # OS / editor / packaging ignores (*.pem, *.crx, *.zip, .env)
```

## ❓ FAQ

**The floating button doesn't appear?**
Check the master switch (popup → Enabled, or Settings → General). Also confirm you're on `instagram.com` / `facebook.com` and the extension is enabled in `chrome://extensions`.

**Scan says `🔒 Scan locked`?**
That's the anti-accident lock after a successful scan. Re-enable it in ⚙ Settings → platform → **Allow scanning**.

**Nothing happens when I click Scan (Facebook)?**
You must be on your profile's **Followers** or **Following** tab first. Collect one list, then open the other tab and collect again — the diff is computed once both exist.

**Profile pictures don't load?**
They lazy-load; failures fall back to an initial-letter avatar. That's normal (hotlink protection).

**Direct API was rejected, what now?**
The batch auto-switches to browser clicks for the rest of the run. For next time, set ⚙ → *Instagram unfollow method* → **Browser clicks** and keep IG in English. If a profile's buttons look different, the error now lists the buttons it actually saw — useful for bug reports.

**What does "limited scan" note mean?**
Your last scan only fetched part of Following, so the Following/Mutuals tabs show just those accounts. Use Check → **all** for complete lists.

**Where did my unfollowed accounts go?**
The **Unfollowed** tab keeps every unfollow with its timestamp (up to 5000). Clearing a scan never deletes history or kept accounts.

**Stop feels slow?**
Stop is cooperative: it finishes the click currently in flight (1–2s), then halts before the next account. It also works across page reloads in browser-click mode.

**How do I wipe everything?**
⚙ Settings → per-platform **Clear** (removes scan + lists + since-scan progress; history and kept stay), or remove the extension to wipe it all.

## 🤝 Contributing

PRs welcome — especially selector fixes for Facebook layout changes and IG fallback improvements.

1. Fork → branch → small focused PR.
2. Don't commit secrets, keys, `.crx`/`.pem`/`.zip` files (see `.gitignore`).
3. Test loaded-unpacked on both sites before submitting.

## ⚖️ Disclaimer

For personal use on your own accounts. Automating actions may violate Instagram's / Facebook's Terms. Use conservatively and at your own risk. Facebook support is explicitly **BETA**.

## 📄 License

MIT — see [LICENSE](LICENSE). Free to fork, modify, and share.

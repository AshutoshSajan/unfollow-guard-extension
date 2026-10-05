# 🛡️ Unfollow Guard — Instagram & Facebook Cleanup

> Find who doesn't follow you back — and unfollow them slowly, in small safe batches.

![version](https://img.shields.io/badge/version-1.3.0-blue)
![manifest](https://img.shields.io/badge/manifest-V3-green)
![platform](https://img.shields.io/badge/platform-Chrome-blue)
![permissions](https://img.shields.io/badge/permissions-storage%20only-lightgrey)
![license](https://img.shields.io/badge/license-MIT-yellow)

No dashboards, no logins, no servers. Everything runs locally in your browser, on the page you already have open.

---

## ✨ What it does

- **Instagram:** compares your Following vs Followers and lists accounts that don't follow you back.
- **Facebook:** collects your Followers and Following tabs (by scrolling, like a human would) and lists non-mutuals, Pages included.
- **Safe unfollow:** unfollows in small batches with a random delay (default 20–60s) and a **daily cap** (default 40/day IG, 20/day FB).
- **Keep list:** mark accounts you want to keep — they stay hidden from all future scans.
- **Resume-safe:** if a tab reloads mid-batch (browser-click mode), the batch resumes where it left off.
- **Private by design:** only permission is `storage` (to remember settings + scan). No tracking, no backend, no analytics.

## 🧩 Features

| Feature | Details |
|---|---|
| 🔍 Partial or full scan | Check first 50 / 100 / 250 / 500 or all, optionally from #N |
| 🧠 Smart IG check | Small accounts: full follower fetch. Large accounts (>2000 followers): individual `followed_by` checks so partial scans stay correct |
| 🖱️ Two IG unfollow methods | Direct API (same request the site sends) → auto-fallback to browser clicks (Following → Unfollow) |
| 📜 Facebook on-page mode | Scroll-collect + click Unfollow on your Following tab (English UI) |
| ⭐ Keep / Move back | Never unfollow close friends, family, creators you like |
| 🎚️ Daily cap + delay | 1–100/day, random min–max seconds between unfollows |
| 🔒 Scan lock | Scan locks after success to prevent accidental repeat requests |
| 🔎 Search + bulk select | Search by name, Select first N, Select all visible, Unselect all |
| 🪟 Draggable button | Floating button, draggable, remembers position per site |
| 🌗 Theme | System / Light / Dark, Shadow-DOM isolated so site CSS can't break it |
| 📋 Activity log | Last 60 actions with timestamps, mirrored to console |

## 🚀 Install (Load unpacked)

1. Download / clone this repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   ```
2. Open `chrome://extensions` in Chrome (or Brave / Edge / Chromium).
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** → select this folder (the one containing `manifest.json`).
5. Pin the extension (puzzle icon → pin **Unfollow Guard**) to reach ⚙ Settings faster.

> To update: `git pull`, then go to `chrome://extensions` → ↻ **Reload** on the extension card.

## 📖 Usage

The blue **Unfollow Guard** button appears on `instagram.com` and `facebook.com`. Drag it anywhere. Click it to open the panel. Same settings live in the toolbar popup under ⚙.

### Instagram

1. Log in to `https://www.instagram.com` (set language to **English** if you use browser-click mode).
2. Click the blue button → choose **Check first 50/100/250/500/all** (+ optional **from #**).
3. Click **Scan** and confirm. Wait — it fetches with human-like pauses.
4. Tick accounts (or **Select first 30**), optionally **Keep selected** for friends.
5. Click **Unfollow selected** → confirm → leave the tab open until the run bar finishes.
6. Scan locks after success. To scan again, re-enable it in ⚙ Settings → Instagram → **Allow scanning**.

### Facebook

1. Go to your profile → **Followers** tab (`facebook.com/<you>/followers`).
2. Click the blue button → **Collect followers** (page auto-scrolls, be patient).
3. Go to your **Following** tab (`facebook.com/<you>/following`).
4. Click the blue button → **Collect following**. The diff (non-followers) is computed.
5. Stay on the **Following** tab, select accounts, click **Unfollow selected**.

### Stopping a batch

Click **Stop** in the panel or in the top-center run bar. The batch stops gracefully. Daily progress (`nfb_daily_*`) is kept so the cap still applies tomorrow correctly.

## ⚙️ Settings

| Setting | Default | Notes |
|---|---|---|
| Allow scanning (per platform) | ON | Auto-locks after a successful scan |
| Daily unfollow cap | IG 40 / FB 20 | 1–100, resets at midnight local time |
| Delay between unfollows | 20–60s | Random in range, min 10s enforced |
| IG unfollow method | Direct API (falls back to browser clicks) | Use **Browser clicks only** if API is rejected a lot |
| Theme | System | Light / Dark / System |
| Button position / dragging | Bottom-right, draggable | Per-site position is remembered |

Storage keys used (all in `chrome.storage.local`, nothing leaves your machine): `nfb_scan_*`, `nfb_keep_*`, `nfb_sel_*`, `nfb_gone_*`, `nfb_daily_*`, `nfb_run_*`, `fabPos_*`, theme/position/delays/caps.

## 🛡️ Safety & rate limits

This tool throttles itself (1–3s between reads, 20–60s between unfollows, daily caps), but Instagram/Facebook ultimately decide what counts as spam.

- Start small (e.g. 20–30/day for a few days), unfollow during hours you'd normally browse.
- Never run two unfollow tools at once. Don't scan repeatedly — one scan per need is enough.
- If you see `feedback_required`, `checkpoint`, `action blocked`, or `try again later` — **stop for 24–48h**. The extension treats HTTP 401/403/429 + those phrases as fatal and aborts the batch on purpose.
- Browser-click mode opens each IG profile in turn — leave that tab alone until it finishes.
- Use at your own risk. The authors are not responsible for temporary blocks or account restrictions.

## 🔐 Privacy

- Permissions: **`storage` only**. No `tabs`, no `cookies`, no host-permission grabs beyond the content scripts on instagram.com / facebook.com.
- `hook.js` (MAIN world) **only observes** the site's own API requests to reuse their headers/tokens for the unfollow call — it sends nothing anywhere else.
- No analytics, no external requests, no data collection. Uninstalling / clearing extension storage wipes everything.

## 🗂️ Project structure

```
.
├── manifest.json      # MV3 manifest (storage permission only)
├── hook.js            # MAIN-world observer: captures IG headers/tokens (no exfiltration)
├── shared.js          # Settings, daily-cap, theme, settings form (popup + panel)
├── instagram.js       # IG adapter: scan + unfollowViaApi / unfollowViaUI
├── facebook.js        # FB adapter: scroll-collect + click-to-unfollow (English UI)
├── content.js         # Shadow-DOM panel: FAB, list, keep, batch runner, log
├── popup.html / popup.js  # Toolbar popup (settings shortcut)
├── icons/             # icon16/32/48/128.png + icon.svg source
├── LICENSE            # MIT license
└── .gitignore         # OS / editor / packaging ignores (*.pem, *.crx, *.zip, .env)
```

## ❓ FAQ

**Nothing happens when I click Scan?**
Check the button label: if it says *Scan (locked)* or *Open Followers/Following tab*, re-enable scanning in ⚙ Settings or navigate to the right tab (Facebook requires the Followers/Following tabs).

**Profile pictures don't load?**
They lazy-load on scroll; failures fall back to an initial-letter avatar. That's normal (hotlink protection).

**Direct API was rejected, what now?**
The batch auto-switches to browser clicks for the rest of the run. For next time, set ⚙ → *Instagram unfollow method* → **Browser clicks only** and keep IG in English.

**Facebook found 0 people?**
Facebook changes layout often — all selectors live in `facebook.js` (English UI assumed). Open an issue with your layout/screenshot and the tab URL pattern.

**How do I wipe everything?**
⚙ Settings → per-platform **Clear** (scan) / **Clear** (kept list), or remove the extension.

## 🤝 Contributing

PRs welcome — especially selector fixes for Facebook layout changes and IG fallback improvements.

1. Fork → branch → small focused PR.
2. Don't commit secrets, keys, `.crx`/`.pem`/`.zip` files (see `.gitignore`).
3. Test loaded-unpacked on both sites before submitting.

## ⚖️ Disclaimer

For personal use on your own accounts. Automating actions may violate Instagram's / Facebook's Terms. Use conservatively and at your own risk.

## 📄 License

MIT — see [LICENSE](LICENSE). Free to fork, modify, and share.

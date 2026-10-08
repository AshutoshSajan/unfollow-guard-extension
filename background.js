// Toolbar badge, desktop notifications and the keyboard shortcut.
const refresh = async () => {
  const o = await chrome.storage.local.get(["enabled", "nfb_status"]);
  const st = o.nfb_status || {};
  let text = "", color = "#6b7280";
  if (o.enabled === false) text = "OFF";
  else if (st.cool) { text = "COOL"; color = "#d97706"; }
  else if (st.running) { text = String(st.used || "•"); color = "#0095f6"; }
  else if (st.used > 0) { text = String(st.used); color = "#16a34a"; }
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
};
chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);
chrome.storage.onChanged.addListener((ch) => { if (ch.enabled || ch.nfb_status) refresh(); });
refresh();

// the page asks for a desktop notification (batch finished / stopped / blocked)
chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "notify") return;
  chrome.storage.local.get("notifyEnabled").then((o) => {
    if (o.notifyEnabled === false) return;
    chrome.notifications.create({ type: "basic", iconUrl: "icons/icon128.png", title: String(msg.title || "Unfollow Guard"), message: String(msg.message || "") });
  });
});

// Alt+Shift+N: show or hide the panel in the active tab
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-panel") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id != null) chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" }).catch(() => {});
});

// Shows an "OFF" badge on the toolbar icon while the extension is disabled, so it is obvious how to turn it back on.
const refreshBadge = async () => {
  const { enabled } = await chrome.storage.local.get("enabled");
  const on = enabled !== false;
  await chrome.action.setBadgeText({ text: on ? "" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: "#6b7280" });
};
chrome.runtime.onInstalled.addListener(refreshBadge);
chrome.runtime.onStartup.addListener(refreshBadge);
chrome.storage.onChanged.addListener((ch) => { if (ch.enabled) refreshBadge(); });
refreshBadge();

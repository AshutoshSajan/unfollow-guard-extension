const st = document.createElement("style");
st.textContent = NFB.themeCSS + NFB.uiCSS + NFB.settingsCSS;
document.head.append(st);
document.getElementById("settings").innerHTML = NFB.settingsHTML;
NFB.watchTheme(document.getElementById("app"));

const top = document.getElementById("enabledTop");
const state = document.getElementById("state");
const showEnabled = (on) => {
  top.checked = on;
  state.textContent = on ? "Enabled · floating button is shown" : "Disabled · floating button is hidden";
};
top.addEventListener("change", () => chrome.storage.local.set({ enabled: top.checked }));
chrome.storage.onChanged.addListener((ch) => { if (ch.enabled) showEnabled(!!ch.enabled.newValue); });
NFB.getSettings().then((s) => showEnabled(!!s.enabled));

NFB.migrate().then(() => NFB.bindSettings(document, document.getElementById("modalhost")));

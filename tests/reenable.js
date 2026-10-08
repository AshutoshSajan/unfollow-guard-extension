const { JSDOM } = require("jsdom"); const fs = require("fs");
const dir = require("path").join(__dirname, "..") + "/";
const dom = new JSDOM("<!doctype html><html lang='en'><body></body></html>", { url: "https://www.instagram.com/x/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window; const store = { igMethodV2: true }; const ls = [];
w.chrome = { storage: { local: {
  get: async (k) => { const o = {}; (Array.isArray(k) ? k : typeof k === "string" ? [k] : Object.keys(k||{})).forEach(x => { if (x in store) o[x] = JSON.parse(JSON.stringify(store[x])); }); return o; },
  set: async (o) => { const ch = {}; for (const k in o) { ch[k] = { oldValue: store[k], newValue: o[k] }; store[k] = JSON.parse(JSON.stringify(o[k])); } ls.forEach(f => f(ch)); },
  remove: async () => {} }, onChanged: { addListener: f => ls.push(f) } } };
w.Element.prototype.scrollIntoView = function () {};
for (const f of ["shared.js", "i18n.js", "instagram.js", "facebook.js", "content.js"]) w.eval(fs.readFileSync(dir + f, "utf8"));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(300);
  const host = w.document.getElementById("nfb-host"), sh = host.shadowRoot;
  const out = { shownInitially: host.style.display === "" };
  // disable from the panel's own settings -> asks first
  const sw = sh.getElementById("enabled"); sw.checked = false; sw.dispatchEvent(new w.Event("change")); await sleep(100);
  out.askedFirst = !!sh.querySelector(".overlay") && sh.querySelector(".modal h3").textContent;
  out.stillShownWhileAsking = host.style.display === "";
  sh.querySelector(".modal .btn.danger").dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(100);
  out.hiddenAfterConfirm = host.style.display === "none";
  // re-enable from the toolbar popup (storage change)
  await w.chrome.storage.local.set({ enabled: true }); await sleep(50);
  out.shownAgain = host.style.display === "";
  // declining keeps it on
  sw.checked = false; sw.dispatchEvent(new w.Event("change")); await sleep(100);
  sh.querySelector(".modal .btn:not(.danger)").dispatchEvent(new w.MouseEvent("click", { bubbles: true })); await sleep(100);
  out.declineKeepsOn = host.style.display === "" && sw.checked === true;
  console.log(JSON.stringify(out)); process.exit(0);
})();

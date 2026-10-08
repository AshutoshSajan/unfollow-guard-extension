const { JSDOM } = require("jsdom"); const fs = require("fs");
const dir = require("path").join(__dirname, "..") + "/";
const html = fs.readFileSync(dir + "popup.html", "utf8").replace('<script src="shared.js"></script>', "<script>" + fs.readFileSync(dir + "shared.js", "utf8") + "</script>").replace('<script src="popup.js"></script>', "<script>" + fs.readFileSync(dir + "popup.js", "utf8") + "</script>");
const store = { igMethodV2: true }; const ls = [];
const errs = [];
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, beforeParse(w) {
  w.chrome = { storage: { local: {
    get: async (k) => { const o = {}; (Array.isArray(k) ? k : typeof k === "string" ? [k] : Object.keys(k || {})).forEach(x => { if (x in store) o[x] = JSON.parse(JSON.stringify(store[x])); }); return o; },
    set: async (o) => { const ch = {}; for (const k in o) { ch[k] = { oldValue: store[k], newValue: o[k] }; store[k] = JSON.parse(JSON.stringify(o[k])); } ls.forEach(f => f(ch)); },
    remove: async () => {} }, onChanged: { addListener: f => ls.push(f) } } };
  w.addEventListener("error", e => errs.push(e.message));
} });
const w = dom.window, d = w.document;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await sleep(300);
  const t = d.getElementById("enabledTop");
  const out = { settingsRendered: !!d.getElementById("theme"), initial: t.checked, state: d.getElementById("state").textContent };
  t.checked = false; t.dispatchEvent(new w.Event("change")); await sleep(450);
  out.afterOff = { stored: store.enabled, text: d.getElementById("state").textContent, settingsSwitch: d.getElementById("enabled").checked };
  t.checked = true; t.dispatchEvent(new w.Event("change")); await sleep(450);
  out.afterOn = { stored: store.enabled, text: d.getElementById("state").textContent, settingsSwitch: d.getElementById("enabled").checked };
  console.log(JSON.stringify({ out, errs }, null, 1)); process.exit(0);
})();

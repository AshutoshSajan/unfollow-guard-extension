// Proves the documented adapter interface: a tiny fake site runs through the real panel (scan → select → unfollow).
const { JSDOM } = require("jsdom"); const fs = require("fs");
const dir = require("path").join(__dirname, "..") + "/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const R = {}; const ok = (n, c, x) => (R[n] = c ? "PASS" : "FAIL " + (x || ""));
const store = { igMethodV2: true, nfb_onboarded: true, minDelay: 10, maxDelay: 10, allowScan_example: true, dailyCap_example: 10 }; const ls = [];
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://www.example.test/home", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window;
w.chrome = { storage: { local: {
  get: async (k) => { const o = {}; (Array.isArray(k) ? k : typeof k === "string" ? [k] : Object.keys(k || {})).forEach((x) => { if (x in store) o[x] = JSON.parse(JSON.stringify(store[x])); }); return o; },
  set: async (o) => { const ch = {}; for (const k in o) { ch[k] = { oldValue: store[k], newValue: o[k] }; store[k] = JSON.parse(JSON.stringify(o[k])); } ls.forEach((f) => f(ch)); },
  remove: async (ks) => { (Array.isArray(ks) ? ks : [ks]).forEach((k) => delete store[k]); } }, onChanged: { addListener: (f) => ls.push(f) } } };
w.Element.prototype.scrollIntoView = function () {};
// register the site exactly as docs/ADDING-A-SITE.md describes (step 2)
let shared = fs.readFileSync(dir + "shared.js", "utf8");
shared = shared.replace('{ id: "facebook", label: "Facebook", beta: true },', '{ id: "facebook", label: "Facebook", beta: true },\n    { id: "example", label: "Example" },')
  .replace("allowScan_facebook: true,", "allowScan_facebook: true,\n    allowScan_example: true,\n    dailyCap_example: 10,");
w.eval(shared); w.eval(fs.readFileSync(dir + "i18n.js", "utf8"));
// the template, with the three TODO functions filled in by a fake site
let tpl = fs.readFileSync(dir + "adapters/_template.js", "utf8")
  .replace("const following = [];   // TODO: fetch the accounts you follow  -> user objects", "const following = [1, 2, 3].map((n) => ({ pk: 'e' + n, username: 'ex' + n, full_name: '', pic: '', verified: false }));")
  .replace("const followers = [];   // TODO: fetch your followers           -> user objects", "const followers = [{ pk: 'e1', username: 'ex1', full_name: '', pic: '', verified: false }];")
  .replace('throw new Error("unfollow() is not implemented for this site yet");', "globalThis.__unfollowed = (globalThis.__unfollowed || []).concat(u.pk);");
w.eval(tpl); w.eval(fs.readFileSync(dir + "content.js", "utf8"));
(async () => {
  await sleep(400);
  const sh = w.document.getElementById("nfb-host").shadowRoot, click = (el) => el.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  ok("X1 panel starts for the new site", !!sh && sh.querySelector(".sub").textContent.includes("Example"));
  click(sh.getElementById("scan")); await sleep(120); click(sh.querySelector(".modal .btn.primary")); await sleep(300);
  ok("X2 scan result appears (2 non-followers)", sh.querySelectorAll("#list .row").length === 2 && store.nfb_scan_example_default.users.length === 2);
  sh.querySelector("#list input[type=checkbox]").click(); await sleep(260);
  click(sh.getElementById("del")); await sleep(120); click(sh.querySelector(".modal .btn.danger")); await sleep(900);
  ok("X3 unfollow() called through the shared batch loop", JSON.stringify(w.__unfollowed) === '["e2"]', JSON.stringify(w.__unfollowed));
  ok("X4 history + per-site daily counter", store.nfb_hist_example_default.length === 1 && store.nfb_daily_example_default.count === 1);
  console.log(JSON.stringify(R, null, 1)); process.exit(Object.values(R).every((v) => v === "PASS") ? 0 : 1);
})();

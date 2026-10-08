const { JSDOM } = require("jsdom"); const fs = require("fs");
const dir = require("path").join(__dirname, "..") + "/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {}; const ok = (n, c, x) => (R[n] = c ? "PASS" : "FAIL " + (x || ""));

function page(lang, words, { confirmStep = false, followingLabel } = {}) {
  const dom = new JSDOM(`<!doctype html><html lang="${lang}"><body></body></html>`, { url: "https://www.instagram.com/user1/", runScripts: "outside-only", pretendToBeVisual: true });
  const w = dom.window;
  // jsdom has no innerText: emulate it (skips the hidden <title> inside icons, like a browser)
  Object.defineProperty(w.HTMLElement.prototype, "innerText", { get() { const walk = (n) => n.nodeType === 3 ? n.textContent : n.nodeName.toLowerCase() === "title" ? "" : [...n.childNodes].map(walk).join(n.nodeName === "DIV" ? "\n" : ""); return walk(this).trim(); } });
  w.Element.prototype.scrollIntoView = function () {};
  w.chrome = { storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} }, onChanged: { addListener() {} } } };
  const d = w.document;
  d.body.innerHTML = `<header><h2>user1</h2><button id="rel"><div>${followingLabel || words.following}</div><svg><title>Down chevron icon</title></svg></button><button>${words.message}</button></header>`;
  const rel = d.getElementById("rel");
  rel.addEventListener("click", () => {
    if (rel.dataset.state === "followed") return;
    const dlg = d.createElement("div"); dlg.setAttribute("role", "dialog");
    dlg.innerHTML = `<button>${words.close}</button><div role="button">${words.mute}</div><div role="button" id="unf">${words.unfollow}</div>`;
    d.body.append(dlg);
    dlg.querySelector("#unf").addEventListener("click", () => {
      if (confirmStep && !dlg.dataset.confirm) {
        dlg.dataset.confirm = "1"; dlg.innerHTML = `<div>Unfollow @user1?</div><button id="unf2">${words.unfollow}</button>`;
        dlg.querySelector("#unf2").addEventListener("click", () => { dlg.remove(); rel.firstChild.textContent = words.follow; });
      } else { dlg.remove(); rel.firstChild.textContent = words.follow; }
    });
  });
  for (const f of ["shared.js", "instagram.js"]) w.eval(fs.readFileSync(dir + f, "utf8"));
  return { w, A: w.NFB.adapters.instagram };
}
const langs = {
  en: { following: "Following", follow: "Follow", unfollow: "Unfollow", message: "Message", close: "Cancel", mute: "Mute" },
  es: { following: "Siguiendo", follow: "Seguir", unfollow: "Dejar de seguir", message: "Enviar mensaje", close: "Cancelar", mute: "Silenciar" },
  fr: { following: "Abonné(e)", follow: "S'abonner", unfollow: "Se désabonner", message: "Message", close: "Annuler", mute: "Mettre en sourdine" },
  de: { following: "Gefolgt", follow: "Folgen", unfollow: "Nicht mehr folgen", message: "Nachricht", close: "Abbrechen", mute: "Stummschalten" },
  pt: { following: "Seguindo", follow: "Seguir", unfollow: "Deixar de seguir", message: "Mensagem", close: "Cancelar", mute: "Silenciar" },
};
(async () => {
  for (const [lang, words] of Object.entries(langs)) {
    const p = page(lang, words);
    try { await p.A.unfollow({ pk: "1", username: "user1" }, { igMethod: "ui" }); ok("UI " + lang, p.w.document.getElementById("rel").firstChild.textContent === words.follow); }
    catch (e) { ok("UI " + lang, false, e.message); }
  }
  // private account (needs a second confirm click)
  { const p = page("en", langs.en, { confirmStep: true });
    try { await p.A.unfollow({ pk: "1", username: "user1" }, { igMethod: "ui" }); ok("UI private confirm step", p.w.document.getElementById("rel").firstChild.textContent === "Follow"); } catch (e) { ok("UI private confirm step", false, e.message); } }
  // already not following -> nothing to do
  { const p = page("es", langs.es, { followingLabel: "Seguir" });
    try { await p.A.unfollow({ pk: "1", username: "user1" }, { igMethod: "ui" }); ok("UI already unfollowed is a no-op", !p.w.document.querySelector("[role=dialog]")); } catch (e) { ok("UI already unfollowed is a no-op", false, e.message); } }
  // unknown language: error lists the buttons; custom label fixes it
  const th = { following: "กำลังติดตาม", follow: "ติดตาม", unfollow: "เลิกติดตาม", message: "ข้อความ", close: "ยกเลิก", mute: "ปิดเสียง" };
  { const p = page("th", th);
    try { await p.A.unfollow({ pk: "1", username: "user1" }, { igMethod: "ui" }); ok("UI unknown language errors", false, "no error"); }
    catch (e) { ok("UI unknown language errors with buttons listed", /Buttons seen: \[กำลังติดตาม/.test(e.message), e.message); } }
  { const p = page("th", th);
    try { await p.A.unfollow({ pk: "1", username: "user1" }, { igMethod: "ui", labelFollowing: "กำลังติดตาม", labelUnfollow: "เลิกติดตาม" }); ok("UI custom labels work", p.w.document.getElementById("rel").firstChild.textContent === th.follow); }
    catch (e) { ok("UI custom labels work", false, e.message); } }
  console.log(JSON.stringify(R, null, 1)); process.exit(0);
})();

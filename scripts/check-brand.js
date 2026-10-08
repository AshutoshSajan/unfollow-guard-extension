#!/usr/bin/env node
// Brand guard: fails if the old capitalized product name reappears in
// user-visible files (the pre-rebrand name: "Non" + "-" + "Followers"). Run via
// `npm run check-brand`; enforced in CI on every push and pull request.
//
// Allowed:
// - lowercase "non-followers" = the concept (accounts not following back)
// - legacy `NFB` / `nfb_*` code identifiers (storage compat, see shared.js)
// - the lines explicitly allowlisted below.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EXT = new Set([".js", ".html", ".json", ".md", ".svg", ".py"]);
const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".github"]);
const SKIP_FILES = new Set(["package-lock.json", "check-brand.js"]);
const ALLOW = [
  // shared.js documents the legacy identifiers on purpose (regex assembled
  // from parts so this file itself stays clean)
  { file: "shared.js", match: new RegExp('legacy "Non' + '-Followers" identifiers') },
];
const BAD = /\bNon[ -]Followers?\b/;

let bad = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full);
      continue;
    }
    if (!EXT.has(path.extname(e.name)) || SKIP_FILES.has(e.name)) continue;
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    fs.readFileSync(full, "utf8").split("\n").forEach((ln, i) => {
      if (!BAD.test(ln)) return;
      if (ALLOW.some((a) => rel === a.file && a.match.test(ln))) return;
      console.log(`${rel}:${i + 1}: ${ln.trim().slice(0, 140)}`);
      bad++;
    });
  }
};
walk(ROOT);

if (bad) {
  console.log(
    `\ncheck-brand: ${bad} old-brand hit(s). Use "Unfollow Guard" for the product, ` +
      `lowercase "non-followers" for the concept.`
  );
  process.exit(1);
}
console.log("check-brand: OK");

#!/usr/bin/env python3
"""Builds installable packages into dist/:

  dist/chromium/  + non-followers-chromium.zip   (Chrome, Brave, Edge, Opera: load the folder unpacked)
  dist/firefox/   + non-followers-firefox.zip    (EXPERIMENTAL, untested: Firefox 128+)

Usage:  python3 scripts/build.py
No dependencies. The Firefox package only differs in its manifest (background script + add-on id).
"""
import json
import pathlib
import shutil
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
FILES = ["manifest.json", "background.js", "hook.js", "shared.js", "instagram.js", "facebook.js",
         "content.js", "popup.html", "popup.js", "LICENSE"]
DIRS = ["icons"]


def copy_tree(target: pathlib.Path) -> None:
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    for f in FILES:
        shutil.copy2(ROOT / f, target / f)
    for d in DIRS:
        shutil.copytree(ROOT / d, target / d)


def zip_dir(src: pathlib.Path, out: pathlib.Path) -> None:
    if out.exists():
        out.unlink()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(src.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(src).as_posix())


def main() -> None:
    DIST.mkdir(exist_ok=True)

    chromium = DIST / "chromium"
    copy_tree(chromium)
    zip_dir(chromium, DIST / "non-followers-chromium.zip")

    firefox = DIST / "firefox"
    copy_tree(firefox)
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    manifest["background"] = {"scripts": ["background.js"]}          # Firefox has no MV3 service workers
    manifest["browser_specific_settings"] = {"gecko": {"id": "non-followers@mystic-monk.local", "strict_min_version": "128.0"}}
    (firefox / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    zip_dir(firefox, DIST / "non-followers-firefox.zip")

    print("Built:")
    for f in sorted(DIST.glob("*.zip")):
        print(f"  {f.relative_to(ROOT)}  ({f.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()

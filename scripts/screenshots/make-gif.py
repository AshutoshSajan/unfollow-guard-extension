#!/usr/bin/env python3
"""Builds docs/demo.gif from the frames written by shoot.js (needs: pip install pillow)."""
import glob, os, tempfile
from PIL import Image

root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
files = sorted(glob.glob(os.path.join(tempfile.gettempdir(), "nfb-frames", "f*.png")))
frames = []
for f in files:
    im = Image.open(f).convert("RGB")
    w = 900
    frames.append(im.resize((w, int(im.height * w / im.width)), Image.LANCZOS))
durations = ([1100, 1300, 1500, 1200, 1700, 1500, 1700, 1500, 1900, 1900, 1900, 2600] + [1500] * len(frames))[: len(frames)]
pal = frames[min(5, len(frames) - 1)].quantize(colors=128, method=Image.Quantize.MEDIANCUT)
q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
out = os.path.join(root, "docs", "demo.gif")
q[0].save(out, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=2)
print(f"{len(frames)} frames -> {out} ({os.path.getsize(out) // 1024} KB)")

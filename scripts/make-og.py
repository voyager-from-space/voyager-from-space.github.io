# builds public/og-image.png (1200x630) in the amber dsn-telemetry style.
# reads persona from public/site.config.json. needs pillow + the VT323 / IBM Plex Mono ttfs.
# usage: python3 scripts/make-og.py [path/to/VT323-Regular.ttf] [path/to/IBMPlexMono-Regular.ttf]
import json, math, random, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
cfg = json.loads((root / "public/site.config.json").read_text())
name = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]", "", cfg["name"]).strip()
VT = sys.argv[1] if len(sys.argv) > 1 else "/usr/share/fonts/truetype/sand-box/google/VT323/VT323-Regular.ttf"
PX = sys.argv[2] if len(sys.argv) > 2 else "/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Regular.ttf"

BG, GRID, AMB, AMBD, AMBX, HOT = (10, 9, 6), (22, 18, 10), (255, 176, 60), (140, 92, 30), (70, 48, 18), (255, 212, 138)
W, H = 1200, 630
im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
for x in range(0, W, 48): d.line([(x, 0), (x, H)], fill=GRID)
for y in range(0, H, 48): d.line([(0, y), (W, y)], fill=GRID)

fs, fm, fbig = ImageFont.truetype(PX, 20), ImageFont.truetype(PX, 27), ImageFont.truetype(VT, 176)
d.text((60, 44), "DSS-43 // 70M DISH     DOWNLINK 8.4 GHZ     LOCK: YES", font=fs, fill=AMBD)

# carrier trace, top right
random.seed(7); pts = []
for i in range(260):
    x = 880 + i; env = math.exp(-((i - 130) / 70) ** 2)
    pts.append((x, 56 + math.sin(i / 7) * 13 * env + random.uniform(-1.2, 1.2)))
d.line(pts, fill=AMB, width=2)

# probe sprite (avatar), pixel-perfect upscale
av = Image.open(root / "public/avatar.png").convert("RGB").resize((300, 300), Image.NEAREST)
im.paste(av, (60, 150)); d.rectangle([59, 149, 360, 450], outline=AMBX)

x0 = 410
d.text((x0 - 6, 118), name, font=fbig, fill=HOT)
rows = [("payload", "web / games / dev tools / ai / hw"), ("cadence", "one tiny product a day"), ("telemetry", "posted raw. receipts only.")]
y = 318
for k, v in rows:
    d.text((x0, y), f"{k:<10}", font=fm, fill=AMBD)
    d.text((x0 + d.textlength(f"{k:<10} ", font=fm), y), v, font=fm, fill=AMB); y += 46

d.text((60, 520), "> rx ok. mission log open.", font=fs, fill=AMBD)
handle = cfg["handle"]; tw = d.textlength(handle, font=fm)
d.text((W - 60 - tw, 512), handle, font=fm, fill=AMB)
d.line([(60, 566), (W - 60, 566)], fill=AMBX)

im.save(root / "public/og-image.png", optimize=True)
print("wrote public/og-image.png", im.size)

# builds public/og-image.png (1200x630), favicon-32.png and apple-touch-icon.png in the site style.
# needs pillow and the IBM Plex Sans (variable) + IBM Plex Mono ttfs.
# usage: python3 scripts/make-og.py [IBMPlexSans-VariableFont.ttf] [IBMPlexMono-Regular.ttf]
import json, math, random, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parent.parent
cfg = json.loads((root / "public/site.config.json").read_text())
name = re.sub(r"[\U0001F000-\U0001FAFF\u2600-\u27BF\uFE0F]", "", cfg["name"]).strip()
G = "/usr/share/fonts/truetype/sand-box/google/"
SANS = sys.argv[1] if len(sys.argv) > 1 else G + "IBM Plex Sans/IBMPlexSans-VariableFont_wdth,wght.ttf"
MONO = sys.argv[2] if len(sys.argv) > 2 else G + "IBM Plex Mono/IBMPlexMono-Regular.ttf"
BG, INK, MUTED, AMBER, ICE, GROOVE, DISC = (7, 11, 22), (232, 237, 246), (155, 167, 191), (255, 181, 71), (159, 211, 238), (42, 58, 92), (13, 21, 38)
S = 2  # draw at 2x, downsample for clean edges

def sans(size, wght):
    f = ImageFont.truetype(SANS, size * S)
    f.set_variation_by_axes([wght, 100])  # axis order in this file: weight, width
    return f

def record(d, cx, cy, r, grooves=True):
    k = r / 150
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=DISC)
    if grooves:
        for gr in range(148, 60, -10):
            g = gr * k; d.ellipse([cx - g, cy - g, cx + g, cy + g], outline=GROOVE, width=max(1, round(k * 1.2)))
        a = 142 * k; d.arc([cx - a, cy - a, cx + a, cy + a], 270, 330, fill=(90, 130, 160), width=max(2, round(2 * k)))
    l = 52 * k; d.ellipse([cx - l, cy - l, cx + l, cy + l], fill=AMBER)
    h = 5 * k; d.ellipse([cx - h, cy - h, cx + h, cy + h], fill=BG)

def orbit(d, cx, cy, rx, ry, rot, steps=180, front=None):
    pts = []
    for i in range(steps + 1):
        t = 2 * math.pi * i / steps
        x, y = rx * math.cos(t), ry * math.sin(t)
        c, s = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        pts.append((t, cx + x * c - y * s, cy + x * s + y * c))
    return pts

# ---- og card
W, H = 1200 * S, 630 * S
im = Image.new("RGB", (W, H), BG); d = ImageDraw.Draw(im)
random.seed(16)
for _ in range(220):
    x, y, b = random.randrange(W), random.randrange(H), random.random()
    rad = S * (0.6 if b < .8 else 1.2); col = tuple(int(BG[i] + (INK[i] - BG[i]) * (0.25 + 0.5 * b)) for i in range(3))
    d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col)
cx, cy, r = 905 * S, 315 * S, 205 * S
# back half of orbit, record, front half
pts = orbit(d, cx, cy, 300 * S, 92 * S, -18)
for i in range(0, len(pts) - 1, 2):
    t, x0, y0 = pts[i]; _, x1, y1 = pts[i + 1]
    if math.sin(t) < 0: d.line([(x0, y0), (x1, y1)], fill=(60, 84, 108), width=S * 2)
record(d, cx, cy, r)
for i in range(0, len(pts) - 1, 2):
    t, x0, y0 = pts[i]; _, x1, y1 = pts[i + 1]
    if math.sin(t) >= 0: d.line([(x0, y0), (x1, y1)], fill=(80, 112, 140), width=S * 2)
_, px, py = pts[0]; d.ellipse([px - 7 * S, py - 7 * S, px + 7 * S, py + 7 * S], fill=ICE)

x0 = 80 * S
fm = ImageFont.truetype(MONO, 22 * S)
d.text((x0, 92 * S), "ANON BUILDER  ·  MISSION LOG", font=fm, fill=AMBER)
fh = sans(68, 600)
for i, line in enumerate(["useful little tools,", "shipped often and", "in public."]):
    d.text((x0 - 3 * S, 150 * S + i * 80 * S), line, font=fh, fill=INK)
fb = sans(28, 400)
d.text((x0, 420 * S), "web apps · games · dev tools · ai · hardware", font=fb, fill=MUTED)
d.text((x0, 470 * S), "open code. raw numbers.", font=fb, fill=MUTED)
d.text((x0, 548 * S), f"{name}  ·  {cfg['handle']}", font=ImageFont.truetype(MONO, 24 * S), fill=ICE)
im.resize((1200, 630), Image.LANCZOS).save(root / "public/og-image.png", optimize=True)

# ---- icons: the record label on navy
for size, out in [(32, "favicon-32.png"), (180, "apple-touch-icon.png")]:
    big = Image.new("RGB", (size * 8, size * 8), BG); dd = ImageDraw.Draw(big)
    c = size * 4; record(dd, c, c, size * 3.6, grooves=size > 64)
    big.resize((size, size), Image.LANCZOS).save(root / "public" / out, optimize=True)
print("wrote og-image.png, favicon-32.png, apple-touch-icon.png")

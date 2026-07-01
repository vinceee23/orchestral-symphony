# Generate the 4 required Steam capsule images from the orb logo + wordmark.
# Same navy+gold house style as gen-og-card.py, but layout adapts per aspect ratio
# and the "SONANCE" wordmark auto-fits so it never clips.
# Run: python art/gen-capsules.py  -> drafts/steam/*.png   (drafts/ is gitignored)
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import os

NAVY = (10, 10, 15)
GOLD = (224, 168, 63)
MUTED = (170, 150, 110)
CREAM = (235, 225, 205)
FDIR = "C:/Windows/Fonts/"

def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

TITLE_FONTS = [FDIR+"Georgiab.ttf", FDIR+"georgiab.ttf", FDIR+"segoeuib.ttf", FDIR+"arialbd.ttf"]
BODY_FONTS  = [FDIR+"georgia.ttf", FDIR+"segoeui.ttf", FDIR+"arial.ttf"]

try:
    ORB = Image.open("public/sonance-orb.png").convert("RGBA")
except Exception as e:
    ORB = None
    print("WARN orb missing (capsules will have no orb):", e)

def fit_text(d, text, fonts, maxw, hi, lo=10):
    """Largest size (<=hi) at which `text` fits within maxw."""
    sz = hi
    while sz > lo:
        f = font(fonts, sz)
        if d.textlength(text, font=f) <= maxw:
            return f, sz
        sz -= 1
    return font(fonts, lo), lo

def fit_title(d, maxw, hi, lo=14):
    return fit_text(d, "SONANCE", TITLE_FONTS, maxw, hi, lo)

def glow_at(img, cx, cy, r, strength=0.30):
    """Soft gold radial glow centered on (cx,cy), added over the navy."""
    W, H = img.size
    g = Image.new("L", (W, H), 0)
    ImageDraw.Draw(g).ellipse([cx-r, cy-r, cx+r, cy+r], fill=255)
    g = g.filter(ImageFilter.GaussianBlur(max(1, int(r*0.9))))
    return ImageChops.add(img, Image.merge("RGB", [g.point(lambda v, c=c: int(v*c/255*strength)) for c in GOLD]))

def paste_orb(img, box):
    if not ORB:
        return img
    x, y, s = box
    o = ORB.resize((s, s))
    img.paste(o, (x, y), o)
    return img

def build(name, w, h, mode):
    img = Image.new("RGB", (w, h), NAVY)
    d = ImageDraw.Draw(img)

    if mode in ("h", "hc"):  # horizontal: orb left, wordmark right
        orb_s = int(h * (0.72 if mode == "h" else 0.66))
        margin = max(8, int(h * 0.12))
        ox, oy = margin, (h - orb_s) // 2
        img = glow_at(img, ox + orb_s // 2, oy + orb_s // 2, int(orb_s * 0.8))
        img = paste_orb(img, (ox, oy, orb_s))
        d = ImageDraw.Draw(img)
        tx = ox + orb_s + max(10, int(w * 0.03))
        maxw = w - tx - margin
        tf, sz = fit_title(d, maxw, int(h * 0.5))
        if mode == "h" and h >= 170:  # room for a tagline
            block = sz + int(h * 0.14)
            ty = (h - block) // 2
            d.text((tx, ty), "SONANCE", font=tf, fill=GOLD)
            tag, _ = fit_text(d, "A music idle game", BODY_FONTS, maxw, max(12, int(h * 0.11)))
            d.text((tx + 2, ty + sz + int(h * 0.04)), "A music idle game", font=tag, fill=CREAM)
        else:  # tiny capsule — wordmark only, vertically centered
            bb = d.textbbox((0, 0), "SONANCE", font=tf)
            d.text((tx, (h - (bb[3] - bb[1])) // 2 - bb[1]), "SONANCE", font=tf, fill=GOLD)

    else:  # "v" vertical: orb on top, wordmark + tagline centered below
        orb_s = int(w * 0.5)
        ox, oy = (w - orb_s) // 2, int(h * 0.12)
        img = glow_at(img, w // 2, oy + orb_s // 2, int(orb_s * 0.85))
        img = paste_orb(img, (ox, oy, orb_s))
        d = ImageDraw.Draw(img)
        tf, sz = fit_title(d, w - int(w * 0.12), int(w * 0.22))
        tw = d.textlength("SONANCE", font=tf)
        ty = oy + orb_s + int(h * 0.06)
        d.text(((w - tw) // 2, ty), "SONANCE", font=tf, fill=GOLD)
        tag, _ = fit_text(d, "A music idle game", BODY_FONTS, w - int(w * 0.12), max(14, int(w * 0.055)))
        tgw = d.textlength("A music idle game", font=tag)
        d.text(((w - tgw) // 2, ty + sz + int(h * 0.03)), "A music idle game", font=tag, fill=CREAM)

    os.makedirs("drafts/steam", exist_ok=True)
    out = f"drafts/steam/{name}.png"
    img.save(out)
    print("OK ->", out, img.size)

CAPSULES = [
    ("capsule_header_460x215", 460, 215, "h"),
    ("capsule_small_231x87", 231, 87, "hc"),
    ("capsule_main_616x353", 616, 353, "h"),
    ("capsule_vertical_374x448", 374, 448, "v"),
]
for name, w, h, mode in CAPSULES:
    build(name, w, h, mode)

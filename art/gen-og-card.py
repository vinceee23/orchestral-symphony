# Build the 1200x630 social share card (og:image) from the orb logo + wordmark.
# Run: python art/gen-og-card.py  -> public/og-image.png
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
import math, os

W, H = 1200, 630
NAVY = (10, 10, 15)
GOLD = (224, 168, 63)
MUTED = (170, 150, 110)

img = Image.new("RGB", (W, H), NAVY)

# soft off-center gold glow behind the orb
glow = Image.new("L", (W, H), 0)
ImageDraw.Draw(glow).ellipse([120, 115, 520, 515], fill=255)
glow = glow.filter(ImageFilter.GaussianBlur(140))
img = ImageChops.add(img, Image.merge("RGB", [glow.point(lambda v, c=c: int(v * c / 255 * 0.28)) for c in GOLD]))

# orb, left-center
try:
    orb = Image.open("public/sonance-orb.png").convert("RGBA")
    s = 340
    orb = orb.resize((s, s))
    img.paste(orb, (120, (H - s) // 2), orb)
except Exception as e:
    print("orb skip:", e)

# fonts (Windows) with fallbacks
def font(paths, size):
    for p in paths:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

FDIR = "C:/Windows/Fonts/"
tag_f = font([FDIR+"georgia.ttf", FDIR+"segoeui.ttf", FDIR+"arial.ttf"], 40)
sub_f = font([FDIR+"georgia.ttf", FDIR+"segoeui.ttf", FDIR+"arial.ttf"], 28)

d = ImageDraw.Draw(img)
tx = 512
maxw = W - tx - 48
# auto-fit the title so it never clips
tf_paths = [FDIR+"Georgiab.ttf", FDIR+"georgiab.ttf", FDIR+"segoeuib.ttf", FDIR+"arialbd.ttf"]
sz = 130
while sz > 60:
    title_f = font(tf_paths, sz)
    if d.textlength("SONANCE", font=title_f) <= maxw:
        break
    sz -= 4
d.text((tx, 232), "SONANCE", font=title_f, fill=GOLD)
d.text((tx + 4, 378), "A music idle game", font=tag_f, fill=(235, 225, 205))
d.text((tx + 4, 436), "Reach into the silence — something reaches back.", font=sub_f, fill=MUTED)

os.makedirs("public", exist_ok=True)
img.save("public/og-image.png")
print("OK -> public/og-image.png", img.size)

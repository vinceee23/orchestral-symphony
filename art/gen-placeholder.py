# "In progress" achievement placeholder: the emblem aura (concentric ring glow on near-black navy)
# with an EMPTY center — reads as an unfinished emblem, on-brand with the real set.
# Run: python art/gen-placeholder.py  -> drafts/placeholder-aura.png
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os
S = 1024
CX = CY = S // 2
BG = (9, 12, 20)          # near-black navy, matches the emblem backgrounds
GOLD = (224, 168, 63)     # warm emblem gold
os.makedirs("drafts", exist_ok=True)

img = Image.new("RGB", (S, S), BG)

def ring(radius, stroke, blur, bright):
    L = Image.new("L", (S, S), 0)
    ImageDraw.Draw(L).ellipse([CX - radius, CY - radius, CX + radius, CY + radius], outline=255, width=stroke)
    L = L.filter(ImageFilter.GaussianBlur(blur))
    return Image.merge("RGB", [L.point(lambda v, c=c: int(v * c / 255 * bright)) for c in GOLD])

# soft central bloom so the empty middle still glows faintly (not a dead hole)
bloom = Image.new("L", (S, S), 0)
ImageDraw.Draw(bloom).ellipse([CX - 150, CY - 150, CX + 150, CY + 150], fill=255)
bloom = bloom.filter(ImageFilter.GaussianBlur(120))
img = ImageChops.add(img, Image.merge("RGB", [bloom.point(lambda v, c=c: int(v * c / 255 * 0.22)) for c in GOLD]))

# three concentric glow rings: inner brightest -> outer faintest
for radius, stroke, blur, bright in [(185, 10, 12, 0.85), (300, 8, 18, 0.5), (415, 7, 26, 0.3)]:
    img = ImageChops.add(img, ring(radius, stroke, blur, bright))

img.save("drafts/placeholder-aura.png")
print("OK -> drafts/placeholder-aura.png")

# FILLED graduated radial glow (NOT rings): bright solid core -> fainter -> faintest, fading to black.
# Identical on every emblem. Run: python art/gen-aura-bloom.py
from PIL import Image, ImageDraw, ImageFilter
import math, os
S = 1024
CX = CY = S // 2
GOLD = (255, 200, 95)
os.makedirs("drafts", exist_ok=True)

def tint(L, bright):
    return Image.merge("RGB", [L.point(lambda v, c=c: int(v * c / 255 * bright)) for c in GOLD])

# smooth: continuous radial gradient, brightest center, falloff to edge
def smooth(R, power, name):
    L = Image.new("L", (S, S), 0)
    px = L.load()
    for y in range(S):
        dy = y - CY
        for x in range(S):
            d = math.hypot(x - CX, dy)
            t = max(0.0, 1.0 - d / R)
            px[x, y] = int(255 * (t ** power))
    tint(L, 1.0).save(f"drafts/{name}.png")
    print("OK ->", name)

# 3-step: three filled discs (inner brightest -> faintest), blurred so they blend but read as 3 levels
def step3(name, discs, blur):
    L = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(L)
    for (r, val) in discs:               # draw largest/faintest first, smallest/brightest last
        d.ellipse([CX - r, CY - r, CX + r, CY + r], fill=val)
    L = L.filter(ImageFilter.GaussianBlur(blur))
    tint(L, 1.0).save(f"drafts/{name}.png")
    print("OK ->", name)

smooth(470, 1.7, "aura-bloom-smooth")
step3("aura-bloom-3step", [(430, 70), (290, 150), (150, 255)], 60)

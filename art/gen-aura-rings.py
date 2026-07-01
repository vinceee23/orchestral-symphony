# Code-generated 3-ring graduated glow aura (gold on black). Byte-identical for every emblem.
# inner ring brightest -> middle fainter -> outer faintest. Run: python art/gen-aura-rings.py
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import os

S = 1024
CX = CY = S // 2
GOLD = (255, 200, 95)
os.makedirs("drafts", exist_ok=True)

def ring(layer_size, radius, stroke, blur, bright):
    L = Image.new("L", (layer_size, layer_size), 0)
    d = ImageDraw.Draw(L)
    d.ellipse([CX - radius, CY - radius, CX + radius, CY + radius], outline=255, width=stroke)
    L = L.filter(ImageFilter.GaussianBlur(blur))
    # tint grayscale glow -> gold * brightness
    return Image.merge("RGB", [L.point(lambda v, c=c: int(v * c / 255 * bright)) for c in GOLD])

def build(rings, name):
    acc = Image.new("RGB", (S, S), "black")
    for (radius, stroke, blur, bright) in rings:
        acc = ImageChops.add(acc, ring(S, radius, stroke, blur, bright))
    acc.save(f"drafts/{name}.png")
    print("OK ->", f"drafts/{name}.png")

# FRAMING rings (sit in the margin around a ~58%-scaled subject). fat bright inner, fainter outers.
# v5: framing, medium punch
build([(335, 40, 16, 0.95), (405, 16, 18, 0.55), (468, 10, 24, 0.33)], "aura-rings-v5")
# v6: framing, brighter/bolder
build([(335, 46, 14, 1.0), (405, 18, 16, 0.70), (468, 11, 22, 0.44)], "aura-rings-v6")

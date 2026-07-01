# Replicate the LOVED local glow: soft warm concentric bloom on near-black navy, object centered.
# Aura is code-generated (identical on every emblem). Subject is keyed (flood-fill bg) so its inked
# outlines survive and the glow shows through gaps. Run: python art/gen-aura-glow.py
from PIL import Image, ImageDraw
import math, os
S = 1024
CX = CY = S // 2
BG = (7, 10, 17)            # near-black navy (sampled)
PEAK = (60, 45, 20)         # additive warm-tan glow peak (sampled glow ~ BG+PEAK)
R, POWER = 500, 1.5
os.makedirs("drafts", exist_ok=True)

# --- build aura: smooth warm radial bloom over navy ---
aura = Image.new("RGB", (S, S))
ap = aura.load()
for y in range(S):
    dy = y - CY
    for x in range(S):
        t = max(0.0, 1.0 - math.hypot(x - CX, dy) / R) ** POWER
        ap[x, y] = (min(255, int(BG[0] + PEAK[0] * t)),
                    min(255, int(BG[1] + PEAK[1] * t)),
                    min(255, int(BG[2] + PEAK[2] * t)))
aura.save("drafts/aura-glow.png")

# --- key the subject: scale, center on black, flood-fill bg -> transparent (keep inked lines) ---
def keyed(path, scale=0.62, thresh=42):
    sub = Image.open(path).convert("RGB")
    sm = sub.resize((int(S * scale),) * 2)
    canvas = Image.new("RGB", (S, S), (0, 0, 0))
    off = (S - sm.width) // 2
    canvas.paste(sm, (off, off))
    MARK = (255, 0, 255)
    for seed in [(2, 2), (S - 3, 2), (2, S - 3), (S - 3, S - 3)]:
        ImageDraw.floodfill(canvas, seed, MARK, thresh=thresh)
    rgba = canvas.convert("RGBA")
    px = rgba.load()
    for y in range(S):
        for x in range(S):
            if px[x, y][:3] == MARK:
                px[x, y] = (0, 0, 0, 0)
    return rgba

def compose(subject_png, out_png, scale=0.62):
    base = aura.convert("RGBA")
    base.alpha_composite(keyed(subject_png, scale))
    base.convert("RGB").save(out_png)
    print("OK ->", out_png)

if __name__ == "__main__":
    compose("drafts/subj-piano.png", "drafts/letitbe-glow.png")

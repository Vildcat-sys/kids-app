import os
from PIL import Image, ImageDraw

ROOT = r"D:\Wordbuddy-Demo\kids-app"
BRAND = os.path.join(ROOT, "src", "images", "brand")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")

WARM = (255, 194, 71)  # #FFC247

chosen = Image.open(os.path.join(BRAND, "chosen_src.png")).convert("RGB")
alt = Image.open(os.path.join(BRAND, "alt_src.png")).convert("RGB")
W, H = chosen.size

# 1) flood-fill the 4 white corners with warm so no dead white
for seed in [(0,0),(W-1,0),(0,H-1),(W-1,H-1)]:
    ImageDraw.floodfill(chosen, seed, WARM, thresh=30)
fullbleed = chosen

# 2) keep 1024 source deliverables
fullbleed.resize((1024,1024), Image.LANCZOS).save(os.path.join(BRAND,"logo-1024.png"))
alt.resize((1024,1024), Image.LANCZOS).save(os.path.join(BRAND,"logo-alt-1024.png"))

def round_mask(img):
    s = img.size[0]
    m = Image.new("L",(s,s),0)
    ImageDraw.Draw(m).ellipse((0,0,s,s), fill=255)
    out = Image.new("RGB",(s,s),WARM)
    out.paste(img,(0,0),m)
    return out

def save(img, path, size):
    img.resize((size,size), Image.LANCZOS).save(path)
    print("  ->", os.path.relpath(path,ROOT), size)

def fg_canvas(target):
    # adaptive foreground: warm canvas, fullbleed scaled to 66% safe zone centered
    c = Image.new("RGB",(target,target),WARM)
    inner = int(target*0.66)
    fb = fullbleed.resize((inner,inner), Image.LANCZOS)
    off = (target-inner)//2
    c.paste(fb,(off,off))
    return c

launcher = {"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
fg = {"mdpi":108,"hdpi":162,"xhdpi":216,"xxhdpi":324,"xxxhdpi":432}

for d,px in launcher.items():
    p = os.path.join(RES,f"mipmap-{d}"); os.makedirs(p,exist_ok=True)
    save(fullbleed, os.path.join(p,"ic_launcher.png"), px)
    save(round_mask(fullbleed), os.path.join(p,"ic_launcher_round.png"), px)
for d,px in fg.items():
    p = os.path.join(RES,f"mipmap-{d}"); os.makedirs(p,exist_ok=True)
    save(fg_canvas(px), os.path.join(p,"ic_launcher_foreground.png"), px)

www = os.path.join(ROOT,"www"); os.makedirs(www,exist_ok=True)
save(fullbleed, os.path.join(www,"icon-192.png"),192)
save(fullbleed, os.path.join(www,"icon-512.png"),512)
save(fg_canvas(512), os.path.join(www,"icon-maskable-512.png"),512)
print("DONE")

import os
from PIL import Image, ImageDraw
ROOT = r"D:\Wordbuddy-Demo\kids-app"
BRAND = os.path.join(ROOT, "src", "images", "brand")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
WARM = (255, 244, 224)
fullbleed = Image.open(r"D:\workspace\reference\v5-style\qiqi-handdrawn.png").convert("RGB")
fullbleed.resize((1024,1024), Image.LANCZOS).save(os.path.join(BRAND,"logo-1024.png"))
def round_mask(img):
    s=img.size[0]; m=Image.new("L",(s,s),0); ImageDraw.Draw(m).ellipse((0,0,s,s),fill=255)
    out=Image.new("RGB",(s,s),WARM); out.paste(img,(0,0),m); return out
def save(img,p,sz):
    img.resize((sz,sz),Image.LANCZOS).save(p); print("  ->",os.path.relpath(p,ROOT),sz)
def fg_canvas(t):
    c=Image.new("RGB",(t,t),WARM); inner=int(t*0.72); fb=fullbleed.resize((inner,inner),Image.LANCZOS); off=(t-inner)//2; c.paste(fb,(off,off)); return c
launcher={"mdpi":48,"hdpi":72,"xhdpi":96,"xxhdpi":144,"xxxhdpi":192}
fg={"mdpi":108,"hdpi":162,"xhdpi":216,"xxhdpi":324,"xxxhdpi":432}
for d,px in launcher.items():
    p=os.path.join(RES,f"mipmap-{d}"); os.makedirs(p,exist_ok=True)
    save(fullbleed,os.path.join(p,"ic_launcher.png"),px); save(round_mask(fullbleed),os.path.join(p,"ic_launcher_round.png"),px)
for d,px in fg.items():
    p=os.path.join(RES,f"mipmap-{d}"); os.makedirs(p,exist_ok=True)
    save(fg_canvas(px),os.path.join(p,"ic_launcher_foreground.png"),px)
save(fullbleed,os.path.join(ROOT,"icon-192.png"),192); save(fullbleed,os.path.join(ROOT,"icon-512.png"),512); save(fg_canvas(512),os.path.join(ROOT,"icon-maskable-512.png"),512)
print("DONE")

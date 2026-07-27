import random
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

_F = "/Users/pedroipince/Documents/CLAUDE/FIFTH CIRCLE/Circle of Fifth Git/fonts"
pdfmetrics.registerFont(TTFont("Anton",     f"{_F}/Anton-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter",     f"{_F}/Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("InterBold", f"{_F}/Inter-Bold.ttf"))

CREAM  = HexColor("#F2E8D5")
ORANGE = HexColor("#E8620A")
BLUE   = HexColor("#7BA7BC")
BG     = HexColor("#0a0908")
DIM    = HexColor("#666660")

# Photo: 6240×4160 landscape — ratio 1.5 : 1
PHOTO    = "/Users/pedroipince/Pictures/ME/PRESS KIT PEDRO IPINCE DJ/85-DSCF0433.jpg"
PHOTO_NA = "/Users/pedroipince/Pictures/ME/PRESS KIT PEDRO IPINCE DJ/5.jpg"

OUTPUT   = "/Users/pedroipince/Documents/CLAUDE/FIFTH CIRCLE/Circle of Fifth Git/pedro_ipince_press_kit.pdf"

LINK_BIO    = "https://drive.google.com/drive/folders/1hFGsF2W6zMYgo7sfh7NPOIjWnIcoZ7Qx?usp=drive_link"
LINK_VIDEOS = "https://drive.google.com/drive/folders/1uZKsU3QsWPlPz6XHQ5zmrzCs9PWKXYhv?usp=drive_link"
LINK_PHOTOS = "https://drive.google.com/drive/folders/1fODuCaQXMjOanBglcRYTZJcV3-deMw2d?usp=drive_link"

W, H = A4   # 595 × 842 pt

# ── Photo geometry ────────────────────────────────────────
# Scale landscape photo (6240×4160, ratio 1.5) to FILL full A4 height.
# This makes it 1263 pt wide → clip 334 pt from each side.
PHOTO_RATIO  = 6240 / 4160   # 1.5
PHOTO_DISP_H = H              # fill full page height = 842
PHOTO_DISP_W = H * PHOTO_RATIO  # 1263 pt
PHOTO_X      = -(PHOTO_DISP_W - W) / 2  # -334 → center crop
PHOTO_Y      = 0

# ─────────────────────────────────────────────────────────
def grain(c, seed=0, a=0.028):
    rng = random.Random(seed)
    c.setFillColor(Color(1, 1, 1, alpha=a))
    for _ in range(280):
        c.circle(rng.uniform(0, W), rng.uniform(0, H),
                 rng.uniform(0.3, 0.8), fill=1, stroke=0)

def wrap(c, text, x, y, max_w, font, size, lead, col):
    c.setFont(font, size)
    c.setFillColor(col)
    words = text.split()
    line = ""
    for w_ in words:
        t = (line + " " + w_).strip()
        if c.stringWidth(t, font, size) <= max_w:
            line = t
        else:
            c.drawString(x, y, line)
            y -= lead
            line = w_
    if line:
        c.drawString(x, y, line)
        y -= lead
    return y

def ilink(c, text, url, x, y, font="Inter", size=9.5, col=None):
    col = col or CREAM
    c.setFont(font, size)
    c.setFillColor(col)
    c.drawString(x, y, text)
    tw = c.stringWidth(text, font, size)
    c.setStrokeColor(col)
    c.setLineWidth(0.4)
    c.line(x, y - 2, x + tw, y - 2)
    c.linkURL(url, (x, y - 3, x + tw, y + 10), relative=0)
    return x + tw

# ══════════════════════════════════════════════════════════
# PAGE 1  ·  EDITORIAL COVER
# ══════════════════════════════════════════════════════════
c = canvas.Canvas(OUTPUT, pagesize=A4)
c.setTitle("Pedro Ipince — Press Kit 2026")

# ── Dark base ─────────────────────────────────────────────
c.setFillColor(BG)
c.rect(0, 0, W, H, fill=1, stroke=0)

# ── Photo — full bleed (clip to page bounds) ──────────────
c.saveState()
p = c.beginPath()
p.rect(0, 0, W, H)
c.clipPath(p, stroke=0, fill=0)
c.drawImage(PHOTO, PHOTO_X, PHOTO_Y,
            width=PHOTO_DISP_W, height=PHOTO_DISP_H,
            preserveAspectRatio=False)
c.restoreState()

# Dark gradient over bottom 52% of page (for text readability)
STEPS  = 40
fade_h = H * 0.52
for i in range(STEPS):
    t     = i / (STEPS - 1)
    alpha = 0.92 * (1 - t) ** 1.4
    yy    = (fade_h / STEPS) * i
    c.setFillColor(Color(0.04, 0.035, 0.03, alpha=alpha))
    c.rect(0, yy, W, fade_h / STEPS + 1, fill=1, stroke=0)

grain(c, seed=3, a=0.016)

# ── PRESS KIT label — top right ───────────────────────────
c.setFont("Inter", 7)
c.setFillColor(Color(0.95, 0.91, 0.83, alpha=0.50))
c.drawRightString(W - 24, H - 18, "PRESS KIT  2026")

# ── NAME — bottom of page over gradient ───────────────────
c.setFont("Anton", 86)
c.setFillColor(CREAM)
c.drawString(30, 196, "PEDRO")
c.drawString(30, 108, "IPINCE")

# Orange rule
c.setStrokeColor(ORANGE)
c.setLineWidth(3)
c.line(30, 94, W * 0.55, 94)

# Role + location
c.setFont("Inter", 10)
c.setFillColor(Color(0.95, 0.91, 0.83, alpha=0.75))
c.drawString(32, 72, "DJ  /  Producer  /  Curator  ·  Bali")

# Nu Amor — bottom right
c.setFont("Inter", 8)
na = "Co-Founder, Nu Amor"
nw = c.stringWidth(na, "Inter", 8)
c.setFillColor(Color(0.91, 0.38, 0.04, alpha=0.85))
c.drawString(W - 32 - nw, 52, na)
c.linkURL("https://nuamor.co",
          (W - 34 - nw, 48, W - 28, 60), relative=0)

# Social — very bottom
c.setFont("Inter", 7)
c.setFillColor(Color(0.95, 0.91, 0.83, alpha=0.35))
c.drawString(32, 26, "@pedroipince  ·  soundcloud.com/pedroipince")

c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 2  ·  BIO + LINKS  (+optional Nu Amor photo strip)
# ══════════════════════════════════════════════════════════
c.setFillColor(BG)
c.rect(0, 0, W, H, fill=1, stroke=0)
grain(c, seed=77)

# Ghost "PI" background
c.setFont("Anton", 480)
c.setFillColor(Color(1, 1, 1, alpha=0.017))
c.drawString(-38, -44, "PI")

# Optional Nu Amor photo strip at bottom
NA_STRIP_H = 0
if PHOTO_NA:
    NA_STRIP_H = 130
    c.drawImage(PHOTO_NA, 0, 0,
                width=W, height=NA_STRIP_H,
                preserveAspectRatio=False)
    # gradient over strip top
    for i in range(20):
        t = i / 19
        c.setFillColor(Color(0.04, 0.035, 0.03, alpha=0.7 * (1 - t)))
        c.rect(0, NA_STRIP_H - (NA_STRIP_H * 0.4) * (i / 19),
               W, NA_STRIP_H / 20 + 1, fill=1, stroke=0)

# ── Header ────────────────────────────────────────────────
c.setFont("InterBold", 8)
c.setFillColor(ORANGE)
c.drawString(40, H - 36, "PEDRO IPINCE")
c.setFont("Inter", 8)
c.setFillColor(DIM)
sep_x = 40 + c.stringWidth("PEDRO IPINCE", "InterBold", 8) + 12
c.drawString(sep_x, H - 36, "—  Press Kit 2026")

c.setStrokeColor(ORANGE)
c.setLineWidth(1.2)
c.line(40, H - 46, W - 40, H - 46)

# ── Bio ───────────────────────────────────────────────────
bio = (
    "Hailing from the Canary Islands, Pedro Ipince is a producer, DJ, and "
    "curator with a profound connection to music. Co-founder of Nu Amor — "
    "a music and conceptual event brand built on the love of rhythm, movement, "
    "and deep listening — Pedro brings that same philosophy to every set he "
    "plays. Blending timeless classic house with nu-disco, he crafts emotional "
    "journeys that keep the crowd moving. Having played across different "
    "countries, every set is a rollercoaster of sound, soul, and movement."
)
y = wrap(c, bio, 40, H - 76, W - 80,
         "Inter", 11.5, 21, Color(0.87, 0.83, 0.76))

# Info line
c.setFont("Inter", 9)
c.setFillColor(DIM)
c.drawString(40, y - 18, "House  ·  Disco  ·  Canary Islands  ·  Bali")

# ── Divider ───────────────────────────────────────────────
c.setStrokeColor(HexColor("#1e1e1c"))
c.setLineWidth(0.6)
c.line(40, y - 40, W - 40, y - 40)

# ── Links ─────────────────────────────────────────────────
c.setFont("InterBold", 7)
c.setFillColor(DIM)
c.drawString(40, y - 60, "LINKS")

ly = y - 80
for label, url in [
    ("Videos",      LINK_VIDEOS),
    ("Photos",      LINK_PHOTOS),
    ("Bio",         LINK_BIO),
    ("Instagram",   "https://www.instagram.com/pedroipince/"),
    ("SoundCloud",  "https://soundcloud.com/pedroipince"),
]:
    c.setFont("Inter", 9.5)
    c.setFillColor(DIM)
    arrow = f"{label}  →  "
    c.drawString(40, ly, arrow)
    ax = 40 + c.stringWidth(arrow, "Inter", 9.5)
    ilink(c, url.replace("https://", "").replace("www.", ""), url, ax, ly)
    ly -= 24

# ── Bottom rule ───────────────────────────────────────────
foot_y = NA_STRIP_H + (12 if PHOTO_NA else 10)
c.setStrokeColor(HexColor("#1e1e1c"))
c.setLineWidth(0.5)
c.line(40, foot_y + 14, W - 40, foot_y + 14)
c.setFont("Inter", 7)
c.setFillColor(DIM)
c.drawString(40, foot_y, "© Pedro Ipince 2026  ·  For press and promotional use only")

c.showPage()
c.save()
print(f"Done → {OUTPUT}")

import math, random
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ── Fonts ─────────────────────────────────────────────────
pdfmetrics.registerFont(TTFont("Anton",      "/tmp/Anton-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Inter",      "/tmp/Inter-Regular.ttf"))
pdfmetrics.registerFont(TTFont("InterBold",  "/tmp/Inter-Bold.ttf"))

# ── Palette (Nu Amor exact) ────────────────────────────────
SAND    = HexColor("#F2E8D5")   # Nu Amor body background
INK     = HexColor("#111111")   # body text
ORANGE  = HexColor("#E8620A")   # accent
BLUE    = HexColor("#7BA7BC")   # secondary accent
DIM     = HexColor("#888888")   # muted text
LINE    = HexColor("#D9CEBF")   # subtle divider on cream

OUTPUT  = "/Users/pedroipince/Documents/CLAUDE/FIFTH CIRCLE/Circle of Fifth Git/pedro_ipince_press_kit.pdf"

LINK_BIO    = "https://drive.google.com/drive/folders/1hFGsF2W6zMYgo7sfh7NPOIjWnIcoZ7Qx?usp=drive_link"
LINK_VIDEOS = "https://drive.google.com/drive/folders/1uZKsU3QsWPlPz6XHQ5zmrzCs9PWKXYhv?usp=drive_link"
LINK_PHOTOS = "https://drive.google.com/drive/folders/1fODuCaQXMjOanBglcRYTZJcV3-deMw2d?usp=drive_link"

W, H = A4

# ─────────────────────────────────────────────────────────
# ARTISTIC HELPERS
# ─────────────────────────────────────────────────────────

def draw_grain(c, seed=0):
    """Scattered grain dots — analog print texture."""
    rng = random.Random(seed)
    c.setFillColor(Color(0.06, 0.04, 0.02, alpha=0.07))
    for _ in range(340):
        x = rng.uniform(0, W)
        y = rng.uniform(0, H)
        r = rng.uniform(0.4, 1.1)
        c.circle(x, y, r, fill=1, stroke=0)

def draw_arc_ring(c, cx, cy, r, start_deg, end_deg, width, color, alpha):
    """Draw a partial circle ring (stroke only) for gestural effect."""
    c.setStrokeColor(Color(color.red, color.green, color.blue, alpha=alpha))
    c.setLineWidth(width)
    c.arc(cx - r, cy - r, cx + r, cy + r, startAng=start_deg, extent=end_deg - start_deg)

def draw_brushstroke(c, x1, y1, x2, y2, max_w, color, alpha):
    """Simulate an organic brush stroke along a line using layered bezier curves."""
    c.setStrokeColor(Color(color.red, color.green, color.blue, alpha=alpha))
    steps = 12
    for i in range(steps):
        t = i / (steps - 1)
        # Width tapers at ends, thickest in middle
        local_w = max_w * math.sin(math.pi * t) * 0.9 + max_w * 0.1
        # Slight organic vertical jitter
        jitter = (0.5 - abs(t - 0.5)) * 3
        mx = x1 + (x2 - x1) * t
        my = y1 + (y2 - y1) * t + jitter * (1 if i % 2 == 0 else -1)
        c.setLineWidth(local_w)
        if i < steps - 1:
            nt = (i + 1) / (steps - 1)
            nx = x1 + (x2 - x1) * nt
            ny = y1 + (y2 - y1) * nt
            c.line(mx, my, nx, ny)

def draw_ghost_text(c, text, font, size, x, y, color, alpha):
    c.setFont(font, size)
    c.setFillColor(Color(color.red, color.green, color.blue, alpha=alpha))
    c.drawString(x, y, text)

def fill_bg(c):
    c.setFillColor(SAND)
    c.rect(0, 0, W, H, fill=1, stroke=0)

def draw_footer(c):
    c.setStrokeColor(LINE)
    c.setLineWidth(0.5)
    c.line(40, 38, W - 40, 38)
    c.setFont("Inter", 7.5)
    # Instagram
    ig = "instagram.com/pedroipince"
    c.setFillColor(ORANGE)
    c.drawString(40, 24, ig)
    c.linkURL("https://www.instagram.com/pedroipince/",
              (38, 20, 38 + c.stringWidth(ig, "Inter", 7.5), 32), relative=0)
    # dot
    dot_x = 40 + c.stringWidth(ig, "Inter", 7.5) + 7
    c.setFillColor(DIM)
    c.drawString(dot_x, 24, "·")
    # SoundCloud
    sc_x = dot_x + 11
    sc = "soundcloud.com/pedroipince"
    c.setFillColor(ORANGE)
    c.drawString(sc_x, 24, sc)
    c.linkURL("https://soundcloud.com/pedroipince",
              (sc_x - 2, 20, sc_x + c.stringWidth(sc, "Inter", 7.5), 32), relative=0)
    # Nu Amor right
    na = "Co-Founder, Nu Amor"
    c.setFillColor(DIM)
    nw = c.stringWidth(na, "Inter", 7.5)
    c.drawString(W - 40 - nw, 24, na)
    c.linkURL("https://nuamor.co", (W - 42 - nw, 20, W - 38, 32), relative=0)

def section_label(c, text, x, y):
    c.setFont("InterBold", 7)
    c.setFillColor(ORANGE)
    c.drawString(x, y, text.upper())
    tw = c.stringWidth(text.upper(), "InterBold", 7)
    c.setStrokeColor(ORANGE)
    c.setLineWidth(0.8)
    c.line(x, y - 5, x + tw + 12, y - 5)

def wrap_text(c, text, x, y, max_w, font, size, leading, color):
    c.setFont(font, size)
    c.setFillColor(color)
    words = text.split()
    line = ""
    for word in words:
        test = (line + " " + word).strip()
        if c.stringWidth(test, font, size) <= max_w:
            line = test
        else:
            c.drawString(x, y, line)
            y -= leading
            line = word
    if line:
        c.drawString(x, y, line)
        y -= leading
    return y

def pill_button(c, label, url, x, y, w=None):
    font, size = "InterBold", 8.5
    tw = c.stringWidth(label, font, size)
    bw = w or tw + 28
    bh = 20
    c.setFillColor(ORANGE)
    c.roundRect(x, y, bw, bh, 4, fill=1, stroke=0)
    c.setFillColor(SAND)
    c.setFont(font, size)
    c.drawString(x + (bw - tw) / 2, y + 6, label)
    c.linkURL(url, (x, y, x + bw, y + bh), relative=0)
    return bw

# ─────────────────────────────────────────────────────────
# BUILD
# ─────────────────────────────────────────────────────────
c = canvas.Canvas(OUTPUT, pagesize=A4)
c.setTitle("Pedro Ipince — Press Kit 2026")
c.setAuthor("Pedro Ipince")


# ══════════════════════════════════════════════════════════
# PAGE 1  ·  COVER / BIO
# ══════════════════════════════════════════════════════════
fill_bg(c)
draw_grain(c, seed=42)

# ── Artistic background: large faint ghost monogram ───────
draw_ghost_text(c, "PI", "Anton", 420, -38, H * 0.25, SAND, alpha=0.0)  # invisible, just structure
# Large tinted "PI" faint impression
c.setFont("Anton", 380)
c.setFillColor(Color(0.87, 0.80, 0.70, alpha=0.18))
c.drawString(W * 0.30, H * 0.14, "PI")

# ── Artistic arcs (trazadas) ──────────────────────────────
# Big outer ring top-right — gestural circle
draw_arc_ring(c, cx=W + 30, cy=H + 10, r=260, start_deg=190, end_deg=310,
              width=1.8, color=ORANGE, alpha=0.22)

# Medium inner arc — adds depth
draw_arc_ring(c, cx=W + 30, cy=H + 10, r=200, start_deg=200, end_deg=300,
              width=0.9, color=ORANGE, alpha=0.12)

# Bottom-left quarter arc — anchors the page
draw_arc_ring(c, cx=-20, cy=-20, r=180, start_deg=10, end_deg=88,
              width=1.4, color=INK, alpha=0.10)

# Brushstroke divider under name (drawn after text so it overlaps slightly)
# Will draw after name block for layering

# ── Top strip ─────────────────────────────────────────────
c.setFillColor(INK)
c.rect(0, H - 32, W, 32, fill=1, stroke=0)
c.setFont("Inter", 7.5)
c.setFillColor(SAND)
c.drawString(40, H - 20, "PRESS KIT  2026")
c.setFillColor(Color(0.95, 0.91, 0.83, alpha=0.5))
genre = "HOUSE  ·  DISCO"
gw = c.stringWidth(genre, "Inter", 7.5)
c.drawString(W - 40 - gw, H - 20, genre)

# ── Name block ────────────────────────────────────────────
c.setFont("Anton", 90)
c.setFillColor(INK)
c.drawString(38, H - 110, "PEDRO")
c.drawString(38, H - 198, "IPINCE")

# Brushstroke accent under name
draw_brushstroke(c, 38, H - 216, 340, H - 216, max_w=5, color=ORANGE, alpha=0.85)

# Role + location
c.setFont("Inter", 10.5)
c.setFillColor(INK)
c.drawString(40, H - 238, "DJ  /  Producer  /  Curator  ·  Bali")

# Nu Amor chip
na_label = "Co-Founder, Nu Amor"
chip_x, chip_y = 40, H - 261
na_tw = c.stringWidth(na_label, "Inter", 8)
c.setFillColor(Color(0.91, 0.38, 0.04, alpha=0.12))
c.roundRect(chip_x - 5, chip_y - 3, na_tw + 16, 16, 3, fill=1, stroke=0)
c.setStrokeColor(Color(0.91, 0.38, 0.04, alpha=0.4))
c.setLineWidth(0.6)
c.roundRect(chip_x - 5, chip_y - 3, na_tw + 16, 16, 3, fill=0, stroke=1)
c.setFont("Inter", 8)
c.setFillColor(ORANGE)
c.drawString(chip_x + 3, chip_y + 2, na_label)
c.linkURL("https://nuamor.co", (chip_x - 5, chip_y - 3, chip_x + na_tw + 11, chip_y + 13), relative=0)

# ── Thin rule ─────────────────────────────────────────────
c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.line(40, H - 278, W - 40, H - 278)

# ── Bio ───────────────────────────────────────────────────
section_label(c, "Biography", 40, H - 298)

bio = (
    "Hailing from the Canary Islands, Pedro Ipince is a producer, DJ, and "
    "curator with a profound connection to music. Co-founder of Nu Amor — "
    "a music and conceptual event brand built on the love of rhythm, movement, "
    "and deep listening — Pedro brings that same philosophy to every set he plays. "
    "Known for his ability to craft emotional and non-stop rhythmic journeys, "
    "he seamlessly blends timeless classic house with nu-disco, creating an "
    "infectious energy that keeps the crowd moving. Having played across different "
    "countries, he has refined his ability to transmit pure groove, ensuring that "
    "every set is a rollercoaster of sound, soul, and movement."
)

y_end = wrap_text(c, bio, 40, H - 322, W - 80, "Inter", 10, 17, INK)

# ── Info row ──────────────────────────────────────────────
c.setStrokeColor(LINE)
c.setLineWidth(0.5)
c.line(40, y_end - 14, W - 40, y_end - 14)

info_y = y_end - 36
for label, val, cx in [
    ("GENRES", "House / Disco", 40),
    ("BASED",  "Bali, Indonesia", 195),
    ("ORIGIN", "Canary Islands, Spain", 360),
]:
    c.setFont("InterBold", 7)
    c.setFillColor(ORANGE)
    c.drawString(cx, info_y, label)
    c.setFont("Inter", 9.5)
    c.setFillColor(INK)
    c.drawString(cx, info_y - 15, val)

# ── Bio download ──────────────────────────────────────────
c.setStrokeColor(LINE)
c.setLineWidth(0.5)
c.line(40, info_y - 38, W - 40, info_y - 38)

section_label(c, "Download", 40, info_y - 56)
pill_button(c, "Full Bio (Drive) →", LINK_BIO, 40, info_y - 82, w=180)

# Social links block right side
c.setFont("InterBold", 7)
c.setFillColor(ORANGE)
c.drawString(260, info_y - 56, "SOCIAL")
for i, (label, url) in enumerate([
    ("instagram.com/pedroipince", "https://www.instagram.com/pedroipince/"),
    ("soundcloud.com/pedroipince", "https://soundcloud.com/pedroipince"),
]):
    c.setFont("Inter", 9)
    c.setFillColor(INK)
    ly = info_y - 72 - i * 17
    c.drawString(260, ly, label)
    tw = c.stringWidth(label, "Inter", 9)
    c.linkURL(url, (258, ly - 3, 258 + tw, ly + 10), relative=0)
    # underline link
    c.setStrokeColor(ORANGE)
    c.setLineWidth(0.5)
    c.line(260, ly - 2, 260 + tw, ly - 2)

draw_footer(c)
c.showPage()


# ══════════════════════════════════════════════════════════
# PAGE 2  ·  VIDEOS + PHOTOS
# ══════════════════════════════════════════════════════════
fill_bg(c)
draw_grain(c, seed=99)

# ── Artistic elements page 2 ─────────────────────────────
# Large ghost "V" and "P" initials (Videos / Photos) very faint
c.setFont("Anton", 500)
c.setFillColor(Color(0.87, 0.80, 0.70, alpha=0.10))
c.drawString(-60, -80, "V")

# Arc — top left
draw_arc_ring(c, cx=-40, cy=H + 40, r=240, start_deg=300, end_deg=358,
              width=1.6, color=ORANGE, alpha=0.20)
draw_arc_ring(c, cx=-40, cy=H + 40, r=185, start_deg=305, end_deg=355,
              width=0.8, color=ORANGE, alpha=0.10)

# Small arc bottom right
draw_arc_ring(c, cx=W + 20, cy=-20, r=160, start_deg=100, end_deg=170,
              width=1.2, color=INK, alpha=0.09)

# ── Top strip ─────────────────────────────────────────────
c.setFillColor(INK)
c.rect(0, H - 32, W, 32, fill=1, stroke=0)
c.setFont("Inter", 7.5)
c.setFillColor(SAND)
c.drawString(40, H - 20, "PRESS KIT  2026")
c.setFillColor(Color(0.95, 0.91, 0.83, alpha=0.5))
lbl = "02 / MEDIA"
c.drawString(W - 40 - c.stringWidth(lbl, "Inter", 7.5), H - 20, lbl)

# ═══ VIDEOS ═══════════════════════════════════════════════
section_label(c, "Videos & Sets", 40, H - 60)

c.setFont("Anton", 54)
c.setFillColor(INK)
c.drawString(38, H - 106, "VIDEOS")

draw_brushstroke(c, 38, H - 118, 210, H - 118, max_w=4, color=ORANGE, alpha=0.80)

c.setFont("Inter", 9.5)
c.setFillColor(DIM)
c.drawString(40, H - 134, "Live recordings  ·  DJ sets  ·  Studio sessions")

# Card
vc_y = H - 230
vc_h = 80
c.setFillColor(Color(0.06, 0.04, 0.02, alpha=0.04))
c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.roundRect(40, vc_y, W - 80, vc_h, 5, fill=1, stroke=1)
# orange left accent
c.setFillColor(ORANGE)
c.rect(40, vc_y, 3, vc_h, fill=1, stroke=0)

c.setFont("InterBold", 10)
c.setFillColor(INK)
c.drawString(56, vc_y + vc_h - 22, "Google Drive — Video Archive")
c.setFont("Inter", 8.5)
c.setFillColor(DIM)
c.drawString(56, vc_y + vc_h - 38, "All performance recordings available for press use.")
pill_button(c, "Open Videos Folder →", LINK_VIDEOS, 56, vc_y + 10, w=192)

# SoundCloud strip
sc_strip_y = vc_y - 26
c.setFillColor(Color(0.06, 0.04, 0.02, alpha=0.04))
c.setStrokeColor(LINE)
c.setLineWidth(0.5)
c.roundRect(40, sc_strip_y, W - 80, 20, 3, fill=1, stroke=1)
c.setFont("Inter", 8.5)
c.setFillColor(DIM)
c.drawString(54, sc_strip_y + 6, "SoundCloud sets  →  ")
sc_lbl_x = 54 + c.stringWidth("SoundCloud sets  →  ", "Inter", 8.5)
c.setFillColor(ORANGE)
sc_txt = "soundcloud.com/pedroipince"
c.drawString(sc_lbl_x, sc_strip_y + 6, sc_txt)
c.linkURL("https://soundcloud.com/pedroipince",
          (sc_lbl_x - 2, sc_strip_y + 2, sc_lbl_x + c.stringWidth(sc_txt, "Inter", 8.5), sc_strip_y + 16), relative=0)
c.setStrokeColor(ORANGE)
c.setLineWidth(0.4)
c.line(sc_lbl_x, sc_strip_y + 5, sc_lbl_x + c.stringWidth(sc_txt, "Inter", 8.5), sc_strip_y + 5)

# ── Divider (brushstroke style) ────────────────────────────
div_y = sc_strip_y - 36
draw_brushstroke(c, 40, div_y, W - 40, div_y, max_w=1.5, color=INK, alpha=0.20)

# ═══ PHOTOS ═══════════════════════════════════════════════
section_label(c, "Press Photos", 40, div_y - 24)

c.setFont("Anton", 54)
c.setFillColor(INK)
c.drawString(38, div_y - 70, "PHOTOS")

draw_brushstroke(c, 38, div_y - 82, 224, div_y - 82, max_w=4, color=BLUE, alpha=0.75)

c.setFont("Inter", 9.5)
c.setFillColor(DIM)
c.drawString(40, div_y - 98, "High-resolution  ·  Free to use for editorial and press purposes")

# Photo card
ph_y = div_y - 196
ph_h = 80
c.setFillColor(Color(0.06, 0.04, 0.02, alpha=0.04))
c.setStrokeColor(LINE)
c.setLineWidth(0.8)
c.roundRect(40, ph_y, W - 80, ph_h, 5, fill=1, stroke=1)
# blue left accent
c.setFillColor(BLUE)
c.rect(40, ph_y, 3, ph_h, fill=1, stroke=0)

c.setFont("InterBold", 10)
c.setFillColor(INK)
c.drawString(56, ph_y + ph_h - 22, "Google Drive — Photo Archive")
c.setFont("Inter", 8.5)
c.setFillColor(DIM)
c.drawString(56, ph_y + ph_h - 38, "High-res press photos ready for download.")
pill_button(c, "Open Photos Folder →", LINK_PHOTOS, 56, ph_y + 10, w=192)

# Usage note strip
usage_y = ph_y - 26
c.setFillColor(Color(0.06, 0.04, 0.02, alpha=0.04))
c.setStrokeColor(LINE)
c.setLineWidth(0.5)
c.roundRect(40, usage_y, W - 80, 20, 3, fill=1, stroke=1)
c.setFont("Inter", 7.5)
c.setFillColor(DIM)
c.drawCentredString(W / 2, usage_y + 6,
    "Credit: © Pedro Ipince  ·  Do not crop or alter without permission  ·  Editorial use only")

draw_footer(c)
c.showPage()

c.save()
print(f"Done → {OUTPUT}")

"""Prebuild wallet-size license artwork. Pass a font directory and jobs JSON export."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parents[1]
fonts = Path(sys.argv[1])
jobs = json.loads(Path(sys.argv[2]).read_text())
for name, filename in [('Display', 'DelaGothicOne.ttf'), ('Body', 'ZenKakuGothicNew.ttf'), ('Bold', 'ZenKakuGothicNew-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(fonts / filename)))

# Print equivalents of Hero Board's foreground, primary, accent and card tokens.
INK, PRIMARY, ACCENT, PAPER = map(HexColor, ['#20243C', '#ED592E', '#F5DC59', '#FFFFFF'])
W, H = 153, 243  # 2.125 x 3.375 inches, standard wallet size
target = ROOT / 'public/downloads/hero-agency-wallet-templates.pdf'
target.parent.mkdir(parents=True, exist_ok=True)
c = canvas.Canvas(str(target), pagesize=(W, H))
c.setTitle('Hero Agency — Wallet License Templates')
style = ParagraphStyle('Protocol', fontName='Body', fontSize=8, leading=10, textColor=INK)
for j in jobs:
    c.setFillColor(PAPER); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(INK); c.rect(0, H-22, W, 22, fill=1, stroke=0)
    c.setFillColor(PAPER); c.setFont('Display', 7.3)
    c.drawCentredString(W/2, H-14, 'HERO AGENCY LICENSE')
    im = Image.open(ROOT / f'src/assets/heroes/{j["mentor"]}.webp').convert('RGB')
    im = ImageOps.fit(im, (612, 424), centering=(0.5, 0.2))
    c.drawImage(ImageReader(im), 2, 115, width=W-4, height=106)
    c.setFillColor(ACCENT); c.rect(2, 113, W-4, 3, fill=1, stroke=0)
    # Student name is overlaid at y=96 by the browser, using current assignments.
    c.setFillColor(INK); c.setFont('Bold', 5.5); c.drawString(10, 105, 'LICENSED STUDENT HERO')
    c.setFillColor(PRIMARY); c.setFont('Display', 10); c.drawString(10, 76, j['title'])
    p = Paragraph(j['protocol'], style)
    _, height = p.wrap(W-20, 49)
    assert height <= 49, f'Protocol too long: {j["title"]}'
    p.drawOn(c, 10, 67-height)
    mentor = {'nighteye': 'Sir Nighteye', 'eraserhead': 'Eraser Head', 'mtlady': 'Mt. Lady'}.get(j['mentor'], j['mentor'].capitalize())
    c.setFillColor(INK); c.setFont('Bold', 6.8); c.drawString(10, 15, f'Mentor: {mentor}')
    c.setFont('Body', 6.8); c.drawRightString(W-10, 15, f'{j["gp"]} pts/week')
    c.setStrokeColor(INK); c.setLineWidth(1); c.rect(.5, .5, W-1, H-1, fill=0, stroke=1)
    c.showPage()
c.save()
print(f'Built {len(jobs)} wallet templates at {target}')
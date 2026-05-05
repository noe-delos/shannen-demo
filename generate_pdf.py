#!/usr/bin/env python3
"""Convert mission1_neocell.md to a styled PDF."""

import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# ── Colors ────────────────────────────────────────────────────────────────────
PURPLE      = colors.HexColor("#9516C7")
LIGHT_PURPLE= colors.HexColor("#F3E8FA")
DARK        = colors.HexColor("#1A1A2E")
GREY        = colors.HexColor("#6B7280")
LIGHT_GREY  = colors.HexColor("#F9FAFB")
BORDER_GREY = colors.HexColor("#E5E7EB")
GREEN       = colors.HexColor("#059669")
ORANGE      = colors.HexColor("#D97706")
RED         = colors.HexColor("#DC2626")
BLUE        = colors.HexColor("#2563EB")
CODE_BG     = colors.HexColor("#F1F5F9")
CODE_FG     = colors.HexColor("#334155")

WIDTH, HEIGHT = A4
MARGIN = 20 * mm

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def make_style(name, parent="Normal", **kwargs):
    return ParagraphStyle(name, parent=styles[parent], **kwargs)

S = {
    "h1": make_style("H1", "Normal",
        fontSize=22, textColor=PURPLE, spaceAfter=6, spaceBefore=18,
        fontName="Helvetica-Bold", leading=28),
    "h2": make_style("H2", "Normal",
        fontSize=15, textColor=DARK, spaceAfter=4, spaceBefore=14,
        fontName="Helvetica-Bold", leading=20,
        borderPad=4, backColor=LIGHT_PURPLE,
        leftIndent=-2, rightIndent=-2),
    "h3": make_style("H3", "Normal",
        fontSize=12, textColor=PURPLE, spaceAfter=3, spaceBefore=10,
        fontName="Helvetica-Bold", leading=16),
    "h4": make_style("H4", "Normal",
        fontSize=10, textColor=DARK, spaceAfter=2, spaceBefore=6,
        fontName="Helvetica-Bold", leading=14),
    "body": make_style("Body", "Normal",
        fontSize=9, textColor=DARK, spaceAfter=4, leading=14),
    "bullet": make_style("Bullet", "Normal",
        fontSize=9, textColor=DARK, spaceAfter=3, leading=13,
        leftIndent=12, firstLineIndent=0),
    "bullet2": make_style("Bullet2", "Normal",
        fontSize=9, textColor=GREY, spaceAfter=2, leading=12,
        leftIndent=24, firstLineIndent=0),
    "code": make_style("Code", "Normal",
        fontSize=8, textColor=CODE_FG, spaceAfter=6, spaceBefore=4,
        fontName="Courier", leading=12, backColor=CODE_BG,
        leftIndent=8, rightIndent=8, borderPad=6),
    "note": make_style("Note", "Normal",
        fontSize=8.5, textColor=colors.HexColor("#92400E"), spaceAfter=4,
        leading=13, backColor=colors.HexColor("#FEF3C7"),
        leftIndent=8, borderPad=5),
    "success": make_style("Success", "Normal",
        fontSize=8.5, textColor=colors.HexColor("#065F46"), spaceAfter=4,
        leading=13, backColor=colors.HexColor("#D1FAE5"),
        leftIndent=8, borderPad=5),
    "grey": make_style("Grey", "Normal",
        fontSize=8.5, textColor=GREY, spaceAfter=3, leading=12),
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def escape(text):
    """Escape XML special chars for ReportLab paragraphs."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def inline_fmt(text):
    """Convert inline markdown (bold, inline code) to ReportLab XML."""
    # inline code first
    text = re.sub(r'`([^`]+)`', lambda m: f'<font name="Courier" color="#7C3AED">{escape(m.group(1))}</font>', text)
    # bold
    text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
    # italic
    text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
    return text

def status_color(text):
    if "✅" in text:
        return GREEN
    if "⏳" in text or "⚠️" in text:
        return ORANGE
    if "❌" in text:
        return RED
    return DARK

# ── Parser ────────────────────────────────────────────────────────────────────

def parse_md(md_path):
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    story = []
    in_code = False
    code_lines = []
    in_table = False
    table_rows = []
    i = 0

    def flush_table():
        nonlocal table_rows, in_table
        if not table_rows:
            return
        # filter separator rows
        rows = [r for r in table_rows if not re.match(r'^[\|\s\-:]+$', ''.join(r))]
        if not rows:
            table_rows = []
            in_table = False
            return

        col_count = max(len(r) for r in rows)
        # pad rows
        padded = [r + [''] * (col_count - len(r)) for r in rows]

        tdata = []
        for ri, row in enumerate(padded):
            trow = []
            for ci, cell in enumerate(row):
                cell = cell.strip()
                style = S["grey"] if ri > 0 else make_style(f"th{ri}{ci}", "Normal",
                    fontSize=8.5, textColor=colors.white, fontName="Helvetica-Bold",
                    leading=12, alignment=TA_CENTER)
                # inline format
                cell_fmt = inline_fmt(escape(cell))
                trow.append(Paragraph(cell_fmt, style))
            tdata.append(trow)

        col_w = (WIDTH - 2 * MARGIN) / col_count
        col_widths = [col_w] * col_count

        t = Table(tdata, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), PURPLE),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, LIGHT_GREY]),
            ("GRID", (0,0), (-1,-1), 0.3, BORDER_GREY),
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
            ("LEFTPADDING", (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))
        table_rows = []
        in_table = False

    while i < len(lines):
        line = lines[i].rstrip("\n")

        # ── Code block ──
        if line.startswith("```"):
            if not in_code:
                in_code = True
                code_lines = []
            else:
                in_code = False
                code_text = "\n".join(escape(l) for l in code_lines)
                story.append(Paragraph(code_text.replace("\n", "<br/>"), S["code"]))
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # ── Table ──
        if line.startswith("|"):
            in_table = True
            cells = [c.strip() for c in line.strip("|").split("|")]
            table_rows.append(cells)
            i += 1
            continue
        elif in_table:
            flush_table()

        # ── HR ──
        if re.match(r'^---+$', line.strip()):
            story.append(Spacer(1, 4))
            story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GREY))
            story.append(Spacer(1, 4))
            i += 1
            continue

        # ── Headings ──
        m = re.match(r'^(#{1,4})\s+(.+)', line)
        if m:
            level = len(m.group(1))
            text = inline_fmt(escape(m.group(2)))
            style_map = {1: S["h1"], 2: S["h2"], 3: S["h3"], 4: S["h4"]}
            story.append(Paragraph(text, style_map.get(level, S["body"])))
            i += 1
            continue

        # ── Blockquote ──
        if line.startswith("> "):
            content = line[2:].strip()
            text = inline_fmt(escape(content))
            if "✅" in content:
                story.append(Paragraph(text, S["success"]))
            else:
                story.append(Paragraph(text, S["note"]))
            i += 1
            continue

        # ── Bullet level 2 ──
        m2 = re.match(r'^  - (.+)', line)
        if m2:
            text = inline_fmt(escape(m2.group(1)))
            story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;• {text}", S["bullet2"]))
            i += 1
            continue

        # ── Bullet level 1 ──
        m1 = re.match(r'^[-*] (.+)', line)
        if m1:
            text = inline_fmt(escape(m1.group(1)))
            bullet_char = "✅" if "✅" in m1.group(1) else ("⏳" if "⏳" in m1.group(1) else ("❌" if "❌" in m1.group(1) else ("[ ]" if "[ ]" in m1.group(1) else "•")))
            # color
            col = status_color(m1.group(1))
            col_hex = "#" + col.hexval().replace("0x", "")
            story.append(Paragraph(f"<font color='{col_hex}'>{escape(bullet_char)}</font> {text}", S["bullet"]))
            i += 1
            continue

        # ── Numbered list ──
        mn = re.match(r'^(\d+)\. (.+)', line)
        if mn:
            text = inline_fmt(escape(mn.group(2)))
            story.append(Paragraph(f"<b>{mn.group(1)}.</b> {text}", S["bullet"]))
            i += 1
            continue

        # ── Empty line ──
        if line.strip() == "":
            story.append(Spacer(1, 4))
            i += 1
            continue

        # ── Normal paragraph ──
        text = inline_fmt(escape(line.strip()))
        if text:
            story.append(Paragraph(text, S["body"]))
        i += 1

    if in_table:
        flush_table()

    return story

# ── Build PDF ─────────────────────────────────────────────────────────────────

def build_pdf(md_path, out_path):
    doc = SimpleDocTemplate(
        out_path,
        pagesize=A4,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title="Mission 1 — NeoCell",
        author="LikaSrv",
    )

    def header_footer(canvas, doc):
        canvas.saveState()
        # Header bar
        canvas.setFillColor(PURPLE)
        canvas.rect(0, HEIGHT - 10*mm, WIDTH, 10*mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(MARGIN, HEIGHT - 6.5*mm, "Mission 1 — NeoCell")
        canvas.setFont("Helvetica", 8)
        canvas.drawRightString(WIDTH - MARGIN, HEIGHT - 6.5*mm, "LikaSrv / Shannen")
        # Footer
        canvas.setFillColor(GREY)
        canvas.setFont("Helvetica", 7.5)
        canvas.drawCentredString(WIDTH / 2, 8*mm, f"Page {doc.page}")
        canvas.restoreState()

    story = parse_md(md_path)
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    print(f"✅ PDF généré : {out_path}")

if __name__ == "__main__":
    build_pdf(
        "/Users/chanlika/code/LikaSrv/shannen-demo/mission1_neocell.md",
        "/Users/chanlika/code/LikaSrv/shannen-demo/mission1_neocell.pdf"
    )

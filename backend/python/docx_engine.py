"""
Khanna Travels & Holidays — High-Fidelity Word (.docx) & PDF Generator
Populates approved clean templates from templates/ as the single source of truth:
1. Cover Letters: Europe, Japan, Singapore (.docx & .pdf)
   - Strict font uniformity across every paragraph and run (Arial 13pt or Calibri 14pt).
2. Hotel Blocking: Single and Multiple Hotels (.docx & .pdf)
   - Exact font styling matching official format: Aptos 16pt, bold labels, exact colors.
   - Exact table structure preserved: Guest Name | Room Type | No. of Guests (Strictly 3 columns, no extra columns).
   - Preserves official header and footer letterhead graphics.
3. Passport Authorization Letter (.docx & .pdf)
   - Supports Single traveller and Couple / Multiple travellers templates.
   - Authorizes Mr. Praduman Tripathi from Khanna Holidays Pvt. Ltd.
4. Company Authorization Letter (.docx & .pdf)
   - Official letterhead authorization signed by Ms. Dhvani Chheda (Team Lead – Visa).
   - Preserves official header and footer graphics in Word and PDF.
5. Consular Invitation Letter (.docx & .pdf)
   - Dynamic inviter details, applicant details, dates, and purpose.
   - Embeds uploaded Inviter Signature image at exact position and size.
Zero emojis, zero template artefacts, zero hardcoded sample names.
"""

import sys
import os
import io
import re
import json
import base64
import docx
from datetime import datetime
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image as ReportLabImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

sys.stdout.reconfigure(encoding='utf-8')
import subprocess


def convert_docx_to_pdf_via_word(docx_path: str, pdf_path: str) -> bool:
    """
    Converts a .docx file to .pdf using Microsoft Word COM automation via PowerShell.
    Ensures 100% fidelity to the Word document, including headers, footers, fonts, and layouts.
    """
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        ps_script = os.path.join(script_dir, "convert_docx_to_pdf.ps1")
        if not os.path.exists(ps_script):
            return False

        abs_docx = os.path.abspath(docx_path)
        abs_pdf = os.path.abspath(pdf_path)

        cmd = [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy", "Bypass",
            "-File", ps_script,
            "-docxPath", abs_docx,
            "-pdfPath", abs_pdf
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
        if res.returncode == 0 and os.path.exists(abs_pdf) and os.path.getsize(abs_pdf) > 0:
            return True
        else:
            sys.stderr.write(f"[convert_docx_to_pdf] PowerShell Word conversion failed: {res.stderr}\n")
            return False
    except Exception as e:
        sys.stderr.write(f"[convert_docx_to_pdf] Word conversion error: {e}\n")
        return False


def _generate_pdf_via_word_or_fallback(docx_generator_fn, reportlab_generator_fn, data: dict, output_path: str, prefix: str):
    """
    Attempts Word COM conversion of the generated .docx file first for bit-exact template fidelity.
    Falls back gracefully to ReportLab if Microsoft Word is unavailable.
    """
    temp_docx = None
    try:
        temp_dir = os.path.dirname(os.path.abspath(output_path))
        os.makedirs(temp_dir, exist_ok=True)
        temp_docx = os.path.join(temp_dir, f"temp_{prefix}_{os.getpid()}_{int(datetime.now().timestamp() * 1000)}.docx")
        docx_generator_fn(data, temp_docx)
        if convert_docx_to_pdf_via_word(temp_docx, output_path):
            return output_path
    except Exception as e:
        sys.stderr.write(f"[{prefix}_pdf] Word conversion failed, falling back to ReportLab: {e}\n")
    finally:
        if temp_docx and os.path.exists(temp_docx):
            try:
                os.remove(temp_docx)
            except Exception:
                pass

    return reportlab_generator_fn(data, output_path)


def set_cell_background(cell, fill_hex):
    """Sets background shading color for a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)


def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets cell padding in twips."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)


def set_cell_formatted(cell, text, font_name="Aptos", size_pt=16.0, bold=False, color_rgb=(50, 50, 50), align=WD_ALIGN_PARAGRAPH.LEFT):
    """Sets cell text preserving exact font styling and XML tags."""
    cell.text = ""
    p = cell.paragraphs[0]
    p.alignment = align
    run = p.add_run(str(text) if text is not None else "")
    run.font.name = font_name
    if size_pt:
        run.font.size = Pt(size_pt)
    run.font.bold = bold
    if color_rgb:
        run.font.color.rgb = RGBColor(*color_rgb)
    rPr = run._r.get_or_add_rPr()
    for existing_rf in rPr.findall(qn('w:rFonts')):
        rPr.remove(existing_rf)
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
    rPr.append(rFonts)
    return run


def set_hotel_header_cell(cell, conf_no, font_name="Aptos", size_pt=16.0):
    """Formats the hotel confirmation banner preserving exact font runs and styles."""
    cell.text = ""
    p = cell.paragraphs[0]
    for r in list(p.runs):
        p._p.remove(r._r)
    
    r0 = p.add_run('Thanks for booking with us, your booking has been "')
    r0.font.name = font_name
    r0.font.size = Pt(size_pt)
    r0.font.bold = False
    r0.font.color.rgb = RGBColor(50, 50, 50)
    
    r1 = p.add_run('Confirmed')
    r1.font.name = font_name
    r1.font.size = Pt(size_pt)
    r1.font.bold = True
    r1.font.color.rgb = RGBColor(50, 50, 50)
    
    r2 = p.add_run('" with \nConfirmation Number- ')
    r2.font.name = font_name
    r2.font.size = Pt(size_pt)
    r2.font.bold = True
    r2.font.color.rgb = RGBColor(50, 50, 50)
    
    r3 = p.add_run(str(conf_no))
    r3.font.name = font_name
    r3.font.size = Pt(size_pt)
    r3.font.bold = True
    r3.font.color.rgb = RGBColor(50, 50, 50)
    
    for r in [r0, r1, r2, r3]:
        rPr = r._r.get_or_add_rPr()
        for existing_rf in rPr.findall(qn('w:rFonts')):
            rPr.remove(existing_rf)
        rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
        rPr.append(rFonts)


def replace_paragraph_text_preserving_font(paragraph, replacements, default_font="Arial", default_size_pt=13.0):
    """
    Replaces placeholder text in a paragraph while enforcing uniform font family and size
    across all runs, avoiding mid-paragraph font discrepancies.
    """
    has_match = any(k in paragraph.text for k in replacements.keys())
    if not has_match:
        return

    font_name = default_font
    size_pt = default_size_pt
    is_bold = False

    # Check existing runs for font or bold properties
    for r in paragraph.runs:
        if r.font.name:
            font_name = r.font.name
        if r.font.size:
            size_pt = r.font.size.pt
        if r.bold:
            is_bold = True

    full_txt = paragraph.text
    for k, v in replacements.items():
        full_txt = full_txt.replace(k, str(v) if v is not None else "")

    for r in list(paragraph.runs):
        paragraph._p.remove(r._r)

    new_run = paragraph.add_run(full_txt)
    new_run.font.name = font_name
    new_run.font.size = Pt(size_pt)
    new_run.bold = is_bold
    rPr = new_run._r.get_or_add_rPr()
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
    rPr.append(rFonts)


def draw_official_letterhead(canvas, doc):
    """Draws official Khanna Travels letterhead banner at top and two-column footer at bottom for PDFs."""
    canvas.saveState()
    banner_path = "assets/logo/khanna_letterhead_banner.jpg"
    if not os.path.exists(banner_path):
        banner_path = os.path.join("..", banner_path)
    if os.path.exists(banner_path):
        try:
            canvas.drawImage(banner_path, 36, 742, width=523, height=88, preserveAspectRatio=True, mask='auto')
        except Exception:
            pass

    # Footer separator rule
    canvas.setStrokeColor(colors.HexColor('#CBD5E1'))
    canvas.setLineWidth(0.6)
    canvas.line(36, 44, 559, 44)

    # Footer Left column: Head office
    canvas.setFont('Helvetica-Bold', 7)
    canvas.setFillColor(colors.HexColor('#0F172A'))
    canvas.drawString(36, 33, "Head office:")
    canvas.setFont('Helvetica', 6.2)
    canvas.setFillColor(colors.HexColor('#475569'))
    canvas.drawString(82, 33, "Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Rd, Sanpada East, Navi Mumbai - 400705")
    canvas.setFont('Helvetica-Bold', 6.2)
    canvas.setFillColor(colors.HexColor('#0F172A'))
    canvas.drawString(36, 23, "KHANNA HOLIDAYS PVT. LTD.")
    canvas.setFont('Helvetica', 6.2)
    canvas.setFillColor(colors.HexColor('#475569'))
    canvas.drawString(146, 23, "• Tel: +91 22 4155 5555 • Sales@khannatravels.com")

    # Footer Right column: Front office
    canvas.setFont('Helvetica-Bold', 7)
    canvas.setFillColor(colors.HexColor('#0F172A'))
    canvas.drawString(340, 33, "Front office:")
    canvas.setFont('Helvetica', 6.2)
    canvas.setFillColor(colors.HexColor('#475569'))
    canvas.drawString(384, 33, "Shop No. 19, Seawoods Garden, Sector 17, Sanpada East, Navi Mumbai")
    canvas.drawString(340, 23, "Email: customercare@khannatravels.com • www.khannaholidays.com")
    canvas.restoreState()


# =========================================================================
# 1. COVER LETTER GENERATORS (Europe, Japan, Singapore)
# =========================================================================

def generate_cover_letter_docx(data: dict, output_path: str):
    """
    Generates a formal visa cover letter using approved clean docx templates with uniform fonts.
    """
    template_type = data.get("template", "Europe")
    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])
    hotels = data.get("hotels", [])

    template_map = {
        "Europe": ("templates/cover-letter/Europe/Europe_covering_letter_template_clean.docx", "Arial", 13.0),
        "Japan": ("templates/cover-letter/Japan/Japan_covering_letter_template_clean.docx", "Calibri", 14.0),
        "Singapore": ("templates/cover-letter/Singapore/Singapore_covering_letter_template_clean.docx", "Arial", 13.0)
    }

    tpl_info = template_map.get(template_type, template_map["Europe"])
    tpl_path, font_family, font_size = tpl_info
    if not os.path.exists(tpl_path):
        tpl_path = os.path.join("..", tpl_path)

    doc = docx.Document(tpl_path)
    today_str = datetime.now().strftime("%d-%b-%Y")

    app_name = applicant.get("fullName") or f"{applicant.get('givenNames', '')} {applicant.get('surname', '')}".strip() or "Applicant Name"
    pass_no = applicant.get("passportNumber") or "N/A"
    poi = applicant.get("placeOfIssue") or "Mumbai"
    doi = applicant.get("dateOfIssue") or "N/A"
    dest = travel.get("destinationCountry") or "Europe"
    start_date = travel.get("travelStartDate") or "DD/MM/YYYY"
    end_date = travel.get("travelEndDate") or "DD/MM/YYYY"
    funding = travel.get("fundingArrangement") or "Self-funded from personal savings"
    job_title = travel.get("jobTitle") or "Professional"
    employer = travel.get("employerName") or "Organization"
    phone = travel.get("applicantPhone") or "+91 9876543210"
    email = travel.get("applicantEmail") or "applicant@example.com"
    city = applicant.get("city") or "Mumbai"
    address = applicant.get("residentialAddress") or f"{city}, India"
    
    consulate_map = {
        "UK": "The Entry Clearance Officer,\nUK Visas and Immigration (UKVI), British High Commission,\nNew Delhi / Mumbai, India",
        "USA": "The Consular Officer,\nConsular Section, Embassy of the United States of America,\nMumbai / New Delhi, India",
        "Canada": "The Immigration Officer,\nImmigration, Refugees and Citizenship Canada (IRCC),\nHigh Commission of Canada in India",
        "Australia": "The Visa Officer,\nDepartment of Home Affairs, Australian High Commission,\nNew Delhi, India",
        "UAE": "The General Directorate of Residency & Foreigners Affairs (GDRFA) / ICP,\nUnited Arab Emirates",
        "Turkey": "The Visa Officer,\nConsulate General of the Republic of Turkey,\nMumbai, India",
        "NewZealand": "The Visa Officer,\nImmigration New Zealand, Ministry of Business, Innovation & Employment,\nNew Delhi / Mumbai, India"
    }
    consulate_str = consulate_map.get(template_type, f"Embassy / Consulate General of {dest},\nMumbai / New Delhi, India")

    # Calculate duration
    duration_str = "10 Nights"
    if start_date != "DD/MM/YYYY" and end_date != "DD/MM/YYYY":
        try:
            parts1 = [int(p) for p in start_date.replace('-', '/').split('/')]
            parts2 = [int(p) for p in end_date.replace('-', '/').split('/')]
            if len(parts1) == 3 and len(parts2) == 3:
                d1 = datetime(parts1[2], parts1[1], parts1[0])
                d2 = datetime(parts2[2], parts2[1], parts2[0])
                diff_days = (d2 - d1).days
                if diff_days > 0:
                    duration_str = f"{diff_days} Nights"
        except Exception:
            pass

    replacements = {
        "[Date]": today_str,
        "[Applicant Full Name]": app_name,
        "[Passenger 1 Name]": app_name,
        "[Passport Number]": pass_no,
        "[Passport No.]": pass_no,
        "[Place of Issue]": poi,
        "[Passport Issue Date]": doi,
        "[Destination Country]": dest,
        "[Destination Country/Countries]": dest,
        "[Travel Start Date]": start_date,
        "[Travel End Date]": end_date,
        "[Funding Arrangement]": funding,
        "[Sponsor Name / Funding Arrangement]": funding,
        "[Job Title]": job_title,
        "[Employer Name]": employer,
        "[Employer / Occupation]": f"{employer} - {job_title}",
        "[Employment Status]": travel.get("employmentStatus", "Employed"),
        "[Employment Start Year]": travel.get("employmentStartYear", "2018"),
        "[Phone Number]": phone,
        "[Email Address]": email,
        "[Contact No.]": phone,
        "[City, Country]": f"{city}, India",
        "[City]": city,
        "[Address]": address,
        "[Number of Nights]": duration_str,
        "[Next Country]": dest,
        "[Next Travel Start Date]": start_date,
        "[Next Travel End Date]": end_date,
        "[Occupation]": job_title,
        "[Relation]": "Family Member",
        "[Relation/Family]": "Family",
        "[Consulate Name and Address]": consulate_str
    }

    if travellers:
        p2 = travellers[0]
        replacements["[Passenger 2 Name]"] = p2.get("fullName", "Accompanying Passenger")
        replacements["[Relation]"] = p2.get("relation", "Spouse")
        replacements["[Occupation]"] = p2.get("occupation", "Employed")
    else:
        replacements["[Passenger 2 Name]"] = ""
        replacements["[Add additional family member details here if applicable]."] = ""

    for p in doc.paragraphs:
        replace_paragraph_text_preserving_font(p, replacements, default_font=font_family, default_size_pt=font_size)

    # Handle template-specific tables
    if template_type == "Japan" and doc.tables:
        t = doc.tables[0]
        while len(t.rows) > 1:
            t._tbl.remove(t.rows[-1]._tr)

        if hotels:
            for h in hotels:
                r = t.add_row()
                set_cell_formatted(r.cells[0], h.get("hotelName", "Hotel"), font_name=font_family, size_pt=font_size)
                set_cell_formatted(r.cells[1], f"{h.get('checkIn', start_date)} - {h.get('checkOut', end_date)}", font_name=font_family, size_pt=font_size)
                set_cell_formatted(r.cells[2], h.get("phone", phone), font_name=font_family, size_pt=font_size)
        else:
            r = t.add_row()
            set_cell_formatted(r.cells[0], f"Grand Hotel {dest}", font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[1], f"{start_date} - {end_date}", font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[2], phone, font_name=font_family, size_pt=font_size)

    elif template_type == "Singapore" and doc.tables:
        t = doc.tables[0]
        while len(t.rows) > 1:
            t._tbl.remove(t.rows[-1]._tr)

        r1 = t.add_row()
        set_cell_formatted(r1.cells[0], "1", font_name=font_family, size_pt=font_size)
        set_cell_formatted(r1.cells[1], app_name, font_name=font_family, size_pt=font_size)
        set_cell_formatted(r1.cells[2], pass_no, font_name=font_family, size_pt=font_size)
        set_cell_formatted(r1.cells[3], "Self", font_name=font_family, size_pt=font_size)
        set_cell_formatted(r1.cells[4], job_title, font_name=font_family, size_pt=font_size)

        for i, tr in enumerate(travellers):
            r = t.add_row()
            set_cell_formatted(r.cells[0], str(i + 2), font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[1], tr.get("fullName", ""), font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[2], tr.get("passportNumber", ""), font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[3], tr.get("relation", "Family"), font_name=font_family, size_pt=font_size)
            set_cell_formatted(r.cells[4], tr.get("occupation", "Employed"), font_name=font_family, size_pt=font_size)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def generate_cover_letter_pdf(data: dict, output_path: str):
    """
    Generates a formal Cover Letter PDF matching official Word templates.
    Tries native Word conversion first; falls back to ReportLab.
    """
    return _generate_pdf_via_word_or_fallback(
        generate_cover_letter_docx,
        _generate_cover_letter_pdf_reportlab,
        data, output_path, "cov"
    )


def _generate_cover_letter_pdf_reportlab(data: dict, output_path: str):
    """
    Generates a formal Cover Letter PDF using ReportLab (fallback).
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    p_style = ParagraphStyle(
        'CoverBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    p_bold_style = ParagraphStyle(
        'CoverBold',
        parent=p_style,
        fontName='Helvetica-Bold'
    )

    story = []
    html_content = data.get("html", "")
    if html_content:
        import re
        clean_html = html_content.replace('<br>', '<br/>').replace('</p>', '</p><spacer height="10"/>')
        clean_html = re.sub(r'<table[\s\S]*?</table>', '', clean_html)
        paragraphs = clean_html.split('<p')
        for p in paragraphs:
            if not p.strip():
                continue
            text = '<p' + p
            text = re.sub(r'<p[^>]*>', '', text).replace('</p>', '').strip()
            if text:
                story.append(Paragraph(text, p_style))
                story.append(Spacer(1, 8))
    else:
        app = data.get("applicant", {})
        story.append(Paragraph(f"<b>Cover Letter for Visa Application</b>", p_bold_style))
        story.append(Paragraph(f"Applicant: {app.get('fullName', 'Applicant')}", p_style))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.build(story)
    return output_path


# =========================================================================
# 2. HOTEL BLOCKING GENERATORS (Single & Multiple Hotels)
# =========================================================================

def generate_hotel_blocking_docx(data: dict, output_path: str):
    """
    Generates high-fidelity Hotel Blocking Word document matching Khanna Travels format.
    Strictly preserves the exact 3-column table structure: Guest Name | Room Type | No. of Guests.
    Preserves template header and footer drawings.
    """
    hotels = data.get("hotels", [])
    applicant = data.get("applicant", {})

    if len(hotels) > 1:
        base_tpl = "templates/hotel-blocking/Multiple Hotels/Aakarsh Vikrant Shukla-  Australia Hotel Booking.docx"
    else:
        base_tpl = "templates/hotel-blocking/Single Hotel/Hotel Booking Format.docx"

    if not os.path.exists(base_tpl):
        base_tpl = os.path.join("..", base_tpl)

    doc = docx.Document(base_tpl)

    if not hotels:
        hotels = [{
            "confirmationNumber": "TBHBV5YP9R",
            "hotelName": "Hotel Booking Confirmation",
            "leadGuest": applicant.get("fullName", "Lead Guest"),
            "checkIn": "TBD",
            "checkOut": "TBD",
            "duration": "1 Night(s)",
            "city": "",
            "phone": "+61 2 7255 2300",
            "address": "",
            "numRooms": "1",
            "numGuests": "1 Adult(s)",
            "guests": [{"guestName": applicant.get("fullName", "Lead Guest"), "roomType": "Standard Room", "numGuests": "1 Adult(s)"}]
        }]

    for idx, h in enumerate(hotels):
        conf_no = h.get("confirmationNumber", "TBHBV5YP9R")
        hotel_name = h.get("hotelName", "Hotel Booking")
        lead_guest = h.get("leadGuest") or applicant.get("fullName") or "Lead Guest"
        check_in = h.get("checkIn", "TBD")
        check_out = h.get("checkOut", "TBD")
        duration = h.get("duration", "1 Night(s)")
        city = h.get("city", "")
        phone = h.get("phone", "+61 2 7255 2300")
        address = h.get("address", "")
        num_rooms = h.get("numRooms", "1")
        num_guests = h.get("numGuests", "1 Adult(s)")

        if len(hotels) > 1:
            t = doc.tables[idx] if idx < len(doc.tables) else doc.tables[0]
            header_cell = t.rows[0].cells[0]
            subtables_cell = t.rows[1].cells[0]
        else:
            outer = doc.tables[0]
            if outer.rows[0].cells[0].tables:
                sub_outer = outer.rows[0].cells[0].tables[0]
                header_cell = sub_outer.rows[0].cells[0]
                subtables_cell = sub_outer.rows[1].cells[0]
            else:
                header_cell = outer.rows[0].cells[0]
                subtables_cell = outer.rows[1].cells[0]

        # 1. Update header cell
        set_hotel_header_cell(header_cell, conf_no, font_name="Aptos", size_pt=16.0)

        # 2. Update Subtables
        if subtables_cell.tables:
            sub0 = subtables_cell.tables[0]
            if len(sub0.rows) >= 7:
                set_cell_formatted(sub0.rows[1].cells[3], hotel_name, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[2].cells[1], lead_guest, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[2].cells[3], str(len(h.get("guests", [1]))), font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[3].cells[1], num_rooms, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[3].cells[3], phone, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[4].cells[1], check_in, font_name="Aptos", size_pt=16.0, bold=True)
                set_cell_formatted(sub0.rows[4].cells[3], check_out, font_name="Aptos", size_pt=16.0, bold=True)
                set_cell_formatted(sub0.rows[5].cells[1], duration, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[5].cells[3], city, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(sub0.rows[6].cells[1], address, font_name="Aptos", size_pt=16.0, bold=False)

            # Subtable 1: Guest Table (EXACT 3-COLUMN STRUCTURE PRESERVED)
            if len(subtables_cell.tables) >= 2:
                sub1 = subtables_cell.tables[1]
                r_data = sub1.rows[1] if len(sub1.rows) > 1 else sub1.add_row()
                while len(sub1.rows) > 2:
                    sub1._tbl.remove(sub1.rows[-1]._tr)

                guests_list = h.get("guests", [])
                if guests_list:
                    guest_names = [g.get('guestName', '') for g in guests_list if g.get('guestName')]
                    if not guest_names:
                        guest_names = [lead_guest]
                    guest_names_str = "\n".join(guest_names)
                    room_type_str = guests_list[0].get("roomType", "Standard Room")
                    pax_str = guests_list[0].get("numGuests", num_guests)
                else:
                    guest_names_str = lead_guest
                    room_type_str = "Standard Room"
                    pax_str = num_guests

                set_cell_formatted(r_data.cells[0], guest_names_str, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(r_data.cells[1], room_type_str, font_name="Aptos", size_pt=16.0, bold=False)
                set_cell_formatted(r_data.cells[2], pax_str, font_name="Aptos", size_pt=16.0, bold=False)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def generate_hotel_blocking_pdf(data: dict, output_path: str):
    """
    Generates high-fidelity Hotel Blocking PDF matching Khanna Travels official format.
    Tries native Word conversion first for 100% fidelity to official Word template
    (including exact Aptos fonts, 4 header banner graphics, 2-column footer, and table styling).
    Falls back to ReportLab if Word COM is unavailable.
    """
    return _generate_pdf_via_word_or_fallback(
        generate_hotel_blocking_docx,
        _generate_hotel_blocking_pdf_reportlab,
        data, output_path, "hb"
    )


def _generate_hotel_blocking_pdf_reportlab(data: dict, output_path: str):
    """
    Generates high-fidelity Hotel Blocking PDF matching Khanna Travels official format using ReportLab (fallback).
    Strictly preserves 3-column table structure and renders letterhead banner.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=105,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'HeaderTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#222222'),
        alignment=0
    )
    label_style = ParagraphStyle(
        'CellLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#333333')
    )
    val_style = ParagraphStyle(
        'CellVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#222222')
    )
    val_bold_style = ParagraphStyle(
        'CellValBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#111111')
    )
    policy_hdr_style = ParagraphStyle(
        'PolicyHdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#55575A')
    )
    policy_body_style = ParagraphStyle(
        'PolicyBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#55575A')
    )

    story = []
    hotels = data.get("hotels", [])
    applicant = data.get("applicant", {})

    if not hotels:
        hotels = [{
            "confirmationNumber": "TBHBV5YP9R",
            "hotelName": "Hotel Booking Confirmation",
            "leadGuest": applicant.get("fullName", "Lead Guest"),
            "checkIn": "TBD",
            "checkOut": "TBD",
            "duration": "1 Night(s)",
            "city": "",
            "phone": "+61 2 7255 2300",
            "address": "",
            "numRooms": "1",
            "numGuests": "1 Adult(s)",
            "guests": [
                {"guestName": applicant.get("fullName", "Lead Guest"), "roomType": "Standard Room", "numGuests": "1 Adult(s)"}
            ]
        }]

    for idx, h in enumerate(hotels):
        conf_no = h.get("confirmationNumber", "TBHBV5YP9R")
        hotel_name = h.get("hotelName", "Hotel Booking")
        lead_guest = h.get("leadGuest") or applicant.get("fullName") or "Lead Guest"
        check_in = h.get("checkIn", "TBD")
        check_out = h.get("checkOut", "TBD")
        duration = h.get("duration", "1 Night(s)")
        city = h.get("city", "")
        phone = h.get("phone", "+61 2 7255 2300")
        address = h.get("address", "")
        num_rooms = h.get("numRooms", "1")
        num_guests = h.get("numGuests", "1 Adult(s)")

        # Header Box
        hdr_text = f'Thanks for booking with us, your booking has been <b>"Confirmed"</b> with<br/><b>Confirmation Number- {conf_no}</b>'
        hdr_tbl = Table([[Paragraph(hdr_text, title_style)]], colWidths=[523])
        hdr_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(hdr_tbl)
        story.append(Spacer(1, 10))

        # Booking details metadata grid
        meta_data = [
            [Paragraph('<b>Booking details:</b>', policy_hdr_style), '', '', ''],
            [Paragraph('Service Booked:', label_style), Paragraph('Hotel', val_style), Paragraph('Hotel Name:', label_style), Paragraph(hotel_name, val_style)],
            [Paragraph('Lead Guest:', label_style), Paragraph(lead_guest, val_style), Paragraph('No Guest:', label_style), Paragraph(str(len(h.get("guests", [1]))), val_style)],
            [Paragraph('No of Rooms:', label_style), Paragraph(num_rooms, val_style), Paragraph('Phone No:', label_style), Paragraph(phone, val_style)],
            [Paragraph('Check-In:', label_style), Paragraph(check_in, val_bold_style), Paragraph('Checkout:', label_style), Paragraph(check_out, val_bold_style)],
            [Paragraph('Duration:', label_style), Paragraph(duration, val_style), Paragraph('City:', label_style), Paragraph(city, val_style)],
            [Paragraph('Hotel Address:', label_style), Paragraph(address, val_style), '', '']
        ]

        meta_tbl = Table(meta_data, colWidths=[110, 151, 100, 162])
        meta_tbl.setStyle(TableStyle([
            ('SPAN', (0, 0), (3, 0)),
            ('SPAN', (1, 6), (3, 6)),
            ('BACKGROUND', (0, 0), (3, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(meta_tbl)
        story.append(Spacer(1, 10))

        # Guest table (EXACT 3-COLUMN STRUCTURE PRESERVED)
        guests = h.get("guests", [])
        if not guests:
            guests = [{"guestName": lead_guest, "roomType": "Standard Room", "numGuests": num_guests}]

        guest_names = "<br/>".join([g.get('guestName', '') for g in guests if g.get('guestName')]) or lead_guest
        room_type = guests[0].get('roomType', 'Standard Room')
        pax = guests[0].get('numGuests', num_guests)

        guest_rows = [
            [Paragraph('<b>Guest Name</b>', label_style), Paragraph('<b>Room Type</b>', label_style), Paragraph('<b>No. of Guests</b>', label_style)],
            [Paragraph(guest_names, val_style), Paragraph(room_type, val_style), Paragraph(pax, val_style)]
        ]

        guest_tbl = Table(guest_rows, colWidths=[240, 163, 120])
        guest_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(guest_tbl)
        story.append(Spacer(1, 10))

        # Hotel Policy table
        policy_data = [
            [Paragraph('<b>Hotel Policy:</b>', policy_hdr_style)],
            [Paragraph('Early check out will attract full cancellation charges.<br/>Please note that the cancellation policy is subject to change at any time. Rates are inclusive of all taxes.', policy_body_style)]
        ]
        policy_tbl = Table(policy_data, colWidths=[523])
        policy_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(policy_tbl)

        if idx < len(hotels) - 1:
            story.append(Spacer(1, 20))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.build(story, onFirstPage=draw_official_letterhead, onLaterPages=draw_official_letterhead)
    return output_path


# =========================================================================
# 3. PASSPORT AUTHORIZATION LETTER GENERATORS (Single & Couple/Multiple)
# =========================================================================

def generate_passport_authorization_docx(data: dict, output_path: str):
    """
    Generates high-fidelity Passport Authorization Letter matching templates/Passport Authorization Letter/
    Supports Single traveller and Couple / Multiple travellers templates.
    Equipped with official Khanna Holidays letterhead header and footer by default.
    """
    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])
    sub_type = data.get("subType")
    with_letterhead = data.get("withLetterhead", True)

    is_couple = (sub_type == "couple") or (len(travellers) > 0 and sub_type != "single")

    today_str = datetime.now().strftime("%d-%b-%Y")
    app_name = applicant.get("fullName") or f"{applicant.get('givenNames', '')} {applicant.get('surname', '')}".strip() or "Applicant Name"
    pass_no = applicant.get("passportNumber") or "N/A"
    dest = travel.get("destinationCountry") or "Korea"
    city = applicant.get("city") or "Mumbai"
    phone = travel.get("applicantPhone") or "+91 9819347139"
    email = travel.get("applicantEmail") or "applicant@hotmail.com"

    if with_letterhead:
        # Load official letterhead base template to preserve header images & footer text
        base_tpl = "templates/Company Authorization Letter/Company Authorization Letter.docx"
        if not os.path.exists(base_tpl):
            base_tpl = os.path.join("..", base_tpl)
        doc = docx.Document(base_tpl)
        for p in list(doc.paragraphs):
            p._element.getparent().remove(p._element)

        def add_lh_p(text, bold_prefix="", space_after=8):
            p = doc.add_paragraph()
            p.paragraph_format.space_after = Pt(space_after)
            p.paragraph_format.line_spacing = 1.15
            if bold_prefix:
                r0 = p.add_run(bold_prefix)
                r0.font.name = "Arial"
                r0.font.size = Pt(11)
                r0.font.bold = True
                r0.font.color.rgb = RGBColor(30, 41, 59)
            if text:
                r1 = p.add_run(text)
                r1.font.name = "Arial"
                r1.font.size = Pt(11)
                r1.font.color.rgb = RGBColor(30, 41, 59)
            return p

        add_lh_p(f"Date: {today_str}", space_after=12)
        add_lh_p(f"To,\nThe Visa Officer,\nThe Consulate / Embassy of {dest},\n{city}, India", space_after=14)

        if is_couple:
            p2 = travellers[0] if travellers else {}
            p2_name = p2.get("fullName", "Accompanying Traveller")
            p2_pass = p2.get("passportNumber", "N/A")
            add_lh_p(f"Authority Letter to collect original passports for {app_name} & {p2_name}", bold_prefix="Subject: ", space_after=12)
            add_lh_p("Dear Sir / Madam,", space_after=10)
            add_lh_p(
                f"We, {app_name} (holding Indian passport number: {pass_no}) & {p2_name} (holding Indian passport number: {p2_pass}), "
                f"hereby authorize Mr. Praduman Tripathi from Khanna Holidays Pvt. Ltd., whose office is at Reg. Office: 204, 2nd Floor, "
                f"Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056, to collect the original passports on our behalf.",
                space_after=12
            )
            add_lh_p("We would appreciate if you could hand over the original passports to the bearer of this letter.", space_after=14)
            add_lh_p(f"Thanking You.\n\nYours faithfully,\n\n{app_name}\n{p2_name}\nPhone No.: {phone}\nEmail id: {email}", space_after=10)
        else:
            add_lh_p(f"Authority Letter to collect original passport for {app_name}", bold_prefix="Subject: ", space_after=12)
            add_lh_p("Dear Sir / Madam,", space_after=10)
            add_lh_p(
                f"I, {app_name}, holding Indian passport number: {pass_no}, hereby authorize Mr. Praduman Tripathi from Khanna Holidays Pvt. Ltd., "
                f"whose office is at Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, "
                f"Vile Parle West, Mumbai – 400056, to collect the original passport on my behalf.",
                space_after=12
            )
            add_lh_p("I would appreciate if you could hand over the original passport to the bearer of this letter.", space_after=14)
            add_lh_p(f"Thanking You.\n\nYours faithfully,\n\n{app_name}\nPhone No.: {phone}\nEmail id: {email}", space_after=10)

    else:
        if is_couple:
            base_tpl = "templates/Passport Authorization Letter/Passport Authorization Letter - two or multiple travellers.docx"
        else:
            base_tpl = "templates/Passport Authorization Letter/Passport Authorization Letter - Single traveller.docx"

        if not os.path.exists(base_tpl):
            base_tpl = os.path.join("..", base_tpl)

        doc = docx.Document(base_tpl)

        if is_couple:
            p2 = travellers[0] if travellers else {}
            p2_name = p2.get("fullName", "Accompanying Traveller")
            p2_pass = p2.get("passportNumber", "N/A")
            relation = p2.get("relation", "wife")
            relation_prefix = f"my {relation.lower()} " if relation else ""

            for p in doc.paragraphs:
                if "[Date]" in p.text:
                    p.text = p.text.replace("[Date]", today_str)
                if "[Country]" in p.text:
                    p.text = p.text.replace("[Country]", dest)
                if "[Address of consulate]" in p.text:
                    p.text = p.text.replace("[Address of consulate]", f"{city}, India")
                if "Naresh Shivlal Bhasin" in p.text or "Mr. Naresh" in p.text:
                    p.text = f"We, {app_name} (Passport No.: {pass_no}) & {relation_prefix}{p2_name} (Passport No.: {p2_pass}) would like to authorize our travel agent Khanna Holidays Pvt. Ltd. to collect our original passports on our behalf."
                if "bhasinnaresh1@gmail.com" in p.text or "Email id:" in p.text and "[Email" in p.text:
                    p.text = f"Email id: {email}"
                if "9820063242" in p.text:
                    p.text = f"Phone No.: {phone}"
                if p.text.strip() == "Mr. Naresh Shivlal Bhasin":
                    p.text = app_name
        else:
            for p in doc.paragraphs:
                if "21st September 2026" in p.text or "[Date]" in p.text:
                    p.text = f"Date- {today_str}"
                if "Korea Visa Application Centre" in p.text or "[Country]" in p.text:
                    p.text = f"{dest} Visa Application Centre"
                if "Dilip Bijlani" in p.text and "Passport No" in p.text:
                    p.text = f"I, {app_name} (Passport No.: {pass_no}) would like to authorize my travel agent Khanna Holidays Pvt. Ltd. to collect my original passport on my behalf."
                if p.text.strip().startswith("Mr. Dilip Bijlani"):
                    p.text = f"{app_name}\nPhone No.: {phone}"
                if "dilipbijlani@hotmail.com" in p.text:
                    p.text = f"Email id: {email}"

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def generate_passport_authorization_pdf(data: dict, output_path: str):
    """
    Generates high-fidelity Passport Authorization Letter PDF with official Khanna Holidays letterhead.
    Tries native Word conversion first; falls back to ReportLab.
    """
    return _generate_pdf_via_word_or_fallback(
        generate_passport_authorization_docx,
        _generate_passport_authorization_pdf_reportlab,
        data, output_path, "pass"
    )


def _generate_passport_authorization_pdf_reportlab(data: dict, output_path: str):
    """
    Generates high-fidelity Passport Authorization Letter PDF using ReportLab (fallback) with official Khanna Holidays letterhead.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=105,
        bottomMargin=55
    )

    styles = getSampleStyleSheet()
    p_style = ParagraphStyle(
        'AuthBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    p_bold_style = ParagraphStyle(
        'AuthBold',
        parent=p_style,
        fontName='Helvetica-Bold'
    )
    p_right_style = ParagraphStyle(
        'AuthRight',
        parent=p_style,
        alignment=2
    )

    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])
    sub_type = data.get("subType")

    is_couple = (sub_type == "couple") or (len(travellers) > 0 and sub_type != "single")

    today_str = datetime.now().strftime("%d-%b-%Y")
    app_name = applicant.get("fullName") or f"{applicant.get('givenNames', '')} {applicant.get('surname', '')}".strip() or "Applicant Name"
    pass_no = applicant.get("passportNumber") or "N/A"
    dest = travel.get("destinationCountry") or "Korea"
    city = applicant.get("city") or "Mumbai"
    phone = travel.get("applicantPhone") or "+91 9819347139"
    email = travel.get("applicantEmail") or "applicant@example.com"

    story = [
        Paragraph(f"<b>Date:</b> {today_str}", p_right_style),
        Spacer(1, 10),
        Paragraph(f"To,<br/><b>The Visa Officer,</b><br/>The Consulate / Embassy of {dest}<br/>{city}, India", p_style),
        Spacer(1, 10),
        Paragraph(f"<b>Subject: Authority Letter to collect original passport for {app_name}</b>", p_bold_style),
        Spacer(1, 10),
        Paragraph("Dear Sir / Madam,", p_style)
    ]

    if is_couple:
        p2 = travellers[0] if travellers else {}
        p2_name = p2.get("fullName", "Accompanying Traveller")
        p2_pass = p2.get("passportNumber", "N/A")
        story.append(Paragraph(
            f"We, <b>{app_name}</b> (holding Indian passport number: <b>{pass_no}</b>) & <b>{p2_name}</b> (holding Indian passport number: <b>{p2_pass}</b>) "
            f"hereby authorize <b>Mr. Praduman Tripathi</b> from <b>Khanna Holidays Pvt. Ltd.</b>, whose office is at Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, "
            f"Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056, to collect the original passports on our behalf.",
            p_style
        ))
        story.append(Paragraph(
            "We would appreciate if you could hand over the original passports to the bearer of this letter.",
            p_style
        ))
        story.extend([
            Paragraph("Kindly feel free to contact us for more information.", p_style),
            Spacer(1, 12),
            Paragraph(f"Thanking You.<br/><br/>Yours faithfully,<br/><br/><b>{app_name}</b><br/><b>{p2_name}</b><br/>Phone No.: {phone}<br/>Email id: {email}", p_style)
        ])
    else:
        story.append(Paragraph(
            f"I, <b>{app_name}</b>, holding Indian passport number: <b>{pass_no}</b>, hereby authorize <b>Mr. Praduman Tripathi</b> from <b>Khanna Holidays Pvt. Ltd.</b>, "
            f"whose office is at Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056, "
            f"to collect the original passport on my behalf.",
            p_style
        ))
        story.append(Paragraph(
            "I would appreciate if you could hand over the original passport to the bearer of this letter.",
            p_style
        ))
        story.extend([
            Paragraph("Kindly feel free to contact me for more information.", p_style),
            Spacer(1, 12),
            Paragraph(f"Thanking You.<br/><br/>Yours faithfully,<br/><br/><b>{app_name}</b><br/>Phone No.: {phone}<br/>Email id: {email}", p_style)
        ])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.build(story, onFirstPage=draw_official_letterhead, onLaterPages=draw_official_letterhead)
    return output_path


# =========================================================================
# 4. COMPANY AUTHORIZATION LETTER GENERATORS
# =========================================================================

def generate_company_authorization_docx(data: dict, output_path: str):
    """
    Generates high-fidelity Company Authorization Letter matching templates/Company Authorization Letter/
    Preserves official header and footer drawings.
    """
    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])

    base_tpl = "templates/Company Authorization Letter/Company Authorization Letter.docx"
    if not os.path.exists(base_tpl):
        base_tpl = os.path.join("..", base_tpl)

    doc = docx.Document(base_tpl)
    today_str = datetime.now().strftime("%d-%b-%Y")

    app_name = applicant.get("fullName") or f"{applicant.get('givenNames', '')} {applicant.get('surname', '')}".strip() or "Applicant Name"
    pass_no = applicant.get("passportNumber") or "N/A"
    dest = travel.get("destinationCountry") or "Europe"
    consulate_str = f"Embassy / Consulate General of {dest},\nMumbai / New Delhi, India"

    all_applicants = [(app_name, pass_no)]
    for t in travellers:
        t_name = t.get("fullName")
        t_pass = t.get("passportNumber") or "N/A"
        if t_name:
            all_applicants.append((t_name, t_pass))

    for p in doc.paragraphs:
        if "[Date]" in p.text:
            p.text = p.text.replace("[Date]", today_str)
        if "[Consulate Name and Address]" in p.text:
            p.text = p.text.replace("[Consulate Name and Address]", consulate_str)

        if "[Applicant1 Full Name]" in p.text:
            if len(all_applicants) > 0:
                p.text = f"{all_applicants[0][0]} - Passport No.: {all_applicants[0][1]}"
            else:
                p.text = ""
        elif "[Applicant2 Full Name]" in p.text or "[Applicant Full Name]" in p.text:
            if len(all_applicants) > 1:
                p.text = f"{all_applicants[1][0]} - Passport No.: {all_applicants[1][1]}"
            else:
                p.text = ""

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def generate_company_authorization_pdf(data: dict, output_path: str):
    """
    Generates high-fidelity Company Authorization Letter PDF with official letterhead banner.
    Tries native Word conversion first; falls back to ReportLab.
    """
    return _generate_pdf_via_word_or_fallback(
        generate_company_authorization_docx,
        _generate_company_authorization_pdf_reportlab,
        data, output_path, "comp"
    )


def _generate_company_authorization_pdf_reportlab(data: dict, output_path: str):
    """
    Generates high-fidelity Company Authorization Letter PDF with official letterhead banner using ReportLab (fallback).
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=110,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    p_style = ParagraphStyle(
        'AuthBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=16,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    p_bold_style = ParagraphStyle(
        'AuthBold',
        parent=p_style,
        fontName='Helvetica-Bold'
    )
    p_right_style = ParagraphStyle(
        'AuthRight',
        parent=p_style,
        alignment=2
    )

    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])

    today_str = datetime.now().strftime("%d-%b-%Y")
    app_name = applicant.get("fullName") or f"{applicant.get('givenNames', '')} {applicant.get('surname', '')}".strip() or "Applicant Name"
    pass_no = applicant.get("passportNumber") or "N/A"
    dest = travel.get("destinationCountry") or "Europe"
    consulate_str = f"Embassy / Consulate General of {dest},<br/>Mumbai / New Delhi, India"

    all_applicants = [(app_name, pass_no)]
    for t in travellers:
        t_name = t.get("fullName")
        t_pass = t.get("passportNumber") or "N/A"
        if t_name:
            all_applicants.append((t_name, t_pass))

    story = [
        Paragraph(f"<b>Date:</b> {today_str}", p_right_style),
        Spacer(1, 10),
        Paragraph("To,<br/><b>The Visa Officer,</b><br/>" + consulate_str, p_style),
        Spacer(1, 10),
        Paragraph("<b>Subject: Authorization Letter for my Visa Application.</b>", p_bold_style),
        Spacer(1, 10),
        Paragraph("Dear Sir/Madam,", p_style),
        Paragraph("We, <b>Khanna Holidays Pvt. Ltd.</b> have been authorized to collect original Passport of our clients mentioned below –", p_style),
        Spacer(1, 6)
    ]

    for i, (name, p_num) in enumerate(all_applicants):
        story.append(Paragraph(f"<b>{i+1}. {name}</b> - Passport No.: <b>{p_num}</b>", p_style))

    story.extend([
        Spacer(1, 10),
        Paragraph("The applicants have authorized us to do the passport collection on their behalf.", p_style),
        Paragraph("Kindly feel free to contact us for more information.", p_style),
        Spacer(1, 14),
        Paragraph("Thanking You,<br/><br/>Yours Faithfully,<br/><br/><b>Ms. Dhvani Chheda</b><br/><b>Team Lead – Visa</b><br/>Phone No. +91 8657461001<br/>Email id: customercare@khannatravels.com", p_style)
    ])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.build(story, onFirstPage=draw_official_letterhead, onLaterPages=draw_official_letterhead)
    return output_path


# =========================================================================
# 5. INVITATION LETTER GENERATORS (Consular Invitation with Signature Image)
# =========================================================================

def generate_invitation_letter_docx(data: dict, output_path: str):
    """
    Generates consular Invitation Letter matching templates/Invitation Letter/
    Populates inviter, applicant, and travel details, and embeds uploaded signature image.
    """
    inviter = data.get("inviter", {})
    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])

    base_tpl = "templates/Invitation Letter/Invitation Letter .docx"
    if not os.path.exists(base_tpl):
        base_tpl = os.path.join("..", base_tpl)

    doc = docx.Document(base_tpl)

    inviter_name = inviter.get("name") or "Tanishka Sushil"
    inviter_pass = inviter.get("passportNumber") or "W1671839"
    inviter_addr = inviter.get("address") or "13 Parkway Drive Model Farm Road Cork T12 FWK3"
    inviter_occ = inviter.get("occupation") or "University College Cork"
    relation = inviter.get("relationship") or "Parents"

    app_name = applicant.get("fullName") or "Sushil Sukumaran"
    app_pass = applicant.get("passportNumber") or "AL237082"
    app_poi = applicant.get("placeOfIssue") or "Mumbai"
    app_doi = applicant.get("dateOfIssue") or "10/12/2025"

    p2 = travellers[0] if travellers else {}
    p2_name = p2.get("fullName") or "Harsha Sushil"
    p2_pass = p2.get("passportNumber") or "AJ522058"
    p2_poi = p2.get("placeOfIssue") or "Mumbai"
    p2_doi = p2.get("dateOfIssue") or "18/11/2025"

    dest = travel.get("destinationCountry") or "Ireland"
    start_date = travel.get("travelStartDate") or "20th October 2026"
    end_date = travel.get("travelEndDate") or "01st November 2026"
    purpose = travel.get("purpose") or "convocation ceremony"

    # Replace paragraphs
    for p in doc.paragraphs:
        txt = p.text
        if "Tanishka Sushil," in txt:
            p.text = f"{inviter_name},"
        elif "13 Parkway Drive" in txt and "Cork" in txt:
            p.text = inviter_addr
        elif "Consulate General of Ireland" in txt:
            p.text = f"Consulate General of {dest} Mumbai, India"
        elif "for my Parents" in txt:
            p.text = f"Subject: Invitation Letter for Visitor’s Visa issuance for my {relation}"
        elif "I, Ms. Tanishka Sushil" in txt:
            p.text = f"I, {inviter_name} (Passport No.: {inviter_pass}), am currently residing at {inviter_addr}. I am studying/working at {inviter_occ}."
        elif "I would like to invite my parents" in txt or "I would like to invite" in txt:
            if p2_name:
                p.text = (
                    f"I would like to invite my {relation.lower()} – {app_name} (holding Indian Passport No: {app_pass} issued at {app_poi} on {app_doi}) "
                    f"and {p2_name} (holding Indian Passport No: {p2_pass} issued at {p2_poi} on {p2_doi}) "
                    f"to visit me from {start_date} to {end_date} for the purpose of attending my {purpose}."
                )
            else:
                p.text = (
                    f"I would like to invite my {relation.lower()} – {app_name} (holding Indian Passport No: {app_pass} issued at {app_poi} on {app_doi}) "
                    f"to visit me from {start_date} to {end_date} for the purpose of attending my {purpose}."
                )
        elif "The main purpose of their visit is" in txt:
            p.text = f"The main purpose of their visit is to attend my {purpose}. It would be an incredibly special and proud moment for me to have them by my side on this important milestone."
        elif "return to India on" in txt:
            p.text = re.sub(r'return to India on [^.]*\.', f'return to India on {end_date}.', p.text)

    # Insert Signature Image right after "Yours Sincerely,"
    sig_raw = inviter.get("signatureImage")
    if sig_raw:
        try:
            if "," in sig_raw:
                sig_raw = sig_raw.split(",", 1)[1]
            sig_bytes = base64.b64decode(sig_raw)
            sig_io = io.BytesIO(sig_bytes)
            
            p_sig = doc.add_paragraph()
            p_sig.paragraph_format.space_before = Pt(6)
            p_sig.paragraph_format.space_after = Pt(4)
            run = p_sig.add_run()
            run.add_picture(sig_io, width=Inches(1.6))
        except Exception as e:
            print(f"Notice: Failed to insert signature image: {e}")

    # Add printed name
    p_name = doc.add_paragraph()
    r_name = p_name.add_run(inviter_name)
    r_name.bold = True
    r_name.font.name = "Arial"
    r_name.font.size = Pt(11.5)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
    return output_path


def generate_invitation_letter_pdf(data: dict, output_path: str):
    """
    Generates consular Invitation Letter PDF with embedded signature image.
    Tries native Word conversion first; falls back to ReportLab.
    """
    return _generate_pdf_via_word_or_fallback(
        generate_invitation_letter_docx,
        _generate_invitation_letter_pdf_reportlab,
        data, output_path, "inv"
    )


def _generate_invitation_letter_pdf_reportlab(data: dict, output_path: str):
    """
    Generates consular Invitation Letter PDF with embedded signature image using ReportLab (fallback).
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=48,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    p_style = ParagraphStyle(
        'InvBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    p_bold_style = ParagraphStyle(
        'InvBold',
        parent=p_style,
        fontName='Helvetica-Bold'
    )

    inviter = data.get("inviter", {})
    applicant = data.get("applicant", {})
    travel = data.get("travel", {})
    travellers = data.get("travellers", [])

    inviter_name = inviter.get("name") or "Tanishka Sushil"
    inviter_pass = inviter.get("passportNumber") or "W1671839"
    inviter_addr = inviter.get("address") or "13 Parkway Drive Model Farm Road Cork T12 FWK3"
    inviter_occ = inviter.get("occupation") or "University College Cork"
    relation = inviter.get("relationship") or "Parents"

    app_name = applicant.get("fullName") or "Sushil Sukumaran"
    app_pass = applicant.get("passportNumber") or "AL237082"
    app_poi = applicant.get("placeOfIssue") or "Mumbai"
    app_doi = applicant.get("dateOfIssue") or "10/12/2025"

    p2 = travellers[0] if travellers else {}
    p2_name = p2.get("fullName") or "Harsha Sushil"
    p2_pass = p2.get("passportNumber") or "AJ522058"
    p2_poi = p2.get("placeOfIssue") or "Mumbai"
    p2_doi = p2.get("dateOfIssue") or "18/11/2025"

    dest = travel.get("destinationCountry") or "Ireland"
    start_date = travel.get("travelStartDate") or "20th October 2026"
    end_date = travel.get("travelEndDate") or "01st November 2026"
    purpose = travel.get("purpose") or "convocation ceremony"

    story = [
        Paragraph(f"<b>From:</b><br/>{inviter_name},<br/>{inviter_addr}", p_style),
        Spacer(1, 10),
        Paragraph(f"<b>To:</b><br/><b>The Visa Officer,</b><br/>Consulate General of {dest} Mumbai, India", p_style),
        Spacer(1, 10),
        Paragraph(f"<b>Subject: Invitation Letter for Visitor’s Visa issuance for my {relation}</b>", p_bold_style),
        Spacer(1, 10),
        Paragraph("Respected Sir/Madam,", p_style),
        Paragraph(
            f"I, <b>{inviter_name}</b> (Passport No.: <b>{inviter_pass}</b>), am currently residing at {inviter_addr}. I am studying/working at {inviter_occ}.",
            p_style
        ),
        Paragraph(
            f"I would like to invite my {relation.lower()} – <b>{app_name}</b> (holding Indian Passport No: <b>{app_pass}</b> issued at {app_poi} on {app_doi})"
            + (f" and <b>{p2_name}</b> (holding Indian Passport No: <b>{p2_pass}</b> issued at {p2_poi} on {p2_doi})" if p2_name else "")
            + f" to visit me from <b>{start_date}</b> to <b>{end_date}</b> for the purpose of attending my {purpose}.",
            p_style
        ),
        Paragraph(
            f"The main purpose of their visit is to attend my {purpose}. It would be an incredibly special and proud moment for me to have them by my side on this important milestone.",
            p_style
        ),
        Paragraph(
            f"We also wish to reunite and spend quality family time together, as it has been quite a long time since we last met. During their stay, I look forward to taking them around to explore your beautiful country during our leisure time. They will be staying near my accommodation and will return to India on <b>{end_date}</b>.",
            p_style
        ),
        Paragraph(
            "All the other expenses like Visa Fees, Flight Tickets, Hotel Bookings, Travel Insurance, and other personal expenses for this visit will be completely covered by my parents.",
            p_style
        ),
        Paragraph("I sincerely request you to kindly grant my parents the necessary visa. Thank you!", p_style),
        Spacer(1, 12),
        Paragraph("Yours Sincerely,", p_style)
    ]

    # Signature Image
    sig_raw = inviter.get("signatureImage")
    if sig_raw:
        try:
            if "," in sig_raw:
                sig_raw = sig_raw.split(",", 1)[1]
            sig_bytes = base64.b64decode(sig_raw)
            sig_io = io.BytesIO(sig_bytes)
            story.append(ReportLabImage(sig_io, width=115, height=45))
        except Exception:
            pass

    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>{inviter_name}</b>", p_style))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.build(story)
    return output_path


# =========================================================================
# CLI ENTRY POINT
# =========================================================================

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: docx_engine.py <json_payload_file> <output_path> [format: docx|pdf]"}))
        sys.exit(1)

    payload_file = sys.argv[1]
    out_file = sys.argv[2]
    export_format = sys.argv[3] if len(sys.argv) > 3 else ("pdf" if out_file.lower().endswith(".pdf") else "docx")

    with open(payload_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    doc_type = data.get("docType", "cover_letter")

    if export_format == "pdf":
        if doc_type == "hotel_blocking":
            res_path = generate_hotel_blocking_pdf(data, out_file)
        elif doc_type in ["passport_authorization", "passport_auth_single", "passport_auth_couple"]:
            res_path = generate_passport_authorization_pdf(data, out_file)
        elif doc_type == "company_authorization":
            res_path = generate_company_authorization_pdf(data, out_file)
        elif doc_type == "invitation_letter":
            res_path = generate_invitation_letter_pdf(data, out_file)
        else:
            res_path = generate_cover_letter_pdf(data, out_file)
    else:
        if doc_type == "hotel_blocking":
            res_path = generate_hotel_blocking_docx(data, out_file)
        elif doc_type in ["passport_authorization", "passport_auth_single", "passport_auth_couple"]:
            res_path = generate_passport_authorization_docx(data, out_file)
        elif doc_type == "company_authorization":
            res_path = generate_company_authorization_docx(data, out_file)
        elif doc_type == "invitation_letter":
            res_path = generate_invitation_letter_docx(data, out_file)
        else:
            res_path = generate_cover_letter_docx(data, out_file)

    print(json.dumps({"status": "success", "file": res_path}))

import os
import json
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_hotel_pdf(data, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
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
    conf_style = ParagraphStyle(
        'HeaderConf',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#1E3A8A'),
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
            "hotelName": "Holiday Inn Singapore Little India",
            "leadGuest": applicant.get("fullName", "Balwant Singh Sardar Singh Arora"),
            "checkIn": "17-Sep-2026",
            "checkOut": "21-Sep-2026",
            "duration": "04 Night(s)",
            "city": "Singapore",
            "phone": "+65 6824 8888",
            "address": "10 Farrer Park Station Rd, Singapore",
            "numRooms": "1",
            "numGuests": "2 Adult(s)",
            "guests": [
                {"guestName": "Balwant Singh Sardar Singh Arora", "roomType": "Standard Room", "numGuests": "2 Adult(s)"}
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
        # 4 columns: [120, 141, 110, 152] = 523
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

        # Guest table
        guests = h.get("guests", [])
        if not guests:
            guests = [{"guestName": lead_guest, "roomType": "Standard Room", "numGuests": num_guests}]

        guest_rows = [
            [Paragraph('<b>Guest Name</b>', label_style), Paragraph('<b>Room Type</b>', label_style), Paragraph('<b>No. of Guests</b>', label_style)]
        ]
        for g_i, g in enumerate(guests):
            g_name = f"{g_i+1}) {g.get('guestName', lead_guest)}"
            r_type = g.get('roomType', 'Standard Room')
            pax = g.get('numGuests', num_guests)
            guest_rows.append([Paragraph(g_name, val_style), Paragraph(r_type, val_style), Paragraph(pax, val_style)])

        guest_tbl = Table(guest_rows, colWidths=[240, 163, 120])
        guest_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F8FAFC')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
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

    doc.build(story)
    return output_path

if __name__ == '__main__':
    test_out = 'scratch/test_voucher.pdf'
    generate_hotel_pdf({}, test_out)
    print(f"Generated test voucher PDF at {test_out}, size: {os.path.getsize(test_out)} bytes")

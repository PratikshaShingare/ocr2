/**
 * Vercel Serverless Function: POST /api/export/pdf
 * High-Fidelity PDF Generation Engine for Vercel Live Deployment.
 * Implemented in pure JavaScript via 'pdf-lib' (zero external C++ dependencies, 100% cloud native).
 */

const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

function getLetterheadBannerBuffer() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'assets/logo/khanna_letterhead_banner.jpg'),
    path.resolve(__dirname, '../../assets/logo/khanna_letterhead_banner.jpg'),
    path.resolve(__dirname, '../assets/logo/khanna_letterhead_banner.jpg')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  }
  return null;
}

function drawOfficialFooter(page, font, boldFont) {
  // Left Box: Head Office (Blue)
  page.drawRectangle({
    x: 36,
    y: 28,
    width: 255,
    height: 44,
    color: rgb(0.94, 0.97, 1.0),
    borderColor: rgb(0.0, 0.23, 0.48),
    borderWidth: 1
  });
  page.drawText('Head Office: KHANNA HOLIDAYS PVT. LTD.', {
    x: 42,
    y: 58,
    size: 7,
    font: boldFont,
    color: rgb(0.0, 0.23, 0.48)
  });
  page.drawText('Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Rd, Sanpada', {
    x: 42,
    y: 46,
    size: 6.2,
    font,
    color: rgb(0.25, 0.3, 0.38)
  });
  page.drawText('Navi Mumbai - 400705 • Tel: +91 22 4155 5555', {
    x: 42,
    y: 35,
    size: 6.2,
    font,
    color: rgb(0.25, 0.3, 0.38)
  });

  // Right Box: Front Office (Red)
  page.drawRectangle({
    x: 304,
    y: 28,
    width: 255,
    height: 44,
    color: rgb(0.99, 0.95, 0.95),
    borderColor: rgb(0.88, 0.19, 0.19),
    borderWidth: 1
  });
  page.drawText('Front Office:', {
    x: 310,
    y: 58,
    size: 7,
    font: boldFont,
    color: rgb(0.88, 0.19, 0.19)
  });
  page.drawText('Shop No. 19, Seawoods Garden, Palm Beach Rd, Sector 17, Sanpada East', {
    x: 310,
    y: 46,
    size: 6.2,
    font,
    color: rgb(0.25, 0.3, 0.38)
  });
  page.drawText('Navi Mumbai - 400705 • customercare@khannatravels.com', {
    x: 310,
    y: 35,
    size: 6.2,
    font,
    color: rgb(0.25, 0.3, 0.38)
  });
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');
      const docType = data.docType || 'cover_letter';
      const applicant = data.applicant || {};
      const travel = data.travel || {};

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const bannerBuf = getLetterheadBannerBuffer();
      let currentY = 790;

      // Draw Letterhead Header Banner
      if (bannerBuf && docType !== 'cover_letter') {
        const bannerImg = await pdfDoc.embedJpg(bannerBuf);
        page.drawImage(bannerImg, { x: 36, y: 745, width: 523, height: 75 });
        currentY = 720;
      }

      // Title
      let title = 'VISA DOCUMENTATION';
      let filename = 'document.pdf';

      if (docType === 'hotel_blocking') {
        title = 'HOTEL BOOKING CONFIRMATION';
        filename = `${applicant.fullName || 'Guest'}_Hotel_Confirmation.pdf`;
      } else if (docType === 'cover_letter') {
        title = 'VISA COVER LETTER';
        filename = `${applicant.fullName || 'Applicant'}_Cover_Letter.pdf`;
      } else if (docType.includes('passport_auth')) {
        title = 'PASSPORT AUTHORIZATION LETTER';
        filename = `${applicant.fullName || 'Applicant'}_Passport_Auth.pdf`;
      } else if (docType === 'company_authorization') {
        title = 'COMPANY AUTHORIZATION LETTER';
        filename = `${applicant.fullName || 'Applicant'}_Company_Authorization.pdf`;
      } else if (docType === 'invitation_letter') {
        title = 'CONSULAR INVITATION LETTER';
        filename = `${applicant.fullName || 'Applicant'}_Invitation_Letter.pdf`;
      }

      page.drawText(title, {
        x: 36,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0.0, 0.23, 0.48)
      });
      currentY -= 20;

      // Date
      page.drawText(`Date: ${new Date().toLocaleDateString('en-GB')}`, {
        x: 450,
        y: currentY,
        size: 9,
        font,
        color: rgb(0.3, 0.3, 0.3)
      });
      currentY -= 25;

      // Document specific content
      if (docType === 'hotel_blocking') {
        const hotel = (data.hotels && data.hotels[0]) || {};
        const confNo = hotel.confirmationNumber || data.confirmationNumber || 'KH-VOUCHER';
        const hName = hotel.hotelName || data.hotelName || 'Selected Hotel';
        const lead = hotel.leadGuest || applicant.fullName || 'Lead Guest';
        const checkIn = hotel.checkIn || 'TBD';
        const checkOut = hotel.checkOut || 'TBD';
        const duration = hotel.duration || 'Nights Confirmed';

        // Draw 6 Highlighted Fields Box
        page.drawRectangle({
          x: 36,
          y: currentY - 100,
          width: 523,
          height: 100,
          color: rgb(0.88, 0.97, 0.98),
          borderColor: rgb(0.02, 0.71, 0.83),
          borderWidth: 1
        });

        page.drawText(`Confirmation Number: ${confNo}`, { x: 50, y: currentY - 20, size: 10, font: boldFont, color: rgb(0.03, 0.2, 0.27) });
        page.drawText(`Hotel Name: ${hName}`, { x: 50, y: currentY - 38, size: 10, font: boldFont, color: rgb(0.03, 0.2, 0.27) });
        page.drawText(`Lead Guest: ${lead}`, { x: 50, y: currentY - 56, size: 9.5, font, color: rgb(0.03, 0.2, 0.27) });
        page.drawText(`Check-In: ${checkIn}   |   Check-Out: ${checkOut}`, { x: 50, y: currentY - 74, size: 9.5, font, color: rgb(0.03, 0.2, 0.27) });
        page.drawText(`Duration of Stay: ${duration}`, { x: 50, y: currentY - 92, size: 9.5, font, color: rgb(0.03, 0.2, 0.27) });

        currentY -= 130;

        // Guest Allocation Details
        page.drawText('Guest Room Allocation:', { x: 36, y: currentY, size: 11, font: boldFont, color: rgb(0.0, 0.23, 0.48) });
        currentY -= 18;

        // Table Header
        page.drawRectangle({ x: 36, y: currentY - 15, width: 523, height: 18, color: rgb(0.0, 0.23, 0.48) });
        page.drawText('Guest Name', { x: 44, y: currentY - 10, size: 8.5, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText('Room Type', { x: 260, y: currentY - 10, size: 8.5, font: boldFont, color: rgb(1, 1, 1) });
        page.drawText('No. of Guests', { x: 440, y: currentY - 10, size: 8.5, font: boldFont, color: rgb(1, 1, 1) });
        currentY -= 20;

        const guests = hotel.guests && hotel.guests.length > 0
          ? hotel.guests
          : [{ guestName: lead, roomType: 'Standard Room', noOfGuests: '1 Adult(s)' }];

        guests.forEach((g, i) => {
          if (i % 2 === 1) {
            page.drawRectangle({ x: 36, y: currentY - 12, width: 523, height: 16, color: rgb(0.97, 0.98, 0.99) });
          }
          page.drawText(g.guestName || lead, { x: 44, y: currentY - 8, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(g.roomType || 'Standard Room', { x: 260, y: currentY - 8, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(g.noOfGuests || g.numGuests || '1 Adult(s)', { x: 440, y: currentY - 8, size: 8, font, color: rgb(0.1, 0.1, 0.1) });
          currentY -= 16;
        });

        currentY -= 20;
        page.drawText('Status: Confirmed and Guaranteed for Visa Application Processing.', { x: 36, y: currentY, size: 9, font: boldFont, color: rgb(0.02, 0.59, 0.41) });

      } else {
        // General text block for Cover Letter & Authorizations
        page.drawText(`Applicant: ${applicant.fullName || 'Applicant Name'}`, { x: 36, y: currentY, size: 10, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
        currentY -= 16;
        page.drawText(`Passport Number: ${applicant.passportNumber || ''}`, { x: 36, y: currentY, size: 9.5, font, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 16;
        page.drawText(`Destination: ${travel.destinationCountry || 'Schengen / Europe'}`, { x: 36, y: currentY, size: 9.5, font, color: rgb(0.2, 0.2, 0.2) });
        currentY -= 24;

        if (docType === 'cover_letter') {
          page.drawText('Subject: Application for Tourist Visa', { x: 36, y: currentY, size: 10, font: boldFont, color: rgb(0.0, 0.23, 0.48) });
          currentY -= 20;
          page.drawText('Respected Sir/Madam,', { x: 36, y: currentY, size: 9.5, font, color: rgb(0.1, 0.1, 0.1) });
          currentY -= 18;
          page.drawText(`I hereby submit my application for a tourist visa to visit ${travel.destinationCountry || 'the destination country'}.`, { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 16;
          page.drawText('All travel, flight, accommodation, and medical insurance expenses are fully borne by myself.', { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 16;
          page.drawText('I hold strong family, social, and economic ties in India and will return promptly upon trip completion.', { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        } else if (docType.includes('passport_auth')) {
          page.drawText('Subject: Letter of Authorization for Passport Submission and Collection', { x: 36, y: currentY, size: 10, font: boldFont, color: rgb(0.0, 0.23, 0.48) });
          currentY -= 20;
          page.drawText(`I/We hereby authorize Mr. Praduman Tripathi, representative of KHANNA HOLIDAYS PVT. LTD.,`, { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 16;
          page.drawText('to submit my visa application and collect my passport upon completion on my behalf.', { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        } else if (docType === 'company_authorization') {
          page.drawText('To Whom It May Concern,', { x: 36, y: currentY, size: 10, font: boldFont, color: rgb(0.0, 0.23, 0.48) });
          currentY -= 20;
          page.drawText(`This is to certify that KHANNA HOLIDAYS PVT. LTD. has been officially appointed`, { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
          currentY -= 16;
          page.drawText(`to manage visa processing and documentation for our client, ${applicant.fullName || 'Applicant'}.`, { x: 36, y: currentY, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
        }
      }

      // Draw Official Two-Box Footer
      drawOfficialFooter(page, font, boldFont);

      const pdfBytes = await pdfDoc.save();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', pdfBytes.length);
      res.end(Buffer.from(pdfBytes));
    } catch (err) {
      console.error('PDF Export Error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `PDF Generation Failed: ${err.message}` }));
    }
  });
};

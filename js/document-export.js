/**
 * Khanna Travels & Holidays — Document Export & Summary
 * (js/document-export.js)
 */

/**
 * Prepares the final summary view in Step 7.
 */
function prepareFinalOutputSummary() {
  const summaryEl = document.getElementById('finalSummaryContent');
  if (!summaryEl) return;

  const app = AppStore.applicant;
  const travel = AppStore.travel;
  const travellers = AppStore.travellers;
  const hotels = AppStore.hotels;

  summaryEl.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 20px;">
      <div style="background-color: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Primary Applicant</p>
        <p style="font-size: 1rem; font-weight: 700; color: var(--primary-navy);">${escapeHTML(app.fullName || 'Not provided')}</p>
        <p style="font-size: 0.82rem; color: var(--text-muted);">Passport: <strong>${escapeHTML(app.passportNumber || 'N/A')}</strong></p>
      </div>

      <div style="background-color: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Destination & Travel</p>
        <p style="font-size: 1rem; font-weight: 700; color: var(--primary-navy);">${escapeHTML(travel.destinationCountry || 'Schengen')}</p>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${escapeHTML(travel.travelStartDate || 'TBD')} → ${escapeHTML(travel.travelEndDate || 'TBD')}</p>
      </div>

      <div style="background-color: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Travellers</p>
        <p style="font-size: 1rem; font-weight: 700; color: var(--primary-navy);">${travellers.length + 1} Passenger(s)</p>
        <p style="font-size: 0.82rem; color: var(--text-muted);">1 Primary + ${travellers.length} Accompanying</p>
      </div>

      <div style="background-color: var(--bg-main); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
        <p style="font-size: 0.76rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Hotel Stays</p>
        <p style="font-size: 1rem; font-weight: 700; color: var(--primary-navy);">${hotels.length} Hotel Stay(s)</p>
        <p style="font-size: 0.82rem; color: var(--text-muted);">${hotels.map(h => escapeHTML(h.hotelName)).filter(Boolean).join(', ') || 'No hotel stays'}</p>
      </div>
    </div>
  `;
}

/**
 * Downloads Cover Letter as Word document.
 */
async function downloadCoverLetterDocx() {
  showToast('Preparing Word document export...', 'info');

  const editorEl = document.getElementById('standaloneCoverLetterEditor') || document.getElementById('coverLetterEditor');
  const payload = {
    docType: 'cover_letter',
    template: AppStore.coverLetter.templateType || 'Europe',
    html: editorEl?.innerHTML || AppStore.coverLetter.renderedHtml,
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers,
    hotels: AppStore.hotels
  };

  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Cover_Letter.docx`);
      showToast('Word document downloaded successfully.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend export unavailable, using HTML-to-Word download:', err);
  }

  // Fallback client-side download as .doc / HTML Word file
  downloadAsHtmlWord(payload.html, `${AppStore.applicant.fullName || 'Applicant'}_Cover_Letter.doc`);
}

/**
 * Downloads Cover Letter as PDF.
 */
async function downloadCoverLetterPdf() {
  showToast('Preparing PDF export...', 'info');

  const editorEl = document.getElementById('standaloneCoverLetterEditor') || document.getElementById('coverLetterEditor');
  const payload = {
    docType: 'cover_letter',
    template: AppStore.coverLetter.templateType || 'Europe',
    html: editorEl?.innerHTML || AppStore.coverLetter.renderedHtml,
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers,
    hotels: AppStore.hotels
  };

  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Cover_Letter.pdf`);
      showToast('PDF downloaded successfully.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend PDF unavailable, launching browser print-to-PDF:', err);
  }

  // Fallback: Print dialog styled specifically for A4 PDF export
  const printId = editorEl ? editorEl.id : 'coverLetterEditor';
  printElementToPdf(printId, 'Visa Cover Letter');
}

/**
 * Downloads Passport Authorization Letter as Word document (Single or Couple/Multiple).
 */
async function downloadPassportAuthDocx(subType = 'single') {
  const isCouple = subType === 'couple';
  showToast(`Preparing Passport Authorization Letter (${isCouple ? 'Couple/Multiple' : 'Single'})...`, 'info');

  const payload = {
    docType: isCouple ? 'passport_auth_couple' : 'passport_auth_single',
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      const fn = `${AppStore.applicant.fullName || 'Applicant'}_Passport_Auth_${isCouple ? 'Couple' : 'Single'}.docx`;
      triggerBlobDownload(blob, fn);
      showToast('Passport Authorization Letter downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for passport auth docx:', err);
    showToast('Word export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Passport Authorization Letter as PDF (Single or Couple/Multiple).
 */
async function downloadPassportAuthPdf(subType = 'single') {
  const isCouple = subType === 'couple';
  showToast(`Preparing Passport Authorization PDF (${isCouple ? 'Couple/Multiple' : 'Single'})...`, 'info');

  const payload = {
    docType: isCouple ? 'passport_auth_couple' : 'passport_auth_single',
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      const fn = `${AppStore.applicant.fullName || 'Applicant'}_Passport_Auth_${isCouple ? 'Couple' : 'Single'}.pdf`;
      triggerBlobDownload(blob, fn);
      showToast('Passport Authorization PDF downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for passport auth pdf:', err);
    showToast('PDF export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Company Authorization Letter as Word document.
 */
async function downloadCompanyAuthDocx() {
  showToast('Preparing Company Authorization Letter (.docx)...', 'info');

  const payload = {
    docType: 'company_authorization',
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Company_Authorization.docx`);
      showToast('Company Authorization Letter downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for company auth docx:', err);
    showToast('Word export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Company Authorization Letter as PDF.
 */
async function downloadCompanyAuthPdf() {
  showToast('Preparing Company Authorization Letter (PDF)...', 'info');

  const payload = {
    docType: 'company_authorization',
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Company_Authorization.pdf`);
      showToast('Company Authorization PDF downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for company auth pdf:', err);
    showToast('PDF export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Consular Invitation Letter as Word document with embedded signature.
 */
async function downloadInvitationLetterDocx() {
  showToast('Preparing Consular Invitation Letter (.docx)...', 'info');

  const payload = {
    docType: 'invitation_letter',
    inviter: AppStore.inviter,
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Invitation_Letter.docx`);
      showToast('Consular Invitation Letter downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for invitation letter docx:', err);
    showToast('Word export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Consular Invitation Letter as PDF with embedded signature.
 */
async function downloadInvitationLetterPdf() {
  showToast('Preparing Consular Invitation Letter (PDF)...', 'info');

  const payload = {
    docType: 'invitation_letter',
    inviter: AppStore.inviter,
    applicant: AppStore.applicant,
    travel: AppStore.travel,
    travellers: AppStore.travellers
  };

  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Invitation_Letter.pdf`);
      showToast('Consular Invitation PDF downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for invitation letter pdf:', err);
    showToast('PDF export requires local backend runner.', 'warning');
  }
}

/**
 * Downloads Hotel Blocking document as Word (.docx).
 */
async function downloadHotelBlockingDocx() {
  showToast('Generating Hotel Blocking Word document...', 'info');

  const payload = {
    docType: 'hotel_blocking',
    applicant: AppStore.applicant,
    hotels: AppStore.hotels
  };

  try {
    const res = await fetch('/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Hotel_Blocking.docx`);
      showToast('Hotel Blocking Word document downloaded.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for hotel docx export:', err);
    showToast('Document generation requires local backend runner.', 'warning');
  }
}
/**
 * Downloads Hotel Blocking document as PDF.
 */
async function downloadHotelBlockingPdf() {
  showToast('Generating Hotel Blocking PDF...', 'info');

  const payload = {
    docType: 'hotel_blocking',
    applicant: AppStore.applicant,
    hotels: AppStore.hotels
  };

  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `${AppStore.applicant.fullName || 'Applicant'}_Hotel_Blocking.pdf`);
      showToast('Hotel Blocking PDF downloaded successfully.', 'success');
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable for hotel PDF export, using print fallback:', err);
  }

  // Fallback: Browser native print-to-PDF matching exact voucher format
  printHotelBlockingPdf(AppStore.hotels, AppStore.applicant);
}

/**
 * Fallback browser print-to-PDF matching official Khanna Travels hotel voucher format.
 */
function printHotelBlockingPdf(hotels, applicant) {
  const stays = (hotels && hotels.length > 0) ? hotels : [{
    confirmationNumber: 'TBHBV5YP9R',
    hotelName: 'Hotel Booking Confirmation',
    leadGuest: applicant.fullName || 'Lead Guest',
    checkIn: 'TBD',
    checkOut: 'TBD',
    duration: '1 Night(s)',
    city: '',
    phone: '+61 2 7255 2300',
    address: '',
    numRooms: '1',
    numGuests: '1 Adult(s)',
    guests: [{ guestName: applicant.fullName || 'Lead Guest', roomType: 'Standard Room', numGuests: '1 Adult(s)' }]
  }];

  let vouchersHtml = '';
  stays.forEach((h, idx) => {
    const confNo = escapeHTML(h.confirmationNumber || 'TBHBV5YP9R');
    const hotelName = escapeHTML(h.hotelName || 'Hotel Booking');
    const leadGuest = escapeHTML(h.leadGuest || applicant.fullName || 'Lead Guest');
    const checkIn = escapeHTML(h.checkIn || 'TBD');
    const checkOut = escapeHTML(h.checkOut || 'TBD');
    const duration = escapeHTML(h.duration || '1 Night(s)');
    const city = escapeHTML(h.city || '');
    const phone = escapeHTML(h.phone || '+61 2 7255 2300');
    const address = escapeHTML(h.address || '');
    const numRooms = escapeHTML(h.numRooms || '1');
    const numGuests = escapeHTML(h.numGuests || '1 Adult(s)');

    const guestsList = h.guests && h.guests.length > 0 ? h.guests : [{ guestName: leadGuest, roomType: 'Standard Room', numGuests }];
    const guestRowsHtml = guestsList.map((g, gi) => `
      <tr>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${gi + 1}) ${escapeHTML(g.guestName || leadGuest)}</td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${escapeHTML(g.roomType || 'Standard Room')}</td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${escapeHTML(g.numGuests || numGuests)}</td>
      </tr>
    `).join('');

    vouchersHtml += `
      <div style="margin-bottom: 24px; page-break-inside: avoid;">
        <!-- Official Letterhead Header Banner -->
        <div style="text-align: center; margin-bottom: 14px;">
          <img src="assets/logo/khanna_letterhead_banner.jpg" style="width: 100%; max-height: 80px; object-fit: contain;" alt="Khanna Holidays Letterhead Banner" />
        </div>

        <!-- Header Box -->
        <div style="background-color: #F8FAFC; border: 1px solid #CBD5E1; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px;">
          <p style="font-size: 11pt; color: #323232; margin: 0; line-height: 1.4;">
            Thanks for booking with us, your booking has been <strong>"Confirmed"</strong> with<br/>
            <strong>Confirmation Number- ${confNo}</strong>
          </p>
        </div>

        <!-- Booking Details Grid -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt;">
          <thead>
            <tr style="background-color: #F1F5F9;">
              <th colspan="4" style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; color: #55575A; font-weight: bold;">Booking details:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 22%; font-weight: bold; color: #333;">Service Booked:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 28%;">Hotel</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 20%; font-weight: bold; color: #333;">Hotel Name:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 30%;">${hotelName}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Lead Guest:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${leadGuest}</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">No Guest:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${guestsList.length}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">No of Rooms:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${numRooms}</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Phone No:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${phone}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Check-In:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold;">${checkIn}</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Checkout:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold;">${checkOut}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Duration:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${duration}</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">City:</td>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${city}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 6px 8px; font-weight: bold; color: #333;">Hotel Address:</td>
              <td colspan="3" style="border: 1px solid #CBD5E1; padding: 6px 8px;">${address}</td>
            </tr>
          </tbody>
        </table>

        <!-- Guest Details Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9.5pt;">
          <thead>
            <tr style="background-color: #F8FAFC;">
              <th style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; width: 45%; font-weight: bold;">Guest Name</th>
              <th style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; width: 30%; font-weight: bold;">Room Type</th>
              <th style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; width: 25%; font-weight: bold;">No. of Guests</th>
            </tr>
          </thead>
          <tbody>
            ${guestRowsHtml}
          </tbody>
        </table>

        <!-- Hotel Policy Box -->
        <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
          <thead>
            <tr style="background-color: #F1F5F9;">
              <th style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: left; color: #55575A; font-weight: bold;">Hotel Policy:</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #CBD5E1; padding: 8px; color: #55575A; line-height: 1.4;">
                Early check out will attract full cancellation charges.<br/>
                Please note that the cancellation policy is subject to change at any time. Rates are inclusive of all taxes.
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Official Two-Box Footer -->
        <div style="margin-top: 24px; padding-top: 10px; border-top: 2px solid #003B7A; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 8pt; font-family: Arial, sans-serif;">
          <div style="background: #f0f7ff; border: 1px solid #003B7A; border-left: 4px solid #003B7A; padding: 6px 10px; border-radius: 4px;">
            <strong style="color: #003B7A;">Head Office:</strong><br/>
            Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Rd, Sanpada East, Navi Mumbai - 400705<br/>
            <strong>KHANNA HOLIDAYS PVT. LTD.</strong> • Tel: +91 22 4155 5555
          </div>
          <div style="background: #fef2f2; border: 1px solid #e03131; border-left: 4px solid #e03131; padding: 6px 10px; border-radius: 4px;">
            <strong style="color: #e03131;">Front Office:</strong><br/>
            Shop No. 19, Seawoods Garden, Opp Moraj Residency, Palm Beach Rd, Sector 17, Sanpada East, Navi Mumbai - 400705<br/>
            Email: customercare@khannatravels.com
          </div>
        </div>
      </div>
    `;
  });

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Hotel Voucher — Khanna Travels &amp; Holidays</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Aptos, Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #323232; margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        ${vouchersHtml}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
/**
 * Helper to trigger browser download of a Blob.
 */
function triggerBlobDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 2500);
}

/**
 * Fallback to download formatted HTML as Word document (.doc).
 */
function downloadAsHtmlWord(htmlContent, filename) {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Cover Letter</title>
    <style>
      body { font-family: Calibri, 'Segoe UI', Arial; font-size: 11pt; line-height: 1.45; }
      table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
      th, td { border: 1px solid #777; padding: 6pt; text-align: left; }
      th { background-color: #eee; font-weight: bold; }
    </style>
    </head><body>
  `;
  const footer = "</body></html>";
  const sourceHTML = header + htmlContent + footer;
  const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
  triggerBlobDownload(blob, filename);
  showToast('Downloaded Word document.', 'success');
}

/**
 * Prints a container using browser native print dialog (Save as PDF).
 */
function printElementToPdf(elementId, title) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHTML(title)}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111; }
          table { width: 100%; border-collapse: collapse; margin: 14pt 0; font-size: 10pt; }
          th, td { border: 1px solid #666; padding: 6pt 8pt; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
        </style>
      </head>
      <body>
        ${el.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

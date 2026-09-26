/**
 * Khanna Travels & Holidays — Cover Letter Engine & WYSIWYG Editor
 * (js/cover-letter.js)
 * Supports 10 dedicated international consular formats:
 * 1. Schengen (Europe: France, Switzerland, Germany, Italy, Spain, etc.)
 * 2. Japan (Tokyo, Osaka, Kyoto, etc.)
 * 3. Singapore (ICA Consular Formats)
 * 4. United Kingdom (UKVI - Standard Visitor Visa)
 * 5. United States (US Embassy / B1-B2 Visa)
 * 6. Canada (IRCC Visitor Visa)
 * 7. Australia (Department of Home Affairs - Subclass 600)
 * 8. United Arab Emirates (Dubai / Abu Dhabi Tourist Visa)
 * 9. Turkey (Republic of Turkey Consular Mission)
 * 10. New Zealand (Immigration New Zealand)
 */

/**
 * Prepares and renders the initial cover letter when opened.
 */
function prepareAndRenderCoverLetter() {
  const templateType = document.getElementById('coverLetterTemplateSelect')?.value || 
                       document.getElementById('standaloneCoverLetterTplSelect')?.value || 
                       AppStore.coverLetter.templateType || 'Europe';
  AppStore.coverLetter.templateType = templateType;

  // Sync travel inputs from Step 5 if present
  if (typeof syncTravelInputsToStore === 'function') {
    syncTravelInputsToStore();
  }

  const generatedHtml = generateCoverLetterHTML(templateType);
  const editor = document.getElementById('coverLetterEditor');
  if (editor) {
    editor.innerHTML = generatedHtml;
    AppStore.coverLetter.renderedHtml = generatedHtml;
    AppStore.coverLetter.isEdited = false;
  }
}

/**
 * Switches template and re-populates document.
 */
function changeCoverLetterTemplate(templateType) {
  AppStore.coverLetter.templateType = templateType;
  prepareAndRenderCoverLetter();
  showToast(`Switched to ${templateType} visa cover letter format.`, 'info');
}

const OFFICIAL_LETTERHEAD_HEADER_HTML = `
  <div class="official-letterhead-header" style="margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #003B7A; text-align: center;">
    <img src="assets/logo/khanna_letterhead_banner.jpg" style="width: 100%; max-height: 85px; object-fit: contain;" alt="Khanna Holidays Letterhead Banner" />
  </div>
`;

const OFFICIAL_LETTERHEAD_FOOTER_HTML = `
  <div class="khanna-official-footer">
    <div class="khanna-footer-grid">
      <div class="khanna-footer-box khanna-footer-box--head">
        <div class="khanna-footer-title">Head Office:</div>
        Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Rd, Sanpada East, Navi Mumbai - 400705<br/>
        <strong>KHANNA HOLIDAYS PVT. LTD.</strong> • Tel: +91 22 4155 5555 • Sales@khannatravels.com
      </div>
      <div class="khanna-footer-box khanna-footer-box--front">
        <div class="khanna-footer-title">Front Office:</div>
        Shop No. 19, Seawoods Garden, Opp Moraj Residency, Palm Beach Rd, Sector 17, Sanpada East, Navi Mumbai - 400705<br/>
        Email: customercare@khannatravels.com • www.khannaholidays.com
      </div>
    </div>
  </div>
`;

/**
 * Generates populated HTML based on selected template and verified store data.
 */
function generateCoverLetterHTML(templateType) {
  const app = AppStore.applicant;
  const travel = AppStore.travel;
  const travellers = AppStore.travellers;
  const hotels = AppStore.hotels;

  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const applicantName = escapeHTML(app.fullName || '[Applicant Full Name]');
  const passNo = escapeHTML(app.passportNumber || '[Passport Number]');
  const placeOfIssue = escapeHTML(app.placeOfIssue || 'Mumbai');
  const issueDate = escapeHTML(app.dateOfIssue || '[Passport Issue Date]');
  const destCountry = escapeHTML(travel.destinationCountry || 'France');
  const startDate = escapeHTML(travel.travelStartDate || '[Travel Start Date]');
  const endDate = escapeHTML(travel.travelEndDate || '[Travel End Date]');
  const funding = escapeHTML(travel.fundingArrangement || 'Self-funded from personal savings');
  const jobTitle = escapeHTML(travel.jobTitle || 'Executive / Business Owner');
  const employer = escapeHTML(travel.employerName || 'Business Organization');
  const phone = escapeHTML(travel.applicantPhone || '+91 9876543210');
  const email = escapeHTML(travel.applicantEmail || 'applicant@example.com');
  const city = escapeHTML(app.city || 'Mumbai');
  const address = escapeHTML(app.residentialAddress || `${city}, India`);

  const durationNights = calculateTravelNights(travel.travelStartDate, travel.travelEndDate, hotels);

  let hotelParagraph = '';
  if (hotels.length > 0) {
    hotelParagraph = `<p>During our stay, we have confirmed accommodations booked at: <strong>${hotels.map(h => `${escapeHTML(h.hotelName || 'Hotel')}${h.city ? ' (' + escapeHTML(h.city) + ')' : ''}`).join(', ')}</strong>.</p>`;
  }

  let html = '';

  if (templateType === 'Europe') {
    // 1. SCHENGEN (EUROPE: France, Switzerland, Germany, Italy, Spain, etc.)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>
      
      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Embassy / Consulate General of ${destCountry},<br>
      Mumbai / New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Cover Letter for ${destCountry} (Schengen) Visa Application for Tourism</strong></p>

      <p>Dear Sir/Madam,</p>

      <p>I, <strong>${applicantName}</strong> (holding Indian Passport No.: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}) would like to visit your esteemed country${travellers.length > 0 ? ' along with my accompanying family members' : ''} for <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong> for the purpose of Tourism &amp; Holiday.</p>

      <p>I reside at <strong>${address}</strong> along with my family. I am financially independent and currently working as <strong>${jobTitle}</strong> at <strong>${employer}</strong>. Enclosed please find relevant employment documents, approved leave letter, and income proofs for your reference.</p>

      <p>We look forward to experiencing the rich cultural heritage, scenic landmarks, and pleasant ambiance of ${destCountry}. We have scheduled a comprehensive itinerary and will strictly depart before the expiration of our approved visa to resume our professional responsibilities in India.</p>

      ${hotelParagraph}

      <p>All expenses for this vacation including Visa Fees, Flight tickets, Hotel bookings, Overseas Travel Insurance (€30,000 coverage), and personal expenses are covered by <strong>${funding}</strong>. Enclosed please find certified bank statements and Income Tax Returns (ITR-V) verifying adequate financial standing.</p>

      <p><strong>Enclosures Checklist:</strong></p>
      <ul style="padding-left: 20px; line-height: 1.55;">
        <li>Completed &amp; Signed Schengen Visa Application Form</li>
        <li>Original Valid Passport along with previous visas</li>
        <li>Two recent passport photographs matching Schengen specifications</li>
        <li>Confirmed Roundtrip Flight Reservation &amp; Travel Itinerary</li>
        <li>Confirmed Hotel Booking Vouchers covering entire stay</li>
        <li>Overseas Travel Medical Insurance (€30,000 minimum coverage)</li>
        <li>Personal Bank Account Statements (Last 6 Months, stamped &amp; signed)</li>
        <li>Income Tax Returns (ITR-V) Acknowledgements for last 3 years</li>
        <li>Employment Verification &amp; Approved Leave Sanction Letter</li>
      </ul>

      <p>I respectfully request you to kindly grant us the Schengen tourist visa.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Yours Faithfully,<br><br>
      <strong>${applicantName}</strong><br>
      Phone No.: ${phone}<br>
      Email ID: ${email}</p>
    `;
  } else if (templateType === 'Japan') {
    // 2. JAPAN (Tokyo, Osaka, Kyoto, etc.)
    let hotelsTableRows = '';
    if (hotels.length > 0) {
      hotelsTableRows = hotels.map(h => `
        <tr>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;"><strong>${escapeHTML(h.hotelName || 'Hotel')}</strong></td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${escapeHTML(h.checkIn || startDate)} - ${escapeHTML(h.checkOut || endDate)}</td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${escapeHTML(h.phone || phone)}</td>
        </tr>
      `).join('');
    } else {
      hotelsTableRows = `
        <tr>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;"><strong>Hotel Gracery Shinjuku Tokyo</strong></td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">${startDate} - ${endDate}</td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 10px;">+81 3 6833 1111</td>
        </tr>
      `;
    }

    let familyDetailsParagraph = '';
    if (travellers.length > 0) {
      familyDetailsParagraph = travellers.map((t, i) => `
        <p>My ${escapeHTML(t.relation || 'Family Member')}, <strong>${escapeHTML(t.fullName || 'Passenger ' + (i + 2))}</strong> (holding Indian Passport No.: <strong>${escapeHTML(t.passportNumber || 'N/A')}</strong>) is travelling along with me.</p>
      `).join('');
    }

    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Consulate General of Japan,<br>
      Mumbai, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Cover Letter for Tourist Visa Application for Japan</strong></p>

      <p>Dear Sir/Madam,</p>

      <p>I, <strong>${applicantName}</strong> (holding Indian Passport No.: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}) would like to apply for a Temporary Visitor Visa to travel to Japan${travellers.length > 0 ? ' along with my family' : ''} for <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong> for sightseeing and holiday.</p>

      <p>I reside at <strong>${address}</strong>. I am currently employed as <strong>${jobTitle}</strong> with <strong>${employer}</strong>.</p>

      ${familyDetailsParagraph}

      <p style="margin-top: 14px;"><strong>Hotel Accommodation Details in Japan:</strong></p>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #F1F5F9;">
            <th style="border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left;">HOTEL NAME</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left;">DATES OF STAY</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 10px; text-align: left;">CONTACT NO.</th>
          </tr>
        </thead>
        <tbody>
          ${hotelsTableRows}
        </tbody>
      </table>

      <p>All expenses for this vacation including return flights, hotels, internal Shinkansen transit, and daily living costs will be borne by <strong>${funding}</strong>.</p>

      <p>Enclosed please find our visa application form, Schedule of Stay (Itinerary in Japan), bank statements, and tax returns for your kind consideration. I assure you that we will return to India as per our flight booking.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Sincerely,<br><br>
      <strong>${applicantName}</strong><br>
      Phone No.: ${phone}<br>
      Email ID: ${email}</p>
    `;
  } else if (templateType === 'Singapore') {
    // 3. SINGAPORE (ICA Consular Formats with Passenger Manifest Table)
    let passengerRows = `
      <tr>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: center;">1</td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;"><strong>${applicantName}</strong></td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${passNo}</td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">Self</td>
        <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${jobTitle}</td>
      </tr>
    `;

    if (travellers.length > 0) {
      passengerRows += travellers.map((t, i) => `
        <tr>
          <td style="border: 1px solid #CBD5E1; padding: 6px 8px; text-align: center;">${i + 2}</td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 8px;"><strong>${escapeHTML(t.fullName || 'Passenger')}</strong></td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${escapeHTML(t.passportNumber || 'N/A')}</td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${escapeHTML(t.relation || 'Relative')}</td>
          <td style="border: 1px solid #CBD5E1; padding: 6px 8px;">${escapeHTML(t.occupation || 'Employed')}</td>
        </tr>
      `).join('');
    }

    let hotelsDesc = 'Hotel Boss Singapore / Marina Bay Sands';
    if (hotels.length > 0) {
      hotelsDesc = hotels.map(h => `${escapeHTML(h.hotelName)}${h.address ? ' (' + escapeHTML(h.address) + ')' : ''}`).join('; ');
    }

    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Consular Officer,</strong><br>
      Immigration &amp; Checkpoints Authority (ICA) / High Commission of the Republic of Singapore,<br>
      Mumbai / New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Sub: Request for issue of Singapore Tourist e-Visa for me &amp; my family</strong></p>

      <p>Dear Sir/Madam,</p>

      <p>I, <strong>${applicantName}</strong> (holding Indian Passport No.: <strong>${passNo}</strong>, residing at <strong>${address}</strong>), am planning to visit Singapore for tourism and vacation along with my family. We would like to travel for <strong>${durationNights}</strong> arriving on <strong>${startDate}</strong> and departing on <strong>${endDate}</strong>.</p>

      <p>We will be staying at: <strong>${hotelsDesc}</strong>.</p>

      <p><strong>Passenger Manifest &amp; Particulars:</strong></p>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt;">
        <thead>
          <tr style="background-color: #F1F5F9;">
            <th style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 8%; text-align: center;">Sr No.</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 32%;">Passenger Name</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 20%;">Passport No.</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 18%;">Relation</th>
            <th style="border: 1px solid #CBD5E1; padding: 6px 8px; width: 22%;">Occupation</th>
          </tr>
        </thead>
        <tbody>
          ${passengerRows}
        </tbody>
      </table>

      <p>All our travel expenses including roundtrip airfares, hotel stay, attraction tickets, and local expenses will be borne by <strong>${funding}</strong>. Enclosed please find bank statements and Form 14A for your kind evaluation.</p>

      <p>I kindly request you to grant us the Singapore tourist visa.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Yours Faithfully,<br><br>
      <strong>${applicantName}</strong><br>
      Mob: ${phone}<br>
      Email ID: ${email}</p>
    `;
  } else if (templateType === 'UK') {
    // 4. UNITED KINGDOM (UKVI - Standard Visitor Visa)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Entry Clearance Officer,</strong><br>
      UK Visas and Immigration (UKVI), British High Commission,<br>
      Mumbai / New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Application for UK Standard Visitor Visa (Tourism &amp; Leisure) — ${applicantName}</strong></p>

      <p>Dear Entry Clearance Officer,</p>

      <p>I am writing this letter in support of my application for a UK Standard Visitor Visa (6 Months, Multiple Entry) to visit the United Kingdom${travellers.length > 0 ? ' accompanied by my family' : ''} for a holiday duration of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>

      <p><strong>Personal &amp; Employment Profile in India:</strong><br>
      I am permanently residing at <strong>${address}</strong>. I am gainfully employed as <strong>${jobTitle}</strong> at <strong>${employer}</strong> with an established monthly salary. My employer has officially sanctioned my paid annual leave for this vacation, and a formal No Objection Certificate (NOC) is attached.</p>

      <p><strong>Purpose of Visit &amp; Planned Itinerary:</strong><br>
      The primary purpose of my journey is leisure and tourism. During our visit, we look forward to exploring London's historic landmarks, museums, the Tower of London, and travelling to Scotland. We have confirmed flight reservations and hotel bookings covering our entire stay.</p>

      ${hotelParagraph}

      <p><strong>Financial Independence &amp; Funding:</strong><br>
      The entire cost of this trip, estimated at £2,500 - £3,500, will be funded by <strong>${funding}</strong> from my personal liquid savings. I have attached my original stamped bank statements for the past 6 months showing sufficient disposable funds, along with salary slips and Income Tax Return receipts.</p>

      <p><strong>Strong Ties to Home Country (India):</strong><br>
      I have deep family, financial, and employment commitments in India that necessitate my return. I look forward to resuming my career duties immediately after our holiday. I fully understand and will strictly adhere to all UK immigration conditions.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Yours Sincerely,<br><br>
      <strong>${applicantName}</strong><br>
      Passport No.: ${passNo}<br>
      Phone: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'USA') {
    // 5. UNITED STATES (US Embassy / B1-B2 Visa)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Consular Officer,</strong><br>
      Consular Section, Embassy of the United States of America / U.S. Consulate General,<br>
      Mumbai / New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Purpose of Visit &amp; Strong Ties Declaration — B1/B2 Visa Application for ${applicantName}</strong></p>

      <p>Dear Consular Officer,</p>

      <p>I, <strong>${applicantName}</strong> (holding Indian Passport No: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}), have submitted Form DS-160 and hereby present this letter to outline the purpose of my temporary visit to the United States and establish my firm ties to India.</p>

      <p><strong>Purpose of Travel &amp; Dates:</strong><br>
      I intend to travel to the United States for a temporary holiday duration of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>. The visit is purely for tourism, sightseeing, and cultural exploration.</p>

      <p><strong>Professional Background:</strong><br>
      I reside at <strong>${address}</strong>. I am currently working as <strong>${jobTitle}</strong> with <strong>${employer}</strong>. My professional commitments provide a steady source of income and substantial career progression in India.</p>

      ${hotelParagraph}

      <p><strong>Financial Sponsorship:</strong><br>
      All expenses associated with this visit—including airfare, domestic flights, accommodations, and insurance—will be borne by <strong>${funding}</strong>. My bank statements and financial proofs reflect sufficient liquid assets to comfortably cover the entirety of this trip without recourse to public funds.</p>

      <p><strong>Incontrovertible Ties to India:</strong><br>
      I have strong family roots, significant real estate and financial investments, and an ongoing employment contract in India. I have no intention of abandoning my residence in India and will return promptly on or before <strong>${endDate}</strong>.</p>

      <p>I respectfully request the grant of a B1/B2 tourist visitor visa.</p>

      <p style="margin-top: 24px;">Respectfully,<br><br>
      <strong>${applicantName}</strong><br>
      Phone No.: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'Canada') {
    // 6. CANADA (IRCC Visitor Visa Application)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Immigration Officer,</strong><br>
      Immigration, Refugees and Citizenship Canada (IRCC),<br>
      High Commission of Canada in India</p>

      <p style="margin: 16px 0;"><strong>Subject: Statement of Purpose — Temporary Resident Visa (Visitor Visa) for ${applicantName}</strong></p>

      <p>Dear Visa Officer,</p>

      <p>I am pleased to submit my application for a Canadian Temporary Resident Visa (Visitor Visa). I wish to visit Canada for tourism and leisure for a period of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>${travellers.length > 0 ? ' with my accompanying family members' : ''}.</p>

      <p><strong>Employment &amp; Financial Stability:</strong><br>
      I am permanently settled in <strong>${address}</strong>. I am actively employed as <strong>${jobTitle}</strong> at <strong>${employer}</strong>. My employer has formally granted leave approval, and my position will be held open for my resumption on return.</p>

      ${hotelParagraph}

      <p><strong>Funding &amp; Proof of Means:</strong><br>
      All costs for air travel, lodging, health coverage, and daily expenses in Canada will be borne by <strong>${funding}</strong>. Enclosed are verified copies of my 6-month bank statements, Form 16/ITR receipts, and investment certificates proving adequate funds.</p>

      <p><strong>Intent to Return to India:</strong><br>
      I confirm that my visit to Canada is strictly temporary. My deep social, personal, and career anchors are rooted in India, and I have every incentive and obligation to depart Canada before my authorized stay expires.</p>

      <p>Thank you for considering my application. I kindly look forward to a favorable decision.</p>

      <p style="margin-top: 24px;">Yours Sincerely,<br><br>
      <strong>${applicantName}</strong><br>
      Passport No.: ${passNo}<br>
      Contact: ${phone} | ${email}</p>
    `;
  } else if (templateType === 'Australia') {
    // 7. AUSTRALIA (Department of Home Affairs - Subclass 600)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Department of Home Affairs, Australian High Commission,<br>
      New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Genuine Temporary Entrant (GTE) Submission — Visitor Visa (Subclass 600) Tourist Stream</strong></p>

      <p>Dear Visa Officer,</p>

      <p>I hereby submit my application for an Australian Visitor Visa (Subclass 600 Tourist Stream). I am planning to visit Australia for <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong> for sightseeing and vacation${travellers.length > 0 ? ' with my family' : ''}.</p>

      <p><strong>Profile &amp; Career in India:</strong><br>
      I am a citizen of India residing at <strong>${address}</strong>. I hold a secure position as <strong>${jobTitle}</strong> at <strong>${employer}</strong>. My employer has approved my annual leave for this holiday.</p>

      <p><strong>Travel Plans:</strong><br>
      Our proposed itinerary includes exploring Sydney Harbour, the Gold Coast, and Melbourne. We have booked tentative flight itineraries and confirmed hotel reservations across each city.</p>

      ${hotelParagraph}

      <p><strong>Financial Capacity:</strong><br>
      The complete travel budget will be borne by <strong>${funding}</strong>. My bank statement showing healthy credit balances, alongside salary receipts and Income Tax assessments, are enclosed to verify my financial standing.</p>

      <p><strong>Compliance &amp; Return:</strong><br>
      I am fully aware of Australian visa conditions, specifically Condition 8101 (No Work) and Condition 8201 (Max 3 Months Study). I assure you that I am a Genuine Temporary Entrant and will exit Australia well within the permitted validity.</p>

      <p style="margin-top: 24px;">Kind Regards,<br><br>
      <strong>${applicantName}</strong><br>
      Passport No: ${passNo}<br>
      Phone: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'UAE') {
    // 8. UNITED ARAB EMIRATES (Dubai / Abu Dhabi Tourist Visa)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The General Directorate of Residency &amp; Foreigners Affairs (GDRFA) / ICP,</strong><br>
      United Arab Emirates</p>

      <p style="margin: 16px 0;"><strong>Subject: Request for UAE Tourist Visa Issuance — ${applicantName}</strong></p>

      <p>Respected Authorities,</p>

      <p>I, <strong>${applicantName}</strong> (holding Indian Passport No: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}), am submitting this application for a UAE Tourist Visa for a stay of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>${travellers.length > 0 ? ' accompanied by my family' : ''}.</p>

      <p>The purpose of our visit is tourism, family entertainment, and leisure in Dubai and Abu Dhabi. We reside at <strong>${address}</strong> and I am employed as <strong>${jobTitle}</strong> at <strong>${employer}</strong>.</p>

      ${hotelParagraph}

      <p>We hold confirmed roundtrip flight bookings with entry and exit from UAE airports. All holiday expenses are completely financed by <strong>${funding}</strong>.</p>

      <p>We request you to kindly grant us the UAE tourist visa.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Yours Faithfully,<br><br>
      <strong>${applicantName}</strong><br>
      Mobile: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'Turkey') {
    // 9. TURKEY (Republic of Turkey Consular Mission)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Consulate General of the Republic of Turkey,<br>
      Mumbai, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Application for Republic of Turkey Tourist Visa — ${applicantName}</strong></p>

      <p>Dear Sir/Madam,</p>

      <p>I, <strong>${applicantName}</strong> (Passport No: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}), am writing to respectfully request the issuance of a Tourist Visa to travel to Turkey for a duration of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>

      <p>I reside at <strong>${address}</strong>. I am employed as <strong>${jobTitle}</strong> with <strong>${employer}</strong> in India.</p>

      <p>The primary purpose of my journey is tourism. We are scheduled to explore historic Istanbul, the landscapes of Cappadocia, and the Mediterranean coast. We have made confirmed reservations for domestic transfers and accommodation.</p>

      ${hotelParagraph}

      <p>All expenses for this trip are borne by <strong>${funding}</strong>. Enclosed are our stamped bank statements, income tax returns, travel insurance, flight reservations, and leave certificates.</p>

      <p>I assure you that I will strictly follow consular regulations and depart Turkey prior to visa expiry.</p>

      <p style="margin-top: 24px;">Thanking You,<br><br>
      Sincerely,<br><br>
      <strong>${applicantName}</strong><br>
      Phone: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'NewZealand') {
    // 10. NEW ZEALAND (Immigration New Zealand)
    html = `
      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Immigration New Zealand, Ministry of Business, Innovation &amp; Employment,<br>
      New Delhi / Mumbai, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Application for New Zealand Visitor Visa (Tourism Stream) — ${applicantName}</strong></p>

      <p>Dear Visa Officer,</p>

      <p>I, <strong>${applicantName}</strong> (Passport Number: <strong>${passNo}</strong> issued at ${placeOfIssue} on ${issueDate}), respectfully submit this application for a New Zealand Visitor Visa for a holiday stay of <strong>${durationNights}</strong> from <strong>${startDate}</strong> to <strong>${endDate}</strong>.</p>

      <p><strong>Background &amp; Ties to India:</strong><br>
      I reside at <strong>${address}</strong>. I work as <strong>${jobTitle}</strong> at <strong>${employer}</strong>. My employment is ongoing and my leave has been officially sanctioned.</p>

      <p><strong>Tourism Itinerary:</strong><br>
      We look forward to experiencing New Zealand's scenic landscapes, Milford Sound, Queenstown, and Rotorua. Confirmed travel itineraries and hotel accommodations have been arranged.</p>

      ${hotelParagraph}

      <p><strong>Financial Means:</strong><br>
      All travel and maintenance costs will be financed by <strong>${funding}</strong>. My certified bank account records showing funds exceeding NZD $1,000 per month of stay are attached.</p>

      <p>I guarantee that I will abide by all visa conditions and leave New Zealand before my visa expires.</p>

      <p style="margin-top: 24px;">Kind Regards,<br><br>
      <strong>${applicantName}</strong><br>
      Phone: ${phone}<br>
      Email: ${email}</p>
    `;
  } else if (templateType === 'Passport_Auth_Single' || (templateType === 'Passport_Auth' && travellers.length === 0)) {
    // Passport Authorization Letter — Single Traveller
    html = `
      ${OFFICIAL_LETTERHEAD_HEADER_HTML}

      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      The Consulate / Embassy of ${destCountry},<br>
      Mumbai, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Authority Letter to collect original passport for ${applicantName}</strong></p>

      <p>Dear Sir / Madam,</p>

      <p>I, <strong>${applicantName}</strong>, holding Indian passport number: <strong>${passNo}</strong>, hereby authorize <strong>Mr. Praduman Tripathi</strong> from <strong>Khanna Holidays Pvt. Ltd.</strong>, whose office is at Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056, to collect the original passport on my behalf.</p>

      <p>I would appreciate if you could hand over the original passport to the bearer of this letter.</p>

      <div style="margin-top: 24px; margin-bottom: 20px;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="font-weight: 700; margin-top: 16px; margin-bottom: 4px;">${applicantName}</p>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Phone No.: ${phone}</p>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Email id: ${email}</p>
      </div>

      ${OFFICIAL_LETTERHEAD_FOOTER_HTML}
    `;
  } else if (templateType === 'Passport_Auth_Couple' || (templateType === 'Passport_Auth' && travellers.length > 0)) {
    // Passport Authorization Letter — Couple / Multiple
    const allApplicants = [{ name: applicantName, pass: passNo }];
    travellers.forEach(t => {
      if (t.fullName) allApplicants.push({ name: escapeHTML(t.fullName), pass: escapeHTML(t.passportNumber || 'N/A') });
    });

    const applicantNamesList = allApplicants.map(a => a.name).join(' & ');
    const applicantDetailsHtml = allApplicants.map(a => `<strong>${a.name}</strong>, holding Indian passport number: <strong>${a.pass}</strong>`).join(' & ');
    const signBlocks = allApplicants.map(a => `<div style="margin-bottom: 12px;"><strong>${a.name}</strong></div>`).join('');

    html = `
      ${OFFICIAL_LETTERHEAD_HEADER_HTML}

      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      The Consulate / Embassy of ${destCountry},<br>
      Mumbai, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Authority Letter to collect original passport for ${applicantNamesList}</strong></p>

      <p>Dear Sir / Madam,</p>

      <p>We, ${applicantDetailsHtml}, hereby authorize <strong>Mr. Praduman Tripathi</strong> from <strong>Khanna Holidays Pvt. Ltd.</strong>, whose office is at Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056, to collect the original passports on our behalf.</p>

      <p>We would appreciate if you could hand over the original passports to the bearer of this letter.</p>

      <div style="margin-top: 24px; margin-bottom: 20px;">
        <p style="margin: 0 0 12px 0;">Yours faithfully,</p>
        ${signBlocks}
      </div>

      ${OFFICIAL_LETTERHEAD_FOOTER_HTML}
    `;
  } else if (templateType === 'Company_Auth') {
    // Company Authorization Letter
    const allApplicants = [{ name: applicantName, pass: passNo }];
    travellers.forEach(t => {
      if (t.fullName) allApplicants.push({ name: escapeHTML(t.fullName), pass: escapeHTML(t.passportNumber || 'N/A') });
    });

    const applicantItemsHtml = allApplicants.map((a, i) => `
      <p style="margin: 6px 0 6px 18px;"><strong>${i + 1}. ${a.name}</strong> - Passport No.: <strong>${a.pass}</strong></p>
    `).join('');

    html = `
      ${OFFICIAL_LETTERHEAD_HEADER_HTML}

      <p style="text-align: right; margin-bottom: 16px;"><strong>Date:</strong> ${todayStr}</p>

      <p>To,<br>
      <strong>The Visa Officer,</strong><br>
      Embassy / Consulate General of ${destCountry},<br>
      Mumbai / New Delhi, India</p>

      <p style="margin: 16px 0;"><strong>Subject: Authorization Letter for my Visa Application.</strong></p>

      <p>Dear Sir/Madam,</p>

      <p>We, <strong>Khanna Holidays Pvt. Ltd.</strong> have been authorized to collect original Passport of our clients mentioned below –</p>

      ${applicantItemsHtml}

      <p style="margin-top: 14px;">The applicants have authorized us to do the passport collection on their behalf.</p>

      <p>Kindly feel free to contact us for more information.</p>

      <div style="margin-top: 24px; margin-bottom: 20px;">
        <p style="margin: 0 0 12px 0;">Thanking You,<br><br>Yours Faithfully,</p>
        <p style="font-weight: 700; margin: 0 0 4px 0;">Ms. Dhvani Chheda</p>
        <p style="font-size: 0.84rem; color: #475569; margin: 0 0 2px 0;">Team Lead – Visa Operations</p>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Phone No. +91 8657461001 • customercare@khannatravels.com</p>
      </div>

      ${OFFICIAL_LETTERHEAD_FOOTER_HTML}
    `;
  }

  return stripEmojis(html);
}

/**
 * Executes a formatting command on the WYSIWYG editor.
 */
function formatDoc(cmd, value = null) {
  document.execCommand(cmd, false, value);
  const editor = document.getElementById('coverLetterEditor');
  if (editor) {
    editor.focus();
    AppStore.coverLetter.renderedHtml = editor.innerHTML;
    AppStore.coverLetter.isEdited = true;
  }
}

/**
 * Synchronizes inputs from Step 5 into AppStore.travel.
 */
function syncTravelInputsToStore() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';

  AppStore.travel.destinationCountry = getVal('travel_dest') || 'France';
  AppStore.travel.travelStartDate = getVal('travel_start') || '';
  AppStore.travel.travelEndDate = getVal('travel_end') || '';
  AppStore.travel.purpose = getVal('travel_purpose') || 'Tourism';
  AppStore.travel.fundingArrangement = getVal('travel_funding') || 'Self-funded from personal savings';
  AppStore.travel.employmentStatus = getVal('travel_emp_status') || 'Employed';
  AppStore.travel.jobTitle = getVal('travel_job_title') || '';
  AppStore.travel.employerName = getVal('travel_employer') || '';
  AppStore.travel.applicantPhone = getVal('travel_phone') || '';
}

/**
 * Calculates number of nights between start and end dates or from hotel duration.
 */
function calculateTravelNights(startDateStr, endDateStr, hotelsList) {
  if (startDateStr && endDateStr) {
    const parseDate = (dStr) => {
      const parts = dStr.split(/[\/\-\.]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      return null;
    };
    const d1 = parseDate(startDateStr);
    const d2 = parseDate(endDateStr);
    if (d1 && d2 && !isNaN(d1) && !isNaN(d2)) {
      const diffMs = d2 - d1;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        return `${diffDays} Night${diffDays > 1 ? 's' : ''}`;
      }
    }
  }

  // Fallback to hotels duration
  if (hotelsList && hotelsList.length > 0) {
    let totalNights = 0;
    for (const h of hotelsList) {
      if (h.duration) {
        const m = h.duration.match(/(\d+)\s*Night/i);
        if (m) totalNights += parseInt(m[1], 10);
      }
    }
    if (totalNights > 0) {
      return `${totalNights} Night${totalNights > 1 ? 's' : ''}`;
    }
  }

  return '10 Nights';
}

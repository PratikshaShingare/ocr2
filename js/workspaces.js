/**
 * Khanna Travels & Holidays — Standalone Document Workspaces Controller
 * (js/workspaces.js)
 * Manages dedicated document generation pages: Hotel Blocking, Cover Letter, 
 * Company Auth, Passport Auth, Invitation Letter, and Standalone Passport Upload
 */

const OFFICIAL_LH_BANNER_HTML = `
  <div class="official-letterhead-header" style="margin-bottom: 16px; text-align: center;">
    <img src="assets/logo/khanna_letterhead_banner.jpg" style="width: 100%; max-height: 85px; object-fit: contain;" alt="Khanna Holidays Letterhead Banner" />
  </div>
`;

const OFFICIAL_TWO_BOX_FOOTER_HTML = `
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
 * 1. Hotel Blocking Workspace
 */
function syncStandaloneHotelWorkspace() {
  const container = document.getElementById('standaloneHotelContainer');
  if (!container) return;

  // Clean initialization without hardcoded dummy values
  const currentHotel = AppStore.hotels[0] || {
    hotelName: '',
    confirmationNumber: '',
    leadGuest: AppStore.applicant.fullName || '',
    checkIn: '',
    checkOut: '',
    duration: '1 Night(s)',
    city: '',
    phone: '',
    address: '',
    numRooms: '1',
    numGuests: '1 Adult(s)',
    guests: []
  };

  if (AppStore.hotels.length === 0) {
    AppStore.hotels.push(currentHotel);
  }

  const guestsList = currentHotel.guests || [];
  const guestNamesStr = guestsList.map(g => g.guestName).filter(Boolean).join('<br/>') || currentHotel.leadGuest || 'Guest Name';
  const roomTypeStr = guestsList[0]?.roomType || 'Standard Room';
  const paxStr = guestsList[0]?.numGuests || currentHotel.numGuests || '1 Adult(s)';

  container.innerHTML = `
    <!-- Top Action Bar -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
      <div>
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--color-text);">Hotel Blocking &amp; Voucher Workspace</h2>
        <p style="margin: 0; font-size: 0.84rem; color: var(--color-text-muted);">Produces official Khanna Travels voucher with Aptos 16pt font, 4 header graphics, 2-column footer, and exact 3-column table.</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadHotelBlockingDocx()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download Word (.docx)
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="downloadHotelBlockingPdf()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download PDF (Word-Fidelity)
        </button>
      </div>
    </div>

    <!-- Use Existing Application Data Toolbar -->
    ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('hotel-blocking') : ''}

    <!-- Upload Voucher Dropzone -->
    <div class="card" style="margin-bottom: var(--space-5);">
      <div style="font-weight: 600; margin-bottom: var(--space-2); display: flex; align-items: center; gap: var(--space-2);">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        Upload Hotel Voucher (OCR Auto-Fill)
      </div>
      <p style="font-size: 0.82rem; color: var(--color-text-muted); margin-top: 0;">Upload any booking confirmation (Agoda, Booking.com, Hotel PDF/JPG) to extract details automatically.</p>
      <div class="upload-dropzone" onclick="document.getElementById('standaloneHotelFileInput').click()" style="padding: var(--space-6) var(--space-4);">
        <svg class="icon" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
        <h4 style="margin: 0; font-size: 0.95rem;">Drag &amp; drop hotel voucher PDF or image here</h4>
        <p style="font-size: 0.78rem; color: var(--color-text-faint);">or click to browse from your computer</p>
        <input type="file" id="standaloneHotelFileInput" hidden accept=".pdf,.jpg,.jpeg,.png" onchange="if(this.files[0]) handleHotelVoucherUpload(this.files[0]);" />
      </div>
    </div>

    <!-- Booking Details Form & Live Preview Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: var(--space-5); align-items: start;">
      <!-- Left: Editable Details with Cyan Highlights on 6 key fields -->
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="margin: 0 0 var(--space-2) 0; font-size: 1.05rem; font-weight: 700;">Booking Metadata</h3>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
          <div>
            <label class="form-label" style="font-weight: 600;">Confirmation Number <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputConfNo" value="${escapeHTML(currentHotel.confirmationNumber || '')}" placeholder="e.g. TBHBV5YP9R" oninput="AppStore.hotels[0].confirmationNumber = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label" style="font-weight: 600;">Lead Guest <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputLeadGuest" value="${escapeHTML(currentHotel.leadGuest || AppStore.applicant.fullName || '')}" placeholder="Lead Guest Name" oninput="AppStore.hotels[0].leadGuest = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div style="grid-column: 1 / -1;">
            <label class="form-label" style="font-weight: 600;">Hotel Name <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputName" value="${escapeHTML(currentHotel.hotelName || '')}" placeholder="e.g. Hotel Mercure Paris Centre Tour Eiffel" oninput="AppStore.hotels[0].hotelName = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label" style="font-weight: 600;">Check-In Date <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputCheckIn" value="${escapeHTML(currentHotel.checkIn || '')}" placeholder="DD/MM/YYYY" oninput="AppStore.hotels[0].checkIn = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label" style="font-weight: 600;">Check-Out Date <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputCheckOut" value="${escapeHTML(currentHotel.checkOut || '')}" placeholder="DD/MM/YYYY" oninput="AppStore.hotels[0].checkOut = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label" style="font-weight: 600;">Duration <span style="color: #0891b2;">*</span></label>
            <input type="text" class="form-control input-cyan-highlight" id="hotelInputDuration" list="hotelDurationList" value="${escapeHTML(currentHotel.duration || '1 Night(s)')}" oninput="AppStore.hotels[0].duration = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label">City</label>
            <input type="text" class="form-control" list="worldCitiesList" value="${escapeHTML(currentHotel.city || '')}" placeholder="e.g. Paris" oninput="AppStore.hotels[0].city = this.value; syncStandaloneHotelPreview();" />
          </div>
          <div>
            <label class="form-label">Phone Number</label>
            <input type="text" class="form-control" value="${escapeHTML(currentHotel.phone || '')}" placeholder="e.g. +33 1 45 78 50 00" oninput="AppStore.hotels[0].phone = this.value;" />
          </div>
          <div>
            <label class="form-label">No. of Rooms</label>
            <input type="text" class="form-control" value="${escapeHTML(currentHotel.numRooms || '1')}" oninput="AppStore.hotels[0].numRooms = this.value;" />
          </div>
          <div style="grid-column: 1 / -1;">
            <label class="form-label">Hotel Address</label>
            <input type="text" class="form-control" value="${escapeHTML(currentHotel.address || '')}" placeholder="Full street address abroad" oninput="AppStore.hotels[0].address = this.value;" />
          </div>
          <div style="grid-column: 1 / -1;">
            <label class="form-label">Guest Allocation (Strict 3-Column Table)</label>
            <textarea class="form-control" rows="2" placeholder="One guest name per line" oninput="AppStore.hotels[0].guests = [{ guestName: this.value, roomType: AppStore.hotels[0].guests[0]?.roomType || 'Standard Room', numGuests: AppStore.hotels[0].numGuests || '1 Adult(s)' }]; syncStandaloneHotelPreview();">${escapeHTML((currentHotel.guests || []).map(g => g.guestName).join('\n') || currentHotel.leadGuest || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Right: Live Letterhead & 3-Column Table Preview with Word Toolbar -->
      <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); display: flex; flex-direction: column; padding: 0; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); background: var(--color-surface);">
          <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint);">Official Aptos Document Preview</span>
          <span class="badge badge-success">Official Header &amp; Footer</span>
        </div>

        <!-- Word-like In-Browser Editing Toolbar -->
        ${typeof WordToolbar !== 'undefined' ? WordToolbar.render('standaloneHotelLivePreview') : ''}

        <div style="padding: 16px;">
          <div id="standaloneHotelLivePreview" contenteditable="true" style="background: #ffffff; color: #333333; padding: 20px; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; font-family: Aptos, Calibri, sans-serif; min-height: 480px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); outline: none;">
            
            <!-- Official Khanna Travels Letterhead Banner -->
            ${OFFICIAL_LH_BANNER_HTML}

            <!-- Header Box with Confirmation Number -->
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 4px; margin-bottom: 14px;">
              <span style="font-size: 0.95rem;">Thanks for booking with us, your booking has been <strong>"Confirmed"</strong> with</span><br/>
              <span style="font-size: 1.05rem; font-weight: 700;">Confirmation Number- <span id="prevConfNo">${escapeHTML(currentHotel.confirmationNumber || 'Pending Confirmation')}</span></span>
            </div>

            <!-- Metadata table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem; margin-bottom: 14px; border: 1px solid #cbd5e1;">
              <tr style="background: #f1f5f9;">
                <td colspan="4" style="padding: 6px 10px; font-weight: 700; color: #475569;">Booking details:</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="padding: 6px 10px; font-weight: 600; width: 25%; background: #fafafa;">Service Booked:</td>
                <td style="padding: 6px 10px; width: 25%;">Hotel</td>
                <td style="padding: 6px 10px; font-weight: 600; width: 25%; background: #fafafa;">Hotel Name:</td>
                <td style="padding: 6px 10px; width: 25%; font-weight: 600;" id="prevHotelName">${escapeHTML(currentHotel.hotelName || 'Hotel Booking')}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="padding: 6px 10px; font-weight: 600; background: #fafafa;">Check-In:</td>
                <td style="padding: 6px 10px; font-weight: 700;" id="prevCheckIn">${escapeHTML(currentHotel.checkIn || 'TBD')}</td>
                <td style="padding: 6px 10px; font-weight: 600; background: #fafafa;">Checkout:</td>
                <td style="padding: 6px 10px; font-weight: 700;" id="prevCheckOut">${escapeHTML(currentHotel.checkOut || 'TBD')}</td>
              </tr>
            </table>

            <!-- Exact 3-Column Table -->
            <div style="font-weight: 700; font-size: 0.86rem; margin-bottom: 6px; color: #475569;">Guest Allocation (Strict 3 Columns):</div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.86rem; border: 1px solid #cbd5e1; margin-bottom: 14px;">
              <thead>
                <tr style="background: #f8fafc; border-bottom: 1px solid #cbd5e1; text-align: left;">
                  <th style="padding: 6px 10px; width: 50%;">Guest Name</th>
                  <th style="padding: 6px 10px; width: 30%;">Room Type</th>
                  <th style="padding: 6px 10px; width: 20%;">No. of Guests</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 6px 10px; vertical-align: top;" id="prevGuestNames">${guestNamesStr}</td>
                  <td style="padding: 6px 10px; vertical-align: top;" id="prevRoomType">${escapeHTML(roomTypeStr)}</td>
                  <td style="padding: 6px 10px; vertical-align: top;" id="prevPax">${escapeHTML(paxStr)}</td>
                </tr>
              </tbody>
            </table>

            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 0.76rem; color: #64748b; margin-bottom: 14px;">
              <strong>Hotel Policy:</strong> Early check out will attract full cancellation charges. Cancellation policy is subject to change at any time. Rates are inclusive of all taxes.
            </div>

            <!-- Official Two-Box Footer -->
            ${OFFICIAL_TWO_BOX_FOOTER_HTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

function syncStandaloneHotelPreview() {
  const h = AppStore.hotels[0];
  if (!h) return;
  const conf = document.getElementById('prevConfNo');
  if (conf) conf.textContent = h.confirmationNumber || 'Pending Confirmation';
  const name = document.getElementById('prevHotelName');
  if (name) name.textContent = h.hotelName || 'Hotel Booking';
  const ci = document.getElementById('prevCheckIn');
  if (ci) ci.textContent = h.checkIn || 'TBD';
  const co = document.getElementById('prevCheckOut');
  if (co) co.textContent = h.checkOut || 'TBD';

  const gn = document.getElementById('prevGuestNames');
  if (gn) {
    const list = h.guests || [];
    gn.innerHTML = list.map(g => escapeHTML(g.guestName)).filter(Boolean).join('<br/>') || escapeHTML(h.leadGuest || AppStore.applicant.fullName || 'Lead Guest');
  }
}

/**
 * 2. Cover Letter Workspace
 */
function syncStandaloneCoverLetterWorkspace() {
  const container = document.getElementById('standaloneCoverLetterContainer');
  if (!container) return;

  const app = AppStore.applicant;
  const travel = AppStore.travel;
  const currentTpl = AppStore.coverLetter.templateType || 'Europe';

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
      <div>
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--color-text);">Cover Letter Workspace</h2>
        <p style="margin: 0; font-size: 0.84rem; color: var(--color-text-muted);">Tourist Visa Cover Letters formatted to strict consular standards across all major international embassies.</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadCoverLetterDocx()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download Word (.docx)
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="downloadCoverLetterPdf()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download PDF (Word-Fidelity)
        </button>
      </div>
    </div>

    <!-- Use Existing Application Data Toolbar -->
    ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('cover-letter') : ''}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: var(--space-5); align-items: start;">
      <!-- Controls -->
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700;">Select Format &amp; Details</h3>
        
        <div>
          <label class="form-label" style="font-weight: 600;">Consular Destination Format</label>
          <select class="form-control" id="standaloneCoverLetterTplSelect" onchange="AppStore.coverLetter.templateType = this.value; prepareAndRenderCoverLetter();">
            <option value="Europe" ${currentTpl === 'Europe' ? 'selected' : ''}>Format 1 (Schengen - Europe: France, Switzerland, Germany, Italy, Spain, Austria, Netherlands, Greece, etc.)</option>
            <option value="Japan" ${currentTpl === 'Japan' ? 'selected' : ''}>Format 2 (Japan: Tokyo, Osaka, Kyoto, etc.)</option>
            <option value="Singapore" ${currentTpl === 'Singapore' ? 'selected' : ''}>Format 3 (Singapore: ICA Consular Formats)</option>
            <option value="UK" ${currentTpl === 'UK' ? 'selected' : ''}>Format 4 (United Kingdom: UK Visas &amp; Immigration - Standard Visitor Visa)</option>
            <option value="USA" ${currentTpl === 'USA' ? 'selected' : ''}>Format 5 (United States: US Embassy / B1-B2 Visa Application)</option>
            <option value="Canada" ${currentTpl === 'Canada' ? 'selected' : ''}>Format 6 (Canada: IRCC Visitor Visa Application)</option>
            <option value="Australia" ${currentTpl === 'Australia' ? 'selected' : ''}>Format 7 (Australia: Department of Home Affairs - Subclass 600)</option>
            <option value="UAE" ${currentTpl === 'UAE' ? 'selected' : ''}>Format 8 (United Arab Emirates: Dubai / Abu Dhabi Tourist Visa)</option>
            <option value="Turkey" ${currentTpl === 'Turkey' ? 'selected' : ''}>Format 9 (Turkey: Republic of Turkey Consular Mission)</option>
            <option value="NewZealand" ${currentTpl === 'NewZealand' ? 'selected' : ''}>Format 10 (New Zealand: Immigration New Zealand Visitor Visa)</option>
          </select>
        </div>

        <div>
          <label class="form-label">Applicant Full Name</label>
          <input type="text" class="form-control" value="${escapeHTML(app.fullName || '')}" placeholder="Full Name" oninput="AppStore.applicant.fullName = this.value; prepareAndRenderCoverLetter();" />
        </div>

        <div>
          <label class="form-label">Passport Number</label>
          <input type="text" class="form-control" value="${escapeHTML(app.passportNumber || '')}" placeholder="Passport No." oninput="AppStore.applicant.passportNumber = this.value; prepareAndRenderCoverLetter();" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label class="form-label">Travel Start Date</label>
            <input type="text" class="form-control" value="${escapeHTML(travel.travelStartDate || '')}" placeholder="DD/MM/YYYY" oninput="AppStore.travel.travelStartDate = this.value; prepareAndRenderCoverLetter();" />
          </div>
          <div>
            <label class="form-label">Travel End Date</label>
            <input type="text" class="form-control" value="${escapeHTML(travel.travelEndDate || '')}" placeholder="DD/MM/YYYY" oninput="AppStore.travel.travelEndDate = this.value; prepareAndRenderCoverLetter();" />
          </div>
        </div>

        <div>
          <label class="form-label">Employer / Organization</label>
          <input type="text" class="form-control" value="${escapeHTML(travel.employerName || '')}" placeholder="Company Name" oninput="AppStore.travel.employerName = this.value; prepareAndRenderCoverLetter();" />
        </div>

        <div>
          <label class="form-label">Funding Arrangement</label>
          <input type="text" class="form-control" list="fundingArrangementList" value="${escapeHTML(travel.fundingArrangement || 'Self-funded from personal savings')}" oninput="AppStore.travel.fundingArrangement = this.value; prepareAndRenderCoverLetter();" />
        </div>
      </div>

      <!-- Preview with Word Toolbar -->
      <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 0; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); background: var(--color-surface);">
          <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint);">Cover Letter Live Preview (Editable)</span>
          <span class="badge badge-success">Consular Standard</span>
        </div>

        <!-- Word-like In-Browser Editing Toolbar -->
        ${typeof WordToolbar !== 'undefined' ? WordToolbar.render('coverLetterEditor') : ''}

        <div style="padding: 16px;">
          <div id="coverLetterEditor" contenteditable="true" style="padding: 24px; background: #ffffff; color: #1e293b; border-radius: 8px; border: 1px solid #cbd5e1; min-height: 480px; font-size: 0.92rem; line-height: 1.65; font-family: Arial, sans-serif; box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.04); outline: none;">
            Loading cover letter preview...
          </div>
        </div>
      </div>
    </div>
  `;

  if (typeof prepareAndRenderCoverLetter === 'function') {
    prepareAndRenderCoverLetter();
  }
}

/**
 * 3. Company Authorization Letter Workspace
 */
function syncStandaloneCompanyAuthWorkspace() {
  const container = document.getElementById('standaloneCompanyAuthContainer');
  if (!container) return;

  const app = AppStore.applicant;
  const travel = AppStore.travel;
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
      <div>
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--color-text);">Company Authorization Letter Workspace</h2>
        <p style="margin: 0; font-size: 0.84rem; color: var(--color-text-muted);">Official letterhead authorization signed by Ms. Dhvani Chheda (Team Lead – Visa).</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadCompanyAuthDocx()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download Word (.docx)
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="downloadCompanyAuthPdf()">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download PDF (Word-Fidelity)
        </button>
      </div>
    </div>

    <!-- Use Existing Application Data Toolbar -->
    ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('company-authorization') : ''}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: var(--space-5); align-items: start;">
      <!-- Left: Form Inputs -->
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700;">Company Authorization Parameters</h3>
        
        <div>
          <label class="form-label">Applicant Full Name</label>
          <input type="text" class="form-control" id="companyAuthName" value="${escapeHTML(app.fullName || '')}" placeholder="Applicant Full Name" oninput="AppStore.applicant.fullName = this.value; syncStandaloneCompanyAuthPreview();" />
        </div>

        <div>
          <label class="form-label">Passport Number</label>
          <input type="text" class="form-control" id="companyAuthPassport" value="${escapeHTML(app.passportNumber || '')}" placeholder="e.g. Z6543210" oninput="AppStore.applicant.passportNumber = this.value; syncStandaloneCompanyAuthPreview();" />
        </div>

        <div>
          <label class="form-label">Destination Country / Region</label>
          <input type="text" class="form-control" id="companyAuthDest" value="${escapeHTML(travel.destinationCountry || 'Schengen')}" placeholder="e.g. Schengen / France / UK" oninput="AppStore.travel.destinationCountry = this.value; syncStandaloneCompanyAuthPreview();" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label class="form-label">Authorized Signee</label>
            <input type="text" class="form-control" id="companyAuthSignee" value="Ms. Dhvani Chheda" oninput="syncStandaloneCompanyAuthPreview();" />
          </div>
          <div>
            <label class="form-label">Signee Designation</label>
            <input type="text" class="form-control" id="companyAuthTitle" value="Team Lead – Visa Operations" oninput="syncStandaloneCompanyAuthPreview();" />
          </div>
        </div>

        <div>
          <label class="form-label">Letter Issue Date</label>
          <input type="text" class="form-control" id="companyAuthDate" value="${todayStr}" oninput="syncStandaloneCompanyAuthPreview();" />
        </div>
      </div>

      <!-- Right: Live Letterhead Preview with Word Toolbar -->
      <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 0; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); background: var(--color-surface);">
          <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint);">Official Letterhead Preview (Editable)</span>
          <span class="badge badge-success">Official Header &amp; Footer</span>
        </div>

        <!-- Word-like In-Browser Editing Toolbar -->
        ${typeof WordToolbar !== 'undefined' ? WordToolbar.render('companyAuthLivePreviewContent') : ''}

        <div style="padding: 16px;">
          <div id="companyAuthLivePreviewContent" contenteditable="true" style="padding: 24px; background: #ffffff; color: #1e293b; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 0.92rem; line-height: 1.6; outline: none;">
            
            <!-- Official Letterhead Header Banner -->
            ${OFFICIAL_LH_BANNER_HTML}

            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 16px; border-bottom: 2px solid #003B7A; padding-bottom: 6px;">
              <div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #003B7A;">KHANNA HOLIDAYS PVT. LTD.</div>
                <div style="font-size: 0.76rem; color: #64748b;">Visa Assistance &amp; Consular Documentation Division</div>
              </div>
              <div style="font-size: 0.8rem; color: #475569; text-align: right;" id="prevCompanyAuthDate">
                Date: ${todayStr}
              </div>
            </div>

            <p style="font-weight: 700; margin-bottom: 12px;">To Whom It May Concern,</p>
            
            <p style="line-height: 1.6; margin-bottom: 12px;">
              This is to certify that <strong>Khanna Holidays Pvt. Ltd.</strong> is officially processing the tourist visa application for 
              <strong id="prevCompanyAuthName">${escapeHTML(app.fullName || '[Applicant Full Name]')}</strong> (Passport Number: <strong id="prevCompanyAuthPassport">${escapeHTML(app.passportNumber || '[Passport Number]')}</strong>) 
              for their forthcoming travel to <strong id="prevCompanyAuthDest">${escapeHTML(travel.destinationCountry || 'Schengen')}</strong>.
            </p>

            <p style="line-height: 1.6; margin-bottom: 16px;">
              We hereby confirm that all provided flight bookings, hotel reservations, and travel itineraries are authentic and arranged in accordance with consular requirements.
            </p>

            <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-bottom: 20px;">
              <div style="font-weight: 700; color: #003B7A;" id="prevCompanyAuthSignee">Ms. Dhvani Chheda</div>
              <div style="font-size: 0.82rem; color: #475569;" id="prevCompanyAuthTitle">Team Lead – Visa Operations</div>
              <div style="font-size: 0.8rem; color: #64748b;">Khanna Holidays Pvt. Ltd.</div>
            </div>

            <!-- Official Two-Box Footer -->
            ${OFFICIAL_TWO_BOX_FOOTER_HTML}
          </div>
        </div>
      </div>
    </div>
  `;
}

function syncStandaloneCompanyAuthPreview() {
  const name = document.getElementById('companyAuthName')?.value || AppStore.applicant.fullName || '[Applicant Full Name]';
  const passport = document.getElementById('companyAuthPassport')?.value || AppStore.applicant.passportNumber || '[Passport Number]';
  const dest = document.getElementById('companyAuthDest')?.value || AppStore.travel.destinationCountry || 'Destination';
  const signee = document.getElementById('companyAuthSignee')?.value || 'Ms. Dhvani Chheda';
  const title = document.getElementById('companyAuthTitle')?.value || 'Team Lead – Visa Operations';
  const dateStr = document.getElementById('companyAuthDate')?.value || '';

  const elName = document.getElementById('prevCompanyAuthName');
  const elPassport = document.getElementById('prevCompanyAuthPassport');
  const elDest = document.getElementById('prevCompanyAuthDest');
  const elSignee = document.getElementById('prevCompanyAuthSignee');
  const elTitle = document.getElementById('prevCompanyAuthTitle');
  const elDate = document.getElementById('prevCompanyAuthDate');

  if (elName) elName.textContent = name;
  if (elPassport) elPassport.textContent = passport;
  if (elDest) elDest.textContent = dest;
  if (elSignee) elSignee.textContent = signee;
  if (elTitle) elTitle.textContent = title;
  if (elDate && dateStr) elDate.textContent = `Date: ${dateStr}`;
}

/**
 * 4. Passport Authorization Letter Workspace
 */
let currentPassportAuthMode = 'single';

function setPassportAuthMode(mode) {
  currentPassportAuthMode = mode;
  const btnSingle = document.getElementById('btnPassAuthSingle');
  const btnCouple = document.getElementById('btnPassAuthCouple');
  const coupleFields = document.getElementById('couplePassportFields');

  if (btnSingle && btnCouple) {
    if (mode === 'single') {
      btnSingle.className = 'btn btn-sm btn-primary';
      btnCouple.className = 'btn btn-sm btn-secondary';
      if (coupleFields) coupleFields.style.display = 'none';
    } else {
      btnSingle.className = 'btn btn-sm btn-secondary';
      btnCouple.className = 'btn btn-sm btn-primary';
      if (coupleFields) coupleFields.style.display = 'block';
    }
  }
  syncStandalonePassportAuthPreview();
}

function syncStandalonePassportAuthWorkspace() {
  const container = document.getElementById('standalonePassportAuthContainer');
  if (!container) return;

  const app = AppStore.applicant;
  const travel = AppStore.travel;
  const coTraveller = AppStore.travellers[0] || {};
  const isCouple = currentPassportAuthMode === 'couple';

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
      <div>
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--color-text);">Passport Authorization Letter Workspace</h2>
        <p style="margin: 0; font-size: 0.84rem; color: var(--color-text-muted);">Authorizes Mr. Praduman Tripathi (Khanna Holidays Pvt. Ltd.) to collect passports.</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadPassportAuthDocx('single')">
          Download Single (.docx)
        </button>
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadPassportAuthDocx('couple')">
          Download Couple (.docx)
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="downloadPassportAuthPdf(currentPassportAuthMode)">
          Download PDF (Word-Fidelity)
        </button>
      </div>
    </div>

    <!-- Use Existing Application Data Toolbar -->
    ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('passport-authorization') : ''}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: var(--space-5); align-items: start;">
      <!-- Left: Form Inputs -->
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700;">Authorization Parameters</h3>

        <div>
          <label class="form-label">Authorization Type</label>
          <div style="display: flex; gap: var(--space-2);">
            <button type="button" class="btn btn-sm ${!isCouple ? 'btn-primary' : 'btn-secondary'}" id="btnPassAuthSingle" onclick="setPassportAuthMode('single')">
              Single Applicant
            </button>
            <button type="button" class="btn btn-sm ${isCouple ? 'btn-primary' : 'btn-secondary'}" id="btnPassAuthCouple" onclick="setPassportAuthMode('couple')">
              Couple / Multiple
            </button>
          </div>
        </div>

        <div>
          <label class="form-label">Primary Applicant Name</label>
          <input type="text" class="form-control" id="passAuthLeadName" value="${escapeHTML(app.fullName || '')}" placeholder="Full Name" oninput="AppStore.applicant.fullName = this.value; syncStandalonePassportAuthPreview();" />
        </div>

        <div>
          <label class="form-label">Primary Passport Number</label>
          <input type="text" class="form-control" id="passAuthLeadPass" value="${escapeHTML(app.passportNumber || '')}" placeholder="Passport Number" oninput="AppStore.applicant.passportNumber = this.value; syncStandalonePassportAuthPreview();" />
        </div>

        <div id="couplePassportFields" style="display: ${isCouple ? 'block' : 'none'};">
          <div style="margin-bottom: var(--space-3);">
            <label class="form-label">Second / Spouse Applicant Name</label>
            <input type="text" class="form-control" id="passAuthSpouseName" value="${escapeHTML(coTraveller.fullName || '')}" placeholder="Spouse / Co-traveller Name" oninput="syncStandalonePassportAuthPreview();" />
          </div>
          <div>
            <label class="form-label">Second Passport Number</label>
            <input type="text" class="form-control" id="passAuthSpousePass" value="${escapeHTML(coTraveller.passportNumber || '')}" placeholder="Second Passport Number" oninput="syncStandalonePassportAuthPreview();" />
          </div>
        </div>

        <div>
          <label class="form-label">Authorized Bearer Name</label>
          <input type="text" class="form-control" id="passAuthBearer" value="Mr. Praduman Tripathi" oninput="syncStandalonePassportAuthPreview();" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label class="form-label">Contact Phone</label>
            <input type="text" class="form-control" id="passAuthPhone" value="${escapeHTML(travel.applicantPhone || '+91 9819347139')}" oninput="AppStore.travel.applicantPhone = this.value; syncStandalonePassportAuthPreview();" />
          </div>
          <div>
            <label class="form-label">Contact Email</label>
            <input type="email" class="form-control" id="passAuthEmail" value="${escapeHTML(travel.applicantEmail || 'customercare@khannatravels.com')}" oninput="AppStore.travel.applicantEmail = this.value; syncStandalonePassportAuthPreview();" />
          </div>
        </div>
      </div>

      <!-- Right: Live Letter Preview with Word Toolbar -->
      <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 0; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); background: var(--color-surface);">
          <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint);">Authority Letter Preview (Editable)</span>
          <span class="badge badge-success">Official Header &amp; Footer</span>
        </div>

        <!-- Word-like In-Browser Editing Toolbar -->
        ${typeof WordToolbar !== 'undefined' ? WordToolbar.render('passportAuthLivePreviewContent') : ''}

        <div style="padding: 16px;">
          <div id="passportAuthLivePreviewContent" contenteditable="true" style="padding: 24px; background: #ffffff; color: #1e293b; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; font-family: Arial, sans-serif; font-size: 0.92rem; line-height: 1.6; outline: none;">
            <!-- Rendered by syncStandalonePassportAuthPreview -->
          </div>
        </div>
      </div>
    </div>
  `;

  syncStandalonePassportAuthPreview();
}

function syncStandalonePassportAuthPreview() {
  const preview = document.getElementById('passportAuthLivePreviewContent');
  if (!preview) return;

  const leadName = document.getElementById('passAuthLeadName')?.value || AppStore.applicant.fullName || '[Applicant Full Name]';
  const leadPass = document.getElementById('passAuthLeadPass')?.value || AppStore.applicant.passportNumber || '[Passport Number]';
  const spouseName = document.getElementById('passAuthSpouseName')?.value || (AppStore.travellers[0] && AppStore.travellers[0].fullName) || '[Spouse Name]';
  const spousePass = document.getElementById('passAuthSpousePass')?.value || (AppStore.travellers[0] && AppStore.travellers[0].passportNumber) || '[Second Passport]';
  const bearer = document.getElementById('passAuthBearer')?.value || 'Mr. Praduman Tripathi';
  const phone = document.getElementById('passAuthPhone')?.value || AppStore.travel.applicantPhone || '+91 9819347139';
  const email = document.getElementById('passAuthEmail')?.value || AppStore.travel.applicantEmail || 'customercare@khannatravels.com';
  const isCouple = currentPassportAuthMode === 'couple';

  if (!isCouple) {
    preview.innerHTML = `
      ${OFFICIAL_LH_BANNER_HTML}

      <div style="border-bottom: 2px solid #003B7A; padding-bottom: 6px; margin-bottom: 16px;">
        <div style="font-size: 1.1rem; font-weight: 800; color: #003B7A;">AUTHORITY LETTER</div>
        <div style="font-size: 0.76rem; color: #64748b;">To Collect Original Passport from Visa Application Centre / Embassy</div>
      </div>

      <p style="font-weight: 700; margin-bottom: 12px;">Subject: Authority Letter to collect original passport for ${escapeHTML(leadName)}</p>
      
      <p style="line-height: 1.6; margin-bottom: 12px;">Dear Sir / Madam,</p>

      <p style="line-height: 1.6; margin-bottom: 14px;">
        I, <strong>${escapeHTML(leadName)}</strong>, holding Indian passport number: <strong>${escapeHTML(leadPass)}</strong>, 
        hereby authorize <strong>${escapeHTML(bearer)}</strong> from <strong>Khanna Holidays Pvt. Ltd.</strong>, whose office is at 
        <em>Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056</em>, 
        to collect the original passport on my behalf.
      </p>

      <p style="line-height: 1.6; margin-bottom: 24px;">
        I would appreciate if you could hand over the original passport to the bearer of this letter.
      </p>

      <div style="margin-top: 24px; margin-bottom: 20px;">
        <p style="margin: 0;">Yours faithfully,</p>
        <p style="font-weight: 700; margin-top: 16px; margin-bottom: 4px;">${escapeHTML(leadName)}</p>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Phone No.: ${escapeHTML(phone)}</p>
        <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Email id: ${escapeHTML(email)}</p>
      </div>

      ${OFFICIAL_TWO_BOX_FOOTER_HTML}
    `;
  } else {
    preview.innerHTML = `
      ${OFFICIAL_LH_BANNER_HTML}

      <div style="border-bottom: 2px solid #003B7A; padding-bottom: 6px; margin-bottom: 16px;">
        <div style="font-size: 1.1rem; font-weight: 800; color: #003B7A;">AUTHORITY LETTER (COUPLE / MULTIPLE)</div>
        <div style="font-size: 0.76rem; color: #64748b;">To Collect Original Passports from Visa Application Centre / Embassy</div>
      </div>

      <p style="font-weight: 700; margin-bottom: 12px;">Subject: Authority Letter to collect original passports for ${escapeHTML(leadName)} &amp; ${escapeHTML(spouseName)}</p>
      
      <p style="line-height: 1.6; margin-bottom: 12px;">Dear Sir / Madam,</p>

      <p style="line-height: 1.6; margin-bottom: 14px;">
        We, <strong>${escapeHTML(leadName)}</strong> (Passport No: <strong>${escapeHTML(leadPass)}</strong>) and 
        <strong>${escapeHTML(spouseName)}</strong> (Passport No: <strong>${escapeHTML(spousePass)}</strong>), 
        hereby authorize <strong>${escapeHTML(bearer)}</strong> from <strong>Khanna Holidays Pvt. Ltd.</strong>, whose office is at 
        <em>Reg. Office: 204, 2nd Floor, Cosmos Avenue Building, Station Road, Above Shiv Sagar Restaurant, Vile Parle West, Mumbai – 400056</em>, 
        to collect the original passports on our behalf.
      </p>

      <p style="line-height: 1.6; margin-bottom: 24px;">
        We would appreciate if you could hand over the original passports to the bearer of this letter.
      </p>

      <div style="margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <p style="margin: 0;">Yours faithfully,</p>
          <p style="font-weight: 700; margin-top: 16px; margin-bottom: 4px;">${escapeHTML(leadName)}</p>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Phone: ${escapeHTML(phone)}</p>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Email: ${escapeHTML(email)}</p>
        </div>
        <div>
          <p style="margin: 0;">Co-Applicant,</p>
          <p style="font-weight: 700; margin-top: 16px; margin-bottom: 4px;">${escapeHTML(spouseName)}</p>
          <p style="font-size: 0.82rem; color: #64748b; margin: 0;">Passport: ${escapeHTML(spousePass)}</p>
        </div>
      </div>

      ${OFFICIAL_TWO_BOX_FOOTER_HTML}
    `;
  }
}

/**
 * 5. Consular Invitation Letter Workspace
 */
function syncStandaloneInvitationWorkspace() {
  const container = document.getElementById('standaloneInvitationContainer');
  if (!container) return;

  const inv = AppStore.inviter;
  const app = AppStore.applicant;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);">
      <div>
        <h2 style="margin: 0; font-size: 1.35rem; font-weight: 700; color: var(--color-text);">Consular Invitation Letter Workspace</h2>
        <p style="margin: 0; font-size: 0.84rem; color: var(--color-text-muted);">Host invitation letter for family &amp; friends with embedded inviter signature image.</p>
      </div>
      <div style="display: flex; gap: var(--space-2);">
        <button class="btn btn-secondary btn-sm" type="button" onclick="downloadInvitationLetterDocx()">
          Download Word (.docx)
        </button>
        <button class="btn btn-primary btn-sm" type="button" onclick="downloadInvitationLetterPdf()">
          Download PDF (Word-Fidelity)
        </button>
      </div>
    </div>

    <!-- Use Existing Application Data Toolbar -->
    ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('invitation-letter') : ''}

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: var(--space-5); align-items: start;">
      <div class="card" style="display: flex; flex-direction: column; gap: var(--space-3);">
        <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700;">Inviter (Host) Details</h3>
        
        <div>
          <label class="form-label">Host Full Name</label>
          <input type="text" class="form-control" id="invHostName" value="${escapeHTML(inv.name || '')}" placeholder="Host Name" oninput="AppStore.inviter.name = this.value; syncStandaloneInvitationPreview();" />
        </div>

        <div>
          <label class="form-label">Host Foreign Address</label>
          <textarea class="form-control" rows="2" placeholder="Full residential address abroad" oninput="AppStore.inviter.address = this.value; syncStandaloneInvitationPreview();">${escapeHTML(inv.address || '')}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
          <div>
            <label class="form-label">Relationship</label>
            <select class="form-control" onchange="AppStore.inviter.relationship = this.value; syncStandaloneInvitationPreview();">
              <option value="Parents" ${inv.relationship === 'Parents' ? 'selected' : ''}>Parents</option>
              <option value="Father" ${inv.relationship === 'Father' ? 'selected' : ''}>Father</option>
              <option value="Mother" ${inv.relationship === 'Mother' ? 'selected' : ''}>Mother</option>
              <option value="Son" ${inv.relationship === 'Son' ? 'selected' : ''}>Son</option>
              <option value="Daughter" ${inv.relationship === 'Daughter' ? 'selected' : ''}>Daughter</option>
              <option value="Brother" ${inv.relationship === 'Brother' ? 'selected' : ''}>Brother</option>
              <option value="Sister" ${inv.relationship === 'Sister' ? 'selected' : ''}>Sister</option>
              <option value="Spouse" ${inv.relationship === 'Spouse' ? 'selected' : ''}>Spouse</option>
              <option value="Friend" ${inv.relationship === 'Friend' ? 'selected' : ''}>Friend</option>
              <option value="Relative" ${inv.relationship === 'Relative' ? 'selected' : ''}>Relative</option>
              <option value="Business Associate" ${inv.relationship === 'Business Associate' ? 'selected' : ''}>Business Associate</option>
            </select>
          </div>
          <div>
            <label class="form-label">Host Occupation</label>
            <input type="text" class="form-control" list="occupationsList" value="${escapeHTML(inv.occupation || 'Software Engineer')}" oninput="AppStore.inviter.occupation = this.value; syncStandaloneInvitationPreview();" />
          </div>
        </div>

        <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-3);">
          <label class="form-label">Upload Inviter Signature Image</label>
          <input type="file" accept="image/*" class="form-control" onchange="handleInviterSignatureUpload(this);" />
          <div id="inviterSignaturePreview" style="margin-top: 8px;">
            ${inv.signatureImage ? `<img src="${inv.signatureImage}" style="max-height: 48px; border: 1px dashed #cbd5e1; padding: 4px;" alt="Signature" />` : '<span style="font-size: 0.78rem; color: var(--color-text-faint);">No signature image uploaded yet.</span>'}
          </div>
        </div>
      </div>

      <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); padding: 0; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding: var(--space-3) var(--space-4); background: var(--color-surface);">
          <span style="font-size: 0.82rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint);">Letter Preview (Editable)</span>
          <span class="badge badge-success">Consular Format</span>
        </div>

        <!-- Word-like In-Browser Editing Toolbar -->
        ${typeof WordToolbar !== 'undefined' ? WordToolbar.render('invitationLivePreviewContent') : ''}

        <div style="padding: 16px;">
          <div id="invitationLivePreviewContent" contenteditable="true" style="padding: 24px; background: #ffffff; color: #1e293b; border-radius: var(--radius-sm); border: 1px solid #cbd5e1; min-height: 440px; font-size: 0.92rem; line-height: 1.6; font-family: Arial, sans-serif; outline: none;">
            <p><strong>To,<br/>The Visa Officer,</strong><br/>Consulate General of ${escapeHTML(AppStore.travel.destinationCountry || 'Destination Country')}</p>
            <p style="margin: 14px 0;"><strong>Subject: Invitation Letter for Visitor's Visa issuance for my <span id="prevInvRelation">${escapeHTML(inv.relationship || 'Parents')}</span></strong></p>
            <p>Dear Sir/Madam,</p>
            <p>I, <strong><span id="prevInvName">${escapeHTML(inv.name || '[Host Name]')}</span></strong> (Passport No.: <strong>${escapeHTML(inv.passportNumber || '[Host Passport]')}</strong>), residing at <em><span id="prevInvAddr">${escapeHTML(inv.address || '[Address Abroad]')}</span></em>, would like to invite my <span id="prevInvRelation2">${escapeHTML(inv.relationship || 'Parents')}</span>, <strong>${escapeHTML(app.fullName || '[Applicant Name]')}</strong> (holding Indian Passport No: <strong>${escapeHTML(app.passportNumber || '[Passport Number]')}</strong>), to visit me for tourism and family leisure.</p>
            <p>During their stay, they will be accommodated at my residence or adjacent verified hotel booking. I undertake that they will strictly abide by local regulations and return to India prior to visa expiry.</p>
            <p>I sincerely request you to kindly grant the necessary tourist visa.</p>
            
            <div style="margin-top: 28px;">
              <p style="margin-bottom: 8px;">Yours Sincerely,</p>
              <div id="inviterSigPreviewInLetter" style="height: 52px; margin-bottom: 8px;">
                ${inv.signatureImage ? `<img src="${inv.signatureImage}" style="max-height: 48px;" alt="Signature" />` : ''}
              </div>
              <p><strong><span id="prevInvName2">${escapeHTML(inv.name || '[Host Name]')}</span></strong></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function syncStandaloneInvitationPreview() {
  const inv = AppStore.inviter;
  const rel = document.getElementById('prevInvRelation');
  if (rel) rel.textContent = inv.relationship || 'Parents';
  const rel2 = document.getElementById('prevInvRelation2');
  if (rel2) rel2.textContent = inv.relationship || 'Parents';
  const name = document.getElementById('prevInvName');
  if (name) name.textContent = inv.name || '[Host Name]';
  const name2 = document.getElementById('prevInvName2');
  if (name2) name2.textContent = inv.name || '[Host Name]';
  const addr = document.getElementById('prevInvAddr');
  if (addr) addr.textContent = inv.address || '[Address Abroad]';
}

function handleInviterSignatureUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    AppStore.inviter.signatureImage = e.target.result;
    const preview = document.getElementById('inviterSignaturePreview');
    if (preview) {
      preview.innerHTML = `<img src="${e.target.result}" style="max-height: 48px; border: 1px dashed #cbd5e1; padding: 4px;" alt="Signature" />`;
    }
    const sigInLetter = document.getElementById('inviterSigPreviewInLetter');
    if (sigInLetter) {
      sigInLetter.innerHTML = `<img src="${e.target.result}" style="max-height: 48px;" alt="Signature" />`;
    }
    showToast('Inviter signature uploaded and attached.', 'success');
  };
  reader.readAsDataURL(file);
}

/**
 * 6. Visa Requirements Checklist Workspace Helper
 */
function syncStandaloneChecklistWorkspace() {
  if (window.KhannaChecklist && typeof window.KhannaChecklist.renderWorkspace === 'function') {
    window.KhannaChecklist.renderWorkspace();
  }
}

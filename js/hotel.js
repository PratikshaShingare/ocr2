/**
 * Khanna Travels & Holidays — Hotel Blocking & Multi-Stay Controller
 * (js/hotel.js)
 */

let stayCounter = 0;

/**
 * Adds a new blank hotel stay record.
 */
function addBlankHotelStay() {
  stayCounter++;
  const newStay = {
    id: `stay_${Date.now()}_${stayCounter}`,
    stayNumber: stayCounter,
    confirmationNumber: '',
    hotelName: '',
    leadGuest: AppStore.applicant.fullName || '',
    numGuests: '1 Adult(s)',
    numRooms: '1',
    phone: '',
    checkIn: '',
    checkOut: '',
    duration: '',
    city: '',
    address: '',
    guests: [
      {
        id: `g_${Date.now()}_1`,
        guestName: AppStore.applicant.fullName || 'Lead Guest',
        roomType: 'Standard Room',
        numGuests: '1 Adult(s)'
      }
    ],
    status: 'manual'
  };

  AppStore.hotels.push(newStay);
  renderHotelStaysList();
  showToast(`Hotel Stay ${newStay.stayNumber} added.`, 'info');
}

/**
 * Removes a hotel stay record.
 */
function removeHotelStay(stayId) {
  const index = AppStore.hotels.findIndex(h => h.id === stayId);
  if (index !== -1) {
    AppStore.hotels.splice(index, 1);
    renderHotelStaysList();
    showToast('Hotel stay removed.', 'info');
  }
}

/**
 * Renders all hotel stay cards and editable guest tables.
 */
function renderHotelStaysList() {
  const container = document.getElementById('hotelStaysContainer');
  if (!container) return;

  if (AppStore.hotels.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; background-color: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 12px;">No hotel bookings uploaded or added yet.</p>
        <p style="font-size: 0.84rem; color: var(--text-light); margin-bottom: 16px;">Upload a hotel voucher document/image above or manually add a hotel stay record.</p>
        <button type="button" class="btn-add-item" onclick="addBlankHotelStay()">+ Add Manual Hotel Stay</button>
      </div>
    `;
    return;
  }

  container.innerHTML = AppStore.hotels.map((stay, idx) => `
    <div class="hotel-stay-card" id="card_${stay.id}">
      <div class="stay-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="stay-badge">Stay ${idx + 1}</span>
          <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--primary-navy); margin: 0;">
            ${escapeHTML(stay.hotelName || 'New Hotel Stay')}
          </h3>
          <span class="field-badge badge-${stay.status}">${stay.status.toUpperCase()}</span>
        </div>
        <button type="button" class="btn-remove-traveller" onclick="removeHotelStay('${stay.id}')">✕ Remove Stay</button>
      </div>

      <!-- Stay Fields Grid -->
      <div class="form-grid">
        <div class="form-group col-4">
          <label class="form-label">Confirmation Number <span class="required">*</span></label>
          <input type="text" class="form-control" value="${escapeHTML(stay.confirmationNumber)}" placeholder="e.g. TBWP06SS09" oninput="updateStayField('${stay.id}', 'confirmationNumber', this.value)">
        </div>

        <div class="form-group col-8">
          <label class="form-label">Hotel Name <span class="required">*</span></label>
          <input type="text" class="form-control" value="${escapeHTML(stay.hotelName)}" placeholder="e.g. Novotel Sydney City Centre" oninput="updateStayField('${stay.id}', 'hotelName', this.value)">
        </div>

        <div class="form-group col-4">
          <label class="form-label">Lead Guest</label>
          <input type="text" class="form-control" value="${escapeHTML(stay.leadGuest)}" placeholder="Lead Guest Name" oninput="updateStayField('${stay.id}', 'leadGuest', this.value)">
        </div>

        <div class="form-group col-4">
          <label class="form-label">Check-In Date <span class="required">*</span></label>
          <input type="text" class="form-control" value="${escapeHTML(stay.checkIn)}" placeholder="e.g. 04-Dec-2026" oninput="updateStayField('${stay.id}', 'checkIn', this.value)">
        </div>

        <div class="form-group col-4">
          <label class="form-label">Check-Out Date <span class="required">*</span></label>
          <input type="text" class="form-control" value="${escapeHTML(stay.checkOut)}" placeholder="e.g. 06-Dec-2026" oninput="updateStayField('${stay.id}', 'checkOut', this.value)">
        </div>

        <div class="form-group col-3">
          <label class="form-label">Duration</label>
          <input type="text" class="form-control" list="hotelDurationList" value="${escapeHTML(stay.duration)}" placeholder="e.g. 2 Night(s)" oninput="updateStayField('${stay.id}', 'duration', this.value)">
        </div>

        <div class="form-group col-3">
          <label class="form-label">City</label>
          <input type="text" class="form-control" list="worldCitiesList" value="${escapeHTML(stay.city)}" placeholder="e.g. Sydney" oninput="updateStayField('${stay.id}', 'city', this.value)">
        </div>

        <div class="form-group col-3">
          <label class="form-label">Hotel Phone No.</label>
          <input type="text" class="form-control" value="${escapeHTML(stay.phone)}" placeholder="e.g. +61 2 7255 2300" oninput="updateStayField('${stay.id}', 'phone', this.value)">
        </div>

        <div class="form-group col-3">
          <label class="form-label">No. of Rooms</label>
          <input type="text" class="form-control" value="${escapeHTML(stay.numRooms)}" placeholder="1" oninput="updateStayField('${stay.id}', 'numRooms', this.value)">
        </div>

        <div class="form-group col-12">
          <label class="form-label">Hotel Address</label>
          <input type="text" class="form-control" value="${escapeHTML(stay.address)}" placeholder="Full street address of the hotel" oninput="updateStayField('${stay.id}', 'address', this.value)">
        </div>
      </div>

      <!-- Editable Guest / Room Table -->
      <div style="margin-top: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <label style="font-size: 0.88rem; font-weight: 700; color: var(--primary-navy-dark);">
            Hotel Guest & Room Allocations
          </label>
          <button type="button" class="btn-secondary" style="padding: 4px 10px; font-size: 0.78rem;" onclick="addGuestRowToStay('${stay.id}')">
            + Add Guest Row
          </button>
        </div>

        <div class="table-responsive">
          <table class="app-table">
            <thead>
              <tr>
                <th style="width: 45%;">Guest Name</th>
                <th style="width: 30%;">Room Type</th>
                <th style="width: 20%;">No. of Guests</th>
                <th style="width: 5%; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${stay.guests.map(guest => `
                <tr>
                  <td>
                    <input type="text" class="table-input" value="${escapeHTML(guest.guestName)}" placeholder="e.g. Mr. John Doe" oninput="updateGuestRow('${stay.id}', '${guest.id}', 'guestName', this.value)">
                  </td>
                  <td>
                    <input type="text" class="table-input" list="hotelRoomTypesList" value="${escapeHTML(guest.roomType)}" placeholder="e.g. Standard King Room" oninput="updateGuestRow('${stay.id}', '${guest.id}', 'roomType', this.value)">
                  </td>
                  <td>
                    <input type="text" class="table-input" list="hotelPaxList" value="${escapeHTML(guest.numGuests)}" placeholder="e.g. 1 Adult(s)" oninput="updateGuestRow('${stay.id}', '${guest.id}', 'numGuests', this.value)">
                  </td>
                  <td style="text-align: center;">
                    <button type="button" class="btn-table-action" title="Delete Row" onclick="removeGuestRowFromStay('${stay.id}', '${guest.id}')">✕</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `).join('') + `
    <div style="margin-top: 16px;">
      <button type="button" class="btn-add-item" onclick="addBlankHotelStay()">+ Add Another Hotel Stay</button>
    </div>
  `;
}

/**
 * Updates a single field in a stay object.
 */
function updateStayField(stayId, field, value) {
  const stay = AppStore.hotels.find(h => h.id === stayId);
  if (stay) {
    stay[field] = value;
  }
}

/**
 * Adds a guest row to a specific hotel stay.
 */
function addGuestRowToStay(stayId) {
  const stay = AppStore.hotels.find(h => h.id === stayId);
  if (stay) {
    stay.guests.push({
      id: `g_${Date.now()}_${stay.guests.length + 1}`,
      guestName: '',
      roomType: 'Standard Room',
      numGuests: '1 Adult(s)'
    });
    renderHotelStaysList();
  }
}

/**
 * Removes a guest row from a specific hotel stay.
 */
function removeGuestRowFromStay(stayId, guestId) {
  const stay = AppStore.hotels.find(h => h.id === stayId);
  if (stay) {
    if (stay.guests.length <= 1) {
      showToast('At least one guest row is required per stay.', 'warning');
      return;
    }
    stay.guests = stay.guests.filter(g => g.id !== guestId);
    renderHotelStaysList();
  }
}

/**
 * Updates a field in a guest row.
 */
function updateGuestRow(stayId, guestId, field, value) {
  const stay = AppStore.hotels.find(h => h.id === stayId);
  if (stay) {
    const guest = stay.guests.find(g => g.id === guestId);
    if (guest) {
      guest[field] = value;
    }
  }
}

/**
 * Handles uploaded hotel voucher file (Single or Multi-stay).
 */
async function handleHotelVoucherUpload(file) {
  if (!file) return;

  showToast('Processing hotel voucher with OCR engine...', 'info');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/ocr/hotel', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      stayCounter++;
      const newStay = {
        id: `stay_${Date.now()}_${stayCounter}`,
        stayNumber: stayCounter,
        confirmationNumber: data.confirmationNumber || '',
        hotelName: data.hotelName || '',
        leadGuest: data.leadGuest || AppStore.applicant.fullName || '',
        numGuests: data.numGuests || '1 Adult(s)',
        numRooms: data.numRooms || '1',
        phone: data.phone || '',
        checkIn: data.checkIn || '',
        checkOut: data.checkOut || '',
        duration: data.duration || '',
        city: data.city || '',
        address: data.address || '',
        guests: (data.guests && data.guests.length > 0) ? data.guests : [
          {
            id: `g_${Date.now()}_1`,
            guestName: data.leadGuest || AppStore.applicant.fullName || 'Lead Guest',
            roomType: data.roomType || 'Standard Room',
            numGuests: data.numGuests || '1 Adult(s)'
          }
        ],
        status: 'extracted'
      };

      AppStore.hotels.push(newStay);
      renderHotelStaysList();
      showToast(`Extracted hotel stay: ${newStay.hotelName || 'Booking'}`, 'success');
    } else {
      throw new Error('Server returned non-200 for hotel OCR');
    }
  } catch (err) {
    console.warn('Hotel OCR server unreachable, creating editable stay card:', err);
    addBlankHotelStay();
    showToast('Hotel stay card created. Please verify details.', 'info');
  }
}

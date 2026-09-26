/**
 * Khanna Travels & Holidays — Accompanying Travellers Controller
 * (js/travellers.js)
 * Enhanced with:
 * - Compact upload area (~440px max-width)
 * - Complete field extraction (fullName, passportNumber, dateOfBirth, gender,
 *   nationality, placeOfIssue, dateOfIssue, dateOfExpiry, occupation)
 * - Live canonical deskewed preview with rotation & flip controls
 */

let travellerCounter = 1; // 1 is Primary Applicant

/**
 * Adds a new accompanying traveller profile.
 */
function addTraveller() {
  travellerCounter++;
  const newTraveller = {
    id: `traveller_${Date.now()}`,
    number: travellerCounter,
    relation: 'Spouse',
    fullName: '',
    passportNumber: '',
    dateOfBirth: '',
    gender: 'Female',
    nationality: 'Indian',
    placeOfIssue: '',
    dateOfIssue: '',
    dateOfExpiry: '',
    occupation: 'Employed',
    pages: [],
    currentPageIndex: 0,
    previewImageUrl: null,
    status: 'manual'
  };

  AppStore.travellers.push(newTraveller);
  renderTravellersList();
  showToast(`Traveller ${newTraveller.number} added.`, 'info');
}

/**
 * Removes an accompanying traveller profile.
 */
function removeTraveller(travellerId) {
  const index = AppStore.travellers.findIndex(t => t.id === travellerId);
  if (index !== -1) {
    AppStore.travellers.splice(index, 1);
    renderTravellersList();
    showToast('Traveller removed.', 'info');
  }
}

/**
 * Renders the list of accompanying traveller cards.
 */
function renderTravellersList() {
  const container = document.getElementById('travellersListContainer');
  if (!container) return;

  if (AppStore.travellers.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; background-color: var(--bg-surface); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
        <p style="color: var(--text-muted); font-size: 0.95rem; margin-bottom: 12px;">No accompanying travellers added yet.</p>
        <p style="font-size: 0.84rem; color: var(--text-light); margin-bottom: 16px;">The primary applicant is registered as Traveller 1. If spouse, children, or friends are travelling together, click below.</p>
        <button type="button" class="btn-add-item" onclick="addTraveller()">+ Add Accompanying Traveller</button>
      </div>
    `;
    return;
  }

  container.innerHTML = AppStore.travellers.map((traveller, idx) => {
    // Current page & preview logic
    const pages = traveller.pages || [];
    const curIdx = traveller.currentPageIndex || 0;
    const curPage = pages[curIdx] || null;
    const imgSrc = curPage ? curPage.previewImage : (traveller.previewImageUrl || '');
    const rot = (curPage && typeof curPage.rotation === 'number') ? curPage.rotation : (traveller.rotation || 0);

    let previewPanelHtml = '';
    if (imgSrc) {
      previewPanelHtml = `
        <div class="traveller-preview-panel" style="max-width: 440px; margin: 0 auto 16px;">
          <div class="traveller-preview-toolbar">
            <span>${pages.length > 1 ? `Page ${curIdx + 1} of ${pages.length}` : 'Passport Scan Preview'}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
              <button type="button" class="btn-toolbar" style="color: #fff; padding: 4px 8px;" title="Rotate Counter-Clockwise" onclick="rotateTravellerPreview('${traveller.id}', -90)">↺</button>
              <button type="button" class="btn-toolbar" style="color: #fff; padding: 4px 8px;" title="Rotate Clockwise" onclick="rotateTravellerPreview('${traveller.id}', 90)">↻</button>
              ${pages.length > 1 ? `
                <button type="button" class="btn-toolbar" style="color: #fff; padding: 4px 8px;" title="Flip Page" onclick="flipTravellerPreview('${traveller.id}')">⇄</button>
              ` : ''}
            </div>
          </div>
          <div class="traveller-preview-canvas">
            <img id="img_${traveller.id}" class="traveller-preview-img" src="${imgSrc}" style="transform: rotate(${rot}deg);" alt="Passport Preview">
          </div>
        </div>
      `;
    }

    return `
      <div class="traveller-card" id="card_${traveller.id}">
        <div class="traveller-header">
          <div class="traveller-title">
            <span>Traveller ${idx + 2}</span>
            <span class="field-badge badge-${traveller.status}">${traveller.status.toUpperCase()}</span>
          </div>
          <button type="button" class="btn-remove-traveller" onclick="removeTraveller('${traveller.id}')">✕ Remove</button>
        </div>

        <!-- Compact Independent Passport Upload -->
        <div class="traveller-upload-box">
          <div class="dropzone-container" style="padding: 12px 10px; cursor: pointer;" onclick="document.getElementById('file_${traveller.id}').click()">
            <p style="font-weight: 600; font-size: 0.86rem; color: var(--primary-navy); margin-bottom: 2px;">
              📄 Upload Passport for Traveller ${idx + 2}
            </p>
            <p style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 0;">Click or drop passport scan (PDF, JPG, PNG)</p>
            <input type="file" id="file_${traveller.id}" style="display: none;" accept=".jpg,.jpeg,.png,.pdf,.docx,.doc" onchange="handleTravellerPassportUpload('${traveller.id}', this.files[0])">
          </div>
        </div>

        ${previewPanelHtml}

        <!-- Complete Fields Grid -->
        <div class="form-grid">
          <div class="form-group col-3">
            <label class="form-label">Relation to Applicant</label>
            <select class="form-control" onchange="updateTravellerField('${traveller.id}', 'relation', this.value)">
              <option value="Spouse" ${traveller.relation === 'Spouse' ? 'selected' : ''}>Spouse</option>
              <option value="Husband" ${traveller.relation === 'Husband' ? 'selected' : ''}>Husband</option>
              <option value="Wife" ${traveller.relation === 'Wife' ? 'selected' : ''}>Wife</option>
              <option value="Son" ${traveller.relation === 'Son' ? 'selected' : ''}>Son</option>
              <option value="Daughter" ${traveller.relation === 'Daughter' ? 'selected' : ''}>Daughter</option>
              <option value="Child" ${traveller.relation === 'Child' ? 'selected' : ''}>Child</option>
              <option value="Father" ${traveller.relation === 'Father' ? 'selected' : ''}>Father</option>
              <option value="Mother" ${traveller.relation === 'Mother' ? 'selected' : ''}>Mother</option>
              <option value="Parent" ${traveller.relation === 'Parent' ? 'selected' : ''}>Parent</option>
              <option value="Brother" ${traveller.relation === 'Brother' ? 'selected' : ''}>Brother</option>
              <option value="Sister" ${traveller.relation === 'Sister' ? 'selected' : ''}>Sister</option>
              <option value="Sibling" ${traveller.relation === 'Sibling' ? 'selected' : ''}>Sibling</option>
              <option value="Friend" ${traveller.relation === 'Friend' ? 'selected' : ''}>Friend</option>
              <option value="Colleague" ${traveller.relation === 'Colleague' ? 'selected' : ''}>Colleague</option>
              <option value="Business Partner" ${traveller.relation === 'Business Partner' ? 'selected' : ''}>Business Partner</option>
              <option value="Relative" ${traveller.relation === 'Relative' ? 'selected' : ''}>Relative</option>
            </select>
          </div>

          <div class="form-group col-5">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" class="form-control" value="${escapeHTML(traveller.fullName)}" placeholder="Full Name as per Passport" oninput="updateTravellerField('${traveller.id}', 'fullName', this.value)">
          </div>

          <div class="form-group col-4">
            <label class="form-label">Passport Number <span class="required">*</span></label>
            <input type="text" class="form-control" value="${escapeHTML(traveller.passportNumber)}" placeholder="e.g. Z1234567" oninput="updateTravellerField('${traveller.id}', 'passportNumber', this.value)">
          </div>

          <div class="form-group col-3">
            <label class="form-label">Date of Birth</label>
            <input type="text" class="form-control" value="${escapeHTML(traveller.dateOfBirth)}" placeholder="DD/MM/YYYY" oninput="updateTravellerField('${traveller.id}', 'dateOfBirth', this.value)">
          </div>

          <div class="form-group col-3">
            <label class="form-label">Gender</label>
            <select class="form-control" onchange="updateTravellerField('${traveller.id}', 'gender', this.value)">
              <option value="Male" ${traveller.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${traveller.gender === 'Female' ? 'selected' : ''}>Female</option>
              <option value="Other" ${traveller.gender === 'Other' ? 'selected' : ''}>Other</option>
            </select>
          </div>

          <div class="form-group col-3">
            <label class="form-label">Nationality</label>
            <input type="text" class="form-control" list="nationalityList" value="${escapeHTML(traveller.nationality || 'Indian')}" placeholder="Indian" oninput="updateTravellerField('${traveller.id}', 'nationality', this.value)">
          </div>

          <div class="form-group col-3">
            <label class="form-label">Occupation</label>
            <input type="text" class="form-control" list="occupationsList" value="${escapeHTML(traveller.occupation || 'Employed')}" placeholder="e.g. Engineer / Student" oninput="updateTravellerField('${traveller.id}', 'occupation', this.value)">
          </div>

          <div class="form-group col-4">
            <label class="form-label">Place of Issue</label>
            <input type="text" class="form-control" list="indianCitiesList" value="${escapeHTML(traveller.placeOfIssue || '')}" placeholder="e.g. MUMBAI" oninput="updateTravellerField('${traveller.id}', 'placeOfIssue', this.value)">
          </div>

          <div class="form-group col-4">
            <label class="form-label">Date of Issue</label>
            <input type="text" class="form-control" value="${escapeHTML(traveller.dateOfIssue || '')}" placeholder="DD/MM/YYYY" oninput="updateTravellerField('${traveller.id}', 'dateOfIssue', this.value)">
          </div>

          <div class="form-group col-4">
            <label class="form-label">Date of Expiry</label>
            <input type="text" class="form-control" value="${escapeHTML(traveller.dateOfExpiry || '')}" placeholder="DD/MM/YYYY" oninput="updateTravellerField('${traveller.id}', 'dateOfExpiry', this.value)">
          </div>
        </div>
      </div>
    `;
  }).join('') + `
    <div style="margin-top: 16px;">
      <button type="button" class="btn-add-item" onclick="addTraveller()">+ Add Another Traveller</button>
    </div>
  `;
}

/**
 * Updates a single field in a traveller object.
 */
function updateTravellerField(travellerId, field, value) {
  const traveller = AppStore.travellers.find(t => t.id === travellerId);
  if (traveller) {
    traveller[field] = value;
  }
}

/**
 * Rotates preview image for an accompanying traveller.
 */
function rotateTravellerPreview(travellerId, degrees) {
  const traveller = AppStore.travellers.find(t => t.id === travellerId);
  if (!traveller) return;

  const pages = traveller.pages || [];
  const curIdx = traveller.currentPageIndex || 0;
  if (pages[curIdx]) {
    pages[curIdx].rotation = ((pages[curIdx].rotation || 0) + degrees) % 360;
  } else {
    traveller.rotation = ((traveller.rotation || 0) + degrees) % 360;
  }

  const rot = pages[curIdx] ? pages[curIdx].rotation : traveller.rotation;
  const imgEl = document.getElementById(`img_${travellerId}`);
  if (imgEl) {
    imgEl.style.transform = `rotate(${rot}deg)`;
  }
}

/**
 * Flips page for an accompanying traveller's multi-page scan.
 */
function flipTravellerPreview(travellerId) {
  const traveller = AppStore.travellers.find(t => t.id === travellerId);
  if (!traveller || !traveller.pages || traveller.pages.length <= 1) return;

  const pages = traveller.pages;
  traveller.currentPageIndex = (traveller.currentPageIndex === 0 ? 1 : 0);
  const curPage = pages[traveller.currentPageIndex];

  const imgEl = document.getElementById(`img_${travellerId}`);
  if (imgEl && curPage) {
    imgEl.src = curPage.previewImage;
    imgEl.style.transform = `rotate(${curPage.rotation || 0}deg)`;
  }

  // Update toolbar label if present
  const panel = document.getElementById(`card_${travellerId}`)?.querySelector('.traveller-preview-toolbar span');
  if (panel) {
    panel.textContent = `Page ${traveller.currentPageIndex + 1} of ${pages.length}`;
  }
}

/**
 * Handles independent passport upload for an accompanying traveller.
 */
async function handleTravellerPassportUpload(travellerId, file) {
  if (!file) return;

  const traveller = AppStore.travellers.find(t => t.id === travellerId);
  if (!traveller) return;

  showToast(`Uploading passport for Traveller...`, 'info');

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch('/api/ocr/passport', {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const data = await res.json();
      if (data.passportNumber) traveller.passportNumber = data.passportNumber;
      if (data.fullName) traveller.fullName = data.fullName;
      if (data.dateOfBirth) traveller.dateOfBirth = data.dateOfBirth;
      if (data.gender) traveller.gender = data.gender;
      if (data.nationality) traveller.nationality = data.nationality;
      if (data.placeOfIssue) traveller.placeOfIssue = data.placeOfIssue;
      if (data.dateOfIssue) traveller.dateOfIssue = data.dateOfIssue;
      if (data.dateOfExpiry) traveller.dateOfExpiry = data.dateOfExpiry;

      if (Array.isArray(data.pages) && data.pages.length > 0) {
        traveller.pages = data.pages.map(p => ({
          ...p,
          rotation: 0
        }));
        traveller.currentPageIndex = 0;
        traveller.previewImageUrl = data.pages[0].previewImage || data.previewImage;
      } else if (data.previewImage) {
        traveller.previewImageUrl = data.previewImage;
        traveller.pages = [{
          pageNumber: 1,
          pageType: 'FRONT_PAGE',
          previewImage: data.previewImage,
          rotation: 0
        }];
        traveller.currentPageIndex = 0;
      }

      traveller.status = 'extracted';
      renderTravellersList();
      showToast(`Traveller passport extracted successfully.`, 'success');
    } else {
      throw new Error('OCR response not ok');
    }
  } catch (err) {
    console.warn('Backend unavailable, using fallback:', err);
    // Fallback: Read file name / browser FileReader
    const reader = new FileReader();
    reader.onload = function(e) {
      traveller.previewImageUrl = e.target.result;
      traveller.pages = [{
        pageNumber: 1,
        pageType: 'FRONT_PAGE',
        previewImage: e.target.result,
        rotation: 0
      }];
      traveller.currentPageIndex = 0;
      traveller.status = 'manual';
      renderTravellersList();
      showToast('Passport loaded. Verify or fill details manually.', 'info');
    };
    reader.readAsDataURL(file);
  }
}

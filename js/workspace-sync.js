/**
 * Khanna Travels & Holidays — Existing Application Sync & Profile Re-use Controller
 * (js/workspace-sync.js)
 * Manages cross-document data re-use across Cover Letter, Hotel Blocking,
 * Company Auth, Passport Auth, Checklist, and Invitation Letter.
 */

const WorkspaceSync = {
  /**
   * Generates HTML for the 'Use Data from Existing Application' toolbar.
   */
  renderToolbar(docType) {
    const list = (typeof ApplicationsStore !== 'undefined') ? ApplicationsStore.getAll() : [];
    const currentId = (typeof AppStore !== 'undefined') ? AppStore.currentAppId : null;

    const options = list.map(app => {
      const isSelected = app.id === currentId ? 'selected' : '';
      const dest = app.destination ? ` (${escapeHTML(app.destination)})` : '';
      const pass = app.passportNumber ? ` [${escapeHTML(app.passportNumber)}]` : '';
      return `<option value="${app.id}" ${isSelected}>${escapeHTML(app.applicantName)}${pass}${dest}</option>`;
    }).join('');

    return `
      <div class="existing-app-toolbar card" style="margin-bottom: var(--space-4); padding: 12px 16px; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: var(--radius-sm); background: var(--color-primary-soft); color: var(--color-primary); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          </div>
          <div>
            <div style="font-size: 0.88rem; font-weight: 700; color: var(--color-text);">Use Data from Existing Application</div>
            <div style="font-size: 0.76rem; color: var(--color-text-muted);">Autofill this document from saved client profiles and verified passport scans</div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select class="form-control form-control-sm" id="existingAppSelect_${docType}" style="min-width: 220px; max-width: 320px; font-size: 0.84rem;" onchange="WorkspaceSync.applyApplicationData(this.value, '${docType}')">
            <option value="">-- Select Client Profile --</option>
            ${options}
          </select>

          <button class="btn btn-secondary btn-sm" type="button" onclick="WorkspaceSync.saveCurrentProfile('${docType}')" title="Save current inputs as reusable client profile">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg>
            Save Profile
          </button>

          <button class="btn btn-ghost btn-sm" type="button" onclick="WorkspaceSync.openModalPicker('${docType}')" title="Search & Browse All Applications">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Browse
          </button>
        </div>
      </div>
    `;
  },

  /**
   * Applies the selected application data into AppStore and refreshes the document view.
   */
  applyApplicationData(appId, docType) {
    if (!appId) return;
    const list = (typeof ApplicationsStore !== 'undefined') ? ApplicationsStore.getAll() : [];
    const app = list.find(a => a.id === appId);
    if (!app) return;

    if (app.data) {
      Object.assign(AppStore.applicant, app.data.applicant || {});
      AppStore.travellers = app.data.travellers || [];
      AppStore.hotels = app.data.hotels || [];
      Object.assign(AppStore.travel, app.data.travel || {});
      Object.assign(AppStore.inviter, app.data.inviter || {});
    } else {
      if (app.applicantName && app.applicantName !== 'Unnamed Applicant') {
        AppStore.applicant.fullName = app.applicantName;
      }
      if (app.passportNumber && app.passportNumber !== 'Pending') {
        AppStore.applicant.passportNumber = app.passportNumber;
      }
      if (app.destination) {
        AppStore.travel.destinationCountry = app.destination;
      }
    }

    AppStore.currentAppId = app.id;
    this.refreshDocWorkspace(docType);
    showToast('Loaded profile for ' + (app.applicantName || 'Applicant'), 'success');
  },

  /**
   * Scrapes visible inputs from active document and saves into ApplicationsStore.
   */
  saveCurrentProfile(docType) {
    const nameEl = document.getElementById('companyAuthName') || document.getElementById('passAuthLeadName') || document.getElementById('invApplicantName');
    if (nameEl && nameEl.value) AppStore.applicant.fullName = nameEl.value;

    const passEl = document.getElementById('companyAuthPassport') || document.getElementById('passAuthLeadPass') || document.getElementById('invApplicantPass');
    if (passEl && passEl.value) AppStore.applicant.passportNumber = passEl.value;

    const destEl = document.getElementById('companyAuthDest') || document.getElementById('invDestination');
    if (destEl && destEl.value) AppStore.travel.destinationCountry = destEl.value;

    if (typeof ApplicationsStore !== 'undefined') {
      const saved = ApplicationsStore.saveCurrent();
      showToast('Saved profile for ' + saved.applicantName, 'success');
      this.refreshDocWorkspace(docType);
    }
  },

  /**
   * Refreshes the active document view.
   */
  refreshDocWorkspace(docType) {
    switch (docType) {
      case 'hotel-blocking':
        if (typeof syncStandaloneHotelWorkspace === 'function') syncStandaloneHotelWorkspace();
        break;
      case 'cover-letter':
        if (typeof syncStandaloneCoverLetterWorkspace === 'function') syncStandaloneCoverLetterWorkspace();
        break;
      case 'company-authorization':
        if (typeof syncStandaloneCompanyAuthWorkspace === 'function') syncStandaloneCompanyAuthWorkspace();
        break;
      case 'passport-authorization':
        if (typeof syncStandalonePassportAuthWorkspace === 'function') syncStandalonePassportAuthWorkspace();
        break;
      case 'checklist-letter':
        if (typeof KhannaChecklist !== 'undefined' && KhannaChecklist.renderWorkspace) {
          KhannaChecklist.renderWorkspace();
        }
        break;
      case 'invitation-letter':
        if (typeof syncStandaloneInvitationWorkspace === 'function') syncStandaloneInvitationWorkspace();
        break;
      default:
        break;
    }
  },

  /**
   * Opens the searchable application picker modal.
   */
  openModalPicker(docType) {
    const list = (typeof ApplicationsStore !== 'undefined') ? ApplicationsStore.getAll() : [];
    let modal = document.getElementById('workspaceAppPickerModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'workspaceAppPickerModal';
      modal.className = 'app-picker-overlay';
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
      document.body.appendChild(modal);
    }

    const renderList = (filter = '') => {
      const q = filter.toLowerCase().trim();
      const filtered = list.filter(a => {
        if (!q) return true;
        return (a.applicantName || '').toLowerCase().includes(q) ||
               (a.passportNumber || '').toLowerCase().includes(q) ||
               (a.destination || '').toLowerCase().includes(q);
      });

      if (filtered.length === 0) {
        return '<p class="app-picker__empty">No matching applications found.</p>';
      }

      return filtered.map(a => `
        <button type="button" class="app-picker__result" onclick="WorkspaceSync.applyApplicationData('${a.id}', '${docType}'); document.getElementById('workspaceAppPickerModal').style.display='none';">
          <div class="app-picker__result-main">
            <strong>${escapeHTML(a.applicantName)}</strong>
            <span class="badge ${a.status === 'Documents Ready' ? 'badge-success' : 'badge-neutral'}">${escapeHTML(a.status)}</span>
          </div>
          <div class="app-picker__result-meta">
            Passport: ${escapeHTML(a.passportNumber || 'N/A')} • Destination: ${escapeHTML(a.destination || 'Global')}
          </div>
        </button>
      `).join('');
    };

    modal.innerHTML = `
      <div class="app-picker" onclick="event.stopPropagation()">
        <div class="app-picker__header">
          <h3 style="font-size: 1.1rem; font-weight: 700;">Select Saved Application</h3>
          <button type="button" class="btn-icon" onclick="document.getElementById('workspaceAppPickerModal').style.display='none'">✕</button>
        </div>
        <input type="text" class="form-control form-control-sm app-picker__search-field" placeholder="Search by applicant name, passport, or country..." id="pickerSearchInput" />
        <div class="app-picker__results" id="pickerResultsContainer">
          ${renderList()}
        </div>
      </div>
    `;

    modal.style.display = 'flex';
    const input = document.getElementById('pickerSearchInput');
    if (input) {
      input.focus();
      input.addEventListener('input', () => {
        const container = document.getElementById('pickerResultsContainer');
        if (container) container.innerHTML = renderList(input.value);
      });
    }
  }
};

window.WorkspaceSync = WorkspaceSync;

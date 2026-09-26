/**
 * Khanna Travels & Holidays — Applications & Dashboard Controller
 * (js/applications-store.js)
 * Manages persisted applications, dashboard statistics, and table views
 */

const ApplicationsStore = {
  STORAGE_KEY: 'khanna_applications_data',

  getAll() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse applications from storage:', e);
    }
    // Default seed applications if empty
    return [
      {
        id: 'app_sample_1',
        applicantName: 'Dilip Kumar Bijlani',
        passportNumber: 'Z6543210',
        destination: 'Schengen (Europe)',
        travellersCount: 2,
        hotelsCount: 1,
        status: 'Documents Ready',
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        data: null
      },
      {
        id: 'app_sample_2',
        applicantName: 'Priya Sharma',
        passportNumber: 'V9812401',
        destination: 'Japan',
        travellersCount: 1,
        hotelsCount: 1,
        status: 'Draft',
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        data: null
      }
    ];
  },

  save(app) {
    const list = this.getAll();
    const existingIdx = list.findIndex(a => a.id === app.id);
    if (existingIdx !== -1) {
      list[existingIdx] = app;
    } else {
      list.unshift(app);
    }
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error('Failed to save application to storage:', e);
    }
  },

  saveCurrent() {
    const applicantName = AppStore.applicant.fullName || 
      `${AppStore.applicant.givenNames || ''} ${AppStore.applicant.surname || ''}`.trim() || 
      'Unnamed Applicant';
    
    const passNo = AppStore.applicant.passportNumber || 'Pending';
    const destination = AppStore.travel.destinationCountry || 'Schengen';
    const status = passNo !== 'Pending' && AppStore.hotels.length > 0 ? 'Documents Ready' : 'Draft';

    const appRecord = {
      id: AppStore.currentAppId || ('app_' + Date.now()),
      applicantName: applicantName,
      passportNumber: passNo,
      destination: destination,
      travellersCount: AppStore.travellers.length + 1,
      hotelsCount: AppStore.hotels.length,
      status: status,
      updatedAt: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(AppStore))
    };

    AppStore.currentAppId = appRecord.id;
    this.save(appRecord);
    return appRecord;
  },

  delete(appId) {
    const list = this.getAll().filter(a => a.id !== appId);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.error(e);
    }
  },

  load(appId) {
    const list = this.getAll();
    const app = list.find(a => a.id === appId);
    if (!app || !app.data) {
      showToast('Application data loaded.', 'info');
      AppRouter.navigate('new-application', 1);
      return;
    }

    // Restore into AppStore
    Object.assign(AppStore.applicant, app.data.applicant || {});
    AppStore.travellers = app.data.travellers || [];
    AppStore.hotels = app.data.hotels || [];
    Object.assign(AppStore.travel, app.data.travel || {});
    Object.assign(AppStore.inviter, app.data.inviter || {});
    AppStore.currentAppId = app.id;

    if (typeof syncApplicantFormUI === 'function') syncApplicantFormUI();
    if (typeof renderHotelStaysList === 'function') renderHotelStaysList();
    if (typeof renderTravellersList === 'function') renderTravellersList();

    showToast(`Loaded application for ${app.applicantName}`, 'success');
    AppRouter.navigate('new-application', 1);
  }
};

/**
 * Renders Dashboard stats and recent applications
 */
function renderDashboardView() {
  const list = ApplicationsStore.getAll();

  const totalApps = list.length;
  const readyApps = list.filter(a => a.status === 'Documents Ready').length;
  const totalHotels = list.reduce((sum, a) => sum + (a.hotelsCount || 0), 0);
  const totalPassports = list.reduce((sum, a) => sum + (a.travellersCount || 1), 0);

  // Stats grid
  const statsContainer = document.querySelector('[data-dashboard-stats]');
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="card" style="padding: var(--space-4);">
        <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint); letter-spacing: 0.05em;">Total Applications</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--color-primary); margin-top: 4px;">${totalApps}</div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Active across all destinations</div>
      </div>
      <div class="card" style="padding: var(--space-4);">
        <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint); letter-spacing: 0.05em;">Passports Processed</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--color-success); margin-top: 4px;">${totalPassports}</div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Verified with OCR & MRZ</div>
      </div>
      <div class="card" style="padding: var(--space-4);">
        <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint); letter-spacing: 0.05em;">Hotel Stays Booked</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--color-info); margin-top: 4px;">${totalHotels}</div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Vouchers & itineraries</div>
      </div>
      <div class="card" style="padding: var(--space-4);">
        <div style="font-size: 0.76rem; font-weight: 700; text-transform: uppercase; color: var(--color-text-faint); letter-spacing: 0.05em;">Ready for Visa</div>
        <div style="font-size: 2rem; font-weight: 800; color: #10B981; margin-top: 4px;">${readyApps}</div>
        <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">Complete & validated</div>
      </div>
    `;
  }

  // Recent applications table
  const recentContainer = document.querySelector('[data-dashboard-recent]');
  if (recentContainer) {
    if (list.length === 0) {
      recentContainer.innerHTML = `
        <div class="card" style="text-align:center; padding: var(--space-8); color: var(--color-text-muted);">
          <p>No visa applications found. Click <strong>New Application</strong> above to start.</p>
        </div>
      `;
      return;
    }

    recentContainer.innerHTML = `
      <div class="card" style="overflow-x: auto; padding: 0;">
        <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
          <thead>
            <tr style="border-bottom: 1px solid var(--color-border); background: var(--color-surface-alt);">
              <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Applicant Name</th>
              <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Passport No.</th>
              <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Destination</th>
              <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Status</th>
              <th style="padding: var(--space-3) var(--space-4); font-weight: 600; text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${list.slice(0, 5).map(app => `
              <tr style="border-bottom: 1px solid var(--color-border);">
                <td style="padding: var(--space-3) var(--space-4); font-weight: 600; color: var(--color-text);">${escapeHTML(app.applicantName)}</td>
                <td style="padding: var(--space-3) var(--space-4); font-family: monospace; color: var(--color-text-muted);">${escapeHTML(app.passportNumber)}</td>
                <td style="padding: var(--space-3) var(--space-4); color: var(--color-text-muted);">${escapeHTML(app.destination)}</td>
                <td style="padding: var(--space-3) var(--space-4);">
                  <span class="badge ${app.status === 'Documents Ready' ? 'badge-success' : 'badge-neutral'}">
                    ${escapeHTML(app.status)}
                  </span>
                </td>
                <td style="padding: var(--space-3) var(--space-4); text-align: right;">
                  <button class="btn btn-secondary btn-sm" type="button" onclick="ApplicationsStore.load('${app.id}')">
                    Open Wizard
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

/**
 * Renders full Applications table view
 */
function renderApplicationsTableView() {
  const list = ApplicationsStore.getAll();
  const container = document.querySelector('[data-applications-list]');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: var(--space-10);">
        <p style="color: var(--color-text-muted); margin-bottom: var(--space-4);">No applications yet.</p>
        <button class="btn btn-primary" onclick="resetApplication(); AppRouter.navigate('new-application', 1);">
          + Create First Application
        </button>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="card" style="overflow-x: auto; padding: 0;">
      <table class="table" style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.88rem;">
        <thead>
          <tr style="border-bottom: 1px solid var(--color-border); background: var(--color-surface-alt);">
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Applicant Name</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Passport</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Destination</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Travellers</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Hotels</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600;">Status</th>
            <th style="padding: var(--space-3) var(--space-4); font-weight: 600; text-align: right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(app => `
            <tr style="border-bottom: 1px solid var(--color-border);">
              <td style="padding: var(--space-3) var(--space-4); font-weight: 600; color: var(--color-text);">${escapeHTML(app.applicantName)}</td>
              <td style="padding: var(--space-3) var(--space-4); font-family: monospace; color: var(--color-text-muted);">${escapeHTML(app.passportNumber)}</td>
              <td style="padding: var(--space-3) var(--space-4); color: var(--color-text-muted);">${escapeHTML(app.destination)}</td>
              <td style="padding: var(--space-3) var(--space-4); color: var(--color-text-muted);">${app.travellersCount || 1} pax</td>
              <td style="padding: var(--space-3) var(--space-4); color: var(--color-text-muted);">${app.hotelsCount || 0} stay(s)</td>
              <td style="padding: var(--space-3) var(--space-4);">
                <span class="badge ${app.status === 'Documents Ready' ? 'badge-success' : 'badge-neutral'}">
                  ${escapeHTML(app.status)}
                </span>
              </td>
              <td style="padding: var(--space-3) var(--space-4); text-align: right; display: flex; gap: var(--space-2); justify-content: flex-end;">
                <button class="btn btn-secondary btn-sm" type="button" onclick="ApplicationsStore.load('${app.id}')">
                  Open
                </button>
                <button class="btn btn-ghost btn-sm" style="color: var(--color-danger);" type="button" onclick="if(confirm('Delete application?')){ApplicationsStore.delete('${app.id}'); renderApplicationsTableView();}">
                  Delete
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

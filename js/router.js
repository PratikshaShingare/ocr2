/**
 * Khanna Travels & Holidays — Modern Hash Router
 * (js/router.js)
 * Manages view routing matching Claude layout (#dashboard, #applications, #new-application, #hotel-blocking, etc.)
 */

const AppRouter = {
  views: [
    'dashboard',
    'applications',
    'new-application',
    'upload-passport',
    'cover-letter',
    'hotel-blocking',
    'company-authorization',
    'passport-authorization',
    'checklist-letter',
    'invitation-letter'
  ],

  currentView: 'dashboard',

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    // Also delegate [data-nav-link] clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-nav-link]');
      if (link) {
        const view = link.getAttribute('data-nav-link');
        if (view && this.views.includes(view)) {
          // allow hash change to trigger
        }
      }
    });

    this.handleRoute();
  },

  handleRoute() {
    const raw = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    const viewName = this.views.includes(parts[0]) ? parts[0] : 'dashboard';
    const subStep = parts[1] ? parseInt(parts[1], 10) : null;

    this.setActiveView(viewName, subStep);
  },

  navigate(viewName, subStep = null) {
    const targetHash = '#/' + viewName + (subStep ? '/' + subStep : '');
    if (window.location.hash === targetHash) {
      this.handleRoute();
    } else {
      window.location.hash = targetHash;
    }
  },

  setActiveView(viewName, subStep = null) {
    this.currentView = viewName;

    // Toggle active state on view sections
    document.querySelectorAll('.view').forEach(el => {
      const v = el.getAttribute('data-view');
      el.classList.toggle('is-active', v === viewName);
    });

    // Toggle active state on navigation links (header and sidebar)
    document.querySelectorAll('[data-nav-link]').forEach(el => {
      const linkView = el.getAttribute('data-nav-link');
      el.classList.toggle('is-active', linkView === viewName);
    });

    // Close mobile nav drawer if open
    const drawer = document.querySelector('[data-mobile-nav]');
    if (drawer && drawer.classList.contains('is-open')) {
      drawer.classList.remove('is-open');
      drawer.setAttribute('aria-hidden', 'true');
    }

    // Scroll to top
    const main = document.querySelector('.app-main');
    if (main) main.scrollTop = 0;
    window.scrollTo(0, 0);

    // Call view-specific refresh
    this.onViewActivated(viewName, subStep);
  },

  onViewActivated(viewName, subStep) {
    if (viewName === 'dashboard') {
      if (typeof renderDashboardView === 'function') renderDashboardView();
    } else if (viewName === 'applications') {
      if (typeof renderApplicationsTableView === 'function') renderApplicationsTableView();
    } else if (viewName === 'new-application') {
      if (subStep && typeof goToStep === 'function') {
        goToStep(subStep);
      } else if (typeof goToStep === 'function') {
        goToStep(AppStore.currentStep || 1);
      }
    } else if (viewName === 'hotel-blocking') {
      if (typeof syncStandaloneHotelWorkspace === 'function') syncStandaloneHotelWorkspace();
    } else if (viewName === 'cover-letter') {
      if (typeof syncStandaloneCoverLetterWorkspace === 'function') syncStandaloneCoverLetterWorkspace();
    } else if (viewName === 'company-authorization') {
      if (typeof syncStandaloneCompanyAuthWorkspace === 'function') syncStandaloneCompanyAuthWorkspace();
    } else if (viewName === 'passport-authorization') {
      if (typeof syncStandalonePassportAuthWorkspace === 'function') syncStandalonePassportAuthWorkspace();
    } else if (viewName === 'invitation-letter') {
      if (typeof syncStandaloneInvitationWorkspace === 'function') syncStandaloneInvitationWorkspace();
    } else if (viewName === 'checklist-letter') {
      if (typeof syncStandaloneChecklistWorkspace === 'function') {
        syncStandaloneChecklistWorkspace();
      } else if (window.KhannaChecklist) {
        window.KhannaChecklist.renderWorkspace();
      }
    }
  }
};

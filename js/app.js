/**
 * Khanna Travels & Holidays — Main Application Controller & State
 * (js/app.js)
 */

// Central Application State
const AppStore = {
  currentStep: 1,
  totalSteps: 7,

  // Primary Applicant Data
  applicant: {
    // Passport Details
    passportNumber: '',
    passportNumberStatus: 'manual', // 'extracted', 'verify', 'manual'
    dateOfIssue: '',
    dateOfExpiry: '',
    placeOfIssue: '',
    passportType: 'P',
    countryCode: 'IND',

    // Personal Details
    surname: '',
    givenNames: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'Male',
    placeOfBirth: '',
    nationality: 'Indian',

    // Family Details
    fatherName: '',
    motherName: '',
    spouseName: '',

    // Address
    residentialAddress: '',
    city: '',
    state: '',
    pinCode: '',

    // Old / Previous Passport
    oldPassportNumber: '',
    oldPassportIssueDate: '',
    oldPassportIssuePlace: '',

    // Normalized Preview Image Data URL
    previewImageUrl: null,
    rawOcrText: ''
  },

  // Accompanying Travellers Array
  travellers: [],

  // Hotel Stays Array
  hotels: [],

  // Travel Information
  travel: {
    destinationCountry: 'France',
    travelStartDate: '',
    travelEndDate: '',
    purpose: 'Tourism',
    fundingArrangement: 'Self-funded from personal savings',
    employmentStatus: 'Employed',
    jobTitle: '',
    employerName: '',
    employmentStartYear: '',
    applicantPhone: '',
    applicantEmail: '',
    consulateAddress: ''
  },

  // Consular Invitation Letter State
  inviter: {
    name: '',
    passportNumber: '',
    address: '',
    occupation: '',
    relationship: 'Parents',
    signatureImage: null,
    enabled: false
  },

  // Cover Letter Data
  coverLetter: {
    templateType: 'Europe', // 'Europe', 'Japan', 'Singapore', 'Passport_Auth_Single', 'Passport_Auth_Couple', 'Company_Auth', 'Invitation_Letter'
    renderedHtml: '',
    isEdited: false
  }
};

/**
 * Theme & Mode Management (Light / Dark)
 */
function initTheme() {
  const savedTheme = localStorage.getItem('khanna_theme') || 'light';
  applyTheme(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  localStorage.setItem('khanna_theme', newTheme);
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
  }
  const toggleBtns = document.querySelectorAll('[data-theme-toggle]');
  toggleBtns.forEach(btn => {
    btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
  });
}

function toggleMobileNav() {
  const drawer = document.querySelector('[data-mobile-nav]');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('is-open');
  drawer.classList.toggle('is-open', !isOpen);
  drawer.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
}

function initNewAppMenu() {
  const wrap = document.querySelector('[data-new-app-menu]');
  if (!wrap) return;
  const toggleBtn = document.querySelector('[data-new-app-menu-toggle]');
  const dropdown = document.querySelector('[data-new-app-menu-dropdown]');
  if (toggleBtn && dropdown) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !dropdown.classList.contains('is-open');
      dropdown.classList.toggle('is-open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) {
        dropdown.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dropdown.classList.remove('is-open');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/**
 * All Applications Modal Dialog
 */
function openAllApplicationsModal() {
  const dropdown = document.getElementById('headerDropdownMenu');
  if (dropdown) dropdown.classList.remove('active');

  const modal = document.getElementById('allAppsModal');
  const content = document.getElementById('allAppsListContent');
  if (!modal || !content) return;

  const appName = AppStore.applicant.fullName || 'Untitled Applicant';
  const passNo = AppStore.applicant.passportNumber || 'No Passport Entered';
  const dest = AppStore.travel.destinationCountry || 'Unspecified Destination';
  const travellersCount = AppStore.travellers.length;
  const hotelsCount = AppStore.hotels.length;

  content.innerHTML = `
    <div style="background-color: var(--bg-muted); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div>
          <span class="field-badge badge-extracted" style="font-size: 0.75rem; margin-bottom: 6px; display: inline-block;">ACTIVE APPLICATION</span>
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--primary-navy); margin: 4px 0 2px;">${escapeHTML(appName)}</h3>
          <p style="font-size: 0.84rem; color: var(--text-muted); margin: 0;">Passport: <strong>${escapeHTML(passNo)}</strong> • Destination: <strong>${escapeHTML(dest)}</strong></p>
        </div>
        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-light); background: var(--bg-surface); padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-color);">Step ${AppStore.currentStep} of 7</span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0;">
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; text-align: center;">
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-navy);">${1 + travellersCount}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">Total Travellers</div>
        </div>
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; text-align: center;">
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-navy);">${hotelsCount}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">Hotel Stays</div>
        </div>
        <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px; text-align: center;">
          <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary-navy);">${AppStore.inviter.enabled ? 'Yes' : 'No'}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted);">Invitation Letter</div>
        </div>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px;">
        <button type="button" class="btn-secondary" onclick="closeAllApplicationsModal(); goToStep(${AppStore.currentStep});">
          Continue Editing →
        </button>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px;">
      <span style="font-size: 0.84rem; color: var(--text-muted);">Want to start fresh for a different client?</span>
      <button type="button" class="btn-primary" onclick="closeAllApplicationsModal(); resetApplication();">
        + Start New Application
      </button>
    </div>
  `;

  modal.style.display = 'flex';
}

function closeAllApplicationsModal() {
  const modal = document.getElementById('allAppsModal');
  if (modal) modal.style.display = 'none';
}

/**
 * Inviter Letter Helpers
 */
function toggleInvitationSection(enabled) {
  AppStore.inviter.enabled = enabled;
  const container = document.getElementById('invitationFieldsContainer');
  if (container) {
    container.style.display = enabled ? 'block' : 'none';
  }
}

function updateInviterData(field, value) {
  AppStore.inviter[field] = value;
}

function handleInviterSignatureUpload(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    AppStore.inviter.signatureImage = e.target.result;
    const wrapper = document.getElementById('signaturePreviewWrapper');
    const img = document.getElementById('signaturePreviewImg');
    const hint = document.getElementById('signatureUploadHint');
    if (wrapper && img) {
      img.src = e.target.result;
      wrapper.style.display = 'inline-flex';
    }
    if (hint) hint.textContent = `Signature loaded: ${file.name}`;
    showToast('Inviter signature loaded.', 'success');
  };
  reader.readAsDataURL(file);
}

function removeInviterSignature() {
  AppStore.inviter.signatureImage = null;
  const wrapper = document.getElementById('signaturePreviewWrapper');
  const input = document.getElementById('inviter_signature_input');
  const hint = document.getElementById('signatureUploadHint');
  if (wrapper) wrapper.style.display = 'none';
  if (input) input.value = '';
  if (hint) hint.textContent = 'Upload signature image to fit accurately in the Invitation Letter.';
  showToast('Signature removed.', 'info');
}

/**
 * Switch to a specific step in the 7-step wizard.
 */
function goToStep(stepNumber) {
  if (stepNumber < 1 || stepNumber > AppStore.totalSteps) return;

  // Validation before proceeding forward
  if (stepNumber > AppStore.currentStep) {
    if (!validateCurrentStep(AppStore.currentStep)) {
      return;
    }
  }

  // Update Stepper Navigation UI
  for (let i = 1; i <= AppStore.totalSteps; i++) {
    const stepBtn = document.getElementById(`step-nav-${i}`);
    const stepView = document.getElementById(`step-view-${i}`);

    if (stepBtn) {
      stepBtn.classList.remove('active', 'is-active');
      if (i < stepNumber) {
        stepBtn.classList.add('completed');
      } else {
        stepBtn.classList.remove('completed');
      }
      if (i === stepNumber) {
        stepBtn.classList.add('active', 'is-active');
      }
    }

    if (stepView) {
      if (i === stepNumber) {
        stepView.classList.add('active');
      } else {
        stepView.classList.remove('active');
      }
    }
  }

  AppStore.currentStep = stepNumber;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lifecycle hooks per step
  onStepEntered(stepNumber);
}

/**
 * Validates requirements for moving past a step.
 */
function validateCurrentStep(step) {
  if (step === 1 || step === 2) {
    // Validate required applicant passport fields
    const passNo = document.getElementById('pass_number')?.value?.trim();
    const surname = document.getElementById('pass_surname')?.value?.trim();
    const givenName = document.getElementById('pass_given_name')?.value?.trim();
    const dob = document.getElementById('pass_dob')?.value?.trim();

    if (step === 2) {
      if (!passNo) {
        showToast('Passport Number is required before proceeding.', 'error');
        document.getElementById('pass_number')?.focus();
        return false;
      }
      if (!surname && !givenName) {
        showToast('Applicant Name is required before proceeding.', 'error');
        document.getElementById('pass_given_name')?.focus();
        return false;
      }
      if (!dob) {
        showToast('Date of Birth is required before proceeding.', 'error');
        document.getElementById('pass_dob')?.focus();
        return false;
      }
    }
  }
  return true;
}

/**
 * Trigger actions when a step view is opened.
 */
function onStepEntered(stepNumber) {
  if (stepNumber === 2) {
    syncApplicantFormUI();
  } else if (stepNumber === 3) {
    renderTravellersList();
  } else if (stepNumber === 4) {
    renderHotelStaysList();
  } else if (stepNumber === 6) {
    prepareAndRenderCoverLetter();
  } else if (stepNumber === 7) {
    prepareFinalOutputSummary();
  }
}

/**
 * Next step button handler.
 */
function nextStep() {
  goToStep(AppStore.currentStep + 1);
}

/**
 * Previous step button handler.
 */
function prevStep() {
  goToStep(AppStore.currentStep - 1);
}

/**
 * Reset application to clean state (New Application).
 */
function resetApplication() {
  if (!confirm('Start a new application? Any unsaved data will be cleared.')) return;

  // Reset applicant object
  AppStore.applicant = {
    passportNumber: '',
    passportNumberStatus: 'manual',
    dateOfIssue: '',
    dateOfExpiry: '',
    placeOfIssue: '',
    passportType: 'P',
    countryCode: 'IND',
    surname: '',
    givenNames: '',
    fullName: '',
    dateOfBirth: '',
    gender: 'Male',
    placeOfBirth: '',
    nationality: 'Indian',
    fatherName: '',
    motherName: '',
    spouseName: '',
    residentialAddress: '',
    city: '',
    state: '',
    pinCode: '',
    oldPassportNumber: '',
    oldPassportIssueDate: '',
    oldPassportIssuePlace: '',
    previewImageUrl: null,
    rawOcrText: ''
  };

  AppStore.travellers = [];
  AppStore.hotels = [];
  AppStore.travel = {
    destinationCountry: 'France',
    travelStartDate: '',
    travelEndDate: '',
    purpose: 'Tourism',
    fundingArrangement: 'Self-funded from personal savings',
    employmentStatus: 'Employed',
    jobTitle: '',
    employerName: '',
    employmentStartYear: '',
    applicantPhone: '',
    applicantEmail: '',
    consulateAddress: ''
  };

  // Reset forms and canvas
  const passportForm = document.getElementById('passportDetailsForm');
  if (passportForm) passportForm.reset();

  const previewImg = document.getElementById('canonicalPreviewImg');
  if (previewImg) {
    previewImg.src = '';
    previewImg.style.display = 'none';
  }
  const previewIframe = document.getElementById('canonicalPreviewIframe');
  if (previewIframe) {
    previewIframe.src = '';
    previewIframe.style.display = 'none';
  }
  const standaloneIframe = document.getElementById('standalonePreviewIframe');
  if (standaloneIframe) {
    standaloneIframe.src = '';
    standaloneIframe.style.display = 'none';
  }
  const placeholder = document.getElementById('previewPlaceholder');
  if (placeholder) placeholder.style.display = 'flex';

  goToStep(1);
  showToast('New application initialized cleanly.', 'info');
}

// Global DOM Ready Initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('Khanna Travels & Holidays System Initialized.');
  initTheme();
  initNewAppMenu();
  const yearEl = document.getElementById('footerYear');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  if (typeof AppRouter !== 'undefined') {
    AppRouter.init();
  } else {
    goToStep(1);
  }
});

/**
 * Khanna Travels & Holidays — Passport Processing & Form Binding
 * (js/passport.js)
 */

// Setup drag and drop for passport upload
document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('passportDropzone');
  const fileInput = document.getElementById('passportFileInput');

  if (dropzone && fileInput) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('drag-over');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePassportFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePassportFileUpload(e.target.files[0]);
      }
    });
  }

  // Bind live form field changes to AppStore
  bindPassportFormInputs();
});

/**
 * Handles uploaded passport file (JPG, PNG, PDF, DOCX, DOC).
 */
async function handlePassportFileUpload(file) {
  if (!file) return;

  const validExts = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.doc'];
  const fileName = file.name.toLowerCase();
  const isValid = validExts.some(ext => fileName.endsWith(ext));

  if (!isValid) {
    showToast('Unsupported format. Please upload JPG, PNG, PDF, DOCX, or DOC.', 'error');
    return;
  }

  // Show processing overlay
  const overlay = document.getElementById('passportProcessingOverlay');
  const statusText = document.getElementById('passportStatusText');
  if (overlay) overlay.classList.add('active');
  if (statusText) statusText.textContent = 'Analyzing orientation and normalizing...';

  // Check if local backend server is running
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch('/api/ocr/passport', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      applyPassportExtractionResults(data);
      showToast('Passport processed successfully with canonical preview.', 'success');
    } else {
      throw new Error(`Server returned status ${response.status}`);
    }
  } catch (err) {
    console.warn('Backend server not reachable or error, using browser reader:', err);
    // Fallback: Read image directly in browser for testing/GitHub Pages
    await processPassportInBrowser(file);
  } finally {
    if (overlay) overlay.classList.remove('active');
  }
}

// Alias for backwards-compatibility with inline HTML onchange
window.handlePassportUpload = handlePassportFileUpload;

/**
 * Fallback browser processing when running without backend server (e.g. GitHub Pages).
 */
async function processPassportInBrowser(file) {
  const statusText = document.getElementById('passportStatusText');
  if (statusText) statusText.textContent = 'Processing file in browser...';

  const reader = new FileReader();
  reader.onload = function(e) {
    const dataUrl = e.target.result;
    PreviewController.setImage(dataUrl);
    AppStore.applicant.previewImageUrl = dataUrl;

    // Update standalone view if present
    const standaloneImg = document.getElementById('standalonePreviewImg');
    const standaloneIframe = document.getElementById('standalonePreviewIframe');
    const standalonePlaceholder = document.getElementById('standalonePreviewPlaceholder');
    const isPdf = typeof dataUrl === 'string' && (dataUrl.startsWith('data:application/pdf') || file.name.endsWith('.pdf'));

    if (isPdf) {
      if (standaloneImg) standaloneImg.style.display = 'none';
      if (standaloneIframe) {
        standaloneIframe.src = dataUrl;
        standaloneIframe.style.display = 'block';
      }
    } else {
      if (standaloneIframe) {
        standaloneIframe.src = '';
        standaloneIframe.style.display = 'none';
      }
      if (standaloneImg) {
        standaloneImg.src = dataUrl;
        standaloneImg.style.display = 'block';
      }
    }
    if (standalonePlaceholder) standalonePlaceholder.style.display = 'none';

    // Set extracted badge for visual feedback
    updateFieldBadge('pass_number_badge', 'Manual', 'manual');
    showToast('Document loaded into preview. Enter or verify fields below.', 'info');
  };
  reader.readAsDataURL(file);
}

/**
 * Applies structured extraction data returned from OCR backend.
 */
function applyPassportExtractionResults(data) {
  if (!data) return;

  const previewSrc = data.previewImage || (data.pages && data.pages[0]?.previewImage);

  // Set canonical preview & multi-page support
  if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
    PreviewController.setPages(data.pages);
    AppStore.applicant.pages = data.pages;
    AppStore.applicant.previewImageUrl = previewSrc;
  } else if (data.previewImage) {
    PreviewController.setImage(data.previewImage);
    AppStore.applicant.previewImageUrl = data.previewImage;
  }

  // Update standalone view if present
  const standaloneImg = document.getElementById('standalonePreviewImg');
  const standaloneIframe = document.getElementById('standalonePreviewIframe');
  const standalonePlaceholder = document.getElementById('standalonePreviewPlaceholder');

  if (previewSrc) {
    const isPdf = typeof previewSrc === 'string' && (previewSrc.startsWith('data:application/pdf') || previewSrc.includes('.pdf'));
    if (isPdf) {
      if (standaloneImg) standaloneImg.style.display = 'none';
      if (standaloneIframe) {
        standaloneIframe.src = previewSrc;
        standaloneIframe.style.display = 'block';
      }
    } else {
      if (standaloneIframe) {
        standaloneIframe.src = '';
        standaloneIframe.style.display = 'none';
      }
      if (standaloneImg) {
        standaloneImg.src = previewSrc;
        standaloneImg.style.display = 'block';
      }
    }
    if (standalonePlaceholder) standalonePlaceholder.style.display = 'none';
  }

  // Populate Passport details
  if (data.passportNumber) {
    setInputValue('pass_number', data.passportNumber);
    updateFieldBadge('pass_number_badge', data.passNoValid ? 'Extracted' : 'Verify', data.passNoValid ? 'extracted' : 'verify');
  }
  if (data.dateOfIssue) {
    setInputValue('pass_doi', data.dateOfIssue);
    updateFieldBadge('pass_doi_badge', 'Extracted', 'extracted');
  }
  if (data.dateOfExpiry) {
    setInputValue('pass_doe', data.dateOfExpiry);
    updateFieldBadge('pass_doe_badge', 'Extracted', 'extracted');
  }
  if (data.placeOfIssue) {
    setInputValue('pass_poi', data.placeOfIssue);
    updateFieldBadge('pass_poi_badge', 'Extracted', 'extracted');
  }

  // Personal details
  if (data.surname) {
    setInputValue('pass_surname', data.surname);
    updateFieldBadge('pass_surname_badge', 'Extracted', 'extracted');
  }
  if (data.givenNames) {
    setInputValue('pass_given_name', data.givenNames);
    updateFieldBadge('pass_given_name_badge', 'Extracted', 'extracted');
  }
  if (data.dateOfBirth) {
    setInputValue('pass_dob', data.dateOfBirth);
    updateFieldBadge('pass_dob_badge', data.dobValid ? 'Extracted' : 'Verify', data.dobValid ? 'extracted' : 'verify');
  }
  if (data.gender) {
    setInputValue('pass_gender', data.gender);
  }
  if (data.placeOfBirth) {
    setInputValue('pass_pob', data.placeOfBirth);
    updateFieldBadge('pass_pob_badge', 'Extracted', 'extracted');
  }
  if (data.nationality) {
    setInputValue('pass_nationality', data.nationality);
  }

  // Family details
  if (data.fatherName) {
    setInputValue('pass_father', data.fatherName);
    updateFieldBadge('pass_father_badge', 'Extracted', 'extracted');
  }
  if (data.motherName) {
    setInputValue('pass_mother', data.motherName);
    updateFieldBadge('pass_mother_badge', 'Extracted', 'extracted');
  }
  if (data.spouseName) {
    setInputValue('pass_spouse', data.spouseName);
    updateFieldBadge('pass_spouse_badge', 'Extracted', 'extracted');
  }

  // Address details
  if (data.residentialAddress) {
    setInputValue('pass_address', data.residentialAddress);
    updateFieldBadge('pass_address_badge', 'Extracted', 'extracted');
  }
  if (data.city) {
    setInputValue('pass_city', data.city);
  }
  if (data.state) {
    setInputValue('pass_state', data.state);
  }
  if (data.pinCode) {
    setInputValue('pass_pincode', data.pinCode);
  }

  // Old Passport details (Strictly separated!)
  if (data.oldPassportNumber) {
    setInputValue('pass_old_number', data.oldPassportNumber);
    updateFieldBadge('pass_old_number_badge', 'Extracted', 'extracted');
  }
  if (data.oldPassportIssueDate) {
    setInputValue('pass_old_doi', data.oldPassportIssueDate);
  }
  if (data.oldPassportIssuePlace) {
    setInputValue('pass_old_poi', data.oldPassportIssuePlace);
  }

  // Sync to central state
  syncApplicantFormToStore();
}

/**
 * Helper to set value of an input element.
 */
function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) {
    el.value = val;
  }
}

/**
 * Helper to update status badge next to a label.
 */
function updateFieldBadge(badgeId, text, type) {
  const badge = document.getElementById(badgeId);
  if (badge) {
    badge.textContent = text;
    badge.className = `field-badge badge-${type}`;
    badge.style.display = 'inline-block';
  }
}

/**
 * Sync form inputs into AppStore.applicant.
 */
function syncApplicantFormToStore() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';

  AppStore.applicant.passportNumber = getVal('pass_number');
  AppStore.applicant.dateOfIssue = getVal('pass_doi');
  AppStore.applicant.dateOfExpiry = getVal('pass_doe');
  AppStore.applicant.placeOfIssue = getVal('pass_poi');
  AppStore.applicant.surname = getVal('pass_surname');
  AppStore.applicant.givenNames = getVal('pass_given_name');
  AppStore.applicant.fullName = `${AppStore.applicant.givenNames} ${AppStore.applicant.surname}`.trim();
  AppStore.applicant.dateOfBirth = getVal('pass_dob');
  AppStore.applicant.gender = getVal('pass_gender');
  AppStore.applicant.placeOfBirth = getVal('pass_pob');
  AppStore.applicant.nationality = getVal('pass_nationality') || 'Indian';

  AppStore.applicant.fatherName = getVal('pass_father');
  AppStore.applicant.motherName = getVal('pass_mother');
  AppStore.applicant.spouseName = getVal('pass_spouse');

  AppStore.applicant.residentialAddress = getVal('pass_address');
  AppStore.applicant.city = getVal('pass_city');
  AppStore.applicant.state = getVal('pass_state');
  AppStore.applicant.pinCode = getVal('pass_pincode');

  AppStore.applicant.oldPassportNumber = getVal('pass_old_number');
  AppStore.applicant.oldPassportIssueDate = getVal('pass_old_doi');
  AppStore.applicant.oldPassportIssuePlace = getVal('pass_old_poi');
}

/**
 * Synchronizes inputs when Step 2 (Applicant Verification) is opened.
 */
function syncApplicantFormUI() {
  syncApplicantFormToStore();
}

/**
 * Attach listeners to all inputs to automatically update badges to Manual on edit.
 */
function bindPassportFormInputs() {
  const inputIds = [
    'pass_number', 'pass_doi', 'pass_doe', 'pass_poi',
    'pass_surname', 'pass_given_name', 'pass_dob', 'pass_gender', 'pass_pob', 'pass_nationality',
    'pass_father', 'pass_mother', 'pass_spouse',
    'pass_address', 'pass_city', 'pass_state', 'pass_pincode',
    'pass_old_number', 'pass_old_doi', 'pass_old_poi'
  ];

  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const badge = document.getElementById(`${id}_badge`);
        if (badge) {
          badge.textContent = 'Manual';
          badge.className = 'field-badge badge-manual';
        }
        syncApplicantFormToStore();
      });
    }
  });
}

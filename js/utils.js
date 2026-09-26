/**
 * Khanna Travels & Holidays — Core Utility Functions
 * (js/utils.js)
 */

// Cyrillic and Greek lookalike character map to ASCII Latin
const HOMOGLYPH_MAP = {
  '\u0410': 'A', '\u0430': 'a',
  '\u0412': 'B',
  '\u0421': 'C', '\u0441': 'c',
  '\u0415': 'E', '\u0435': 'e',
  '\u041d': 'H',
  '\u0406': 'I', '\u0456': 'i',
  '\u0408': 'J',
  '\u041a': 'K',
  '\u041c': 'M',
  '\u041e': 'O', '\u043e': 'o',
  '\u0420': 'P', '\u0440': 'p',
  '\u0422': 'T',
  '\u0425': 'X', '\u0445': 'x',
  '\u0423': 'Y',
  '\u0391': 'A', '\u0392': 'B', '\u0395': 'E', '\u0397': 'H',
  '\u0399': 'I', '\u039a': 'K', '\u039c': 'M', '\u039d': 'N',
  '\u039f': 'O', '\u03a1': 'P', '\u03a4': 'T', '\u03a7': 'X',
  '\u03a5': 'Y', '\u0396': 'Z'
};

/**
 * Normalizes Cyrillic and Greek homoglyphs to standard Latin ASCII.
 */
function normalizeHomoglyphs(text) {
  if (!text) return '';
  return text.split('').map(ch => HOMOGLYPH_MAP[ch] || ch).join('');
}

/**
 * Computes ICAO Doc 9303 check digit with 7-3-1 weight cycle.
 */
function computeIcaoCheckDigit(data) {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const ch = data[i].toUpperCase();
    let val = 0;
    if (ch >= '0' && ch <= '9') {
      val = parseInt(ch, 10);
    } else if (ch >= 'A' && ch <= 'Z') {
      val = ch.charCodeAt(0) - 55; // 'A' -> 10
    } else if (ch === '<') {
      val = 0;
    }
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

/**
 * Validates check digit against expected character.
 */
function verifyIcaoCheckDigit(data, expectedDigit) {
  const calc = computeIcaoCheckDigit(data);
  return calc.toString() === expectedDigit.toString();
}

/**
 * Parses ICAO TD3 MRZ (2 lines of 44 characters).
 */
function parseTD3MRZ(line1Raw, line2Raw) {
  if (!line1Raw || !line2Raw) return null;

  const line1 = normalizeHomoglyphs(line1Raw).replace(/\s+/g, '').padEnd(44, '<').substring(0, 44);
  const line2 = normalizeHomoglyphs(line2Raw).replace(/\s+/g, '').padEnd(44, '<').substring(0, 44);

  // Line 1: P<INDNAME<<GIVEN<NAMES<<<<<<<<<<<<<<<<<<
  const docType = line1.substring(0, 2);
  const country = line1.substring(2, 5).replace(/</g, '');
  const nameSection = line1.substring(5);
  const nameParts = nameSection.split('<<');
  const surname = (nameParts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (nameParts.slice(1).join(' ') || '').replace(/</g, ' ').trim();

  // Line 2: PASS_NO(9) + CD(1) + NAT(3) + DOB(6) + CD(1) + SEX(1) + EXP(6) + CD(1) + OPT(14) + CD(1)
  const passNoRaw = line2.substring(0, 9);
  const passNoCD = line2.substring(9, 10);
  const passNoValid = verifyIcaoCheckDigit(passNoRaw, passNoCD);
  const passportNumber = passNoRaw.replace(/</g, '').trim();

  const nationality = line2.substring(10, 13).replace(/</g, '');

  const dobRaw = line2.substring(13, 19);
  const dobCD = line2.substring(19, 20);
  const dobValid = verifyIcaoCheckDigit(dobRaw, dobCD);

  const sexCode = line2.substring(20, 21).toUpperCase();
  const gender = sexCode === 'M' ? 'Male' : (sexCode === 'F' ? 'Female' : 'Other');

  const expRaw = line2.substring(21, 27);
  const expCD = line2.substring(27, 28);
  const expValid = verifyIcaoCheckDigit(expRaw, expCD);

  // Convert YYMMDD to YYYY-MM-DD
  const parseYYMMDD = (yymmdd, isExpiry = false) => {
    if (!yymmdd || yymmdd.length !== 6 || !/^\d{6}$/.test(yymmdd)) return '';
    const yy = parseInt(yymmdd.substring(0, 2), 10);
    const mm = yymmdd.substring(2, 4);
    const dd = yymmdd.substring(4, 6);
    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;
    
    let yyyy;
    if (isExpiry) {
      // Expiry dates are typically current century or next
      yyyy = 2000 + yy;
    } else {
      // DOB: if yy > currentYY, assume 1900s, else 2000s
      yyyy = (yy > currentYY) ? (1900 + yy) : (2000 + yy);
    }
    return `${dd}/${mm}/${yyyy}`;
  };

  const dateOfBirth = parseYYMMDD(dobRaw, false);
  const dateOfExpiry = parseYYMMDD(expRaw, true);

  return {
    documentType: docType,
    country,
    surname,
    givenNames,
    fullName: `${givenNames} ${surname}`.trim(),
    passportNumber,
    passNoValid,
    nationality,
    dateOfBirth,
    dobValid,
    gender,
    dateOfExpiry,
    expValid,
    isValidMRZ: passNoValid && dobValid && expValid
  };
}

/**
 * Validates passport number format.
 */
function isValidPassportNumber(passNo) {
  if (!passNo) return false;
  const clean = passNo.trim().toUpperCase().replace(/\s+/g, '');
  // Standard Indian passport: 1 letter followed by 7 digits
  return /^[A-Z][0-9]{7}$/.test(clean);
}

/**
 * Strict emoji stripper to guarantee zero emojis in formal visa documents.
 */
function stripEmojis(text) {
  if (!text) return '';
  return text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();
}

/**
 * Safe HTML escape for rendering user text.
 */
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays non-blocking notification toast.
 */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';
  if (type === 'warning') icon = '⚠';

  toast.innerHTML = `
    <span style="font-weight: bold;">${icon}</span>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

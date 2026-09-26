"""
Khanna Travels & Holidays — High-Accuracy Local OCR & Preprocessing Runner
Enhanced with:
1. Intelligent Front Page (Bio-data) vs. Last Page (Family & Address) identification.
2. Multi-page preview support with instant page-flipping capability.
3. Blank/no-data page filtering (never shows a blank page as primary preview).
4. Single-line and two-line MRZ parsing + robust VIZ extraction.
5. Strict Current vs. Old Passport disambiguation.
6. Comprehensive field extraction for seamless Cover Letter population.
"""

import sys
import os
import io
import re
import json
import base64
import zipfile
import numpy as np
import cv2
from PIL import Image, ImageStat, ImageOps

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

# Homoglyph translation table (Cyrillic/Greek lookalikes to Latin ASCII)
HOMOGLYPH_MAP = {
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
}

LABEL_WORDS = {
    'SURNAME', 'GIVEN', 'NAME', 'NAMES', 'PRENOMS', 'TYPE', 'CODE', 'COUNTRY',
    'NATIONALITY', 'INDIAN', 'REPUBLIC', 'INDIA', 'PASSPORT', 'SEX', 'GENDER',
    'DATE', 'BIRTH', 'EXPIRY', 'ISSUE', 'PLACE', 'FATHER', 'MOTHER', 'SPOUSE',
    'HUSBAND', 'WIFE', 'ADDRESS', 'OLD', 'FILE', 'LEGAL', 'GUARDIAN', 'SIGNATURE'
}

def normalize_homoglyphs(text: str) -> str:
    """Translates lookalike Cyrillic/Greek characters to standard Latin ASCII."""
    if not text:
        return ""
    return "".join(HOMOGLYPH_MAP.get(ch, ch) for ch in text)


def is_blank_page(pil_img: Image.Image, std_threshold: float = 12.0) -> bool:
    """Checks if a page or image is blank (scanner separator / empty page)."""
    try:
        gray = pil_img.convert("L")
        stat = ImageStat.Stat(gray)
        stddev = stat.stddev[0]
        extrema = stat.extrema[0]
        if stddev < std_threshold:
            return True
        if extrema[0] >= 245 or extrema[1] <= 15:
            return True
    except Exception:
        pass
    return False


def detect_skew_angle_from_boxes(ocr_results) -> float:
    """Computes median tilt angle of recognized text lines from RapidOCR bounding boxes."""
    if not ocr_results:
        return 0.0
    angles = []
    for r in ocr_results:
        box = r[0]
        if len(box) == 4:
            x0, y0 = box[0]
            x1, y1 = box[1]
            dx = x1 - x0
            dy = y1 - y0
            if dx > 15:  # Sufficient horizontal width
                deg = float(np.degrees(np.arctan2(dy, dx)))
                if -20.0 <= deg <= 20.0:
                    angles.append(deg)
    if len(angles) >= 3:
        return float(np.median(angles))
    return 0.0


def detect_skew_angle(pil_img: Image.Image) -> float:
    """Detects rotational tilt angle (-15° to +15°) using Hough line transform."""
    try:
        img_np = np.array(pil_img.convert("L"))
        h, w = img_np.shape
        _, thresh = cv2.threshold(img_np, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
        lines = cv2.HoughLinesP(thresh, 1, np.pi / 180, threshold=80, minLineLength=min(w, h) // 10, maxLineGap=20)
        if lines is None:
            return 0.0

        angles = []
        for line in lines:
            pts = line.reshape(-1)
            if len(pts) == 4:
                x1, y1, x2, y2 = pts
                dx = x2 - x1
                dy = y2 - y1
                if dx == 0:
                    continue
                angle = float(np.degrees(np.arctan2(dy, dx)))
                if -15.0 <= angle <= 15.0 and abs(angle) > 0.3:
                    angles.append(angle)

        if len(angles) >= 3:
            return float(np.median(angles))
    except Exception:
        pass
    return 0.0


def deskew_image(pil_img: Image.Image, angle: float = None) -> Tuple[Image.Image, float]:
    """Corrects rotational tilt between 0.4° and 15°."""
    if angle is None:
        angle = detect_skew_angle(pil_img)
    if 0.4 <= abs(angle) <= 15.0:
        try:
            return pil_img.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True, fillcolor=(255, 255, 255)), angle
        except Exception:
            pass
    return pil_img, 0.0


def detect_and_crop_passport_region(pil_img: Image.Image, padding: int = 25) -> Image.Image:
    """
    Detects passport booklet boundaries against scanner whitespace or dark scanner lid borders.
    Retains a guaranteed 25px safe margin padding so MRZ chevrons, photos, and labels are never clipped.
    """
    try:
        w, h = pil_img.size
        gray = pil_img.convert("L")
        
        # Sample corners to determine background luminance
        corner_pixels = [
            gray.getpixel((5, 5)),
            gray.getpixel((w - 6, 5)),
            gray.getpixel((5, h - 6)),
            gray.getpixel((w - 6, h - 6))
        ]
        bg_val = int(sum(corner_pixels) / len(corner_pixels))
        
        bg = Image.new("L", (w, h), bg_val)
        from PIL import ImageChops, ImageEnhance
        diff = ImageChops.difference(gray, bg)
        diff = ImageEnhance.Contrast(diff).enhance(2.0)
        diff = diff.point(lambda p: 255 if p > 30 else 0)
        
        bbox = diff.getbbox()
        if bbox:
            x0, y0, x1, y1 = bbox
            crop_w = x1 - x0
            crop_h = y1 - y0
            if (crop_w < w * 0.96 or crop_h < h * 0.96) and (crop_w > w * 0.25 and crop_h > h * 0.25):
                safe_pad = max(padding, int(min(w, h) * 0.035))
                pad_x0 = max(0, x0 - safe_pad)
                pad_y0 = max(0, y0 - safe_pad)
                pad_x1 = min(w, x1 + safe_pad)
                pad_y1 = min(h, y1 + safe_pad)
                return pil_img.crop((pad_x0, pad_y0, pad_x1, pad_y1))
    except Exception:
        pass
    return pil_img


def unglue_indian_names(name: str) -> str:
    """
    Separates concatenated Indian name tokens joined by OCR without spaces.
    e.g. BALWANT SINGHSARDARSINGH -> BALWANT SINGH SARDAR SINGH
    """
    if not name:
        return ""
    keywords = ['SINGH', 'KAUR', 'KUMAR', 'LAL', 'CHAND', 'DEVI', 'BAI', 'PRASAD', 'RAM', 'NATH']
    s = name
    for kw in keywords:
        s = re.sub(r'(' + kw + r')([A-Z]{3,})', r'\1 \2', s)
        s = re.sub(r'([A-Z]{3,})(' + kw + r')', r'\1 \2', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def evaluate_orientations_and_ocr(pil_img: Image.Image, ocr_engine):
    """
    Evaluates 0°, 90°, 180°, 270° orientations.
    Scores each candidate against passport keywords, MRZ tokens, dates, and OCR confidence.
    Returns: (best_image, best_ocr_results, best_angle)
    """
    angles = [0, 90, 180, 270]
    best_score = -1
    best_angle = 0
    best_img = pil_img
    best_results = None

    for angle in angles:
        rotated = pil_img if angle == 0 else pil_img.rotate(-angle, expand=True)
        img_np = np.array(rotated.convert("RGB"))
        results, _ = ocr_engine(img_np)
        
        score = 0
        if results:
            full_text = " ".join([r[1].upper() for r in results])
            tokens = [
                "REPUBLIC OF INDIA", "REPUBLIC", "INDIA", "PASSPORT", "SURNAME", 
                "GIVEN", "DATE OF BIRTH", "DATE OF ISSUE", "DATE OF EXPIRY", 
                "P<IND", "P<", "FATHER", "MOTHER", "ADDRESS", "PIN:"
            ]
            for token in tokens:
                if token in full_text:
                    score += 15
            if 'P<IND' in full_text or 'P<' in full_text:
                score += 30
            if '<<<' in full_text:
                score += 10
            if re.search(r'\b[A-Z]\d{7}\b', full_text):
                score += 20
            if re.search(r'\b\d{2}[/-]\d{2}[/-]\d{4}\b', full_text):
                score += 10
            for r in results:
                if float(r[2]) > 0.70:
                    score += 1

        if score > best_score:
            best_score = score
            best_angle = angle
            best_img = rotated
            best_results = results

    # Fine tilt deskew using OCR box slope or Hough lines
    skew_angle = detect_skew_angle_from_boxes(best_results)
    if abs(skew_angle) > 0.4:
        deskewed, _ = deskew_image(best_img, -skew_angle)
    else:
        deskewed, _ = deskew_image(best_img)

    # Safe margin booklet crop
    cropped = detect_and_crop_passport_region(deskewed, padding=25)

    # Re-run OCR on the canonical cropped upright image
    final_results, _ = ocr_engine(np.array(cropped.convert("RGB")))
    if not final_results and best_results:
        final_results = best_results

    return cropped, final_results, best_angle


def compute_icao_check_digit(data: str) -> int:
    """Computes ICAO Doc 9303 check digit (weights 7, 3, 1)."""
    weights = [7, 3, 1]
    s = 0
    for i, ch in enumerate(data):
        ch = ch.upper()
        if '0' <= ch <= '9':
            val = int(ch)
        elif 'A' <= ch <= 'Z':
            val = ord(ch) - 55
        else:
            val = 0
        s += val * weights[i % 3]
    return s % 10


def parse_mrz_lines(lines):
    """
    Parses ICAO TD3 MRZ lines with check-digit validation.
    Supports BOTH 2-line MRZ and single-line MRZ1 (where Line 2 was cropped).
    """
    mrz1 = None
    mrz2 = None

    for line in lines:
        cleaned = re.sub(r'[^A-Z0-9<]', '', normalize_homoglyphs(line).upper())
        if 'P<IND' in cleaned or (cleaned.startswith('P<') and len(cleaned) >= 30):
            mrz1 = cleaned[:44].ljust(44, '<')
        elif len(cleaned) >= 30 and (re.search(r'^[A-Z]{1,2}[0-9<]{6,8}', cleaned) or ('IND' in cleaned[8:16])):
            mrz2 = cleaned[:44].ljust(44, '<')

    if not mrz1 and not mrz2:
        return None

    res = {}

    # Parse Line 1 (Names & Country)
    if mrz1:
        res["country"] = mrz1[2:5].replace('<', '')
        name_part = mrz1[5:]
        name_split = name_part.split('<<')
        surname = name_split[0].replace('<', ' ').strip()
        given_names = name_split[1].replace('<', ' ').strip() if len(name_split) > 1 else ''
        res["surname"] = surname
        res["givenNames"] = given_names
        res["fullName"] = f"{given_names} {surname}".strip()

    # Parse Line 2 (Passport Number, DOB, Sex, Expiry)
    if mrz2:
        pass_no_raw = mrz2[0:9]
        pass_no_cd = mrz2[9:10]
        pass_no = pass_no_raw.replace('<', '').strip()
        pass_no_valid = (pass_no_cd.isdigit() and compute_icao_check_digit(pass_no_raw) == int(pass_no_cd))

        nat = mrz2[10:13].replace('<', '')
        dob_raw = mrz2[13:19]
        dob_cd = mrz2[19:20]
        dob_valid = (dob_cd.isdigit() and compute_icao_check_digit(dob_raw) == int(dob_cd))

        sex_code = mrz2[20:21]
        gender = 'Male' if sex_code == 'M' else ('Female' if sex_code == 'F' else 'Other')

        exp_raw = mrz2[21:27]
        exp_cd = mrz2[27:28]
        exp_valid = (exp_cd.isdigit() and compute_icao_check_digit(exp_raw) == int(exp_cd))

        def parse_yymmdd(s, is_exp=False):
            if len(s) == 6 and s.isdigit():
                yy = int(s[0:2])
                mm = s[2:4]
                dd = s[4:6]
                yyyy = (2000 + yy) if (is_exp or yy < 35) else (1900 + yy)
                return f"{dd}/{mm}/{yyyy}"
            return ""

        res["passportNumber"] = pass_no
        res["passNoValid"] = pass_no_valid
        if nat:
            res["nationality"] = nat
        if dob_raw:
            res["dateOfBirth"] = parse_yymmdd(dob_raw, False)
            res["dobValid"] = dob_valid
        if gender:
            res["gender"] = gender
        if exp_raw:
            res["dateOfExpiry"] = parse_yymmdd(exp_raw, True)
            res["expValid"] = exp_valid

    return res


def is_valid_name_token(token: str) -> bool:
    """Verifies that a token is a genuine name and not a label or noise."""
    if not token or len(token) < 2:
        return False
    clean = re.sub(r'[^A-Z]', '', token.upper())
    if len(clean) < 2:
        return False
    if clean in LABEL_WORDS:
        return False
    # Reject barcode noise like 'IIII' or '1111'
    if re.fullmatch(r'[I1L|]+', clean):
        return False
    return True


def classify_page_content(ocr_results):
    """
    Classifies page based strictly on actual detected content:
    - BIO_DATA (Bio-data page with photo, names, dates, nationality, MRZ)
    - FAMILY_ADDRESS (Family & Address page with parents, spouse, address, pin)
    - OLD_PASSPORT (Page containing old/previous passport stamps/endorsement)
    - MRZ (Page containing only/predominantly MRZ lines)
    - OTHER (Visa stamps, observation pages, other travel docs)
    - BLANK (Blank or negligible text)
    """
    if not ocr_results or len(ocr_results) < 2:
        return "BLANK", "Blank / No Data", False

    full_text = " ".join([r[1].upper() for r in ocr_results])

    has_mrz = ('P<IND' in full_text or 'P<' in full_text or '<<<' in full_text)
    has_biodata_tokens = any(t in full_text for t in [
        'REPUBLIC OF INDIA', 'GIVEN NAME', 'SURNAME', 'DATE OF BIRTH', 
        'PLACE OF ISSUE', 'DATE OF ISSUE', 'DATE OF EXPIRY', 'SEX', 'NATIONALITY', 'PASSPORT NO'
    ])
    has_family_tokens = any(t in full_text for t in [
        'FATHER', 'LEGAL GUARDIAN', 'MOTHER', 'SPOUSE', 'ADDRESS', 'PIN:'
    ])
    has_old_passport_tokens = any(t in full_text for t in [
        'OLD PASSPORT', 'PREVIOUS PASSPORT', 'OLD PP', 'PASSPON', 'OLDPASSPOT', 'CANCELLED'
    ])

    if has_old_passport_tokens and not (has_biodata_tokens or has_mrz) and not has_family_tokens:
        return "OLD_PASSPORT", "Old Passport Endorsement", True
    elif has_mrz and not has_biodata_tokens and len(ocr_results) <= 3:
        return "MRZ", "MRZ Strip", True
    elif has_biodata_tokens or has_mrz:
        return "BIO_DATA", "Bio-data Page (Front)", True
    elif has_family_tokens:
        return "FAMILY_ADDRESS", "Family & Address Page (Last)", True
    elif has_old_passport_tokens:
        return "OLD_PASSPORT", "Old Passport Endorsement", True
    else:
        return "OTHER", "Additional Document Page", True


def extract_passport_fields_from_ocr(ocr_results):
    """
    Extracts structured passport fields from OCR text and bounding boxes.
    Combines MRZ and VIZ with strict Old vs Current passport separation.
    """
    if not ocr_results:
        return {}

    raw_lines = [r[1].strip() for r in ocr_results]
    normalized_lines = [normalize_homoglyphs(line).strip() for line in raw_lines]
    full_text = "\n".join(normalized_lines)

    extracted = {
        "passportNumber": "",
        "passNoValid": False,
        "dateOfIssue": "",
        "dateOfExpiry": "",
        "placeOfIssue": "",
        "surname": "",
        "givenNames": "",
        "fullName": "",
        "dateOfBirth": "",
        "dobValid": False,
        "gender": "Male",
        "placeOfBirth": "",
        "nationality": "Indian",
        "fatherName": "",
        "motherName": "",
        "spouseName": "",
        "residentialAddress": "",
        "city": "",
        "state": "",
        "pinCode": "",
        "oldPassportNumber": "",
        "oldPassportIssueDate": "",
        "oldPassportIssuePlace": ""
    }

    # 1. MRZ Parsing
    mrz_data = parse_mrz_lines(raw_lines)
    if mrz_data:
        extracted.update(mrz_data)

    # 2. VIZ Extraction
    date_regex = r'\b(\d{2}[/-]\d{2}[/-]\d{4})\b'

    for i, line in enumerate(normalized_lines):
        upper_line = line.upper()

        # Current Passport Number from VIZ (1 letter + 7 digits)
        if not extracted["passportNumber"]:
            m_pass = re.search(r'\b([A-Z]\d{7})\b', upper_line)
            if m_pass and "OLD" not in upper_line and "PREVIOUS" not in upper_line and "PASSPON" not in upper_line:
                extracted["passportNumber"] = m_pass.group(1)
                extracted["passNoValid"] = True

        # Date of Birth
        if any(w in upper_line for w in ["DATE OF BIRTH", "DATEOFBIRTH", "MFAFY/DATEOFBIRTH"]):
            # Search this line and nearby lines
            dates = re.findall(date_regex, "\n".join(normalized_lines[max(0, i-2):min(len(normalized_lines), i+3)]))
            if dates and not extracted["dateOfBirth"]:
                extracted["dateOfBirth"] = dates[0].replace('-', '/')
                extracted["dobValid"] = True

        # Date of Issue
        if any(w in upper_line for w in ["DATE OF ISSUE", "DATEOF ISSUE", "DATEOFSSUE", "FAFU/DATEOF"]):
            dates = re.findall(date_regex, "\n".join(normalized_lines[max(0, i-2):min(len(normalized_lines), i+3)]))
            if dates and not extracted["dateOfIssue"]:
                extracted["dateOfIssue"] = dates[0].replace('-', '/')

        # Date of Expiry
        if any(w in upper_line for w in ["DATE OF EXPIRY", "DATEOFEXPIRY", "FA/DATEOFEXPIRY"]):
            dates = re.findall(date_regex, "\n".join(normalized_lines[max(0, i-2):min(len(normalized_lines), i+3)]))
            if dates and not extracted["dateOfExpiry"]:
                extracted["dateOfExpiry"] = dates[0].replace('-', '/')

        # Place of Issue
        if any(w in upper_line for w in ["PLACE OF ISSUE", "PLACEOF LSSUE", "PLACEOFISSUE"]):
            for j in [i-1, i+1, i+2, i]:
                if 0 <= j < len(normalized_lines):
                    cand = normalized_lines[j].upper().replace("PLACE OF ISSUE", "").replace("E/PLACEOF LSSUE", "").replace(":", "").strip()
                    if cand and len(cand) >= 3 and not re.search(r'\d', cand) and cand not in LABEL_WORDS:
                        extracted["placeOfIssue"] = cand
                        break

        # Place of Birth
        if any(w in upper_line for w in ["PLACE OF BIRTH", "PLACEOFBIRTH", "E/PLACEOFBIRTH"]):
            for j in [i-1, i+1, i+2, i]:
                if 0 <= j < len(normalized_lines):
                    cand = normalized_lines[j].upper().replace("PLACE OF BIRTH", "").replace("E/PLACEOFBIRTH", "").replace(":", "").strip()
                    if cand and len(cand) >= 3 and not re.search(r'\d', cand) and cand not in LABEL_WORDS:
                        extracted["placeOfBirth"] = cand
                        break

        # Surname (from VIZ if not from MRZ)
        if any(w in upper_line for w in ["SURNAME", "SUNAME", "3Q/SUNAME"]) and not extracted["surname"]:
            for j in [i-1, i+1, i+2]:
                if 0 <= j < len(normalized_lines):
                    cand = normalized_lines[j].upper().strip()
                    if is_valid_name_token(cand):
                        extracted["surname"] = cand
                        break

        # Given Names (from VIZ if not from MRZ)
        if any(w in upper_line for w in ["GIVEN NAME", "GIVENNAME", "/GIVENNAME(S)"]) and not extracted["givenNames"]:
            for j in [i-1, i+1, i+2]:
                if 0 <= j < len(normalized_lines):
                    cand = normalized_lines[j].upper().strip()
                    if is_valid_name_token(cand):
                        extracted["givenNames"] = cand
                        break

        # Father's Name
        if any(w in upper_line for w in ["FATHER", "FATHE", "LEGALGUARDIAN", "LEGAL GUARDIAN", "NAMEOFFATHE"]):
            inline = re.sub(r'.*?(?:FATHER|FATHE|LEGALGUARDIAN|LEGAL GUARDIAN|NAMEOFFATHE)[^A-Z]*', '', upper_line).strip()
            inline = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', inline).strip()
            if is_valid_name_token(inline) and len(inline) >= 3 and not re.search(r'\d', inline):
                extracted["fatherName"] = inline
            elif not extracted["fatherName"]:
                father_candidates = []
                for j in range(i + 1, min(len(normalized_lines), i + 4)):
                    cand = normalized_lines[j].upper().strip()
                    cand = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', cand).strip()
                    cand = re.sub(r'[^A-Z\s]', ' ', cand).strip()
                    cand = re.sub(r'\s+', ' ', cand).strip()
                    if cand and is_valid_name_token(cand) and not re.search(r'\d', cand) and "CAMSCANNER" not in cand:
                        father_candidates.append(cand)
                if father_candidates:
                    extracted["fatherName"] = " ".join(father_candidates[:3]).strip()

        # Mother's Name
        if any(w in upper_line for w in ["NAMEOFMOTHER", "MOTHER", "/NAMEOFMOTHER"]):
            inline = re.sub(r'.*?(?:NAMEOFMOTHER|MOTHER|/NAMEOFMOTHER)[^A-Z]*', '', upper_line).strip()
            inline = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', inline).strip()
            if is_valid_name_token(inline) and len(inline) >= 3 and not re.search(r'\d', inline):
                extracted["motherName"] = inline
            elif not extracted["motherName"]:
                mother_candidates = []
                for j in range(i + 1, min(len(normalized_lines), i + 4)):
                    cand = normalized_lines[j].upper().strip()
                    cand = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', cand).strip()
                    cand = re.sub(r'[^A-Z\s]', ' ', cand).strip()
                    cand = re.sub(r'\s+', ' ', cand).strip()
                    if cand and is_valid_name_token(cand) and not re.search(r'\d', cand) and "CAMSCANNER" not in cand:
                        mother_candidates.append(cand)
                if mother_candidates:
                    extracted["motherName"] = " ".join(mother_candidates[:3]).strip()

        # Spouse's Name
        if any(w in upper_line for w in ["NAMEOFSPOUSE", "SPOUSE", "HUSBAND", "WIFE", "FQF/NAMEOFSPOUSE"]):
            inline = re.sub(r'.*?(?:NAMEOFSPOUSE|SPOUSE|HUSBAND|WIFE|FQF/NAMEOFSPOUSE)[^A-Z]*', '', upper_line).strip()
            inline = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', inline).strip()
            if is_valid_name_token(inline) and len(inline) >= 3 and not re.search(r'\d', inline):
                extracted["spouseName"] = inline
            elif not extracted["spouseName"]:
                for j in range(i + 1, min(len(normalized_lines), i + 3)):
                    cand = normalized_lines[j].upper().strip()
                    cand = re.sub(r'[/]?(?:NAME\s*OF\s*)?(?:FATHER|MOTHER|SPOUSE|LEGAL|GUARDIAN).*', '', cand).strip()
                    cand = re.sub(r'[^A-Z\s]', ' ', cand).strip()
                    cand = re.sub(r'\s+', ' ', cand).strip()
                    if cand and is_valid_name_token(cand) and not re.search(r'\d', cand) and "CAMSCANNER" not in cand:
                        extracted["spouseName"] = cand
                        break

        # Address
        if any(w in upper_line for w in ["ADDRESS", "QANTADDRESS"]):
            addr_parts = []
            for j in range(i + 1, min(i + 8, len(normalized_lines))):
                l_part = normalized_lines[j].strip()
                if any(kw in l_part.upper() for kw in ["OLD PASSPORT", "FILE NO", "SIGNATURE", "PASSPON", "CAMSCANNER"]):
                    break
                if len(l_part) >= 2:
                    addr_parts.append(l_part)
            if addr_parts and not extracted["residentialAddress"]:
                extracted["residentialAddress"] = ", ".join(addr_parts)

        # PIN Code
        m_pin = re.search(r'\b(?:PIN\s*[:.-]?\s*)?([1-9]\d{5})\b', upper_line)
        if m_pin and not extracted["pinCode"]:
            extracted["pinCode"] = m_pin.group(1)

        # Old Passport Number & Details (Strictly separated!)
        if any(kw in upper_line for kw in ["OLD PASSPORT", "PREVIOUS PASSPORT", "OLD PP", "PASSPON", "OLDPASSPOT"]):
            for j in range(max(0, i-3), min(len(normalized_lines), i+5)):
                cand = normalized_lines[j].upper().strip()
                m_old = re.search(r'\b([A-Z]\d{7})\b', cand)
                if m_old and m_old.group(1) != extracted["passportNumber"]:
                    extracted["oldPassportNumber"] = m_old.group(1)
                dates = re.findall(date_regex, cand)
                if dates and not extracted["oldPassportIssueDate"]:
                    extracted["oldPassportIssueDate"] = dates[0].replace('-', '/')
                if any(c in cand for c in ['MUMBAI', 'THANE', 'DELHI', 'PUNE', 'NASHIK']) and not extracted["oldPassportIssuePlace"]:
                    extracted["oldPassportIssuePlace"] = cand

    # City & State extraction heuristic from address
    if extracted["residentialAddress"]:
        cities = ['MUMBAI', 'THANE', 'DELHI', 'PUNE', 'BANGALORE', 'HYDERABAD', 'CHENNAI', 'KOLKATA', 'AHMEDABAD', 'JAIPUR', 'SURAT', 'INDORE', 'NASHIK', 'NAVI MUMBAI']
        states = ['MAHARASHTRA', 'GUJARAT', 'DELHI', 'KARNATAKA', 'PUNJAB', 'HARYANA', 'TAMIL NADU', 'WEST BENGAL', 'KERALA', 'RAJASTHAN']
        addr_up = extracted["residentialAddress"].upper()
        for c in cities:
            if c in addr_up:
                extracted["city"] = c.title()
                break
        for s in states:
            if s in addr_up:
                extracted["state"] = s.title()
                break

    if not extracted["fullName"]:
        extracted["fullName"] = f"{extracted['givenNames']} {extracted['surname']}".strip()

    # Apply Indian name un-gluing to all extracted name fields
    for field in ["surname", "givenNames", "fullName", "fatherName", "motherName", "spouseName"]:
        if extracted.get(field):
            extracted[field] = unglue_indian_names(extracted[field])

    return extracted


def process_passport_file(file_path: str):
    """
    Main entry point for processing a passport file container.
    Returns: dict with extracted fields, status, and multi-page preview array.
    """
    from rapidocr_onnxruntime import RapidOCR
    engine = RapidOCR()

    ext = os.path.splitext(file_path)[1].lower()
    pages_raw = []

    # 1. Container Ingestion
    if ext in ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']:
        try:
            im = Image.open(file_path).convert("RGB")
            pages_raw.append(im)
        except Exception as e:
            return {"error": f"Failed to open image: {e}"}

    elif ext == '.pdf':
        try:
            import pypdfium2 as pdfium
            pdf = pdfium.PdfDocument(file_path)
            for page in pdf:
                bitmap = page.render(scale=2.5)
                pil_im = bitmap.to_pil().convert("RGB")
                pages_raw.append(pil_im)
        except Exception as e:
            return {"error": f"Failed to render PDF: {e}"}

    elif ext == '.docx':
        try:
            with zipfile.ZipFile(file_path) as zf:
                for name in zf.namelist():
                    if name.lower().startswith("word/media/") and name.lower().endswith(('.png', '.jpg', '.jpeg')):
                        data = zf.read(name)
                        im = Image.open(io.BytesIO(data)).convert("RGB")
                        if im.width >= 120 and im.height >= 120:
                            pages_raw.append(im)
        except Exception as e:
            return {"error": f"Failed to extract DOCX: {e}"}

    elif ext == '.doc':
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            pos = 0
            while True:
                idx = content.find(b'\xFF\xD8\xFF', pos)
                if idx == -1:
                    break
                end = content.find(b'\xFF\xD9', idx + 3)
                if end == -1:
                    break
                raw_jpg = content[idx:end + 2]
                try:
                    im = Image.open(io.BytesIO(raw_jpg)).convert("RGB")
                    if im.width >= 150 and im.height >= 150:
                        pages_raw.append(im)
                except Exception:
                    pass
                pos = end + 2
        except Exception as e:
            return {"error": f"Failed to parse DOC: {e}"}

    if not pages_raw:
        return {"error": "No valid document or passport pages found in upload."}

    # 2. Process each page
    pages_processed = []
    final_output = {
        "passportNumber": "",
        "passNoValid": False,
        "dateOfIssue": "",
        "dateOfExpiry": "",
        "placeOfIssue": "",
        "surname": "",
        "givenNames": "",
        "fullName": "",
        "dateOfBirth": "",
        "dobValid": False,
        "gender": "Male",
        "placeOfBirth": "",
        "nationality": "Indian",
        "fatherName": "",
        "motherName": "",
        "spouseName": "",
        "residentialAddress": "",
        "city": "",
        "state": "",
        "pinCode": "",
        "oldPassportNumber": "",
        "oldPassportIssueDate": "",
        "oldPassportIssuePlace": "",
        "previewImage": None,
        "pages": []
    }

    for idx, page_img in enumerate(pages_raw):
        try:
            page_img = ImageOps.exif_transpose(page_img)
        except Exception:
            pass

        # Orientation evaluation, deskew, safe-crop & OCR
        canonical_img, final_results, best_angle = evaluate_orientations_and_ocr(page_img, engine)
        page_fields = extract_passport_fields_from_ocr(final_results)

        # Content classification
        page_type, page_label, has_data = classify_page_content(final_results)

        # Generate base64 canonical upright preview thumbnail of this page
        buf = io.BytesIO()
        canonical_img.save(buf, format="JPEG", quality=88, optimize=True)
        page_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')

        page_record = {
            "pageNumber": idx + 1,
            "pageType": page_type,
            "label": page_label,
            "hasData": has_data,
            "rotation": 0,
            "previewImage": page_b64,
            "fields": page_fields
        }

        # Include all non-blank pages or at least pages with data
        if has_data or len(pages_raw) == 1:
            pages_processed.append(page_record)

        # Merge fields into final output
        for k, v in page_fields.items():
            if v and not final_output.get(k):
                final_output[k] = v

    # If no pages marked with data, fallback to first page
    if not pages_processed and pages_raw:
        buf = io.BytesIO()
        pages_raw[0].save(buf, format="JPEG", quality=88)
        fallback_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('ascii')
        pages_processed.append({
            "pageNumber": 1,
            "pageType": "OTHER",
            "label": "Document Page 1",
            "hasData": True,
            "previewImage": fallback_b64,
            "fields": {}
        })

    # Select primary preview image: Prioritize BIO_DATA (Bio-data page)
    primary_preview = None
    for p in pages_processed:
        if p["pageType"] in ["BIO_DATA", "FRONT_PAGE"]:
            primary_preview = p["previewImage"]
            break

    if not primary_preview:
        for p in pages_processed:
            if p["hasData"]:
                primary_preview = p["previewImage"]
                break

    if not primary_preview and pages_processed:
        primary_preview = pages_processed[0]["previewImage"]

    final_output["previewImage"] = primary_preview
    final_output["pages"] = pages_processed

    return final_output


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    target_file = sys.argv[1]
    res = process_passport_file(target_file)
    print(json.dumps(res, indent=2))

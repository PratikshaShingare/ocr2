/**
 * Khanna Travels & Holidays — Dynamic Visa Requirements Checklist Engine
 * (js/checklist.js)
 * 
 * Supports:
 * - Country-wise ("country vised") dynamic checklists:
 *   Europe (Schengen), Japan, Singapore, United Kingdom (UK), United States (USA),
 *   Canada, Australia, UAE / Dubai, Worldwide / Other (Generic Consular)
 * - Visa Categories: Tourist, Business, Family Visit, Transit
 * - Employment Status filters: Salaried/Employed, Business Owner/Self-Employed,
 *   Student, Retired, Homemaker/Dependent
 * - Interactive checkboxes with live progress bar and counter
 * - Check All / Clear All / Add Custom Document
 * - LocalStorage state persistence per applicant and destination
 * - Official printable checklist with Khanna Travels letterhead and verification sign-off
 */

(function(global) {
  'use strict';

  // Master Checklist Rules Dictionary
  const CHECKLIST_RULES = {
    'Europe (Schengen)': {
      countryName: 'Europe (Schengen Area)',
      code: 'SCHENGEN',
      embassyNotice: 'Applicable for France, Switzerland, Germany, Italy, Spain, Austria, Netherlands & all 29 Schengen member states. Minimum passport validity of 3 months beyond departure from Schengen area, with at least 2 blank pages.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'schengen_passport',
              title: 'Original Valid Passport',
              detail: 'Valid for at least 3 months beyond intended departure from Schengen area, issued within the last 10 years, with minimum 2 blank visa pages + copies of first/last page and previous Schengen/UK/US visas.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_photos',
              title: 'Passport Photographs (Schengen Specification)',
              detail: '2 recent photographs (35mm x 45mm), taken within last 6 months, 80% face coverage, matte finish, pure white background, neutral expression, without spectacles or headwear (except religious).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_app_form',
              title: 'Schengen Visa Application Form',
              detail: 'Duly completed online via official consular portal (e.g. France-Visas, Swiss Visa Desk), printed and hand-signed by applicant (both parents must sign for minors).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_cover_letter',
              title: 'Personal Cover Letter',
              detail: 'Detailed day-by-day travel itinerary stating exact entry/exit dates, hotel details in each city, source of funding, and firm commitment to return to India before visa expiry.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_flight',
              title: 'Roundtrip Flight Reservation / Itinerary',
              detail: 'Confirmed round-trip flight booking or verifiable reservation itinerary with PNR showing entry and exit from Schengen territory.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_hotel',
              title: 'Confirmed Hotel Bookings / Accommodation Vouchers',
              detail: 'Confirmed hotel reservations covering every single night in the Schengen area with hotel name, full address, contact number, and applicant name explicitly listed.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_insurance',
              title: 'Overseas Travel Medical Insurance (€30,000 Minimum Coverage)',
              detail: 'Valid for all Schengen states covering entire travel duration + 15 grace days. Must cover emergency medical repatriation, urgent hospital treatment, minimum €30,000 (approx. $50,000 USD).',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Income Proofs',
          icon: 'financial',
          items: [
            {
              id: 'schengen_bank_statement',
              title: 'Original Personal Bank Statements (Last 6 Months)',
              detail: 'Updated till date of appointment on original bank stationery, stamped and signed on every single page by the bank branch manager. Must show healthy consistent closing balance and salary/business credits.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'schengen_itr',
              title: 'Income Tax Return (ITR-V) Acknowledgements',
              detail: 'Official ITR-V verification forms for the last 2 to 3 Assessment Years (AY 2024-25, AY 2023-24, AY 2022-23) with corresponding computation of income.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Occupational Proofs',
          icon: 'employment',
          items: [
            // Employed
            {
              id: 'schengen_emp_noc',
              title: 'Employer Leave Approval / No Objection Certificate (NOC)',
              detail: 'Original NOC on official company letterhead with company seal, mentioning applicant designation, joining date, monthly remuneration, sanctioned leave dates, and confirmation of resuming duties.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'schengen_salary_slips',
              title: 'Salary Slips (Last 3 to 6 Months)',
              detail: 'Authenticated monthly pay slips for the last 3-6 months with company seal and authorized signature.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'schengen_emp_id',
              title: 'Company Identity Card Copy',
              detail: 'Clear photocopy of applicant corporate employee ID card.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: false
            },
            // Business
            {
              id: 'schengen_biz_reg',
              title: 'Business Registration Proof / GST Certificate',
              detail: 'Certificate of Incorporation, GST Registration Certificate, Partnership Deed, or Shops & Establishment Act license proving legitimate business existence.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'schengen_company_bank',
              title: 'Company Bank Account Statement (Last 6 Months)',
              detail: 'Original current account bank statement for past 6 months bearing bank seal and authorized branch signature.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'schengen_company_itr',
              title: 'Company Income Tax Returns (Last 2-3 Years)',
              detail: 'ITR-V acknowledgements along with audited Balance Sheet and Profit & Loss statement.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            // Student
            {
              id: 'schengen_student_bonafide',
              title: 'School / University Bonafide Certificate & ID Card',
              detail: 'Official Bonafide student certificate issued by school/university principal or registrar + student ID card copy.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'schengen_student_leave',
              title: 'Approved Leave of Absence from Educational Institution',
              detail: 'Formal sanction of leave letter confirming vacation period or approved absence during term time.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'schengen_student_sponsorship',
              title: 'Parental Sponsorship Letter & Financial Proofs',
              detail: 'Affidavit / letter from parent declaring financial sponsorship + sponsor parent bank statement and ITR.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            // Retired
            {
              id: 'schengen_pension_statement',
              title: 'Pension Payment Order (PPO) & Pension Account Statement',
              detail: 'PPO copy or bank statement showing continuous pension credits for the last 6 months.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: true
            },
            {
              id: 'schengen_retirement_letter',
              title: 'Retirement Proof / Superannuation Order',
              detail: 'Official retirement certificate or superannuation documentation from previous employer/government department.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: false
            },
            // Homemaker / Dependent
            {
              id: 'schengen_sponsor_letter',
              title: 'Sponsorship Undertaking Letter from Spouse / Parent',
              detail: 'Signed declaration undertaking complete financial responsibility for all travel, boarding, lodging, and medical costs.',
              badge: 'Dependent',
              employment: ['Homemaker / Dependent'],
              mandatory: true
            },
            {
              id: 'schengen_sponsor_financials',
              title: 'Sponsor Bank Statement (6 Months) & ITRs (3 Years)',
              detail: 'Original stamped bank statement and ITR-V acknowledgements of the sponsoring family member.',
              badge: 'Dependent',
              employment: ['Homemaker / Dependent'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Supporting & Supplemental Documents',
          icon: 'supporting',
          items: [
            {
              id: 'schengen_marriage_cert',
              title: 'Marriage Certificate (If Travelling with Spouse)',
              detail: 'Required if travelling together as husband and wife and spouse name is not yet endorsed on applicant passport.',
              badge: 'Conditional',
              mandatory: false
            },
            {
              id: 'schengen_property_docs',
              title: 'Property Deeds / Fixed Deposit Certificates (Proof of Ties)',
              detail: 'Optional supplementary proof of immovable assets in India to demonstrate strong economic ties and intent to return.',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'schengen_old_passports',
              title: 'All Previous Passports & Visas',
              detail: 'Original previous passports showing international travel history and previous visas (UK, USA, Japan, Schengen, etc.).',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'schengen_invitation',
              title: 'Host Invitation Letter / Attestation d\'Accueil (If Visiting Family/Friends)',
              detail: 'Official town hall certified invitation (Attestation d\'Accueil in France, Verpflichtungserklärung in Germany, Declaración de Invitación in Spain) + host passport/residence permit copy.',
              badge: 'Family Visit',
              category: ['Family Visit'],
              mandatory: false
            },
            {
              id: 'schengen_biz_invitation',
              title: 'Official Business Invitation Letter from Host Company',
              detail: 'Invitation letter on host company letterhead stating purpose of meetings, dates, and whether travel expenses are borne by host or Indian company.',
              badge: 'Business',
              category: ['Business'],
              mandatory: true
            }
          ]
        }
      ]
    },

    'Japan': {
      countryName: 'Japan',
      code: 'JAPAN',
      embassyNotice: 'Embassy of Japan in India / Consulate-General of Japan. All documents must be original unless photocopy is specifically noted. Strict format adherence required for Daily Itinerary.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'japan_passport',
              title: 'Original Valid Passport',
              detail: 'Valid for at least 6 months with at least 2 blank pages + clear photocopy of first & last page.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_photo',
              title: 'Passport Photograph (Japan Standard 2x2 Inches)',
              detail: '1 photograph (45mm x 45mm or 2x2 inches), taken within last 6 months, glossy or semi-matte, plain white background, sharp focus, face height 32mm to 36mm.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_app_form',
              title: 'Japan Visa Application Form',
              detail: 'Printed application form with applicant signature matching passport signature exactly. Form must not have any blank fields (write N/A if not applicable).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_cover_letter',
              title: 'Personal Cover Letter',
              detail: 'Addressed to Embassy / Consulate General of Japan, explaining trip purpose, cities visited, travel dates, and funding.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_schedule',
              title: 'Schedule of Stay (Day-wise Itinerary — Official Format)',
              detail: 'Mandatory day-to-day schedule of stay specifying date, scheduled activity, contact phone number, and name of booked accommodation/hotel for every single day.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_flights',
              title: 'Confirmed Flight Itinerary / Tickets',
              detail: 'Round-trip flight booking with confirmed dates of arrival in and departure from Japan.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_hotel',
              title: 'Hotel Booking Confirmation Vouchers',
              detail: 'Confirmed vouchers with hotel name, address, phone number, and guest names matching passport.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Income Proofs',
          icon: 'financial',
          items: [
            {
              id: 'japan_bank_stmt',
              title: 'Original Bank Statements (Last 6 Months)',
              detail: 'Original bank statement on bank stationery with branch stamp and signature on all pages. Japan consulate requires a consistent, healthy closing balance.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'japan_itr',
              title: 'Income Tax Return (ITR-V) Acknowledgements (Last 3 Years)',
              detail: 'Verified ITR acknowledgements for the last 3 financial years.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Occupational Proofs',
          icon: 'employment',
          items: [
            {
              id: 'japan_emp_noc',
              title: 'Leave Sanction Certificate / NOC from Employer',
              detail: 'On company letterhead stating designation, tenure, monthly salary, and confirmed leave approval.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'japan_salary_slips',
              title: 'Salary Slips (Last 3 Months)',
              detail: 'Official pay slips with company stamp.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'japan_biz_reg',
              title: 'Company Registration / GST Certificate',
              detail: 'Official proof of business ownership (Certificate of Incorporation, GST, Partnership Deed).',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'japan_company_bank',
              title: 'Company Current Account Statement (Last 6 Months)',
              detail: 'Stamped and signed by bank manager.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'japan_student_bonafide',
              title: 'Student ID & School Bonafide Certificate',
              detail: 'Proof of current enrollment with approved leave letter.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'japan_pension_proof',
              title: 'Pension Statement & Retirement Letter',
              detail: 'PPO copy and 6-month pension bank statement.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: true
            },
            {
              id: 'japan_sponsor_undertaking',
              title: 'Sponsorship Letter & Sponsor Financials',
              detail: 'Undertaking letter by sponsor + 6-month bank statement & ITR of sponsor.',
              badge: 'Dependent',
              employment: ['Homemaker / Dependent'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Supporting & Sponsor Documents',
          icon: 'supporting',
          items: [
            {
              id: 'japan_old_passports',
              title: 'Old Passports Showing Prior Travel',
              detail: 'Particularly previous visas to Japan, USA, UK, Canada, Australia, Schengen.',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'japan_inviter_letter',
              title: 'Letter of Reason for Invitation (Shouheiriyuu-sho)',
              detail: 'Required if visiting acquaintances or business partners in Japan, stating relationship and background.',
              badge: 'Invited',
              category: ['Business', 'Family Visit'],
              mandatory: false
            },
            {
              id: 'japan_guarantor_letter',
              title: 'Letter of Guarantee (Mimoto Hoshousho)',
              detail: 'Official Japanese guarantor form signed by host in Japan if guarantor is sponsoring the applicant.',
              badge: 'Guarantor',
              category: ['Family Visit'],
              mandatory: false
            }
          ]
        }
      ]
    },

    'Singapore': {
      countryName: 'Singapore',
      code: 'SINGAPORE',
      embassyNotice: 'High Commission of the Republic of Singapore / Authorized Visa Processing Agency. Visa issued is an electronic visa (e-Visa). Form 14A must be completed accurately.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'sg_passport',
              title: 'Original Valid Passport',
              detail: 'Valid for at least 6 months beyond entry date + photocopy of first and last bio pages.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_photo',
              title: 'Passport Photographs (Singapore Spec — Matte Finish)',
              detail: '2 recent photographs (35mm x 45mm), matte or semi-matte finish, white background, 80% face view, taken within last 3 months. No digital touch-ups.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_form14a',
              title: 'Singapore Form 14A (Duly Signed)',
              detail: 'Standard official Form 14A application completely filled in block letters and signed by applicant.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_cover_letter',
              title: 'Personal Covering Letter',
              detail: 'Addressed to "The Visa Officer, High Commission of the Republic of Singapore, New Delhi / Consulate General of the Republic of Singapore, Mumbai".',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_flight',
              title: 'Confirmed Return Air Tickets',
              detail: 'Confirmed flight ticket booking into and departing out of Singapore (Changi Airport).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_hotel',
              title: 'Confirmed Hotel Booking Voucher',
              detail: 'Booking voucher covering the complete stay in Singapore with hotel contact numbers and guest names.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Income Proofs',
          icon: 'financial',
          items: [
            {
              id: 'sg_bank_stmt',
              title: 'Bank Statement (Last 3 to 6 Months)',
              detail: 'Bank statement with bank stamp and signature showing minimum closing balance of ₹50,000+ per passenger.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'sg_itr',
              title: 'Income Tax Return (ITR-V) (Last 1-2 Years)',
              detail: 'Acknowledgement copy of recent ITR filing.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Occupational Proofs',
          icon: 'employment',
          items: [
            {
              id: 'sg_emp_letter',
              title: 'Employment Letter / Leave Approval Letter',
              detail: 'On company letterhead stating job designation, salary, and authorized leave approval.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'sg_salary_slips',
              title: 'Salary Slips (Last 3 Months)',
              detail: 'Original or HR-stamped pay slips.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'sg_biz_proof',
              title: 'Business Registration / GST Certificate',
              detail: 'For self-employed applicants, company GST or partnership deed.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'sg_student_id',
              title: 'Student ID Card & Bonafide Letter',
              detail: 'Student ID copy and school bonafide confirmation.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'sg_sponsor_proof',
              title: 'Sponsorship Letter & Sponsor Bank Statements',
              detail: 'For homemakers, minor children, or elderly parents sponsored by family.',
              badge: 'Dependent',
              employment: ['Homemaker / Dependent'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Supporting & Special Consular Forms',
          icon: 'supporting',
          items: [
            {
              id: 'sg_form_v39a',
              title: 'Form V39A (Letter of Introduction — LOI)',
              detail: 'Mandatory if applicant is invited by a Singapore Citizen or Permanent Resident (PR) holding NRIC.',
              badge: 'Conditional',
              category: ['Family Visit', 'Business'],
              mandatory: false
            },
            {
              id: 'sg_marriage_cert',
              title: 'Marriage Certificate',
              detail: 'If travelling as a couple and spouse name is not on applicant passport.',
              badge: 'Conditional',
              mandatory: false
            }
          ]
        }
      ]
    },

    'United Kingdom (UK)': {
      countryName: 'United Kingdom (UKVI)',
      code: 'UK',
      embassyNotice: 'UK Visas & Immigration (UKVI) / VFS Global. All documents uploaded digitally via VFS portal before biometrics appointment. Strong economic & social ties to home country are crucial.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'uk_passport',
              title: 'Current Valid Passport + All Previous Passports',
              detail: 'Original passport valid for entire duration of stay with at least 1 blank page + all expired passports showing global travel history.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uk_app_summary',
              title: 'UKVI Online Visa Application Form & Appointment Confirmation',
              detail: 'Printed copy of finalized online submission summary and VFS biometrics appointment confirmation letter.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uk_cover_letter',
              title: 'Comprehensive Personal Cover Letter',
              detail: 'Detailing travel itinerary, UK accommodation, total budget, detailed source of travel funds, and strong ties to India (job, family, property) ensuring return.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uk_flight_itinerary',
              title: 'Flight Itinerary / Provisional Booking',
              detail: 'Provisional roundtrip flight reservation itinerary (UKVI does not mandate ticket purchase prior to visa approval).',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'uk_accommodation',
              title: 'Accommodation Proof (Hotel Bookings or Host Proof)',
              detail: 'Confirmed hotel reservations or host invitation letter with utility bill and tenancy/deed if staying with family.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Origin of Funds (Strict UKVI Requirement)',
          icon: 'financial',
          items: [
            {
              id: 'uk_bank_statements',
              title: 'Original Bank Statements (Last 6 Months)',
              detail: 'Showing progressive savings, origin of regular salary or business deposits, and healthy closing balance. Explain any sudden large deposits with documentation.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uk_itr',
              title: 'Income Tax Returns (ITR-V Acknowledgement — Last 3 Years)',
              detail: 'ITR-V forms with computation of income for the last 3 financial years.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uk_financial_assets',
              title: 'Fixed Deposits, Mutual Funds, CA Financial Evaluation',
              detail: 'Certified FD receipts, mutual fund holding statements, or Chartered Accountant financial net worth report.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Proof of Ties to India',
          icon: 'employment',
          items: [
            {
              id: 'uk_emp_letter',
              title: 'Employer Letter Confirming Permanent Role & Approved Leave',
              detail: 'Letter on company letterhead confirming job title, salary, length of service, sanctioned leave dates, and affirming applicant will resume work upon return.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'uk_payslips',
              title: 'Payslips (Last 6 Months)',
              detail: '6 months payslips directly corresponding to the salary credits in bank statements.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'uk_biz_incorporation',
              title: 'Business Registration, MOA & Audited Financials',
              detail: 'Certificate of Incorporation, GST registration, partnership deed, and audited P&L/Balance Sheet for last 2 years.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'uk_biz_bank',
              title: 'Company Bank Statements (Last 6 Months)',
              detail: 'Company current account statements with bank seal.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'uk_student_letter',
              title: 'School / University Enrollment Confirmation Letter',
              detail: 'Letter confirming current academic year, approval for absence, and date student must resume studies.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'uk_pension_evidence',
              title: 'Pension Payment Proof & Retirement Benefits',
              detail: 'Monthly pension credits, superannuation order, and retirement savings proofs.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Family & Ties to Home Country',
          icon: 'supporting',
          items: [
            {
              id: 'uk_property_deeds',
              title: 'Property Deeds / Land Registration / House Ownership',
              detail: 'Photocopies of property papers demonstrating substantial fixed assets in India.',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'uk_family_ties',
              title: 'Family Ties Evidence (Marriage & Children Birth Certificates)',
              detail: 'Proves immediate family remaining in India during applicant travel.',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'uk_host_docs',
              title: 'Host Invitation Letter, Passport & UK Residence Status Proof',
              detail: 'If visiting family or friends in UK: host signed invitation, copy of British passport or BRP/indefinite leave to remain, council tax bill, and last 3 months host payslips.',
              badge: 'Family Visit',
              category: ['Family Visit'],
              mandatory: false
            }
          ]
        }
      ]
    },

    'United States (USA)': {
      countryName: 'United States (B1/B2 Visa)',
      code: 'USA',
      embassyNotice: 'U.S. Embassy & Consulates in India. Two-stage process: OFC Biometrics + Consular Interview. Applicant must carry all original documents to the interview.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Application Documents',
          icon: 'document',
          items: [
            {
              id: 'us_passport',
              title: 'Original Valid Passport + All Previous Passports',
              detail: 'Valid for at least 6 months beyond period of stay in the US, with at least 1 blank page + all expired passports.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_ds160',
              title: 'DS-160 Online Nonimmigrant Visa Confirmation Page',
              detail: 'Printed confirmation page with clear alphanumeric barcode from CEAC portal.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_appt_letter',
              title: 'Appointment Confirmation Letter',
              detail: 'Official US Visa appointment confirmation page showing OFC Biometrics and Consular Interview appointments.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_fee_receipt',
              title: 'MRV Visa Application Fee Payment Receipt',
              detail: 'Payment receipt confirmation generated after paying consular fee.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_photo',
              title: 'Photograph (2x2 Inches / 51mm x 51mm)',
              detail: '1 printed photograph (2x2 inches / 50x50mm), white background, square aspect, face between 50-69% of image height, both ears visible, strictly no spectacles.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Tax Documents (Interview Supporting)',
          icon: 'financial',
          items: [
            {
              id: 'us_bank_statements',
              title: 'Original Bank Statements (Last 6 Months)',
              detail: 'Personal savings bank statements with bank seal and signature demonstrating adequate liquid funds for trip.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_itr',
              title: 'Income Tax Returns (ITR-V Acknowledgement — Last 3 Years)',
              detail: 'ITR-V verification acknowledgements for last 3 Assessment Years.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'us_ca_networth',
              title: 'CA Net Worth Statement / Asset Evaluation',
              detail: 'Comprehensive evaluation of movable and immovable assets in India to overcome presumption of immigrant intent (INA 214b).',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Institutional Proofs',
          icon: 'employment',
          items: [
            {
              id: 'us_emp_letter',
              title: 'Employment Letter & Leave Sanction Certificate',
              detail: 'On company letterhead showing designation, tenure, monthly salary, and confirmed leave approval.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'us_payslips',
              title: 'Salary Slips (Last 6 Months) & Form 16',
              detail: 'Pay slips along with employer Form 16 / Part B tax certificate.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'us_biz_proof',
              title: 'Business Registration, GST Certificate & Partnership Deed',
              detail: 'For business owners, proof of active enterprise, GST filings, and company bank statements.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'us_student_proof',
              title: 'College / School Bonafide Certificate & Marksheets',
              detail: 'Student ID, bonafide letter, and parent financial sponsorship affidavit.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'us_pension_order',
              title: 'Pension Payment Order & Superannuation Certificate',
              detail: 'For retired applicants, proving retirement benefits and continuous pension.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Trip Itinerary & Host Documents',
          icon: 'supporting',
          items: [
            {
              id: 'us_travel_itinerary',
              title: 'Travel Itinerary & Planned Schedule',
              detail: 'Outline of planned visit: cities, sightseeing landmarks, tentative accommodation.',
              badge: 'Recommended',
              mandatory: false
            },
            {
              id: 'us_invitation',
              title: 'Host Invitation Letter & Legal Status (If Visiting Family)',
              detail: 'Invitation letter from host in US + copy of host U.S. Passport, Green Card, or valid Visa (H-1B, L-1) with Form I-94 and recent pay stubs.',
              badge: 'Family Visit',
              category: ['Family Visit'],
              mandatory: false
            },
            {
              id: 'us_form_i134',
              title: 'Form I-134 (Affidavit of Support) If Host is Sponsoring',
              detail: 'Completed and signed by US sponsor with sponsor W-2 forms and bank statements.',
              badge: 'Sponsorship',
              category: ['Family Visit'],
              mandatory: false
            }
          ]
        }
      ]
    },

    'Canada': {
      countryName: 'Canada (Visitor Visa / TRV)',
      code: 'CANADA',
      embassyNotice: 'Immigration, Refugees and Citizenship Canada (IRCC) / VFS Canada. Online application with digital document upload, followed by biometric collection at VFS.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'ca_passport',
              title: 'Valid Passport (All Stamped & Bio Pages Scanned)',
              detail: 'Valid passport with scans of bio pages and all pages with stamps, visas, or markings.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_forms',
              title: 'IMM 5257 (Application for TRV) & IMM 5645 (Family Info)',
              detail: 'Standard IRCC 2D barcode validated forms filled online.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_photo',
              title: 'Digital Passport Photographs (35mm x 45mm)',
              detail: 'Compliant with IRCC specifications: 35mm x 45mm, head size 31mm to 36mm, white background, neutral expression.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_cover_letter',
              title: 'Purpose of Travel Cover Letter & Day-by-Day Itinerary',
              detail: 'Comprehensive purpose statement explaining vacation schedule, places visited, and intent to leave Canada by visa expiry.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_flights_hotels',
              title: 'Flight Itinerary & Hotel Accommodation Bookings',
              detail: 'Round-trip flight booking itinerary and hotel vouchers for every destination across Canada.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Economic Proofs',
          icon: 'financial',
          items: [
            {
              id: 'ca_bank_stmt',
              title: 'Bank Account Statements (Last 6 Months)',
              detail: 'Original bank statement with bank seal and signature showing sufficient liquid funds for trip.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_itr',
              title: 'Income Tax Return (ITR-V) Acknowledgements (Last 3 Years)',
              detail: 'ITR-V forms and computation sheets for past 3 Assessment Years.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'ca_assets',
              title: 'Property Valuation & Investment Portfolio',
              detail: 'Property papers, mutual fund statements, fixed deposit certificates.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        },
        {
          id: 'employment',
          title: 'Proof of Ties & Employment Status',
          icon: 'employment',
          items: [
            {
              id: 'ca_emp_letter',
              title: 'Employment Letter & Approved Leave Sanction',
              detail: 'On company letterhead stating position, salary, length of employment, and approved vacation dates.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'ca_payslips',
              title: 'Pay Slips (Last 6 Months)',
              detail: 'Recent consecutive salary slips matching bank credits.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'ca_biz_reg',
              title: 'Business Incorporation & GST Certificate',
              detail: 'Proof of business registration and 6 months company bank statement.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'ca_student_bonafide',
              title: 'School / University Bonafide Letter & Student ID',
              detail: 'Showing active enrollment and sanction of leave.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Host & Family Documentation',
          icon: 'supporting',
          items: [
            {
              id: 'ca_host_invitation',
              title: 'Invitation Letter from Canadian Host (If Visiting Family)',
              detail: 'Invitation letter stating purpose, duration, accommodation + host Canadian citizenship/PR card copy + host Notice of Assessment (NOA).',
              badge: 'Family Visit',
              category: ['Family Visit'],
              mandatory: false
            },
            {
              id: 'ca_family_ties',
              title: 'Proof of Family Ties in Home Country',
              detail: 'Marriage certificate, children birth certificates demonstrating strong incentive to return.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        }
      ]
    },

    'Australia': {
      countryName: 'Australia (Visitor Visa Subclass 600)',
      code: 'AUSTRALIA',
      embassyNotice: 'Department of Home Affairs, Australian Government. Online application via ImmiAccount. All supporting documents must be high-resolution digital scans.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'au_passport',
              title: 'Current Valid Passport (All Stamped Pages Scanned)',
              detail: 'Valid passport with scans of bio pages and all pages with prior visa stamps and travel history.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_photo',
              title: 'Passport Size Photograph (45mm x 35mm)',
              detail: 'Recent photograph with white background.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_cover_letter',
              title: 'Comprehensive Cover Letter & Planned Itinerary',
              detail: 'Addressed to Department of Home Affairs explaining itinerary, accommodation details, and financial arrangements.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_flight_hotel',
              title: 'Flight Itinerary & Hotel Bookings',
              detail: 'Provisional roundtrip flight reservation and hotel bookings covering planned stay.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial Self-Sufficiency Documents',
          icon: 'financial',
          items: [
            {
              id: 'au_bank_stmt',
              title: 'Bank Account Statements (Last 6 Months)',
              detail: 'Personal bank statements with bank seal showing steady income and sufficient closing balance.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_itr',
              title: 'Income Tax Returns (ITR-V) (Last 3 Years)',
              detail: 'Verified ITR acknowledgements.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_liquid_assets',
              title: 'Fixed Deposits & Financial Investment Certificates',
              detail: 'FDs, mutual fund portfolios, shares, and savings.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Genuine Temporary Entrant (GTE) Ties',
          icon: 'employment',
          items: [
            {
              id: 'au_emp_letter',
              title: 'Employer Letter & Approved Leave Sanction',
              detail: 'Stating designation, length of service, salary, and authorized leave approval.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'au_payslips',
              title: 'Pay Slips (Last 6 Months)',
              detail: 'Monthly pay slips with company seal.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'au_biz_reg',
              title: 'Business Registration & Company Bank Statements',
              detail: 'Certificate of Incorporation, GST, and 6 months company bank statement.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'au_student_letter',
              title: 'University / School Bonafide Certificate & Leave Approval',
              detail: 'Bonafide letter and student ID copy.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Family & Additional Consular Forms',
          icon: 'supporting',
          items: [
            {
              id: 'au_form54',
              title: 'Form 54 (Family Composition Form)',
              detail: 'Completed and signed family composition form listing parents, siblings, spouse, and children.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'au_host_invitation',
              title: 'Invitation Letter & Host Legal Status (If Visiting Family)',
              detail: 'Host invitation letter + copy of Australian passport / PR visa + proof of residence in Australia.',
              badge: 'Family Visit',
              category: ['Family Visit'],
              mandatory: false
            }
          ]
        }
      ]
    },

    'United Arab Emirates (UAE / Dubai)': {
      countryName: 'United Arab Emirates (UAE / Dubai)',
      code: 'UAE',
      embassyNotice: 'General Directorate of Residency and Foreigners Affairs (GDRFA) / Federal Authority for Identity, Citizenship, Customs and Port Security (ICP). Fast-track electronic visa.',
      categories: ['Tourist', 'Business', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Visa Application Documents',
          icon: 'document',
          items: [
            {
              id: 'uae_passport',
              title: 'Clear Color Passport Scans (Front & Back Bio Pages)',
              detail: 'High-resolution color scan of passport front cover, bio page, and address page (valid min 6 months).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uae_photo',
              title: 'Passport Size Photograph (White Background)',
              detail: 'Clear digital color photograph with pure white background, studio quality.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uae_pan_card',
              title: 'PAN Card Copy',
              detail: 'Clear photocopy of applicant PAN card (mandatory for Indian passport holders).',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uae_flight_ticket',
              title: 'Confirmed Return Flight Ticket',
              detail: 'Confirmed roundtrip air ticket with return from Dubai / Abu Dhabi / Sharjah.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'uae_hotel_voucher',
              title: 'Confirmed Hotel Booking / Stay Confirmation',
              detail: 'Hotel confirmation voucher covering duration of stay in UAE.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Special / Conditional Verification',
          icon: 'supporting',
          items: [
            {
              id: 'uae_otb',
              title: 'OK to Board (OTB) Verification Status',
              detail: 'OTB update with the operating airline (Air India, Emirates, IndiGo, SpiceJet, etc.) if required by passport category.',
              badge: 'Conditional',
              mandatory: false
            },
            {
              id: 'uae_prior_travel',
              title: 'Prior International Travel History / Visas',
              detail: 'Passports with previous visits to US, UK, Schengen, or UAE for express processing.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        }
      ]
    },

    'Other / Worldwide (Generic Consular)': {
      countryName: 'Worldwide Consular Standard',
      code: 'GENERIC',
      embassyNotice: 'Standard Consular Requirements compliant with worldwide embassy standards for tourist, visitor, and business visas.',
      categories: ['Tourist', 'Business', 'Family Visit', 'Transit'],
      sections: [
        {
          id: 'primary',
          title: 'Mandatory Travel Documents',
          icon: 'document',
          items: [
            {
              id: 'gen_passport',
              title: 'Original Valid Passport',
              detail: 'Valid for at least 6 months beyond travel dates with minimum 2 blank pages + photocopies of first and last page.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_photo',
              title: 'Passport Photographs (White Background)',
              detail: '2 to 3 recent passport-size photographs, matte finish, pure white background, 80% face coverage.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_form',
              title: 'Visa Application Form',
              detail: 'Duly completed and signed visa application form matching passport signature.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_cover_letter',
              title: 'Personal Cover Letter',
              detail: 'Signed personal cover letter stating complete travel dates, detailed itinerary, accommodation, and financial sponsorship.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_flight',
              title: 'Confirmed Roundtrip Flight Reservation',
              detail: 'Round-trip flight booking itinerary with verifiable PNR.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_hotel',
              title: 'Confirmed Hotel Bookings / Accommodation Vouchers',
              detail: 'Hotel confirmation vouchers covering the complete itinerary.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_insurance',
              title: 'Overseas Travel Medical Insurance',
              detail: 'Comprehensive medical travel insurance policy covering travel duration.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'financial',
          title: 'Financial & Income Proofs',
          icon: 'financial',
          items: [
            {
              id: 'gen_bank_stmt',
              title: 'Bank Account Statements (Last 6 Months)',
              detail: 'Original bank statement on bank stationery with bank branch seal and signature on every page.',
              badge: 'Required',
              mandatory: true
            },
            {
              id: 'gen_itr',
              title: 'Income Tax Return (ITR-V) Acknowledgements (Last 2-3 Years)',
              detail: 'Official ITR-V acknowledgement forms for last 2 to 3 Assessment Years.',
              badge: 'Required',
              mandatory: true
            }
          ]
        },
        {
          id: 'employment',
          title: 'Employment & Occupational Proofs',
          icon: 'employment',
          items: [
            {
              id: 'gen_emp_letter',
              title: 'Employer Leave Approval / NOC & Salary Slips',
              detail: 'NOC on company letterhead confirming employment, salary, and sanctioned leave + 3-6 months pay slips.',
              badge: 'Employed',
              employment: ['Salaried / Employed'],
              mandatory: true
            },
            {
              id: 'gen_biz_proof',
              title: 'Business Registration Proof & Company Bank Statement',
              detail: 'GST certificate / incorporation license + 6 months company bank statement.',
              badge: 'Self-Employed',
              employment: ['Business Owner / Self-Employed'],
              mandatory: true
            },
            {
              id: 'gen_student_proof',
              title: 'School / College Bonafide Letter & Student ID',
              detail: 'Bonafide letter and student ID copy + parent sponsorship affidavit.',
              badge: 'Student',
              employment: ['Student'],
              mandatory: true
            },
            {
              id: 'gen_pension_proof',
              title: 'Pension Payment Proof / Retirement Order',
              detail: 'Pension bank account statement and retirement certificate.',
              badge: 'Retired',
              employment: ['Retired'],
              mandatory: true
            },
            {
              id: 'gen_sponsor_proof',
              title: 'Sponsorship Letter & Financial Proofs of Sponsor',
              detail: 'For dependent spouses or minor children, sponsor declaration + sponsor bank statements & ITR.',
              badge: 'Dependent',
              employment: ['Homemaker / Dependent'],
              mandatory: true
            }
          ]
        },
        {
          id: 'supporting',
          title: 'Supporting & Supplemental Documents',
          icon: 'supporting',
          items: [
            {
              id: 'gen_marriage_cert',
              title: 'Marriage Certificate',
              detail: 'If travelling with spouse and spouse name not on passport.',
              badge: 'Conditional',
              mandatory: false
            },
            {
              id: 'gen_old_passports',
              title: 'Previous Passports & Travel History',
              detail: 'Showing prior international travels.',
              badge: 'Recommended',
              mandatory: false
            }
          ]
        }
      ]
    }
  };

  // Controller State
  const state = {
    selectedCountry: 'Europe (Schengen)',
    selectedCategory: 'Tourist',
    selectedEmployment: 'Salaried / Employed',
    customItems: {}, // keyed by country
    checkedItems: {}, // keyed by applicantId_country
    executiveNotes: {}
  };

  /**
   * Helper to get active storage key
   */
  function getStorageKey(country) {
    const applicantName = (global.AppStore && global.AppStore.applicant && global.AppStore.applicant.fullName) || 'default';
    return `khanna_checklist_${applicantName.replace(/\s+/g, '_')}_${country}`;
  }

  /**
   * Load checked state from localStorage
   */
  function loadCheckedState(country) {
    try {
      const key = getStorageKey(country);
      const saved = localStorage.getItem(key);
      if (saved) {
        state.checkedItems[country] = JSON.parse(saved);
      } else if (!state.checkedItems[country]) {
        state.checkedItems[country] = {};
      }
    } catch (e) {
      state.checkedItems[country] = state.checkedItems[country] || {};
    }
  }

  /**
   * Save checked state to localStorage
   */
  function saveCheckedState(country) {
    try {
      const key = getStorageKey(country);
      localStorage.setItem(key, JSON.stringify(state.checkedItems[country] || {}));
    } catch (e) {
      console.error('Error saving checklist state', e);
    }
  }

  /**
   * Filter checklist items based on active Employment and Category
   */
  function getFilteredItems(country, category, employment) {
    const rule = CHECKLIST_RULES[country] || CHECKLIST_RULES['Other / Worldwide (Generic Consular)'];
    const sections = [];

    (rule.sections || []).forEach(sec => {
      const filtered = sec.items.filter(item => {
        // Filter by Employment if item specifies employment
        if (item.employment && item.employment.length > 0) {
          if (!item.employment.includes(employment)) return false;
        }
        // Filter by Category if item specifies category
        if (item.category && item.category.length > 0) {
          if (!item.category.includes(category)) return false;
        }
        return true;
      });

      if (filtered.length > 0) {
        sections.push({
          id: sec.id,
          title: sec.title,
          icon: sec.icon,
          items: filtered
        });
      }
    });

    // Append custom items for this country if any
    const customs = state.customItems[country] || [];
    if (customs.length > 0) {
      sections.push({
        id: 'custom_section',
        title: 'Custom Agency Documents',
        icon: 'custom',
        items: customs
      });
    }

    return sections;
  }

  /**
   * Toggles a single checklist item
   */
  function toggleItem(itemId, country) {
    loadCheckedState(country);
    state.checkedItems[country][itemId] = !state.checkedItems[country][itemId];
    saveCheckedState(country);
    updateProgressUI(country);
    
    // Update row visual
    const row = document.getElementById(`chk_row_${itemId}`);
    const cb = document.getElementById(`chk_box_${itemId}`);
    const badge = document.getElementById(`chk_status_${itemId}`);
    const isChecked = !!state.checkedItems[country][itemId];

    if (row) row.classList.toggle('is-verified', isChecked);
    if (cb) cb.checked = isChecked;
    if (badge) {
      badge.className = isChecked ? 'badge-status-verified' : 'badge-status-pending';
      badge.textContent = isChecked ? '✓ Verified / Collected' : 'Pending';
    }
  }

  /**
   * Check all items for current view
   */
  function checkAllItems(country) {
    loadCheckedState(country);
    const sections = getFilteredItems(country, state.selectedCategory, state.selectedEmployment);
    sections.forEach(sec => {
      sec.items.forEach(item => {
        state.checkedItems[country][item.id] = true;
      });
    });
    saveCheckedState(country);
    renderWorkspace(country);
    if (typeof showToast === 'function') showToast('All checklist items marked as verified.', 'success');
  }

  /**
   * Clear all items for current view
   */
  function clearAllItems(country) {
    if (!confirm('Clear all verification checkmarks for this country checklist?')) return;
    state.checkedItems[country] = {};
    saveCheckedState(country);
    renderWorkspace(country);
    if (typeof showToast === 'function') showToast('Checklist checkmarks cleared.', 'info');
  }

  /**
   * Add a custom document to checklist
   */
  function addCustomItemPrompt(country) {
    const title = prompt('Enter Document Name (e.g. "Old Passport Lost FIR Copy", "CA Net Worth Valuation"):');
    if (!title || !title.trim()) return;
    const detail = prompt('Enter Document Description / Instructions (optional):', '') || '';

    state.customItems[country] = state.customItems[country] || [];
    const id = `custom_${Date.now()}`;
    state.customItems[country].push({
      id: id,
      title: title.trim(),
      detail: detail.trim(),
      badge: 'Custom',
      mandatory: false,
      isCustom: true
    });

    renderWorkspace(country);
    if (typeof showToast === 'function') showToast(`Added custom document: "${title.trim()}".`, 'success');
  }

  /**
   * Remove a custom document
   */
  function removeCustomItem(country, itemId) {
    if (!state.customItems[country]) return;
    state.customItems[country] = state.customItems[country].filter(i => i.id !== itemId);
    if (state.checkedItems[country]) delete state.checkedItems[country][itemId];
    saveCheckedState(country);
    renderWorkspace(country);
    if (typeof showToast === 'function') showToast('Custom document removed.', 'info');
  }

  /**
   * Updates the progress bar and verified counters
   */
  function updateProgressUI(country) {
    const sections = getFilteredItems(country, state.selectedCategory, state.selectedEmployment);
    let total = 0;
    let checked = 0;

    sections.forEach(sec => {
      sec.items.forEach(item => {
        total++;
        if (state.checkedItems[country] && state.checkedItems[country][item.id]) {
          checked++;
        }
      });
    });

    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    const countEl = document.getElementById('checklistVerifiedCount');
    const fillEl = document.getElementById('checklistProgressFill');
    const pctEl = document.getElementById('checklistProgressPercent');

    if (countEl) countEl.textContent = `${checked} of ${total} Verified`;
    if (fillEl) fillEl.style.width = `${percent}%`;
    if (pctEl) pctEl.textContent = `${percent}% Complete`;
  }

  /**
   * Print formatted checklist
   */
  function printChecklist(country) {
    window.print();
  }

  /**
   * Main Render function for the Standalone Checklist Workspace
   */
  function renderWorkspace(targetCountry) {
    const container = document.getElementById('standaloneChecklistContainer');
    if (!container) return;

    if (targetCountry && CHECKLIST_RULES[targetCountry]) {
      state.selectedCountry = targetCountry;
    }

    const country = state.selectedCountry;
    loadCheckedState(country);

    const rule = CHECKLIST_RULES[country] || CHECKLIST_RULES['Other / Worldwide (Generic Consular)'];
    const sections = getFilteredItems(country, state.selectedCategory, state.selectedEmployment);

    // Calculate initial metrics
    let total = 0;
    let checked = 0;
    sections.forEach(sec => {
      sec.items.forEach(item => {
        total++;
        if (state.checkedItems[country] && state.checkedItems[country][item.id]) {
          checked++;
        }
      });
    });
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;

    // Applicant info from AppStore if available
    const app = (global.AppStore && global.AppStore.applicant) || {};
    const travel = (global.AppStore && global.AppStore.travel) || {};
    const hasActiveApp = !!(app.fullName || app.passportNumber);

    const countryOptions = Object.keys(CHECKLIST_RULES).map(c => 
      `<option value="${c}" ${c === country ? 'selected' : ''}>${CHECKLIST_RULES[c].countryName}</option>`
    ).join('');

    const categoryOptions = rule.categories.map(cat => 
      `<option value="${cat}" ${cat === state.selectedCategory ? 'selected' : ''}>${cat} Visa</option>`
    ).join('');

    const employmentOptions = [
      'Salaried / Employed',
      'Business Owner / Self-Employed',
      'Student',
      'Retired',
      'Homemaker / Dependent'
    ].map(emp => 
      `<option value="${emp}" ${emp === state.selectedEmployment ? 'selected' : ''}>${emp}</option>`
    ).join('');

    container.innerHTML = `
      <!-- Top Action & Title Bar -->
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-4);">
        <div class="view-header__text">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--color-primary); display: flex; align-items: center;">${ICONS.clipboard}</span>
            <h1 style="margin: 0; font-size: 1.45rem; font-weight: 700; color: var(--color-text);">Consular Visa Requirements Checklist</h1>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 0.86rem; color: var(--color-text-muted);">
            Interactive country-specific document requirements, verification checkboxes, and official embassy guidelines.
          </p>
        </div>

        <div style="display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap;" class="no-print">
          <button class="btn btn-secondary btn-sm" type="button" onclick="KhannaChecklist.checkAllItems('${country}')">
            ✓ Check All
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="KhannaChecklist.clearAllItems('${country}')">
            ✕ Clear All
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="KhannaChecklist.addCustomItemPrompt('${country}')">
            + Custom Item
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="KhannaChecklist.copyWhatsAppMessage('${country}')" style="background:#25D366;color:#ffffff;border-color:#25D366;font-weight:600;" title="Generate formatted WhatsApp message for client">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Copy WhatsApp
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onclick="KhannaChecklist.downloadWord('${country}')" title="Download Word Checklist">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Word (.docx)
          </button>
          <button class="btn btn-primary btn-sm" type="button" onclick="KhannaChecklist.printChecklist('${country}')">
            <svg class="icon icon-xs" viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print / PDF
          </button>
        </div>
      </div>

      <!-- Use Existing Application Data Toolbar -->
      ${typeof WorkspaceSync !== 'undefined' ? WorkspaceSync.renderToolbar('checklist-letter') : ''}

      <!-- Active Applicant Banner (If Loaded) -->
      ${hasActiveApp ? `
        <div class="card" style="margin-bottom: var(--space-4); padding: 12px 18px; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="badge badge-success" style="font-weight: 700;">ACTIVE APPLICANT</span>
            <span style="font-size: 0.92rem; font-weight: 700; color: var(--color-text);">${escapeHTML(app.fullName || 'Applicant')}</span>
            <span style="font-size: 0.84rem; color: var(--color-text-muted);">Passport: <strong>${escapeHTML(app.passportNumber || 'N/A')}</strong></span>
            ${travel.destinationCountry ? `<span style="font-size: 0.84rem; color: var(--color-text-muted);">• Target: <strong>${escapeHTML(travel.destinationCountry)}</strong></span>` : ''}
          </div>
          <div class="no-print" style="font-size: 0.8rem; color: var(--color-text-faint);">
            Checklist status auto-saved for this client profile.
          </div>
        </div>
      ` : ''}

      <!-- Country, Visa Category & Employment Selectors Toolbar -->
      <div class="checklist-criteria-card no-print" style="margin-bottom: var(--space-4);">
        <div class="checklist-criteria-header">
          <span>🎯 Select Destination &amp; Applicant Criteria:</span>
        </div>

        <div class="checklist-criteria-grid">
          <div>
            <label style="font-size: 0.78rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="display:inline-flex;align-items:center;vertical-align:middle;margin-right:4px;">${ICONS.globe}</span> Destination Country / Region (Country Vised)
            </label>
            <select class="form-control" id="checklistCountrySelect" onchange="KhannaChecklist.setCountry(this.value)">
              ${countryOptions}
            </select>
          </div>

          <div>
            <label style="font-size: 0.78rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="display:inline-flex;align-items:center;vertical-align:middle;margin-right:4px;">${ICONS.tag}</span> Visa Category
            </label>
            <select class="form-control" id="checklistCategorySelect" onchange="KhannaChecklist.setCategory(this.value)">
              ${categoryOptions}
            </select>
          </div>

          <div>
            <label style="font-size: 0.78rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
              <span style="display:inline-flex;align-items:center;vertical-align:middle;margin-right:4px;">${ICONS.briefcase}</span> Applicant Employment Profile
            </label>
            <select class="form-control" id="checklistEmploymentSelect" onchange="KhannaChecklist.setEmployment(this.value)">
              ${employmentOptions}
            </select>
          </div>
        </div>
      </div>

      <!-- Embassy Guideline Alert Banner -->
      <div class="notice" style="margin-bottom: var(--space-4); display: flex; align-items: flex-start; gap: 12px; background: rgba(0, 59, 122, 0.05); border: 1px solid rgba(0, 59, 122, 0.2); padding: 12px 16px; border-radius: var(--radius-md);">
        <svg class="icon icon-sm" viewBox="0 0 24 24" style="color: #003B7A; flex-shrink: 0; margin-top: 2px;"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
        <div style="font-size: 0.84rem; color: var(--color-text); line-height: 1.5;">
          <strong>Consular Requirement Notice:</strong> ${escapeHTML(rule.embassyNotice)}
        </div>
      </div>

      <!-- Verification Progress Metrics Card -->
      <div class="checklist-metric-card no-print" style="margin-bottom: var(--space-5);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 34px; height: 34px; border-radius: 50%; background: #ecfdf5; color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; font-weight: 800; border: 1px solid #a7f3d0;">
              ✓
            </div>
            <div>
              <strong style="font-size: 1rem; color: var(--color-text); display: block;">Consular Document Verification Status</strong>
              <span style="font-size: 0.78rem; color: var(--color-text-faint);">Check off requirements as physical or digital copies are received &amp; verified</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge badge-success" id="checklistVerifiedCount" style="font-size: 0.82rem; padding: 4px 12px; font-weight: 700; border-radius: 999px;">${checked} of ${total} Verified</span>
            <span class="badge" id="checklistProgressPercent" style="background: var(--color-primary); color: #ffffff; font-size: 0.82rem; padding: 4px 12px; font-weight: 700; border-radius: 999px;">${percent}% Complete</span>
          </div>
        </div>
        <div class="checklist-progress-bar-wrap">
          <div class="checklist-progress-bar-fill" id="checklistProgressFill" style="width: ${percent}%;"></div>
        </div>
      </div>

      <!-- Official Letterhead Banner for Hardcopy / Screen -->
      <div style="margin-bottom: 18px; text-align: center;">
        <img src="assets/logo/khanna_letterhead_banner.jpg" style="width: 100%; max-height: 80px; object-fit: contain;" alt="Khanna Holidays Letterhead Banner" />
      </div>

      <!-- Printable Header for Hardcopy / PDF export -->
      <div class="print-only" style="display: none; border-bottom: 2px solid #003B7A; padding-bottom: 12px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 1.3rem; font-weight: 800; color: #003B7A;">KHANNA TRAVELS &amp; HOLIDAYS</div>
            <div style="font-size: 0.8rem; color: #64748b;">Visa Assistance &amp; Consular Documentation Department • Official Submission Checklist</div>
          </div>
          <div style="text-align: right; font-size: 0.78rem; color: #475569;">
            <div><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
            <div><strong>Status:</strong> ${checked === total ? 'ALL DOCUMENTS VERIFIED' : `${checked}/${total} VERIFIED`}</div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 14px; font-size: 0.82rem; background: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
          <div><strong>Applicant:</strong> ${escapeHTML(app.fullName || 'Standard Client')}</div>
          <div><strong>Passport No:</strong> ${escapeHTML(app.passportNumber || 'N/A')}</div>
          <div><strong>Destination:</strong> ${escapeHTML(rule.countryName)} (${state.selectedCategory})</div>
        </div>
      </div>

      <!-- Dynamic Sections & Document Cards -->
      <div class="checklist-items-stack" style="gap: var(--space-5);">
        ${sections.map(section => `
          <div class="checklist-section-card">
            <div class="checklist-section-header">
              <span style="display: flex; align-items: center; color: var(--color-primary);">${getSectionIcon(section.icon)}</span>
              <h3 class="checklist-section-title">${section.title}</h3>
              <span class="checklist-section-badge">${section.items.length} requirements</span>
            </div>

            <div class="checklist-items-stack">
              ${section.items.map(item => {
                const isChecked = !!(state.checkedItems[country] && state.checkedItems[country][item.id]);
                return `
                  <div class="doc-checklist-row ${isChecked ? 'is-verified' : ''}" id="chk_row_${item.id}" onclick="if(event.target.tagName !== 'INPUT' && event.target.tagName !== 'BUTTON') KhannaChecklist.toggleItem('${item.id}', '${country}')">
                    <div style="padding-top: 1px;">
                      <input type="checkbox" class="doc-checklist-checkbox" id="chk_box_${item.id}" ${isChecked ? 'checked' : ''} onchange="KhannaChecklist.toggleItem('${item.id}', '${country}')" />
                    </div>

                    <div class="doc-checklist-content">
                      <div class="doc-checklist-headline">
                        <span class="doc-checklist-title">${escapeHTML(item.title)}</span>
                        <span class="${item.mandatory ? 'badge-mandatory' : 'badge-supporting-req'}">
                          ${escapeHTML(item.badge || (item.mandatory ? 'Mandatory' : 'Supporting'))}
                        </span>
                        <span class="${isChecked ? 'badge-status-verified' : 'badge-status-pending'}" id="chk_status_${item.id}">
                          ${isChecked ? '✓ Verified / Collected' : 'Pending'}
                        </span>
                      </div>
                      <p class="doc-checklist-detail">
                        ${escapeHTML(item.detail)}
                      </p>
                    </div>

                    ${item.isCustom ? `
                      <button type="button" class="btn-icon no-print" onclick="event.stopPropagation(); KhannaChecklist.removeCustomItem('${country}', '${item.id}')" title="Remove custom document" style="color: var(--color-danger); padding: 4px;">
                        ✕
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Sign-off & Verification Footer -->
      <div style="margin-top: 30px; page-break-inside: avoid; border-top: 1px solid #cbd5e1; padding-top: 18px; font-size: 0.82rem;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 20px;">
          <div>
            <div style="font-weight: 700; color: #003B7A; margin-bottom: 4px;">Verified By (Visa Executive):</div>
            <div style="height: 36px; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px;"></div>
            <div style="color: #64748b; font-size: 0.78rem;">Signature &amp; Stamp • Khanna Travels &amp; Holidays</div>
          </div>
          <div>
            <div style="font-weight: 700; color: #003B7A; margin-bottom: 4px;">Applicant Acknowledgement:</div>
            <div style="height: 36px; border-bottom: 1px dashed #94a3b8; margin-bottom: 6px;"></div>
            <div style="color: #64748b; font-size: 0.78rem;">Applicant Signature • Date: _______________</div>
          </div>
        </div>

        <!-- Official Two-Box Footer (Blue Head Office & Red Front Office matching USA Visa Guide) -->
        <div class="khanna-official-footer">
          <div class="khanna-footer-grid">
            <div class="khanna-footer-box khanna-footer-box--head">
              <div class="khanna-footer-title">Head Office:</div>
              Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Road, Sanpada East, Navi Mumbai, Maharashtra 400705<br/>
              <strong>KHANNA HOLIDAYS PVT. LTD.</strong> • Tel: +91 22 4155 5555 • Sales@khannatravels.com
            </div>
            <div class="khanna-footer-box khanna-footer-box--front">
              <div class="khanna-footer-title">Front Office:</div>
              Shop No. 19, Seawoods Garden, Opp Moraj Residency, Palm Beach Rd, Sector 17, Sanpada East, Navi Mumbai, Maharashtra 400705<br/>
              Email: customercare@khannatravels.com • www.khannaholidays.com
            </div>
          </div>
        </div>
      </div>
    `;
  }


  /**
   * Generates clean formatted WhatsApp message and copies to clipboard.
   */
  function copyWhatsAppMessage(country) {
    const rule = CHECKLIST_RULES[country] || CHECKLIST_RULES['Worldwide / Other'];
    const app = (typeof AppStore !== 'undefined') ? AppStore.applicant : {};
    const clientName = app.fullName || 'Valued Client';
    const passNo = app.passportNumber || 'N/A';
    const category = state.selectedCategory || 'Tourist';

    let msg = `*KHANNA TRAVELS & HOLIDAYS*\n`;
    msg += `*Official Visa Document Checklist: ${rule.countryName}*\n`;
    msg += `*Category:* ${category} Visa | *Applicant:* ${clientName} | *Passport:* ${passNo}\n`;
    msg += `────────────────────────────\n\n`;
    msg += `Dear *${clientName}*,\n\n`;
    msg += `Kindly prepare and submit the following required documents for your *${rule.countryName}* visa application:\n\n`;

    const sections = getFilteredSections(country);
    sections.forEach((sec, idx) => {
      msg += `*${idx + 1}. ${sec.title.toUpperCase()}*\n`;
      sec.items.forEach(item => {
        const isMandatory = item.mandatory ? ' [REQUIRED]' : '';
        msg += `• *${item.title}*${isMandatory}\n  ${item.detail}\n`;
      });
      msg += `\n`;
    });

    msg += `────────────────────────────\n`;
    msg += `*KHANNA TRAVELS & HOLIDAYS PVT. LTD.*\n`;
    msg += `*Head Office:* Office no 705, Bhumiraj Costarica, Palm Beach Rd, Sanpada East, Navi Mumbai - 400705\n`;
    msg += `*Front Office:* Shop No. 19, Seawoods Garden, Sector 17, Sanpada East, Navi Mumbai\n`;
    msg += `*Helpline:* +91 22 4155 5555 | +91 8657461001\n`;
    msg += `*Email:* customercare@khannatravels.com\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(() => {
        showToast('WhatsApp client checklist message copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy WhatsApp message below:', msg);
      });
    } else {
      prompt('Copy WhatsApp message below:', msg);
    }
  }

  /**
   * Downloads checklist as printable Word document.
   */
  function downloadWord(country) {
    const rule = CHECKLIST_RULES[country] || CHECKLIST_RULES['Worldwide / Other'];
    const sections = getFilteredSections(country);
    const app = (typeof AppStore !== 'undefined') ? AppStore.applicant : {};
    
    let htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><title>Visa Checklist - ${escapeHTML(rule.countryName)}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #1e293b; line-height: 1.5; }
        h1 { color: #003B7A; font-size: 16pt; margin-bottom: 4px; }
        h2 { color: #003B7A; font-size: 12pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 18px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 9.5pt; }
        th { background: #f8fafc; text-align: left; }
      </style>
      </head>
      <body>
        <h1>KHANNA TRAVELS &amp; HOLIDAYS</h1>
        <p><strong>Official Visa Checklist: ${escapeHTML(rule.countryName)} (${escapeHTML(state.selectedCategory)} Visa)</strong><br/>
        Applicant: <strong>${escapeHTML(app.fullName || 'Client')}</strong> | Passport: <strong>${escapeHTML(app.passportNumber || 'N/A')}</strong> | Date: ${new Date().toLocaleDateString('en-GB')}</p>
        <hr/>
    `;

    sections.forEach(sec => {
      htmlContent += `<h2>${escapeHTML(sec.title)}</h2><table><thead><tr><th style="width:30px;">#</th><th>Document Name</th><th>Requirement Details</th></tr></thead><tbody>`;
      sec.items.forEach((item, i) => {
        htmlContent += `<tr><td>${i+1}</td><td><strong>${escapeHTML(item.title)}</strong></td><td>${escapeHTML(item.detail)}</td></tr>`;
      });
      htmlContent += `</tbody></table>`;
    });

    htmlContent += `
      <br/><br/>
      <table style="border:none;">
        <tr style="border:none;">
          <td style="border:none; width:50%;"><strong>Verified By:</strong><br/><br/>______________________<br/>Khanna Travels &amp; Holidays</td>
          <td style="border:none; width:50%;"><strong>Applicant Signature:</strong><br/><br/>______________________<br/>Date: _________________</td>
        </tr>
      </table>
      </body></html>
    `;

    const blob = new Blob(['﻿', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rule.countryName}_Visa_Checklist.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Word checklist downloaded successfully.', 'success');
  }

  function downloadPdf(country) {
    printChecklist(country);
  }

  // Setters
  function setCountry(c) {
    state.selectedCountry = c;
    renderWorkspace(c);
  }

  function setCategory(cat) {
    state.selectedCategory = cat;
    renderWorkspace(state.selectedCountry);
  }

  function setEmployment(emp) {
    state.selectedEmployment = emp;
    renderWorkspace(state.selectedCountry);
  }

  // Export to Global
  global.KhannaChecklist = {
    RULES: CHECKLIST_RULES,
    renderWorkspace: renderWorkspace,
    toggleItem: toggleItem,
    checkAllItems: checkAllItems,
    clearAllItems: clearAllItems,
    addCustomItemPrompt: addCustomItemPrompt,
    removeCustomItem: removeCustomItem,
    printChecklist: printChecklist,
    copyWhatsAppMessage: copyWhatsAppMessage,
    downloadWord: downloadWord,
    downloadPdf: downloadPdf,
    setCountry: setCountry,
    setCategory: setCategory,
    setEmployment: setEmployment
  };

  // Wire sync helper for workspaces.js
  global.syncStandaloneChecklistWorkspace = function() {
    renderWorkspace();
  };

})(window);

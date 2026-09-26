/**
 * Vercel Serverless Function: POST /api/export/docx
 * High-Fidelity Word (.docx) Generation Engine for Vercel Live Deployment.
 * Implemented in pure JavaScript via 'docx' (zero external C++ dependencies, 100% cloud native).
 */

const fs = require('fs');
const path = require('path');
const docx = require('docx');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  ShadingType,
  VerticalAlign
} = docx;

// Locate letterhead banner asset
function getLetterheadBannerBuffer() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'assets/logo/khanna_letterhead_banner.jpg'),
    path.resolve(__dirname, '../../assets/logo/khanna_letterhead_banner.jpg'),
    path.resolve(__dirname, '../assets/logo/khanna_letterhead_banner.jpg')
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p);
    }
  }
  return null;
}

/**
 * Creates official two-box letterhead footer table
 */
function createTwoBoxFooterTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          // Head Office Box (Blue)
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'F0F7FF', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: '003B7A' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: '003B7A' },
              left: { style: BorderStyle.SINGLE, size: 24, color: '003B7A' },
              right: { style: BorderStyle.SINGLE, size: 8, color: '003B7A' }
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Head Office:', bold: true, color: '003B7A', size: 16, font: 'Arial' })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Office no 705, Bhumiraj Costarica, Sector 18, Palm Beach Rd, Sanpada East, Navi Mumbai - 400705',
                    size: 14,
                    color: '475569',
                    font: 'Arial'
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'KHANNA HOLIDAYS PVT. LTD.', bold: true, size: 14, color: '0F172A', font: 'Arial' }),
                  new TextRun({ text: ' • Tel: +91 22 4155 5555', size: 14, color: '475569', font: 'Arial' })
                ]
              })
            ]
          }),
          // Front Office Box (Red)
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { fill: 'FEF2F2', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 140, right: 140 },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 8, color: 'E03131' },
              bottom: { style: BorderStyle.SINGLE, size: 8, color: 'E03131' },
              left: { style: BorderStyle.SINGLE, size: 24, color: 'E03131' },
              right: { style: BorderStyle.SINGLE, size: 8, color: 'E03131' }
            },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'Front Office:', bold: true, color: 'E03131', size: 16, font: 'Arial' })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Shop No. 19, Seawoods Garden, Opp Moraj Residency, Palm Beach Rd, Sector 17, Sanpada East, Navi Mumbai - 400705',
                    size: 14,
                    color: '475569',
                    font: 'Arial'
                  })
                ]
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: 'Email: customercare@khannatravels.com', size: 14, color: '475569', font: 'Arial' })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Creates Cover Letter Document
 */
function buildCoverLetterDoc(data) {
  const applicant = data.applicant || {};
  const travel = data.travel || {};
  const templateType = data.template || 'europe';
  const isJapan = templateType.toLowerCase().includes('japan');
  const defaultFont = isJapan ? 'Calibri' : 'Arial';
  const fontSize = isJapan ? 28 : 26; // 14pt for Japan, 13pt for Europe/SG

  const children = [];

  // Date
  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-GB')}`, font: defaultFont, size: fontSize })
      ]
    })
  );

  // Embassy / Consulate Address Block
  let consulateName = 'The Visa Officer,';
  let embassyName = 'Embassy / Consulate General';
  let city = 'Mumbai / New Delhi, India';

  if (templateType.includes('japan')) {
    consulateName = 'To,\nThe Visa Officer,';
    embassyName = 'Consulate General of Japan';
  } else if (templateType.includes('singapore')) {
    consulateName = 'To,\nThe Visa Officer,';
    embassyName = 'Consulate-General of the Republic of Singapore';
  } else if (templateType.includes('uk')) {
    consulateName = 'To,\nUK Visas and Immigration (UKVI),';
    embassyName = 'British High Commission';
  } else if (templateType.includes('usa')) {
    consulateName = 'To,\nThe Consular Officer,';
    embassyName = 'Embassy of the United States of America';
  } else if (templateType.includes('canada')) {
    consulateName = 'To,\nImmigration, Refugees and Citizenship Canada (IRCC),';
    embassyName = 'High Commission of Canada';
  } else if (templateType.includes('australia')) {
    consulateName = 'To,\nDepartment of Home Affairs,';
    embassyName = 'Australian High Commission';
  } else if (templateType.includes('uae')) {
    consulateName = 'To,\nGeneral Directorate of Residency and Foreigners Affairs (GDRFA),';
    embassyName = 'Dubai, United Arab Emirates';
  } else if (templateType.includes('turkey')) {
    consulateName = 'To,\nThe Visa Section,';
    embassyName = 'Embassy of the Republic of Turkey';
  } else if (templateType.includes('newzealand')) {
    consulateName = 'To,\nImmigration New Zealand,';
    embassyName = 'New Zealand High Commission';
  }

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: consulateName, bold: true, font: defaultFont, size: fontSize }),
        new TextRun({ text: `\n${embassyName}\n${city}`, font: defaultFont, size: fontSize })
      ]
    })
  );

  // Subject
  const destCountry = travel.destinationCountry || (templateType.toUpperCase());
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Subject: ', bold: true, font: defaultFont, size: fontSize }),
        new TextRun({
          text: `Application for Tourist Visa to visit ${destCountry} - ${applicant.fullName || 'Applicant'} (Passport No: ${applicant.passportNumber || ''})`,
          bold: true,
          font: defaultFont,
          size: fontSize
        })
      ]
    })
  );

  // Salutation
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'Respected Sir/Madam,', font: defaultFont, size: fontSize })
      ]
    })
  );

  // Intro Paragraph
  const startDate = travel.travelStartDate || travel.departureDate || 'Upcoming Date';
  const endDate = travel.travelEndDate || travel.returnDate || 'Upcoming Date';
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `I, ${applicant.fullName || 'the Applicant'}, an Indian national holding Passport No. ${applicant.passportNumber || ''}, respectfully submit this application for a Tourist Visa to travel to ${destCountry} from ${startDate} to ${endDate}.`,
          font: defaultFont,
          size: fontSize
        })
      ]
    })
  );

  // Purpose of Travel
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `The primary purpose of my journey is leisure tourism and experiencing the cultural landmarks, natural beauty, and hospitality of ${destCountry}. I have planned an exciting itinerary and will be staying at pre-booked accommodations throughout my trip.`,
          font: defaultFont,
          size: fontSize
        })
      ]
    })
  );

  // Financial Support & Employment
  const occ = applicant.occupation || 'Professional';
  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `I am currently employed / engaged as ${occ}. All expenses pertaining to international flights, local transportation, hotel accommodations, meals, and travel medical insurance will be borne entirely by myself from my personal savings and funds.`,
          font: defaultFont,
          size: fontSize
        })
      ]
    })
  );

  // Guarantee to return
  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `I hold deep social, family, and professional ties in India, and I solemnly affirm that I will strictly abide by all visa conditions, immigration laws, and depart prior to the expiry of my authorized stay.`,
          font: defaultFont,
          size: fontSize
        })
      ]
    })
  );

  // Closing Signoff
  children.push(
    new Paragraph({
      spacing: { after: 360 },
      children: [
        new TextRun({ text: 'Thanking you,', font: defaultFont, size: fontSize }),
        new TextRun({ text: '\nYours sincerely,', font: defaultFont, size: fontSize }),
        new TextRun({ text: `\n\n\n${applicant.fullName || 'Applicant Name'}`, bold: true, font: defaultFont, size: fontSize }),
        new TextRun({ text: `\nPassport No: ${applicant.passportNumber || ''}`, font: defaultFont, size: fontSize }),
        new TextRun({ text: `\nContact: ${applicant.mobileNumber || applicant.phone || '+91 98200 00000'}`, font: defaultFont, size: fontSize }),
        new TextRun({ text: `\nAddress: ${applicant.residentialAddress || applicant.city || 'Navi Mumbai, India'}`, font: defaultFont, size: fontSize })
      ]
    })
  );

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
          }
        },
        children
      }
    ]
  });
}

/**
 * Creates Hotel Blocking Document (with Banner, Cyan Highlights, 3-column table, 2-box footer)
 */
function buildHotelBlockingDoc(data) {
  const hotels = data.hotels || [];
  const primaryHotel = hotels[0] || {};
  const applicant = data.applicant || {};
  const bannerBuf = getLetterheadBannerBuffer();

  const children = [];

  // Header Banner
  if (bannerBuf) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bannerBuf,
            transformation: { width: 560, height: 75 }
          })
        ]
      })
    );
  }

  // Document Title
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'HOTEL BOOKING CONFIRMATION', bold: true, size: 32, font: 'Aptos', color: '003B7A' })
      ]
    })
  );

  // 6 Highlighted Core Fields Table (Cyan themed)
  const confNo = primaryHotel.confirmationNumber || data.confirmationNumber || 'KH-VOUCHER';
  const hName = primaryHotel.hotelName || data.hotelName || 'Selected Hotel';
  const lead = primaryHotel.leadGuest || applicant.fullName || data.leadGuest || 'Primary Guest';
  const checkIn = primaryHotel.checkIn || data.checkIn || 'TBD';
  const checkOut = primaryHotel.checkOut || data.checkOut || 'TBD';
  const duration = primaryHotel.duration || data.duration || 'Nights Confirmed';

  const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: '06B6D4' };
  const cellShading = { fill: 'E0F7FA', type: ShadingType.CLEAR };

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: cellBorder,
        bottom: cellBorder,
        left: cellBorder,
        right: cellBorder,
        insideHorizontal: cellBorder,
        insideVertical: cellBorder
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Confirmation No:', bold: true, size: 24, font: 'Aptos' })] })]
            }),
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: confNo, bold: true, color: '083344', size: 24, font: 'Aptos' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Hotel Name:', bold: true, size: 24, font: 'Aptos' })] })]
            }),
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: hName, bold: true, size: 24, font: 'Aptos' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Lead Guest:', bold: true, size: 24, font: 'Aptos' })] })]
            }),
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: lead, bold: true, size: 24, font: 'Aptos' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Check-In Date:', bold: true, size: 24, font: 'Aptos' })] })]
            }),
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: `${checkIn} (Check-out: ${checkOut})`, bold: true, size: 24, font: 'Aptos' })] })]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: 'Duration of Stay:', bold: true, size: 24, font: 'Aptos' })] })]
            }),
            new TableCell({
              shading: cellShading,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [new Paragraph({ children: [new TextRun({ text: duration, bold: true, size: 24, font: 'Aptos' })] })]
            })
          ]
        })
      ]
    })
  );

  // Subheading: Guest Allocation Table (Strictly 3 Columns)
  children.push(
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: 'Guest Room Allocation Details:', bold: true, size: 26, font: 'Aptos', color: '003B7A' })
      ]
    })
  );

  const guestList = primaryHotel.guests && primaryHotel.guests.length > 0
    ? primaryHotel.guests
    : [{ guestName: lead, roomType: 'Standard Room', noOfGuests: '1 Adult(s)' }];

  const tableHeaderBorder = { style: BorderStyle.SINGLE, size: 8, color: '003B7A' };
  const tableRowBorder = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };

  const guestRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          shading: { fill: '003B7A', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Guest Name', bold: true, color: 'FFFFFF', size: 24, font: 'Aptos' })] })]
        }),
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { fill: '003B7A', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: 'Room Type', bold: true, color: 'FFFFFF', size: 24, font: 'Aptos' })] })]
        }),
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          shading: { fill: '003B7A', type: ShadingType.CLEAR },
          margins: { top: 100, bottom: 100, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: 'No. of Guests', bold: true, color: 'FFFFFF', size: 24, font: 'Aptos' })] })]
        })
      ]
    })
  ];

  guestList.forEach((g, idx) => {
    const isAlt = idx % 2 === 1;
    guestRows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: isAlt ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: g.guestName || lead, size: 22, font: 'Aptos' })] })]
          }),
          new TableCell({
            width: { size: 35, type: WidthType.PERCENTAGE },
            shading: isAlt ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: g.roomType || 'Standard Room', size: 22, font: 'Aptos' })] })]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: isAlt ? { fill: 'F8FAFC', type: ShadingType.CLEAR } : undefined,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [new Paragraph({ children: [new TextRun({ text: g.noOfGuests || g.numGuests || '1 Adult(s)', size: 22, font: 'Aptos' })] })]
          })
        ]
      })
    );
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: tableRowBorder,
        bottom: tableRowBorder,
        left: tableRowBorder,
        right: tableRowBorder,
        insideHorizontal: tableRowBorder,
        insideVertical: tableRowBorder
      },
      rows: guestRows
    })
  );

  // Status & Notes
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 120 },
      children: [
        new TextRun({ text: 'Status: ', bold: true, size: 22, font: 'Aptos' }),
        new TextRun({ text: 'Guaranteed & Confirmed for Consular Visa Processing.', color: '059669', bold: true, size: 22, font: 'Aptos' })
      ]
    })
  );

  // Two-Box Official Footer
  children.push(
    new Paragraph({ spacing: { before: 240, after: 120 }, children: [] })
  );
  children.push(createTwoBoxFooterTable());

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
          }
        },
        children
      }
    ]
  });
}

/**
 * Creates Passport Authorization Letter (Single or Couple)
 */
function buildPassportAuthDoc(data, isCouple = false) {
  const applicant = data.applicant || {};
  const bannerBuf = getLetterheadBannerBuffer();
  const children = [];

  if (bannerBuf) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bannerBuf,
            transformation: { width: 560, height: 75 }
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-GB')}`, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'To,\nThe Visa Officer / Consular Section,\nEmbassy / Consulate General', bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: 'Subject: ', bold: true, font: 'Arial', size: 24 }),
        new TextRun({ text: `Letter of Authorization for Passport Submission and Collection`, bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: 'Dear Sir/Madam,', font: 'Arial', size: 24 })
      ]
    })
  );

  const authText = isCouple
    ? `We, ${applicant.fullName || 'the Applicants'}, holding Passport Numbers as mentioned below, hereby authorize Mr. Praduman Tripathi, representative of KHANNA HOLIDAYS PVT. LTD., to submit our visa applications and collect our passports on our behalf.`
    : `I, ${applicant.fullName || 'the Applicant'}, holding Passport Number ${applicant.passportNumber || ''}, hereby authorize Mr. Praduman Tripathi, representative of KHANNA HOLIDAYS PVT. LTD., to submit my visa application and collect my passport on my behalf.`;

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: authText, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'His signature is attested below for your reference.', font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Specimen Signature of Authorized Representative:\n\n\n___________________________________\nMr. Praduman Tripathi\nKHANNA HOLIDAYS PVT. LTD.', font: 'Arial', size: 22 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `Yours sincerely,\n\n\n___________________________________\n${applicant.fullName || 'Applicant Name'}\nPassport No: ${applicant.passportNumber || ''}`, bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  children.push(createTwoBoxFooterTable());

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children
      }
    ]
  });
}

/**
 * Creates Company Authorization Letter
 */
function buildCompanyAuthDoc(data) {
  const applicant = data.applicant || {};
  const bannerBuf = getLetterheadBannerBuffer();
  const children = [];

  if (bannerBuf) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bannerBuf,
            transformation: { width: 560, height: 75 }
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-GB')}`, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'To Whom It May Concern,', bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `This is to certify that KHANNA HOLIDAYS PVT. LTD. has been officially appointed to manage visa processing and documentation for our client, ${applicant.fullName || 'the Applicant'} (Passport No: ${applicant.passportNumber || ''}).`,
          font: 'Arial',
          size: 24
        })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `We hereby authorize our visa representative to submit required documents, schedule appointments, and coordinate with the consular division as necessary.`,
          font: 'Arial',
          size: 24
        })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: 'Authorized Signatory:\n\n\n___________________________________\nMs. Dhvani Chheda\nTeam Lead – Visa\nKHANNA HOLIDAYS PVT. LTD.', bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  children.push(createTwoBoxFooterTable());

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children
      }
    ]
  });
}

/**
 * Creates Invitation Letter Document
 */
function buildInvitationDoc(data) {
  const inviter = data.inviter || {};
  const applicant = data.applicant || {};
  const travel = data.travel || {};
  const bannerBuf = getLetterheadBannerBuffer();
  const children = [];

  if (bannerBuf) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bannerBuf,
            transformation: { width: 560, height: 75 }
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleDateString('en-GB')}`, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'To,\nThe Visa Officer,\nEmbassy / Consulate General', bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({ text: 'Subject: ', bold: true, font: 'Arial', size: 24 }),
        new TextRun({ text: `Letter of Invitation for ${applicant.fullName || 'Guest'} (Passport No: ${applicant.passportNumber || ''})`, bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 180 },
      children: [
        new TextRun({
          text: `I, ${inviter.fullName || inviter.name || 'Host Name'}, residing at ${inviter.address || 'Host Residential Address'}, cordially invite ${applicant.fullName || 'the Applicant'} to visit me from ${travel.travelStartDate || 'Upcoming Date'} to ${travel.travelEndDate || 'Upcoming Date'}.`,
          font: 'Arial',
          size: 24
        })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: `During their stay, I will provide accommodation and ensure all consular guidelines are respected. They will return to India prior to the expiry of their authorized visa duration.`,
          font: 'Arial',
          size: 24
        })
      ]
    })
  );

  // Signature image if provided
  if (data.signatureImage && data.signatureImage.startsWith('data:image')) {
    try {
      const sigData = Buffer.from(data.signatureImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new ImageRun({
              data: sigData,
              transformation: { width: 150, height: 50 }
            })
          ]
        })
      );
    } catch (e) {
      console.warn('Could not embed signature image:', e);
    }
  }

  children.push(
    new Paragraph({
      spacing: { after: 240 },
      children: [
        new TextRun({ text: `\nSincerely,\n${inviter.fullName || inviter.name || 'Host Signature'}\nContact: ${inviter.phone || ''}`, bold: true, font: 'Arial', size: 24 })
      ]
    })
  );

  children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  children.push(createTwoBoxFooterTable());

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children
      }
    ]
  });
}

/**
 * Creates Checklist Document
 */
function buildChecklistDoc(data) {
  const applicant = data.applicant || {};
  const travel = data.travel || {};
  const bannerBuf = getLetterheadBannerBuffer();
  const children = [];

  if (bannerBuf) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new ImageRun({
            data: bannerBuf,
            transformation: { width: 560, height: 75 }
          })
        ]
      })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `VISA DOCUMENT CHECKLIST - ${travel.destinationCountry || 'TRAVEL'}`, bold: true, size: 28, font: 'Arial', color: '003B7A' })
      ]
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 160 },
      children: [
        new TextRun({ text: `Applicant: ${applicant.fullName || 'Applicant'} | Passport: ${applicant.passportNumber || ''}`, bold: true, size: 22, font: 'Arial' })
      ]
    })
  );

  const checklistItems = [
    'Original Passport valid for at least 6 months with 2 blank pages',
    'Old Passports (if any)',
    '2 Recent Passport-size Photographs (35mm x 45mm, white background, 80% face coverage)',
    'Duly Completed and Signed Visa Application Form',
    'Personal Cover Letter stating travel dates, itinerary, and expenses',
    'Roundtrip Flight Itinerary / Confirmed Flight Reservation',
    'Confirmed Hotel Blocking / Accommodation Proof for all nights',
    'Original Bank Statements for the last 6 months stamped and signed by the bank',
    'Income Tax Returns (ITR-V) or Form 16 for the last 3 years',
    'Employment Proof: Leave Approval Letter / NOC and recent 3 months payslips',
    'Travel Medical Insurance with minimum coverage of €30,000 / $50,000'
  ];

  checklistItems.forEach(item => {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: [
          new TextRun({ text: item, size: 22, font: 'Arial' })
        ]
      })
    );
  });

  children.push(new Paragraph({ spacing: { before: 240 }, children: [] }));
  children.push(createTwoBoxFooterTable());

  return new Document({
    sections: [
      {
        properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
        children
      }
    ]
  });
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const data = JSON.parse(body || '{}');
      const docType = data.docType || 'cover_letter';

      let doc;
      let filename = 'document.docx';

      switch (docType) {
        case 'cover_letter':
          doc = buildCoverLetterDoc(data);
          filename = `${data.applicant?.fullName || 'Applicant'}_Cover_Letter.docx`;
          break;
        case 'hotel_blocking':
          doc = buildHotelBlockingDoc(data);
          filename = `${data.applicant?.fullName || 'Guest'}_Hotel_Confirmation.docx`;
          break;
        case 'passport_auth_single':
          doc = buildPassportAuthDoc(data, false);
          filename = `${data.applicant?.fullName || 'Applicant'}_Passport_Auth_Single.docx`;
          break;
        case 'passport_auth_couple':
          doc = buildPassportAuthDoc(data, true);
          filename = `${data.applicant?.fullName || 'Applicant'}_Passport_Auth_Couple.docx`;
          break;
        case 'company_authorization':
          doc = buildCompanyAuthDoc(data);
          filename = `${data.applicant?.fullName || 'Applicant'}_Company_Authorization.docx`;
          break;
        case 'invitation_letter':
          doc = buildInvitationDoc(data);
          filename = `${data.applicant?.fullName || 'Applicant'}_Invitation_Letter.docx`;
          break;
        case 'checklist':
          doc = buildChecklistDoc(data);
          filename = `${data.travel?.destinationCountry || 'Visa'}_Checklist.docx`;
          break;
        default:
          doc = buildCoverLetterDoc(data);
          filename = 'Document.docx';
      }

      const buffer = await Packer.toBuffer(doc);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (err) {
      console.error('Word Docx Export Error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Docx Generation Failed: ${err.message}` }));
    }
  });
};

/**
 * Vercel Serverless Function: POST /api/ocr/passport
 * High-Accuracy AI Passport OCR & Preprocessing Engine for Vercel Live Deployment.
 * Powered by Google Gemini Flash Vision API (zero heavy C++ binaries, runs within Vercel limits).
 */

const https = require('https');

/**
 * Parses multipart/form-data or raw buffer from incoming request
 */
function parseRequestPayload(req) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const fullBuffer = Buffer.concat(chunks);

      if (contentType.includes('application/json')) {
        try {
          const json = JSON.parse(fullBuffer.toString('utf8'));
          return resolve({
            buffer: json.image ? Buffer.from(json.image.replace(/^data:.*?;base64,/, ''), 'base64') : null,
            filename: json.filename || 'passport.jpg',
            mimeType: json.mimeType || 'image/jpeg',
            base64: json.image || null
          });
        } catch (e) {
          return reject(new Error('Invalid JSON payload: ' + e.message));
        }
      }

      // Multipart form data
      const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!match) {
        // Treat as raw binary if no boundary
        return resolve({
          buffer: fullBuffer,
          filename: 'upload.jpg',
          mimeType: 'image/jpeg',
          base64: fullBuffer.toString('base64')
        });
      }

      const boundary = match[1] || match[2];
      const boundaryBuffer = Buffer.from('--' + boundary);

      let start = fullBuffer.indexOf(boundaryBuffer);
      if (start === -1) return reject(new Error('Boundary not found in payload'));

      start += boundaryBuffer.length;
      if (fullBuffer[start] === 13 && fullBuffer[start + 1] === 10) start += 2;

      const nextBoundary = fullBuffer.indexOf(boundaryBuffer, start);
      if (nextBoundary === -1) return reject(new Error('Closing boundary not found'));

      const headerDelim = Buffer.from('\r\n\r\n');
      const headerEnd = fullBuffer.indexOf(headerDelim, start);
      if (headerEnd === -1) return reject(new Error('Invalid multipart part header'));

      const headerText = fullBuffer.subarray(start, headerEnd).toString('utf8');
      const fileContent = fullBuffer.subarray(headerEnd + 4, nextBoundary - 2);

      const filenameMatch = headerText.match(/filename="([^"]+)"/i);
      const filename = filenameMatch ? filenameMatch[1] : `passport_${Date.now()}.jpg`;

      const typeMatch = headerText.match(/content-type:\s*([^\r\n;]+)/i);
      let mimeType = typeMatch ? typeMatch[1].trim().toLowerCase() : 'image/jpeg';
      if (filename.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (filename.endsWith('.png')) mimeType = 'image/png';
      else if (filename.endsWith('.webp')) mimeType = 'image/webp';

      resolve({
        buffer: fileContent,
        filename,
        mimeType,
        base64: fileContent.toString('base64')
      });
    });

    req.on('error', err => reject(err));
  });
}

/**
 * Calls Gemini Vision API via native HTTPS
 */
function callGeminiVision(apiKey, mimeType, base64Data, systemPrompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: "application/json"
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 25000
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        if (apiRes.statusCode === 404) {
          // Fallback to gemini-1.5-flash if 2.5 is not available
          options.path = `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
          const fallbackReq = https.request(options, (fallbackRes) => {
            let fbData = '';
            fallbackRes.on('data', c => fbData += c);
            fallbackRes.on('end', () => {
              try {
                const parsed = JSON.parse(fbData);
                resolve(parsed);
              } catch (e) {
                reject(new Error(`Gemini Fallback Error (${fallbackRes.statusCode}): ${fbData}`));
              }
            });
          });
          fallbackReq.on('error', reject);
          fallbackReq.write(payload);
          fallbackReq.end();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(new Error(`Gemini API Error (${apiRes.statusCode}): ${data}`));
        }
      });
    });

    apiReq.on('error', reject);
    apiReq.on('timeout', () => {
      apiReq.destroy();
      reject(new Error('Gemini API call timed out after 25s'));
    });

    apiReq.write(payload);
    apiReq.end();
  });
}

module.exports = async (req, res) => {
  // Set CORS headers
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

  try {
    const fileData = await parseRequestPayload(req);
    if (!fileData || !fileData.buffer || fileData.buffer.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No file received in request.' }));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // Build data URI for preview
    const previewDataUri = `data:${fileData.mimeType};base64,${fileData.base64}`;

    if (!apiKey) {
      // Return structured response without AI if no API key is provided
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'manual_entry',
        message: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. The document has been uploaded for manual editing.',
        previewImage: previewDataUri,
        passportNumber: '',
        passNoValid: false,
        dateOfIssue: '',
        dateOfExpiry: '',
        placeOfIssue: '',
        surname: '',
        givenNames: '',
        fullName: '',
        dateOfBirth: '',
        dobValid: false,
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
        pages: [
          {
            pageNumber: 1,
            pageType: 'BIO_DATA',
            label: 'Uploaded Document',
            hasData: true,
            rotation: 0,
            previewImage: previewDataUri,
            fields: {}
          }
        ]
      }));
      return;
    }

    const systemPrompt = `You are a specialized consular OCR engine for Indian and International passports.
Analyze this passport document image/PDF with extreme precision.
Extract all data into a strict JSON object with EXACTLY the following keys:
{
  "passportNumber": "string (uppercase, e.g. Z1234567)",
  "passNoValid": true or false,
  "dateOfIssue": "DD/MM/YYYY",
  "dateOfExpiry": "DD/MM/YYYY",
  "placeOfIssue": "string (city/state)",
  "surname": "string (uppercase)",
  "givenNames": "string (uppercase, separate concatenated Indian words like BALWANT SINGH)",
  "fullName": "string (Given Name + Surname)",
  "dateOfBirth": "DD/MM/YYYY",
  "dobValid": true or false,
  "gender": "Male" or "Female" or "Other",
  "placeOfBirth": "string",
  "nationality": "string (e.g. Indian)",
  "fatherName": "string",
  "motherName": "string",
  "spouseName": "string",
  "residentialAddress": "string (complete address from address page)",
  "city": "string",
  "state": "string",
  "pinCode": "string (6-digit PIN if India)",
  "oldPassportNumber": "string (if mentioned in previous passport section or endorsements)",
  "oldPassportIssueDate": "DD/MM/YYYY or empty",
  "oldPassportIssuePlace": "string or empty",
  "pageType": "BIO_DATA" (if photo/MRZ present) or "ADDRESS_PAGE" (if father/mother/address) or "OTHER",
  "label": "Bio-data Page (Front)" or "Family & Address Page (Last)" or "Passport Document"
}
Rules:
1. Dates MUST strictly follow DD/MM/YYYY.
2. If a field is not found or not visible, set value to empty string "".
3. Disambiguate Old Passport from Current Passport (Current Passport is on top right / MRZ).
4. Un-glue names if words are concatenated (e.g., "KUMARSINGH" -> "KUMAR SINGH").
5. Return ONLY the JSON object.`;

    const geminiResponse = await callGeminiVision(apiKey, fileData.mimeType, fileData.base64, systemPrompt);

    let extractedData = {};
    try {
      const rawText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      extractedData = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', e);
      extractedData = {};
    }

    const pageType = extractedData.pageType || 'BIO_DATA';
    const label = extractedData.label || (pageType === 'BIO_DATA' ? 'Bio-data Page (Front)' : 'Family & Address Page (Last)');

    const result = {
      passportNumber: (extractedData.passportNumber || '').toUpperCase().trim(),
      passNoValid: Boolean(extractedData.passNoValid || extractedData.passportNumber),
      dateOfIssue: extractedData.dateOfIssue || '',
      dateOfExpiry: extractedData.dateOfExpiry || '',
      placeOfIssue: extractedData.placeOfIssue || '',
      surname: (extractedData.surname || '').toUpperCase().trim(),
      givenNames: (extractedData.givenNames || '').toUpperCase().trim(),
      fullName: (extractedData.fullName || `${extractedData.givenNames || ''} ${extractedData.surname || ''}`).toUpperCase().trim(),
      dateOfBirth: extractedData.dateOfBirth || '',
      dobValid: Boolean(extractedData.dobValid || extractedData.dateOfBirth),
      gender: extractedData.gender || 'Male',
      placeOfBirth: extractedData.placeOfBirth || '',
      nationality: extractedData.nationality || 'Indian',
      fatherName: (extractedData.fatherName || '').toUpperCase().trim(),
      motherName: (extractedData.motherName || '').toUpperCase().trim(),
      spouseName: (extractedData.spouseName || '').toUpperCase().trim(),
      residentialAddress: extractedData.residentialAddress || '',
      city: extractedData.city || '',
      state: extractedData.state || '',
      pinCode: extractedData.pinCode || '',
      oldPassportNumber: extractedData.oldPassportNumber || '',
      oldPassportIssueDate: extractedData.oldPassportIssueDate || '',
      oldPassportIssuePlace: extractedData.oldPassportIssuePlace || '',
      previewImage: previewDataUri,
      pages: [
        {
          pageNumber: 1,
          pageType: pageType,
          label: label,
          hasData: true,
          rotation: 0,
          previewImage: previewDataUri,
          fields: extractedData
        }
      ]
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Passport OCR Handler Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `OCR Processing Error: ${error.message}` }));
  }
};

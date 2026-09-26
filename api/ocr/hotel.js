/**
 * Vercel Serverless Function: POST /api/ocr/hotel
 * High-Accuracy Hotel Voucher OCR & Preprocessing Engine for Vercel Live Deployment.
 * Powered by Google Gemini Flash Vision API.
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
            filename: json.filename || 'voucher.pdf',
            mimeType: json.mimeType || 'application/pdf',
            base64: json.image || null
          });
        } catch (e) {
          return reject(new Error('Invalid JSON payload: ' + e.message));
        }
      }

      // Multipart form data
      const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      if (!match) {
        return resolve({
          buffer: fullBuffer,
          filename: 'voucher.pdf',
          mimeType: 'application/pdf',
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
      const filename = filenameMatch ? filenameMatch[1] : `voucher_${Date.now()}.pdf`;

      const typeMatch = headerText.match(/content-type:\s*([^\r\n;]+)/i);
      let mimeType = typeMatch ? typeMatch[1].trim().toLowerCase() : 'application/pdf';
      if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mimeType = 'image/jpeg';
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

  try {
    const fileData = await parseRequestPayload(req);
    if (!fileData || !fileData.buffer || fileData.buffer.length === 0) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'No voucher file received in request.' }));
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      // Manual entry fallback
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        status: 'manual_entry',
        message: 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Creating editable voucher card.',
        confirmationNumber: '',
        hotelName: '',
        leadGuest: '',
        numGuests: '1 Adult(s)',
        numRooms: '1',
        phone: '',
        checkIn: '',
        checkOut: '',
        duration: '',
        city: '',
        address: '',
        roomType: 'Standard Room',
        guests: [
          {
            guestName: 'Lead Guest',
            roomType: 'Standard Room',
            noOfGuests: '1 Adult(s)'
          }
        ]
      }));
      return;
    }

    const systemPrompt = `You are an expert travel operations document extraction engine for hotel booking vouchers and hotel blockings.
Extract all booking information from this hotel voucher document with high precision into a strict JSON object:
{
  "confirmationNumber": "string (booking ID, confirmation number, PNR, or reservation reference)",
  "hotelName": "string (full official hotel name)",
  "leadGuest": "string (name of the primary guest)",
  "numGuests": "string (e.g. 1 Adult(s) or 2 Guests)",
  "numRooms": "string (e.g. 1)",
  "phone": "string (hotel phone or contact)",
  "checkIn": "string (DD/MM/YYYY or standard readable date)",
  "checkOut": "string (DD/MM/YYYY or standard readable date)",
  "duration": "string (e.g. 3 Nights or 4 Days)",
  "city": "string (destination city)",
  "address": "string (hotel address)",
  "roomType": "string (e.g. Standard Room, Deluxe Twin, Superior King)",
  "guests": [
    {
      "guestName": "string",
      "roomType": "string",
      "noOfGuests": "string"
    }
  ]
}
Rules:
1. Ensure the 6 core fields (confirmationNumber, hotelName, leadGuest, checkIn, checkOut, duration) are extracted whenever present.
2. The guests table must strictly contain: guestName, roomType, and noOfGuests.
3. If not found, use empty string "".
4. Return ONLY valid JSON.`;

    const geminiResponse = await callGeminiVision(apiKey, fileData.mimeType, fileData.base64, systemPrompt);

    let extractedData = {};
    try {
      const rawText = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      extractedData = JSON.parse(rawText.replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
    } catch (e) {
      console.error('Failed to parse Gemini Hotel JSON:', e);
      extractedData = {};
    }

    const guests = Array.isArray(extractedData.guests) && extractedData.guests.length > 0
      ? extractedData.guests.map(g => ({
          guestName: g.guestName || extractedData.leadGuest || 'Guest',
          roomType: g.roomType || extractedData.roomType || 'Standard Room',
          noOfGuests: g.noOfGuests || extractedData.numGuests || '1 Adult(s)'
        }))
      : [
          {
            guestName: extractedData.leadGuest || 'Lead Guest',
            roomType: extractedData.roomType || 'Standard Room',
            noOfGuests: extractedData.numGuests || '1 Adult(s)'
          }
        ];

    const result = {
      status: 'extracted',
      confirmationNumber: (extractedData.confirmationNumber || '').trim(),
      hotelName: (extractedData.hotelName || '').trim(),
      leadGuest: (extractedData.leadGuest || '').trim(),
      numGuests: extractedData.numGuests || '1 Adult(s)',
      numRooms: extractedData.numRooms || '1',
      phone: extractedData.phone || '',
      checkIn: extractedData.checkIn || '',
      checkOut: extractedData.checkOut || '',
      duration: extractedData.duration || '',
      city: extractedData.city || '',
      address: extractedData.address || '',
      roomType: extractedData.roomType || 'Standard Room',
      guests
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Hotel OCR Handler Error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: `Hotel OCR Error: ${error.message}` }));
  }
};

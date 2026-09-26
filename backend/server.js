/**
 * Khanna Travels & Holidays — Travel & Visa Operations Server
 * (backend/server.js)
 * Lightweight Node.js Server using native node:http, node:fs, node:path, node:child_process.
 * Zero external npm dependencies required!
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = process.env.PORT || 8000;
const ROOT_DIR = path.resolve(__dirname, '..');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const GENERATED_DIR = path.join(ROOT_DIR, 'generated');

// Ensure working directories exist
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(GENERATED_DIR)) fs.mkdirSync(GENERATED_DIR, { recursive: true });

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain; charset=utf-8'
};

/**
 * Parses multipart/form-data upload using raw buffers.
 */
function parseMultipartBuffer(req, callback) {
  const contentType = req.headers['content-type'] || '';
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) {
    return callback(new Error('No boundary in multipart content-type'));
  }

  const boundary = match[1] || match[2];
  const chunks = [];

  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const fullBuffer = Buffer.concat(chunks);
    const boundaryBuffer = Buffer.from('--' + boundary);

    // Find parts
    let start = fullBuffer.indexOf(boundaryBuffer);
    if (start === -1) return callback(new Error('Boundary not found in payload'));

    start += boundaryBuffer.length;
    // Skip CRLF
    if (fullBuffer[start] === 13 && fullBuffer[start + 1] === 10) start += 2;

    const nextBoundary = fullBuffer.indexOf(boundaryBuffer, start);
    if (nextBoundary === -1) return callback(new Error('Closing boundary not found'));

    // Part headers end at \r\n\r\n
    const headerDelim = Buffer.from('\r\n\r\n');
    const headerEnd = fullBuffer.indexOf(headerDelim, start);
    if (headerEnd === -1) return callback(new Error('Invalid part header'));

    const headerText = fullBuffer.subarray(start, headerEnd).toString('utf8');
    const fileContent = fullBuffer.subarray(headerEnd + 4, nextBoundary - 2); // Exclude \r\n before next boundary

    // Extract filename
    const filenameMatch = headerText.match(/filename="([^"]+)"/i);
    const filename = filenameMatch ? filenameMatch[1] : `upload_${Date.now()}.bin`;

    callback(null, { filename, buffer: fileContent });
  });

  req.on('error', err => callback(err));
}

/**
 * Spawns a Python script and returns its stdout JSON.
 */
function executePythonScript(scriptRelativePath, args, callback) {
  const scriptPath = path.join(ROOT_DIR, scriptRelativePath);
  const pyArgs = [scriptPath, ...args];
  const pyProcess = spawn('python', pyArgs, { cwd: ROOT_DIR });

  let stdout = '';
  let stderr = '';

  pyProcess.stdout.on('data', data => {
    stdout += data.toString('utf8');
  });

  pyProcess.stderr.on('data', data => {
    stderr += data.toString('utf8');
  });

  pyProcess.on('close', code => {
    if (code !== 0) {
      console.error(`Python script ${scriptRelativePath} exited with code ${code}. Stderr: ${stderr}`);
      return callback(new Error(`Python process exited with code ${code}: ${stderr}`));
    }

    try {
      const parsed = JSON.parse(stdout);
      callback(null, parsed);
    } catch (e) {
      callback(new Error(`Failed to parse Python JSON output: ${e.message}. Output was: ${stdout}`));
    }
  });
}

// HTTP Server
const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(urlObj.pathname);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Healthcheck
  if (pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Khanna Travels & Holidays Automation' }));
    return;
  }

  // API 1: Passport OCR Upload
  if (pathname === '/api/ocr/passport' && req.method === 'POST') {
    parseMultipartBuffer(req, (err, fileData) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Upload error: ${err.message}` }));
        return;
      }

      const tempFilePath = path.join(UPLOADS_DIR, `pass_${Date.now()}_${fileData.filename}`);
      fs.writeFileSync(tempFilePath, fileData.buffer);

      executePythonScript('backend/python/ocr_runner.py', [tempFilePath], (ocrErr, ocrResult) => {
        // Clean up temp file
        try { fs.unlinkSync(tempFilePath); } catch (e) {}

        if (ocrErr) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: ocrErr.message }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ocrResult));
      });
    });
    return;
  }

  // API 2: Hotel Voucher OCR Upload
  if (pathname === '/api/ocr/hotel' && req.method === 'POST') {
    parseMultipartBuffer(req, (err, fileData) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Upload error: ${err.message}` }));
        return;
      }

      const tempFilePath = path.join(UPLOADS_DIR, `hotel_${Date.now()}_${fileData.filename}`);
      fs.writeFileSync(tempFilePath, fileData.buffer);

      executePythonScript('backend/python/hotel_engine.py', [tempFilePath], (ocrErr, ocrResult) => {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}

        if (ocrErr) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: ocrErr.message }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ocrResult));
      });
    });
    return;
  }

  // API 3: Export Word (.docx)
  if (pathname === '/api/export/docx' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString('utf8'); });
    req.on('end', () => {
      const payloadPath = path.join(UPLOADS_DIR, `payload_${Date.now()}.json`);
      const outputDocxPath = path.join(GENERATED_DIR, `doc_${Date.now()}.docx`);

      fs.writeFileSync(payloadPath, body, 'utf8');

      executePythonScript('backend/python/docx_engine.py', [payloadPath, outputDocxPath], (err, result) => {
        try { fs.unlinkSync(payloadPath); } catch (e) {}

        if (err || !fs.existsSync(outputDocxPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err ? err.message : 'File generation failed' }));
          return;
        }

        const stat = fs.statSync(outputDocxPath);
        res.writeHead(200, {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="document.docx"`
        });

        const readStream = fs.createReadStream(outputDocxPath);
        readStream.pipe(res);
        readStream.on('end', () => {
          try { fs.unlinkSync(outputDocxPath); } catch (e) {}
        });
      });
    });
    return;
  }

  // API 4: Export PDF (.pdf)
  if (pathname === '/api/export/pdf' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString('utf8'); });
    req.on('end', () => {
      const payloadPath = path.join(UPLOADS_DIR, `payload_${Date.now()}.json`);
      const outputPdfPath = path.join(GENERATED_DIR, `doc_${Date.now()}.pdf`);

      fs.writeFileSync(payloadPath, body, 'utf8');

      executePythonScript('backend/python/docx_engine.py', [payloadPath, outputPdfPath, 'pdf'], (err, result) => {
        try { fs.unlinkSync(payloadPath); } catch (e) {}

        if (err || !fs.existsSync(outputPdfPath)) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err ? err.message : 'PDF generation failed' }));
          return;
        }

        const stat = fs.statSync(outputPdfPath);
        res.writeHead(200, {
          'Content-Type': 'application/pdf',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="document.pdf"`
        });

        const readStream = fs.createReadStream(outputPdfPath);
        readStream.pipe(res);
        readStream.on('end', () => {
          try { fs.unlinkSync(outputPdfPath); } catch (e) {}
        });
      });
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(` Khanna Travels & Holidays — Document Automation System`);
  console.log(` Web Server listening on: http://localhost:${PORT}`);
  console.log(`=============================================================\n`);
});

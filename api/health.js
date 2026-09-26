/**
 * Vercel Serverless Function: GET /api/health
 * Health check & diagnostic endpoint for Khanna Travels & Holidays Platform.
 */
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify({
    status: 'ok',
    service: 'Khanna Travels & Holidays Document Automation System',
    platform: 'vercel-serverless',
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  }));
};

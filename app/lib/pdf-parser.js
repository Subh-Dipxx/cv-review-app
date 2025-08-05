const pdfParse = require('pdf-parse/lib/pdf-parse');

// Simple wrapper that only accepts buffers, not file paths
async function parsePdf(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('Input must be a buffer');
  }
  
  return await pdfParse(buffer);
}

module.exports = parsePdf;

/**
 * Safe wrapper for pdf-parse that prevents test execution
 */

// Set environment variable to prevent tests
process.env.PDF_PARSE_NO_TESTS = 'true';

// We need to monkey-patch the module system before requiring pdf-parse
// This ensures the debug mode detection will return false
// @ts-ignore - Force module.parent to be non-null to prevent debug mode
if (typeof module !== 'undefined' && !module.parent) {
  // @ts-ignore
  module.parent = module;
}

// Use standard module import path
const pdfParse = require('pdf-parse');

/**
 * Parse PDF buffer safely without running tests
 */
export function parsePdfSafely(pdfBuffer: Buffer, options = {}) {
  return pdfParse(pdfBuffer, options);
}
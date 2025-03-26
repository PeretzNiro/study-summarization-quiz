/**
 * Safe wrapper for pdf-parse that prevents test execution
 * 
 * The pdf-parse library runs automatic tests when imported directly in certain environments.
 * This wrapper prevents those tests from running by:
 * 1. Setting an environment variable to skip tests
 * 2. Monkey-patching the module system to avoid debug mode detection
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
 * @param pdfBuffer - Raw PDF file content as Buffer
 * @param options - Options for the pdf-parse library (page limits, render options, etc.)
 * @returns Promise resolving to parsed PDF data with text and metadata
 */
export function parsePdfSafely(pdfBuffer: Buffer, options = {}) {
  return pdfParse(pdfBuffer, options);
}
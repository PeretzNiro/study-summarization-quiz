/**
 * Main exports for document extractors
 * This module exposes functions for extracting text and structured data
 * from various document formats used in the application.
 */

// Use the pdf-extractor (pdf-parse) implementation instead of pdf-simple-parser
export { extractPdfContent, extractPdfWithTables } from './pdf-extractor';
export { extractPptxContent } from './pptx-extractor';
export { ExtractedData } from './types';
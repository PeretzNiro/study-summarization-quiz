/**
 * Main exports for document extractors
 */

// Use the pdf-extractor (pdf-parse) implementation instead of pdf-simple-parser
export { extractPdfContent, extractPdfWithTables } from './pdf-extractor';
export { extractPptxContent } from './pptx-extractor';
export { ExtractedData } from './types';
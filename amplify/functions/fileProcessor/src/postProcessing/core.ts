/**
 * Core postprocessing functionality
 */

import { removeRedundantLineBreaks, removePageNumbers, mergeBrokenSentences } from './whitespace';
import { cleanPdfContent } from './pdf-specific';
import { cleanPptContent } from './pptx-specific';
import { detectSimpleTables } from './tables';

/**
 * Applies a series of cleaning and normalization steps to extracted content
 * @param content The raw extracted text content
 * @param documentType The type of document (pdf, pptx, etc.)
 * @param metadata Additional metadata that might help with processing
 */
export function postprocessContent(content: string, documentType: string, metadata: any = {}): string {
  // Apply document-specific processing
  let processedContent = content;
  
  if (documentType === 'pdf') {
    processedContent = cleanPdfContent(processedContent, metadata);
    
    // Try to detect and format simple tables - apply after initial cleaning
    processedContent = detectSimpleTables(processedContent);
  } else if (documentType === 'pptx' || documentType === 'ppt') {
    processedContent = cleanPptContent(processedContent, metadata);
  }
  
  // Apply general cleanups that should happen last
  processedContent = removeRedundantLineBreaks(processedContent);
  processedContent = removePageNumbers(processedContent);
  processedContent = mergeBrokenSentences(processedContent);
  
  return processedContent;
}
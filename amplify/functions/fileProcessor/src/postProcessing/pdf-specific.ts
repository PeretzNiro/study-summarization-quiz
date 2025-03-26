/**
 * PDF-specific cleanup functions
 */

import { removeRepeatingHeaders, removeCommonHeadersFooters } from './headers';
import { fixBrokenSentences, normalizeSpacing } from './whitespace';
import { cleanPipeArtifacts } from './tables';
import { fixMathNotation, cleanRepeatedPunctuation, enhanceMathematicalContent } from './math';

/**
 * Cleans PDF-specific artifacts that occur during text extraction
 * Applies a series of targeted transformations to improve content readability
 * @param content Raw extracted PDF text
 * @param metadata Optional metadata about the document
 * @returns Cleaned and normalized PDF content
 */
export function cleanPdfContent(content: string, metadata: any = {}): string {
  let result = content;
  
  // Remove running headers/footers that repeat on each page
  result = removeRepeatingHeaders(result);
  
  // Clean up hyphenated words that were split across lines
  result = result.replace(/(\w+)-\s*\n\s*(\w+)/g, (match, p1, p2) => {
    // Check if this looks like a legitimate hyphenated word
    if (p1.length > 2 && p2.length > 2) {
      return `${p1}${p2}`;
    }
    return match; // Keep original if it's likely a real hyphenated word
  });
  
  // Fix common PDF extraction issues
  result = result.replace(/([a-z])- ([a-z])/g, '$1-$2'); // Fix spaces in hyphenated words
  
  // Apply additional cleanup steps in a pipeline
  result = removeCommonHeadersFooters(result);
  result = cleanPipeArtifacts(result);
  result = fixBrokenSentences(result);
  result = normalizeSpacing(result);
  result = cleanRepeatedPunctuation(result);
  result = fixMathNotation(result);
  
  // Enhance mathematical content
  result = enhanceMathematicalContent(result);
  
  return result;
}
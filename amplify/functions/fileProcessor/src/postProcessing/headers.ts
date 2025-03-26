/**
 * Header and footer detection and cleaning
 */

import { escapeRegExp } from './common';

/**
 * Detects and removes repeating headers or footers from document content
 * Uses frequency analysis to identify repeating lines that are likely
 * not part of the main content
 * @param content Raw text content to process
 * @returns Content with repeating headers and footers removed
 */
export function removeRepeatingHeaders(content: string): string {
  const lines = content.split('\n');
  const lineFrequency: Record<string, number> = {};
  
  // Count frequency of each line
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 5) { // Ignore very short lines
      lineFrequency[trimmedLine] = (lineFrequency[trimmedLine] || 0) + 1;
    }
  });
  
  // Find potential headers/footers (lines that repeat many times)
  const potentialHeadersFooters = Object.keys(lineFrequency)
    .filter(line => lineFrequency[line] > 3) // Appears frequently
    .sort((a, b) => lineFrequency[b] - lineFrequency[a]); // Sort by frequency
  
  let result = content;
  
  // Remove the most frequent repeating lines if they look like headers/footers
  potentialHeadersFooters.slice(0, 5).forEach(headerFooter => {
    // Avoid removing important content sections
    if (!headerFooter.match(/^(Introduction|Conclusion|Summary|Chapter|Section|Slide \d+:)/)) {
      const escapedHeaderFooter = escapeRegExp(headerFooter);
      const headerFooterPattern = new RegExp(`^\\s*${escapedHeaderFooter}\\s*$`, 'gm');
      result = result.replace(headerFooterPattern, '');
    }
  });
  
  return result;
}

/**
 * Remove common headers and footers from academic PDFs
 * Targets specific patterns typically found in educational materials
 * @param content Raw text content to process
 * @returns Content with common headers and footers removed
 */
export function removeCommonHeadersFooters(content: string): string {
  const headerFooterPatterns = [
    // University headers
    /\bUNIVERSITY\s+of\s+[A-Z]+\b/gi,
    
    // Common page indicators
    /\bPage\s+\d+\s+of\s+\d+\b/gi,
    
    // Author signatures in corners
    /[A-Z]\.\s+[A-Z]\.\s+[A-Za-z]+\b/g,
    
    // Copyright notices
    /©\s+\d{4}\s+[A-Za-z\s]+\.\s+All\s+rights\s+reserved\./gi,
    
    // Date stamps
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g
  ];
  
  let result = content;
  
  // Only remove if they appear multiple times (likely headers/footers)
  for (const pattern of headerFooterPatterns) {
    const matches = result.match(pattern);
    if (matches && matches.length > 3) {
      // If the same text appears multiple times, it's likely a header/footer
      result = result.replace(new RegExp(`^${escapeRegExp(matches[0])}$`, 'gm'), '');
    }
  }
  
  return result;
}
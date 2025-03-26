/**
 * Whitespace and line break handling
 */

/**
 * Normalizes whitespace throughout the document
 * @param content Text content to normalize
 * @returns Text with standardized spacing
 */
export function normalizeWhitespace(content: string): string {
  // Replace multiple spaces with a single space
  let result = content.replace(/[ \t]+/g, ' ');
  
  // Replace 3+ consecutive newlines with double newlines
  result = result.replace(/\n{3,}/g, '\n\n');
  
  return result;
}

/**
 * Removes redundant line breaks while preserving paragraph structure
 * Maintains formatting for tables, slide headers, and lists
 * @param content Text content to process
 * @returns Text with optimized line breaks
 */
export function removeRedundantLineBreaks(content: string): string {
  // Keep paragraph breaks (double newlines) but remove single breaks that aren't needed
  let lines = content.split('\n');
  let result = '';
  let inTable = false;
  let inSlideHeader = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines but track them for paragraph breaks
    if (line === '') {
      // Only add a newline if the previous line wasn't empty
      if (i > 0 && lines[i-1].trim() !== '') {
        result += '\n\n';
      }
      continue;
    }
    
    // Preserve table formatting
    if (line === '[TABLE]') {
      inTable = true;
      result += line + '\n';
      continue;
    } else if (line === '[/TABLE]') {
      inTable = false;
      result += line + '\n';
      continue;
    }
    
    // Preserve table rows
    if (inTable && line.startsWith('|')) {
      result += line + '\n';
      continue;
    }
    
    // Handle slide headers (e.g., "Slide 5:")
    if (line.match(/^Slide \d+:$/)) {
      inSlideHeader = true;
      // If this isn't the first line, add a double newline
      if (result) {
        result += '\n\n';
      }
      result += line + '\n';
      continue;
    } else {
      inSlideHeader = false;
    }
    
    // Preserve bullet points and numbered lists
    if (line.match(/^[\•\-\*]\s/) || line.match(/^\d+[\.\)]\s/)) {
      result += line + '\n';
      continue;
    }
    
    // For normal content, append without redundant breaks
    if (result && !result.endsWith('\n') && !result.endsWith('\n\n')) {
      // If the previous line looks like it ends a sentence, add a space
      if (result.match(/[.!?]$/)) {
        result += ' ';
      } else if (!result.endsWith(' ')) {
        // Otherwise just ensure there's a space between lines
        result += ' ';
      }
    }
    
    result += line;
  }
  
  return result;
}

/**
 * Identifies and removes page numbers and similar artifacts
 * @param content Text content to process
 * @returns Text with page number artifacts removed
 */
export function removePageNumbers(content: string): string {
  // Remove standalone page numbers
  const pageNumberPattern = /^[\s]*\d+[\s]*$/gm;
  let result = content.replace(pageNumberPattern, '');
  
  // Remove "Page X of Y" patterns
  result = result.replace(/[\s]*(Page|Slide)[\s]*\d+[\s]*(of|\/|-)[\s]*\d+[\s]*/gi, '');
  
  return result;
}

/**
 * Merges sentences that have been broken across lines
 * @param content Text content to process
 * @returns Text with broken sentences rejoined
 */
export function mergeBrokenSentences(content: string): string {
  // Pattern: line ending without punctuation followed by line starting with lowercase
  return content.replace(/(\w)[\s]*\n[\s]*([a-z])/g, '$1 $2');
}

/**
 * Normalize spacing in the document
 * @param content Text content to process
 * @returns Text with standardized spacing and punctuation
 */
export function normalizeSpacing(content: string): string {
  return content
    // Replace multiple spaces with a single space
    .replace(/[ \t]+/g, ' ')
    // Remove spaces before punctuation
    .replace(/\s+([,.;:!?])/g, '$1')
    // Ensure single line break between paragraphs
    .replace(/\n{3,}/g, '\n\n');
}

/**
 * Fix broken sentences
 * @param content Text content to process
 * @returns Text with sentence fragments rejoined
 */
export function fixBrokenSentences(content: string): string {
  // Pattern: line ending without punctuation followed by line starting with lowercase
  return content.replace(/(\w)[\s]*\n[\s]*([a-z])/g, '$1 $2');
}
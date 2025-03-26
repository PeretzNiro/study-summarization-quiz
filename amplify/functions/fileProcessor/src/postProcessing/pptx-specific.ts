/**
 * PowerPoint-specific cleanup functions
 */

import { escapeRegExp } from './common';

/**
 * Cleans PowerPoint-specific artifacts that occur during text extraction
 * Normalizes slide content and removes common presentation elements
 * @param content Raw extracted PowerPoint text
 * @param metadata Optional metadata about the presentation
 * @returns Cleaned and normalized PowerPoint content
 */
export function cleanPptContent(content: string, metadata: any = {}): string {
  let result = content;
  
  // Remove footer text that might appear on each slide
  if (metadata.title) {
    const escapedTitle = escapeRegExp(metadata.title);
    const titlePattern = new RegExp(`^\\s*${escapedTitle}\\s*$`, 'gm');
    result = result.replace(titlePattern, '');
  }
  
  // Clean up slide numbers (keep the main "Slide X:" identifiers but remove others)
  result = result.replace(/\b(Slide|Page)[\s]+\d+\b(?!:)/gi, '');
  
  // Remove empty slide content indicators
  result = result.replace(/\[No text content in this slide\]\s*/g, '');
  
  // Remove error messages from parsing
  result = result.replace(/\[Error parsing slide \d+\]\s*/g, '');
  
  return result;
}
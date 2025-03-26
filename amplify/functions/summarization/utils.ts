/**
 * Utility functions for summarization processing
 */

import { determineDifficulty } from '../fileProcessor/src/extractors/metadata';

/**
 * Estimates the reading duration based on word count and content complexity
 * @param text Summary content to analyze
 * @returns Formatted duration string (e.g., "30 minutes", "1 hour")
 */
export function estimateDuration(text: string): string {
  // Calculate raw word count
  const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  // Determine difficulty level based on content characteristics
  const difficulty = determineDifficulty(text);
  
  // Adjust reading speed based on content difficulty
  // Average adult reading speed: ~200-250 WPM for non-technical content
  let wordsPerMinute = 200;
  
  if (difficulty === 'Hard') {
    // Technical/complex content is read more slowly
    wordsPerMinute = 75;
  } else if (difficulty === 'Medium') {
    wordsPerMinute = 150;
  }
  
  // Calculate minutes needed, with a minimum of 5 minutes
  let minutes = Math.max(5, Math.round(wordCount / wordsPerMinute));
  
  // Add time for digesting complex content with math or tables
  if (difficulty === 'Hard') {
    minutes += Math.round(minutes * 0.3); // 30% extra time for complex material
  }
  
  // Format the duration string
  if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
    }
  }
}
/**
 * Main exports for the postprocessing module
 * 
 * This file centralizes exports from all text processing utilities,
 * making them accessible through a single import location.
 * Use the main postprocessContent function for standard processing,
 * or individual utilities for more targeted text transformations.
 */

export { postprocessContent } from './core';

// Export individual utilities for use in other parts of the application
export { 
  normalizeWhitespace,
  removeRedundantLineBreaks,
  removePageNumbers,
  mergeBrokenSentences
} from './whitespace';

export {
  removeRepeatingHeaders,
  removeCommonHeadersFooters
} from './headers';

export {
  cleanPipeArtifacts,
  detectSimpleTables,
  formatAsTable,
  detectColumnPositions
} from './tables';

export {
  fixMathNotation,
  cleanRepeatedPunctuation
} from './math';

export { cleanPdfContent } from './pdf-specific';
export { cleanPptContent } from './pptx-specific';
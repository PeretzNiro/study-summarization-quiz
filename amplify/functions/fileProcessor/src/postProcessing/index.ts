/**
 * Main exports for the postprocessing module
 */

export { postprocessContent } from './core';

// Also export individual utilities for use in other parts of the application
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
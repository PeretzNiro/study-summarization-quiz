/**
 * Type definitions for document extraction system
 */

/**
 * Structure for extracted document data
 * Contains normalized lecture content and associated metadata
 */
export interface ExtractedData {
  courseId: string;      // Identifier for the parent course
  lectureId: string;     // Identifier for this specific lecture
  title: string;         // Lecture title extracted from document
  content: string;       // Processed text content from document
  difficulty: string;    // Estimated difficulty level ("Easy", "Medium", "Hard")
  fileName?: string;     // Original file name (if available)
  fileType?: string;     // File format extension (pdf, pptx, etc.)
}

/**
 * Configuration options for PDF table detection algorithm
 * Controls sensitivity and accuracy of table extraction
 */
export interface PdfTableOptions {
  minRows: number;       // Minimum number of rows to consider something a table
  minColumns: number;    // Minimum number of columns to consider something a table
  lineThreshold: number; // Threshold for detecting horizontal/vertical lines
}
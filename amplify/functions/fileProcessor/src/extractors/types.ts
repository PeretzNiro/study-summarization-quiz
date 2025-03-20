/**
 * Structure for extracted document data
 */

export interface ExtractedData {
  courseId: string;
  lectureId: string;
  title: string;
  content: string;
  difficulty: string;
  fileName?: string;
  fileType?: string;
}

export interface PdfTableOptions {
  minRows: number;       // Minimum number of rows to consider something a table
  minColumns: number;    // Minimum number of columns to consider something a table
  lineThreshold: number; // Threshold for detecting horizontal/vertical lines
}
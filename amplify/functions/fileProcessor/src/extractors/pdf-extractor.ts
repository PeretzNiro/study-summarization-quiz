/**
 * PDF content extraction utilities
 */

import { ExtractedData } from './types';
import { extractCourseId, extractLectureId, determineDifficulty } from './metadata';
import { detectTablesInPdfText, extractScientificPdfTables } from './table-extractor';
import { postprocessContent } from '../postProcessing';
import { parsePdfSafely } from './pdf-parser-safe';

/**
 * Extracts text content from PDF files using pdf-parse
 * @param pdfBuffer - Buffer containing PDF data
 * @returns Structured data object with extracted content and metadata
 */
export async function extractPdfContent(pdfBuffer: Buffer): Promise<ExtractedData> {
  try {
    // Parse PDF directly using our safe wrapper
    const data = await parsePdfSafely(pdfBuffer, {
      // Set any options here if needed
    });
    
    // Extract full text
    const fullText = data.text || '';
    
    // Get title from info or first line
    let title = data.info?.Title || '';
    if (!title && fullText) {
      // Use first line as title if not found
      const lines = fullText.split('\n').filter((line: { trim: () => { (): any; new(): any; length: number; }; }) => line.trim().length > 0);
      if (lines.length > 0) {
        title = lines[0].trim();
      }
    }
    
    // Apply post-processing to clean up the content
    const processedText = postprocessContent(fullText, 'pdf', { title });
    
    // Extract course/lecture IDs using regex
    const courseId = extractCourseId(processedText);
    const lectureId = extractLectureId(processedText);
    const difficulty = determineDifficulty(processedText);
    
    return {
      courseId,
      lectureId,
      title: title || 'Untitled',
      content: processedText,
      difficulty
    };
  } catch (error) {
    console.error('Error extracting PDF content:', error);
    return {
      courseId: 'Unknown',
      lectureId: 'Unknown',
      title: 'Untitled PDF',
      content: `Error extracting PDF content: ${error}`,
      difficulty: 'Medium'
    };
  }
}

/**
 * Extracts text and tables from PDF using pdf-parse with advanced table detection
 * Provides richer content extraction with formatted tables for educational materials
 * @param pdfBuffer - Buffer containing PDF data
 * @returns Structured data with table-aware content and metadata
 */
export async function extractPdfWithTables(pdfBuffer: Buffer): Promise<ExtractedData> {
  try {
    // Parse PDF directly using pdf-parse library
    const data = await parsePdfSafely(pdfBuffer, {
      // Set any options here if needed
    });
    
    const fullText = data.text || '';
    
    // Get title from info or first line
    let title = data.info?.Title || '';
    if (!title && fullText) {
      const lines = fullText.split('\n').filter((line: { trim: () => { (): any; new(): any; length: number; }; }) => line.trim().length > 0);
      if (lines.length > 0) {
        title = lines[0].trim();
      }
    }
    
    // Two-pass table detection for better accuracy
    // First pass - scientific table detection (equations, data tables)
    let textWithTables = extractScientificPdfTables(fullText);
    
    // Second pass - general table detection (text tables, columns)
    textWithTables = detectTablesInPdfText(textWithTables);
    
    // Apply post-processing to clean up the content
    const processedText = postprocessContent(textWithTables, 'pdf', { title });
    
    // Extract metadata with enhanced difficulty assessment
    const courseId = extractCourseId(processedText);
    const lectureId = extractLectureId(processedText);
    const difficulty = determineDifficulty(processedText);
    
    return {
      courseId,
      lectureId,
      title: title || 'Untitled',
      content: processedText,
      difficulty
    };
  } catch (error) {
    console.error('Error extracting PDF tables:', error);
    return {
      courseId: 'Unknown',
      lectureId: 'Unknown',
      title: 'Untitled PDF',
      content: `Error extracting PDF tables: ${error}`,
      difficulty: 'Medium'
    };
  }
}
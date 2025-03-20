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
 */
export async function extractPdfContent(pdfBuffer: Buffer): Promise<ExtractedData> {
  console.log('Extracting content from PDF...');
  const startTime = Date.now();

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
    
    const endTime = Date.now();
    console.log(`PDF extraction completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Extracted ${processedText.length} characters`);
    
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
 * Extracts text and tables from PDF using pdf-parse with additional table processing
 * For more comprehensive table extraction
 * @param pdfBuffer - Buffer containing PDF data
 */
export async function extractPdfWithTables(pdfBuffer: Buffer): Promise<ExtractedData> {
  console.log('Extracting PDF with tables...');
  const startTime = Date.now();
  
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
    
    console.log('Detecting and formatting tables...');
    
    // First pass - scientific table detection
    let textWithTables = extractScientificPdfTables(fullText);
    
    // Second pass - general table detection
    textWithTables = detectTablesInPdfText(textWithTables);
    
    // Apply post-processing to clean up the content
    const processedText = postprocessContent(textWithTables, 'pdf', { title });
    
    // Extract metadata with enhanced difficulty assessment
    const courseId = extractCourseId(processedText);
    const lectureId = extractLectureId(processedText);
    const difficulty = determineDifficulty(processedText);
    
    console.log(`PDF table extraction completed in ${(Date.now() - startTime) / 1000} seconds`);
    console.log(`Difficulty assessment: ${difficulty}`);
    
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
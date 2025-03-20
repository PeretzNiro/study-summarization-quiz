/**
 * PowerPoint document extraction utilities
 */

import JSZip from 'jszip';
import * as xml2js from 'xml2js';
import { postprocessContent } from '../postProcessing';
import { ExtractedData } from './types';
import { extractCourseId, extractLectureId, determineDifficulty } from './metadata';
import { extractTablesFromPptxSlide } from './table-extractor';

/**
 * Extracts text content from PPTX files using JSZip and XML parsing
 * @param pptxBuffer - Buffer containing PPTX data
 */
export async function extractPptxContent(pptxBuffer: Buffer): Promise<ExtractedData> {
  console.log('Extracting content from PPTX...');
  const startTime = Date.now();
  
  try {
    // PPTX files are essentially ZIP files containing XML
    const zip = await JSZip.loadAsync(pptxBuffer);
    
    // Extract presentation.xml which contains main content
    const slidesFolder = 'ppt/slides/';
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.startsWith(slidesFolder) && name.endsWith('.xml'))
      .sort((a, b) => {
        // Sort the slides numerically based on slide number
        const numA = parseInt(a.replace(slidesFolder + 'slide', '').replace('.xml', ''));
        const numB = parseInt(b.replace(slidesFolder + 'slide', '').replace('.xml', ''));
        return numA - numB;
      });
    
    console.log(`Found ${slideFiles.length} slides in presentation`);
    
    // Parse presentation properties to get the title
    let title = 'Untitled Presentation';
    let presentationSubject = '';
    let presentationCompany = '';
    
    // Try to get core title
    try {
      const corePropsFile = zip.file('docProps/core.xml');
      if (corePropsFile) {
        const corePropsContent = await corePropsFile.async('text');
        const parser = new xml2js.Parser({ explicitArray: false });
        const coreProps = await parser.parseStringPromise(corePropsContent);
        
        if (coreProps['cp:coreProperties']) {
          if (coreProps['cp:coreProperties'].title) {
            title = coreProps['cp:coreProperties'].title;
          }
          if (coreProps['cp:coreProperties'].subject) {
            presentationSubject = coreProps['cp:coreProperties'].subject;
          }
          if (coreProps['cp:coreProperties'].company) {
            presentationCompany = coreProps['cp:coreProperties'].company;
          }
        }
      }
    } catch (err) {
      console.log('Error parsing core properties:', err);
    }
    
    // Try to get app title as fallback
    if (!title || title === 'Untitled Presentation') {
      try {
        const appPropsFile = zip.file('docProps/app.xml');
        if (appPropsFile) {
          const appPropsContent = await appPropsFile.async('text');
          const parser = new xml2js.Parser({ explicitArray: false });
          const appProps = await parser.parseStringPromise(appPropsContent);
          
          if (appProps['Properties'] && appProps['Properties'].TitleOfParts && 
              appProps['Properties'].TitleOfParts.Vector && 
              appProps['Properties'].TitleOfParts.Vector.lpstr) {
            title = appProps['Properties'].TitleOfParts.Vector.lpstr;
          }
        }
      } catch (err) {
        console.log('Error parsing app properties:', err);
      }
    }
    
    // Extract text from each slide
    let fullText = '';
    const parser = new xml2js.Parser();
    
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = zip.file(slideFiles[i]);
      if (slideFile) {
        const slideContent = await slideFile.async('text');
        try {
          const slideXml = await parser.parseStringPromise(slideContent);
          
          // Add slide number
          fullText += `Slide ${i+1}:\n`;
          
          // Extract text from slide
          const extractedText = extractTextFromSlide(slideXml);
          
          // If we found meaningful text
          if (extractedText.trim()) {
            fullText += extractedText + '\n\n';
          } else {
            fullText += '[No text content in this slide]\n\n';
          }

          // Extract tables from slide using the shared function
          const extractedTables = extractTablesFromPptxSlide(slideXml);
          if (extractedTables.trim()) {
            fullText += extractedTables + '\n\n';
          }
        } catch (err) {
          console.log(`Error parsing slide ${i+1}:`, err);
          fullText += `[Error parsing slide ${i+1}]\n\n`;
        }
      }
    }
    
    // Apply post-processing to clean up the content
    const processedText = postprocessContent(fullText, 'pptx', { 
      title, 
      subject: presentationSubject,
      company: presentationCompany
    });
    
    // Try to extract course ID and lecture ID from title if not found in content
    let courseId = extractCourseId(processedText);
    if (courseId === 'Unknown') {
      courseId = extractCourseId(title + ' ' + presentationSubject + ' ' + presentationCompany);
    }
    
    let lectureId = extractLectureId(processedText);
    if (lectureId === 'Unknown') {
      lectureId = extractLectureId(title + ' ' + presentationSubject);
      
      // If still unknown, try to extract from filename
      if (lectureId === 'Unknown') {
        // Try to find patterns like "Week 2" or "Lecture 3" in the title
        const weekMatch = /\b(?:week|wk)\s*(\d+)/i.exec(title);
        if (weekMatch) {
          lectureId = `Week ${weekMatch[1]}`;
        }
      }
    }
    
    const difficulty = determineDifficulty(processedText);
    
    const endTime = Date.now();
    console.log(`PPTX extraction completed in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Extracted ${processedText.length} characters from ${slideFiles.length} slides`);
    
    return {
      courseId,
      lectureId,
      title,
      content: processedText,
      difficulty
    };
  } catch (error) {
    console.error('Error extracting PPTX content:', error);
    return {
      courseId: 'Unknown',
      lectureId: 'Unknown',
      title: 'Untitled PPTX',
      content: `Error extracting PPTX content: ${error}`,
      difficulty: 'Medium'
    };
  }
}

/**
 * Extract text content from PowerPoint slide XML
 */
export function extractTextFromSlide(slideXml: any): string {
  let text = '';
  
  try {
    // Navigate to text elements in the XML structure
    if (slideXml && 
        slideXml['p:sld'] && 
        slideXml['p:sld']['p:cSld'] && 
        slideXml['p:sld']['p:cSld'][0]['p:spTree']) {
      
      const spTree = slideXml['p:sld']['p:cSld'][0]['p:spTree'][0];
      
      // Process shapes (sp elements)
      if (spTree['p:sp']) {
        for (const shape of spTree['p:sp']) {
          if (shape['p:txBody'] && 
              shape['p:txBody'][0]['a:p']) {
            
            // Process paragraphs
            for (const paragraph of shape['p:txBody'][0]['a:p']) {
              if (paragraph['a:r']) {
                // Process text runs
                for (const run of paragraph['a:r']) {
                  if (run['a:t']) {
                    for (const textElement of run['a:t']) {
                      if (textElement !== undefined && textElement !== null) {
                        text += textElement.toString();
                      }
                    }
                  }
                }
                text += '\n';
              }
            }
          }
        }
      }
      
      // Process group shapes (p:grpSp elements)
      if (spTree['p:grpSp']) {
        for (const groupShape of spTree['p:grpSp']) {
          if (groupShape['p:sp']) {
            for (const shape of groupShape['p:sp']) {
              if (shape['p:txBody'] && 
                  shape['p:txBody'][0]['a:p']) {
                
                // Process paragraphs
                for (const paragraph of shape['p:txBody'][0]['a:p']) {
                  if (paragraph['a:r']) {
                    // Process text runs
                    for (const run of paragraph['a:r']) {
                      if (run['a:t']) {
                        for (const textElement of run['a:t']) {
                          if (textElement !== undefined && textElement !== null) {
                            text += textElement.toString();
                          }
                        }
                      }
                    }
                    text += '\n';
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('Error extracting text from slide:', error);
  }
  
  return text.trim();
}
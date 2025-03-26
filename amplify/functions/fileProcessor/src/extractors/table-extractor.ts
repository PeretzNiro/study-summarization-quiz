/**
 * Table detection and extraction utilities for different document types
 */

import { PdfTableOptions } from './types';

/**
 * Extract tables from PDF text content using heuristic pattern recognition
 * @param content Raw text content from PDF
 * @param options Configuration options for table detection
 * @returns Content with detected tables formatted in markdown
 */
export function detectTablesInPdfText(
  content: string, 
  options: PdfTableOptions = { minRows: 2, minColumns: 2, lineThreshold: 3 }
): string {
  // Split content into lines for analysis
  const lines = content.split('\n');
  let processedContent = content;
  
  // Identify potential tables based on patterns
  const tableRegions = findTableRegions(lines, options);
  
  // Process each detected table region
  tableRegions.forEach(region => {
    const { startLine, endLine } = region;
    const tableLines = lines.slice(startLine, endLine + 1);
    
    // Extract and format the table
    const formattedTable = formatTableFromLines(tableLines);
    
    // Replace the original table text with the formatted version
    const originalTableText = tableLines.join('\n');
    processedContent = processedContent.replace(originalTableText, formattedTable);
  });
  
  return processedContent;
}

/**
 * Identify potential table regions in text content
 * Uses multiple heuristics to find tabular data in plain text
 * @param lines Array of text lines to analyze
 * @param options Configuration parameters for detection sensitivity
 * @returns Array of table regions with start and end line indices
 */
function findTableRegions(
  lines: string[], 
  options: PdfTableOptions
): Array<{startLine: number, endLine: number}> {
  const tableRegions: Array<{startLine: number, endLine: number}> = [];
  let inTable = false;
  let currentTableStart = 0;
  let consecutiveTableLines = 0;
  
  // Pattern indicators for table detection
  const patterns = {
    // Regular table with consistent spacing
    spacingPattern: (line: string) => {
      // Check for evenly spaced text blocks
      const spacingMatches = line.match(/\S+\s{2,}\S+/g);
      return spacingMatches && spacingMatches.length >= options.minColumns - 1;
    },
    
    // Tables with delimiter characters (|, +, etc.)
    delimiterPattern: (line: string) => {
      return line.includes('|') || line.includes('+');
    },
    
    // Numeric tables (many numbers arranged in columns)
    numericTablePattern: (line: string) => {
      const numbers = line.match(/\d+(\.\d+)?/g);
      return numbers && numbers.length >= options.minColumns;
    },
    
    // Tables with consistent column alignment
    alignmentPattern: (line: string) => {
      // Look for consistent spacing that suggests columns
      return /\S+\s+\S+\s+\S+/.test(line);
    }
  };
  
  // Analyze each line for table patterns
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip very short lines
    if (line.length < 5) {
      if (inTable) {
        // Short line might be a table separator or empty row
        consecutiveTableLines++;
      }
      continue;
    }
    
    // Check if this line matches any table pattern
    const isTableLine = patterns.spacingPattern(line) || 
                       patterns.delimiterPattern(line) || 
                       patterns.numericTablePattern(line) ||
                       patterns.alignmentPattern(line);
    
    if (isTableLine) {
      if (!inTable) {
        // Start of a new table
        inTable = true;
        currentTableStart = i;
        consecutiveTableLines = 1;
      } else {
        // Continue existing table
        consecutiveTableLines++;
      }
    } else {
      if (inTable) {
        // Check if we've found a complete table
        if (consecutiveTableLines >= options.minRows) {
          tableRegions.push({
            startLine: currentTableStart,
            endLine: i - 1
          });
        }
        
        // Reset table detection
        inTable = false;
      }
    }
  }
  
  // Check if the last table extends to the end of the document
  if (inTable && consecutiveTableLines >= options.minRows) {
    tableRegions.push({
      startLine: currentTableStart,
      endLine: lines.length - 1
    });
  }
  
  return tableRegions;
}

/**
 * Format detected table into a standardized structure
 * Chooses appropriate formatting based on table characteristics
 * @param tableLines Lines of text representing a table
 * @returns Formatted table in markdown-compatible format
 */
function formatTableFromLines(tableLines: string[]): string {
  // Clean up the table lines
  const cleanLines = tableLines.map(line => line.trim()).filter(line => line.length > 0);
  
  // Detect if table uses delimiters
  const hasDelimiters = cleanLines.some(line => line.includes('|'));
  
  if (hasDelimiters) {
    // Format delimiter-based table
    return formatDelimiterTable(cleanLines);
  } else {
    // Format space-aligned table
    return formatSpaceAlignedTable(cleanLines);
  }
}

/**
 * Format a table that uses delimiter characters
 * Preserves existing delimiters while standardizing format
 * @param tableLines Lines of text with delimiter characters
 * @returns Markdown-formatted table
 */
function formatDelimiterTable(tableLines: string[]): string {
  // Start with table marker
  let formattedTable = '\n[TABLE]\n';
  
  // Process each line
  for (const line of tableLines) {
    // Skip separator lines (e.g., +----+----+)
    if (line.replace(/[\+\-\=]/g, '').trim().length === 0) {
      continue;
    }
    
    // Convert to standard pipe format
    let formattedLine = line
      .replace(/^\s*\|/, '|') // Ensure starting pipe
      .replace(/\|\s*$/, '|'); // Ensure ending pipe
      
    formattedTable += formattedLine + '\n';
  }
  
  formattedTable += '[/TABLE]\n';
  return formattedTable;
}

/**
 * Format a table that uses space alignment without explicit delimiters
 * Analyzes column positions and converts to pipe-delimited format
 * @param tableLines Lines of text with space-aligned columns
 * @returns Markdown-formatted table with explicit column delimiters
 */
function formatSpaceAlignedTable(tableLines: string[]): string {
  // Analyze column positions
  const columnPositions = detectColumnPositions(tableLines);
  
  // Start with table marker
  let formattedTable = '\n[TABLE]\n';
  
  // Process each line into a pipe-delimited format
  for (const line of tableLines) {
    if (line.trim().length === 0) continue;
    
    // Extract cells based on column positions
    let cells: string[] = [];
    let lastPos = 0;
    
    for (let i = 0; i < columnPositions.length; i++) {
      const pos = columnPositions[i];
      
      // Handle the last column
      if (i === columnPositions.length - 1) {
        cells.push(line.substring(lastPos).trim());
      } else {
        // Make sure we don't exceed the line length
        const endPos = pos > line.length ? line.length : pos;
        cells.push(line.substring(lastPos, endPos).trim());
        lastPos = endPos;
      }
    }
    
    // Add formatted row
    formattedTable += '| ' + cells.join(' | ') + ' |\n';
  }
  
  formattedTable += '[/TABLE]\n';
  return formattedTable;
}

/**
 * Detect column positions in a space-aligned table
 * Uses frequency analysis to find natural column boundaries
 * @param lines Array of text lines representing a table
 * @returns Array of character positions where columns begin
 */
function detectColumnPositions(lines: string[]): number[] {
  // Create a character frequency map to find column boundaries
  const charFrequency: number[] = [];
  const maxLineLength = Math.max(...lines.map(line => line.length));
  
  // Initialize the frequency array
  for (let i = 0; i < maxLineLength; i++) {
    charFrequency[i] = 0;
  }
  
  // Count spaces at each position
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        charFrequency[i]++;
      }
    }
  }
  
  // Find columns based on space frequency
  const columnPositions: number[] = [];
  let inSpace = false;
  const threshold = Math.floor(lines.length * 0.6); // 60% of lines should have space at this position
  
  for (let i = 0; i < maxLineLength; i++) {
    if (charFrequency[i] >= threshold) {
      if (!inSpace) {
        inSpace = true;
        columnPositions.push(i);
      }
    } else {
      inSpace = false;
    }
  }
  
  // Make sure we have at least one column break
  if (columnPositions.length === 0) {
    // Fallback: divide the line into equal segments
    const segments = 2; // Minimum number of columns
    const segmentWidth = Math.floor(maxLineLength / segments);
    
    for (let i = 1; i < segments; i++) {
      columnPositions.push(i * segmentWidth);
    }
  }
  
  // Always include start position
  columnPositions.unshift(0);
  
  return columnPositions;
}

/**
 * Extract tables from PDF using more advanced heuristics for scientific documents
 * Specifically targets tables with captions and formal structures
 * @param pdfText Text content extracted from PDF
 * @returns Enhanced text with formatted tables
 */
export function extractScientificPdfTables(pdfText: string): string {
  let enhancedText = pdfText;
  
  // Common scientific table patterns
  const tableHeaderPatterns = [
    /Table\s+\d+\s*[.:]\s*.+/g,  // "Table 1: Description"
    /TABLE\s+\d+\s*[.:]\s*.+/g,   // "TABLE 1: Description" 
    /Tab\.\s+\d+\s*[.:]\s*.+/g    // "Tab. 1: Description"
  ];
  
  // Find potential table captions
  let tableMatches: {index: number, caption: string}[] = [];
  
  tableHeaderPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(pdfText)) !== null) {
      tableMatches.push({
        index: match.index,
        caption: match[0]
      });
    }
  });
  
  // Sort by position in document
  tableMatches.sort((a, b) => a.index - b.index);
  
  // Process each detected table
  for (let i = 0; i < tableMatches.length; i++) {
    const currentMatch = tableMatches[i];
    const nextMatchIndex = (i < tableMatches.length - 1) ? 
                           tableMatches[i + 1].index : 
                           pdfText.length;
    
    // Extract content between this caption and the next one (or end of document)
    const tableContent = pdfText.substring(currentMatch.index, nextMatchIndex);
    
    // Apply table detection to this region
    const tableOptions: PdfTableOptions = {
      minRows: 2,
      minColumns: 2,
      lineThreshold: 3
    };
    
    const processedTableContent = detectTablesInPdfText(tableContent, tableOptions);
    
    // Replace the original content with the processed version
    enhancedText = enhancedText.replace(tableContent, processedTableContent);
  }
  
  return enhancedText;
}

/**
 * Extract tables from PowerPoint slide XML
 * Navigates complex XML structure to find and format tables
 * @param slideXml The XML structure of a PowerPoint slide
 * @returns Text representation of tables found in the slide
 */
export function extractTablesFromPptxSlide(slideXml: any): string {
  let tableText = '';
  
  try {
    if (slideXml && 
        slideXml['p:sld'] && 
        slideXml['p:sld']['p:cSld'] && 
        slideXml['p:sld']['p:cSld'][0]['p:spTree']) {
      
      const spTree = slideXml['p:sld']['p:cSld'][0]['p:spTree'][0];
      
      // Process graphic frames (which can contain tables)
      if (spTree['p:graphicFrame']) {
        for (const frame of spTree['p:graphicFrame']) {
          // Check if this frame contains a table
          if (frame['a:graphic'] && 
              frame['a:graphic'][0]['a:graphicData'] && 
              frame['a:graphic'][0]['a:graphicData'][0]['a:tbl']) {
            
            const table = frame['a:graphic'][0]['a:graphicData'][0]['a:tbl'][0];
            tableText += '\n[TABLE]\n';
            
            // Process table rows
            if (table['a:tr']) {
              for (const row of table['a:tr']) {
                const rowCells: string[] = [];
                
                // Process cells in this row
                if (row['a:tc']) {
                  for (const cell of row['a:tc']) {
                    let cellText = '';
                    
                    // Extract text from cell paragraphs
                    if (cell['a:txBody'] && cell['a:txBody'][0]['a:p']) {
                      for (const para of cell['a:txBody'][0]['a:p']) {
                        if (para['a:r']) {
                          for (const run of para['a:r']) {
                            if (run['a:t']) {
                              for (const textElement of run['a:t']) {
                                if (textElement !== undefined && textElement !== null) {
                                  cellText += textElement.toString();
                                }
                              }
                            }
                          }
                        }
                        cellText += ' ';
                      }
                    }
                    rowCells.push(cellText.trim());
                  }
                }
                
                // Add the row as a pipe-delimited string
                if (rowCells.length > 0) {
                  tableText += '| ' + rowCells.join(' | ') + ' |\n';
                }
              }
            }
            
            tableText += '[/TABLE]\n';
          }
        }
      }
      
      // Also check for tables in group shapes
      if (spTree['p:grpSp']) {
        for (const groupShape of spTree['p:grpSp']) {
          if (groupShape['p:graphicFrame']) {
            for (const frame of groupShape['p:graphicFrame']) {
              if (frame['a:graphic'] && 
                  frame['a:graphic'][0]['a:graphicData'] && 
                  frame['a:graphic'][0]['a:graphicData'][0]['a:tbl']) {
                
                const table = frame['a:graphic'][0]['a:graphicData'][0]['a:tbl'][0];
                tableText += '\n[TABLE]\n';
                
                // Process table rows
                if (table['a:tr']) {
                  for (const row of table['a:tr']) {
                    const rowCells: string[] = [];
                    
                    // Process cells in this row
                    if (row['a:tc']) {
                      for (const cell of row['a:tc']) {
                        let cellText = '';
                        
                        // Extract text from cell paragraphs
                        if (cell['a:txBody'] && cell['a:txBody'][0]['a:p']) {
                          for (const para of cell['a:txBody'][0]['a:p']) {
                            if (para['a:r']) {
                              for (const run of para['a:r']) {
                                if (run['a:t']) {
                                  for (const textElement of run['a:t']) {
                                    if (textElement !== undefined && textElement !== null) {
                                      cellText += textElement.toString();
                                    }
                                  }
                                }
                              }
                            }
                            cellText += ' ';
                          }
                        }
                        rowCells.push(cellText.trim());
                      }
                    }
                    
                    // Add the row as a pipe-delimited string
                    if (rowCells.length > 0) {
                      tableText += '| ' + rowCells.join(' | ') + ' |\n';
                    }
                  }
                }
                
                tableText += '[/TABLE]\n';
              }
            }
          }
        }
      }
    }
  } catch (error) {
    // Log error but continue processing
  }
  
  return tableText;
}
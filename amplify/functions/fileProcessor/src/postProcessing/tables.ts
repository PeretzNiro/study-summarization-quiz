/**
 * Table detection and formatting
 */

/**
 * Clean up pipe characters that don't represent actual tables
 */
export function cleanPipeArtifacts(content: string): string {
  // Don't touch lines that look like actual tables (multiple pipes)
  const tableLinePattern = /\|.*\|.*\|/;
  
  // Process the content line by line
  const lines = content.split('\n');
  const cleanLines = lines.map(line => {
    // If this looks like a table row, leave it alone
    if (tableLinePattern.test(line)) {
      return line;
    }
    
    // Otherwise clean up stray pipe characters
    return line.replace(/\s*\|\s*/g, ' ');
  });
  
  return cleanLines.join('\n');
}

/**
 * Detect and format basic tables from text with aligned columns
 */
export function detectSimpleTables(content: string): string {
  const lines = content.split('\n');
  let result = [];
  let inPotentialTable = false;
  let tableStart = -1;
  
  // Simple heuristic for table detection: multiple lines with similar patterns of whitespace
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      if (inPotentialTable) {
        // Check if we've found a table
        if (i - tableStart > 2) {
          // We have at least 3 lines that might be a table
          const tableLines = lines.slice(tableStart, i);
          result.push('[TABLE]');
          result.push(...formatAsTable(tableLines));
          result.push('[/TABLE]');
        } else {
          // Too few lines, just add them as is
          for (let j = tableStart; j < i; j++) {
            result.push(lines[j]);
          }
        }
        inPotentialTable = false;
      }
      result.push('');
      continue;
    }
    
    // Check if this line has evenly spaced content (potential table row)
    const spacingPattern = /\S+\s{2,}\S+/;
    if (spacingPattern.test(line) && line.split(/\s{2,}/).length > 1) {
      if (!inPotentialTable) {
        inPotentialTable = true;
        tableStart = i;
      }
    } else if (inPotentialTable) {
      // This line doesn't match table pattern
      if (i - tableStart > 2) {
        // We have at least 3 lines that might be a table
        const tableLines = lines.slice(tableStart, i);
        result.push('[TABLE]');
        result.push(...formatAsTable(tableLines));
        result.push('[/TABLE]');
      } else {
        // Too few lines, just add them as is
        for (let j = tableStart; j < i; j++) {
          result.push(lines[j]);
        }
      }
      inPotentialTable = false;
      result.push(line);
    } else {
      // Normal line
      result.push(line);
    }
  }
  
  // Check if we ended while in a potential table
  if (inPotentialTable && lines.length - tableStart > 2) {
    const tableLines = lines.slice(tableStart);
    result.push('[TABLE]');
    result.push(...formatAsTable(tableLines));
    result.push('[/TABLE]');
  } else if (inPotentialTable) {
    // Too few lines, just add them as is
    for (let j = tableStart; j < lines.length; j++) {
      result.push(lines[j]);
    }
  }
  
  return result.join('\n');
}

/**
 * Format detected table lines into a proper tabular structure
 */
export function formatAsTable(lines: string[]): string[] {
  // Find positions where columns likely start
  const columnPositions = detectColumnPositions(lines);
  
  // Format each line as a table row
  const formattedLines = lines.map(line => {
    if (!line.trim()) return '';
    
    const cells = [];
    let lastPos = 0;
    
    // Extract cells based on detected column positions
    for (let i = 1; i < columnPositions.length; i++) {
      const pos = columnPositions[i];
      if (pos <= line.length) {
        cells.push(line.substring(lastPos, pos).trim());
      } else {
        cells.push(line.substring(lastPos).trim());
        break;
      }
      lastPos = pos;
    }
    
    // If we haven't reached the end, add the rest
    if (lastPos < line.length) {
      cells.push(line.substring(lastPos).trim());
    }
    
    // Filter out empty cells and build a pipe-delimited row
    const nonEmptyCells = cells.filter(cell => cell);
    if (nonEmptyCells.length > 0) {
      return '| ' + nonEmptyCells.join(' | ') + ' |';
    }
    return '';
  });
  
  return formattedLines;
}

/**
 * Detect likely column positions based on character frequency
 */
export function detectColumnPositions(lines: string[]): number[] {
  const positions = [0]; // Always start with position 0
  
  // Only process non-empty lines
  const nonEmptyLines = lines.filter(line => line.trim());
  if (nonEmptyLines.length === 0) return positions;
  
  const maxLength = Math.max(...nonEmptyLines.map(line => line.length));
  
  // Find positions with multiple spaces
  for (const line of nonEmptyLines) {
    let inSpaces = false;
    let spaceStart = -1;
    
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ') {
        if (!inSpaces) {
          inSpaces = true;
          spaceStart = i;
        }
      } else {
        if (inSpaces && i - spaceStart >= 2) {
          // We found a chunk of spaces
          if (!positions.includes(i)) {
            positions.push(i);
          }
        }
        inSpaces = false;
      }
    }
  }
  
  // Sort positions
  positions.sort((a, b) => a - b);
  
  return positions;
}
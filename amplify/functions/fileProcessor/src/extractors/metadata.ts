/**
 * Metadata extraction utilities for documents
 */

/**
 * Extract course ID from text using regex
 */
export function extractCourseId(text: string): string {
  // Look for course ID patterns (e.g., COMP1234, CS101)
  const courseIdPattern = /\b([A-Z]{2,4})[-_\s]?(\d{3,4}[A-Z]?)\b/;
  const match = courseIdPattern.exec(text);
  
  if (match) {
    return `${match[1]}${match[2]}`;
  }
  
  // Alternative pattern for course codes like CS101
  const altPattern = /\b([A-Z]{2})[-_\s]?(\d{3})\b/;
  const altMatch = altPattern.exec(text);
  
  if (altMatch) {
    return `${altMatch[1]}${altMatch[2]}`;
  }
  
  return 'Unknown';
}

/**
 * Extract lecture ID from text using regex
 */
export function extractLectureId(text: string): string {
  // Look for lecture ID patterns (e.g., Lecture 5, Week 3)
  const lectureIdPattern = /\b(?:lecture|week|session|unit)\s+(\d+|[IVX]+)\b/i;
  const match = lectureIdPattern.exec(text);
  
  if (match) {
    const prefix = match[0].toLowerCase().startsWith('lecture') ? 'Lecture' :
                   match[0].toLowerCase().startsWith('week') ? 'Week' : 
                   match[0].toLowerCase().startsWith('session') ? 'Session' : 'Unit';
    
    return `${prefix} ${match[1]}`;
  }
  
  return 'Unknown';
}

/**
 * Determine difficulty level based on content
 */
export function determineDifficulty(text: string): string {
  // Count advanced terms/concepts to determine difficulty
  const lowerText = text.toLowerCase();
  
  // Define keyword lists for different difficulty levels with expanded technical terms
  const advancedKeywords = [
    'advanced', 'complex', 'challenging', 'difficult', 'complicated', 
    'analysis', 'evaluate', 'create', 'optimization', 'algorithm',
    'theorem', 'proof', 'equation', 'formulation', 'methodology',
    'implementation', 'computation', 'mathematical', 'statistical',
    'recursive', 'dimensional', 'vector', 'matrix', 'function',
    'derivative', 'integral', 'calculus', 'topology', 'heuristic'
  ];
  
  const intermediateKeywords = [
    'intermediate', 'moderate', 'medium', 'apply', 'implement', 
    'develop', 'procedure', 'process', 'technique', 'method',
    'approach', 'structure', 'system', 'framework', 'model',
    'concept', 'principle', 'theory', 'solution', 'problem'
  ];
  
  const basicKeywords = [
    'basic', 'beginner', 'introduction', 'simple', 'easy', 
    'remember', 'understand', 'describe', 'define', 'identify',
    'list', 'recognize', 'recall', 'outline', 'summarize',
    'explain', 'interpret', 'discuss', 'overview', 'fundamental'
  ];
  
  // Count occurrences
  let advancedCount = advancedKeywords.reduce(
    (count, word) => count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
  );
  
  const intermediateCount = intermediateKeywords.reduce(
    (count, word) => count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
  );
  
  const basicCount = basicKeywords.reduce(
    (count, word) => count + (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length, 0
  );
  
  // Check for mathematical formulas as an indicator of complexity
  const formulaIndicators = [
    '=', '+', '-', '*', '/', '^', '(', ')', '[', ']',
    'sqrt', 'log', 'exp', 'sin', 'cos', 'tan', 'min', 'max'
  ];
  
  // Count mathematical symbols
  const mathSymbolCount = formulaIndicators.reduce(
    (count, symbol) => count + (lowerText.match(new RegExp(`\\${symbol}`, 'g')) || []).length, 0
  );
  
  // Check for equation patterns like (1), (2), etc.
  const equationNumberCount = (lowerText.match(/\(\d+\)/g) || []).length;
  
  // Adjust advanced count based on mathematical content
  if (mathSymbolCount > 30 || equationNumberCount > 3) {
    advancedCount += Math.floor(mathSymbolCount / 10);
  }
  
  // Determine difficulty based on keyword counts
  const totalKeywordCount = advancedCount + intermediateCount + basicCount;
  
  // Calculate percentages to normalize for document length
  const advancedPercentage = totalKeywordCount > 0 ? (advancedCount / totalKeywordCount) * 100 : 0;
  const intermediatePercentage = totalKeywordCount > 0 ? (intermediateCount / totalKeywordCount) * 100 : 0;
  const basicPercentage = totalKeywordCount > 0 ? (basicCount / totalKeywordCount) * 100 : 0;
  
  // Technical presentations with math are inherently more complex
  if (mathSymbolCount > 50 || equationNumberCount > 5) {
    return 'Hard';
  }
  
  if (advancedPercentage > 40 || (advancedPercentage > 30 && mathSymbolCount > 20)) {
    return 'Hard';
  } else if (basicPercentage > 60 && mathSymbolCount < 10) {
    return 'Easy';
  } else {
    return 'Medium';
  }
}
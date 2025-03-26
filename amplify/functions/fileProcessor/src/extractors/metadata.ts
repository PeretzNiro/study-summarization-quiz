/**
 * Metadata extraction utilities for documents
 * Provides functions to derive structured information from lecture content
 */

/**
 * Extract course ID from text using regex patterns
 * Searches for standard academic course code formats
 * @param text Document content to analyze
 * @returns Extracted course ID or "Unknown" if not found
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
 * Extract lecture ID from text using regex patterns
 * Detects common lecture numbering formats in educational content
 * @param text Document content to analyze
 * @returns Formatted lecture identifier or "Unknown" if not found
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
 * Determine difficulty level based on content analysis
 * Specialized for computer science, mathematics, and software engineering content
 * @param text Document content to analyze
 * @returns Difficulty assessment as "Easy", "Medium", or "Hard"
 */
export function determineDifficulty(text: string): string {
  // Normalize and prepare text for analysis
  const lowerText = text.toLowerCase();
  const wordCount = lowerText.split(/\s+/).filter(word => word.length > 0).length;
  
  // ===== FACTOR 1: Domain-Specific Technical Terms =====
  
  // Basic terms that appear in introductory CS/Math courses
  const basicTerms = [
    'variable', 'function', 'loop', 'array', 'list', 'string', 'integer', 'boolean',
    'if-else', 'condition', 'input', 'output', 'print', 'class', 'object', 'method',
    'attribute', 'property', 'parameter', 'return', 'python', 'java', 'javascript',
    'compiler', 'interpreter', 'syntax', 'data type', 'operator', 'expression',
    'stack', 'queue', 'linked list', 'tree', 'sorting', 'searching'
  ];
  
  // Intermediate terms found in mid-level CS/Math courses
  const intermediateTerms = [
    'algorithm', 'recursion', 'data structure', 'complexity', 'binary tree', 'hash table',
    'graph', 'dynamic programming', 'object-oriented', 'inheritance', 'polymorphism',
    'encapsulation', 'exception', 'interface', 'abstract class', 'database', 'query',
    'vector', 'matrix', 'linear algebra', 'probability', 'statistics', 'calculus',
    'big o notation', 'optimization', 'concurrent', 'asynchronous', 'api', 'framework'
  ];
  
  // Advanced terms typically found in upper-level or graduate courses
  const advancedTerms = [
    'quantum', 'neural network', 'machine learning', 'artificial intelligence',
    'compiler design', 'distributed systems', 'parallel computing', 'cryptography',
    'formal verification', 'lambda calculus', 'automata theory', 'turing machine',
    'linear programming', 'computational geometry', 'np-complete', 'np-hard',
    'approximation algorithm', 'heuristic', 'tensor', 'differential equation',
    'stochastic process', 'markov chain', 'bayesian', 'eigenvalue', 'eigenvector',
    'multivariate statistics', 'numerical methods', 'blockchain', 'virtual machine'
  ];
  
  // Count occurrences of terms from each category
  const basicTermCount = basicTerms.reduce(
    (count, term) => count + (lowerText.includes(term) ? 1 : 0), 0
  );
  
  const intermediateTermCount = intermediateTerms.reduce(
    (count, term) => count + (lowerText.includes(term) ? 1 : 0), 0
  );
  
  const advancedTermCount = advancedTerms.reduce(
    (count, term) => count + (lowerText.includes(term) ? 1 : 0), 0
  );
  
  // Normalize by document length to get term density
  const basicDensity = (basicTermCount / wordCount) * 10000;
  const intermediateDensity = (intermediateTermCount / wordCount) * 10000; 
  const advancedDensity = (advancedTermCount / wordCount) * 10000;
  
  // ===== FACTOR 2: Context Analysis (Detect introductory vs. advanced material) =====
  const introductoryPhrases = [
    'introduction to', 'basics of', 'fundamentals of', 'getting started with',
    'beginning', 'elementary', 'first steps', 'primer', 'basic concepts',
    'learn how to', 'overview of', 'what is', 'understand'
  ];
  
  const advancedPhrases = [
    'advanced topics', 'in-depth', 'deep dive', 'complex', 'theoretical foundation',
    'graduate level', 'research perspective', 'state of the art', 'cutting edge',
    'specialized'
  ];
  
  // Check for introductory or advanced context indicators
  const hasIntroductoryContext = introductoryPhrases.some(phrase => lowerText.includes(phrase));
  const hasAdvancedContext = advancedPhrases.some(phrase => lowerText.includes(phrase));
  
  // ===== FACTOR 3: Mathematical Content Analysis =====
  // Mathematical symbols indicating complexity
  const mathSymbols = ['=', '+', '-', '*', '/', '^', '∫', '∂', '∑', 'θ', 'α', 'β', 'δ', 'Δ', 'ε', 'ƒ', '∏', '√', '≈', '≤', '≥', '±'];
  
  // Count math symbols
  const mathSymbolCount = mathSymbols.reduce(
    (count, symbol) => count + (lowerText.match(new RegExp(`\\${symbol}`, 'g')) || []).length, 0
  );
  
  // Formula detection patterns
  const formulaPatterns = [
    /f\(x\)/g, // function notation
    /\w+\([^)]+\)/g, // function calls with parameters
    /\b[a-z]_\d+\b/g, // subscripts like x_1
    /\b[a-z]\^\d+\b/g, // superscripts like x^2
  ];
  
  // Count formula occurrences
  let formulaCount = 0;
  for (const pattern of formulaPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) formulaCount += matches.length;
  }
  
  // Calculate math complexity density
  const mathDensity = ((mathSymbolCount + formulaCount) / wordCount) * 1000;
  
  // ===== FACTOR 4: Code Snippet Detection =====
  // Common code snippet markers
  const codeIndicators = [
    'def ', 'function ', 'class ', 'import ', 'from ', 'var ', 'let ', 'const ',
    'for(', 'while(', 'if(', 'else{', 'return ', '){', '};', '});', 
    'print(', 'console.log', 'System.out', 'cout <<', '#!/usr', '#include'
  ];
  
  // Check for presence of code examples
  const hasCodeExamples = codeIndicators.some(indicator => lowerText.includes(indicator));
  
  // Determine if document is programming-focused
  const programmingKeywords = ['code', 'program', 'programming', 'algorithm', 'implement'];
  const isProgrammingFocused = programmingKeywords.some(keyword => 
    lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g'))
  );
  
  // ===== Calculate final difficulty score with weighted factors =====
  
  // Base score using term density with appropriate weighting
  let difficultyScore = (
    (advancedDensity * 5) +      // Advanced terms increase difficulty significantly
    (intermediateDensity * 2) -  // Intermediate terms increase difficulty moderately
    (basicDensity * 0.5)         // Basic terms reduce difficulty slightly
  );
  
  // Apply contextual adjustments
  if (hasIntroductoryContext) {
    difficultyScore -= 20;  // Reduction for introductory material
  }
  
  if (hasAdvancedContext) {
    difficultyScore += 30;  // Significant increase for explicitly advanced material
  }
  
  // Factor in mathematical complexity
  difficultyScore += Math.min(30, mathDensity * 0.5);
  
  // Adjust for programming-focused content
  if (isProgrammingFocused && hasCodeExamples) {
    difficultyScore -= mathDensity * 0.3;  // Reduce impact of math for programming content
  }
  
  // Classify difficulty based on final score
  if (difficultyScore > 60) {
    return 'Hard';
  } else if (difficultyScore > 25) {
    return 'Medium';
  } else {
    return 'Easy';
  }
}
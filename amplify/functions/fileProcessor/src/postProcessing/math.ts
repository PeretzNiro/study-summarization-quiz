/**
 * Mathematical notation handling
 */

/**
 * Improve mathematical notation
 */
export function fixMathNotation(content: string): string {
  return content
    // Fix common math symbols
    .replace(/\$\$/g, '$')  // Double dollar signs to single
    .replace(/≈≈/g, '≈')    // Repeated approx symbols
    
    // Fix spacing around operators
    .replace(/(\d)\s*([+\-×÷=])\s*(\d)/g, '$1 $2 $3')
    
    // Fix fractions
    .replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2')
    
    // Clean superscript artifacts
    .replace(/\^\s*(\d+)/g, '^$1')
    
    // Fix subscripts
    .replace(/_\s*(\w+)/g, '_$1');
}

/**
 * Clean up repeated punctuation (common in PDF extraction errors)
 */
export function cleanRepeatedPunctuation(content: string): string {
  return content
    .replace(/([,.;:!?]){2,}/g, '$1')
    .replace(/"{2,}/g, '"')
    .replace(/'{2,}/g, "'");
}

/**
 * Identifies and enhances mathematical formulas
 */
export function enhanceMathematicalContent(content: string): string {
  let enhancedContent = content;
  
  // Common patterns in mathematical formulas
  const formulaPatterns = [
    /\b[a-zA-Z](_[a-zA-Z0-9]+)+\b/g,           // Subscripts like x_i
    /\b[a-zA-Z](\^[a-zA-Z0-9]+)+\b/g,          // Superscripts like x^2
    /\b[a-zA-Z](_[a-zA-Z0-9]+)(\^[a-zA-Z0-9]+)+\b/g, // Combined like x_i^2
    /\b[a-zA-Z](\^[a-zA-Z0-9]+)(_[a-zA-Z0-9]+)+\b/g  // Combined like x^2_i
  ];
  
  // Apply formatting to each pattern
  formulaPatterns.forEach(pattern => {
    enhancedContent = enhancedContent.replace(pattern, match => {
      // Format the formula with consistent spacing
      return `$${match}$`;
    });
  });
  
  // Greek letters
  enhancedContent = enhancedContent.replace(
    /\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)/g, 
    '[$1]'
  );
  
  // Try to detect equation blocks
  const lines = enhancedContent.split('\n');
  let result = [];
  let inFormula = false;
  let formulaBuffer = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for equation markers and formula patterns
    const isFormulaLine = (
      line.includes('=') && 
      !line.match(/^[\w\s]+:/) && // Not a field name (like "Title:")
      (line.match(/[+\-*/^()]/) || line.match(/\$\w+\$/)) // Has math operators or wrapped math terms
    );
    
    if (isFormulaLine) {
      if (!inFormula) {
        inFormula = true;
        formulaBuffer = [];
      }
      formulaBuffer.push(line);
    } else {
      if (inFormula) {
        // End formula block and add it to the result
        if (formulaBuffer.length > 0) {
          result.push('$$ ' + formulaBuffer.join(' ') + ' $$');
        }
        inFormula = false;
      }
      result.push(line);
    }
  }
  
  // Handle case where document ends with a formula
  if (inFormula && formulaBuffer.length > 0) {
    result.push('$$ ' + formulaBuffer.join(' ') + ' $$');
  }
  
  return result.join('\n');
}
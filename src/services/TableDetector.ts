interface TableRule {
  tableName: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  identifyingPatterns: {
    field: string;
    pattern?: RegExp;
    validator?: (value: any) => boolean;
  }[];
}

export interface DetectionResult {
  suggestedTable: string;
  confidence: number; // 0-100
  matchedFields: string[];
  missingFields: string[];
  reasoning: string;
}

export class TableDetector {
  private rules: TableRule[];
  
  constructor() {
    // Define rules for table detection
    this.rules = [
      {
        tableName: 'Course',
        description: 'Course information and metadata',
        requiredFields: ['courseID', 'title'],
        optionalFields: ['description', 'difficulty', 'duration'],
        identifyingPatterns: [
          { field: 'courseID', pattern: /^course-/ },
        ]
      },
      {
        tableName: 'Lecture',
        description: 'Lecture content within courses',
        requiredFields: ['courseID', 'lectureID', 'title'],
        optionalFields: ['content', 'summary', 'difficulty', 'duration'],
        identifyingPatterns: [
          { field: 'lectureID' },
          { field: 'content', validator: (val) => typeof val === 'string' && val.length > 50 }
        ]
      },
      {
        tableName: 'Quiz',
        description: 'Quiz questions for lectures',
        requiredFields: ['courseID', 'lectureID', 'question', 'options', 'answer'],
        optionalFields: ['explanation', 'difficulty'],
        identifyingPatterns: [
          { field: 'question' },
          { field: 'options', validator: (val) => Array.isArray(val) },
          { field: 'answer' }
        ]
      }
    ];
  }

  detectTable(jsonData: any): DetectionResult[] {
    // If array is provided, analyze first item
    const data = Array.isArray(jsonData) ? jsonData[0] : jsonData;
    
    if (!data || typeof data !== 'object') {
      return [];
    }
    
    const results: DetectionResult[] = [];
    
    // Check each rule against the data
    for (const rule of this.rules) {
      const dataKeys = Object.keys(data);
      
      // Check required fields
      const matchedRequiredFields = rule.requiredFields.filter(field => 
        dataKeys.includes(field) && data[field] !== undefined && data[field] !== null
      );
      
      const missingRequiredFields = rule.requiredFields.filter(field => 
        !dataKeys.includes(field) || data[field] === undefined || data[field] === null
      );
      
      // Check optional fields
      const matchedOptionalFields = rule.optionalFields.filter(field => 
        dataKeys.includes(field) && data[field] !== undefined && data[field] !== null
      );
      
      // Check identifying patterns
      const matchedPatterns = rule.identifyingPatterns.filter(pattern => {
        if (!dataKeys.includes(pattern.field)) return false;
        
        if (pattern.pattern) {
          return pattern.pattern.test(String(data[pattern.field]));
        }
        
        if (pattern.validator) {
          return pattern.validator(data[pattern.field]);
        }
        
        return true; // If no pattern or validator, just check field existence
      });
      
      // Calculate confidence score (0-100)
      let confidence = 0;
      
      // Required fields contribute 60% of confidence
      if (rule.requiredFields.length > 0) {
        confidence += 60 * (matchedRequiredFields.length / rule.requiredFields.length);
      }
      
      // Optional fields contribute 20% of confidence
      if (rule.optionalFields.length > 0) {
        confidence += 20 * (matchedOptionalFields.length / rule.optionalFields.length);
      }
      
      // Patterns contribute 20% of confidence
      if (rule.identifyingPatterns.length > 0) {
        confidence += 20 * (matchedPatterns.length / rule.identifyingPatterns.length);
      }
      
      // Round confidence to nearest whole number
      confidence = Math.round(confidence);
      
      // Build reasoning text
      let reasoning = `${matchedRequiredFields.length} of ${rule.requiredFields.length} required fields present`;
      if (matchedOptionalFields.length) {
        reasoning += `, ${matchedOptionalFields.length} optional fields matched`;
      }
      if (matchedPatterns.length) {
        reasoning += `, ${matchedPatterns.length} identifying patterns matched`;
      }
      
      results.push({
        suggestedTable: rule.tableName,
        confidence,
        matchedFields: [...matchedRequiredFields, ...matchedOptionalFields],
        missingFields: missingRequiredFields,
        reasoning
      });
    }
    
    // Sort by confidence (descending)
    return results.sort((a, b) => b.confidence - a.confidence);
  }

  validateForTable(data: any, tableName: string): { isValid: boolean; missingFields: string[] } {
    const rule = this.rules.find(r => r.tableName === tableName);
    
    if (!rule) {
      return { isValid: false, missingFields: [] };
    }
    
    const singleData = Array.isArray(data) ? data[0] : data;
    const dataKeys = Object.keys(singleData);
    const missingFields = rule.requiredFields.filter(field => 
      !dataKeys.includes(field) || singleData[field] === undefined || singleData[field] === null
    );
    
    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  getTableSchema(tableName: string): { requiredFields: string[], optionalFields: string[] } | null {
    const rule = this.rules.find(r => r.tableName === tableName);
    if (!rule) return null;
    
    return {
      requiredFields: rule.requiredFields,
      optionalFields: rule.optionalFields
    };
  }
}

export default new TableDetector();
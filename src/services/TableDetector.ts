/**
 * Result structure for table detection analysis
 */
export interface DetectionResult {
  suggestedTable: string;     // Name of the detected table
  confidence: number;         // Confidence score (0-100%)
  matchedFields: string[];    // Fields present in both input and table schema
  missingFields: string[];    // Fields defined in schema but missing in input
  reasoning: string;          // Explanation for the suggestion
}

/**
 * Utility class for analyzing data structure and determining appropriate DynamoDB tables
 * Used for automatic table detection and data validation in the admin interface
 */
export class TableDetector {
  // Define the structure of each table in the database schema
  private static tableDefinitions = {
    Course: {
      fields: ["courseId", "title", "description", "difficulty"],
      requiredFields: ["courseId"]
    },
    Lecture: {
      fields: ["courseId", "lectureId", "title", "content", "summary", "difficulty", "duration"],
      requiredFields: ["courseId", "lectureId"]
    },
    Quiz: {
      fields: ["courseId", "lectureId", "quizId", "title", "questionIds", "passingScore", "difficulty", "order", "isPersonalized"],
      requiredFields: ["courseId", "lectureId", "quizId", "title"]
    },
    QuizQuestion: {
      fields: ["courseId", "lectureId", "question", "options", "answer", "explanation", "difficulty", "topicTag"],
      requiredFields: ["courseId", "lectureId", "question", "options", "answer", "difficulty"]
    },
    UserProgress: {
      fields: ["userId", "courseId", "lectureId", "completedLectures", "quizScores", "lastAccessed"],
      requiredFields: ["userId", "courseId", "lectureId", "lastAccessed"]
    }
  };
  
  /**
   * Analyzes a JSON object and suggests matching database tables
   * @param json The JSON object to analyze
   * @returns Array of possible table matches with confidence scores, sorted by confidence
   */
  static detectTable(json: any): DetectionResult[] {
    const results: DetectionResult[] = [];
    
    // Check each table definition against the JSON
    Object.entries(this.tableDefinitions).forEach(([tableName, definition]) => {
      const { fields, requiredFields } = definition;
      
      // Check if all required fields exist
      const missingRequiredFields = requiredFields.filter(
        field => !json.hasOwnProperty(field)
      );
      
      // Only suggest tables where all required fields are present
      if (missingRequiredFields.length === 0) {
        // Find matched fields
        const matchedFields = fields.filter(field => json.hasOwnProperty(field));
        const missingFields = fields.filter(field => !matchedFields.includes(field));
        
        // Calculate confidence as percentage of matching fields
        const confidence = Math.round(
          (matchedFields.length / fields.length) * 100
        );
        
        let reasoning = `Object contains required fields for ${tableName} table.`;
        
        // Add to results
        results.push({
          suggestedTable: tableName,
          confidence: confidence,
          reasoning: reasoning,
          matchedFields: matchedFields,
          missingFields: missingFields
        });
      }
    });
    
    // Sort by confidence (highest first)
    return results.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Validates an object against a specific table schema
   * @param json The object to validate
   * @param tableName The target table name
   * @returns Validation result with missing required fields
   */
  static validateForTable(json: any, tableName: string): { isValid: boolean, missingFields: string[] } {
    const tableDefinition = this.tableDefinitions[tableName as keyof typeof this.tableDefinitions];
    
    if (!tableDefinition) {
      return { isValid: false, missingFields: ['Table not found'] };
    }
    
    const { requiredFields } = tableDefinition;
    const missingFields = requiredFields.filter(field => !json.hasOwnProperty(field));
    
    return {
      isValid: missingFields.length === 0,
      missingFields: missingFields
    };
  }
  
  /**
   * Retrieves the schema definition for a specific table
   * @param tableName The name of the table
   * @returns The table schema or null if table doesn't exist
   */
  static getTableSchema(tableName: string): { fields: string[], requiredFields: string[] } | null {
    const tableDefinition = this.tableDefinitions[tableName as keyof typeof this.tableDefinitions];
    if (!tableDefinition) return null;
    
    return {
      fields: tableDefinition.fields,
      requiredFields: tableDefinition.requiredFields
    };
  }
}
export interface DetectionResult {
  suggestedTable: string;
  confidence: number; // 0-100
  matchedFields: string[];
  missingFields: string[];
  reasoning: string;
}

export class TableDetector {
  // Define the structure of each table
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
        
        // Calculate true percentage confidence
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
  
  // Add this to your existing TableDetector class

  static getTableSchema(tableName: string): { fields: string[], requiredFields: string[] } | null {
    const tableDefinition = this.tableDefinitions[tableName as keyof typeof this.tableDefinitions];
    if (!tableDefinition) return null;
    
    return {
      fields: tableDefinition.fields,
      requiredFields: tableDefinition.requiredFields
    };
  }
}
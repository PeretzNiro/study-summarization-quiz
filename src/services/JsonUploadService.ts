import { generateClient } from "aws-amplify/api";
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from "../../amplify/data/resource";

/**
 * Result interface for JSON upload operations
 */
export interface UploadResult {
  success: boolean;           // Whether the upload was successful
  message: string;            // Human-readable result message
  records?: any[];            // Successfully uploaded records
  errors?: any;               // Any errors encountered during upload
  data?: any;                 // Additional result data
}

/**
 * Service for uploading JSON data to DynamoDB tables via Amplify API
 */
export class JsonUploadService {
  /**
   * Gets an authenticated API client using the current user session
   * @returns Authenticated API client or default client if authentication fails
   */
  private async getAuthenticatedClient() {
    try {
      const { tokens } = await fetchAuthSession();
      return generateClient<Schema>({
        authMode: 'userPool',
        authToken: tokens?.idToken?.toString()
      });
    } catch (error) {
      console.error('Error getting authenticated client:', error);
      // Fall back to regular client if authentication fails
      return generateClient<Schema>();
    }
  }

  /**
   * Uploads JSON data to a specified DynamoDB table
   * @param tableName The target table name (Course, Lecture, Quiz, etc.)
   * @param jsonData JSON data to upload (single object or array of objects)
   * @returns Upload result with success status and details
   */
  async uploadToTable(tableName: string, jsonData: any): Promise<UploadResult> {
    try {
      // Ensure we have an array of records
      const records = Array.isArray(jsonData) ? jsonData : [jsonData];
      
      if (records.length === 0) {
        return {
          success: false,
          message: 'No records to upload'
        };
      }
      
      const results = [];
      const errors = [];
      
      // Process each record individually to handle partial success
      for (const record of records) {
        try {
          const result = await this.saveRecord(tableName, record);
          results.push(result);
        } catch (err: any) {
          console.error(`Error uploading record:`, err);
          errors.push({
            record,
            error: err.message || 'Unknown error'
          });
        }
      }
      
      // Return appropriate result based on success/failure count
      if (errors.length > 0) {
        return {
          success: false,
          message: `Uploaded ${results.length} records with ${errors.length} errors`,
          records: results,
          errors
        };
      }
      
      return {
        success: true,
        message: `Successfully uploaded ${results.length} records`,
        data: results
      };
    } catch (error: any) {
      console.error('Upload error:', error);
      return {
        success: false,
        message: error.message || 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Saves a single record to the specified table
   * @param tableName The target table name
   * @param data The record data to save
   * @returns The created record
   */
  private async saveRecord(tableName: string, data: any): Promise<any> {
    try {
      // Get authenticated client for this operation
      const client = await this.getAuthenticatedClient();
      
      // Route to the appropriate model based on table name
      switch (tableName) {
        case 'Course':
          return await client.models.Course.create(data);
        case 'Lecture':
          return await client.models.Lecture.create(data);
        case 'Quiz':
          return await client.models.Quiz.create(data);
        case 'QuizQuestion':
          return await client.models.QuizQuestion.create(data);
        case 'UserProgress':
          return await client.models.UserProgress.create(data);
        default:
          throw new Error(`Unknown table: ${tableName}`);
      }
    } catch (error: any) {
      // Log error details for debugging but rethrow for handling upstream
      console.error(`Error saving to ${tableName}:`, error);
      
      // Extract and log AWS-specific error details if available
      if (error.errors) {
        console.error("AWS Error details:", JSON.stringify(error.errors));
      }
      throw error;
    }
  }
}

// Export a singleton instance for application-wide use
export default new JsonUploadService();
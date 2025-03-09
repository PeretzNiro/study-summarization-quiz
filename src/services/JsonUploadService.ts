import { generateClient } from "aws-amplify/api";
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Schema } from "../../amplify/data/resource";

export interface UploadResult {
  success: boolean;
  message: string;
  records?: any[];
  errors?: any;
  data?: any;
}

export class JsonUploadService {
  // Add this method to get an authenticated client
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
      
      // Process each record
      for (const record of records) {
        try {
          // Use dynamic table name
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
  
  private async saveRecord(tableName: string, data: any): Promise<any> {
    try {
      // Get authenticated client for this operation
      const client = await this.getAuthenticatedClient();
      
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
      console.error(`Error saving to ${tableName}:`, error);
      // If there's an AWS error object with additional details, log it
      if (error.errors) {
        console.error("AWS Error details:", JSON.stringify(error.errors));
      }
      throw error; // Re-throw to handle in the calling function
    }
  }
}

export default new JsonUploadService();
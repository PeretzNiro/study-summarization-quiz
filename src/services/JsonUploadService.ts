import { generateClient } from "aws-amplify/api";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

export interface UploadResult {
  success: boolean;
  message: string;
  records?: any[];
  errors?: any;
}

export class JsonUploadService {
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
        message: `Successfully uploaded ${results.length} records to ${tableName}`,
        records: results
      };
    } catch (err: any) {
      console.error('Error in uploadToTable:', err);
      return {
        success: false,
        message: err.message || 'Error uploading data'
      };
    }
  }
  
  private async saveRecord(tableName: string, data: any): Promise<any> {
    // Use the client to dynamically access the table
    switch (tableName) {
      case 'Course':
        return await client.models.Course.create(data);
      case 'Lecture':
        return await client.models.Lecture.create(data);
      case 'Quiz':
        return await client.models.Quiz.create(data);
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  }
}

export default new JsonUploadService();
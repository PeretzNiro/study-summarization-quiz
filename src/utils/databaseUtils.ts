import { generateClient } from 'aws-amplify/api';
import type { Schema } from '../../amplify/data/resource';
import { TableDetector } from '../services/TableDetector';

const client = generateClient<Schema>();

/**
 * Check if a record with the same required fields already exists in the database
 * @param tableName The table to check against
 * @param data The record data to check
 * @returns The existing record if found, null otherwise
 */
export async function checkForDuplicates(tableName: string, data: any): Promise<any> {
  try {
    // Get the required fields for the table
    const tableDefinition = TableDetector.getTableSchema(tableName);
    
    if (!tableDefinition) {
      console.error(`Table definition not found for ${tableName}`);
      return null;
    }
    
    // Build a filter based on required fields
    const filters: Record<string, any> = {};
    tableDefinition.requiredFields.forEach(field => {
      if (data[field]) {
        filters[field] = { eq: data[field] };
      }
    });
    
    // If we don't have any filters, we can't check for duplicates
    if (Object.keys(filters).length === 0) {
      return null;
    }
    
    // Build the filter object for the query
    const filter = Object.keys(filters).length > 1
      ? { and: Object.entries(filters).map(([key, value]) => ({ [key]: value })) }
      : filters;
    
    // Query the database
    let result;
    switch (tableName) {
      case 'Course':
        result = await client.models.Course.list({ filter });
        break;
      case 'Lecture':
        result = await client.models.Lecture.list({ filter });
        break;
      case 'Quiz':
        result = await client.models.Quiz.list({ filter });
        break;
      case 'QuizQuestion':
        result = await client.models.QuizQuestion.list({ filter });
        break;
      case 'UserProgress':
        result = await client.models.UserProgress.list({ filter });
        break;
      default:
        console.error(`Unknown table: ${tableName}`);
        return null;
    }
    
    // Return the first match if any
    return result?.data && result.data.length > 0 ? result.data[0] : null;
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    throw error;
  }
}

/**
 * Update an existing record with new data
 * @param tableName The table containing the record
 * @param existingRecord The existing record to update
 * @param newData The new data to apply
 * @returns The updated record
 */
export async function updateRecord(tableName: string, existingRecord: any, newData: any): Promise<any> {
  try {
    // Merge existing record with new data
    const updateData = {
      id: existingRecord.id,
      ...newData
    };
    
    // Update the record
    switch (tableName) {
      case 'Course':
        return await client.models.Course.update(updateData);
      case 'Lecture':
        return await client.models.Lecture.update(updateData);
      case 'Quiz':
        return await client.models.Quiz.update(updateData);
      case 'QuizQuestion':
        return await client.models.QuizQuestion.update(updateData);
      case 'UserProgress':
        return await client.models.UserProgress.update(updateData);
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
  } catch (error) {
    console.error('Error updating record:', error);
    throw error;
  }
}
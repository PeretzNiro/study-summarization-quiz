import { defineFunction } from "@aws-amplify/backend";

/**
 * Data Processor Lambda function definition
 * 
 * This function processes lecture data after file processing,
 * triggers the summarization process, and handles DynamoDB stream events.
 * It serves as the coordination point between file uploads and AI processing.
 */
export const dataProcessor = defineFunction({
  name: 'data-processor-function',
  entry: './handler.ts',        // Path to the implementation code
  resourceGroupName: "storage", // Logical grouping for related resources
  timeoutSeconds: 300,          // Extended timeout for complex processing tasks
});
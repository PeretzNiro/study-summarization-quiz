import { defineFunction } from "@aws-amplify/backend";

/**
 * File Processor Lambda function definition
 * 
 * This function processes uploaded files from the S3 bucket:
 * - Extracts content from various document formats (PDF, DOCX, etc.)
 * - Passes structured data to the Data Processor for further handling
 * - Handles S3 event notifications triggered on file uploads
 */
export const fileProcessor = defineFunction({
  name: 'fileProcessor',        // Resource identifier
  entry: './handler.ts',        // Implementation code location
  resourceGroupName: "storage", // Logical grouping for related resources
  timeoutSeconds: 300,          // Extended timeout for processing large files
  memoryMB: 1024,               // Increased memory for document parsing operations
  environment: {
    // Reference to the next function in the processing pipeline
    DATA_PROCESSOR_FUNCTION_NAME: process.env.DATA_PROCESSOR_FUNCTION_NAME || '',
  },
  runtime: 16,                  // Node.js runtime version
});
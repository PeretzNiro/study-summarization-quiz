import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * Summarization Lambda function resource definition
 * 
 * Creates an AI-powered content summarization service with appropriate 
 * configurations for memory allocation and execution time limits
 */
export const summarization = defineFunction({
    name: 'summarization',              // Function name in AWS
    entry: './handler.ts',              // Main entry point file
    resourceGroupName: 'storage',       // Logical grouping of resources
    timeoutSeconds: 300,                // 5-minute timeout for processing large documents
    memoryMB: 1024,                     // 1GB memory allocation for AI processing
    environment: {
        GEMINI_API_KEY: secret('Gemini-API')  // Securely access Google Gemini API
    }
});
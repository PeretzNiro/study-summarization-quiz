/**
 * Quiz Generator Lambda function resource definition
 * 
 * Defines the quiz generation Lambda function with appropriate configurations
 * for memory, timeout, and environment variables needed for AI-powered quiz creation.
 */

import { defineFunction, secret } from "@aws-amplify/backend";

export const quizGenerator = defineFunction({
    name: 'quiz-generator',               // Function name in AWS 
    entry: './handler.ts',                // Entry point file
    resourceGroupName: 'storage',         // Logical grouping of resources
    timeoutSeconds: 300,                  // Allows 5 minutes for quiz generation
    memoryMB: 1024,                       // 1GB memory allocation for AI processing
    environment: {
        GEMINI_API_KEY: secret('Gemini-API')  // Securely access Google Gemini API
    }
});
import { defineFunction, secret } from "@aws-amplify/backend";

export const quizGenerator = defineFunction({
    name: 'quiz-generator',
    entry: './handler.ts',
    resourceGroupName: 'storage',
    timeoutSeconds: 300,
    memoryMB: 1024,
    environment: {
        GEMINI_API_KEY: secret('Gemini-API')
    }
});
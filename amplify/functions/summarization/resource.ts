import { defineFunction, secret } from "@aws-amplify/backend";

export const summarization = defineFunction({
    name: 'summarization',
    entry: './handler.ts',
    resourceGroupName: 'storage',
    timeoutSeconds: 300,
    memoryMB: 1024,
    environment: {
        GEMINI_API_KEY: secret('Gemini-API')
    }
});
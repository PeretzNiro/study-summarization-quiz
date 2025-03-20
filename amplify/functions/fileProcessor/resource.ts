import { defineFunction } from "@aws-amplify/backend";

export const fileProcessor = defineFunction({
  name: 'fileProcessor',
  entry: './handler.ts',
  resourceGroupName: "storage",
  timeoutSeconds: 300,
  memoryMB: 1024,
  environment: {
    DATA_PROCESSOR_FUNCTION_NAME: process.env.DATA_PROCESSOR_FUNCTION_NAME || '',
  },
  runtime: 16,
});
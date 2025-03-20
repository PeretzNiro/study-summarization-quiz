import { defineFunction } from "@aws-amplify/backend";

export const dataProcessor = defineFunction({
  name: 'data-processor-function',
  entry: './handler.ts',
  resourceGroupName: "storage",
  timeoutSeconds: 300,
});
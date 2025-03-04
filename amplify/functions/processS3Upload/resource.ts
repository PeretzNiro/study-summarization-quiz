import { defineFunction } from '@aws-amplify/backend';

export const processS3Upload = defineFunction({
    name: 'processS3Upload',
    entry: './handler.ts',
    bundling: {
        minify: true,
    },
    timeoutSeconds: 60,
    resourceGroupName: 'storage', // Connect to storage stack
});
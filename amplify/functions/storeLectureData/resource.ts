import { defineFunction } from '@aws-amplify/backend';

export const storeLectureData = defineFunction({
    name: 'storeLectureData',
    entry: './handler.ts',
    bundling: {
        minify: true,
    },
    timeoutSeconds: 60,
    resourceGroupName: 'data', // Connect to data stack
});
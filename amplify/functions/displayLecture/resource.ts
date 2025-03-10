import { defineFunction } from '@aws-amplify/backend';

export const displayLecture = defineFunction({
    name: 'displayLecture',
    entry: './handler.ts',
    bundling: {
        minify: true,
    },
    timeoutSeconds: 60,
    resourceGroupName: 'data',
});

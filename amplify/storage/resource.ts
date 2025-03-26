import { defineStorage } from '@aws-amplify/backend';

/**
 * S3 storage configuration for lecture materials
 * 
 * This creates an S3 bucket with access rules that:
 * - Set 'lectures' as the primary storage resource for the application
 * - Restrict write access to admin users only
 * - Allow the FileProcessor Lambda function to process uploaded files
 * - Uses the 'protected/' prefix to ensure proper authentication
 */
export const lectures = defineStorage({
  name: 'lectures',             // Resource identifier used throughout the app
  isDefault: true,              // Makes this the default storage bucket
  access: (allow) => ({
    'protected/*': [
      allow.groups(['Admins']).to(['read', 'write', 'delete']), // Only admins can manage files
    ],
  })
});
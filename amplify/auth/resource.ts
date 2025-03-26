import { defineAuth } from '@aws-amplify/backend';

/**
 * Authentication configuration for the application
 * 
 * This defines the Cognito User Pool settings with:
 * - Email-based authentication (username is email address)
 * - An 'Admins' user group for role-based access control
 * 
 * Users in the 'Admins' group have access to administrative 
 * features like content management and approval workflows.
 * 
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  groups: ['Admins'],
});

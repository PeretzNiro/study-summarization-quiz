import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flex, Loader, Text, Alert } from '@aws-amplify/ui-react';

/**
 * Protected route component that restricts access to admin users only
 * Handles authentication state, loading states, and access control
 */
const AdminRoute = () => {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center" padding="2rem">
        <Loader size="large" />
        <Text marginTop="1rem">Checking permissions...</Text>
      </Flex>
    );
  }

  // Redirect unauthenticated users to home
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Show access denied for authenticated but non-admin users
  if (!isAdmin) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center" padding="2rem">
        <Alert className='radius-s' variation="error" heading="Access Denied">
          <Text fontWeight="bold">
            You do not have permission to access this page.
          </Text>
          <Text marginTop="1rem">
            This area is restricted to admin users only.
          </Text>
        </Alert>
      </Flex>
    );
  }

  // Render child routes when user is authenticated and has admin privileges
  return <Outlet />;
};

export default AdminRoute;
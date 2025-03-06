import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Flex, Loader, Text, Alert } from '@aws-amplify/ui-react';

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

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center" padding="2rem">
        <Alert variation="error" heading="Access Denied">
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

  // Allow access for admin users
  return <Outlet />;
};

export default AdminRoute;
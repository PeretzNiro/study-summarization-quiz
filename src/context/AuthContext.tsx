import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

interface AuthContextType {
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string;
  displayName: string;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  isAuthenticated: false,
  isLoading: true,
  username: '',
  displayName: ''
});

// In your AuthProvider component

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authStatus, user } = useAuthenticator((context) => [context.authStatus, context.user]);
  
  // Get initial values from sessionStorage to prevent UI flicker
  const storedIsAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const storedUsername = sessionStorage.getItem('username') || '';
  const storedDisplayName = sessionStorage.getItem('displayName') || '';

  // Initialize with stored values to prevent UI flicker
  const [isAdmin, setIsAdmin] = useState<boolean>(storedIsAdmin);
  const [isLoading, setIsLoading] = useState<boolean>(!storedIsAdmin && authStatus === 'authenticated');
  const [username, setUsername] = useState<string>(storedUsername);
  const [displayName, setDisplayName] = useState<string>(storedDisplayName);

  useEffect(() => {
    async function checkUserRole() {
      try {
        // Handle unauthenticated state
        if (authStatus !== 'authenticated') {
          setIsAdmin(false);
          setIsLoading(false);
          // Clear session storage on logout
          sessionStorage.removeItem('isAdmin');
          sessionStorage.removeItem('username');
          sessionStorage.removeItem('displayName');
          sessionStorage.removeItem('currentUser');
          return;
        }

        // Check if this is the same user and we already have admin info
        const cachedUser = sessionStorage.getItem('currentUser');
        const hasStoredAdminStatus = sessionStorage.getItem('isAdmin') !== null;
        
        if (cachedUser && authStatus === 'authenticated' && hasStoredAdminStatus) {
          // Use cached data immediately (UI won't show loading state)
          setIsLoading(false);
        } else {
          // No cached data, show loading state
          setIsLoading(true);
        }

        // Get user attributes
        const userAttributes = await fetchUserAttributes();
        const email = userAttributes.email || '';
        
        // Format display name
        const rawName = email.split('@')[0] || '';
        if (rawName) {
          const formatted = rawName.charAt(0).toUpperCase() + rawName.slice(1);
          setDisplayName(formatted);
          sessionStorage.setItem('displayName', formatted);
        }
        
        // Save user info
        setUsername(email);
        sessionStorage.setItem('username', email);
        sessionStorage.setItem('currentUser', email);
        
        // Check for admin status in the token
        const session = await fetchAuthSession();
        const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] || [];
        const userIsAdmin = groups.includes('Admins');
        
        // Update state and storage
        setIsAdmin(userIsAdmin);
        sessionStorage.setItem('isAdmin', userIsAdmin ? 'true' : 'false');
        
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        sessionStorage.setItem('isAdmin', 'false');
      } finally {
        // Clear loading state
        setIsLoading(false);
      }
    }
    
    checkUserRole();
  }, [authStatus, user]);

  return (
    <AuthContext.Provider value={{ 
      isAdmin, 
      isAuthenticated: authStatus === 'authenticated', 
      isLoading,
      username,
      displayName
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
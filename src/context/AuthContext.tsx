import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

interface AuthContextType {
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string;
  displayName: string;
  signOut: () => void;
  checkUserRole: () => Promise<void>;
  getAuthToken: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextType>({
  isAdmin: false,
  isAuthenticated: false,
  isLoading: true,
  username: '',
  displayName: '',
  signOut: () => {},
  checkUserRole: async () => {},
  getAuthToken: async () => undefined
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authStatus, user, signOut } = useAuthenticator((context) => [
    context.authStatus, 
    context.user,
    context.signOut
  ]);
  
  // Get initial values from sessionStorage to prevent UI flicker
  const storedIsAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const storedUsername = sessionStorage.getItem('username') || '';
  const storedDisplayName = sessionStorage.getItem('displayName') || '';

  // Initialize with stored values to prevent UI flicker
  const [isAdmin, setIsAdmin] = useState<boolean>(storedIsAdmin);
  const [isLoading, setIsLoading] = useState<boolean>(!storedIsAdmin && authStatus === 'authenticated');
  const [username, setUsername] = useState<string>(storedUsername);
  const [displayName, setDisplayName] = useState<string>(storedDisplayName);

  // Method to check user role
  const checkUserRole = async () => {
    if (authStatus !== 'authenticated' || !user) {
      // Clear stored values when not authenticated
      setIsAdmin(false);
      setUsername('');
      setDisplayName('');
      sessionStorage.removeItem('isAdmin');
      sessionStorage.removeItem('username');
      sessionStorage.removeItem('displayName');
      sessionStorage.removeItem('currentUser');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get user details from Cognito
      const userAttributes = await fetchUserAttributes();
      const email = userAttributes.email || user.username || '';
      
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
      setIsLoading(false);
    }
  };
  
  // Method to get auth token (useful for authenticated API calls)
  const getAuthToken = async (): Promise<string | undefined> => {
    try {
      const { tokens } = await fetchAuthSession();
      return tokens?.idToken?.toString();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return undefined;
    }
  };

  useEffect(() => {
    checkUserRole();
  }, [authStatus, user]);

  return (
    <AuthContext.Provider value={{ 
      isAdmin, 
      isAuthenticated: authStatus === 'authenticated', 
      isLoading,
      username,
      displayName,
      signOut,
      checkUserRole,
      getAuthToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
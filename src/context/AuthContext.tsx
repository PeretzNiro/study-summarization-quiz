import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';

/**
 * Type definition for the authentication context
 */
interface AuthContextType {
  isAdmin: boolean;           // Whether the current user has admin privileges
  isAuthenticated: boolean;   // Whether the user is currently authenticated
  isLoading: boolean;         // Whether authentication data is being loaded
  username: string;           // User's email or username
  displayName: string;        // Formatted display name for UI
  signOut: () => void;        // Function to sign the user out
  checkUserRole: () => Promise<void>; // Function to refresh the user's role
  getAuthToken: () => Promise<string | undefined>; // Function to retrieve the auth token
}

// Create context with default values
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

/**
 * Authentication provider component that manages user state
 * and provides authentication context to child components
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authStatus, user, signOut } = useAuthenticator((context) => [
    context.authStatus, 
    context.user,
    context.signOut
  ]);
  
  // Get initial values from sessionStorage to prevent UI flicker during page refresh
  const storedIsAdmin = sessionStorage.getItem('isAdmin') === 'true';
  const storedUsername = sessionStorage.getItem('username') || '';
  const storedDisplayName = sessionStorage.getItem('displayName') || '';

  // Initialize state with stored values
  const [isAdmin, setIsAdmin] = useState<boolean>(storedIsAdmin);
  const [isLoading, setIsLoading] = useState<boolean>(!storedIsAdmin && authStatus === 'authenticated');
  const [username, setUsername] = useState<string>(storedUsername);
  const [displayName, setDisplayName] = useState<string>(storedDisplayName);

  /**
   * Checks the user's role and updates authentication state
   * Gets called on login, logout, and authentication state changes
   */
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
      
      // Format display name from email (capitalize first letter of username part)
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
      
      // Check for admin status in the token's cognito groups
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
  
  /**
   * Retrieves the current authentication token for API calls
   * @returns The ID token or undefined if not authenticated
   */
  const getAuthToken = async (): Promise<string | undefined> => {
    try {
      const { tokens } = await fetchAuthSession();
      return tokens?.idToken?.toString();
    } catch (error) {
      console.error('Error getting auth token:', error);
      return undefined;
    }
  };

  // Check user role whenever authentication status changes
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

/**
 * Custom hook for accessing authentication context
 * @returns Authentication context value
 */
export const useAuth = () => useContext(AuthContext);
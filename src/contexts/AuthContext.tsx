import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { authApi, getAccessToken, setAccessToken, ApiError } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Sanitize input to prevent XSS attacks
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>"'&]/g, '')
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Map backend user to frontend User type
 */
function mapApiUserToUser(apiUser: {
  id: number;
  username: string;
  email: string;
  name: string;
  role: string;
  status: string;
  last_login?: string;
}): User {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    email: apiUser.email,
    username: apiUser.username,
    role: (apiUser.role as 'admin' | 'supervisor' | 'agent') || 'agent',
    status: apiUser.status as 'active' | 'inactive',
    lastLogin: apiUser.last_login || new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Check if we have a stored token
        const token = getAccessToken();
        
        if (token) {
          try {
            // Validate token with API
            const apiUser = await authApi.getCurrentUser();
            setUser(mapApiUserToUser(apiUser));
          } catch {
            // Token invalid, clear it
            setAccessToken(null);
          }
        }

      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for logout events from API
    const handleLogout = () => {
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = useCallback(async (
    username: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> => {

    // Sanitize inputs
    const sanitizedUsername = sanitizeInput(username);
    const sanitizedPassword = password.trim(); // Don't sanitize password chars, just trim

    // Validate inputs
    if (!sanitizedUsername || sanitizedUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    
    if (!sanitizedPassword || sanitizedPassword.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }
    
    try {
      // Call the real API - login returns user data directly
      const loginResponse = await authApi.login(sanitizedUsername, sanitizedPassword);
      
      // Debug: Verify token was stored
      console.log('Login successful, checking token...');
      console.log('Token in sessionStorage:', sessionStorage.getItem('access_token')?.substring(0, 30) + '...');

      // Use user data from login response
      if (loginResponse.user) {
        setUser(mapApiUserToUser(loginResponse.user));
      }
      
      return { success: true };
    } catch (error) {
      // Get error message from API or use default
      const errorMessage = error instanceof ApiError 
        ? error.detail 
        : 'Invalid credentials';
      
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(role: 'supervisor' | 'agent'): boolean {
  const { user } = useAuth();
  return user?.role === role;
}

/**
 * Hook to check if user is a supervisor
 */
export function useIsSupervisor(): boolean {
  return useHasRole('supervisor');
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiService, type User, type LoginRequest } from '../services/api';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isCheckingAuth: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasCheckedAuth = useRef(false);
  const hasLoggedIn = useRef(false);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.login(credentials);
      
      // Handle your API response format: { status: true, message: "...", data: { user: {...}, token: "..." } }
      if (response.success && response.data?.status && response.data?.data?.user) {
        const user = response.data.data.user;
        setUser(user);
        setIsAuthenticated(true);
        hasLoggedIn.current = true; // Mark that user has logged in
        // Store user info in localStorage for auto-login
        localStorage.setItem('user_info', JSON.stringify(user));
        
        // Force a state update to ensure components receive the new state
        setTimeout(() => {
          // Force re-render by setting state again
          setUser(user);
          setIsAuthenticated(true);
        }, 50);
        
        return true;
      } else {
        setError(response.error || response.data?.message || 'Login failed. Please try again.');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error. Please check your connection.';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      hasLoggedIn.current = false; // Reset login flag
      // Clear user info from localStorage
      localStorage.removeItem('user_info');
    }
  }, []);

  // Check authentication on mount - simple token check (only once)
  useEffect(() => {
    if (hasCheckedAuth.current || hasLoggedIn.current) return;
    
    const checkAuth = () => {
      const token = apiService.getAuthToken();
      
      if (token) {
        // Token exists, auto-login
        setIsAuthenticated(true);
        // Try to get user info from localStorage if available
        const storedUser = localStorage.getItem('user_info');
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch (error) {
            console.error('Error parsing stored user:', error);
          }
        }
        // Auto-login successful - token found
      } else {
        setIsAuthenticated(false);
      }
      
      setIsCheckingAuth(false);
      hasCheckedAuth.current = true;
    };

    // Add a small delay to prevent race conditions
    setTimeout(checkAuth, 100);
  }, []);

  // Listen for storage changes (for multi-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        if (e.newValue === null) {
          // Token was removed, logout
          setUser(null);
          setIsAuthenticated(false);
        } else {
          // Token was added, auto-login
          setIsAuthenticated(true);
          const storedUser = localStorage.getItem('user_info');
          if (storedUser) {
            try {
              setUser(JSON.parse(storedUser));
            } catch (error) {
              console.error('Error parsing stored user:', error);
            }
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    user,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    error,
    login,
    logout,
    clearError,
  };
};

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { redirectToLogin } from './authNavigation';
import { getJwtMsUntilExpiry, isJwtExpired } from './jwt';

/**
 * User Interface
 * 
 * This defines the shape of the User object we expect from the backend.
 * It helps TypeScript provide better autocompletion and error checking.
 */
export interface User {
  id: string;
  email: string;
  roles: string[];
}

/**
 * AuthContextType
 * 
 * This interface defines the data and functions that our AuthContext 
 * will make available to any component in the app.
 */
interface AuthContextType {
  user: User | null; // The currently logged-in user, or null if logged out.
  token: string | null; // JWT token used by API and WebSocket calls.
  login: (userData: User, authToken?: string | null) => void; // A function to set the user state.
  logout: () => void; // A function to clear the user state.
  isAuthenticated: boolean; // A helper to check if someone is logged in.
}

// Create the context where the state will live.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const AUTH_USER_STORAGE_KEY = 'user';
const SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';
const JWT_CLOCK_SKEW_MS = 5_000;

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const readStoredToken = () => {
  const savedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!savedToken) {
    return null;
  }

  if (isJwtExpired(savedToken, JWT_CLOCK_SKEW_MS)) {
    clearStoredAuth();
    return null;
  }

  return savedToken;
};

/**
 * AuthProvider Component
 * 
 * This component "provides" the authentication state to the entire app.
 * It's wrapped around the <App /> component in main.tsx.
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize user state. We check localStorage first so the user 
  // stays logged in even if they refresh the page.
  const [user, setUser] = useState<User | null>(() => {
    const savedToken = readStoredToken();
    if (!savedToken) {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }

    const savedUser = localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!savedUser) {
      return null;
    }

    try {
      const parsed = JSON.parse(savedUser) as Partial<User>;
      if (typeof parsed.id !== 'string' || typeof parsed.email !== 'string' || !Array.isArray(parsed.roles)) {
        localStorage.removeItem(AUTH_USER_STORAGE_KEY);
        return null;
      }

      return {
        id: parsed.id,
        email: parsed.email,
        roles: parsed.roles.filter((role): role is string => typeof role === 'string'),
      };
    } catch {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => readStoredToken());

  /**
   * Sets the logged-in user and saves it to localStorage.
   * @param userData The user data received from the backend.
   */
  const login = (userData: User, authToken?: string | null) => {
    if (!authToken || !authToken.trim() || isJwtExpired(authToken, JWT_CLOCK_SKEW_MS)) {
      clearStoredAuth();
      setUser(null);
      setToken(null);
      return;
    }

    setUser(userData);
    setToken(authToken);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userData));
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, authToken);
  };

  /**
   * Clears the user state and removes it from localStorage.
   */
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearStoredAuth();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const msUntilExpiry = getJwtMsUntilExpiry(token, JWT_CLOCK_SKEW_MS);
    if (msUntilExpiry === null || msUntilExpiry <= 0) {
      logout();
      if (window.location.pathname !== '/login') {
        redirectToLogin(SESSION_EXPIRED_MESSAGE);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      logout();
      if (window.location.pathname !== '/login') {
        redirectToLogin(SESSION_EXPIRED_MESSAGE);
      }
    }, msUntilExpiry);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [logout, token]);

  // Simple boolean to track if the user is currently authenticated.
  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * useAuth Hook
 * 
 * This is a custom hook that any component can use to access the 
 * authentication data. For example: const { user, logout } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

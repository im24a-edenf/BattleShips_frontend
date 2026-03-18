import axios, { AxiosHeaders } from 'axios';
import { redirectToLogin } from '../authNavigation';
import { isJwtExpired } from '../jwt';

const AUTH_TOKEN_STORAGE_KEY = 'authToken';
const AUTH_USER_STORAGE_KEY = 'user';
const DEFAULT_SESSION_EXPIRED_MESSAGE = 'Session expired. Please log in again.';
const JWT_CLOCK_SKEW_MS = 5_000;

type AuthFailureHandler = (reason: string) => void;

let authFailureHandler: AuthFailureHandler | null = null;

export const setAuthFailureHandler = (handler: AuthFailureHandler | null) => {
  authFailureHandler = handler;
};

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
};

const handleAuthFailure = (reason = DEFAULT_SESSION_EXPIRED_MESSAGE) => {
  clearStoredAuth();

  if (authFailureHandler) {
    authFailureHandler(reason);
    return;
  }

  if (window.location.pathname !== '/login') {
    redirectToLogin(reason);
  }
};

const isPublicAuthRequest = (url?: string) => {
  if (!url) {
    return false;
  }

  return url.includes('/api/v1/auth/authenticate') || url.includes('/api/v1/auth/register');
};

/**
 * Axios Instance Configuration
 * 
 * This file creates a reusable 'api' object that is configured to communicate 
 * with our Spring Boot backend. Instead of typing the full URL every time, 
 * we can just use this instance.
 */
const api = axios.create({
  // The base URL of our Spring Boot API
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',

  // This ensures that browser cookies (like session tokens) are sent
  // automatically with every request to the backend.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

  if (token) {
    if (isJwtExpired(token, JWT_CLOCK_SKEW_MS)) {
      handleAuthFailure(DEFAULT_SESSION_EXPIRED_MESSAGE);
      return config;
    }

    if (config.headers instanceof AxiosHeaders) {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !isPublicAuthRequest(error.config?.url)) {
      const backendMessage = typeof error.response?.data?.message === 'string'
        ? error.response.data.message
        : null;
      handleAuthFailure(backendMessage || DEFAULT_SESSION_EXPIRED_MESSAGE);
    }

    return Promise.reject(error);
  },
);

export default api;

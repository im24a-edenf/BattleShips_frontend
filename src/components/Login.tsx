import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { parseAuthResponse } from '../authResponse';
import { getLoginReason } from '../authNavigation';

/**
 * Login Component
 * 
 * This component provides a form for users to enter their credentials 
 * and log into the application.
 */
const Login: React.FC = () => {
  // Local state to keep track of user input and any errors.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Hooks for navigating and managing authentication.
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const loginReason = getLoginReason(searchParams);

  /**
   * Called when the user clicks 'Login'
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Step 1: Send the email and password to the backend.
      const response = await api.post('/api/v1/auth/authenticate', { email, password });
      const { user, token } = parseAuthResponse(response.data);
      
      // Step 2: If the backend says OK, we tell the 'AuthContext' to log in the user.
      login(user, token);
      
      // Step 3: Redirect the user to the dashboard.
      navigate('/');
    } catch (err: unknown) {
      // If something goes wrong (e.g., wrong password), we show an error message.
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Login failed');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Login</h2>
        
        {/* If there's an error, we display it here. */}
        {(error || loginReason) && <p className="text-red-500 text-sm font-medium">{error || loginReason}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white outline-none transition"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white outline-none transition"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Login
          </button>
        </form>
        
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

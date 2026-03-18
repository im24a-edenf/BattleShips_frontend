import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { parseAuthResponse } from '../authResponse';

/**
 * Register Component
 * 
 * This component handles user registration. It allows new users to 
 * create an account by providing an email and password.
 */
const Register: React.FC = () => {
  // State for form inputs.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  /**
   * Called when the user clicks 'Register'
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      // Step 1: Send registration data to the backend.
      const response = await api.post('/api/v1/auth/register', { email, password, role: 'USER' });
      const { user, token } = parseAuthResponse(response.data);
      
      // Step 2: If registration is successful, the backend usually logs the user in immediately.
      login(user, token);
      
      // Step 3: Redirect to the dashboard.
      navigate('/');
    } catch (err: unknown) {
      // Error handling for registration (e.g., if email is already taken).
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Registration failed');
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
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Register</h2>
        
        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white outline-none transition"
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white outline-none transition"
              placeholder="••••••••"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Min 8 chars, must include uppercase, lowercase, digit, and special char.
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition duration-200"
          >
            Register
          </button>
        </form>
        
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 dark:text-green-400 hover:underline font-medium">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

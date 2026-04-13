import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { parseAuthResponse } from '../authResponse';
import BackendStatus from './BackendStatus';

const RULES = [
  { label: 'At least 8 characters',                   test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter (A–Z)',               test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter (a–z)',               test: (p: string) => /[a-z]/.test(p) },
  { label: 'One digit (0–9)',                          test: (p: string) => /[0-9]/.test(p) },
  { label: 'One special character (@#$%^&+=!*())',     test: (p: string) => /[@#$%^&+=!*()]/.test(p) },
];

const passwordError = (password: string): string | null => {
  const failed = RULES.filter(r => !r.test(password));
  if (failed.length === 0) return null;
  if (failed.length === RULES.length) return null; // don't nag on empty field
  return 'Password too weak: ' + failed.map(r => r.label.toLowerCase()).join(', ') + '.';
};

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const inlineError = touched && password.length > 0 ? passwordError(password) : null;
  const isPasswordValid = RULES.every(r => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isPasswordValid) return;
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/auth/register', { email, password, role: 'USER' });
      const { user, token } = parseAuthResponse(response.data);
      login(user, token);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message ?? '';
        if (/weak|password/i.test(msg)) {
          setError('Password too weak. Please choose a stronger password.');
        } else if (msg) {
          setError(msg);
        } else {
          setError('Registration failed. Email may already be in use.');
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-center">
        <div className="flex justify-center">
          <BackendStatus />
        </div>
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
              onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
              required
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent bg-white dark:bg-gray-700 dark:text-white outline-none transition ${
                inlineError
                  ? 'border-red-400 focus:ring-red-400'
                  : isPasswordValid && password.length > 0
                    ? 'border-green-400 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-green-500'
              }`}
              placeholder="••••••••"
            />

            {inlineError && (
              <p className="mt-1.5 text-xs text-red-500">{inlineError}</p>
            )}

            {/* Requirements checklist */}
            <ul className="mt-2 space-y-1">
              {RULES.map(rule => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-1.5 text-xs transition-colors ${
                    met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    <span className="font-bold">{met ? '✓' : '○'}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition duration-200 flex items-center justify-center gap-2"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isLoading ? 'Registering...' : 'Register'}
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

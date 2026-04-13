import React, { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { parseAuthResponse } from '../authResponse';
import { getLoginReason } from '../authNavigation';
import BackendStatus from './BackendStatus';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const loginReason = getLoginReason(searchParams);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/api/v1/auth/authenticate', { email, password });
      const { user, token } = parseAuthResponse(response.data);
      login(user, token);
      navigate('/');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Login failed. Check your credentials.');
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
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
          <span className="text-cyan-400">Battle</span>
          <span className="text-slate-300">Ships</span>
        </h1>
      </div>

      <div className="w-full max-w-sm p-6 space-y-5 bg-slate-800/60 border border-slate-700/50 rounded-2xl">
        <div className="flex justify-center">
          <BackendStatus />
        </div>

        <h2 className="text-xl font-bold text-slate-200 text-center">Login</h2>

        {(error || loginReason) && (
          <p className="text-red-400 text-xs text-center">{error || loginReason}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-600/50 transition text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900/60 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:border-cyan-600/50 transition text-sm"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          No account?{' '}
          <Link to="/register" className="text-cyan-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

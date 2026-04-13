import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import { parseAuthResponse } from '../authResponse';
import BackendStatus from './BackendStatus';

const RULES = [
  { label: 'Min. 8 characters',                       test: (p: string) => p.length >= 8 },
  { label: 'Uppercase (A-Z)',                          test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Lowercase (a-z)',                          test: (p: string) => /[a-z]/.test(p) },
  { label: 'Digit (0-9)',                              test: (p: string) => /[0-9]/.test(p) },
  { label: 'Special char (@#$%^&+=!*())',              test: (p: string) => /[@#$%^&+=!*()]/.test(p) },
];

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

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
          setError('Password too weak.');
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

        <h2 className="text-xl font-bold text-slate-200 text-center">Register</h2>

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

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
              onChange={(e) => { setPassword(e.target.value); setTouched(true); }}
              required
              className={`w-full px-4 py-2.5 bg-slate-900/60 border rounded-xl text-white focus:outline-none transition text-sm ${
                touched && !isPasswordValid && password.length > 0
                  ? 'border-red-500/50 focus:border-red-500/50'
                  : isPasswordValid && password.length > 0
                    ? 'border-emerald-600/50 focus:border-emerald-500/50'
                    : 'border-slate-700/50 focus:border-cyan-600/50'
              }`}
              placeholder="••••••••"
            />

            <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
              {RULES.map(rule => {
                const met = rule.test(password);
                return (
                  <li key={rule.label} className={`flex items-center gap-1 text-[10px] transition-colors ${
                    met ? 'text-emerald-500' : 'text-slate-600'
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
            className="w-full py-3 bg-cyan-700 hover:bg-cyan-600 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
          >
            {isLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-400 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

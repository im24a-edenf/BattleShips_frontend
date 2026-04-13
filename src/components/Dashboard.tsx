import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../AuthContext';
import BackendStatus from './BackendStatus';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      // still log out on the frontend
    }
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-400 font-mono truncate">{user?.email}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-400 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
            <span className="text-cyan-400">Battle</span>
            <span className="text-slate-300">Ships</span>
          </h1>
          <p className="text-slate-500 mt-2 text-sm sm:text-base">Schiffe versenken</p>
          <div className="mt-4 flex justify-center">
            <BackendStatus />
          </div>
        </div>

        {/* Game mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
          <Link
            to="/schiffeversenken"
            className="group relative flex flex-col items-center gap-3 p-8 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-600/50 rounded-2xl transition-all duration-200"
          >
            <span className="text-4xl">🤖</span>
            <span className="text-lg font-bold text-slate-200">Solo vs Bot</span>
            <span className="text-xs text-slate-500 text-center">Spiele gegen einen KI-Gegner</span>
          </Link>

          <Link
            to="/multiplayer"
            className="group relative flex flex-col items-center gap-3 p-8 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 hover:border-cyan-600/50 rounded-2xl transition-all duration-200"
          >
            <span className="text-4xl">⚔️</span>
            <span className="text-lg font-bold text-slate-200">Multiplayer</span>
            <span className="text-xs text-slate-500 text-center">Spiele gegen einen Freund</span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs text-slate-700">
        BattleShips &mdash; Schiffe Versenken
      </div>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PenTool, LogOut, LayoutDashboard, User, ChevronDown, Zap } from 'lucide-react';

const Navbar = ({ setCurrentPage, currentPage }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setCurrentPage('login');
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b border-teal-500/10">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <div
          onClick={() => user ? setCurrentPage('dashboard') : setCurrentPage('login')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-teal-500/30 rounded-xl blur-md group-hover:blur-lg transition-all" />
            <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 text-white p-2 rounded-xl shadow-lg">
              <PenTool size={18} className="group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg font-bold tracking-tight text-white">PDF</span>
            <span className="text-lg font-bold tracking-tight gradient-text">Sign</span>
          </div>
          <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold bg-teal-500/10 border border-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">
            <Zap size={9} />
            PRO
          </span>
        </div>

        {/* Nav Right */}
        {user && (
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dashboard Link */}
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
                currentPage === 'dashboard'
                  ? 'text-teal-400 bg-teal-500/10 border border-teal-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <LayoutDashboard size={15} />
              <span className="hidden sm:inline">Dashboard</span>
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-teal-500/10" />

            {/* User Chip */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2.5 bg-surface-800 border border-teal-500/10 hover:border-teal-500/20 rounded-xl px-3 py-1.5 transition-colors cursor-default">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium text-slate-300">{user.name}</span>
              </div>

              <button
                onClick={handleLogout}
                title="Logout"
                className="flex items-center gap-1.5 text-xs font-semibold bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/20 hover:border-red-700/40 rounded-xl px-3 py-1.5 transition-all active:scale-95"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

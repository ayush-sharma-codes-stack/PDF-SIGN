import React from 'react';
import { useAuth } from '../context/AuthContext';
import { PenTool, LogOut, LayoutDashboard, User } from 'lucide-react';

const Navbar = ({ setCurrentPage, currentPage }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    setCurrentPage('login');
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
      <div 
        onClick={() => user ? setCurrentPage('dashboard') : setCurrentPage('login')} 
        className="flex items-center gap-2.5 cursor-pointer group"
      >
        <div className="bg-brand-500 text-white p-2 rounded-xl group-hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20">
          <PenTool size={20} className="transform group-hover:rotate-12 transition-transform" />
        </div>
        <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-brand-400 bg-clip-text text-transparent">
          PDF<span className="text-brand-400 font-medium">Sign</span>
        </span>
      </div>

      {user && (
        <div className="flex items-center gap-6">
          <button
            onClick={() => setCurrentPage('dashboard')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              currentPage === 'dashboard' ? 'text-brand-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>
          
          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-900 border border-white/5 rounded-full pl-2 pr-3 py-1">
              <div className="bg-brand-500/20 text-brand-400 p-1 rounded-full">
                <User size={12} />
              </div>
              <span className="text-slate-300 font-medium">{user.name}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs font-semibold bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/30 rounded-lg px-3 py-1.5 transition-all active:scale-95"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

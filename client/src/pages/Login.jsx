import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader } from 'lucide-react';

const Login = ({ setCurrentPage }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('All fields are required');
      return;
    }
    
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setCurrentPage('dashboard');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4 fade-in">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative overflow-hidden">
        {/* Decorative ambient background glows */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mb-8 text-center relative z-10">
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome Back</h2>
          <p className="text-slate-400 text-sm">Sign in to manage and sign your PDF documents</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 bg-red-950/30 border border-red-500/30 text-red-300 rounded-lg p-3.5 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input pl-11"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input pl-11"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glow-button bg-brand-600 hover:bg-brand-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 text-sm mt-8 transition-colors active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 relative z-10">
          Don't have an account?{' '}
          <button
            onClick={() => setCurrentPage('register')}
            className="text-brand-400 font-semibold hover:underline"
          >
            Register here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

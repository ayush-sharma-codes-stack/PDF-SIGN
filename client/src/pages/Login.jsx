import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, Loader, PenTool, Zap, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = ({ setCurrentPage }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required'); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) { setCurrentPage('dashboard'); }
    else { setError(result.message); }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex fade-in">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative bg-surface-900 overflow-hidden flex-col items-center justify-center p-16">
        {/* Dot grid background */}
        <div className="absolute inset-0 dot-grid opacity-60" />

        {/* Ambient glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />

        {/* Spinning ring decoration */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full border border-teal-500/5 spin-slow" />
          <div className="absolute w-[360px] h-[360px] rounded-full border border-emerald-500/6 spin-reverse" />
          <div className="absolute w-[240px] h-[240px] rounded-full border border-teal-400/8" />
        </div>

        {/* Central content */}
        <div className="relative z-10 text-center max-w-md">
          {/* Icon cluster */}
          <div className="relative inline-flex mb-10">
            <div className="absolute inset-0 bg-teal-500/20 rounded-3xl blur-2xl scale-150" />
            <div className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-700 p-6 rounded-3xl shadow-2xl">
              <PenTool size={48} className="text-white" />
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Sign documents<br />
            <span className="gradient-text">at the speed of trust.</span>
          </h1>
          <p className="text-slate-500 text-base leading-relaxed">
            Upload PDFs, place signature fields, and collect e-signatures — all in one secure workspace.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['Drag & Drop Placing', 'Draw or Type', 'Instant Download', 'Secure Storage'].map(f => (
              <span key={f} className="text-xs font-medium text-teal-400/80 bg-teal-500/8 border border-teal-500/15 px-3 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-surface-900">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/4 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10 bg-surface-800/80 border border-teal-500/10 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-teal-500/30 to-transparent" />
              <span className="text-xs font-semibold text-teal-500 uppercase tracking-widest px-2">Secure Login</span>
              <div className="h-px flex-1 bg-gradient-to-l from-teal-500/30 to-transparent" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-slate-500 text-sm mt-2">Sign in to your workspace to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <Mail size={16} />
                </div>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-11"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <Lock size={16} />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-11 pr-11"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 mt-8"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-teal-500/8 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{' '}
              <button
                onClick={() => setCurrentPage('register')}
                className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
              >
                Create one free
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

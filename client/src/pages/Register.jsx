import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, AlertCircle, Loader, PenTool, ArrowRight, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const Register = ({ setCurrentPage }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) { setError('All fields are required'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    const result = await register(name, email, password);
    setLoading(false);
    if (result.success) { setCurrentPage('dashboard'); }
    else { setError(result.message); }
  };

  const passwordStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ['', 'bg-red-500', 'bg-amber-400', 'bg-emerald-500'];
  const strengthLabels = ['', 'Weak', 'Good', 'Strong'];

  return (
    <div className="min-h-[calc(100vh-64px)] flex fade-in">
      {/* ── Left Panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[45%] relative bg-surface-900 overflow-hidden flex-col items-center justify-center p-16">
        <div className="absolute inset-0 dot-grid opacity-60" />
        <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-56 h-56 bg-emerald-500/6 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="bg-gradient-to-br from-teal-500 to-emerald-600 p-2.5 rounded-xl">
              <PenTool size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">PDF<span className="gradient-text">Sign</span></span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4">Start signing<br/>documents for free.</h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-10">
            Join thousands of professionals who trust PDFSign for their document workflows.
          </p>

          {/* Benefits list */}
          <div className="space-y-4">
            {[
              { label: 'Upload unlimited PDFs', desc: 'No file size limits on documents' },
              { label: 'Add signature fields', desc: 'Drag-and-drop placement anywhere' },
              { label: 'Draw or type signatures', desc: 'Multiple signing methods supported' },
              { label: 'Download signed copies', desc: 'Instantly export completed docs' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-teal-500/15 border border-teal-500/30 flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-teal-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">{item.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative bg-surface-900">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-600/4 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-gradient-to-r from-teal-500/30 to-transparent" />
              <span className="text-xs font-semibold text-teal-500 uppercase tracking-widest px-2">Create Account</span>
              <div className="h-px flex-1 bg-gradient-to-l from-teal-500/30 to-transparent" />
            </div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Set up your account</h2>
            <p className="text-slate-500 text-sm mt-2">Get started in less than a minute</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-center gap-3 bg-red-950/30 border border-red-500/20 text-red-300 rounded-xl p-4 text-sm">
              <AlertCircle size={16} className="shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <User size={16} />
                </div>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input pl-11"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <Mail size={16} />
                </div>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input pl-11"
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <Lock size={16} />
                </div>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input pl-11 pr-11"
                  placeholder="Min. 6 characters"
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-600 hover:text-slate-400 transition-colors">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength ? strengthColors[passwordStrength] : 'bg-slate-800'}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${passwordStrength === 3 ? 'text-emerald-400' : passwordStrength === 2 ? 'text-amber-400' : 'text-red-400'}`}>
                    {strengthLabels[passwordStrength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-600">
                  <Lock size={16} />
                </div>
                <input
                  id="register-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full glass-input pl-11 ${confirmPassword && confirmPassword !== password ? 'border-red-500/40 focus:ring-red-500/20' : confirmPassword && confirmPassword === password ? 'border-emerald-500/40' : ''}`}
                  placeholder="••••••••"
                  required
                />
                {confirmPassword && (
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    {confirmPassword === password
                      ? <CheckCircle2 size={16} className="text-emerald-400" />
                      : <AlertCircle size={16} className="text-red-400" />
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 rounded-xl flex items-center justify-center gap-2.5 mt-6"
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-teal-500/8 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <button
                onClick={() => setCurrentPage('login')}
                className="text-teal-400 font-semibold hover:text-teal-300 transition-colors"
              >
                Sign in instead
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;

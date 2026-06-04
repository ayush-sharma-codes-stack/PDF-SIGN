import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, AlertCircle, Loader } from 'lucide-react';

const Register = ({ setCurrentPage }) => {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await register(name, email, password);
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
          <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Create Account</h2>
          <p className="text-slate-400 text-sm">Join to upload, coordinate, and sign PDFs</p>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 bg-red-950/30 border border-red-500/30 text-red-300 rounded-lg p-3.5 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User size={18} />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full glass-input pl-11"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

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
                placeholder="john@example.com"
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

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                <span>Creating account...</span>
              </>
            ) : (
              <span>Register</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 relative z-10">
          Already have an account?{' '}
          <button
            onClick={() => setCurrentPage('login')}
            className="text-brand-400 font-semibold hover:underline"
          >
            Login here
          </button>
        </div>
      </div>
    </div>
  );
};

export default Register;

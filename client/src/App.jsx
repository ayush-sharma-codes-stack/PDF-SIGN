import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import PublicSign from './pages/PublicSign';
import { PenTool } from 'lucide-react';

// ── Public Sign route detection ───────────────────────────────────────────────
// Handles /sign/:token without a full router library
const getPublicToken = () => {
  const match = window.location.pathname.match(/^\/sign\/(.+)$/);
  return match ? match[1] : null;
};

const MainApp = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Detect public sign route on mount
  const publicToken = getPublicToken();

  useEffect(() => {
    if (publicToken) return; // don't redirect if it's a public sign URL
    if (!loading) {
      if (user) {
        if (currentPage === 'login' || currentPage === 'register') setCurrentPage('dashboard');
      } else {
        if (currentPage !== 'login' && currentPage !== 'register') setCurrentPage('login');
      }
    }
  }, [user, loading, publicToken]);

  // ── Public signing route — no auth needed ────────────────────────────────
  if (publicToken) {
    return <PublicSign token={publicToken} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full border border-teal-500/20 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="absolute w-28 h-28 rounded-full border border-teal-500/10 animate-spin" style={{ animationDuration: '5s', animationDirection: 'reverse' }} />
            <div className="relative bg-gradient-to-br from-teal-500 to-emerald-600 p-4 rounded-2xl shadow-2xl shadow-teal-500/30">
              <PenTool size={28} className="text-white" />
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm font-bold text-slate-300 tracking-widest uppercase">
              PDF<span className="text-teal-400">Sign</span>
            </p>
            <p className="text-xs text-slate-600 mt-1.5 tracking-wider">Validating session…</p>
          </div>

          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-teal-500/40 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'login':     return <Login setCurrentPage={setCurrentPage} />;
      case 'register':  return <Register setCurrentPage={setCurrentPage} />;
      case 'dashboard': return <Dashboard setCurrentPage={setCurrentPage} setSelectedDocId={setSelectedDocId} />;
      case 'editor':    return <Editor docId={selectedDocId} setCurrentPage={setCurrentPage} />;
      default:          return <Login setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col">
      {user && <Navbar setCurrentPage={setCurrentPage} currentPage={currentPage} />}
      <main className="flex-1">
        {renderPage()}
      </main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;

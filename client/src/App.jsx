import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';

const MainApp = () => {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('login');
  const [selectedDocId, setSelectedDocId] = useState(null);

  // Sync route status based on auth changes
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (currentPage === 'login' || currentPage === 'register') {
          setCurrentPage('dashboard');
        }
      } else {
        if (currentPage !== 'login' && currentPage !== 'register') {
          setCurrentPage('login');
        }
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-500"></div>
        <p className="text-slate-400 text-xs mt-3 uppercase tracking-wider font-semibold">Validating session...</p>
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <Login setCurrentPage={setCurrentPage} />;
      case 'register':
        return <Register setCurrentPage={setCurrentPage} />;
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentPage={setCurrentPage} 
            setSelectedDocId={setSelectedDocId} 
          />
        );
      case 'editor':
        return (
          <Editor 
            docId={selectedDocId} 
            setCurrentPage={setCurrentPage} 
          />
        );
      default:
        return <Login setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Navbar only shown when logged in */}
      {user && (
        <Navbar 
          setCurrentPage={setCurrentPage} 
          currentPage={currentPage} 
        />
      )}
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

import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInAnonymously } from './firebase';
import { Scale, LogIn, User, Sun, Moon } from 'lucide-react';

export default function Login({ isDark, setIsDark }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError(null); // gracefully ignore or set a nice message
      } else {
        setError("An error occurred during sign in, please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
    } catch (err) {
      setError("An error occurred during guest sign in, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex flex-col md:flex-row items-center justify-center p-4 md:p-12 overflow-hidden relative">
      
      {/* Theme Toggle Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={() => setIsDark(!isDark)}
          className="cursor-pointer flex items-center gap-3 bg-[var(--bg-surface)]/60 backdrop-blur-md border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-full transition-all shadow-md"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* Decorative background blobs for glassmorphism to look good */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Left Side: Branding */}
      <div className="w-full md:w-1/2 flex flex-col items-center md:items-start justify-center p-8 md:p-16 z-10 text-center md:text-left">
        <div className="w-20 h-20 bg-[var(--bg-surface-hover)] rounded-2xl flex items-center justify-center mb-8 shadow-lg border border-[var(--border-color)]">
          <Scale size={48} className="text-blue-400" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">
          LegalView
        </h1>
        <p className="text-xl md:text-3xl font-light text-[var(--text-secondary)] leading-relaxed max-w-xl">
          Your AI-powered legal assistant <br/>
          <span className="font-medium text-blue-400">No hallucinations, guaranteed citations</span>
        </p>
      </div>

      {/* Right Side: Login Box */}
      <div className="w-full md:w-1/2 flex items-center justify-center z-10 mt-8 md:mt-0">
        <div className="w-full max-w-md bg-[var(--bg-surface)]/60 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl p-8 md:p-10 shadow-2xl flex flex-col items-center">
          
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] mb-2 text-center">Welcome Back</h2>
          <p className="text-[var(--text-secondary)] text-sm text-center mb-8 px-2">
            Sign in to save your chat history permanently, or continue as a guest
          </p>

          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-xl mb-6 text-center backdrop-blur-md">
              {error}
            </div>
          )}

          <div className="w-full space-y-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="cursor-pointer w-full flex items-center justify-center gap-3 bg-[var(--text-primary)] text-[var(--bg-main)] py-3.5 rounded-xl font-medium hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-[var(--border-color)]"></div>
              <span className="flex-shrink-0 mx-4 text-[var(--text-secondary)] text-sm font-medium">OR</span>
              <div className="flex-grow border-t border-[var(--border-color)]"></div>
            </div>

            <button
              onClick={handleGuestLogin}
              disabled={loading}
              className="cursor-pointer w-full flex items-center justify-center gap-3 bg-[var(--bg-surface-hover)]/80 text-[var(--text-primary)] border border-[var(--border-color)] py-3.5 rounded-xl font-medium hover:bg-[var(--bg-surface-hover)] transition-all disabled:opacity-50 shadow-sm backdrop-blur-md"
            >
              <User size={18} />
              Continue as Guest
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

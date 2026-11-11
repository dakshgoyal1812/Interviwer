// ============================================================================
// INTERVIEWX AI — LOGIN / SIGNUP PAGE
// Google OAuth + email auth via Supabase. Guest mode always available so the
// product never dead-ends when Supabase is not yet configured.
// ============================================================================
import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2, LogIn, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export const AuthPage: React.FC = () => {
  const { user, profile, loading, authAvailable, signInWithGoogle, signInWithEmail, signUpWithEmail, enterGuestMode } =
    useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>(params.get('mode') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!loading && (user || profile?.onboarded)) {
    return <Navigate to={profile?.onboarded ? '/app' : '/onboarding'} replace />;
  }

  const handleGoogle = async () => {
    setError(null);
    setBusy('google');
    try {
      await signInWithGoogle();
      // OAuth redirects away from the page.
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed. Check that the Google provider is enabled in Supabase Auth.');
      setBusy(null);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy('email');
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, fullName.trim() || 'Candidate');
        setNotice('Account created. If email confirmation is required, check your inbox — otherwise you can sign in now.');
        setMode('signin');
      } else {
        await signInWithEmail(email.trim(), password);
        navigate('/onboarding', { replace: true });
      }
    } catch (e: any) {
      setError(e?.message || 'Authentication failed.');
    } finally {
      setBusy(null);
    }
  };

  const handleGuest = () => {
    setBusy('guest');
    enterGuestMode();
    navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-32 right-1/4 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-[380px] w-[380px] rounded-full bg-indigo-50/60 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-[#4079DA] flex items-center justify-center font-black text-white text-base shadow-sm">
            iX
          </div>
          <span className="font-extrabold tracking-tight text-xl text-[#152A4C]">InterviewX AI</span>
        </Link>

        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-md p-7 space-y-5">
          <div className="text-center space-y-1">
            <h1 className="text-xl font-bold text-[#152A4C]">
              {mode === 'signin' ? 'Welcome Back' : 'Create Your Account'}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === 'signin'
                ? 'Sign in to sync interviews, reports and practice streaks.'
                : 'Free forever on public tiers. No credit card required.'}
            </p>
          </div>

          {!authAvailable && (
            <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Supabase auth is not configured on this deployment. Guest mode gives you the full experience with
                local-only data.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {notice && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
              {notice}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy !== null}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-60"
          >
            {busy === 'google' ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#4079DA]" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.8z" />
                <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1C3.3 21.3 7.3 24 12 24z" />
                <path fill="#FBBC05" d="M5.3 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.3C.5 8.2 0 10 0 12s.5 3.8 1.3 5.4l4-3.1z" />
                <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8L20 3.1C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <div className="h-px bg-slate-200 flex-1" />
            or with email
            <div className="h-px bg-slate-200 flex-1" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === 'signup' && (
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#4079DA]"
              />
            )}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#4079DA]"
            />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#4079DA]"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60"
            >
              {busy === 'email' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {mode === 'signin' ? 'Sign in' : 'Sign up'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="w-full text-center text-xs text-slate-500 hover:text-[#4079DA] transition-colors"
          >
            {mode === 'signin'
              ? "Don't have an account? Sign up"
              : 'Already have an account? Sign in'}
          </button>

          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={handleGuest}
              disabled={busy !== null}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-[#152A4C] font-semibold text-sm transition-colors shadow-2xs disabled:opacity-60"
            >
              {busy === 'guest' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserRound className="w-4 h-4 text-[#4079DA]" />
              )}
              Continue as guest (local data only)
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          By continuing you agree that interview transcripts and scores are stored for your own
          progress tracking. Camera/mic are opt-in and never recorded.
        </p>
      </div>
    </div>
  );
};

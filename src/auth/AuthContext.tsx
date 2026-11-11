// ============================================================================
// INTERVIEWX AI — AUTH CONTEXT
// Supabase Auth (Google OAuth + email/password) with a first-class Guest mode
// fallback so the app stays fully usable before Supabase is wired up.
// Guest data stays in browser localStorage; Supabase users get RLS-isolated
// cloud persistence.
// ============================================================================
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface CandidateProfile {
  id?: string;
  email: string;
  fullName: string;
  targetRole: string;
  experienceLevel: string;
  preferredLanguage: string;
  onboarded: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: CandidateProfile | null;
  loading: boolean;
  isGuest: boolean;
  authAvailable: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  enterGuestMode: (name?: string) => void;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<CandidateProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_KEY = 'interviewx.guest';
const PROFILE_CACHE_KEY = 'interviewx.profile';

const DEFAULT_PROFILE: Omit<CandidateProfile, 'email'> = {
  fullName: 'Candidate',
  targetRole: 'Full-Stack & AI Engineer',
  experienceLevel: 'Mid-Level (2-4 yrs)',
  preferredLanguage: 'python',
  onboarded: false,
};

function loadCachedGuest(): CandidateProfile | null {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? (JSON.parse(raw) as CandidateProfile) : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Restore session / guest state on mount
  useEffect(() => {
    let mounted = true;

    async function restore() {
      if (!supabase) {
        const guest = loadCachedGuest();
        if (guest && mounted) {
          setIsGuest(true);
          setProfile(guest);
        }
        if (mounted) setLoading(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session ?? null);

      supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        // Only a real SIGNED_OUT clears state — INITIAL_SESSION also fires with
        // a null session and must never wipe a just-restored guest profile.
        if (event === 'SIGNED_OUT') {
          setIsGuest(false);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && newSession?.user) {
          setIsGuest(false);
          loadProfile(newSession.user);
        }
      });

      if (data.session?.user) {
        await loadProfile(data.session.user);
      } else {
        const guest = loadCachedGuest();
        if (guest && mounted) {
          setIsGuest(true);
          setProfile(guest);
        }
      }
      if (mounted) setLoading(false);
    }

    restore();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProfile = useCallback(async (user: User) => {
    if (!supabase) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const meta = user.user_metadata || {};
      const cachedRaw = localStorage.getItem(PROFILE_CACHE_KEY);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};

      const merged: CandidateProfile = {
        id: user.id,
        email: user.email || meta.email || 'unknown',
        fullName: data?.full_name || meta.full_name || meta.name || cached.fullName || 'Candidate',
        targetRole: data?.target_role || cached.targetRole || DEFAULT_PROFILE.targetRole,
        experienceLevel:
          data?.experience_level || cached.experienceLevel || DEFAULT_PROFILE.experienceLevel,
        preferredLanguage:
          data?.preferred_language || cached.preferredLanguage || DEFAULT_PROFILE.preferredLanguage,
        onboarded: Boolean(data?.full_name && data?.target_role) || Boolean(cached.onboarded),
      };
      setProfile(merged);

      // Ensure a profiles row exists (RLS: own row only)
      if (!data) {
        await supabase.from('profiles').upsert({
          id: user.id,
          email: merged.email,
          full_name: merged.fullName,
          target_role: merged.targetRole,
          experience_level: merged.experienceLevel,
          preferred_language: merged.preferredLanguage,
        });
      }
    } catch {
      // Profile load failed (RLS/table missing) — degrade to cached defaults
      const cachedRaw = localStorage.getItem(PROFILE_CACHE_KEY);
      const cached = cachedRaw ? JSON.parse(cachedRaw) : {};
      setProfile({
        id: user.id,
        email: user.email || 'unknown',
        fullName: cached.fullName || 'Candidate',
        targetRole: cached.targetRole || DEFAULT_PROFILE.targetRole,
        experienceLevel: cached.experienceLevel || DEFAULT_PROFILE.experienceLevel,
        preferredLanguage: cached.preferredLanguage || DEFAULT_PROFILE.preferredLanguage,
        onboarded: Boolean(cached.onboarded),
      });
    }
  }, []);

  const persistGuest = useCallback((p: CandidateProfile) => {
    localStorage.setItem(GUEST_KEY, JSON.stringify(p));
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured — use Guest mode.');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) throw error;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured — use Guest mode.');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) await loadProfile(data.session.user);
  }, [loadProfile]);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, fullName: string) => {
      if (!supabase) throw new Error('Supabase is not configured — use Guest mode.');
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    },
    []
  );

  const enterGuestMode = useCallback(
    (name?: string) => {
      const guest: CandidateProfile = {
        email: 'guest@local',
        fullName: name || 'Guest Candidate',
        targetRole: DEFAULT_PROFILE.targetRole,
        experienceLevel: DEFAULT_PROFILE.experienceLevel,
        preferredLanguage: DEFAULT_PROFILE.preferredLanguage,
        onboarded: true,
      };
      persistGuest(guest);
      setProfile(guest);
      setIsGuest(true);
    },
    [persistGuest]
  );

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    localStorage.removeItem(GUEST_KEY);
    setSession(null);
    setProfile(null);
    setIsGuest(false);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<CandidateProfile>) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        if (isGuest || !supabase) persistGuest(next);
        return next;
      });

      if (supabase && session?.user) {
        try {
          await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              email: profile?.email || session.user.email,
              full_name: patch.fullName ?? profile?.fullName,
              target_role: patch.targetRole ?? profile?.targetRole,
              experience_level: patch.experienceLevel ?? profile?.experienceLevel,
              preferred_language: patch.preferredLanguage ?? profile?.preferredLanguage,
            });
        } catch {
          // non-fatal
        }
      }
    },
    [session, profile, isGuest, persistGuest]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      profile,
      loading,
      isGuest,
      authAvailable: isSupabaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      enterGuestMode,
      signOut,
      updateProfile,
    }),
    [
      session,
      profile,
      loading,
      isGuest,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      enterGuestMode,
      signOut,
      updateProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ============================================================================
// INTERVIEWX AI — ONBOARDING
// First-run profile setup (name, target role, experience, preferred language).
// Persists to Supabase profiles when available, else localStorage.
// ============================================================================
import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const EXPERIENCE_LEVELS = [
  'Student / New Grad',
  'Junior (0-2 yrs)',
  'Mid-Level (2-4 yrs)',
  'Mid-Senior (3+ yrs)',
  'Senior (5+ yrs)',
];

const LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'c', label: 'C' },
];

const ROLE_SUGGESTIONS = [
  'Full-Stack & AI Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'SDE / SWE (Product Company)',
  'Data / ML Engineer',
];

export const Onboarding: React.FC = () => {
  const { user, profile, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [targetRole, setTargetRole] = useState(ROLE_SUGGESTIONS[0]);
  const [experienceLevel, setExperienceLevel] = useState(EXPERIENCE_LEVELS[2]);
  const [preferredLanguage, setPreferredLanguage] = useState('python');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName((p) => p || profile.fullName);
      setTargetRole((p) => (p === ROLE_SUGGESTIONS[0] ? profile.targetRole : p));
      setExperienceLevel(profile.experienceLevel);
      setPreferredLanguage(profile.preferredLanguage);
    }
  }, [profile]);

  if (!loading && !user && !profile) {
    return <Navigate to="/login" replace />;
  }
  if (!loading && profile?.onboarded && user) {
    // Already onboarded — let them through (they can edit in Settings).
  }

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ fullName, targetRole, experienceLevel, preferredLanguage, onboarded: true });
      navigate('/app', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 h-[420px] w-[420px] rounded-full bg-blue-100/50 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-md p-7 space-y-6">
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-[#4079DA] uppercase tracking-wider">
              Welcome to InterviewX
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#152A4C]">Set up your candidate profile</h1>
            <p className="text-sm text-slate-500">
              Your interviewer personas use this to tailor questions, difficulty and project
              deep-dives.
            </p>
          </div>

          <form onSubmit={handleFinish} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ob-name" className="text-xs font-semibold text-slate-700">
                Full name
              </label>
              <input
                id="ob-name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Daksh Goyal"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#4079DA]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ob-role" className="text-xs font-semibold text-slate-700">
                Target role
              </label>
              <input
                id="ob-role"
                required
                list="ob-role-suggestions"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-[#4079DA]"
              />
              <datalist id="ob-role-suggestions">
                {ROLE_SUGGESTIONS.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">Experience level</span>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperienceLevel(lvl)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      experienceLevel === lvl
                        ? 'bg-[#EBF1FD] border-[#4079DA] text-[#4079DA] font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700">
                Preferred coding language (coding rounds)
              </span>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setPreferredLanguage(l.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      preferredLanguage === l.id
                        ? 'bg-[#EBF1FD] border-[#4079DA] text-[#4079DA] font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || !fullName.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] disabled:opacity-50 text-white font-bold text-sm transition-all shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Enter the interview workspace
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

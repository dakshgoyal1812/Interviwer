// ============================================================================
// INTERVIEWX AI — LANDING PAGE
// Dark navy + electric blue/violet glassmorphism hero. Desktop-only product.
// ============================================================================
import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Boxes, Bot, Code2, Gauge, Mic, ShieldCheck, Webcam } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const FEATURES = [
  {
    icon: Bot,
    title: 'Adaptive 3D AI Interviewer',
    body: 'A VRM-powered interviewer that listens, evaluates every answer, and escalates difficulty turn by turn — never repeating a question.',
  },
  {
    icon: Mic,
    title: 'Voice In, Voice Out',
    body: 'Sentence-streamed neural TTS with real-time lip-sync, browser speech recognition for answers, and live WPM / filler-word telemetry.',
  },
  {
    icon: Code2,
    title: 'Real Coding Rounds',
    body: 'Monaco editor across C, C++, Python, Java and JavaScript with genuine sandboxed execution on Piston / Judge0 — never on our servers.',
  },
  {
    icon: Webcam,
    title: 'Observable Presentation Indicators',
    body: 'In-browser MediaPipe face + pose landmarks surface framing, gaze alignment, and posture tips. Raw video never leaves your machine.',
  },
  {
    icon: Gauge,
    title: 'Estimated Performance Score',
    body: 'A transparent 0–100 composite (answer quality, communication, technical correctness, presentation) with fully configurable weights.',
  },
  {
    icon: Boxes,
    title: 'HR · Technical · DSA Tracks',
    body: 'OOP, DBMS, OS, CN, SE, projects, and a full DSA ladder from arrays to dynamic programming with Easy / Medium / Hard levels.',
  },
];

export const Landing: React.FC = () => {
  const { profile, loading, user } = useAuth();

  // Already signed in (or returning guest) → straight to the workspace.
  if (!loading && (user || profile?.onboarded)) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-white text-[#363636] overflow-x-hidden selection:bg-[#4079DA]/20 selection:text-[#152A4C]">
      {/* CodeChef Soft Ambient Blue Background Field */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true">
        <div className="absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-3xl" />
        <div className="absolute top-1/3 -right-32 h-[450px] w-[450px] rounded-full bg-indigo-50/70 blur-3xl" />
      </div>

      {/* CodeChef Style Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_2px_4px_rgba(0,0,0,0.04)] flex items-center justify-between px-6 sm:px-12 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-[#4079DA] flex items-center justify-center font-black text-white text-sm shadow-sm">
            iX
          </div>
          <span className="font-extrabold tracking-tight text-xl text-[#152A4C]">InterviewX AI</span>
        </div>
        <nav className="flex items-center gap-2.5 text-sm">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg text-[#4079DA] hover:bg-blue-50 font-semibold transition-colors border border-transparent hover:border-blue-200"
          >
            Sign In
          </Link>
          <Link
            to="/login?mode=signup"
            className="px-5 py-2 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] text-white font-bold transition-all shadow-sm"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8">
        {/* Hero */}
        <section className="pt-16 sm:pt-20 pb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-200 bg-blue-50/80 text-xs font-semibold text-[#4079DA] mb-6 shadow-2xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#4079DA]" />
            Free tiers only · keys never leave the backend · camera/mic fully opt-in
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-balance text-[#152A4C]"
          >
            Interview practice that{' '}
            <span className="text-[#4079DA]">
              talks back
            </span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
          >
            A live 3D AI interviewer with voice, adaptive difficulty, real code execution, and
            honest presentation feedback — a full interview simulation, not a quiz app.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-9 flex items-center justify-center gap-3.5 flex-wrap"
          >
            <Link
              to="/login?mode=signup"
              className="group px-7 py-3.5 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] text-white font-bold text-sm transition-all shadow-md inline-flex items-center gap-2"
            >
              Start Practicing Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-lg bg-white border border-slate-300 hover:border-[#4079DA] hover:bg-slate-50 text-[#152A4C] font-semibold text-sm transition-colors shadow-2xs"
            >
              I have an account
            </Link>
          </motion.div>
        </section>

        {/* Feature grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-[#4079DA]/50 transition-all group"
            >
              <div className="h-11 w-11 rounded-lg bg-[#EBF1FD] border border-blue-200 flex items-center justify-center mb-4 group-hover:bg-[#4079DA] transition-colors">
                <f.icon className="w-5 h-5 text-[#4079DA] group-hover:text-white transition-colors" />
              </div>
              <h3 className="font-bold text-base text-[#152A4C] mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{f.body}</p>
            </motion.div>
          ))}
        </section>

        {/* Honesty strip */}
        <section className="pb-24">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-7 grid md:grid-cols-3 gap-6 text-sm shadow-2xs">
            <div>
              <div className="text-xs font-bold text-[#4079DA] mb-2 uppercase tracking-wider">
                Transparent scoring
              </div>
              <p className="text-slate-600 leading-relaxed">
                The performance meter is a weighted rubric over answer quality, communication
                pacing, technical correctness and presentation — every category is visible and
                configurable.
              </p>
            </div>
            <div>
              <div className="text-xs font-bold text-indigo-600 mb-2 uppercase tracking-wider">
                What the camera does NOT do
              </div>
              <p className="text-slate-600 leading-relaxed">
                It does not detect confidence, emotion, honesty or personality. It only reports
                observable framing indicators (face presence, gaze direction, shoulder/posture
                alignment), labeled as such everywhere.
              </p>
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">
                Your data
              </div>
              <p className="text-slate-600 leading-relaxed">
                Raw video and audio are never stored or transmitted. Interview transcripts, scores
                and reports live in your own row-protected Supabase tables — or locally in guest
                mode.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-200 bg-white px-8 py-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
        <span className="font-semibold text-[#152A4C]">InterviewX AI — 3D AI Interview Simulator</span>
        <span>VRM pipeline · MediaPipe in-browser · Piston/Judge0 sandbox · Edge TTS</span>
      </footer>
    </div>
  );
};

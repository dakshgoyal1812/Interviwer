-- ============================================================================
-- INTERVIEWX AI — SUPABASE POSTGRESQL + PGVECTOR + RLS PRODUCTION SCHEMA
-- Run this in the Supabase SQL Editor to initialize all 9 tables, pgvector
-- semantic memory, and Row-Level Security (RLS) policies.
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 1. PROFILES
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default 'Candidate',
  target_role text not null default 'Full-Stack & AI Engineer',
  experience_level text not null default 'Mid-Level (2-4 yrs)',
  preferred_language text not null default 'python',
  performance_weights jsonb not null default '{"answerQuality":40,"communication":25,"technicalCorrectness":20,"presentation":15}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- 2. INTERVIEWER PERSONAS (Stored in Supabase, drives LLM system prompt + voice + VRM mood)
create table if not exists public.interviewer_personas (
  id text primary key,
  name text not null,
  role_title text not null,
  personality_type text not null check (personality_type in ('Friendly HR', 'Strict Technical', 'Professional Corporate')),
  voice_name text not null,
  edge_tts_voice text not null,
  avatar_accent_color text not null default '#38bdf8',
  default_mood text not null default 'neutral',
  system_prompt text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table public.interviewer_personas enable row level security;
create policy "Personas are readable by all authenticated and anon users"
  on public.interviewer_personas for select using (true);

-- 3. QUESTION BANK (Pre-seeded HR, Technical, and DSA/Coding questions + test cases)
create table if not exists public.question_bank (
  id text primary key,
  mode text not null check (mode in ('HR', 'Technical', 'DSA')),
  topic text not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  title text,
  question_text text not null,
  ideal_key_points jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  test_cases jsonb not null default '[]'::jsonb,
  starter_code jsonb not null default '{}'::jsonb,
  description text,
  constraints jsonb not null default '[]'::jsonb,
  arg_types jsonb,
  optimal_time_complexity text,
  optimal_space_complexity text,
  reference_solution_summary text,
  created_at timestamptz not null default now()
);

alter table public.question_bank enable row level security;
create policy "Question bank is readable by all users"
  on public.question_bank for select using (true);

-- 4. INTERVIEW SESSIONS
create table if not exists public.interview_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  persona_id text not null references public.interviewer_personas(id),
  mode text not null check (mode in ('HR', 'Technical', 'DSA')),
  sub_topic text not null,
  initial_difficulty text not null check (initial_difficulty in ('Easy', 'Medium', 'Hard')),
  current_difficulty text not null check (current_difficulty in ('Easy', 'Medium', 'Hard')),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

alter table public.interview_sessions enable row level security;
create policy "Users manage own interview_sessions"
  on public.interview_sessions for all using (auth.uid() = user_id);

-- 5. QUESTIONS (Per-turn contextual questions asked during a session)
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  turn_number int not null,
  topic text not null,
  difficulty text not null,
  question_text text not null,
  mood_tag text not null default 'neutral',
  gesture_tag text not null default 'none',
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;
create policy "Users manage own questions"
  on public.questions for all using (auth.uid() = user_id);

-- 6. ANSWERS (Candidate responses + voice analytics + presentation indicators + pgvector embedding)
create table if not exists public.answers (
  id uuid primary key default uuid_generate_v4(),
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer_text text not null,
  duration_seconds int not null default 0,
  wpm int not null default 0,
  filler_count int not null default 0,
  filler_words jsonb not null default '{}'::jsonb,
  long_pauses_count int not null default 0,
  presentation_metrics jsonb not null default '{}'::jsonb,
  code_submission jsonb,
  embedding vector(768),
  created_at timestamptz not null default now()
);

alter table public.answers enable row level security;
create policy "Users manage own answers"
  on public.answers for all using (auth.uid() = user_id);

-- 7. SCORES (Per-turn and weighted category scores)
create table if not exists public.scores (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  answer_quality_score int not null,
  communication_score int not null,
  technical_correctness_score int not null,
  presentation_score int not null,
  estimated_performance_score int not null,
  score_delta int not null default 0,
  feedback_summary text,
  created_at timestamptz not null default now()
);

alter table public.scores enable row level security;
create policy "Users manage own scores"
  on public.scores for all using (auth.uid() = user_id);

-- 8. REPORTS (Comprehensive post-interview breakdown)
create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.interview_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  overall_score int not null,
  category_scores jsonb not null,
  voice_summary jsonb not null,
  presentation_summary jsonb not null,
  coding_summary jsonb,
  strongest_answer text not null,
  weakest_answer text not null,
  actionable_improvements jsonb not null default '[]'::jsonb,
  qa_breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;
create policy "Users manage own reports"
  on public.reports for all using (auth.uid() = user_id);

-- 9. PROGRESS HISTORY (Longitudinal tracking + weak topic memory)
create table if not exists public.progress_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.interview_sessions(id) on delete set null,
  mode text not null,
  topic text not null,
  score int not null,
  is_weak_topic boolean not null default false,
  recorded_at timestamptz not null default now()
);

alter table public.progress_history enable row level security;
create policy "Users manage own progress_history"
  on public.progress_history for all using (auth.uid() = user_id);

<div align="center">

# InterviewX AI

**A production-ready 3D AI interview simulator — HR, Technical & DSA coding rounds with a live VRM interviewer, adaptive difficulty, voice in/out, in-browser presentation analytics, and real sandboxed code execution.**

Built on the Waguri VTuber pipeline (VRM loader, procedural blink/gaze/lip-sync, mood-gesture system, KeyPool LLM rotation, Edge TTS, Supabase + Express).

</div>

---

## What's inside

| Area | Implementation |
| --- | --- |
| **3D Interviewer** | `@pixiv/three-vrm` pipeline, auto-loads `/models/interviewer.vrm`, procedural 12-part fallback rig, interview states (Idle / Listening / Thinking / Speaking / Evaluating) mapped to mood+gesture tags, procedural blink, mouse-driven gaze, Web Audio analyser lip-sync, executive interview room with GLB upload support |
| **Adaptive engine** | One question at a time, full-conversation context, evaluates relevance + correctness, contextual follow-ups only, dynamic Easy/Medium/Hard escalation, never repeats questions. LLM returns strict JSON per turn: `spoken_reply, mood_tag, gesture_tag, score_for_answer, difficulty_next, topic` |
| **LLM** | Waguri KeyPool multi-provider rotation (OpenRouter/Groq/any OpenAI-compatible) with per-key 429 cooldown → Gemini fallback → deterministic domain-aware evaluator so the app never breaks without keys |
| **Voice** | **Edge TTS (`msedge-tts`) primary — keyless**, sentence-level parallel synthesis + sequential streaming playback; Azure Speech → Gemini TTS → browser SpeechSynthesis fallbacks. Browser SpeechRecognition STT with a text-input fallback always available |
| **Webcam** | Real MediaPipe **FaceLandmarker + PoseLandmarker** (in-browser WASM, frames never leave the device), explicit consent gate, live `camera active` badge, honest "observable presentation indicators" labeling — no confidence/emotion/honesty claims, luminance heuristic fallback offline |
| **Voice analytics** | WPM, filler words (um/uh/like/actually/basically…), long pauses >2.5s, answer duration, speaking consistency — live, no confidence claims |
| **Performance meter** | "Estimated Interview Performance Score" 0–100 with configurable weights (default: quality 40 / communication 25 / technical 20 / presentation 15), per-category bars, per-turn delta |
| **Coding round** | Monaco editor (C, C++, Python, Java, JavaScript), mandatory verbal approach (STT/text), **real execution on Piston → Judge0 → offline heuristic** (never on the app server), per-test-case verdicts, AI logic/complexity/explanation evaluation |
| **Reports** | Overall + per-category scores, WPM/fillers/pauses, posture indicators, coding performance, strongest/weakest answers, improvements, question-by-question breakdown, **true jsPDF export** + print + JSON |
| **Auth & data** | Supabase Auth (Google OAuth + email) with guest-mode fallback, RLS on every user table, pgvector-ready `answers.embedding` for weak-topic memory, 9-table schema + one-command seed |

## Quick start (local, single origin)

```bash
npm install
npm run dev        # Express + Vite middleware on http://localhost:8080
```

1. Copy `.env.example` → `.env` and fill in what you have. **Nothing is strictly required** — the app degrades gracefully: no LLM keys → deterministic evaluator; no Supabase → local/guest mode; no TTS reachability → browser speech.
2. (Optional, recommended) Create a free Supabase project, run `supabase/schema.sql` in the SQL editor, then `npm run seed` to load personas + question bank + coding problems.
3. Open `http://localhost:8080`, sign in with Google/email (once Supabase auth is configured) or continue as guest.

## Deployment (free tiers, no card)

**Backend → Render** (this repo's `render.yaml`):
- New Web Service → build `npm install && npm run build`, start `npm run start`
- Add env vars from `.env.example` (LLM keys, Supabase service key, optional Azure/Judge0)
- Set `CORS_ORIGINS` to your Vercel URL

**Frontend → Vercel** (same repo):
- Framework: Vite, build `npm run build`, output `dist` (see `vercel.json`)
- Set **public** env vars only:
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key — safe by design, RLS protects data)
  - `VITE_API_BASE=https://<your-render-app>.onrender.com`

> The anon/publishable key is *designed* to be public in Supabase's security model — every privileged key (LLM, TTS, sandbox, service role) stays server-side. The frontend talks only to the Express backend for everything else.

**Google OAuth:** in Supabase → Authentication → Providers → Google, add your OAuth client and add `https://<vercel-domain>/onboarding` to the redirect list.

**Seed the DB once:** `npm run seed` (uses `SUPABASE_URL` + service key from the backend `.env`).

## Sandbox (code execution) — never on your server

`POST /api/code/execute` ships the candidate's `solve(...)` with a generated per-language test harness to:

1. **Piston** (free hosted, `emkc.org`) — primary
2. **Judge0 CE** (free CE endpoint or self-hosted on Azure for Students) — fallback
3. **Offline heuristic** — keeps the interview usable if both are unreachable (clearly labeled in the UI)

Test convention: each test case's `input` holds one JSON-ish argument per line; cases are separated by `---`. The harness compiles once and runs all cases in one sandbox execution. Type metadata (`argTypes`) drives typed C/C++/Java drivers and is inferred automatically otherwise.

## AI-generated problems

`POST /api/coding/generate-problem` creates original problems (never copied from LeetCode, and LeetCode is never called) with harness-compatible test cases, `argTypes`, and starter code in all five languages. Falls back to a deterministic generator without keys.

## Honesty guarantees (per spec)

- Presentation panel is labeled **"observable presentation indicators"** everywhere — it never claims to detect confidence, emotion, honesty, or personality.
- No raw video/audio is ever stored or transmitted; nothing is recorded.
- Sandbox provider names are shown in the results panel (`piston`, `judge0`, `offline-heuristic`), so you always know how your code was judged.
- The performance meter is a transparent, configurable weighted rubric.

## Desktop only

WebGL + MediaPipe + Monaco are tuned for desktop/laptop Chrome/Edge. There is deliberately no mobile support.

## Repo map

```
server.ts                 Express API: KeyPool, adaptive engine, TTS chain, sandbox proxy, reports
sandboxAdapter.ts         Piston/Judge0/offline execution + per-language test harness generators
supabase/schema.sql       9 tables + RLS + pgvector extension
supabase/seed.ts          One-command seed (personas, question bank, coding problems)
src/App.tsx               Workspace shell: dashboard, setup, live room, coding, reports, settings
src/pages/                Landing, Auth (Google/email/guest), Onboarding
src/auth/AuthContext.tsx  Supabase session + guest mode + profile sync
src/components/           Interviewer3DScene, WebcamPresentationPanel (MediaPipe), CodingEnvironmentView (Monaco), ReportAndHistoryView (jsPDF), AiCoachAndPrepView
src/utils/interviewRules  Voice analytics, presentation scoring, difficulty ladder, animation params
src/data/seedData.ts      Personas, question bank, coding problems, report types
interviewer.vrm           Waguri interviewer avatar (served at /models/interviewer.vrm)
```

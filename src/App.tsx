import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  Square,
  Code2,
  Sliders,
  Upload,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  UserCheck,
  Database,
  RefreshCw,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  InterviewMode,
  DifficultyLevel,
  InterviewerState,
  MoodTag,
  GestureTag,
  PerformanceWeights,
  DEFAULT_WEIGHTS,
  CategoryScores,
  analyzeVoiceTranscript,
  calculatePerformanceScore,
  ObservablePresentationResult,
} from './utils/interviewRules';
import {
  INTERVIEWER_PERSONAS,
  SEED_QUESTION_BANK,
  SEED_CODING_PROBLEMS,
  INITIAL_REPORTS,
  InterviewerPersona,
  CodingProblem,
  InterviewReportRecord,
  QABreakdownItem,
  SupportedCodeLanguage,
} from './data/seedData';
import { Interviewer3DScene } from './components/Interviewer3DScene';
import { WebcamPresentationPanel } from './components/WebcamPresentationPanel';
import { CodingEnvironmentView } from './components/CodingEnvironmentView';
import { ReportAndHistoryView } from './components/ReportAndHistoryView';
import { AiCoachAndPrepView } from './components/AiCoachAndPrepView';
import { DashboardView } from './components/DashboardView';
import { LeetCodeProfileView } from './components/LeetCodeProfileView';
import { useAuth } from './auth/AuthContext';
import { apiFetch, apiUrl } from './lib/api';
import { Landing } from './pages/Landing';
import { AuthPage } from './pages/AuthPage';
import { Onboarding } from './pages/Onboarding';

type AppPage =
  | 'dashboard'
  | 'setup'
  | 'live-room'
  | 'coding'
  | 'reports'
  | 'ai-coach'
  | 'profile'
  | 'settings';

const VALID_SECTIONS: AppPage[] = [
  'dashboard',
  'setup',
  'live-room',
  'coding',
  'reports',
  'ai-coach',
  'profile',
  'settings',
];

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-[#152A4C]">
        <Loader2 className="w-6 h-6 animate-spin text-[#4079DA]" />
      </div>
    );
  }
  if (!user && !profile?.onboarded) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/:section?"
        element={
          <ProtectedRoute>
            <InterviewWorkspace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <InterviewWorkspace />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const SUBTOPICS_BY_MODE: Record<InterviewMode, string[]> = {
  Technical: ['DBMS', 'OS', 'CN', 'OOP', 'SE & System Design', 'Projects'],
  DSA: [
    'Arrays & Hashing',
    'Strings & Sliding Window',
    'Trees & Graphs',
    'Dynamic Programming',
    'Sorting & Greedy',
    'Stacks & Queues',
  ],
  HR: ['Ownership & Trade-offs', 'Conflict Resolution', 'Production Incident & Postmortem'],
};

function InterviewWorkspace() {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { profile, isGuest, signOut } = useAuth();

  const activePage: AppPage = VALID_SECTIONS.includes((section || 'dashboard') as AppPage)
    ? ((section || 'dashboard') as AppPage)
    : 'dashboard';
  const go = useCallback(
    (next: AppPage) => {
      navigate(next === 'dashboard' ? '/app' : `/app/${next}`);
    },
    [navigate]
  );

  const [candidateProfile, setCandidateProfile] = useState({
    name: 'Candidate',
    email: 'guest@local',
    targetRole: 'Full-Stack & AI Engineer',
    experienceLevel: 'Mid-Level (2-4 yrs)',
    authenticatedVia: 'Local Session',
  });

  // Hydrate candidate profile from auth context
  useEffect(() => {
    if (!profile) return;
    setCandidateProfile({
      name: profile.fullName,
      email: profile.email,
      targetRole: profile.targetRole,
      experienceLevel: profile.experienceLevel,
      authenticatedVia: isGuest
        ? 'Guest Session (local only)'
        : 'Supabase Session Active',
    });
  }, [profile, isGuest]);

  // Personas, Problems & Reports State
  const [personas, setPersonas] = useState<InterviewerPersona[]>(INTERVIEWER_PERSONAS);
  const [codingProblems, setCodingProblems] = useState<CodingProblem[]>(SEED_CODING_PROBLEMS);
  const [selectedProblem, setSelectedProblem] = useState<CodingProblem>(SEED_CODING_PROBLEMS[0]);
  const [reports, setReports] = useState<InterviewReportRecord[]>(INITIAL_REPORTS);
  const [selectedReport, setSelectedReport] = useState<InterviewReportRecord>(INITIAL_REPORTS[0]);

  // Interview Setup Config
  const [selectedMode, setSelectedMode] = useState<InterviewMode>('Technical');
  const [selectedSubTopic, setSelectedSubTopic] = useState<string>('DBMS');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Medium');
  const [selectedPersona, setSelectedPersona] = useState<InterviewerPersona>(
    INTERVIEWER_PERSONAS[1] // Kenji Sato (Strict Technical) default for Technical
  );

  // Custom VRM & Room GLB URLs (Loads interviewer.vrm directly into the room)
  const [customVrmUrl, setCustomVrmUrl] = useState<string | null>('/interviewer.vrm');
  const [customRoomGlbUrl, setCustomRoomGlbUrl] = useState<string | null>(null);
  const [modelStatusText, setModelStatusText] = useState<string>(
    'Waguri VRM Pipeline — interviewer.vrm active'
  );
  const [cameraPreset, setCameraPreset] = useState<'desk' | 'closeup' | 'wide'>('desk');
  const [zenHudCollapsed, setZenHudCollapsed] = useState(false);

  // Configurable Performance Meter Weights (Default 40 / 25 / 20 / 15)
  const [weights, setWeights] = useState<PerformanceWeights>(DEFAULT_WEIGHTS);

  // Live Interview Session State
  const [sessionActive, setSessionActive] = useState<boolean>(true);
  const [interviewerState, setInterviewerState] = useState<InterviewerState>('Speaking');
  const [moodTag, setMoodTag] = useState<MoodTag>('encouraging');
  const [gestureTag, setGestureTag] = useState<GestureTag>('nod');
  const [currentQuestion, setCurrentQuestion] = useState<string>(
    SEED_QUESTION_BANK.find((q) => q.mode === 'Technical' && q.topic === 'DBMS')?.questionText ||
      SEED_QUESTION_BANK[0].questionText
  );
  const [interviewerSpokenBanner, setInterviewerSpokenBanner] = useState<string>(
    'Welcome to InterviewX AI. Let’s start with a database performance scenario: Suppose a PostgreSQL query filtering on status and created_at degrades from 8ms to 1.4 seconds at 20 million rows. How do you diagnose this and order a composite B-Tree index?'
  );
  const [candidateAnswerInput, setCandidateAnswerInput] = useState<string>('');
  const [answerStartTime, setAnswerStartTime] = useState<number>(() => Date.now());
  const [pauseTimestampsMs, setPauseTimestampsMs] = useState<number[]>([]);
  const lastKeystrokeRef = useRef<number>(Date.now());

  const [askedQuestions, setAskedQuestions] = useState<string[]>([currentQuestion]);
  const [sessionTurns, setSessionTurns] = useState<QABreakdownItem[]>([]);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState<boolean>(false);

  // Live STT & Web Audio Lip-Sync State
  const [micListening, setMicListening] = useState<boolean>(false);
  const [lipSyncVolume, setLipSyncVolume] = useState<number>(0);
  const speechRecRef = useRef<any>(null);

  // Shared audio graph for streamed TTS playback (one context per page lifetime)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const speakSessionRef = useRef<number>(0);

  // Webcam Consent & Observable Presentation Metrics
  const [consentGranted, setConsentGranted] = useState<boolean>(true);
  const [cameraEnabled, setCameraEnabled] = useState<boolean>(true);
  const [presentationMetrics, setPresentationMetrics] = useState<ObservablePresentationResult>({
    score: 88,
    faceStatus: 'Visible',
    gazeStatus: 'Aligned with Frame',
    headPositionStatus: 'Stable',
    shoulderStatus: 'Level',
    postureStatus: 'Grounded',
    gentleTips: ['Framing, eye-line alignment, and upper-body posture are steady and well-centered.'],
    disclaimer:
      'Observable presentation indicators only (framing, gaze direction, and posture alignment).',
  });

  // Live Performance Meter State (0-100 + Delta after each answer)
  const [categoryScores, setCategoryScores] = useState<CategoryScores>({
    answerQuality: 84,
    communication: 82,
    technicalCorrectness: 85,
    presentation: 88,
  });
  const [lastScoreDelta, setLastScoreDelta] = useState<number>(+4);
  const [latestCodingSubmission, setLatestCodingSubmission] =
    useState<InterviewReportRecord['codingSubmission']>(undefined);

  // Backend Status Telemetry (for Settings page only)
  const [backendStatus, setBackendStatus] = useState<any>(null);

  useEffect(() => {
    apiFetch('/api/personas')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setPersonas(data);
      })
      .catch(() => {});

    apiFetch('/api/status')
      .then((r) => r.json())
      .then((data) => setBackendStatus(data))
      .catch(() => {});
  }, []);

  // Live voice analytics computed from current candidate answer draft
  const elapsedAnswerSeconds = Math.max(
    4,
    Math.round((Date.now() - answerStartTime) / 1000)
  );
  const liveVoiceStats = analyzeVoiceTranscript(
    candidateAnswerInput,
    elapsedAnswerSeconds,
    pauseTimestampsMs
  );

  const performanceMeter = calculatePerformanceScore(
    {
      answerQuality: categoryScores.answerQuality,
      communication:
        candidateAnswerInput.trim().length > 15
          ? liveVoiceStats.communicationScore
          : categoryScores.communication,
      technicalCorrectness: categoryScores.technicalCorrectness,
      presentation: presentationMetrics.score,
    },
    weights
  );

  // Speak text: sentence-streamed server TTS (Edge primary) with a queue that
  // keeps one Web Audio AnalyserNode driving VRM lip-sync across every chunk.
  // Falls back to browser SpeechSynthesis (boundary-event lip envelope) and
  // finally a timed procedural envelope — the room always talks somehow.
  const speakInterviewerText = useCallback(
    async (textToSpeak: string, personaToUse: InterviewerPersona) => {
      if (!textToSpeak.trim()) return;
      const sessionId = ++speakSessionRef.current;

      // Tear down any in-flight playback
      try {
        activeSourceRef.current?.stop();
      } catch {
        /* already stopped */
      }
      activeSourceRef.current = null;
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();

      setInterviewerState('Speaking');
      const finishSpeaking = () => {
        if (speakSessionRef.current !== sessionId) return;
        setLipSyncVolume(0);
        setInterviewerState('Listening');
      };

      try {
        const resp = await apiFetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textToSpeak,
            voiceName: personaToUse.voiceName,
            edgeVoice: personaToUse.edgeTtsVoice,
          }),
        });
        if (speakSessionRef.current !== sessionId) return;
        const data = await resp.json();
        const sentences: Array<{ text: string; audioBase64: string | null }> =
          Array.isArray(data.sentences) ? data.sentences : [];
        const playable = sentences.filter((s) => s.audioBase64);

        if (playable.length > 0) {
          if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
            audioCtxRef.current = new (window.AudioContext ||
              (window as any).webkitAudioContext)();
          }
          const audioCtx = audioCtxRef.current;
          await audioCtx.resume().catch(() => {});

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.connect(audioCtx.destination);
          const freqData = new Uint8Array(analyser.frequencyBinCount);

          // Decode all sentence buffers up front (parallel decodeAudioData)
          const buffers = await Promise.all(
            playable.map(async (s) => {
              const binary = window.atob(s.audioBase64!);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              try {
                return await audioCtx.decodeAudioData(bytes.buffer.slice(0));
              } catch {
                return null;
              }
            })
          );
          if (speakSessionRef.current !== sessionId) return;

          const validBuffers = buffers.filter(Boolean) as AudioBuffer[];
          if (validBuffers.length === 0) throw new Error('decode failed');

          let rafId = 0;
          const pumpLipSync = () => {
            if (speakSessionRef.current !== sessionId) return;
            analyser.getByteFrequencyData(freqData);
            let sum = 0;
            for (let i = 2; i < 36; i++) sum += freqData[i];
            const avg = sum / 34 / 255;
            setLipSyncVolume(Math.min(1, avg * 2.2));
            rafId = requestAnimationFrame(pumpLipSync);
          };

          // Sequential sentence queue
          let index = 0;
          const playNext = () => {
            if (speakSessionRef.current !== sessionId) return;
            if (index >= validBuffers.length) {
              cancelAnimationFrame(rafId);
              setLipSyncVolume(0);
              finishSpeaking();
              return;
            }
            const source = audioCtx.createBufferSource();
            source.buffer = validBuffers[index++];
            source.connect(analyser);
            source.onended = playNext;
            activeSourceRef.current = source;
            source.start(0);
          };

          pumpLipSync();
          playNext();
          return;
        }
      } catch {
        /* fall through to browser synthesis */
      }

      if (speakSessionRef.current !== sessionId) return;

      // Browser SpeechSynthesis fallback with boundary-event lip-sync envelope
      if ('speechSynthesis' in window) {
        try {
          const synth = window.speechSynthesis;
          const utter = new SpeechSynthesisUtterance(textToSpeak);
          utter.rate = 1.02;
          utter.pitch = 1.0;
          let envTimer = 0;
          const startEnvelope = () => {
            const t0 = Date.now();
            envTimer = window.setInterval(() => {
              if (speakSessionRef.current !== sessionId) {
                clearInterval(envTimer);
                return;
              }
              const elapsed = Date.now() - t0;
              setLipSyncVolume(
                Math.max(0.12, Math.min(0.9, 0.45 + 0.4 * Math.abs(Math.sin(elapsed * 0.012))))
              );
            }, 70);
          };
          utter.onstart = startEnvelope;
          utter.onboundary = () => {
            // word boundary — nudge the envelope so mouth articulates per word
            setLipSyncVolume(0.55 + Math.random() * 0.35);
          };
          utter.onend = () => {
            clearInterval(envTimer);
            finishSpeaking();
          };
          synth.cancel();
          synth.speak(utter);
          // Safety: if synthesis never fires events (some browsers + long text)
          const guardMs = Math.min(45000, 2500 + textToSpeak.length * 90);
          window.setTimeout(() => {
            if (speakSessionRef.current === sessionId && synth.speaking === false && synth.pending === false) {
              finishSpeaking();
            }
          }, guardMs);
          return;
        } catch {
          /* fall through to timed envelope */
        }
      }

      // Last resort: timed procedural speaking envelope
      const start = Date.now();
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - start;
        if (speakSessionRef.current !== sessionId || elapsed > 3800) {
          clearInterval(interval);
          finishSpeaking();
        } else {
          setLipSyncVolume(0.35 + 0.45 * Math.abs(Math.sin(elapsed * 0.018)));
        }
      }, 60);
    },
    []
  );

  // Start / Launch a configured interview session
  const handleStartConfiguredInterview = (
    modeOverride?: InterviewMode,
    topicOverride?: string,
    difficultyOverride?: DifficultyLevel,
    questionOverride?: string
  ) => {
    const modeToUse = modeOverride || selectedMode;
    const topicToUse = topicOverride || selectedSubTopic;
    const diffToUse = difficultyOverride || selectedDifficulty;

    setSelectedMode(modeToUse);
    setSelectedSubTopic(topicToUse);
    setSelectedDifficulty(diffToUse);

    const matchingQuestionText =
      questionOverride ||
      SEED_QUESTION_BANK.find(
        (q) =>
          q.mode === modeToUse &&
          q.difficulty === diffToUse &&
          q.topic.toLowerCase().includes(topicToUse.toLowerCase())
      )?.questionText ||
      SEED_QUESTION_BANK.find(
        (q) =>
          q.mode === modeToUse &&
          q.topic.toLowerCase().includes(topicToUse.toLowerCase())
      )?.questionText ||
      SEED_QUESTION_BANK.find((q) => q.mode === modeToUse)?.questionText ||
      SEED_QUESTION_BANK[0].questionText;

    setCurrentQuestion(matchingQuestionText);
    const intro = `Hello ${candidateProfile.name.split(' ')[0]}, I'm ${selectedPersona.name} (${selectedPersona.roleTitle}). Let's begin your ${diffToUse} ${modeToUse} interview on ${topicToUse}. ${matchingQuestionText}`;
    setInterviewerSpokenBanner(intro);
    setAskedQuestions([matchingQuestionText]);
    setSessionTurns([]);
    setCandidateAnswerInput('');
    setPauseTimestampsMs([]);
    setAnswerStartTime(Date.now());
    setSessionActive(true);
    setMoodTag(selectedPersona.defaultMood);
    setGestureTag('bow');
    go('live-room');
    speakInterviewerText(intro, selectedPersona);
  };

  // Toggle Browser SpeechRecognition STT
  const handleToggleMicSTT = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      // Populate a realistic spoken technical response sample if browser lacks SpeechRecognition
      if (!candidateAnswerInput.trim()) {
        setCandidateAnswerInput(
          'First I run EXPLAIN (ANALYZE, BUFFERS) to inspect whether PostgreSQL is performing a sequential scan or reading excessive heap pages. For the composite B-Tree index, I put the equality column status first and the range column created_at second so the index range scan remains contiguous in O(log N) time.'
        );
      }
      return;
    }

    if (micListening) {
      speechRecRef.current?.stop();
      setMicListening(false);
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      speechRecRef.current = rec;
      setMicListening(true);
      setInterviewerState('Listening');

      rec.onresult = (evt: any) => {
        let finalChunk = '';
        for (let i = evt.resultIndex; i < evt.results.length; i++) {
          if (evt.results[i].isFinal) {
            finalChunk += evt.results[i][0].transcript + ' ';
          }
        }
        if (finalChunk) {
          const now = Date.now();
          const gap = now - lastKeystrokeRef.current;
          if (gap >= 2500) {
            setPauseTimestampsMs((prev) => [...prev, gap]);
          }
          lastKeystrokeRef.current = now;
          setCandidateAnswerInput((prev) => `${prev} ${finalChunk}`.trim());
        }
      };

      rec.onend = () => setMicListening(false);
      rec.onerror = () => setMicListening(false);
      rec.start();
    } catch {
      setMicListening(false);
    }
  };

  // Submit Candidate Answer to Adaptive Engine
  const handleSubmitCandidateAnswer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = candidateAnswerInput.trim();
    if (!trimmed || isSubmittingTurn) return;

    setIsSubmittingTurn(true);
    setInterviewerState('Thinking');
    setMoodTag('thinking');
    setGestureTag('head_tilt');

    const durationSec = Math.max(8, Math.round((Date.now() - answerStartTime) / 1000));
    const voiceStats = analyzeVoiceTranscript(trimmed, durationSec, pauseTimestampsMs);

    try {
      const weakTopics = reports
        .filter((r) => r.overallScore < 80)
        .map((r) => r.subTopic);

      const resp = await apiFetch('/api/interview/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: selectedMode,
          subTopic: selectedSubTopic,
          difficulty: selectedDifficulty,
          personaId: selectedPersona.id,
          currentQuestion,
          candidateAnswer: trimmed,
          askedQuestions,
          weakTopics,
        }),
      });
      const turnData = await resp.json();

      setInterviewerState('Evaluating');

      const prevTotal = calculatePerformanceScore(categoryScores, weights).totalScore;
      const updatedCategories: CategoryScores = {
        answerQuality: Math.round(
          categoryScores.answerQuality * 0.4 + turnData.score_for_answer * 0.6
        ),
        communication: Math.round(
          categoryScores.communication * 0.4 + voiceStats.communicationScore * 0.6
        ),
        technicalCorrectness: Math.round(
          categoryScores.technicalCorrectness * 0.4 + turnData.technical_score * 0.6
        ),
        presentation: presentationMetrics.score,
      };
      const newTotal = calculatePerformanceScore(updatedCategories, weights).totalScore;
      setCategoryScores(updatedCategories);
      setLastScoreDelta(newTotal - prevTotal);

      const newTurnRecord: QABreakdownItem = {
        id: `qa-${Date.now()}`,
        questionNumber: sessionTurns.length + 1,
        topic: turnData.topic || selectedSubTopic,
        difficulty: selectedDifficulty,
        questionText: currentQuestion,
        candidateAnswer: trimmed,
        interviewerFeedback: turnData.spoken_reply,
        score: turnData.score_for_answer,
        technicalScore: turnData.technical_score,
        wpm: voiceStats.wpm,
        fillerCount: voiceStats.fillerCount,
        durationSeconds: durationSec,
        moodTag: turnData.mood_tag,
        gestureTag: turnData.gesture_tag,
        strengths: turnData.strengths || ['Structured technical explanation'],
        improvements: turnData.improvements || ['Quantify edge-case complexity bounds'],
      };

      setSessionTurns((prev) => [...prev, newTurnRecord]);
      setSelectedDifficulty(turnData.difficulty_next || selectedDifficulty);
      setMoodTag(turnData.mood_tag || 'encouraging');
      setGestureTag(turnData.gesture_tag || 'nod');
      setCurrentQuestion(turnData.follow_up_question);
      setInterviewerSpokenBanner(turnData.spoken_reply);
      setAskedQuestions((prev) => [...prev, turnData.follow_up_question]);
      setCandidateAnswerInput('');
      setPauseTimestampsMs([]);
      setAnswerStartTime(Date.now());

      speakInterviewerText(turnData.spoken_reply, selectedPersona);
    } catch (err) {
      console.error('Turn submission error:', err);
      setInterviewerState('Listening');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  // End Interview & Generate Full Report
  const handleFinishAndGenerateReport = async () => {
    const turnsToInclude: QABreakdownItem[] =
      sessionTurns.length > 0
        ? sessionTurns
        : [
            {
              id: `qa-${Date.now()}`,
              questionNumber: 1,
              topic: selectedSubTopic,
              difficulty: selectedDifficulty,
              questionText: currentQuestion,
              candidateAnswer:
                candidateAnswerInput.trim() ||
                'Explained composite B-Tree index column selectivity (equality before range predicate) and inspected buffer hits with EXPLAIN ANALYZE.',
              interviewerFeedback:
                'Solid grasp of B-Tree index prefix selectivity and query plan diagnostics.',
              score: categoryScores.answerQuality,
              technicalScore: categoryScores.technicalCorrectness,
              wpm: liveVoiceStats.wpm || 134,
              fillerCount: liveVoiceStats.fillerCount,
              durationSeconds: liveVoiceStats.durationSeconds || 75,
              moodTag: 'encouraging',
              gestureTag: 'nod',
              strengths: ['Clear diagnostic workflow', 'Accurate complexity trade-offs'],
              improvements: ['Expand on concurrent write amplification under high index count'],
            },
          ];

    const avgWpm = Math.round(
      turnsToInclude.reduce((acc, t) => acc + t.wpm, 0) / turnsToInclude.length
    );
    const totalFillers = turnsToInclude.reduce((acc, t) => acc + t.fillerCount, 0);
    const totalDuration = turnsToInclude.reduce((acc, t) => acc + t.durationSeconds, 0);

    const sortedByScore = [...turnsToInclude].sort((a, b) => b.score - a.score);
    const strongest = sortedByScore[0];
    const weakest = sortedByScore[sortedByScore.length - 1];

    const overall = calculatePerformanceScore(categoryScores, weights).totalScore;

    const newReport: InterviewReportRecord = {
      id: `rep-${Date.now()}`,
      sessionId: `sess-${Date.now()}`,
      createdAt: new Date().toISOString(),
      mode: selectedMode,
      subTopic: selectedSubTopic,
      difficulty: selectedDifficulty,
      personaId: selectedPersona.id,
      personaName: selectedPersona.name,
      overallScore: overall,
      categoryScores: { ...categoryScores },
      voiceSummary: {
        avgWpm: avgWpm || 132,
        totalFillers,
        fillerBreakdown: liveVoiceStats.fillerWordsFound,
        longPauses: pauseTimestampsMs.filter((p) => p >= 2500).length,
        totalDurationSeconds: totalDuration,
        speakingConsistency: liveVoiceStats.speakingConsistency || 88,
      },
      presentationSummary: {
        faceVisibilityPct: presentationMetrics.faceStatus === 'Visible' ? 98 : 50,
        gazeAlignmentPct: presentationMetrics.gazeStatus === 'Aligned with Frame' ? 88 : 68,
        postureStabilityPct: presentationMetrics.postureStatus === 'Grounded' ? 90 : 70,
        shoulderAlignmentPct: presentationMetrics.shoulderStatus === 'Level' ? 91 : 72,
        gentleObservations: presentationMetrics.gentleTips,
      },
      codingSubmission: latestCodingSubmission,
      strongestAnswerSummary: `${strongest.topic} (${strongest.score}/100): ${strongest.strengths.join(', ')}.`,
      weakestAnswerSummary: `${weakest.topic} (${weakest.score}/100): ${weakest.improvements.join(', ')}.`,
      actionableImprovements: Array.from(
        new Set(turnsToInclude.flatMap((t) => t.improvements))
      ).slice(0, 4),
      qaBreakdown: turnsToInclude,
    };

    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newReport, userId: profile?.id || null }),
      });
    } catch {
      // ignore offline error, local state updates immediately
    }

    setReports((prev) => [newReport, ...prev]);
    setSelectedReport(newReport);
    setSessionActive(false);
    go('reports');
  };

  // Custom VRM / GLB local file upload handlers
  const handleVrmFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomVrmUrl(objectUrl);
  };

  const handleRoomGlbUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomRoomGlbUrl(objectUrl);
  };

  // Aggregate Dashboard Metrics
  const totalInterviewsCount = reports.length;
  const avgOverallScore = Math.round(
    reports.reduce((acc, r) => acc + r.overallScore, 0) / Math.max(1, reports.length)
  );
  const avgTechScore = Math.round(
    reports.reduce((acc, r) => acc + r.categoryScores.technicalCorrectness, 0) /
      Math.max(1, reports.length)
  );
  const avgCommScore = Math.round(
    reports.reduce((acc, r) => acc + r.categoryScores.communication, 0) /
      Math.max(1, reports.length)
  );

  // Chronological trend data for the Recharts dashboard chart
  const trendData = useMemo(
    () =>
      [...reports]
        .reverse()
        .map((r) => ({
          label: `${r.mode}: ${r.subTopic.split('&')[0].trim().slice(0, 14)}`,
          overall: r.overallScore,
          technical: r.categoryScores.technicalCorrectness,
          communication: r.categoryScores.communication,
        })),
    [reports]
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#363636] flex flex-col font-sans selection:bg-[#4079DA]/20 selection:text-[#152A4C]">
      {/* Light Clean Top Header (CodeChef White & Blue System) */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 sm:gap-6 px-4 sm:px-8 py-3 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.03)] no-print">
        {/* Zone 1: Brand Title Wordmark with CodeChef Blue Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#4079DA] to-[#5E93E6] flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-500/20">
            iX
          </div>
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              go('dashboard');
            }}
            className="text-lg font-bold tracking-tight text-[#152A4C] whitespace-nowrap"
          >
            InterviewX AI
          </a>
        </div>

        {/* Zone 2: Navigation Links with Soft Segmented Capsule Design */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100/80 p-1 rounded-full border border-slate-200/60"
        >
          <a
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              go('dashboard');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activePage === 'dashboard'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60'
            }`}
          >
            Dashboard
          </a>
          <a
            href="#setup"
            onClick={(e) => {
              e.preventDefault();
              go('setup');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activePage === 'setup'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60'
            }`}
          >
            Interview Setup
          </a>
          <a
            href="#live-room"
            onClick={(e) => {
              e.preventDefault();
              go('live-room');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activePage === 'live-room'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60'
            }`}
          >
            Live 3D Room
          </a>
          <a
            href="#coding"
            onClick={(e) => {
              e.preventDefault();
              go('coding');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activePage === 'coding'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60'
            }`}
          >
            Coding IDE
          </a>
          <a
            href="#reports"
            onClick={(e) => {
              e.preventDefault();
              go('reports');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
              activePage === 'reports'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60'
            }`}
          >
            Reports &amp; History
          </a>
          <a
            href="#profile"
            onClick={(e) => {
              e.preventDefault();
              go('profile');
            }}
            className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activePage === 'profile'
                ? 'bg-[#4079DA] text-white shadow-xs font-bold'
                : 'hover:text-[#152A4C] hover:bg-slate-200/60 text-slate-700'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Account &amp; Streak</span>
          </a>
        </nav>

        {/* Zone 3: Primary Action + Auth Identity */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {activePage === 'live-room' ? (
            <button
              type="button"
              onClick={handleFinishAndGenerateReport}
              className="px-3.5 sm:px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors whitespace-nowrap shadow-xs"
            >
              End &amp; Generate Report
            </button>
          ) : (
            <button
              type="button"
              onClick={() => go('live-room')}
              className="px-3 sm:px-4 py-2 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-full transition-all shadow-xs flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Enter Live 3D Interview</span>
              <span className="sm:hidden">Live 3D</span>
            </button>
          )}

          <div
            onClick={() => go('profile')}
            className="flex items-center gap-2 bg-slate-50 pl-1.5 pr-2.5 sm:pr-3.5 py-1.5 rounded-full border border-slate-200/80 cursor-pointer hover:border-[#4079DA]/40 hover:bg-slate-100/70 transition-all shadow-2xs"
            title="View Account &amp; Practice Streak"
          >
            <div className="w-7 h-7 rounded-full bg-[#152A4C] flex items-center justify-center text-white text-[11px] font-bold">
              {candidateProfile.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left leading-tight hidden lg:block">
              <div className="text-xs font-bold text-[#152A4C] max-w-[120px] truncate">
                {candidateProfile.name}
              </div>
              <div className="text-[10px] text-slate-500">
                {isGuest ? 'Guest' : 'Verified'}
              </div>
            </div>
            <button
              type="button"
              title="Sign out"
              onClick={async (e) => {
                e.stopPropagation();
                await signOut();
                navigate('/login');
              }}
              className="p-1 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-0.5 sm:ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile & Tablet Responsive Horizontal Navigation Pills */}
      <div className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white border-b border-slate-200/80 overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'setup', label: 'Setup' },
          { id: 'live-room', label: 'Live 3D Room' },
          { id: 'coding', label: 'Coding IDE' },
          { id: 'reports', label: 'Reports' },
          { id: 'profile', label: 'Account & Streak', hasBadge: true },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id as AppPage)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
              activePage === item.id
                ? 'bg-[#4079DA] text-white shadow-xs'
                : 'bg-slate-100 text-[#152A4C] hover:bg-slate-200'
            }`}
          >
            {item.hasBadge && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Secondary Workspace Bar */}
      <div className="bg-[#EBF1FD]/70 border-b border-blue-200/70 px-4 sm:px-8 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-4 text-xs text-slate-600 no-print">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto text-[11px] sm:text-xs">
          <span>Candidate: <strong className="text-[#152A4C]">{candidateProfile.name}</strong></span>
          <span aria-hidden="true" className="text-slate-300">&bull;</span>
          <span>Active Persona: <strong className="text-[#4079DA]">{selectedPersona.name} ({selectedPersona.personalityType})</strong></span>
          <span aria-hidden="true" className="text-slate-300 hidden sm:inline">&bull;</span>
          <span className="hidden sm:inline">Track: <strong className="text-[#152A4C]">{selectedMode} / {selectedSubTopic} ({selectedDifficulty})</strong></span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => go('ai-coach')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activePage === 'ai-coach'
                ? 'bg-[#4079DA] text-white shadow-xs'
                : 'bg-white text-[#152A4C] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
            AI Prep Lab
          </button>
          <button
            type="button"
            onClick={() => go('settings')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
              activePage === 'settings'
                ? 'bg-[#4079DA] text-white shadow-xs'
                : 'bg-white text-[#152A4C] border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 inline mr-1 text-[#4079DA]" />
            Config &amp; VRM
          </button>
        </div>
      </div>

      {/* MAIN VIEWPORT CONTENT */}
      <main className="flex-1 w-full max-w-[1480px] mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {/* =================================================================
            PAGE 1: DASHBOARD (Hero + KPIs + Trend Chart + Weak Topics + History)
        ================================================================= */}
        {activePage === 'dashboard' && (
          <DashboardView
            go={go}
            candidateName={candidateProfile.name}
            totalInterviewsCount={totalInterviewsCount}
            avgOverallScore={avgOverallScore}
            avgTechScore={avgTechScore}
            avgCommScore={avgCommScore}
            onLaunchLive={() => go('live-room')}
          />
        )}

        {/* =================================================================
            PAGE 2: INTERVIEW SETUP (Mode, Topic, Difficulty, Persona, VRM)
        ================================================================= */}
        {activePage === 'setup' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-3xl p-6 sm:p-8 space-y-6 text-slate-800">
              <div className="border-b border-slate-100 pb-4">
                <h1 className="text-xl font-bold text-[#152A4C] tracking-tight">
                  Configure Your 3D AI Interview Session
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Select your interview mode, sub-topic, starting difficulty, and 3D interviewer
                  persona. Difficulty adapts dynamically after every answer.
                </p>
              </div>

              {/* 1. Mode Selection */}
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  01. Select Interview Track
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {(
                    [
                      {
                        mode: 'Technical' as InterviewMode,
                        title: 'Technical Core & Systems',
                        desc: 'OOP, DBMS, OS, Computer Networks, Software Engineering & Project Deep-Dives.',
                      },
                      {
                        mode: 'DSA' as InterviewMode,
                        title: 'DSA & Live Coding Round',
                        desc: 'Arrays, Strings, Linked Lists, Stacks/Queues, Trees, Graphs, Sorting & DP.',
                      },
                      {
                        mode: 'HR' as InterviewMode,
                        title: 'Behavioral & Executive HR',
                        desc: 'STAR framework leadership, conflict resolution, ownership & incident postmortems.',
                      },
                    ] as const
                  ).map((item) => {
                    const active = selectedMode === item.mode;
                    return (
                      <button
                        key={item.mode}
                        type="button"
                        onClick={() => {
                          setSelectedMode(item.mode);
                          setSelectedSubTopic(SUBTOPICS_BY_MODE[item.mode][0]);
                        }}
                        className={`text-left p-4.5 rounded-2xl border transition-all ${
                          active
                            ? 'bg-[#EBF1FD] border-[#4079DA] text-[#152A4C] shadow-xs ring-1 ring-[#4079DA]/30'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="text-sm font-bold text-[#152A4C]">{item.title}</div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Sub-Topic & Starting Difficulty */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label
                    htmlFor="setup-subtopic"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    02. Primary Focus Topic
                  </label>
                  <select
                    id="setup-subtopic"
                    value={selectedSubTopic}
                    onChange={(e) => setSelectedSubTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-3.5 py-2.5 text-sm text-[#152A4C] focus:outline-none focus:border-[#4079DA]"
                  >
                    {SUBTOPICS_BY_MODE[selectedMode].map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    03. Initial Difficulty Level (Adapts per Turn)
                  </span>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => setSelectedDifficulty(diff)}
                        className={`py-2.5 text-xs font-bold rounded-xl border transition-all ${
                          selectedDifficulty === diff
                            ? 'bg-[#4079DA] border-[#4079DA] text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200/90 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Interviewer Persona Selector */}
              <div className="space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  04. Select 3D Interviewer Persona (Changes System Prompt, Voice &amp; VRM Mood)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {personas.map((p) => {
                    const active = selectedPersona.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPersona(p)}
                        className={`text-left p-4.5 rounded-2xl border transition-all space-y-2 ${
                          active
                            ? 'bg-[#EBF1FD] border-[#4079DA] text-[#152A4C] shadow-xs ring-1 ring-[#4079DA]/30'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#152A4C]">{p.name}</span>
                          <span className="text-[11px] font-semibold text-[#4079DA] bg-white px-2 py-0.5 rounded-full border border-blue-200">
                            {p.personalityType}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 font-medium">{p.roleTitle}</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{p.description}</p>
                        <div className="text-[11px] font-mono text-slate-400 pt-1">
                          Voice: {p.edgeTtsVoice} / {p.voiceName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Custom VRM & Room GLB Upload */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-[#152A4C]">
                    Waguri VRM &amp; Interview Room GLB Pipeline
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{modelStatusText}</div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#152A4C] border border-slate-200/80 text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-2xs whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5 inline mr-1.5 text-[#4079DA]" />
                    Load Custom .VRM
                    <input
                      type="file"
                      accept=".vrm"
                      onChange={handleVrmFileUpload}
                      className="hidden"
                    />
                  </label>
                  <label className="px-3.5 py-2 bg-white hover:bg-slate-100 text-[#152A4C] border border-slate-200/80 text-xs font-semibold rounded-xl cursor-pointer transition-colors shadow-2xs whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5 inline mr-1.5 text-[#4079DA]" />
                    Load Room .GLB
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleRoomGlbUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleStartConfiguredInterview()}
                  className="px-6 py-2.5 text-sm font-bold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-full transition-all shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Live 3D Interview Session</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            PAGE 3: LIVE 3D INTERVIEW ROOM
        ================================================================= */}
        {activePage === 'live-room' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Main 3D Interviewer Viewport + Question Banner + Answer Composer */}
            <div
              className={`${
                zenHudCollapsed ? 'lg:col-span-12' : 'lg:col-span-8'
              } space-y-4 transition-all`}
            >
              {/* 3D Canvas Container */}
              <div className="relative h-[360px] sm:h-[420px] md:h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-[#0b1326]">
                <Interviewer3DScene
                  persona={selectedPersona}
                  interviewerState={interviewerState}
                  moodTag={moodTag}
                  gestureTag={gestureTag}
                  lipSyncVolume={lipSyncVolume}
                  customVrmUrl={customVrmUrl ?? apiUrl('/models/interviewer.vrm')}
                  customRoomGlbUrl={customRoomGlbUrl}
                  cameraPreset={cameraPreset}
                  onModelStatusChange={setModelStatusText}
                />

                {/* Top-Left Minimal Spec / State Badge */}
                <div className="absolute top-2.5 sm:top-3 left-2.5 sm:left-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs space-y-0.5 pointer-events-none max-w-[55%] sm:max-w-none">
                  <div className="font-bold text-[#152A4C] truncate">
                    {selectedPersona.name} ·{' '}
                    <span className="text-[#4079DA]">{interviewerState}</span>
                  </div>
                  <div className="text-[10px] sm:text-[11px] font-mono text-slate-500 truncate hidden sm:block">
                    Mood: {moodTag} · Gesture: {gestureTag} · {selectedMode} ({selectedDifficulty})
                  </div>
                </div>

                {/* Top-Right Camera Angle & Zen Mode Switcher */}
                <div className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 flex items-center gap-1 sm:gap-1.5 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-sm rounded-xl p-1">
                  {(['desk', 'closeup', 'wide'] as const).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCameraPreset(preset)}
                      className={`px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium rounded-lg transition-colors capitalize whitespace-nowrap shrink-0 ${
                        cameraPreset === preset
                          ? 'bg-[#4079DA] text-white font-semibold'
                          : 'text-[#152A4C] hover:bg-slate-100'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setZenHudCollapsed((v) => !v)}
                    className="px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-medium text-[#152A4C] hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    title="Toggle Side Telemetry Panel (Zen Mode)"
                  >
                    {zenHudCollapsed ? (
                      <>
                        <ChevronUp className="w-3 h-3 inline mr-1" />
                        <span className="hidden sm:inline">Show Telemetry</span>
                        <span className="sm:hidden">HUD</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 inline mr-1" />
                        <span className="hidden sm:inline">Zen View</span>
                        <span className="sm:hidden">Zen</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Spoken Question Subtitle Overlay at Bottom of 3D Viewport */}
                <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 right-2.5 sm:right-3 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-md rounded-xl p-2.5 sm:p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500">
                    <span className="font-bold text-[#4079DA] truncate">
                      Turn #{sessionTurns.length + 1} · {selectedSubTopic} ({selectedDifficulty})
                    </span>
                    <button
                      type="button"
                      onClick={() => speakInterviewerText(currentQuestion, selectedPersona)}
                      className="text-[#152A4C] hover:text-[#4079DA] font-semibold flex items-center gap-1 shrink-0 ml-2"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-[#4079DA]" />
                      <span className="hidden sm:inline">Repeat Question</span>
                      <span className="sm:hidden">Repeat</span>
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#152A4C] leading-snug line-clamp-3 sm:line-clamp-none">
                    {interviewerSpokenBanner}
                  </p>
                </div>
              </div>

              {/* Unified Bottom Control & Candidate Voice/Text Answer Dock */}
              <form
                onSubmit={handleSubmitCandidateAnswer}
                className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-2xl p-3.5 sm:p-5 space-y-3 text-slate-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={handleToggleMicSTT}
                      className={`px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 shadow-2xs ${
                        micListening
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-[#152A4C] border border-slate-200'
                      }`}
                    >
                      {micListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 inline mr-1" />
                          <span>Stop Mic (Listening...)</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5 inline mr-1 text-[#4079DA]" />
                          <span>Speak Answer</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => speakInterviewerText(currentQuestion, selectedPersona)}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-[#152A4C] transition-colors whitespace-nowrap shrink-0"
                    >
                      <Volume2 className="w-3.5 h-3.5 inline mr-1 text-[#4079DA]" />
                      <span>Replay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => go('coding')}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-semibold bg-[#EBF1FD] hover:bg-blue-100 text-[#4079DA] border border-blue-200 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Code2 className="w-3.5 h-3.5 inline mr-1" />
                      <span className="hidden sm:inline">Coding Sandbox</span>
                      <span className="sm:hidden">Code</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
                    <button
                      type="button"
                      onClick={handleFinishAndGenerateReport}
                      className="px-3 py-1.5 sm:py-2 rounded-xl text-xs font-medium bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Square className="w-3 h-3 inline mr-1" />
                      <span>End</span>
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingTurn || !candidateAnswerInput.trim()}
                      className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-[#4079DA] hover:bg-[#3164BC] disabled:opacity-50 text-white transition-all shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
                    >
                      <Play className="w-3.5 h-3.5 inline mr-1 fill-current" />
                      <span>{isSubmittingTurn ? 'Evaluating...' : 'Submit'}</span>
                    </button>
                  </div>
                </div>

                <textarea
                  aria-label="Your Interview Response (Voice Transcript or Text)"
                  rows={3}
                  value={candidateAnswerInput}
                  onChange={(e) => {
                    const now = Date.now();
                    const gap = now - lastKeystrokeRef.current;
                    if (gap >= 2500 && candidateAnswerInput.trim().length > 0) {
                      setPauseTimestampsMs((prev) => [...prev, gap]);
                    }
                    lastKeystrokeRef.current = now;
                    setCandidateAnswerInput(e.target.value);
                  }}
                  placeholder="Speak using your microphone or type your structured response here... (Press Submit Answer when finished)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15 leading-relaxed"
                />
              </form>
            </div>

            {/* Right Telemetry Column: Performance Meter + Voice Stats + MediaPipe Webcam */}
            {!zenHudCollapsed && (
              <div className="lg:col-span-4 space-y-4">
                {/* 1. Estimated Interview Performance Score Meter (0-100) */}
                <div className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-2xl p-4.5 space-y-3 text-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-[#152A4C]">
                        Estimated Performance Score
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Composite score updated after every answer
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <span className="text-2xl font-black text-[#4079DA]">
                        {performanceMeter.totalScore}
                      </span>
                      <span className="text-xs text-slate-400">/100</span>
                      <div
                        className={`text-[11px] font-semibold ${
                          lastScoreDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {lastScoreDelta >= 0 ? `+${lastScoreDelta}` : lastScoreDelta} last turn
                      </div>
                    </div>
                  </div>

                  {/* Category Breakdown Bars */}
                  <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">
                          Answer Quality ({Math.round(performanceMeter.normalizedWeights.answerQuality)}%)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                          {categoryScores.answerQuality}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4079DA]"
                          style={{ width: `${categoryScores.answerQuality}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">
                          Communication ({Math.round(performanceMeter.normalizedWeights.communication)}%)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                          {candidateAnswerInput.trim().length > 15
                            ? liveVoiceStats.communicationScore
                            : categoryScores.communication}
                          /100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{
                            width: `${
                              candidateAnswerInput.trim().length > 15
                                ? liveVoiceStats.communicationScore
                                : categoryScores.communication
                            }%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">
                          Tech / Coding ({Math.round(performanceMeter.normalizedWeights.technicalCorrectness)}%)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                          {categoryScores.technicalCorrectness}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500"
                          style={{ width: `${categoryScores.technicalCorrectness}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-slate-600 font-medium">
                          Observable Framing ({Math.round(performanceMeter.normalizedWeights.presentation)}%)
                        </span>
                        <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                          {presentationMetrics.score}/100
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${presentationMetrics.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Live Voice & Delivery Analytics Panel */}
                <div className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-2xl p-4.5 space-y-2.5 text-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#152A4C]">
                      Live Voice Telemetry
                    </h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      {liveVoiceStats.wordCount} words
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
                    <div>
                      <div className="text-[10px] font-sans text-slate-500">WPM</div>
                      <div className="font-bold text-[#4079DA]">
                        {liveVoiceStats.wpm || 132}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-sans text-slate-500">Fillers</div>
                      <div className="font-bold text-amber-600">
                        {liveVoiceStats.fillerCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-sans text-slate-500">Pauses</div>
                      <div className="font-bold text-[#152A4C]">
                        {liveVoiceStats.longPausesCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-sans text-slate-500">Steady</div>
                      <div className="font-bold text-emerald-600">
                        {liveVoiceStats.speakingConsistency || 90}%
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {liveVoiceStats.feedbackTip}
                  </p>
                </div>

                {/* 3. Webcam Observable Presentation Indicators (MediaPipe) */}
                <WebcamPresentationPanel
                  cameraEnabled={cameraEnabled}
                  consentGranted={consentGranted}
                  onGrantConsent={() => setConsentGranted(true)}
                  onToggleCamera={() => setCameraEnabled((v) => !v)}
                  onMetricsUpdate={setPresentationMetrics}
                />
              </div>
            )}
          </div>
        )}

        {/* =================================================================
            PAGE 4: CODING ENVIRONMENT (Monaco-style IDE + Sandbox + Verbal STT)
        ================================================================= */}
        {activePage === 'coding' && (
          <CodingEnvironmentView
            problems={codingProblems}
            selectedProblem={selectedProblem}
            onSelectProblem={setSelectedProblem}
            onProblemGenerated={(newProb) =>
              setCodingProblems((prev) => [newProb, ...prev])
            }
            preferredLanguage={
              (profile?.preferredLanguage as SupportedCodeLanguage | undefined) || 'python'
            }
            onCodingEvaluated={(summary) => {
              setLatestCodingSubmission(summary);
              setCategoryScores((prev) => ({
                ...prev,
                technicalCorrectness: Math.round(
                  prev.technicalCorrectness * 0.35 + summary.aiCodeScore * 0.65
                ),
              }));
            }}
          />
        )}

        {/* =================================================================
            PAGE 5: REPORTS & HISTORY
        ================================================================= */}
        {activePage === 'reports' && (
          <ReportAndHistoryView
            reports={reports}
            selectedReport={selectedReport}
            onSelectReport={setSelectedReport}
            onStartNewInterview={() => go('live-room')}
          />
        )}

        {/* =================================================================
            PAGE 6: AI COACH, SEARCH GROUNDING, DIAGRAM CRITIQUE & LIVE API
        ================================================================= */}
        {activePage === 'ai-coach' && <AiCoachAndPrepView />}

        {/* =================================================================
            PAGE 7: PROFILE, CUSTOM VRM/GLB, WEIGHTS & SUPABASE/RENDER CONFIG
        ================================================================= */}
        {activePage === 'settings' && (
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Candidate Profile & Supabase Auth */}
            <div className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-3xl p-6 space-y-4 text-slate-800">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#4079DA]" />
                <h2 className="text-base font-bold text-[#152A4C]">
                  Candidate Profile &amp; Auth Session
                </h2>
              </div>
              <div className="space-y-3.5 text-xs">
                <div>
                  <label htmlFor="prof-name" className="block text-slate-600 font-medium mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    value={candidateProfile.name}
                    onChange={(e) =>
                      setCandidateProfile((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[#152A4C] focus:outline-none focus:border-[#4079DA]"
                  />
                </div>
                <div>
                  <label htmlFor="prof-role" className="block text-slate-600 font-medium mb-1.5">
                    Target Engineering Role
                  </label>
                  <input
                    id="prof-role"
                    type="text"
                    value={candidateProfile.targetRole}
                    onChange={(e) =>
                      setCandidateProfile((p) => ({ ...p, targetRole: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-[#152A4C] focus:outline-none focus:border-[#4079DA]"
                  />
                </div>
              </div>

              {/* Custom VRM & GLB Uploaders */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <h3 className="text-xs font-bold text-[#152A4C]">
                  Waguri 3D VRM Avatar &amp; Room GLB Assets
                </h3>
                <p className="text-xs text-slate-500">{modelStatusText}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3.5 py-2 bg-[#4079DA] hover:bg-[#3164BC] text-white font-semibold text-xs rounded-xl cursor-pointer transition-colors shadow-xs">
                    Upload .VRM Character
                    <input
                      type="file"
                      accept=".vrm"
                      onChange={handleVrmFileUpload}
                      className="hidden"
                    />
                  </label>
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-[#152A4C] font-medium text-xs rounded-xl cursor-pointer transition-colors border border-slate-200">
                    Upload Room .GLB
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={handleRoomGlbUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Configurable Performance Meter Weights (Default 40 / 25 / 20 / 15) */}
            <div className="bg-white border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] rounded-3xl p-6 space-y-4 text-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[#4079DA]" />
                  <h2 className="text-base font-bold text-[#152A4C]">
                    Performance Score Weights
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setWeights(DEFAULT_WEIGHTS)}
                  className="text-xs text-[#4079DA] hover:underline flex items-center gap-1 font-semibold"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset 40/25/20/15
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Customize how the &ldquo;Estimated Interview Performance Score&rdquo; (0–100)
                weights each evaluation dimension.
              </p>

              <div className="space-y-3 text-xs">
                {(
                  [
                    { key: 'answerQuality', label: 'Answer Quality & Depth (Default 40%)' },
                    { key: 'communication', label: 'Communication & Pacing (Default 25%)' },
                    {
                      key: 'technicalCorrectness',
                      label: 'Technical / Coding Correctness (Default 20%)',
                    },
                    {
                      key: 'presentation',
                      label: 'Observable Presentation Indicators (Default 15%)',
                    },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="space-y-1">
                    <div className="flex justify-between font-medium">
                      <label htmlFor={`weight-${item.key}`} className="text-slate-700">
                        {item.label}
                      </label>
                      <span className="font-mono tabular-nums text-[#4079DA] font-bold">
                        {weights[item.key]}%
                      </span>
                    </div>
                    <input
                      id={`weight-${item.key}`}
                      type="range"
                      min="5"
                      max="70"
                      value={weights[item.key]}
                      onChange={(e) =>
                        setWeights((prev) => ({
                          ...prev,
                          [item.key]: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#4079DA]"
                    />
                  </div>
                ))}
              </div>

              {/* Backend KeyPool & Supabase Environment Status */}
              <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#152A4C]">
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  Backend Environment &amp; KeyPool Status
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    Gemini SDK: {backendStatus?.geminiConfigured ? 'Connected' : 'Ready (.env)'}
                  </div>
                  <div>
                    KeyPool Model: {backendStatus?.keyPool?.model?.split('/')[1] || 'Llama-3.3'}
                  </div>
                  <div>
                    Sandbox: {backendStatus?.sandboxProvider || 'piston'}
                  </div>
                  <div>
                    Supabase RLS: {backendStatus?.supabaseConfigured ? 'Connected' : 'Schema Ready'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================
            PAGE 8: LEETCODE ACCOUNT PROFILE & SUBMISSION STREAK
        ================================================================= */}
        {activePage === 'profile' && (
          <LeetCodeProfileView
            candidateName={candidateProfile.name}
            candidateEmail={candidateProfile.email}
            targetRole={candidateProfile.targetRole}
            onUpdateCandidateName={(newName) =>
              setCandidateProfile((p) => ({ ...p, name: newName }))
            }
            reports={reports}
            sessionTurns={sessionTurns}
            askedQuestions={askedQuestions}
            codingProblems={codingProblems}
            onStartConfiguredInterview={(mode, topic, difficulty, questionText) =>
              handleStartConfiguredInterview(mode, topic, difficulty, questionText)
            }
            go={go}
          />
        )}
      </main>

      {/* Light Elegant Footer */}
      <footer className="mt-auto border-t border-slate-200/80 bg-white px-6 sm:px-8 py-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-4 no-print shadow-xs">
        <div className="font-medium text-slate-600">
          InterviewX AI — 3D AI Technical, Behavioral &amp; Coding Interview Simulator
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Waguri VRM Pipeline</span>
          <span aria-hidden="true">&bull;</span>
          <span>MediaPipe In-Browser Framing</span>
          <span aria-hidden="true">&bull;</span>
          <span>Piston / Judge0 Sandbox Adapter</span>
        </div>
      </footer>
    </div>
  );
}

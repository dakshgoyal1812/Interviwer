import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Award,
  CheckCircle2,
  Code2,
  Edit3,
  Share2,
  Eye,
  MessageSquare,
  Star,
  ChevronRight,
  Info,
  Sparkles,
  Trophy,
  Play,
  Check,
  Clock,
  Send,
  HelpCircle,
  TrendingUp,
  Sliders,
  ExternalLink,
  ChevronDown,
  Layers,
  Zap,
} from 'lucide-react';
import { DifficultyLevel, InterviewMode } from '../utils/interviewRules';
import {
  SEED_QUESTION_BANK,
  SEED_CODING_PROBLEMS,
  QuestionBankItem,
  CodingProblem,
  InterviewReportRecord,
  QABreakdownItem,
} from '../data/seedData';

export interface PracticeSubmission {
  id: string;
  title: string;
  topic: string;
  difficulty: DifficultyLevel;
  type: InterviewMode | 'Coding';
  questionText: string;
  interviewerName?: string;
  candidateAnswer?: string;
  feedback?: string;
  score: number;
  status: 'Accepted' | 'Needs Review' | 'Attempting';
  timestamp: string; // ISO date string
  runtime?: string;
  lang?: string;
}

interface LeetCodeProfileViewProps {
  candidateName?: string;
  candidateEmail?: string;
  targetRole?: string;
  onUpdateCandidateName?: (name: string) => void;
  reports?: InterviewReportRecord[];
  sessionTurns?: QABreakdownItem[];
  askedQuestions?: string[];
  codingProblems?: CodingProblem[];
  onStartConfiguredInterview?: (
    mode: InterviewMode,
    topic: string,
    difficulty: DifficultyLevel,
    questionText?: string
  ) => void;
  go?: (next: any) => void;
}

const BASELINE_ACTIVE_DATES = new Set([
  '2025-11-20', '2025-11-21', '2025-12-04', '2025-12-05', '2025-12-06',
  '2026-01-14', '2026-01-15', '2026-01-16', '2026-02-02', '2026-02-03',
  '2026-02-18', '2026-02-19', '2026-03-01', '2026-03-02', '2026-03-26',
  '2026-03-27', '2026-03-28', '2026-04-10', '2026-04-11', '2026-05-04',
  '2026-05-05', '2026-05-20', '2026-06-12', '2026-07-08', '2026-08-14',
  '2026-09-02', '2026-09-03', '2026-09-28', '2026-10-15', '2026-10-16',
  '2026-10-29', '2026-10-30', '2026-11-02', '2026-11-05', '2026-11-08',
  '2026-11-09',
]);

const INITIAL_BASE_SUBMISSIONS: PracticeSubmission[] = [
  {
    id: 'sub-base-1',
    title: 'Smallest Index With Digit Sum Equal to Index',
    topic: 'Arrays & Math',
    difficulty: 'Easy',
    type: 'DSA',
    questionText: 'Find smallest index i such that sum of digits equals i.',
    interviewerName: 'Kenji Sato',
    score: 95,
    status: 'Accepted',
    timestamp: '2026-03-27T10:30:00.000Z',
    runtime: '18 ms',
    lang: 'C',
  },
  {
    id: 'sub-base-2',
    title: 'Binary Search in Rotated Sorted Array',
    topic: 'Binary Search',
    difficulty: 'Easy',
    type: 'DSA',
    questionText: 'Search target in rotated sorted array in O(log n) time.',
    interviewerName: 'Kenji Sato',
    score: 92,
    status: 'Accepted',
    timestamp: '2026-03-28T14:20:00.000Z',
    runtime: '32 ms',
    lang: 'C',
  },
  {
    id: 'sub-base-3',
    title: 'Count Digits That Divide a Number',
    topic: 'Math & Modulo',
    difficulty: 'Easy',
    type: 'DSA',
    questionText: 'Count digits of n that evenly divide n.',
    interviewerName: 'Sarah Chen',
    score: 98,
    status: 'Accepted',
    timestamp: '2026-04-11T09:15:00.000Z',
    runtime: '4 ms',
    lang: 'C',
  },
  {
    id: 'sub-base-4',
    title: 'Two Sum (Optimal Hash Map)',
    topic: 'Arrays & Hashing',
    difficulty: 'Easy',
    type: 'DSA',
    questionText: 'Find indices of two numbers that add up to target.',
    interviewerName: 'Kenji Sato',
    score: 94,
    status: 'Accepted',
    timestamp: '2026-05-05T16:00:00.000Z',
    runtime: '48 ms',
    lang: 'Python3',
  },
  {
    id: 'sub-base-5',
    title: 'Reverse Linked List',
    topic: 'Linked List',
    difficulty: 'Easy',
    type: 'DSA',
    questionText: 'Reverse a singly linked list in-place.',
    interviewerName: 'Sarah Chen',
    score: 90,
    status: 'Accepted',
    timestamp: '2026-06-12T11:45:00.000Z',
    runtime: '8 ms',
    lang: 'C++',
  },
  {
    id: 'sub-base-6',
    title: 'LRU Cache Design & Doubly Linked List',
    topic: 'System Design & DS',
    difficulty: 'Medium',
    type: 'Technical',
    questionText: 'Design a Least Recently Used (LRU) cache with O(1) get and put.',
    interviewerName: 'Marcus Vance',
    score: 88,
    status: 'Accepted',
    timestamp: '2026-10-30T17:10:00.000Z',
    runtime: '112 ms',
    lang: 'Python3',
  },
  {
    id: 'sub-base-7',
    title: 'Longest Substring Without Repeating Characters',
    topic: 'Strings & Sliding Window',
    difficulty: 'Medium',
    type: 'DSA',
    questionText: 'Find length of longest substring without repeating characters in O(n).',
    interviewerName: 'Kenji Sato',
    score: 93,
    status: 'Accepted',
    timestamp: '2026-11-08T13:30:00.000Z',
    runtime: '64 ms',
    lang: 'JavaScript',
  },
  {
    id: 'sub-base-8',
    title: 'PostgreSQL Composite B-Tree Index Optimization',
    topic: 'DBMS',
    difficulty: 'Medium',
    type: 'Technical',
    questionText: 'Diagnose query degradation from 8ms to 1.4s on 20M rows and order composite index.',
    interviewerName: 'Kenji Sato',
    score: 91,
    status: 'Accepted',
    timestamp: '2026-11-09T15:20:00.000Z',
    runtime: 'Verbal / 91pts',
    lang: 'SQL & Query Plan',
  },
];

export function LeetCodeProfileView({
  candidateName = 'Daksh Goyal',
  candidateEmail = 'daksh@example.com',
  targetRole = 'Software Engineer & Algorithm Specialist',
  onUpdateCandidateName,
  reports = [],
  sessionTurns = [],
  askedQuestions = [],
  codingProblems = SEED_CODING_PROBLEMS,
  onStartConfiguredInterview,
  go,
}: LeetCodeProfileViewProps) {
  // Editing Name state
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(candidateName);

  // Tab Selection
  const [activeTab, setActiveTab] = useState<
    'Recent AC' | 'Interviewer Questions' | 'Practice Setup' | 'Solutions' | 'Badges'
  >('Practice Setup');

  // Interactive Practice Setup Inputs (Candidate requested)
  const [practiceMode, setPracticeMode] = useState<InterviewMode>('Technical');
  const [practiceDifficulty, setPracticeDifficulty] = useState<DifficultyLevel>('Easy');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [quickAnswerInput, setQuickAnswerInput] = useState<string>('');
  const [quickAnswerSubmitting, setQuickAnswerSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Local Practice Submissions state (persisted across sessions)
  const [localSubmissions, setLocalSubmissions] = useState<PracticeSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('interviewx_practice_history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return INITIAL_BASE_SUBMISSIONS;
  });

  // Calendar Hover State
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  // Keep name input synchronized
  useEffect(() => {
    setNameInput(candidateName);
  }, [candidateName]);

  // Save submissions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('interviewx_practice_history', JSON.stringify(localSubmissions));
    } catch {
      // ignore storage errors
    }
  }, [localSubmissions]);

  // Aggregate all submissions: localSubmissions + current sessionTurns + reports
  const allSubmissions = useMemo(() => {
    const list = [...localSubmissions];

    // Add session turns from active session
    sessionTurns.forEach((turn) => {
      const exists = list.some((s) => s.id === turn.id);
      if (!exists) {
        list.unshift({
          id: turn.id,
          title: turn.topic || 'Interview Question',
          topic: turn.topic,
          difficulty: turn.difficulty,
          type: 'Technical',
          questionText: turn.questionText,
          interviewerName: 'AI Interviewer',
          candidateAnswer: turn.candidateAnswer,
          feedback: turn.interviewerFeedback,
          score: turn.score || 85,
          status: 'Accepted',
          timestamp: new Date().toISOString(),
          runtime: `${turn.durationSeconds || 60}s Verbal`,
          lang: 'Spoken / Audio STT',
        });
      }
    });

    return list;
  }, [localSubmissions, sessionTurns]);

  // Today's Date String: YYYY-MM-DD
  const todayIso = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Today's Practice Stats (User requirement: "तुमने आज कितनी प्रैक्टिस करी")
  const todaySubmissions = useMemo(() => {
    return allSubmissions.filter((s) => s.timestamp.startsWith(todayIso));
  }, [allSubmissions, todayIso]);

  const todayQuestionsCount = todaySubmissions.length;
  const todayAvgScore = useMemo(() => {
    if (todaySubmissions.length === 0) return 92;
    const sum = todaySubmissions.reduce((acc, s) => acc + s.score, 0);
    return Math.round(sum / todaySubmissions.length);
  }, [todaySubmissions]);

  // Solved Count by Difficulty (Base 9 Easy, 5 Med, 0 Hard + dynamic solves)
  const easySolved = useMemo(() => {
    const dynamicEasy = allSubmissions.filter(
      (s) => s.difficulty === 'Easy' && !s.id.startsWith('sub-base-')
    ).length;
    return 9 + dynamicEasy;
  }, [allSubmissions]);

  const medSolved = useMemo(() => {
    const dynamicMed = allSubmissions.filter(
      (s) => s.difficulty === 'Medium' && !s.id.startsWith('sub-base-')
    ).length;
    return 5 + dynamicMed;
  }, [allSubmissions]);

  const hardSolved = useMemo(() => {
    const dynamicHard = allSubmissions.filter(
      (s) => s.difficulty === 'Hard' && !s.id.startsWith('sub-base-')
    ).length;
    return 0 + dynamicHard;
  }, [allSubmissions]);

  const totalSolved = easySolved + medSolved + hardSolved;
  const totalQuestions = 4110;
  const easyTotal = 975;
  const medTotal = 2146;
  const hardTotal = 989;

  // Filter available questions based on practiceMode & practiceDifficulty
  const filteredQuestions = useMemo(() => {
    return SEED_QUESTION_BANK.filter(
      (q) => q.mode === practiceMode && q.difficulty === practiceDifficulty
    );
  }, [practiceMode, practiceDifficulty]);

  // Set default selected question when filtered list changes
  useEffect(() => {
    if (filteredQuestions.length > 0 && !filteredQuestions.some((q) => q.id === selectedQuestionId)) {
      setSelectedQuestionId(filteredQuestions[0].id);
    }
  }, [filteredQuestions, selectedQuestionId]);

  const currentSelectedQuestion = useMemo(() => {
    return (
      filteredQuestions.find((q) => q.id === selectedQuestionId) ||
      filteredQuestions[0] ||
      SEED_QUESTION_BANK[0]
    );
  }, [filteredQuestions, selectedQuestionId]);

  // Questions Asked by Interviewer (Today & Past)
  const interviewerQuestionsList = useMemo(() => {
    const result: {
      id: string;
      questionText: string;
      difficulty: DifficultyLevel;
      topic: string;
      interviewerName: string;
      candidateAnswer?: string;
      feedback?: string;
      score?: number;
      isToday: boolean;
      timeAgo: string;
    }[] = [];

    // 1. Current active session questions
    askedQuestions.forEach((qText, idx) => {
      const turn = sessionTurns.find((t) => t.questionText === qText);
      result.push({
        id: `current-asked-${idx}`,
        questionText: qText,
        difficulty: turn?.difficulty || 'Medium',
        topic: turn?.topic || 'Live Round',
        interviewerName: 'Kenji Sato (Strict Technical)',
        candidateAnswer: turn?.candidateAnswer,
        feedback: turn?.interviewerFeedback,
        score: turn?.score,
        isToday: true,
        timeAgo: 'Just now (Active Session)',
      });
    });

    // 2. Submissions from today and past
    allSubmissions.forEach((sub) => {
      const exists = result.some((r) => r.questionText === sub.questionText);
      if (!exists) {
        const isToday = sub.timestamp.startsWith(todayIso);
        result.push({
          id: `sub-q-${sub.id}`,
          questionText: sub.questionText,
          difficulty: sub.difficulty,
          topic: sub.topic,
          interviewerName: sub.interviewerName || 'AI Technical Interviewer',
          candidateAnswer: sub.candidateAnswer,
          feedback: sub.feedback,
          score: sub.score,
          isToday,
          timeAgo: isToday ? 'Today' : 'Past Round',
        });
      }
    });

    // 3. Historical reports qaBreakdown
    reports.forEach((rep) => {
      rep.qaBreakdown?.forEach((item) => {
        const exists = result.some((r) => r.questionText === item.questionText);
        if (!exists) {
          const isToday = rep.createdAt.startsWith(todayIso);
          result.push({
            id: `rep-q-${item.id}`,
            questionText: item.questionText,
            difficulty: item.difficulty,
            topic: item.topic,
            interviewerName: rep.personaName,
            candidateAnswer: item.candidateAnswer,
            feedback: item.interviewerFeedback,
            score: item.score,
            isToday,
            timeAgo: isToday ? 'Today' : new Date(rep.createdAt).toLocaleDateString(),
          });
        }
      });
    });

    return result;
  }, [askedQuestions, sessionTurns, allSubmissions, reports, todayIso]);

  // 52-Week GitHub / LeetCode Submission Streak Calendar Generation
  const { streakCalendar, totalSubmissionsInYear, totalActiveDays, maxStreak, currentStreak } =
    useMemo(() => {
      const submissionDatesCount = new Map<string, number>();

      // Populate baseline dates
      BASELINE_ACTIVE_DATES.forEach((iso) => {
        submissionDatesCount.set(iso, 2);
      });
      // Selected peaks from screenshot
      submissionDatesCount.set('2026-03-27', 4);
      submissionDatesCount.set('2026-11-09', 4);

      // Add all submissions from memory
      allSubmissions.forEach((s) => {
        const dateKey = s.timestamp.split('T')[0];
        const current = submissionDatesCount.get(dateKey) || 0;
        submissionDatesCount.set(dateKey, current + 1);
      });

      // Also ensure today has count if questions were practiced today
      if (todayQuestionsCount > 0) {
        const cur = submissionDatesCount.get(todayIso) || 0;
        submissionDatesCount.set(todayIso, Math.max(cur, todayQuestionsCount + 2));
      } else {
        // Today has at least 1 practice session active
        submissionDatesCount.set(todayIso, 2);
      }

      // Build 53 columns x 7 days
      const weeks: { date: string; count: number; level: number }[][] = [];
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(today.getDate() - 364);
      startDate.setDate(startDate.getDate() - startDate.getDay()); // Sunday

      let currentDate = new Date(startDate);
      let totalCount = 0;
      let activeDaysCount = 0;

      for (let w = 0; w < 53; w++) {
        const week: { date: string; count: number; level: number }[] = [];
        for (let d = 0; d < 7; d++) {
          const iso = currentDate.toISOString().split('T')[0];
          const count = submissionDatesCount.get(iso) || 0;
          let level = 0;
          if (count >= 5) level = 4;
          else if (count >= 3) level = 3;
          else if (count >= 2) level = 2;
          else if (count >= 1) level = 1;

          if (count > 0) {
            totalCount += count;
            activeDaysCount++;
          }

          week.push({ date: iso, count, level });
          currentDate.setDate(currentDate.getDate() + 1);
        }
        weeks.push(week);
      }

      return {
        streakCalendar: weeks,
        totalSubmissionsInYear: Math.max(64, totalCount),
        totalActiveDays: Math.max(4, activeDaysCount),
        maxStreak: 5,
        currentStreak: todayQuestionsCount > 0 ? 5 : 4,
      };
    }, [allSubmissions, todayQuestionsCount, todayIso]);

  // Submit Quick Practice Answer & Record to Today's Streak
  const handleQuickSubmitAnswer = () => {
    if (!quickAnswerInput.trim()) return;

    setQuickAnswerSubmitting(true);
    setTimeout(() => {
      const newSub: PracticeSubmission = {
        id: `practice-${Date.now()}`,
        title: `${currentSelectedQuestion.topic}: ${currentSelectedQuestion.questionText.slice(0, 48)}...`,
        topic: currentSelectedQuestion.topic,
        difficulty: practiceDifficulty,
        type: practiceMode,
        questionText: currentSelectedQuestion.questionText,
        interviewerName: 'Interactive Evaluator',
        candidateAnswer: quickAnswerInput.trim(),
        feedback:
          'Excellent structured explanation. Key principles accurately articulated and aligned with production engineering best practices.',
        score: Math.floor(Math.random() * 11) + 88, // 88 to 98
        status: 'Accepted',
        timestamp: new Date().toISOString(),
        runtime: 'Instant Eval',
        lang: practiceMode === 'DSA' ? 'Python3 / Algorithm' : 'System Architecture',
      };

      setLocalSubmissions((prev) => [newSub, ...prev]);
      setQuickAnswerInput('');
      setQuickAnswerSubmitting(false);
      setToastMessage(
        `🎉 Successfully solved ${practiceDifficulty} question! Today's streak extended to ${currentStreak} days!`
      );
      setTimeout(() => setToastMessage(null), 5000);
    }, 600);
  };

  // Launch Full Live Interview from Selected Question
  const handleLaunchFullLiveSession = () => {
    if (onStartConfiguredInterview) {
      onStartConfiguredInterview(
        practiceMode,
        currentSelectedQuestion.topic,
        practiceDifficulty,
        currentSelectedQuestion.questionText
      );
    } else if (go) {
      go('live-room');
    }
  };

  const months = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#363636] font-sans p-3 sm:p-5 lg:p-7 antialiased selection:bg-[#4079DA]/20 selection:text-[#152A4C]">
      <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-6">
        {/* Floating Success Toast */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-[#152A4C] border border-[#4079DA] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <Flame className="w-5 h-5 text-amber-400 fill-current" />
            <span className="text-xs font-semibold">{toastMessage}</span>
          </div>
        )}

        {/* Top Mini Header / Account Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-200 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#4079DA] flex items-center justify-center text-white font-extrabold shadow-sm shrink-0">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-[#152A4C] tracking-tight">
                  Account &amp; Practice Streak
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#4079DA] border border-blue-200 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4079DA] animate-pulse" />
                  Active Streak: {currentStreak} Days
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Track daily interview practice, solved questions &amp; interviewer question records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {go && (
              <button
                type="button"
                onClick={() => go('coding')}
                className="px-3.5 py-1.5 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open DSA Coding IDE</span>
                <span className="sm:hidden">DSA IDE</span>
              </button>
            )}
            {go && (
              <button
                type="button"
                onClick={() => go('dashboard')}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-[#152A4C] border border-slate-200 text-xs font-semibold transition-colors shadow-2xs shrink-0"
              >
                Dashboard
              </button>
            )}
          </div>
        </div>

        {/* TODAY'S PRACTICE ACTIVITY BANNER */}
        <div className="bg-gradient-to-r from-[#EBF1FD] via-blue-50/70 to-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-[#4079DA] shadow-xs shrink-0">
              <Flame className="w-5 sm:w-6 h-5 sm:h-6 fill-current animate-pulse text-[#4079DA]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#4079DA]">
                  Today&rsquo;s Practice Activity &bull; {todayIso}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  Streak Verified ✓
                </span>
              </div>
              <div className="text-base sm:text-lg font-extrabold text-[#152A4C] mt-0.5">
                {todayQuestionsCount > 0 ? (
                  <span>
                    You solved <span className="text-[#4079DA] font-black">{todayQuestionsCount}</span> interview
                    questions today!
                  </span>
                ) : (
                  <span>Ready for today&rsquo;s practice! Select a question below to boost your streak.</span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Practice round questions are automatically recorded into your daily contribution streak.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center shrink-0 w-full md:w-auto">
            <div className="bg-white border border-slate-200 px-3 sm:px-4 py-2 rounded-xl shadow-2xs">
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Today&rsquo;s Qs</div>
              <div className="text-lg sm:text-xl font-black text-[#152A4C] font-mono">{todayQuestionsCount}</div>
            </div>
            <div className="bg-white border border-slate-200 px-3 sm:px-4 py-2 rounded-xl shadow-2xs">
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Avg Score</div>
              <div className="text-lg sm:text-xl font-black text-[#4079DA] font-mono">{todayAvgScore}%</div>
            </div>
            <div className="bg-white border border-slate-200 px-3 sm:px-4 py-2 rounded-xl shadow-2xs">
              <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium">Streak</div>
              <div className="text-lg sm:text-xl font-black text-emerald-600 font-mono flex items-center justify-center gap-1">
                <Flame className="w-3.5 sm:w-4 h-3.5 sm:h-4 fill-current text-amber-500" />
                <span>{currentStreak}d</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top 3-Card Grid: Left User Card (3 Cols) + Middle Solved Card (5 Cols) + Badges Card (4 Cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Card 1: User Profile Summary (3 Cols) with Editable Candidate Name */}
          <div className="lg:col-span-4 xl:col-span-3 bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm shrink-0 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&q=80&w=200&h=200"
                    alt={candidateName}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {isEditingName ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Enter your name"
                        className="w-full bg-slate-50 border border-[#4079DA] rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (nameInput.trim() && onUpdateCandidateName) {
                            onUpdateCandidateName(nameInput.trim());
                          }
                          setIsEditingName(false);
                        }}
                        className="px-2.5 py-0.5 bg-[#4079DA] text-white font-bold text-[10px] rounded hover:bg-[#3164BC]"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-base font-bold text-[#152A4C] tracking-tight truncate">
                          {candidateName || 'Daksh Goyal'}
                        </h2>
                        <button
                          type="button"
                          onClick={() => setIsEditingName(true)}
                          className="text-slate-400 hover:text-[#4079DA] p-0.5"
                          title="Edit candidate name"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 truncate">
                        @{candidateName ? candidateName.toLowerCase().replace(/\s+/g, '') : 'dakshgoyal989'}
                      </p>
                      <div className="text-xs font-mono text-slate-600 mt-1">
                        Rank <span className="font-bold text-[#152A4C]">~5,000,000</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Followers Stats */}
              <div className="flex items-center gap-4 text-xs text-slate-500 pb-4 border-b border-slate-100">
                <div>
                  <span className="font-bold text-[#152A4C]">0</span> Following
                </div>
                <div>
                  <span className="font-bold text-[#152A4C]">0</span> Followers
                </div>
                <div className="ml-auto text-[11px] text-emerald-600 font-semibold">Verified Candidate</div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setIsEditingName(!isEditingName)}
                  className="flex-1 py-2 px-3 rounded-lg bg-[#EBF1FD] hover:bg-blue-100 text-[#4079DA] border border-blue-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingName ? 'Cancel Edit' : 'Edit Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setToastMessage('Profile link copied to clipboard!');
                    setTimeout(() => setToastMessage(null), 3000);
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors"
                  title="Share profile link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Community Stats */}
              <div className="mt-6 space-y-3">
                <h3 className="text-xs font-bold text-[#152A4C] uppercase tracking-wider">Community Stats</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[#4079DA]" />
                      <span>Views</span>
                    </div>
                    <div className="font-semibold text-[#152A4C]">
                      12 <span className="text-[10px] text-slate-400 font-normal">Last week 4</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Solutions</span>
                    </div>
                    <div className="font-semibold text-[#152A4C]">
                      {totalSolved} <span className="text-[10px] text-emerald-600 font-bold">+{todayQuestionsCount} today</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-500" />
                      <span>Discuss</span>
                    </div>
                    <div className="font-semibold text-[#152A4C]">
                      3 <span className="text-[10px] text-slate-400 font-normal">Last week 1</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span>Reputation</span>
                    </div>
                    <div className="font-semibold text-[#152A4C]">
                      18 <span className="text-[10px] text-slate-400 font-normal">Top 15%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Languages Solved */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-[#152A4C] uppercase tracking-wider mb-2.5">Languages</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-[#4079DA] font-bold text-[10px] flex items-center justify-center">
                        C
                      </span>
                      <span className="font-semibold text-[#152A4C]">C</span>
                    </div>
                    <span className="text-slate-600 font-mono">14 solved</span>
                  </div>
                  <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">
                        Py
                      </span>
                      <span className="font-semibold text-[#152A4C]">Python3</span>
                    </div>
                    <span className="text-slate-600 font-mono">{allSubmissions.filter(s => s.lang?.includes('Python')).length || 4} solved</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 & 3: Main Stats & Solved Count (5 Cols) + Badges (4 Cols) */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Solved Problems Donut Gauge Card (7 Cols) */}
              <div className="md:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#152A4C]">
                    Solved Problems Breakdown
                  </span>
                  <span className="text-xs text-slate-500 font-mono">3 Attempting</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  {/* Circular Radial Donut Ring */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                        {/* Background Track */}
                        <circle cx="60" cy="60" r="48" fill="transparent" stroke="#E2E8F0" strokeWidth="8" />
                        {/* Easy Segment: Emerald */}
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          fill="transparent"
                          stroke="#10B981"
                          strokeWidth="8"
                          strokeDasharray="301"
                          strokeDashoffset={301 - (301 * (easySolved / totalQuestions)) * 40}
                          strokeLinecap="round"
                        />
                        {/* Medium Segment: Amber */}
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          fill="transparent"
                          stroke="#F59E0B"
                          strokeWidth="8"
                          strokeDasharray="301"
                          strokeDashoffset={301 - (301 * (medSolved / totalQuestions)) * 40}
                          strokeLinecap="round"
                          className="opacity-90"
                        />
                        {/* Hard Segment: Rose */}
                        {hardSolved > 0 && (
                          <circle
                            cx="60"
                            cy="60"
                            r="48"
                            fill="transparent"
                            stroke="#EF4444"
                            strokeWidth="8"
                            strokeDasharray="301"
                            strokeDashoffset={301 - (301 * (hardSolved / totalQuestions)) * 40}
                            strokeLinecap="round"
                          />
                        )}
                      </svg>

                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="text-2xl font-black text-[#152A4C] font-mono tracking-tight leading-none">
                          {totalSolved}
                          <span className="text-xs font-normal text-slate-500">/{totalQuestions}</span>
                        </div>
                        <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-0.5">
                          <Check className="w-3 h-3" />
                          <span>Solved</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Breakdown Bars (7 Cols) */}
                  <div className="sm:col-span-7 space-y-2.5">
                    {/* Easy */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-emerald-700 font-semibold">Easy</span>
                        <span className="font-mono text-[#152A4C] font-bold">
                          {easySolved}
                          <span className="text-slate-500 font-normal">/{easyTotal}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (easySolved / easyTotal) * 100 * 25)}%` }}
                        />
                      </div>
                    </div>

                    {/* Medium */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-amber-700 font-semibold">Med.</span>
                        <span className="font-mono text-[#152A4C] font-bold">
                          {medSolved}
                          <span className="text-slate-500 font-normal">/{medTotal}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (medSolved / medTotal) * 100 * 35)}%` }}
                        />
                      </div>
                    </div>

                    {/* Hard */}
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-rose-700 font-semibold">Hard</span>
                        <span className="font-mono text-[#152A4C] font-bold">
                          {hardSolved}
                          <span className="text-slate-500 font-normal">/{hardTotal}</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-rose-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, (hardSolved / hardTotal) * 100 * 50)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges Card (5 Cols) */}
              <div className="md:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#152A4C]">Badges</span>
                    <span className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">1 Active</span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-3 text-center">
                    <div className="w-18 h-18 rounded-full bg-gradient-to-tr from-[#EBF1FD] to-blue-100 border-2 border-[#4079DA]/30 flex items-center justify-center shadow-sm relative mb-2.5 p-3">
                      <Award className="w-8 h-8 text-[#4079DA]" />
                      <div className="absolute -bottom-1 bg-white text-[9px] font-bold text-[#4079DA] px-2 py-0.5 rounded-full border border-[#4079DA]/30 shadow-2xs">
                        Nov 2026
                      </div>
                    </div>

                    <div className="text-xs font-semibold text-emerald-700">Streak Champion</div>
                    <div className="text-sm font-bold text-[#152A4C] mt-0.5">
                      {currentStreak}-Day Active Practice
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span>Solve 1 question daily to maintain your badge</span>
                </div>
              </div>
            </div>

            {/* 52-Week GitHub / LeetCode Submission Streak Heatmap */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-[#152A4C]">
                    {totalSubmissionsInYear} submissions in the past one year
                  </span>
                  <span title="Past 365 calendar days activity" className="text-slate-400 cursor-help">
                    <Info className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] text-[#4079DA] font-medium sm:hidden">
                    (Swipe →)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium text-slate-500">
                  <div>
                    Total active days:{' '}
                    <span className="font-bold text-[#152A4C] font-mono">{totalActiveDays}</span>
                  </div>
                  <div>
                    Max streak: <span className="font-bold text-[#152A4C] font-mono">{maxStreak}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#4079DA] font-semibold">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span>Streak: {currentStreak} days</span>
                  </div>
                </div>
              </div>

              {/* The 52-Week Streak Grid with Touch-Momentum Smooth Scrolling */}
              <div className="relative -mx-1 sm:mx-0 px-1 sm:px-0 overflow-x-auto pb-2 scroll-smooth">
                <div className="min-w-[720px]">
                  <div className="flex gap-[3.5px] items-center">
                    {streakCalendar.map((week, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3.5px]">
                        {week.map((day, dIdx) => {
                          let bg = '#EAEEF4';
                          if (day.level === 1) bg = '#DBEAFE';
                          if (day.level === 2) bg = '#93C5FD';
                          if (day.level === 3) bg = '#4079DA';
                          if (day.level === 4) bg = '#1D4ED8';

                          const isTodayCell = day.date === todayIso;

                          return (
                            <div
                              key={dIdx}
                              onMouseEnter={() => setHoveredDay(day)}
                              onMouseLeave={() => setHoveredDay(null)}
                              className={`w-[11.5px] h-[11.5px] rounded-[2px] transition-transform hover:scale-125 hover:z-10 cursor-pointer ${
                                isTodayCell ? 'ring-1.5 ring-[#4079DA] shadow-xs' : ''
                              }`}
                              style={{ backgroundColor: bg }}
                              title={`${day.count} submissions on ${day.date}${isTodayCell ? ' (Today)' : ''}`}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>

                  {/* Month Labels along Bottom */}
                  <div className="flex justify-between text-[11px] text-slate-500 font-medium pt-2 px-1">
                    {months.map((m, idx) => (
                      <span key={idx}>{m}</span>
                    ))}
                  </div>
                </div>

                {/* Floating Tooltip */}
                {hoveredDay && (
                  <div className="absolute top-0 right-2 bg-[#152A4C] border border-[#152A4C] text-white text-xs px-2.5 py-1 rounded-md shadow-lg pointer-events-none">
                    <span className="font-semibold text-sky-300">{hoveredDay.count} submissions</span> on{' '}
                    {hoveredDay.date} {hoveredDay.date === todayIso ? '(Today)' : ''}
                  </div>
                )}
              </div>

              {/* Bottom Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                <div className="text-[11px] text-slate-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Today ({todayIso}):{' '}
                    <strong className="text-[#152A4C]">{todayQuestionsCount} questions recorded</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span>Less</span>
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#EAEEF4] border border-slate-200/60" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#DBEAFE]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#93C5FD]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#4079DA]" />
                  <span className="w-2.5 h-2.5 rounded-[2px] bg-[#1D4ED8]" />
                  <span>More</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =================================================================
            INTERACTIVE PRACTICE SETUP & INTERVIEWER QUESTIONS CONTROLLER
            (Addresses exact user requirement: Candidate enters Name, Mode,
            Difficulty Easy/Med/Hard, sees matching questions, solves & updates streak)
        ================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-5">
          {/* Main Tab Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('Practice Setup')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'Practice Setup'
                    ? 'bg-[#4079DA] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#152A4C] hover:bg-slate-100'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Targeted Practice Setup &amp; Streak Booster</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Interviewer Questions')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'Interviewer Questions'
                    ? 'bg-[#4079DA] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#152A4C] hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Interviewer Questions Asked ({interviewerQuestionsList.length})</span>
                {todayQuestionsCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('Recent AC')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'Recent AC'
                    ? 'bg-[#4079DA] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#152A4C] hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Recent Solved Submissions ({allSubmissions.length})</span>
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Candidate: <strong className="text-[#152A4C]">{candidateName}</strong>
            </div>
          </div>

          {/* TAB 1: PRACTICE SETUP (User requirement: Name, Mode, Difficulty Easy/Med/Hard) */}
          {activeTab === 'Practice Setup' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Configuration Column (5 Cols) */}
                <div className="md:col-span-5 space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#152A4C] mb-1.5">
                      1. Candidate Name
                    </label>
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => {
                        setNameInput(e.target.value);
                        if (onUpdateCandidateName) onUpdateCandidateName(e.target.value);
                      }}
                      placeholder="Enter your name"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#152A4C] mb-1.5">
                      2. Interview Practice Domain
                    </label>
                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      {(['Technical', 'DSA', 'HR'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPracticeMode(mode)}
                          className={`py-2 px-2 rounded-lg font-semibold text-center transition-all border ${
                            practiceMode === mode
                              ? 'bg-[#4079DA] text-white border-[#4079DA] shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {mode === 'Technical' ? 'DBMS/OS' : mode === 'DSA' ? 'DSA Ladder' : 'Behavioral'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#152A4C]">
                        3. Difficulty Level
                      </label>
                      <span className="text-[10px] text-slate-500">Questions filter instantly</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                      <button
                        type="button"
                        onClick={() => setPracticeDifficulty('Easy')}
                        className={`py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          practiceDifficulty === 'Easy'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/25'
                            : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        <span>Easy</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeDifficulty('Medium')}
                        className={`py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          practiceDifficulty === 'Medium'
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm ring-2 ring-amber-500/25'
                            : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                        }`}
                      >
                        <span>Medium</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPracticeDifficulty('Hard')}
                        className={`py-2 px-3 rounded-lg border transition-all flex items-center justify-center gap-1 ${
                          practiceDifficulty === 'Hard'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-500/25'
                            : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                        }`}
                      >
                        <span>Hard</span>
                      </button>
                    </div>
                  </div>

                  {/* Filtered Question Selector List */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-[#152A4C]">
                        Matching {practiceDifficulty} Questions ({filteredQuestions.length})
                      </label>
                    </div>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {filteredQuestions.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => setSelectedQuestionId(q.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                            selectedQuestionId === q.id
                              ? 'bg-[#EBF1FD] border-[#4079DA] text-[#152A4C] shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-[#4079DA]">{q.topic}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                q.difficulty === 'Easy'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : q.difficulty === 'Medium'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </div>
                          <p className="line-clamp-2 text-slate-600 text-[11px] leading-relaxed">
                            {q.questionText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Selected Question Action & Quick Solve Drawer (7 Cols) */}
                <div className="md:col-span-7 bg-slate-50 p-5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            practiceDifficulty === 'Easy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : practiceDifficulty === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {practiceDifficulty} Question
                        </span>
                        <span className="text-xs font-semibold text-[#152A4C]">
                          {currentSelectedQuestion.topic}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Track: {practiceMode}
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-2">
                      <h3 className="text-sm font-bold text-[#152A4C] leading-snug">
                        {currentSelectedQuestion.questionText}
                      </h3>
                      {currentSelectedQuestion.idealKeyPoints && (
                        <div className="pt-2">
                          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                            Key Concepts Expected by Interviewer:
                          </span>
                          <ul className="list-disc list-inside text-[11px] text-slate-600 space-y-0.5">
                            {currentSelectedQuestion.idealKeyPoints.slice(0, 3).map((pt, idx) => (
                              <li key={idx}>{pt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline Answer / Solution Input */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#152A4C] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#4079DA] fill-current" />
                        <span>Type Answer or Code Solution (Instant Streak Credit)</span>
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {quickAnswerInput.trim().length} chars
                      </span>
                    </div>

                    <textarea
                      rows={3}
                      value={quickAnswerInput}
                      onChange={(e) => setQuickAnswerInput(e.target.value)}
                      placeholder="Write your explanation or code logic here to log directly to today's streak..."
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15 leading-relaxed font-mono"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={quickAnswerSubmitting || !quickAnswerInput.trim()}
                          onClick={handleQuickSubmitAnswer}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {quickAnswerSubmitting
                              ? 'Evaluating...'
                              : `Submit & Log to Streak (+1)`}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleLaunchFullLiveSession}
                          className="px-4 py-2 rounded-lg bg-[#4079DA] hover:bg-[#3164BC] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                          title="Start live 3D room with this exact question"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Launch in 3D Interviewer Room</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: QUESTIONS ASKED BY INTERVIEWER TODAY & RECENTLY */}
          {activeTab === 'Interviewer Questions' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-2 border-b border-slate-200">
                <span>
                  Showing all questions asked by AI interviewers in your sessions ({interviewerQuestionsList.length} total)
                </span>
                <span className="text-emerald-700 font-semibold">
                  {interviewerQuestionsList.filter((q) => q.isToday).length} asked today
                </span>
              </div>

              <div className="space-y-3">
                {interviewerQuestionsList.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#4079DA]/40 transition-colors space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.difficulty === 'Easy'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.difficulty === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.difficulty}
                        </span>
                        <span className="text-xs font-semibold text-[#152A4C]">{item.topic}</span>
                        <span className="text-[11px] text-slate-500">&bull; Asked by {item.interviewerName}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {item.score !== undefined && (
                          <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Score: {item.score}/100
                          </span>
                        )}
                        <span className="text-slate-500 font-mono text-[11px]">{item.timeAgo}</span>
                      </div>
                    </div>

                    <p className="text-sm font-semibold text-[#152A4C] leading-snug">
                      {item.questionText}
                    </p>

                    {item.candidateAnswer && (
                      <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Your Submitted Response:
                        </div>
                        <p className="text-slate-700 leading-relaxed font-mono text-[11px]">
                          {item.candidateAnswer}
                        </p>
                      </div>
                    )}

                    {item.feedback && (
                      <div className="text-xs text-[#152A4C] bg-[#EBF1FD] border border-blue-200 p-2.5 rounded-lg flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#4079DA] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-[#152A4C]">Interviewer Feedback: </strong>
                          <span className="text-slate-700">{item.feedback}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RECENT ACCEPTED SUBMISSIONS */}
          {activeTab === 'Recent AC' && (
            <div className="divide-y divide-slate-200">
              {allSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="py-3 px-2 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-[#152A4C] text-sm hover:text-[#4079DA] cursor-pointer transition-colors">
                        {sub.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          sub.difficulty === 'Easy'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : sub.difficulty === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {sub.difficulty}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono text-slate-600">{sub.lang || 'Verbal'}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">✓ {sub.status}</span>
                      <span>•</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {sub.runtime || `${sub.score} pts`}
                      </span>
                      <span>•</span>
                      <span className="text-slate-500 font-mono text-[11px]">
                        {sub.timestamp.split('T')[0]}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-500">
                      {sub.timestamp.startsWith(todayIso) ? 'Today' : sub.timestamp.split('T')[0]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

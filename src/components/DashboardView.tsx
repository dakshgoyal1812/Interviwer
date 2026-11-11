import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ChevronDown,
  Sparkles,
  Clock,
  Activity,
  Code2,
  Bot,
  BrainCircuit,
  Sliders,
  Play,
  CheckCircle2,
  Trophy,
  Flame,
  LayoutDashboard,
  FileText,
  Briefcase,
  Search,
  Bell,
  Settings,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

// Data for Interview Sessions Bar Chart across Week / Month / Year
const SESSIONS_MONTH = [
  { month: 'Jan', completed: 1800, scheduled: 800, total: 2600 },
  { month: 'Feb', completed: 2400, scheduled: 800, total: 3200 },
  { month: 'Mar', completed: 3200, scheduled: 650, total: 3850 },
  { month: 'Apr', completed: 2300, scheduled: 800, total: 3100 },
  { month: 'May', completed: 2800, scheduled: 600, total: 3400 },
  { month: 'Jun', completed: 1700, scheduled: 800, total: 2500 },
  { month: 'Jul', completed: 2000, scheduled: 1000, total: 3000 },
  { month: 'Aug', completed: 3300, scheduled: 700, total: 4000 },
  { month: 'Sep', completed: 2500, scheduled: 900, total: 3400 },
  { month: 'Oct', completed: 2900, scheduled: 800, total: 3700 },
  { month: 'Nov', completed: 2700, scheduled: 800, total: 3500 },
  { month: 'Dec', completed: 2400, scheduled: 900, total: 3300 },
];

const SESSIONS_WEEK = [
  { month: 'Mon', completed: 380, scheduled: 120, total: 500 },
  { month: 'Tue', completed: 490, scheduled: 110, total: 600 },
  { month: 'Wed', completed: 580, scheduled: 90, total: 670 },
  { month: 'Thu', completed: 420, scheduled: 130, total: 550 },
  { month: 'Fri', completed: 510, scheduled: 140, total: 650 },
  { month: 'Sat', completed: 290, scheduled: 80, total: 370 },
  { month: 'Sun', completed: 150, scheduled: 40, total: 190 },
];

const SESSIONS_YEAR = [
  { month: '2021', completed: 22000, scheduled: 5000, total: 27000 },
  { month: '2022', completed: 29000, scheduled: 6500, total: 35500 },
  { month: '2023', completed: 34000, scheduled: 7200, total: 41200 },
  { month: '2024', completed: 39500, scheduled: 8100, total: 47600 },
  { month: '2025', completed: 42500, scheduled: 8900, total: 51400 },
];

// Interview Track Breakdown Donut (Matches reference pastel palette)
const TRACK_SOURCES = [
  { name: 'Consultations (Technical Core)', value: 33, color: '#9daaff' },
  { name: 'Lab tests (DSA & Algorithms)', value: 23, color: '#97d99c' },
  { name: 'Operation (Coding Sandbox)', value: 19, color: '#70b7ff' },
  { name: 'Insurance (HR & Leadership)', value: 15, color: '#fbb473' },
  { name: 'Others (System Design)', value: 12, color: '#cbd5e1' },
];

// Mini Sparkline curve data
const SESSIONS_SPARKLINE = [
  { val: 18 },
  { val: 24 },
  { val: 22 },
  { val: 38 },
  { val: 32 },
  { val: 46 },
  { val: 40 },
  { val: 52 },
];

// Upcoming Mock Interview Sessions List
const UPCOMING_SESSIONS_PAGE_1 = [
  {
    id: 's1',
    name: 'Chloe Wilson',
    role: 'Thyroid function follow-up',
    roundTitle: 'Behavioral & STAR Leadership Round',
    datetime: 'Tue, Nov 13, 2025, 9:00 a.m.',
    doctorName: 'Dr. Daniel Ross',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 's2',
    name: 'Marcus Reed',
    role: 'Check-up',
    roundTitle: 'DBMS Indexing & Concurrency Round',
    datetime: 'Tue, Nov 13, 2025, 12:00 a.m.',
    doctorName: 'Dr. Liam Taylor',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 's3',
    name: 'Bessie Cooper',
    role: 'Type 2 diabetes',
    roundTitle: 'Dynamic Programming & Graph Ladder',
    datetime: 'Tue, Nov 13, 2025, 11:45 a.m.',
    doctorName: 'Dr. Emily Parker',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150',
  },
];

const UPCOMING_SESSIONS_PAGE_2 = [
  {
    id: 's4',
    name: 'Elena Rostova',
    role: 'System Architecture Review',
    roundTitle: 'High-Throughput Microservices Design',
    datetime: 'Wed, Nov 14, 2025, 10:15 a.m.',
    doctorName: 'Dr. Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 's5',
    name: 'Alexander Wright',
    role: 'Operating Systems Deep Dive',
    roundTitle: 'Linux Kernel & Virtual Memory Epoll',
    datetime: 'Wed, Nov 14, 2025, 1:30 p.m.',
    doctorName: 'Dr. Kenji Sato',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
  },
  {
    id: 's6',
    name: 'Dr. Emily Parker',
    role: 'Applied AI & Evaluation',
    roundTitle: 'LLM Prompt Engineering & RAG Evaluation',
    datetime: 'Wed, Nov 14, 2025, 3:00 p.m.',
    doctorName: 'Dr. Sarah Lin',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150',
  },
];

interface DashboardViewProps {
  go?: (next: any) => void;
  candidateName?: string;
  totalInterviewsCount?: number;
  avgOverallScore?: number;
  avgTechScore?: number;
  avgCommScore?: number;
  onLaunchLive?: () => void;
}

export function DashboardView({
  go,
  candidateName = 'InterviewX Candidate',
  totalInterviewsCount = 1537,
  avgOverallScore = 88,
  avgTechScore = 84,
  avgCommScore = 87,
  onLaunchLive,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'Week' | 'Month' | 'Year'>('Month');
  const [sessionPage, setSessionPage] = useState<number>(0);

  const displayedSessions = sessionPage === 0 ? UPCOMING_SESSIONS_PAGE_1 : UPCOMING_SESSIONS_PAGE_2;
  const currentChartData =
    activeTab === 'Week'
      ? SESSIONS_WEEK
      : activeTab === 'Year'
      ? SESSIONS_YEAR
      : SESSIONS_MONTH;

  return (
    <div className="w-full flex gap-5 sm:gap-6 items-start font-sans antialiased text-slate-800">
      {/* Left Floating Icon Rail (CodeChef White & Blue System) */}
      <aside className="hidden lg:flex flex-col items-center gap-3.5 bg-white py-5 px-2.5 rounded-3xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.04)] shrink-0 sticky top-24">
        {/* Active Dashboard Button */}
        <button
          type="button"
          onClick={() => go && go('dashboard')}
          title="Dashboard"
          className="w-10 h-10 rounded-2xl bg-[#4079DA] text-white flex items-center justify-center shadow-md shadow-blue-500/20 transition-transform hover:scale-105"
        >
          <LayoutDashboard className="w-5 h-5" />
        </button>

        {/* Reports / History */}
        <button
          type="button"
          onClick={() => go && go('reports')}
          title="Reports & History"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-colors"
        >
          <FileText className="w-5 h-5" />
        </button>

        {/* Coding IDE */}
        <button
          type="button"
          onClick={() => go && go('coding')}
          title="DSA Coding IDE"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-colors"
        >
          <Code2 className="w-5 h-5" />
        </button>

        {/* 3D Interviewer Room */}
        <button
          type="button"
          onClick={() => go && go('live-room')}
          title="Live 3D AI Interview"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-colors"
        >
          <Bot className="w-5 h-5" />
        </button>

        {/* AI Prep Lab */}
        <button
          type="button"
          onClick={() => go && go('ai-coach')}
          title="AI Coach & Prep Lab"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-colors"
        >
          <Sparkles className="w-5 h-5" />
        </button>

        {/* LeetCode Streak */}
        <button
          type="button"
          onClick={() => go && go('profile')}
          title="LeetCode Account & Streak"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-amber-500 hover:bg-amber-50 flex items-center justify-center transition-colors"
        >
          <Flame className="w-5 h-5" />
        </button>

        <div className="w-6 h-px bg-slate-200/80 my-1" />

        {/* Interview Setup */}
        <button
          type="button"
          onClick={() => go && go('setup')}
          title="Configure Interview"
          className="w-10 h-10 rounded-2xl text-slate-400 hover:text-slate-800 hover:bg-slate-100/70 flex items-center justify-center transition-colors"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Right Canvas */}
      <div className="flex-1 min-w-0 bg-[#F8FAFC] text-[#363636] rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 lg:p-8 border border-slate-200/90 shadow-sm space-y-5 sm:space-y-6">
        {/* Top Header Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-1 sm:pb-2">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-tr from-[#4079DA] to-[#5E93E6] flex items-center justify-center shadow-md shadow-blue-500/15 shrink-0">
              <Activity className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#152A4C]">
                Dashboard
              </h1>
            </div>
          </div>

          {/* Quick Launch & Profile Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {go && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => go('live-room')}
                  className="px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#4079DA] text-white text-xs font-semibold hover:bg-[#3164BC] transition-colors shadow-xs flex items-center gap-1 sm:gap-1.5 shrink-0"
                  title="Launch Live 3D Interviewer Room"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Launch Live 3D</span>
                  <span className="sm:hidden text-[11px]">Live 3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('coding')}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-white border border-slate-200 text-[#152A4C] text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1 sm:gap-1.5 shrink-0"
                  title="DSA Sandbox"
                >
                  <Code2 className="w-3.5 h-3.5 text-[#4079DA]" />
                  <span className="hidden md:inline">DSA Sandbox</span>
                  <span className="md:hidden text-[11px]">DSA</span>
                </button>
                <button
                  type="button"
                  onClick={() => go('profile')}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full bg-[#EBF1FD] border border-blue-200 text-[#152A4C] text-xs font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1 sm:gap-1.5 shadow-2xs shrink-0"
                  title="LeetCode Account & Practice Streak"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                  <span className="hidden md:inline">Practice Streak</span>
                  <span className="md:hidden text-[11px]">Streak</span>
                </button>
              </div>
            )}

            {/* Candidate Profile Pill */}
            <div
              onClick={() => go && go('profile')}
              className="flex items-center gap-2 bg-white pl-1.5 pr-2.5 sm:pr-4 py-1 sm:py-1.5 rounded-full border border-slate-200/80 shadow-2xs cursor-pointer hover:border-[#4079DA]/40 transition-all shrink-0"
              title="Open Account & Practice Streak"
            >
              <div className="w-7 sm:w-8 h-7 sm:h-8 rounded-full bg-[#152A4C] flex items-center justify-center text-white text-xs font-bold tracking-tight shadow-sm shrink-0">
                iX
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm font-semibold text-[#152A4C] max-w-[80px] sm:max-w-none truncate">
                  {candidateName || 'Candidate'}
                </span>
                <ChevronDown className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-400" />
              </div>
            </div>
          </div>
        </header>

        {/* Row 1: 4 Top KPI Metric Cards (Matches Image exactly) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
          {/* Card 1: Active Patients / Candidates */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-[13px] font-medium text-slate-600">
                Active patients
              </span>
              <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                <Code2 className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  3.549
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-[#16a34a] mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>31% this month</span>
                </div>
              </div>

              {/* Sparkline: Soft Green Bars */}
              <div className="flex items-end gap-1.5 h-10 sm:h-11 pb-1 shrink-0">
                <span className="w-1.5 h-4 bg-[#98d89e] rounded-full"></span>
                <span className="w-1.5 h-7 bg-[#98d89e] rounded-full"></span>
                <span className="w-1.5 h-10 bg-[#98d89e] rounded-full"></span>
                <span className="w-1.5 h-5 bg-[#98d89e] rounded-full"></span>
                <span className="w-1.5 h-9 bg-[#98d89e] rounded-full"></span>
                <span className="w-1.5 h-7 bg-[#98d89e] rounded-full"></span>
              </div>
            </div>
          </div>

          {/* Card 2: New Patients / Completed Interviews */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-[13px] font-medium text-slate-600">
                New patients
              </span>
              <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  +{totalInterviewsCount ? totalInterviewsCount.toLocaleString() : '1,537'}
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-[#f43f5e] mt-1.5">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>13% this month</span>
                </div>
              </div>

              {/* Sparkline: Smooth Area Curve */}
              <div className="w-20 sm:w-24 h-10 sm:h-11 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={SESSIONS_SPARKLINE}>
                    <defs>
                      <linearGradient id="purpleGradMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="val"
                      stroke="#818cf8"
                      strokeWidth={2}
                      fill="url(#purpleGradMain)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Card 3: Revenue / Overall Score */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-[13px] font-medium text-slate-600">
                Revenue
              </span>
              <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 font-bold text-xs">
                $
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  $11,750
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-[#16a34a] mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>17% this month</span>
                </div>
              </div>

              {/* Sparkline: Thin Green Vertical Bars */}
              <div className="flex items-end gap-1 h-10 sm:h-11 pb-1 shrink-0">
                <span className="w-1 h-3.5 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-5.5 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-8 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-4.5 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-10 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-7 bg-[#98d89e] rounded-full"></span>
                <span className="w-1 h-9.5 bg-[#98d89e] rounded-full"></span>
              </div>
            </div>
          </div>

          {/* Card 4: Client Satisfaction / Communication */}
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <span className="text-xs sm:text-[13px] font-medium text-slate-600">
                Client satisfaction
              </span>
              <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  87%
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-[#16a34a] mt-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>11% this month</span>
                </div>
              </div>

              {/* Gauge Semi-Circle Arc with Clock/Needle center icon */}
              <div className="relative w-18 sm:w-20 h-10 sm:h-11 flex items-end justify-center overflow-hidden shrink-0">
                <svg viewBox="0 0 100 50" className="w-18 sm:w-20 h-9 sm:h-10">
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="#eef2f6"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 10 50 A 40 40 0 0 1 82 22"
                    fill="none"
                    stroke="#9ca8ff"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute bottom-0 w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-xs border border-slate-100 flex items-center justify-center text-slate-500">
                  <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2: Total appointments -> Total interview sessions (Left 8 cols) & Track distribution (Right 4 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Total Appointments / Sessions Stacked Bars Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Total appointments
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total sessions across practice tracks &amp; evaluations
                </p>
              </div>

              {/* Segmented Control Pill: Week / Month / Year */}
              <div className="bg-[#f1f3f7] p-1 rounded-full flex items-center gap-1">
                {(['Week', 'Month', 'Year'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1 text-xs rounded-full font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-white text-slate-900 font-semibold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Stacked Bars Chart */}
            <div className="h-[220px] sm:h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={currentChartData}
                  margin={{ top: 10, right: 8, left: -25, bottom: 0 }}
                  barSize={activeTab === 'Month' ? 12 : 16}
                >
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                    dy={6}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => (val >= 1000 ? `${val / 1000}k` : `${val}`)}
                    ticks={[0, 1000, 2000, 3000, 4000]}
                    domain={[0, 4200]}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#152A4C] text-white px-3.5 py-2.5 rounded-2xl shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-slate-200">
                              {data.month} Appointments
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#98d89e]" />
                              <span>Completed: {data.completed.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#dbe8dc]" />
                              <span>Scheduled: {data.scheduled.toLocaleString()}</span>
                            </div>
                            <div className="pt-1 border-t border-slate-700/60 font-semibold text-sky-300">
                              Total: {data.total.toLocaleString()}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {/* Bottom Segment: Fresh Mint Green */}
                  <Bar
                    dataKey="completed"
                    stackId="a"
                    fill="#98d89e"
                    radius={[0, 0, 8, 8]}
                  />
                  {/* Top Segment: Soft Pale Mint/Gray */}
                  <Bar
                    dataKey="scheduled"
                    stackId="a"
                    fill="#e7f1e9"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue source distribution Donut Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight mb-1">
                Revenue source distribution
              </h2>
              <p className="text-xs text-slate-400">
                Breakdown across services &amp; tracks
              </p>
            </div>

            {/* Donut Chart with Centered Suitcase Icon (from reference image) */}
            <div className="relative w-full h-[170px] sm:h-[180px] flex items-center justify-center my-1 sm:my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TRACK_SOURCES}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={4}
                    cornerRadius={6}
                    dataKey="value"
                  >
                    {TRACK_SOURCES.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Center Circle Hub with Suitcase / Briefcase Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-white shadow-2xs border border-slate-100 flex items-center justify-center text-[#4079DA]">
                  <Briefcase className="w-4 sm:w-5 h-4 sm:h-5" />
                </div>
              </div>
            </div>

            {/* Legend Breakdown with percentages matching screenshot */}
            <div className="space-y-2 mt-1">
              {TRACK_SOURCES.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs font-medium"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-600 truncate max-w-[130px] sm:max-w-[190px]">
                      {item.name.split(' (')[0]}
                    </span>
                  </div>
                  <span className="font-semibold text-[#152A4C] shrink-0 ml-2">{item.value}%</span>
                </div>
              ))}
            </div>

            {/* Bottom Alert / Highlight Pill */}
            <div className="mt-4 bg-[#EBF1FD] border border-blue-200 rounded-2xl p-3 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#4079DA] shadow-2xs shrink-0">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs font-medium text-[#152A4C] leading-tight">
                Your technical problem-solving velocity is up 12% this month!
              </p>
            </div>
          </div>
        </section>

        {/* Row 3: Upcoming mock interview rounds */}
        <section className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-7 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 sm:mb-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#152A4C] tracking-tight">
                Upcoming sessions
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Scheduled consultations &amp; follow-up mock rounds
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination Arrows */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSessionPage(0)}
                  disabled={sessionPage === 0}
                  className={`w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center transition-colors ${
                    sessionPage === 0
                      ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSessionPage(1)}
                  disabled={sessionPage === 1}
                  className={`w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center transition-colors ${
                    sessionPage === 1
                      ? 'text-slate-300 border-slate-100 cursor-not-allowed'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* View all link */}
              <button
                type="button"
                onClick={() => go && go('reports')}
                className="flex items-center gap-1 text-xs font-semibold text-[#152A4C] hover:text-[#4079DA] transition-colors ml-1"
              >
                <span>View all</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3 Upcoming Patient Cards (Exact names and doctors from screenshot) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {displayedSessions.map((session) => (
              <div
                key={session.id}
                className="border border-slate-100 rounded-2xl p-4 bg-[#fbfcfd] hover:bg-white hover:shadow-[0_4px_16px_-2px_rgba(15,23,42,0.06)] hover:border-slate-200 transition-all flex flex-col justify-between"
              >
                {/* Top Avatar & Patient Info */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={session.avatar}
                    alt={session.name}
                    className="w-10 sm:w-11 h-10 sm:h-11 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                      {session.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-normal mt-0.5 truncate">
                      {session.role}
                    </p>
                  </div>
                </div>

                {/* Bottom Schedule Date & Assigned Doctor */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{session.datetime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-medium text-slate-700 truncate">{session.doctorName}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

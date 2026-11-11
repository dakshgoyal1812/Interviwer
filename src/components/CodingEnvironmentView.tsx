import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import Editor, { type OnMount } from '@monaco-editor/react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Code2,
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  Terminal,
  Cpu,
  Loader2,
} from 'lucide-react';
import {
  CodingProblem,
  SupportedCodeLanguage,
} from '../data/seedData';

interface CodingEnvironmentViewProps {
  problems: CodingProblem[];
  selectedProblem: CodingProblem;
  onSelectProblem: (prob: CodingProblem) => void;
  onProblemGenerated: (prob: CodingProblem) => void;
  preferredLanguage?: SupportedCodeLanguage;
  onCodingEvaluated: (summary: {
    problemTitle: string;
    language: SupportedCodeLanguage;
    passedTests: number;
    totalTests: number;
    code: string;
    verbalApproachTranscript: string;
    complexityEvaluation: string;
    aiCodeScore: number;
  }) => void;
}

const LANGUAGE_LABELS: Record<SupportedCodeLanguage, string> = {
  python: 'Python 3.11',
  javascript: 'JavaScript (Node 20)',
  cpp: 'C++ 20 (GCC)',
  java: 'Java 21',
  c: 'C 17 (GCC)',
};

const MONACO_LANGUAGE: Record<SupportedCodeLanguage, string> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
  c: 'c',
};

export const CodingEnvironmentView: React.FC<CodingEnvironmentViewProps> = ({
  problems,
  selectedProblem,
  onSelectProblem,
  onProblemGenerated,
  preferredLanguage,
  onCodingEvaluated,
}) => {
  const [language, setLanguage] = useState<SupportedCodeLanguage>(preferredLanguage || 'python');
  const [code, setCode] = useState<string>(selectedProblem.starterCode.python);
  const [verbalApproach, setVerbalApproach] = useState<string>(
    'I will use a single-pass hash map storing each element and index so we can check for the target complement in O(1) time, giving O(n) overall time and O(n) space.'
  );
  const [isRecordingApproach, setIsRecordingApproach] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingProblem, setIsGeneratingProblem] = useState(false);
  const [genTopic, setGenTopic] = useState('Trees & Graphs');

  const [runResult, setRunResult] = useState<{
    sandboxProvider: string;
    executionTimeMs: number;
    passedCount: number;
    totalCount: number;
    results: {
      testCaseId: string;
      input: string;
      expectedOutput: string;
      actualOutput: string;
      passed: boolean;
    }[];
  } | null>(null);

  const [aiEvaluation, setAiEvaluation] = useState<{
    overallCodeScore: number;
    logicScore: number;
    verbalExplanationScore: number;
    detectedTimeComplexity: string;
    detectedSpaceComplexity: string;
    summaryFeedback: string;
    strengths: string[];
    improvements: string[];
  } | null>(null);

  const handleProblemSwitch = (prob: CodingProblem) => {
    onSelectProblem(prob);
    setCode(prob.starterCode[language] || prob.starterCode.python);
    setRunResult(null);
    setAiEvaluation(null);
  };

  // Keep Monaco keyboard focus handling; editor instance lifecycle is managed by the wrapper.
  const handleEditorMount: OnMount = (editor) => {
    editor.focus();
  };

  const handleLanguageChange = (newLang: SupportedCodeLanguage) => {
    setLanguage(newLang);
    setCode(selectedProblem.starterCode[newLang] || '');
    setRunResult(null);
  };

  const toggleApproachSTT = () => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setIsRecordingApproach(false);
      return;
    }
    if (isRecordingApproach) {
      setIsRecordingApproach(false);
      return;
    }
    try {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      setIsRecordingApproach(true);
      rec.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setVerbalApproach((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onend = () => setIsRecordingApproach(false);
      rec.onerror = () => setIsRecordingApproach(false);
      rec.start();
    } catch {
      setIsRecordingApproach(false);
    }
  };

  const handleRunSandbox = async () => {
    setIsRunning(true);
    try {
      const resp = await apiFetch('/api/code/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language,
          code,
        }),
      });
      const data = await resp.json();
      setRunResult(data);
    } catch (e) {
      console.error('Sandbox execution error:', e);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitAndEvaluate = async () => {
    setIsEvaluating(true);
    try {
      // First ensure test cases are executed
      let currentRun = runResult;
      if (!currentRun) {
        const execResp = await apiFetch('/api/code/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            problemId: selectedProblem.id,
            language,
            code,
          }),
        });
        currentRun = await execResp.json();
        setRunResult(currentRun);
      }

      const evalResp = await apiFetch('/api/code/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemId: selectedProblem.id,
          language,
          code,
          verbalApproach,
          passedCount: currentRun?.passedCount ?? 0,
          totalCount: currentRun?.totalCount ?? selectedProblem.testCases.length,
        }),
      });
      const evalData = await evalResp.json();
      setAiEvaluation(evalData);

      onCodingEvaluated({
        problemTitle: selectedProblem.title,
        language,
        passedTests: currentRun?.passedCount ?? 0,
        totalTests: currentRun?.totalCount ?? selectedProblem.testCases.length,
        code,
        verbalApproachTranscript: verbalApproach,
        complexityEvaluation: `${evalData.detectedTimeComplexity} time · ${evalData.detectedSpaceComplexity} space — ${evalData.summaryFeedback}`,
        aiCodeScore: evalData.overallCodeScore,
      });
    } catch (e) {
      console.error('Evaluation error:', e);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerateOriginalProblem = async () => {
    setIsGeneratingProblem(true);
    try {
      const resp = await apiFetch('/api/coding/generate-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: genTopic,
          difficulty: 'Medium',
        }),
      });
      const newProb: CodingProblem = await resp.json();
      onProblemGenerated(newProb);
      handleProblemSwitch(newProb);
    } catch (e) {
      console.error('Generate problem error:', e);
    } finally {
      setIsGeneratingProblem(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Problem Selector, Description, Examples & Verbal Approach */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label htmlFor="problem-select" className="text-xs font-bold text-[#152A4C]">
              Question Bank (Supabase Seeded)
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                aria-label="New Problem Topic"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA]"
              >
                <option value="Arrays & Hashing">Arrays &amp; Hashing</option>
                <option value="Trees & Graphs">Trees &amp; Graphs</option>
                <option value="Dynamic Programming">Dynamic Programming</option>
                <option value="Stacks & Queues">Stacks &amp; Queues</option>
              </select>
              <button
                type="button"
                onClick={handleGenerateOriginalProblem}
                disabled={isGeneratingProblem}
                className="px-2.5 py-1 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Sparkles className="w-3 h-3 inline mr-1" />
                {isGeneratingProblem ? 'Generating...' : 'New AI Problem'}
              </button>
            </div>
          </div>

          <select
            id="problem-select"
            value={selectedProblem.id}
            onChange={(e) => {
              const found = problems.find((p) => p.id === e.target.value);
              if (found) handleProblemSwitch(found);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-[#152A4C] font-semibold focus:outline-none focus:border-[#4079DA]"
          >
            {problems.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} ({p.difficulty} · {p.topic})
              </option>
            ))}
          </select>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-[#4079DA] bg-[#EBF1FD] px-2 py-0.5 rounded-full">
                {selectedProblem.difficulty}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-600">{selectedProblem.topic}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-600">Target: {selectedProblem.optimalTimeComplexity}</span>
            </div>
            <h2 className="text-base font-bold text-[#152A4C]">{selectedProblem.title}</h2>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedProblem.description}
            </p>
          </div>

          {/* Examples */}
          <div className="space-y-2 pt-2">
            <h3 className="text-xs font-bold text-[#152A4C]">Examples</h3>
            {selectedProblem.examples.map((ex, i) => (
              <div
                key={i}
                className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5 font-mono text-xs space-y-1"
              >
                <div className="text-slate-700">
                  <span className="text-slate-500 font-semibold">Input: </span>
                  {ex.input}
                </div>
                <div className="text-[#4079DA] font-semibold">
                  <span className="text-slate-500 font-semibold">Output: </span>
                  {ex.output}
                </div>
                {ex.explanation && (
                  <div className="text-slate-600 font-sans text-[11px]">{ex.explanation}</div>
                )}
              </div>
            ))}
          </div>

          {/* Constraints */}
          <div className="space-y-1 pt-1">
            <h3 className="text-xs font-bold text-[#152A4C]">Constraints</h3>
            <ul className="text-xs text-slate-600 font-mono space-y-0.5 list-disc list-inside">
              {selectedProblem.constraints.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Mandatory Verbal Approach Explanation (STT + Text) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-2.5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-[#152A4C]">
                1. Verbal Approach &amp; Complexity Walkthrough (Required)
              </h3>
              <p className="text-[11px] text-slate-500">
                Explain your data structure, invariant, and Time/Space complexity before or while coding.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleApproachSTT}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 border ${
                isRecordingApproach
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-slate-50 hover:bg-slate-100 text-[#152A4C] border-slate-200'
              }`}
            >
              {isRecordingApproach ? (
                <>
                  <MicOff className="w-3.5 h-3.5 inline mr-1" />
                  Stop Dictation
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 inline mr-1 text-[#4079DA]" />
                  Speak Approach (STT)
                </>
              )}
            </button>
          </div>
          <textarea
            aria-label="Verbal Approach Explanation"
            rows={3}
            value={verbalApproach}
            onChange={(e) => setVerbalApproach(e.target.value)}
            placeholder="Describe your algorithm approach and Big-O time/space complexity..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15"
          />
        </div>
      </div>

      {/* Right Column: Multi-Language Editor + Isolated Sandbox Runner + AI Evaluation */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col shadow-sm">
          {/* Editor Header Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <Code2 className="w-4 h-4 text-[#4079DA]" />
              <select
                aria-label="Programming Language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as SupportedCodeLanguage)}
                className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-[#152A4C] focus:outline-none focus:border-[#4079DA]"
              >
                {(Object.keys(LANGUAGE_LABELS) as SupportedCodeLanguage[]).map((langKey) => (
                  <option key={langKey} value={langKey}>
                    {LANGUAGE_LABELS[langKey]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setCode(selectedProblem.starterCode[language] || '')}
                className="px-2.5 py-1 text-xs text-slate-600 hover:text-[#152A4C] bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3 h-3 inline mr-1" />
                Reset Code
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleRunSandbox}
                disabled={isRunning}
                className="px-3.5 py-1.5 text-xs font-semibold bg-[#EBF1FD] hover:bg-blue-100 text-[#4079DA] border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5 inline mr-1 fill-current" />
                {isRunning ? 'Running Sandbox...' : 'Run Test Cases'}
              </button>
              <button
                type="button"
                onClick={handleSubmitAndEvaluate}
                disabled={isEvaluating}
                className="px-4 py-1.5 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
              >
                <Cpu className="w-3.5 h-3.5 inline mr-1" />
                {isEvaluating ? 'Evaluating...' : 'Submit & AI Evaluate'}
              </button>
            </div>
          </div>

          {/* Monaco Code Editor Surface */}
          <div className="bg-white min-h-[290px] max-h-[380px]">
            <Editor
              height="360px"
              language={MONACO_LANGUAGE[language]}
              value={code}
              theme="interviewx-light"
              onChange={(value) => setCode(value ?? '')}
              beforeMount={(monaco) => {
                monaco.editor.defineTheme('interviewx-light', {
                  base: 'vs',
                  inherit: true,
                  rules: [
                    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
                    { token: 'keyword', foreground: '1D4ED8', fontStyle: 'bold' },
                    { token: 'string', foreground: '047857' },
                    { token: 'number', foreground: 'B45309' },
                  ],
                  colors: {
                    'editor.background': '#FFFFFF',
                    'editorGutter.background': '#F8FAFC',
                    'editor.lineHighlightBackground': '#EBF1FD',
                    'editorLineNumber.foreground': '#94A3B8',
                    'editorLineNumber.activeForeground': '#4079DA',
                  },
                });
              }}
              onMount={handleEditorMount}
              loading={
                <div className="flex items-center justify-center h-full text-xs text-slate-500 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#4079DA]" />
                  Loading Monaco editor…
                </div>
              }
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                smoothScrolling: true,
                tabSize: 4,
                automaticLayout: true,
                fixedOverflowWidgets: true,
              }}
            />
          </div>
        </div>

        {/* Sandbox Test Case Execution Output Panel */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#4079DA]" />
              <h3 className="text-xs font-bold text-[#152A4C]">
                Isolated Sandbox Execution Results
              </h3>
            </div>
            {runResult && (
              <div className="text-xs font-mono text-slate-500">
                <span>{runResult.sandboxProvider}</span>
                <span aria-hidden="true"> · </span>
                <span>{runResult.executionTimeMs}ms</span>
                <span aria-hidden="true"> · </span>
                <span className="text-emerald-600 font-semibold">
                  {runResult.passedCount}/{runResult.totalCount} Passed
                </span>
              </div>
            )}
          </div>

          {!runResult ? (
            <p className="text-xs text-slate-500">
              Click <span className="text-[#152A4C] font-semibold">Run Test Cases</span> to execute
              your {LANGUAGE_LABELS[language]} code against pre-seeded test cases in the isolated
              sandbox adapter.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {runResult.results.map((tc, i) => (
                <div
                  key={tc.testCaseId}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between font-sans">
                    <span className="font-semibold text-[#152A4C]">Test Case #{i + 1}</span>
                    {tc.passed ? (
                      <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                      </span>
                    ) : (
                      <span className="text-rose-600 flex items-center gap-1 font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 truncate">Input: {tc.input.replace(/\n/g, ', ')}</div>
                  <div className="text-slate-700">
                    Expected: <span className="text-[#4079DA] font-semibold">{tc.expectedOutput}</span> · Actual:{' '}
                    <span className={tc.passed ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                      {tc.actualOutput}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Code + Verbal Approach Evaluation Panel */}
        {aiEvaluation && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#152A4C]">
                  AI Code &amp; Verbal Walkthrough Evaluation
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Detected Complexity: Time {aiEvaluation.detectedTimeComplexity} · Space{' '}
                  {aiEvaluation.detectedSpaceComplexity}
                </p>
              </div>
              <div className="text-right font-mono tabular-nums">
                <div className="text-xl font-bold text-[#4079DA]">
                  {aiEvaluation.overallCodeScore}/100
                </div>
                <div className="text-[11px] text-slate-500">
                  Logic {aiEvaluation.logicScore} · Approach {aiEvaluation.verbalExplanationScore}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {aiEvaluation.summaryFeedback}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <h4 className="font-bold text-emerald-700 mb-1">Strengths Observed</h4>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {aiEvaluation.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-amber-700 mb-1">Next Refinements</h4>
                <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                  {aiEvaluation.improvements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  Printer,
  Download,
  FileDown,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Mic,
  Eye,
  Code2,
  Search,
} from 'lucide-react';
import { InterviewReportRecord } from '../data/seedData';
import { InterviewMode } from '../utils/interviewRules';

interface ReportAndHistoryViewProps {
  reports: InterviewReportRecord[];
  selectedReport: InterviewReportRecord;
  onSelectReport: (rep: InterviewReportRecord) => void;
  onStartNewInterview: () => void;
}

export const ReportAndHistoryView: React.FC<ReportAndHistoryViewProps> = ({
  reports,
  selectedReport,
  onSelectReport,
  onStartNewInterview,
}) => {
  const [modeFilter, setModeFilter] = useState<'ALL' | InterviewMode>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter((r) => {
    const matchesMode = modeFilter === 'ALL' || r.mode === modeFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      r.subTopic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.personaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.mode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMode && matchesSearch;
  });

  const handlePrintPdf = () => {
    window.print();
  };

  // True .pdf file generation via jsPDF (works without a print dialog)
  const handleExportPdf = () => {
    const r = selectedReport;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    let y = 0;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const write = (
      text: string,
      opts: { size?: number; style?: 'normal' | 'bold' | 'italic'; color?: [number, number, number]; gap?: number; x?: number } = {}
    ) => {
      const size = opts.size ?? 10;
      doc.setFont('helvetica', opts.style ?? 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...(opts.color ?? [40, 40, 40]));
      const lines = doc.splitTextToSize(text, pageW - margin * 2 - (opts.x ?? 0));
      for (const line of lines) {
        ensureSpace(size + 6);
        doc.text(line, margin + (opts.x ?? 0), y);
        y += size + 4;
      }
      y += opts.gap ?? 0;
    };

    // Header band (CodeChef Navy)
    doc.setFillColor(21, 42, 76);
    doc.rect(0, 0, pageW, 92, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('InterviewX AI — Interview Performance Report', margin, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(191, 219, 254);
    doc.text(
      `${r.mode} · ${r.subTopic} (${r.difficulty})  ·  ${r.personaName}  ·  ${new Date(r.createdAt).toLocaleString()}`,
      margin,
      64
    );
    y = 124;

    write(
      `Estimated Interview Performance Score: ${r.overallScore}/100`,
      { size: 15, style: 'bold', color: [64, 121, 218], gap: 6 }
    );

    write('Category Scores', { size: 12, style: 'bold', gap: 2 });
    const cs = r.categoryScores;
    const catRows: Array<[string, number]> = [
      ['Answer Quality', cs.answerQuality],
      ['Communication & Pacing', cs.communication],
      ['Technical / Coding Correctness', cs.technicalCorrectness],
      ['Observable Presentation Indicators', cs.presentation],
    ];
    for (const [label, val] of catRows) {
      ensureSpace(14);
      doc.setFillColor(230, 240, 250);
      doc.rect(margin + 150, y - 8, 220 * (val / 100), 9, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(label, margin, y);
      doc.text(`${val}/100`, margin + 380, y);
      y += 16;
    }
    y += 8;

    write('Voice & Delivery', { size: 12, style: 'bold', gap: 2 });
    write(
      `Average pace: ${r.voiceSummary.avgWpm} WPM · Filler words: ${r.voiceSummary.totalFillers} (${Object.entries(
        r.voiceSummary.fillerBreakdown || {}
      )
        .map(([k, v]) => `${k}×${v}`)
        .join(', ') || 'none'}) · Long pauses (>2.5s): ${r.voiceSummary.longPauses} · Speaking consistency: ${r.voiceSummary.speakingConsistency}% · Total speaking time: ${r.voiceSummary.totalDurationSeconds}s`,
      { gap: 8 }
    );

    write('Observable Presentation Indicators (no emotion/confidence claims)', {
      size: 12,
      style: 'bold',
      gap: 2,
    });
    write(
      `Face visibility: ${r.presentationSummary.faceVisibilityPct}% · Gaze alignment: ${r.presentationSummary.gazeAlignmentPct}% · Posture stability: ${r.presentationSummary.postureStabilityPct}% · Shoulder alignment: ${r.presentationSummary.shoulderAlignmentPct}%`,
      { gap: 2 }
    );
    for (const tip of r.presentationSummary.gentleObservations || []) {
      write(`• ${tip}`, { x: 8, gap: 1 });
    }
    y += 6;

    if (r.codingSubmission) {
      write('Coding Round', { size: 12, style: 'bold', gap: 2 });
      write(
        `${r.codingSubmission.problemTitle} — ${r.codingSubmission.language} · Tests passed: ${r.codingSubmission.passedTests}/${r.codingSubmission.totalTests} · Score: ${r.codingSubmission.aiCodeScore}/100`,
        { gap: 2 }
      );
      write(`Complexity evaluation: ${r.codingSubmission.complexityEvaluation}`, { gap: 8 });
    }

    write('Strongest Answer', { size: 12, style: 'bold', gap: 2 });
    write(r.strongestAnswerSummary, { gap: 6 });
    write('Weakest Answer', { size: 12, style: 'bold', gap: 2 });
    write(r.weakestAnswerSummary, { gap: 6 });

    write('Actionable Improvements', { size: 12, style: 'bold', gap: 2 });
    for (const imp of r.actionableImprovements || []) {
      write(`• ${imp}`, { x: 8, gap: 1 });
    }
    y += 8;

    write('Question-by-Question Breakdown', { size: 12, style: 'bold', gap: 4 });
    for (const qa of r.qaBreakdown || []) {
      ensureSpace(60);
      write(
        `Q${qa.questionNumber} [${qa.difficulty} · ${qa.topic}] — Score ${qa.score}/100 (technical ${qa.technicalScore}) · ${qa.wpm} WPM · ${qa.fillerCount} fillers · ${qa.durationSeconds}s`,
        { style: 'bold', gap: 2 }
      );
      write(`Question: ${qa.questionText}`, { gap: 1 });
      write(`Candidate answer: ${qa.candidateAnswer.slice(0, 420)}${qa.candidateAnswer.length > 420 ? '…' : ''}`, { gap: 1 });
      write(`Interviewer feedback: ${qa.interviewerFeedback}`, { color: [90, 90, 90], gap: 1 });
      if (qa.strengths?.length) write(`Strengths: ${qa.strengths.join('; ')}`, { gap: 1 });
      if (qa.improvements?.length) write(`Improvements: ${qa.improvements.join('; ')}`, { gap: 6 });
    }

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `InterviewX AI · Observable presentation indicators only — does not measure confidence, emotion, honesty or personality.`,
        margin,
        pageH - 24
      );
      doc.text(`Page ${p} / ${pages}`, pageW - margin - 50, pageH - 24);
    }

    doc.save(`interviewx-report-${r.id}.pdf`);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(selectedReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interviewx-report-${selectedReport.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Session History Selector & Filter Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#152A4C]">
              Interview History &amp; Performance Reports
            </h2>
            <p className="text-xs text-slate-500">
              Select any completed session below to inspect question-by-question analytics or export
              a PDF report.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Filter sessions by topic or interviewer"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topic or persona..."
                className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15"
              />
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 border border-slate-200/80 rounded-lg">
              {(['ALL', 'Technical', 'DSA', 'HR'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModeFilter(m)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    modeFilter === m
                      ? 'bg-[#4079DA] text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-[#152A4C]'
                  }`}
                >
                  {m === 'ALL' ? 'All Modes' : m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* High-Density Session Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="py-2.5 px-3 font-semibold">Date</th>
                <th className="py-2.5 px-3 font-semibold">Mode &amp; Topic</th>
                <th className="py-2.5 px-3 font-semibold">Interviewer</th>
                <th className="py-2.5 px-3 font-semibold">Difficulty</th>
                <th className="py-2.5 px-3 font-semibold text-right">WPM / Fillers</th>
                <th className="py-2.5 px-3 font-semibold text-right">Est. Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {filteredReports.map((rep) => {
                const isSelected = rep.id === selectedReport.id;
                return (
                  <tr
                    key={rep.id}
                    onClick={() => onSelectReport(rep)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#EBF1FD]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">
                      {new Date(rep.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#152A4C]">
                      {rep.mode} · <span className="font-normal text-slate-600">{rep.subTopic}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{rep.personaName}</td>
                    <td className="py-2.5 px-3 text-slate-700">{rep.difficulty}</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {rep.voiceSummary.avgWpm} WPM · {rep.voiceSummary.totalFillers} fillers
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#4079DA]">
                      {rep.overallScore}/100
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Report Full Detail Sheet */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-[#4079DA]">{selectedReport.mode} Interview</span>
              <span aria-hidden="true">·</span>
              <span>{selectedReport.subTopic}</span>
              <span aria-hidden="true">·</span>
              <span>Interviewer: {selectedReport.personaName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">
                {new Date(selectedReport.createdAt).toLocaleString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#152A4C]">
              Post-Interview Evaluation &amp; Diagnostic Report
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-2 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              <FileDown className="w-3.5 h-3.5 inline mr-1.5" />
              Export PDF Report
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-[#152A4C] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5 inline mr-1.5" />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3.5 py-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-[#152A4C] border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 inline mr-1.5" />
              Download JSON
            </button>
            <button
              type="button"
              onClick={onStartNewInterview}
              className="px-3.5 py-2 text-xs font-semibold bg-[#152A4C] hover:bg-[#1e3a66] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              Start Follow-Up Session
            </button>
          </div>
        </div>

        {/* Overall Score + 4 Weighted Categories */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-[#EBF1FD]/60 border border-blue-200/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-medium text-[#152A4C]">Estimated Interview Performance Score</span>
            <div className="my-2 font-mono tabular-nums">
              <span className="text-4xl font-extrabold text-[#4079DA]">
                {selectedReport.overallScore}
              </span>
              <span className="text-sm text-slate-500"> / 100</span>
            </div>
            <span className="text-[11px] text-slate-600">
              Weighted: 40% Quality · 25% Comm · 20% Tech · 15% Framing
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Answer Quality (40%)</span>
              <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                {selectedReport.categoryScores.answerQuality}/100
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#4079DA]"
                style={{ width: `${selectedReport.categoryScores.answerQuality}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Relevance, depth, and structured STAR/trade-off reasoning.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Communication (25%)</span>
              <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                {selectedReport.categoryScores.communication}/100
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500"
                style={{ width: `${selectedReport.categoryScores.communication}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Speaking pace ({selectedReport.voiceSummary.avgWpm} WPM), minimal fillers, and pause
              control.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Tech / Coding (20%)</span>
              <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                {selectedReport.categoryScores.technicalCorrectness}/100
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-500"
                style={{ width: `${selectedReport.categoryScores.technicalCorrectness}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              First-principles correctness, complexity bounds, and edge cases.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Presentation (15%)</span>
              <span className="font-mono tabular-nums font-bold text-[#152A4C]">
                {selectedReport.categoryScores.presentation}/100
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500"
                style={{ width: `${selectedReport.categoryScores.presentation}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Observable camera framing, approximate gaze, and shoulder stability.
            </p>
          </div>
        </div>

        {/* Voice Delivery Analytics + Observable Presentation Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#4079DA]" />
              <h3 className="text-sm font-bold text-[#152A4C]">
                Voice &amp; Delivery Telemetry
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500 font-sans">Avg Pace</div>
                <div className="text-base font-bold text-[#152A4C]">
                  {selectedReport.voiceSummary.avgWpm} WPM
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Filler Words</div>
                <div className="text-base font-bold text-amber-600">
                  {selectedReport.voiceSummary.totalFillers}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Long Pauses</div>
                <div className="text-base font-bold text-[#152A4C]">
                  {selectedReport.voiceSummary.longPauses}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Consistency</div>
                <div className="text-base font-bold text-emerald-600">
                  {selectedReport.voiceSummary.speakingConsistency}%
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-600 pt-2 border-t border-slate-200">
              Filler distribution:{' '}
              {Object.keys(selectedReport.voiceSummary.fillerBreakdown).length === 0
                ? 'Zero filler words detected'
                : Object.entries(selectedReport.voiceSummary.fillerBreakdown)
                    .map(([w, c]) => `"${w}" (${c}x)`)
                    .join(' · ')}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#4079DA]" />
              <h3 className="text-sm font-bold text-[#152A4C]">
                Observable Presentation Indicators (MediaPipe)
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
              <div>
                <div className="text-slate-500 font-sans">Face Framing</div>
                <div className="text-base font-bold text-[#152A4C]">
                  {selectedReport.presentationSummary.faceVisibilityPct}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Gaze Align</div>
                <div className="text-base font-bold text-[#4079DA]">
                  {selectedReport.presentationSummary.gazeAlignmentPct}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Posture</div>
                <div className="text-base font-bold text-[#152A4C]">
                  {selectedReport.presentationSummary.postureStabilityPct}%
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-sans">Shoulders</div>
                <div className="text-base font-bold text-emerald-600">
                  {selectedReport.presentationSummary.shoulderAlignmentPct}%
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 pt-2 border-t border-slate-200">
              {selectedReport.presentationSummary.gentleObservations[0]}
            </p>
          </div>
        </div>

        {/* Strongest / Weakest Highlights & Actionable Improvements */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Strongest Answer Highlight
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {selectedReport.strongestAnswerSummary}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              Primary Area for Growth
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {selectedReport.weakestAnswerSummary}
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#4079DA]">
              <FileText className="w-4 h-4" />
              Actionable Next Steps
            </div>
            <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
              {selectedReport.actionableImprovements.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Coding Submission Breakdown if present */}
        {selectedReport.codingSubmission && (
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#4079DA]" />
                <h3 className="text-sm font-bold text-[#152A4C]">
                  Coding Round Submission: {selectedReport.codingSubmission.problemTitle}
                </h3>
              </div>
              <div className="text-xs font-mono text-emerald-700 font-bold">
                {selectedReport.codingSubmission.passedTests}/
                {selectedReport.codingSubmission.totalTests} Test Cases · AI Score{' '}
                {selectedReport.codingSubmission.aiCodeScore}/100
              </div>
            </div>
            <p className="text-xs text-slate-700">
              <span className="text-slate-500 font-semibold">Spoken Approach Walkthrough: </span>"
              {selectedReport.codingSubmission.verbalApproachTranscript}"
            </p>
            <p className="text-xs text-[#4079DA] font-semibold font-mono">
              {selectedReport.codingSubmission.complexityEvaluation}
            </p>
            <pre className="bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono text-[#152A4C] overflow-x-auto">
              {selectedReport.codingSubmission.code}
            </pre>
          </div>
        )}

        {/* Question-by-Question Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-[#152A4C]">
            Question-by-Question Transcript &amp; Evaluation Breakdown
          </h3>
          {selectedReport.qaBreakdown.map((qa) => (
            <div
              key={qa.id}
              className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="text-slate-500">
                  <span className="font-bold text-[#152A4C]">
                    Question #{qa.questionNumber}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span>{qa.topic}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{qa.difficulty}</span>
                </div>
                <div className="font-mono tabular-nums text-[#4079DA] font-bold">
                  Score {qa.score}/100 · Tech {qa.technicalScore}/100 · {qa.wpm} WPM
                </div>
              </div>

              <p className="text-xs font-bold text-[#152A4C]">{qa.questionText}</p>
              <div className="p-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                <span className="text-slate-500 font-semibold">Candidate Answer: </span>
                {qa.candidateAnswer}
              </div>
              <p className="text-xs text-[#152A4C] bg-[#EBF1FD]/70 border border-blue-100 p-2.5 rounded-lg">
                <span className="text-[#4079DA] font-bold">Interviewer Evaluation: </span>
                {qa.interviewerFeedback}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

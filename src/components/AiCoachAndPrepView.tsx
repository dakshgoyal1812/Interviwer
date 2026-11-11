import React, { useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  Send,
  Globe,
  Brain,
  Image as ImageIcon,
  Radio,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: { title: string; uri: string }[];
  thinkingMode?: string;
}

export const AiCoachAndPrepView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      role: 'assistant',
      text: 'Welcome to the InterviewX AI Prep Lab. Ask me to critique a behavioral STAR story, drill you on DBMS/OS/System Design trade-offs, research recent company interview loops with Google Search Grounding, or analyze a system design diagram.',
    },
  ]);
  const [input, setInput] = useState('');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [useHighThinking, setUseHighThinking] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Multimodal Image Analysis state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState(
    'Analyze this distributed system architecture diagram for single points of failure, caching bottlenecks, and follow-up interview questions.'
  );
  const [imageAnalysisResult, setImageAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  // Gemini Live Voice Warmup state
  const [liveConnected, setLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Idle — Click Start Live Voice Warmup to connect');
  const [liveTranscripts, setLiveTranscripts] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const resp = await apiFetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6),
          useSearchGrounding,
          useHighThinking,
        }),
      });
      const data = await resp.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: data.reply || 'Here is my analysis.',
          sources: data.sources || [],
          thinkingMode: data.thinkingMode,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: 'Focus on stating your core assumption first, quantifying read-to-write ratios, and contrasting latency vs consistency.',
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const generateSampleDiagramAndAnalyze = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 560;
    canvas.height = 260;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, 560, 260);

    // Draw sample architecture nodes (API Gateway -> Rate Limiter -> Worker Queue -> Primary DB)
    const nodes = [
      { x: 30, y: 95, label: 'Client / CDN' },
      { x: 165, y: 95, label: 'API Gateway' },
      { x: 300, y: 45, label: 'Redis Cache' },
      { x: 300, y: 145, label: 'Kafka Stream' },
      { x: 435, y: 95, label: 'Postgres Primary' },
    ];
    ctx.strokeStyle = '#4079DA';
    ctx.lineWidth = 2;
    ctx.font = '12px monospace';
    for (const n of nodes) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(n.x, n.y, 105, 52);
      ctx.strokeRect(n.x, n.y, 105, 52);
      ctx.fillStyle = '#152A4C';
      ctx.fillText(n.label, n.x + 8, n.y + 30);
    }
    const dataUrl = canvas.toDataURL('image/png');
    setImagePreview(dataUrl);
    await runImageAnalysis(dataUrl);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runImageAnalysis = async (base64ToUse?: string) => {
    const targetImg = base64ToUse || imagePreview;
    if (!targetImg) return;
    setIsAnalyzingImage(true);
    try {
      const resp = await apiFetch('/api/coach/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: targetImg,
          mimeType: 'image/png',
          prompt: imagePrompt,
        }),
      });
      const data = await resp.json();
      setImageAnalysisResult(data.analysis);
    } catch {
      setImageAnalysisResult('Unable to analyze image right now.');
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  const toggleLiveVoiceSession = () => {
    if (liveConnected) {
      wsRef.current?.close();
      wsRef.current = null;
      setLiveConnected(false);
      setLiveStatus('Disconnected');
      return;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${window.location.host}/live`);
    wsRef.current = ws;
    setLiveStatus('Connecting to Gemini 3.8 Live Bridge...');

    ws.onopen = () => {
      setLiveConnected(true);
      setLiveStatus('Connected to Live API Session — Send a warmup prompt below');
      ws.send(
        JSON.stringify({
          text: 'Ask me a rapid-fire system design warmup question on distributed caching.',
        })
      );
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.outputTranscript) {
          setLiveTranscripts((prev) => [...prev, `Interviewer: ${msg.outputTranscript}`]);
        } else if (msg.message) {
          setLiveStatus(msg.message);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setLiveConnected(false);
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left 7 Columns: Multi-Turn AI Interview Coach with Search Grounding & High Thinking */}
      <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl flex flex-col h-[560px] sm:h-[640px] shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#152A4C]">
              AI Interview Coach &amp; Company Loop Research
            </h2>
            <p className="text-xs text-slate-500">
              Multi-turn coaching with Google Search Grounding and High Thinking mode.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseSearchGrounding((v) => !v)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                useSearchGrounding
                  ? 'bg-[#EBF1FD] border-[#4079DA]/40 text-[#4079DA] font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Globe className="w-3.5 h-3.5 inline mr-1" />
              Search Grounding
            </button>
            <button
              type="button"
              onClick={() => setUseHighThinking((v) => !v)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                useHighThinking
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Brain className="w-3.5 h-3.5 inline mr-1" />
              High Thinking
            </button>
          </div>
        </div>

        {/* Messages Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#EBF1FD] border border-blue-200 text-[#152A4C] ml-6 sm:ml-10'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4 sm:mr-6'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span className="font-bold text-[#152A4C]">
                  {m.role === 'user' ? 'You' : 'InterviewX AI Coach'}
                </span>
                {m.thinkingMode === 'HIGH' && (
                  <span className="font-mono text-indigo-600 font-semibold">ThinkingLevel.HIGH</span>
                )}
              </div>
              <div className="whitespace-pre-line">{m.text}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-[#4079DA]">
                    Google Search Grounded Sources:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {m.sources.map((s, idx) => (
                      <a
                        key={idx}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#4079DA] hover:underline font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 flex gap-2 bg-slate-50/60 rounded-b-2xl">
          <input
            type="text"
            aria-label="Ask AI Interview Coach"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about system design trade-offs, DBMS internals, or company interview format..."
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-[#152A4C] focus:outline-none focus:border-[#4079DA] focus:ring-2 focus:ring-[#4079DA]/15"
          />
          <button
            type="submit"
            disabled={isSending}
            className="px-4 py-2 bg-[#4079DA] hover:bg-[#3164BC] text-white font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 inline mr-1" />
            {isSending ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>

      {/* Right 5 Columns: Whiteboard / Resume Image Analyzer + Live API Voice Warmup */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#4079DA]" />
              <h3 className="text-sm font-bold text-[#152A4C]">
                Whiteboard &amp; Resume Visual Critique
              </h3>
            </div>
            <button
              type="button"
              onClick={generateSampleDiagramAndAnalyze}
              disabled={isAnalyzingImage}
              className="px-2.5 py-1 text-xs font-semibold bg-[#4079DA] hover:bg-[#3164BC] text-white rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              <Sparkles className="w-3 h-3 inline mr-1" />
              {isAnalyzingImage ? 'Analyzing...' : 'Analyze Sample Architecture'}
            </button>
          </div>

          <p className="text-xs text-slate-600">
            Upload a system design whiteboard snapshot or resume image for multimodal architectural
            review.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-[#152A4C] cursor-pointer transition-colors whitespace-nowrap shrink-0">
              Upload Diagram / Resume
              <input
                type="file"
                accept="image/*"
                onChange={handleImageFileUpload}
                className="hidden"
              />
            </label>
            {imagePreview && (
              <button
                type="button"
                onClick={() => runImageAnalysis()}
                disabled={isAnalyzingImage}
                className="px-3 py-1.5 bg-[#152A4C] hover:bg-[#1e3a66] text-white font-semibold text-xs rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-2xs"
              >
                Run Gemini Critique
              </button>
            )}
          </div>

          {imagePreview && (
            <img
              src={imagePreview}
              alt="Uploaded System Design Diagram Preview"
              referrerPolicy="no-referrer"
              className="w-full h-32 object-contain bg-slate-50 border border-slate-200 rounded-lg"
            />
          )}

          {imageAnalysisResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-line max-h-48 overflow-y-auto">
              {imageAnalysisResult}
            </div>
          )}
        </div>

        {/* Real-Time Gemini 3.8 Live API Voice Warmup */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-[#152A4C]">
                Real-Time Live API Voice Warmup
              </h3>
            </div>
            <button
              type="button"
              onClick={toggleLiveVoiceSession}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                liveConnected
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
              }`}
            >
              {liveConnected ? 'End Live Session' : 'Start Live Voice Warmup'}
            </button>
          </div>
          <p className="text-xs text-slate-600">{liveStatus}</p>
          {liveTranscripts.length > 0 && (
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-[#152A4C] space-y-1 max-h-32 overflow-y-auto">
              {liveTranscripts.map((t, i) => (
                <div key={i}>{t}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

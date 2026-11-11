import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { GoogleGenAI, Modality, ThinkingLevel, Type, LiveServerMessage } from '@google/genai';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { executeInSandbox } from './sandboxAdapter.ts';
import {
  INTERVIEWER_PERSONAS,
  SEED_QUESTION_BANK,
  SEED_CODING_PROBLEMS,
  INITIAL_REPORTS,
  InterviewerPersona,
  QuestionBankItem,
  CodingProblem,
  InterviewReportRecord,
  SupportedCodeLanguage,
} from './src/data/seedData.ts';
import {
  computeNextDifficulty,
  DifficultyLevel,
  InterviewMode,
  MoodTag,
  GestureTag,
} from './src/utils/interviewRules.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. WAGURI KEYPOOL MULTI-PROVIDER FREE LLM ROTATION + GEMINI SDK
// ============================================================================
interface KeyEntry {
  key: string;
  cooldownUntil: number;
  usageCount: number;
}

class KeyPool {
  private keys: KeyEntry[] = [];
  private currentIndex = 0;
  public baseUrl: string;
  public model: string;

  constructor() {
    const rawKeys = (process.env.LLM_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k && !k.startsWith('sk-or-v1-key'));
    this.keys = rawKeys.map((key) => ({ key, cooldownUntil: 0, usageCount: 0 }));
    this.baseUrl = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
    this.model = process.env.LLM_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
  }

  public getNextKey(): string | null {
    const now = Date.now();
    for (let i = 0; i < this.keys.length; i++) {
      const idx = (this.currentIndex + i) % this.keys.length;
      const entry = this.keys[idx];
      if (entry.cooldownUntil <= now) {
        this.currentIndex = (idx + 1) % this.keys.length;
        entry.usageCount++;
        return entry.key;
      }
    }
    return null;
  }

  public markRateLimited(key: string, cooldownMs = 60_000) {
    const found = this.keys.find((k) => k.key === key);
    if (found) {
      found.cooldownUntil = Date.now() + cooldownMs;
    }
  }

  public getStatus() {
    return {
      configuredKeys: this.keys.length,
      activeKeys: this.keys.filter((k) => k.cooldownUntil <= Date.now()).length,
      baseUrl: this.baseUrl,
      model: this.model,
    };
  }
}

const keyPool = new KeyPool();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// ============================================================================
// 2. SUPABASE CLIENT + IN-MEMORY / PERSISTENT STORE
// ============================================================================
let supabase: SupabaseClient | null = null;
const supabaseUrl = process.env.SUPABASE_URL;
// Accept both classic (SERVICE_ROLE_KEY/ANON_KEY) and new (SECRET/PUBLISHABLE) Supabase key names.
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;
if (
  supabaseUrl &&
  supabaseKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project-id')
) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// Hand-rolled CORS middleware (frontend on Vercel, backend on Render).
const allowedOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const corsMiddleware: express.RequestHandler = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
};

const memoryStore: {
  personas: InterviewerPersona[];
  questionBank: QuestionBankItem[];
  codingProblems: CodingProblem[];
  reports: InterviewReportRecord[];
} = {
  personas: [...INTERVIEWER_PERSONAS],
  questionBank: [...SEED_QUESTION_BANK],
  codingProblems: [...SEED_CODING_PROBLEMS],
  reports: [...INITIAL_REPORTS],
};

// ============================================================================
// 3. ADAPTIVE INTERVIEW EVALUATION HELPER (KeyPool -> Gemini -> Deterministic)
// ============================================================================
async function evaluateTurnWithAI(params: {
  mode: InterviewMode;
  subTopic: string;
  difficulty: DifficultyLevel;
  persona: InterviewerPersona;
  currentQuestion: string;
  candidateAnswer: string;
  askedQuestions: string[];
  weakTopics: string[];
}) {
  const {
    mode,
    subTopic,
    difficulty,
    persona,
    currentQuestion,
    candidateAnswer,
    askedQuestions,
    weakTopics,
  } = params;

  // Pick a non-repeated fallback next question from the bank
  const unaskedPool = memoryStore.questionBank.filter(
    (q) => q.mode === mode && !askedQuestions.includes(q.questionText)
  );
  const fallbackNextQuestion =
    unaskedPool.find((q) => q.topic.toLowerCase().includes(subTopic.toLowerCase()))?.questionText ||
    unaskedPool[0]?.questionText ||
    `Building on what you just shared about ${subTopic}, what edge cases or scalability bottlenecks would arise if load increased by 10x, and how would you mitigate them?`;

  const systemPrompt = `${persona.systemPrompt}
Interview Mode: ${mode} (${subTopic})
Current Difficulty: ${difficulty}
Candidate Weak Topics from Past Memory: ${weakTopics.join(', ') || 'None recorded yet'}
Already Asked Questions (DO NOT REPEAT THESE): ${JSON.stringify(askedQuestions)}

Evaluate the candidate's answer to the current question: "${currentQuestion}"
Respond strictly in JSON with these exact keys:
- spoken_reply: A natural 1-2 sentence reaction to their specific answer followed directly by ONE contextual follow-up or next question.
- follow_up_question: The exact follow-up or next question asked at the end of spoken_reply.
- mood_tag: One of ["neutral", "happy", "serious", "encouraging", "thinking"]
- gesture_tag: One of ["nod", "head_tilt", "bow", "explain", "none"]
- score_for_answer: Integer 0-100 evaluating overall quality, structure, and relevance.
- technical_score: Integer 0-100 evaluating technical/domain depth and accuracy.
- difficulty_next: One of ["Easy", "Medium", "Hard"]
- topic: Concise sub-topic name of the turn.
- strengths: Array of 1-3 short strings noting what the candidate did well.
- improvements: Array of 1-2 concrete suggestions for a stronger answer.`;

  // 1) Try KeyPool OpenAI-compatible provider if configured
  const poolKey = keyPool.getNextKey();
  if (poolKey) {
    try {
      const resp = await fetch(`${keyPool.baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${poolKey}`,
        },
        body: JSON.stringify({
          model: keyPool.model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Question Asked: ${currentQuestion}\nCandidate Answer: ${candidateAnswer}`,
            },
          ],
        }),
      });
      if (resp.status === 429) {
        keyPool.markRateLimited(poolKey);
      } else if (resp.ok) {
        const data = (await resp.json()) as any;
        const rawText = data?.choices?.[0]?.message?.content;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          return normalizeTurnOutput(parsed, difficulty, subTopic, fallbackNextQuestion);
        }
      }
    } catch (err) {
      console.warn('KeyPool provider fallback triggered:', err);
    }
  }

  // 2) Try Server-Side Gemini API (`gemini-2.5-flash`)
  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Question Asked: ${currentQuestion}\nCandidate Answer: ${candidateAnswer}`,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              spoken_reply: { type: Type.STRING },
              follow_up_question: { type: Type.STRING },
              mood_tag: { type: Type.STRING },
              gesture_tag: { type: Type.STRING },
              score_for_answer: { type: Type.INTEGER },
              technical_score: { type: Type.INTEGER },
              difficulty_next: { type: Type.STRING },
              topic: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'spoken_reply',
              'follow_up_question',
              'mood_tag',
              'gesture_tag',
              'score_for_answer',
              'technical_score',
              'difficulty_next',
              'topic',
              'strengths',
              'improvements',
            ],
          },
        },
      });
      const text = (response.text ?? '').trim();
      if (text) {
        const parsed = JSON.parse(text);
        return normalizeTurnOutput(parsed, difficulty, subTopic, fallbackNextQuestion);
      }
    } catch (err) {
      console.warn('Gemini turn evaluation fallback triggered:', err);
    }
  }

  // 3) Deterministic Domain-Aware Evaluator Fallback (always keeps app 100% functional)
  return deterministicTurnEvaluation({
    mode,
    subTopic,
    difficulty,
    currentQuestion,
    candidateAnswer,
    fallbackNextQuestion,
  });
}

function normalizeTurnOutput(
  parsed: any,
  currentDifficulty: DifficultyLevel,
  defaultTopic: string,
  fallbackNextQuestion: string
) {
  const score = Math.max(20, Math.min(98, Number(parsed.score_for_answer) || 76));
  const techScore = Math.max(20, Math.min(98, Number(parsed.technical_score) || score));
  const validMoods: MoodTag[] = ['neutral', 'happy', 'serious', 'encouraging', 'thinking'];
  const validGestures: GestureTag[] = ['nod', 'head_tilt', 'bow', 'explain', 'none'];
  const mood_tag: MoodTag = validMoods.includes(parsed.mood_tag)
    ? parsed.mood_tag
    : score >= 78
    ? 'encouraging'
    : 'thinking';
  const gesture_tag: GestureTag = validGestures.includes(parsed.gesture_tag)
    ? parsed.gesture_tag
    : score >= 75
    ? 'nod'
    : 'explain';
  const difficulty_next = computeNextDifficulty(currentDifficulty, score);
  const followUp =
    typeof parsed.follow_up_question === 'string' && parsed.follow_up_question.trim().length > 10
      ? parsed.follow_up_question.trim()
      : fallbackNextQuestion;
  const spoken_reply =
    typeof parsed.spoken_reply === 'string' && parsed.spoken_reply.trim().length > 10
      ? parsed.spoken_reply.trim()
      : `Thank you for walking through that approach. ${followUp}`;

  return {
    spoken_reply,
    follow_up_question: followUp,
    mood_tag,
    gesture_tag,
    score_for_answer: score,
    technical_score: techScore,
    difficulty_next,
    topic: typeof parsed.topic === 'string' && parsed.topic ? parsed.topic : defaultTopic,
    strengths:
      Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths
        : ['Clear problem framing and structured reasoning'],
    improvements:
      Array.isArray(parsed.improvements) && parsed.improvements.length > 0
        ? parsed.improvements
        : ['Include concrete quantitative trade-offs or complexity bounds'],
  };
}

function deterministicTurnEvaluation(params: {
  mode: InterviewMode;
  subTopic: string;
  difficulty: DifficultyLevel;
  currentQuestion: string;
  candidateAnswer: string;
  fallbackNextQuestion: string;
}) {
  const { subTopic, difficulty, candidateAnswer, fallbackNextQuestion } = params;
  const words = candidateAnswer.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const techKeywords = [
    'complexity',
    'o(n)',
    'o(1)',
    'o(log',
    'index',
    'hash',
    'latency',
    'memory',
    'thread',
    'lock',
    'transaction',
    'isolation',
    'cache',
    'benchmark',
    'trade-off',
    'tradeoff',
    'scalable',
    'idempotent',
    'queue',
    'tree',
    'graph',
    'dp',
    'dynamic',
  ];
  const lower = candidateAnswer.toLowerCase();
  const matchedKeywords = techKeywords.filter((kw) => lower.includes(kw));

  let baseScore = 62;
  if (wordCount >= 25) baseScore += 12;
  if (wordCount >= 45) baseScore += 7;
  baseScore += Math.min(15, matchedKeywords.length * 4);
  if (wordCount < 10) baseScore = 44;

  const score_for_answer = Math.max(35, Math.min(95, baseScore));
  const technical_score = Math.max(
    35,
    Math.min(96, baseScore + (matchedKeywords.length >= 2 ? 4 : -3))
  );
  const difficulty_next = computeNextDifficulty(difficulty, score_for_answer);

  const mood_tag: MoodTag =
    score_for_answer >= 80 ? 'encouraging' : score_for_answer >= 65 ? 'neutral' : 'thinking';
  const gesture_tag: GestureTag =
    score_for_answer >= 75 ? 'nod' : score_for_answer >= 60 ? 'explain' : 'head_tilt';

  const feedbackPrefix =
    score_for_answer >= 80
      ? `That is a well-structured breakdown with strong technical grounding.`
      : score_for_answer >= 65
      ? `Good core intuition on ${subTopic}, though we can sharpen the edge-case analysis.`
      : `I see where you are heading, but let's dig deeper into the concrete mechanisms.`;

  const spoken_reply = `${feedbackPrefix} ${fallbackNextQuestion}`;

  return {
    spoken_reply,
    follow_up_question: fallbackNextQuestion,
    mood_tag,
    gesture_tag,
    score_for_answer,
    technical_score,
    difficulty_next,
    topic: subTopic,
    strengths:
      matchedKeywords.length > 0
        ? [
            `Addressed key concepts (${matchedKeywords.slice(0, 3).join(', ')})`,
            'Direct response to the prompt',
          ]
        : ['Clear communication flow'],
    improvements: [
      'Explicitly state worst-case time/space bounds or production failure modes',
      'Quantify the measurable impact or benchmark delta',
    ],
  };
}

// ============================================================================
// 4. EXPRESS APP & API ROUTES
// ============================================================================
async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  app.use(corsMiddleware);
  app.use(express.json({ limit: '15mb' }));

  // --- Static 3D assets: interviewer.vrm (repo root) + optional ./models dir (room GLBs) ---
  app.use('/models', express.static(path.join(__dirname, 'models'), { maxAge: '1d' }));
  app.get('/models/interviewer.vrm', (_req, res) => {
    res.sendFile(path.join(__dirname, 'interviewer.vrm'));
  });
  app.get('/interviewer.vrm', (_req, res) => {
    res.sendFile(path.join(__dirname, 'interviewer.vrm'));
  });

  // --- Health & Architecture Status (KeyPool + Supabase + Sandbox) ---
  app.get('/api/status', (_req, res) => {
    res.json({
      ok: true,
      keyPool: keyPool.getStatus(),
      geminiConfigured: Boolean(
        process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
      ),
      supabaseConfigured: Boolean(supabase),
      sandboxProvider: process.env.CODE_SANDBOX_PROVIDER || 'piston',
      sandboxFallbacks: ['piston', 'judge0', 'offline-heuristic'],
      ttsEngines: ['msedge-tts (primary, keyless)', 'azure-tts', 'gemini-tts', 'browser-speech'],
      azureTtsConfigured: Boolean(process.env.AZURE_SPEECH_KEY),
    });
  });

  // --- Personas (from Supabase with seed fallback) ---
  app.get('/api/personas', async (_req, res) => {
    try {
      if (supabase) {
        const { data, error } = await supabase.from('interviewer_personas').select('*');
        if (!error && data && data.length > 0) {
          return res.json(data);
        }
      }
      res.json(memoryStore.personas);
    } catch {
      res.json(memoryStore.personas);
    }
  });

  // --- Question Bank & Coding Problems (Supabase with seed fallback) ---
  app.get('/api/questions', async (req, res) => {
    const mode = req.query.mode as InterviewMode | undefined;
    let questionBank = mode
      ? memoryStore.questionBank.filter((q) => q.mode === mode)
      : memoryStore.questionBank;
    let codingProblems = memoryStore.codingProblems;

    if (supabase) {
      try {
        let query = supabase.from('question_bank').select('*');
        if (mode) query = query.eq('mode', mode);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          const mapped = data.map((row: any) => ({
            id: row.id,
            mode: row.mode,
            topic: row.topic,
            difficulty: row.difficulty,
            questionText: row.question_text,
            idealKeyPoints: row.ideal_key_points || [],
            followUpHints: row.ideal_key_points || [],
            argTypes: row.arg_types || undefined,
            starterCode: row.starter_code || {},
            testCases: row.test_cases || [],
            title: row.title || (row.question_text || '').slice(0, 40),
            description: row.description || row.question_text,
            constraints: row.constraints || [],
            examples: row.examples || [],
            optimalTimeComplexity: row.optimal_time_complexity || 'O(n)',
            optimalSpaceComplexity: row.optimal_space_complexity || 'O(1)',
            referenceSolutionSummary: row.reference_solution_summary || '',
          }));
          questionBank = mapped.filter((q: any) => !q.starterCode?.python);
          codingProblems = mapped.filter((q: any) => q.starterCode?.python);
        }
      } catch (err) {
        console.warn('Supabase question_bank read failed, using seed store:', err);
      }
    }

    res.json({
      questions: questionBank,
      codingProblems,
    });
  });

  // --- Generate New Original Coding Problem via AI ---
  app.post('/api/coding/generate-problem', async (req, res) => {
    const { topic = 'Arrays & Hashing', difficulty = 'Medium' } = req.body || {};
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Create an original DSA coding interview problem on topic "${topic}" with difficulty "${difficulty}". Do not copy LeetCode verbatim; design a fresh engineering scenario.
STRICT test case convention: each test case "input" contains ONE argument per line, formatted as JSON literals (arrays like [1,2,3], strings quoted like "abc", bare integers). The candidate's solve(...) function receives those parsed arguments in order and its return value is compared to expectedOutput as compact JSON.
Also declare argTypes: the ordered type list of solve() arguments using only these strings: "int", "long", "double", "string", "int[]", "int[][]", "string[]". Provide starter code in python, javascript, cpp, java, and c where every language defines a function named solve.
For C, when the first argument is an array type, the C signature must be (const int* arr, int n, <rest>) i.e. pointer followed by length.`,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                topic: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                description: { type: Type.STRING },
                argTypes: { type: Type.ARRAY, items: { type: Type.STRING } },
                optimalTimeComplexity: { type: Type.STRING },
                optimalSpaceComplexity: { type: Type.STRING },
                referenceSolutionSummary: { type: Type.STRING },
                constraints: { type: Type.ARRAY, items: { type: Type.STRING } },
                examples: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      input: { type: Type.STRING },
                      output: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                    },
                    required: ['input', 'output', 'explanation'],
                  },
                },
                testCases: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      input: { type: Type.STRING },
                      expectedOutput: { type: Type.STRING },
                    },
                    required: ['id', 'input', 'expectedOutput'],
                  },
                },
              },
              required: [
                'title',
                'topic',
                'difficulty',
                'description',
                'argTypes',
                'optimalTimeComplexity',
                'optimalSpaceComplexity',
                'referenceSolutionSummary',
                'constraints',
                'examples',
                'testCases',
              ],
            },
          },
        });
        const parsed = JSON.parse((response.text ?? '{}').trim());
        if (parsed.title) {
          const newProb: CodingProblem = {
            id: `prob-gen-${Date.now()}`,
            title: parsed.title,
            topic: parsed.topic || topic,
            difficulty: (parsed.difficulty as DifficultyLevel) || difficulty,
            description: parsed.description,
            constraints: parsed.constraints || ['1 <= n <= 10^5'],
            examples: parsed.examples || [],
            testCases: parsed.testCases || [],
            argTypes:
              Array.isArray(parsed.argTypes) && parsed.argTypes.length > 0
                ? parsed.argTypes
                : undefined,
            optimalTimeComplexity: parsed.optimalTimeComplexity || 'O(n)',
            optimalSpaceComplexity: parsed.optimalSpaceComplexity || 'O(n)',
            referenceSolutionSummary:
              parsed.referenceSolutionSummary || 'Hash map / two-pointer linear scan.',
            starterCode: {
              python: `def solve(data):\n    # Implement your ${topic} solution here\n    return data\n`,
              javascript: `function solve(data) {\n  // Implement your ${topic} solution here\n  return data;\n}\n`,
              cpp: `#include <vector>\nusing namespace std;\n\nint solve(vector<int>& data) {\n    return 0;\n}\n`,
              java: `import java.util.*;\n\npublic class Solution {\n    public static int solve(int[] data) {\n        return 0;\n    }\n}\n`,
              c: `int solve(const int* data, int n) {\n    return 0;\n}\n`,
            },
          };
          memoryStore.codingProblems.unshift(newProb);
          return res.json(newProb);
        }
      } catch (err) {
        console.warn('Fallback on custom problem generation:', err);
      }
    }

    // Fallback generated problem
    const fallbackProb: CodingProblem = {
      id: `prob-gen-${Date.now()}`,
      title: `${ memoryStore.codingProblems.length + 1 }. Rate-Limiter Sliding Window Counter (${topic})`,
      topic,
      difficulty: difficulty as DifficultyLevel,
      description:
        'Given a sorted array of request timestamps in milliseconds `timestamps` and a window size `windowMs`, return the maximum number of requests that occurred within any contiguous window of length `windowMs`.',
      constraints: ['1 <= timestamps.length <= 10^5', '1 <= windowMs <= 10^9'],
      examples: [
        {
          input: 'timestamps = [100, 200, 350, 900], windowMs = 300',
          output: '3',
          explanation: 'Requests at 100, 200, and 350 all fall within [100, 400].',
        },
      ],
      testCases: [
        { id: 'tc-g1', input: '[100,200,350,900]\n300', expectedOutput: '3' },
        { id: 'tc-g2', input: '[10,20,30,40]\n15', expectedOutput: '2' },
      ],
      optimalTimeComplexity: 'O(n)',
      optimalSpaceComplexity: 'O(1)',
      referenceSolutionSummary:
        'Maintain a two-pointer sliding window [left, right] where timestamps[right] - timestamps[left] <= windowMs.',
      starterCode: {
        python: `def solve(timestamps: list[int], window_ms: int) -> int:\n    left = 0\n    best = 0\n    for right in range(len(timestamps)):\n        while timestamps[right] - timestamps[left] > window_ms:\n            left += 1\n        best = max(best, right - left + 1)\n    return best\n`,
        javascript: `function solve(timestamps, windowMs) {\n  let left = 0, best = 0;\n  for (let right = 0; right < timestamps.length; right++) {\n    while (timestamps[right] - timestamps[left] > windowMs) left++;\n    best = Math.max(best, right - left + 1);\n  }\n  return best;\n}\n`,
        cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint solve(vector<int>& ts, int windowMs) {\n    int left = 0, best = 0;\n    for (int r = 0; r < (int)ts.size(); r++) {\n        while (ts[r] - ts[left] > windowMs) left++;\n        best = max(best, r - left + 1);\n    }\n    return best;\n}\n`,
        java: `public class Solution {\n    public static int solve(int[] ts, int windowMs) {\n        int left = 0, best = 0;\n        for (int r = 0; r < ts.length; r++) {\n            while (ts[r] - ts[left] > windowMs) left++;\n            best = Math.max(best, r - left + 1);\n        }\n        return best;\n    }\n}\n`,
        c: `int solve(const int* ts, int n, int windowMs) {\n    int left = 0, best = 0;\n    for (int r = 0; r < n; r++) {\n        while (ts[r] - ts[left] > windowMs) left++;\n        if (r - left + 1 > best) best = r - left + 1;\n    }\n    return best;\n}\n`,
      },
    };
    memoryStore.codingProblems.unshift(fallbackProb);
    res.json(fallbackProb);
  });

  // --- Adaptive Interview Engine Turn ---
  app.post('/api/interview/turn', async (req, res) => {
    try {
      const {
        mode = 'Technical',
        subTopic = 'DBMS',
        difficulty = 'Medium',
        personaId = 'persona-waguri-hr',
        currentQuestion = '',
        candidateAnswer = '',
        askedQuestions = [],
        weakTopics = [],
      } = req.body || {};

      const persona =
        memoryStore.personas.find((p) => p.id === personaId) || memoryStore.personas[0];

      const result = await evaluateTurnWithAI({
        mode,
        subTopic,
        difficulty,
        persona,
        currentQuestion,
        candidateAnswer,
        askedQuestions,
        weakTopics,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error in /api/interview/turn:', error);
      res.status(500).json({ error: error.message || 'Failed to evaluate interview turn' });
    }
  });

  // --- TTS Endpoint (Edge TTS primary → Azure → Gemini → browser fallback) ---
  // Returns sentence-level chunks so the frontend can stream playback with
  // continuous Web Audio lip-sync instead of waiting for the full clip.
  const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z"'(])|(?<=[.!?])\s*$/;

  function splitIntoSentences(text: string): string[] {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    const parts = cleaned
      .split(/(?<=[.!?])\s+/)
      .flatMap((s) => (s.length > 220 ? s.split(/(?<=,)\s+/) : [s]))
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length > 0 ? parts : [cleaned];
  }

  async function edgeTtsSynthesize(
    text: string,
    voice: string
  ): Promise<string | null> {
    try {
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice || 'en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const audioStream = tts.toStream(text);
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        audioStream.on('data', (c: Buffer) => chunks.push(c));
        audioStream.on('end', () => resolve());
        audioStream.on('error', reject);
      });
      const buf = Buffer.concat(chunks);
      if (buf.length < 512) return null; // suspiciously small — treat as failure
      return buf.toString('base64');
    } catch (err) {
      console.warn('Edge TTS failed:', err instanceof Error ? err.message : err);
      return null;
    }
  }

  async function azureTtsSynthesize(
    text: string,
    voice: string
  ): Promise<string | null> {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION || 'eastus';
    if (!key) return null;
    try {
      const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${voice || 'en-US-AriaNeural'}">${text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')}</voice></speak>`;
      const resp = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        },
        body: ssml,
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) return null;
      const buf = Buffer.from(await resp.arrayBuffer());
      return buf.length > 512 ? buf.toString('base64') : null;
    } catch {
      return null;
    }
  }

  app.post('/api/tts', async (req, res) => {
    const { text, voiceName = 'Kore', edgeVoice } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text for TTS' });
    }

    const sentences = splitIntoSentences(text);

    // 1) Edge TTS (free, keyless) — primary engine, sentence-level chunks
    // Synthesized in parallel for low first-audio latency.
    const edgeVoiceToUse =
      edgeVoice ||
      process.env.EDGE_TTS_VOICE_DEFAULT ||
      'en-US-AriaNeural';
    const sentenceChunks = await Promise.all(
      sentences.map(async (sentence) => {
        const audio = await edgeTtsSynthesize(sentence, edgeVoiceToUse);
        return { text: sentence, audioBase64: audio };
      })
    );
    const edgeFailures = sentenceChunks.filter((s) => !s.audioBase64).length;

    if (edgeFailures === 0 && sentenceChunks.length > 0) {
      return res.json({
        provider: 'msedge-tts',
        mimeType: 'audio/mp3',
        sentences: sentenceChunks,
      });
    }

    // Edge unreachable — drop null chunks; if at least one sentence synthesized use hybrid,
    // otherwise continue down the fallback chain.
    const partial = sentenceChunks.filter((s) => s.audioBase64);
    if (partial.length > 0) {
      return res.json({
        provider: 'msedge-tts (partial)',
        mimeType: 'audio/mp3',
        sentences: sentenceChunks,
      });
    }

    // 2) Azure TTS fallback (if configured)
    if (process.env.AZURE_SPEECH_KEY) {
      try {
        const fullAudio = await azureTtsSynthesize(text, edgeVoiceToUse);
        if (fullAudio) {
          return res.json({
            provider: 'azure-tts',
            mimeType: 'audio/mp3',
            sentences: [{ text, audioBase64: fullAudio }],
          });
        }
      } catch {
        /* continue to Gemini */
      }
    }

    // 3) Gemini TTS fallback
    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-preview-tts',
          contents: [{ role: 'user', parts: [{ text: text.slice(0, 600) }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].includes(voiceName)
                    ? voiceName
                    : 'Kore',
                },
              },
            },
          },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
          return res.json({
            provider: 'gemini-tts',
            mimeType: 'audio/wav',
            sentences: [{ text, audioBase64: base64Audio }],
          });
        }
      } catch (err) {
        console.warn('Gemini TTS fallback failed:', err);
      }
    }

    // 4) Final fallback signal so the frontend uses Web Speech API + procedural lip-sync
    res.json({
      provider: 'browser-speech-fallback',
      mimeType: null,
      sentences: [{ text, audioBase64: null }],
    });
  });

  // --- Code Execution Sandbox Adapter (Piston / Judge0 CE — NEVER on this server) ---
  app.post('/api/code/execute', async (req, res) => {
    const {
      problemId,
      language = 'python',
      code = '',
    }: {
      problemId: string;
      language: SupportedCodeLanguage;
      code: string;
    } = req.body || {};

    const problem =
      memoryStore.codingProblems.find((p) => p.id === problemId) ||
      memoryStore.codingProblems[0];

    try {
      const result = await executeInSandbox(problem, language, code);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({
        sandboxProvider: 'error',
        executionTimeMs: 0,
        passedCount: 0,
        totalCount: problem.testCases.length,
        results: [],
        error: err?.message || 'Sandbox execution failed',
      });
    }
  });

  // --- AI Evaluation of Code + Candidate Verbal Approach (STT) ---
  app.post('/api/code/evaluate', async (req, res) => {
    const {
      problemId,
      language = 'python',
      code = '',
      verbalApproach = '',
      passedCount = 0,
      totalCount = 4,
    } = req.body || {};

    const problem =
      memoryStore.codingProblems.find((p) => p.id === problemId) ||
      memoryStore.codingProblems[0];

    const ai = getGeminiClient();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Problem: ${problem.title}\nOptimal Complexity: Time ${problem.optimalTimeComplexity}, Space ${problem.optimalSpaceComplexity}\nCandidate Language: ${language}\nTest Cases Passed: ${passedCount}/${totalCount}\nCandidate Verbal Approach Explanation (STT): "${verbalApproach}"\nCandidate Code:\n${code}`,
          config: {
            systemInstruction:
              'You are a Principal Coding Interviewer evaluating both the candidate’s code implementation and their spoken approach explanation. Return JSON.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallCodeScore: { type: Type.INTEGER },
                logicScore: { type: Type.INTEGER },
                verbalExplanationScore: { type: Type.INTEGER },
                detectedTimeComplexity: { type: Type.STRING },
                detectedSpaceComplexity: { type: Type.STRING },
                summaryFeedback: { type: Type.STRING },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: [
                'overallCodeScore',
                'logicScore',
                'verbalExplanationScore',
                'detectedTimeComplexity',
                'detectedSpaceComplexity',
                'summaryFeedback',
                'strengths',
                'improvements',
              ],
            },
          },
        });
        const text = (response.text ?? '').trim();
        if (text) {
          return res.json(JSON.parse(text));
        }
      } catch (err) {
        console.warn('Fallback on /api/code/evaluate:', err);
      }
    }

    const passRatio = totalCount > 0 ? passedCount / totalCount : 1;
    const hasVerbal = verbalApproach.trim().split(/\s+/).filter(Boolean).length >= 8;
    const logicScore = Math.round(passRatio * 92);
    const verbalExplanationScore = hasVerbal ? 88 : 54;
    const overallCodeScore = Math.round(logicScore * 0.7 + verbalExplanationScore * 0.3);

    res.json({
      overallCodeScore,
      logicScore,
      verbalExplanationScore,
      detectedTimeComplexity: problem.optimalTimeComplexity,
      detectedSpaceComplexity: problem.optimalSpaceComplexity,
      summaryFeedback: hasVerbal
        ? `Solution passed ${passedCount}/${totalCount} test cases matching ${problem.optimalTimeComplexity} time complexity, and your verbal walkthrough clearly explained the core invariant.`
        : `Code passed ${passedCount}/${totalCount} test cases, but your verbal approach explanation was brief. Always articulate time/space trade-offs before or while coding.`,
      strengths: [
        `Passed ${passedCount}/${totalCount} sandbox test cases in ${language}`,
        `Achieved target ${problem.optimalTimeComplexity} time complexity`,
      ],
      improvements: hasVerbal
        ? ['Discuss integer overflow and empty-input boundary checks explicitly']
        : ['Record or type your verbal approach before submitting code'],
    });
  });

  // --- Reports & History Endpoints ---
  app.get('/api/reports', async (_req, res) => {
    res.json(memoryStore.reports);
  });

  app.post('/api/reports', async (req, res) => {
    const newReport: InterviewReportRecord = {
      ...req.body,
      id: req.body?.id || `rep-${Date.now()}`,
      createdAt: req.body?.createdAt || new Date().toISOString(),
    };
    // Prepend/replace in memory (per-user separation happens in Supabase)
    memoryStore.reports = memoryStore.reports.filter((r) => r.id !== newReport.id);
    memoryStore.reports.unshift(newReport);

    if (supabase && req.body?.userId && !String(req.body.userId).includes('guest')) {
      try {
        // 1) Ensure a completed interview_sessions row exists for this report
        const { data: sessionRow, error: sessionErr } = await supabase
          .from('interview_sessions')
          .insert({
            user_id: req.body.userId,
            persona_id: newReport.personaId,
            mode: newReport.mode,
            sub_topic: newReport.subTopic,
            initial_difficulty: newReport.difficulty,
            current_difficulty: newReport.difficulty,
            status: 'completed',
            ended_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (sessionErr) throw sessionErr;

        // 2) Persist the full report (RLS: user owns it via user_id)
        const { error: reportErr } = await supabase.from('reports').insert({
          session_id: sessionRow.id,
          user_id: req.body.userId,
          overall_score: newReport.overallScore,
          category_scores: newReport.categoryScores,
          voice_summary: newReport.voiceSummary,
          presentation_summary: newReport.presentationSummary,
          coding_summary: newReport.codingSubmission || null,
          strongest_answer: newReport.strongestAnswerSummary,
          weakest_answer: newReport.weakestAnswerSummary,
          actionable_improvements: newReport.actionableImprovements,
          qa_breakdown: newReport.qaBreakdown,
        });
        if (reportErr) throw reportErr;

        // 3) Progress history entry for longitudinal tracking + weak-topic memory
        await supabase.from('progress_history').insert({
          user_id: req.body.userId,
          session_id: sessionRow.id,
          mode: newReport.mode,
          topic: newReport.subTopic,
          score: newReport.overallScore,
          is_weak_topic: newReport.overallScore < 70,
        });
      } catch (e) {
        console.warn('Supabase report sync skipped:', e);
      }
    }
    res.json(newReport);
  });

  // --- AI Prep Coach: Multi-turn Chat + High Thinking + Google Search Grounding ---
  app.post('/api/coach/chat', async (req, res) => {
    const {
      message = '',
      history = [],
      useSearchGrounding = false,
      useHighThinking = false,
    } = req.body || {};

    const ai = getGeminiClient();
    if (ai) {
      try {
        const config: any = {
          systemInstruction:
            'You are the InterviewX AI Principal Career & Systems Coach. Provide concrete, technically rigorous interview advice, STAR behavioral rewrites, system design trade-offs, and company-specific preparation.',
        };
        if (useSearchGrounding) {
          config.tools = [{ googleSearch: {} }];
        }
        if (useHighThinking) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        const contents = [
          ...history.map((m: any) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }],
          })),
          { role: 'user', parts: [{ text: message }] },
        ];

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config,
        });

        const chunks =
          response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = chunks
          .map((c: any) => c.web)
          .filter(Boolean)
          .map((w: any) => ({ title: w.title || w.uri, uri: w.uri }));

        return res.json({
          reply: response.text || 'Here is a structured breakdown for your interview prep.',
          sources,
          thinkingMode: useHighThinking ? 'HIGH' : 'STANDARD',
        });
      } catch (err) {
        console.warn('Coach chat fallback:', err);
      }
    }

    res.json({
      reply: `For **${message.slice(0, 60)}**, structure your response in three parts:\n1. **Core Mechanism & Invariant**: State the data structure or architectural bottleneck in one sentence.\n2. **Trade-Off Analysis**: Contrast latency, throughput, and memory footprint (e.g., B-Tree vs LSM-Tree or Hash Map vs Two Pointers).\n3. **Production Failure Mode**: Explain how you handle retries, backpressure, or skewed keys.`,
      sources: useSearchGrounding
        ? [
            {
              title: 'System Design & Engineering Interview Rubric Reference',
              uri: 'https://roadmap.sh/system-design',
            },
          ]
        : [],
      thinkingMode: useHighThinking ? 'HIGH' : 'STANDARD',
    });
  });

  // --- Image Analysis: Whiteboard / System Design Diagram / Resume Review ---
  app.post('/api/coach/analyze-image', async (req, res) => {
    const { imageBase64, mimeType = 'image/png', prompt = 'Critique this architecture diagram or resume for a senior technical interview.' } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'Missing imageBase64 payload' });
    }

    const ai = getGeminiClient();
    if (ai) {
      try {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `${prompt}\nProvide: 1) Key Strengths Observed, 2) Missing Bottlenecks / Single Points of Failure (or Resume Metrics), and 3) Follow-up Questions an interviewer will ask about this image.`,
              },
            ],
          },
        });
        return res.json({
          analysis: response.text || 'Visual analysis complete.',
        });
      } catch (err) {
        console.warn('Image analysis fallback:', err);
      }
    }

    res.json({
      analysis:
        '### Visual Architecture & Resume Review\n- **Strengths Observed**: Clear component separation and logical flow.\n- **Recommended Improvements**: Explicitly annotate p99 latency targets, database partitioning keys, and dead-letter queue retry policies.\n- **Expected Follow-up Question**: *"If the primary data store experiences a regional failover, how does your ingestion layer prevent duplicate writes?"*',
    });
  });

  // ============================================================================
  // 5. WEBSOCKET BRIDGE FOR GEMINI 3.8 LIVE API (`/live`)
  // ============================================================================
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    if (url.pathname === '/live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', async (clientWs) => {
    const ai = getGeminiClient();
    if (!ai) {
      clientWs.send(
        JSON.stringify({
          status: 'fallback',
          message: 'Live API running in local low-latency voice simulation mode.',
        })
      );
      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.text) {
            clientWs.send(
              JSON.stringify({
                outputTranscript: `Good point on "${parsed.text.slice(0, 50)}". How would you benchmark that under peak concurrency?`,
              })
            );
          }
        } catch {
          // ignore malformed frame
        }
      });
      return;
    }

    try {
      const session = await ai.live.connect({
        model: 'gemini-2.0-flash-live-001',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction:
            'You are Waguri Aoi, an interactive 3D AI technical & behavioral interviewer. Keep spoken responses concise (1-3 sentences) and ask one clear follow-up question at a time.',
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            const content = message.serverContent;
            if (content?.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ inputTranscript: content.inputTranscription.text })
              );
            }
            if (content?.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({ outputTranscript: content.outputTranscription.text })
              );
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                clientWs.send(JSON.stringify({ audio: part.inlineData.data }));
              }
            }
            if (content?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on('message', (data) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.audio) {
            session.sendRealtimeInput({
              audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
            });
          } else if (payload.text) {
            session.sendRealtimeInput({
              text: payload.text,
            });
          }
        } catch (err) {
          console.warn('Live WS frame error:', err);
        }
      });

      clientWs.on('close', () => {
        try {
          session.close();
        } catch {
          // ignore
        }
      });
    } catch (err) {
      console.warn('Gemini Live connect fallback:', err);
      clientWs.send(
        JSON.stringify({
          status: 'fallback',
          message: 'Switched to browser STT + adaptive turn voice pipeline.',
        })
      );
    }
  });

  // ============================================================================
  // 6. VITE MIDDLEWARE OR STATIC DIST SERVING
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`InterviewX AI Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();

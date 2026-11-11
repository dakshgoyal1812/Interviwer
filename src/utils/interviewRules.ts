export type InterviewMode = 'HR' | 'Technical' | 'DSA';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type InterviewerState = 'Idle' | 'Listening' | 'Thinking' | 'Speaking' | 'Evaluating';
export type MoodTag = 'neutral' | 'happy' | 'serious' | 'encouraging' | 'thinking';
export type GestureTag = 'nod' | 'head_tilt' | 'bow' | 'explain' | 'none';

export interface PerformanceWeights {
  answerQuality: number;      // Default 40
  communication: number;      // Default 25
  technicalCorrectness: number; // Default 20
  presentation: number;       // Default 15
}

export const DEFAULT_WEIGHTS: PerformanceWeights = {
  answerQuality: 40,
  communication: 25,
  technicalCorrectness: 20,
  presentation: 15,
};

export interface CategoryScores {
  answerQuality: number;
  communication: number;
  technicalCorrectness: number;
  presentation: number;
}

export interface VoiceAnalysisStats {
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  fillerCount: number;
  fillerWordsFound: Record<string, number>;
  longPausesCount: number;
  speakingConsistency: number; // 0-100
  communicationScore: number;  // 0-100
  feedbackTip: string;
}

export interface ObservablePresentationInput {
  faceVisible: boolean;
  gazeCenteredRatio: number;      // 0 to 1
  headStabilityRatio: number;     // 0 to 1
  shoulderAlignmentRatio: number; // 0 to 1
  postureStabilityRatio: number;  // 0 to 1
  excessiveMovement: boolean;
}

export interface ObservablePresentationResult {
  score: number; // 0-100
  faceStatus: 'Visible' | 'Not Detected';
  gazeStatus: 'Aligned with Frame' | 'Off-Center';
  headPositionStatus: 'Stable' | 'Frequent Shift';
  shoulderStatus: 'Level' | 'Tilted';
  postureStatus: 'Grounded' | 'Restless';
  gentleTips: string[];
  disclaimer: string;
}

export interface AdaptiveTurnOutput {
  spoken_reply: string;
  mood_tag: MoodTag;
  gesture_tag: GestureTag;
  score_for_answer: number;
  technical_score: number;
  difficulty_next: DifficultyLevel;
  topic: string;
  follow_up_question: string;
  strengths: string[];
  improvements: string[];
}

const FILLER_PATTERNS: readonly string[] = [
  'um',
  'uh',
  'like',
  'actually',
  'basically',
  'you know',
  'sort of',
  'kind of',
];

/**
 * Analyzes spoken or typed interview response transcript for WPM, filler words,
 * pause frequency, and speaking consistency. Makes zero claims about emotion or confidence.
 */
export function analyzeVoiceTranscript(
  transcript: string,
  durationSeconds: number,
  pauseTimestampsMs: number[] = []
): VoiceAnalysisStats {
  const clean = transcript.trim();
  if (!clean) {
    return {
      wordCount: 0,
      durationSeconds: Math.max(0, durationSeconds),
      wpm: 0,
      fillerCount: 0,
      fillerWordsFound: {},
      longPausesCount: 0,
      speakingConsistency: 0,
      communicationScore: 0,
      feedbackTip: 'Begin speaking or type your response to record delivery metrics.',
    };
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const effectiveDuration = Math.max(durationSeconds, Math.max(3, Math.round(wordCount / 2.3)));
  const wpm = Math.round((wordCount / effectiveDuration) * 60);

  const lowerText = ` ${clean.toLowerCase().replace(/[.,!?;:()"]/g, ' ')} `;
  const fillerWordsFound: Record<string, number> = {};
  let fillerCount = 0;

  for (const filler of FILLER_PATTERNS) {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches && matches.length > 0) {
      fillerWordsFound[filler] = matches.length;
      fillerCount += matches.length;
    }
  }

  // Long pauses are pauses > 2500ms
  const longPausesCount = pauseTimestampsMs.filter((ms) => ms >= 2500).length;

  // Optimal interview speaking pace is 115-160 WPM
  let paceScore = 90;
  if (wpm < 90) {
    paceScore = Math.max(45, 90 - (90 - wpm) * 0.8);
  } else if (wpm > 175) {
    paceScore = Math.max(50, 90 - (wpm - 175) * 0.7);
  } else if (wpm >= 115 && wpm <= 155) {
    paceScore = 96;
  }

  const fillerRatio = wordCount > 0 ? fillerCount / wordCount : 0;
  const fillerPenalty = Math.min(35, Math.round(fillerRatio * 240));
  const pausePenalty = Math.min(25, longPausesCount * 7);

  const speakingConsistency = Math.max(
    30,
    Math.min(100, Math.round(100 - pausePenalty - Math.abs(135 - Math.min(180, Math.max(90, wpm))) * 0.35))
  );

  const communicationScore = Math.max(
    25,
    Math.min(100, Math.round(paceScore - fillerPenalty - pausePenalty * 0.6))
  );

  let feedbackTip = 'Clear pacing and minimal filler usage observed.';
  if (fillerCount >= 4) {
    const topFiller = Object.entries(fillerWordsFound).sort((a, b) => b[1] - a[1])[0]?.[0] || 'um';
    feedbackTip = `Noticeable filler word usage ("${topFiller}"). Try replacing fillers with a brief 1-second silent breath.`;
  } else if (wpm > 170) {
    feedbackTip = 'Speaking rate is slightly rapid (>170 WPM). Slowing down on technical trade-offs improves clarity.';
  } else if (wpm < 95 && wordCount > 15) {
    feedbackTip = 'Speaking pace is below 95 WPM. Structuring points with STAR or First-Second-Third can keep momentum steady.';
  } else if (longPausesCount >= 2) {
    feedbackTip = `${longPausesCount} extended pauses (>2.5s) detected. Outlining your high-level approach first can reduce mid-sentence stalls.`;
  }

  return {
    wordCount,
    durationSeconds: effectiveDuration,
    wpm,
    fillerCount,
    fillerWordsFound,
    longPausesCount,
    speakingConsistency,
    communicationScore,
    feedbackTip,
  };
}

/**
 * Evaluates observable webcam presentation indicators from MediaPipe Face + Pose landmarks.
 * Explicitly avoids claiming emotion, honesty, or confidence detection.
 */
export function evaluatePresentationMetrics(
  input: ObservablePresentationInput
): ObservablePresentationResult {
  const disclaimer =
    'Observable presentation indicators only (framing, gaze direction, and posture alignment). Does not measure confidence, emotion, honesty, or personality.';

  if (!input.faceVisible) {
    return {
      score: 40,
      faceStatus: 'Not Detected',
      gazeStatus: 'Off-Center',
      headPositionStatus: 'Frequent Shift',
      shoulderStatus: 'Tilted',
      postureStatus: 'Restless',
      gentleTips: [
        'Center yourself within the camera frame and ensure front lighting is adequate.',
      ],
      disclaimer,
    };
  }

  const gazeScore = Math.round(Math.max(0, Math.min(1, input.gazeCenteredRatio)) * 100);
  const headScore = Math.round(Math.max(0, Math.min(1, input.headStabilityRatio)) * 100);
  const shoulderScore = Math.round(Math.max(0, Math.min(1, input.shoulderAlignmentRatio)) * 100);
  const postureScore = Math.round(Math.max(0, Math.min(1, input.postureStabilityRatio)) * 100);
  const movementPenalty = input.excessiveMovement ? 12 : 0;

  const rawScore =
    gazeScore * 0.35 +
    headScore * 0.25 +
    shoulderScore * 0.2 +
    postureScore * 0.2 -
    movementPenalty;

  const score = Math.max(35, Math.min(100, Math.round(rawScore)));

  const gentleTips: string[] = [];
  if (input.gazeCenteredRatio < 0.72) {
    gentleTips.push('Keep your primary monitor or notes window near the webcam lens to maintain natural eye-line alignment.');
  }
  if (input.shoulderAlignmentRatio < 0.75) {
    gentleTips.push('Square your shoulders evenly toward the desk to maintain balanced framing.');
  }
  if (input.excessiveMovement || input.postureStabilityRatio < 0.7) {
    gentleTips.push('Noticeable torso movement detected; planting both feet helps keep upper-body framing steady.');
  }
  if (gentleTips.length === 0) {
    gentleTips.push('Framing, eye-line alignment, and upper-body posture are steady and well-centered.');
  }

  return {
    score,
    faceStatus: 'Visible',
    gazeStatus: input.gazeCenteredRatio >= 0.72 ? 'Aligned with Frame' : 'Off-Center',
    headPositionStatus: input.headStabilityRatio >= 0.72 ? 'Stable' : 'Frequent Shift',
    shoulderStatus: input.shoulderAlignmentRatio >= 0.75 ? 'Level' : 'Tilted',
    postureStatus: !input.excessiveMovement && input.postureStabilityRatio >= 0.7 ? 'Grounded' : 'Restless',
    gentleTips,
    disclaimer,
  };
}

/**
 * Calculates the "Estimated Interview Performance Score" (0-100) using configurable weights
 * (default: Answer Quality 40%, Communication 25%, Technical/Coding Correctness 20%, Presentation 15%).
 */
export function calculatePerformanceScore(
  scores: CategoryScores,
  weights: PerformanceWeights = DEFAULT_WEIGHTS
): {
  totalScore: number;
  normalizedWeights: PerformanceWeights;
  weightedContributions: CategoryScores;
} {
  const sumWeights =
    weights.answerQuality +
    weights.communication +
    weights.technicalCorrectness +
    weights.presentation;

  const safeSum = sumWeights > 0 ? sumWeights : 100;
  const normalizedWeights: PerformanceWeights = {
    answerQuality: (weights.answerQuality / safeSum) * 100,
    communication: (weights.communication / safeSum) * 100,
    technicalCorrectness: (weights.technicalCorrectness / safeSum) * 100,
    presentation: (weights.presentation / safeSum) * 100,
  };

  const clampScore = (val: number) => Math.max(0, Math.min(100, val));
  const aq = clampScore(scores.answerQuality);
  const comm = clampScore(scores.communication);
  const tech = clampScore(scores.technicalCorrectness);
  const pres = clampScore(scores.presentation);

  const weightedContributions: CategoryScores = {
    answerQuality: Number(((aq * normalizedWeights.answerQuality) / 100).toFixed(1)),
    communication: Number(((comm * normalizedWeights.communication) / 100).toFixed(1)),
    technicalCorrectness: Number(((tech * normalizedWeights.technicalCorrectness) / 100).toFixed(1)),
    presentation: Number(((pres * normalizedWeights.presentation) / 100).toFixed(1)),
  };

  const totalScore = Math.round(
    weightedContributions.answerQuality +
      weightedContributions.communication +
      weightedContributions.technicalCorrectness +
      weightedContributions.presentation
  );

  return {
    totalScore: Math.max(0, Math.min(100, totalScore)),
    normalizedWeights,
    weightedContributions,
  };
}

/**
 * Dynamically adjusts interview difficulty based on the candidate's answer score.
 */
export function computeNextDifficulty(
  currentDifficulty: DifficultyLevel,
  answerScore: number
): DifficultyLevel {
  if (answerScore >= 78) {
    if (currentDifficulty === 'Easy') return 'Medium';
    if (currentDifficulty === 'Medium') return 'Hard';
    return 'Hard';
  }
  if (answerScore < 52) {
    if (currentDifficulty === 'Hard') return 'Medium';
    if (currentDifficulty === 'Medium') return 'Easy';
    return 'Easy';
  }
  return currentDifficulty;
}

/**
 * Maps interviewer states and LLM tags to procedural VRM animation parameters.
 */
export function getAvatarAnimationParams(
  state: InterviewerState,
  mood: MoodTag,
  gesture: GestureTag
): {
  nodFrequency: number;
  nodAmplitude: number;
  eyeBlinkIntervalSeconds: number;
  smileWeight: number;
  browFurrowWeight: number;
  headTiltRadians: number;
  breathingRate: number;
} {
  let nodFrequency = 0.4;
  let nodAmplitude = 0.02;
  let eyeBlinkIntervalSeconds = 3.8;
  let smileWeight = 0.15;
  let browFurrowWeight = 0;
  let headTiltRadians = 0;
  let breathingRate = 1.1;

  if (state === 'Listening') {
    nodFrequency = 1.6;
    nodAmplitude = 0.065;
    eyeBlinkIntervalSeconds = 3.2;
  } else if (state === 'Thinking' || state === 'Evaluating') {
    nodFrequency = 0.3;
    nodAmplitude = 0.015;
    headTiltRadians = 0.08;
    browFurrowWeight = 0.35;
    eyeBlinkIntervalSeconds = 2.4;
  } else if (state === 'Speaking') {
    nodFrequency = 1.2;
    nodAmplitude = 0.04;
    breathingRate = 1.45;
  }

  if (mood === 'happy' || mood === 'encouraging') {
    smileWeight = 0.65;
    browFurrowWeight = 0;
  } else if (mood === 'serious') {
    smileWeight = 0.02;
    browFurrowWeight = 0.4;
  } else if (mood === 'thinking') {
    smileWeight = 0.05;
    browFurrowWeight = 0.3;
    headTiltRadians = 0.09;
  }

  if (gesture === 'nod') {
    nodAmplitude = Math.max(nodAmplitude, 0.085);
    nodFrequency = Math.max(nodFrequency, 2.0);
  } else if (gesture === 'head_tilt') {
    headTiltRadians = 0.14;
  } else if (gesture === 'bow') {
    nodAmplitude = 0.16;
  }

  return {
    nodFrequency,
    nodAmplitude,
    eyeBlinkIntervalSeconds,
    smileWeight,
    browFurrowWeight,
    headTiltRadians,
    breathingRate,
  };
}

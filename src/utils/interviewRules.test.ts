import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeVoiceTranscript,
  evaluatePresentationMetrics,
  calculatePerformanceScore,
  computeNextDifficulty,
  getAvatarAnimationParams,
  DEFAULT_WEIGHTS,
} from './interviewRules';

test('analyzeVoiceTranscript counts WPM, filler words, and long pauses accurately', () => {
  const sample =
    'Um I would design the hash table using separate chaining and uh basically resize the bucket array when the load factor exceeds 0.75 like in standard Java HashMap implementations.';
  const stats = analyzeVoiceTranscript(sample, 15, [1200, 2800, 3100]);

  assert.equal(stats.wordCount, 29);
  assert.equal(stats.wpm, 116);
  assert.equal(stats.fillerCount, 4); // um, uh, basically, like
  assert.equal(stats.longPausesCount, 2);
  assert.ok(stats.communicationScore > 50 && stats.communicationScore <= 100);
});

test('evaluatePresentationMetrics labels observable indicators and handles missing face', () => {
  const missing = evaluatePresentationMetrics({
    faceVisible: false,
    gazeCenteredRatio: 0,
    headStabilityRatio: 0,
    shoulderAlignmentRatio: 0,
    postureStabilityRatio: 0,
    excessiveMovement: false,
  });
  assert.equal(missing.faceStatus, 'Not Detected');
  assert.equal(missing.score, 40);
  assert.ok(missing.disclaimer.includes('Observable presentation indicators'));

  const aligned = evaluatePresentationMetrics({
    faceVisible: true,
    gazeCenteredRatio: 0.9,
    headStabilityRatio: 0.88,
    shoulderAlignmentRatio: 0.92,
    postureStabilityRatio: 0.9,
    excessiveMovement: false,
  });
  assert.equal(aligned.faceStatus, 'Visible');
  assert.equal(aligned.gazeStatus, 'Aligned with Frame');
  assert.ok(aligned.score >= 85);
});

test('calculatePerformanceScore applies 40/25/20/15 weights accurately', () => {
  const res = calculatePerformanceScore(
    {
      answerQuality: 85,      // 85 * 0.40 = 34.0
      communication: 80,      // 80 * 0.25 = 20.0
      technicalCorrectness: 90, // 90 * 0.20 = 18.0
      presentation: 80,       // 80 * 0.15 = 12.0
    },
    DEFAULT_WEIGHTS
  );
  assert.equal(res.totalScore, 84);
  assert.equal(res.weightedContributions.answerQuality, 34);
  assert.equal(res.weightedContributions.communication, 20);
  assert.equal(res.weightedContributions.technicalCorrectness, 18);
  assert.equal(res.weightedContributions.presentation, 12);
});

test('computeNextDifficulty adapts difficulty up and down smoothly', () => {
  assert.equal(computeNextDifficulty('Easy', 82), 'Medium');
  assert.equal(computeNextDifficulty('Medium', 85), 'Hard');
  assert.equal(computeNextDifficulty('Hard', 90), 'Hard');
  assert.equal(computeNextDifficulty('Hard', 45), 'Medium');
  assert.equal(computeNextDifficulty('Medium', 40), 'Easy');
  assert.equal(computeNextDifficulty('Medium', 68), 'Medium');
});

test('getAvatarAnimationParams maps Listening and Speaking states to VRM parameters', () => {
  const listening = getAvatarAnimationParams('Listening', 'encouraging', 'nod');
  assert.ok(listening.nodFrequency >= 1.6);
  assert.ok(listening.smileWeight > 0.5);

  const thinking = getAvatarAnimationParams('Thinking', 'thinking', 'head_tilt');
  assert.ok(thinking.headTiltRadians > 0.1);
});

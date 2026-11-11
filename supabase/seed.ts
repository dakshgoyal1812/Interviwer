// ============================================================================
// INTERVIEWX AI — ONE-TIME SUPABASE SEED SCRIPT
// Seeds interviewer_personas and question_bank (incl. DSA coding problems)
// from src/data/seedData.ts. Safe to re-run (upserts by primary key).
//
// Usage:
//   npm run seed          (uses .env SUPABASE_URL + service/secret key)
// ============================================================================
import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';
import {
  INTERVIEWER_PERSONAS,
  SEED_QUESTION_BANK,
  SEED_CODING_PROBLEMS,
} from '../src/data/seedData.ts';

async function main() {
  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || url.includes('your-project-id')) {
    console.error(
      '✗ Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in .env, then run the schema in supabase/schema.sql first.'
    );
    process.exit(1);
  }

  const supabase = createClient(url, key);

  // 1. Personas
  const personaRows = INTERVIEWER_PERSONAS.map((p) => ({
    id: p.id,
    name: p.name,
    role_title: p.roleTitle,
    personality_type: p.personalityType,
    voice_name: p.voiceName,
    edge_tts_voice: p.edgeTtsVoice,
    avatar_accent_color: p.avatarAccentColor,
    default_mood: p.defaultMood,
    system_prompt: p.systemPrompt,
    description: p.description,
  }));

  const { error: personaErr } = await supabase
    .from('interviewer_personas')
    .upsert(personaRows, { onConflict: 'id' });
  if (personaErr) {
    console.error('✗ Persona seed failed:', personaErr.message);
  } else {
    console.log(`✓ Seeded ${personaRows.length} interviewer personas`);
  }

  // 2. Question bank (text questions + coding problems in one table)
  const questionRows = [
    ...SEED_QUESTION_BANK.map((q) => ({
      id: q.id,
      mode: q.mode,
      topic: q.topic,
      difficulty: q.difficulty,
      title: q.questionText.slice(0, 80),
      question_text: q.questionText,
      ideal_key_points: q.idealKeyPoints,
      examples: q.followUpHints ?? [],
    })),
    ...SEED_CODING_PROBLEMS.map((p) => ({
      id: p.id,
      mode: 'DSA' as const,
      topic: p.topic,
      difficulty: p.difficulty,
      title: p.title,
      question_text: p.description,
      ideal_key_points: [p.referenceSolutionSummary],
      examples: p.examples,
      test_cases: p.testCases,
      starter_code: p.starterCode,
      description: p.description,
      constraints: p.constraints,
      arg_types: p.argTypes ?? null,
      optimal_time_complexity: p.optimalTimeComplexity,
      optimal_space_complexity: p.optimalSpaceComplexity,
      reference_solution_summary: p.referenceSolutionSummary,
    })),
  ];

  const { error: qErr } = await supabase
    .from('question_bank')
    .upsert(questionRows, { onConflict: 'id' });
  if (qErr) {
    console.error('✗ Question bank seed failed:', qErr.message);
  } else {
    console.log(
      `✓ Seeded ${SEED_QUESTION_BANK.length} questions + ${SEED_CODING_PROBLEMS.length} coding problems`
    );
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed script crashed:', err);
  process.exit(1);
});

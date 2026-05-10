// ════════════════════════════════════════════════════════════════
//  MindOrb — story.service.js
//  Production-ready AI story & reflection generator
//  Last updated: 2025
// ════════════════════════════════════════════════════════════════

'use strict';

const Anthropic = require('@anthropic-ai/sdk');

// ── Client — reads ANTHROPIC_API_KEY from env automatically ──────
const anthropic = new Anthropic();

// ── Model ────────────────────────────────────────────────────────
// Swap to 'claude-haiku-4-5-20251001' for lower latency / cost.
const MODEL = 'claude-sonnet-4-6';

// ── Per-task temperatures ────────────────────────────────────────
// 0.9 story      : creative and varied; true max (1.0) can produce
//                  incoherence on short outputs — 0.9 avoids that.
// 0.4 reflection : a doctor's reading of the same data should be
//                  stable and consistent, not randomly different.
// 0.7 affirmation: personal and warm, not robotic or unpredictable.
const TEMPERATURE = {
  story:       0.9,
  reflection:  0.4,
  affirmation: 0.7,
};

// ── Per-task API timeouts (ms) ───────────────────────────────────
// Story is short — should be fast. Reflection is longer and lower
// temperature (more deterministic), so slightly more time.
// Affirmation is tiny — 8 seconds is generous.
const TIMEOUT_MS = {
  story:       12_000,
  reflection:  20_000,
  affirmation:  8_000,
};

// ── Minimum sessions for a meaningful weekly reflection ──────────
// Below this the model invents patterns that don't exist.
const MIN_REFLECTION_SESSIONS = 3;

// ── Stopwords — filtered before sending to the model ─────────────
const STOPWORDS = new Set([
  'the','and','but','for','are','was','had','his','her','its',
  'not','can','did','has','have','been','this','that','they',
  'with','from','will','would','could','should','which','when',
  'then','than','also','just','very','more','most','some','any',
  'all','one','two','out','get','got','let','put','use','used',
]);

// ── Output validation — per task ─────────────────────────────────
// Story has strict no-preamble rules — validate hard.
// Reflection and affirmation have different opening conventions
// ("Here's what stood out..." is valid for a doctor's tone)
// so only check for AI refusal signals, not content patterns.
const STORY_BAD_STARTS = [
  'once upon a time',
  'title:',
  'story:',
  'note:',
  'here is',
  "here's",
  'sure!',
  'certainly!',
  'of course!',
  'in the heart of',
];

const GENERIC_BAD_STARTS = [
  // AI refusal / meta-commentary patterns only
  'i cannot',
  'i am unable',
  'i apologize',
  "i'm sorry, but",
  'as an ai',
];

// ── In-memory rotation state (resets on server restart, fine) ────
let _lastArchetypeIndex = -1;
let _lastSeedIndex      = -1;


// ════════════════════════════════════════════════════════════════
//  CORE MODEL CALLER
//
//  system      — persona + fixed rules (stable across calls)
//  messages    — dynamic data only (changes per call)
//  badStarts   — task-specific validation list
//  timeoutMs   — per-task hard cutoff
//  _retryCount — internal; do not pass externally
//
//  Retry policy: one silent retry on bad output before throwing.
//  One bad generation shouldn't surface as a user-facing error.
// ════════════════════════════════════════════════════════════════
const callModel = async ({
  system,
  messages,
  max_tokens,
  temperature,
  taskLabel    = 'generation',
  badStarts    = GENERIC_BAD_STARTS,
  timeoutMs    = 15_000,
  _retryCount  = 0,
}) => {
  // ── Timeout via AbortController ────────────────────────────────
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens,
        temperature,
        system,
        messages,
      },
      { signal: controller.signal },
    );

    clearTimeout(timer);

    const text = response.content
      ?.find(block => block.type === 'text')
      ?.text
      ?.trim();

    if (!text) {
      const reason = response.stop_reason ?? 'unknown';
      throw new Error(`Empty response from model (stop_reason: ${reason})`);
    }

    // ── Output validation ──────────────────────────────────────
    const lower = text.toLowerCase();
    const isBad = badStarts.some(p => lower.startsWith(p));

    if (isBad) {
      if (_retryCount < 1) {
        // One silent retry — log it but don't surface to the caller.
        console.warn(`[MindOrb] ⚠️ ${taskLabel}: bad output on attempt ${_retryCount + 1}, retrying…`);
        return callModel({
          system, messages, max_tokens, temperature,
          taskLabel, badStarts, timeoutMs,
          _retryCount: _retryCount + 1,
        });
      }
      throw new Error(`Output failed validation after ${_retryCount + 1} attempt(s): "${text.slice(0, 60)}..."`);
    }

    console.log(`[MindOrb] ✅ ${taskLabel} succeeded (attempt ${_retryCount + 1})`);
    return text;

  } catch (err) {
    clearTimeout(timer);

    // ── Timeout ────────────────────────────────────────────────
    if (err.name === 'AbortError') {
      const msg = `${taskLabel} timed out after ${timeoutMs}ms`;
      console.error(`[MindOrb] ⏱ ${msg}`);
      throw new Error(`[MindOrb] ${msg}`);
    }

    // ── Anthropic API error (rate limit, auth, server error) ───
    const detail = err?.status
      ? `HTTP ${err.status} — ${err.message}`
      : err.message;

    console.error(`[MindOrb] ❌ ${taskLabel} failed: ${detail}`);
    throw new Error(`[MindOrb] "${taskLabel}" failed: ${detail}`);
  }
};


// ════════════════════════════════════════════════════════════════
//  STORY ELEMENTS
// ════════════════════════════════════════════════════════════════

const ARCHETYPES = [
  {
    name: 'the journey',
    instruction: 'A traveller walks through an unknown land and discovers something unexpected about themselves.',
  },
  {
    name: 'the encounter',
    instruction: 'A lone figure meets a mysterious stranger — an old keeper, a silent animal, or a voice from the dark — who offers something wordless but meaningful.',
  },
  {
    name: 'the transformation',
    instruction: 'Something ordinary — a stone, a flame, a leaf — slowly changes into something wondrous, and the watcher changes with it.',
  },
  {
    name: 'the return',
    instruction: 'Someone comes back to a place they once knew, and finds it — and themselves — subtly different.',
  },
  {
    name: 'the discovery',
    instruction: 'Hidden inside a familiar, quiet place, something long forgotten is found — and its meaning blooms slowly.',
  },
  {
    name: 'the waiting',
    instruction: 'A figure sits very still, watching the world breathe. Time passes. Something shifts, gently, at the edges.',
  },
];

const PROTAGONISTS = [
  'a quiet wanderer',
  'an old keeper of forgotten things',
  'a child who could not sleep',
  'a traveller with no map',
  'a woman who spoke only to rivers',
  'a man who collected the last light of each day',
  'a young girl who followed shadows',
  'an elder who had seen too many winters',
];

const SEEDS = [
  'a lantern whose flame never flickered',
  'a river stone that felt warm in the cold',
  'a door that opened to a field of fog',
  'a bird that sang one note, slowly',
  'a jar filled with old moonlight',
  'a path that turned to soft moss underfoot',
  'a candle that burned without melting',
  'a bell that rang without being struck',
  'a letter folded inside a sleeping flower',
  'a pair of old boots left at the edge of a forest',
  'a mirror that showed only the past',
  'a small fire that gave off no smoke',
];


// ════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════

const pickAvoidRepeat = (arr, lastIndex) => {
  if (arr.length === 1) return { item: arr[0], index: 0 };
  let idx;
  do { idx = Math.floor(Math.random() * arr.length); }
  while (idx === lastIndex);
  return { item: arr[idx], index: idx };
};

const pickArchetype = () => {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % ARCHETYPES.length;
  const idx = dayIndex === _lastArchetypeIndex
    ? (dayIndex + 1) % ARCHETYPES.length
    : dayIndex;
  _lastArchetypeIndex = idx;
  return ARCHETYPES[idx];
};

const pickProtagonist = () =>
  PROTAGONISTS[Math.floor(Math.random() * PROTAGONISTS.length)];

const pickSeed = () => {
  const { item, index } = pickAvoidRepeat(SEEDS, _lastSeedIndex);
  _lastSeedIndex = index;
  return item;
};

const getTopEmotions = (emotionBreakdown, n = 3) => {
  if (!emotionBreakdown || typeof emotionBreakdown !== 'object') return [];
  return Object.entries(emotionBreakdown)
    .filter(([, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([emotion]) => emotion);
};

// Guards against undefined / NaN — falls back to neutral midpoint.
const getToneGuide = (score) => {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 50;
  if (s > 70) return 'warm, hopeful, luminous — like a story told beside a fire';
  if (s > 40) return 'gentle and bittersweet — like dusk, neither day nor night';
  return 'deep and melancholic — like a song heard from another room';
};

// Plain mood weight for non-story contexts (affirmation, reflection).
// Returns human-readable string, never a raw number.
const getMoodWeight = (score) => {
  const s = typeof score === 'number' && Number.isFinite(score) ? score : 50;
  if (s > 70) return 'generally positive';
  if (s > 40) return 'mixed or neutral';
  return 'low or difficult';
};

const cleanWordList = (words) => {
  const seen = new Set();
  return words
    .map(w => (typeof w === 'string' ? w : w?.word ?? '').toLowerCase().trim())
    .filter(w => {
      if (w.length <= 2)    return false;
      if (STOPWORDS.has(w)) return false;
      if (seen.has(w))      return false;
      seen.add(w);
      return true;
    });
};


// ════════════════════════════════════════════════════════════════
//  SYSTEM PROMPTS
//  Persona and fixed craft rules only — stable across every call.
//  Dynamic session data goes in the user message, never here.
// ════════════════════════════════════════════════════════════════

const SYSTEM_STORY = `\
You are an elder storyteller — the kind who sat by firelight and told stories that children carried into their dreams.

Your stories are:
- Under 90 words. Tight. Every word carries weight.
- Written in third person only. Never "you" or "your".
- Alive with small sensory details — what things feel, sound, smell like.
- Emotionally honest — they do not flatten complex feelings into simple ones.
- Ending on a single small image that lingers: visual, quiet, final.

You never explain the story. You never name its meaning. You trust the reader.

Banned phrases — never use these: "once upon a time", "in the heart of", "bathed in", "whispered to the wind", "journey of", "magic of", "shimmered", "twinkled", "tapestry".

You begin mid-scene, with the first word of the story. No title. No label. No preamble. No "The End".`;

const SYSTEM_REFLECTION = `\
You are a mindfulness and mental wellbeing doctor — calm, warm, and direct.

A patient has completed a week of daily mindfulness sessions. You have reviewed their results. Now you sit with them and explain what you saw — in plain human language, without jargon, without numbers.

Your job is to translate, not report. You have read the data so they don't have to.

How you speak:
- Warm but honest. You do not soften hard things or reframe negatives as silver linings.
- Direct sentences. Nothing that needs re-reading to understand.
- You address the patient as "you" — this is a conversation, not a summary about them.
- No story language, no metaphors, no poetic phrasing. This is a consultation.

What you never do:
- Quote raw numbers back to them. You translate numbers into meaning.
- Open with pleasantries ("Great job this week!") or close with a sign-off.
- Walk through each day individually. You synthesise across the whole week.
- Use these words: "data", "metrics", "analysis", "cognitive load index", "positivity score", "tapestry", "journey", "growth mindset", "wellness", "holistic".`;

const SYSTEM_AFFIRMATION = `\
You write the closing sentence of a mindfulness session for an app called MindOrb.

This sentence is the last thing a person reads before they leave. It should land like a quiet exhale — not a push, not a cheer, not a slogan.

What a good closing sentence sounds like:
- "Carrying this much takes something out of you — it's okay to set it down for now."
- "Uncertainty is exhausting, even when nothing is wrong."
- "Something shifted today, even if you can't name it yet."

What a bad one sounds like:
- "You are stronger than you know!" — too loud, too generic
- "Remember to breathe." — patronising
- "Today is a new beginning." — motivational poster, means nothing

Rules:
- Under 20 words.
- Does not start with "You are", "Remember", or "Today".
- Does not dismiss or rush past difficult feelings.
- Honest — if the mood is low, the sentence acknowledges that without spiralling.
- Sounds like a quiet, wise close — not encouragement, not advice.
- Write only the sentence. Nothing else.`;


// ════════════════════════════════════════════════════════════════
//  STORY GENERATION
// ════════════════════════════════════════════════════════════════

/**
 * generateStory
 *
 * @param {Array}        words            — Array of word objects ({ word: string }) from the session
 * @param {string}       moodLabel        — Human-readable mood label (e.g. "calm", "anxious")
 * @param {number}       positivityScore  — 0–100 positivity score
 * @param {string|null}  dominantEmotion  — Top emotion label, or null
 * @param {object|null}  emotionBreakdown — { emotion: score, ... } map, or null
 * @returns {Promise<string>} Generated story text
 */
exports.generateStory = async (
  words,
  moodLabel,
  positivityScore,
  dominantEmotion  = null,
  emotionBreakdown = null,
) => {
  const cleanWords = cleanWordList(words);
  if (cleanWords.length === 0) {
    throw new Error('[MindOrb] generateStory: no usable words after filtering');
  }

  // ── Emotional texture — natural language only, no raw numbers ──
  const topEmotions = getTopEmotions(emotionBreakdown);
  const safeMood    = (typeof moodLabel === 'string' && moodLabel.trim()) ? moodLabel.trim() : 'present';
  const emotionLine = topEmotions.length > 0
    ? `Emotional texture: ${topEmotions.join(', ')}${dominantEmotion ? ` — with ${dominantEmotion} sitting heaviest` : ''}.`
    : `Overall mood: ${safeMood}.`;

  const archetype   = pickArchetype();
  const protagonist = pickProtagonist();
  const seed        = pickSeed();
  const toneGuide   = getToneGuide(positivityScore);

  // ── Word instruction scales with list length ───────────────────
  // ≤ 6 words: use all — achievable without stuffing.
  // > 6 words: choose the most resonant — quality over completeness.
  const wordList        = cleanWords.join(', ');
  const wordInstruction = cleanWords.length <= 6
    ? `Session words — weave all of them into the world naturally (not as a list): ${wordList}`
    : `Session words — choose the most resonant ones and weave them in naturally. Not every word needs to appear; the ones that do should feel inevitable: ${wordList}`;

  const userMessage = `\
━━━ SESSION FEELING ━━━
${emotionLine}
Tone: ${toneGuide}

━━━ STORY SHAPE ━━━
Archetype: "${archetype.name}" — ${archetype.instruction}

━━━ ELEMENTS ━━━
Protagonist: ${protagonist}
Story seed (weave in naturally — do not name or announce it): ${seed}
${wordInstruction}

Write the story now. Begin with the first word.`;

  return callModel({
    system:      SYSTEM_STORY,
    messages:    [{ role: 'user', content: userMessage }],
    max_tokens:  256,
    temperature: TEMPERATURE.story,
    taskLabel:   'story generation',
    badStarts:   STORY_BAD_STARTS,
    timeoutMs:   TIMEOUT_MS.story,
  });
};


// ════════════════════════════════════════════════════════════════
//  WEEKLY REFLECTION
// ════════════════════════════════════════════════════════════════

/**
 * generateWeeklyReflection
 *
 * @param {Array} sessions — Array of session objects:
 *   { moodLabel, positivityScore, dominantEmotion, emotionBreakdown,
 *     cognitiveLoadIndex, themes }
 * @returns {Promise<string>} Generated reflection text
 */
exports.generateWeeklyReflection = async (sessions) => {
  if (!sessions || sessions.length === 0) {
    throw new Error('[MindOrb] generateWeeklyReflection: no sessions provided');
  }
  if (sessions.length < MIN_REFLECTION_SESSIONS) {
    throw new Error(
      `[MindOrb] generateWeeklyReflection: at least ${MIN_REFLECTION_SESSIONS} sessions required (got ${sessions.length})`
    );
  }

  // ── Per-session data ───────────────────────────────────────────
  const sessionData = sessions.map((s, i) => {
    const topEmotions = getTopEmotions(s.emotionBreakdown, 3);
    const cli         = s.cognitiveLoadIndex?.index ?? null;
    const cliLabel    = s.cognitiveLoadIndex?.label ?? null;
    const themes      = (s.themes || []).join(', ') || 'none';
    const loadText    = cli !== null ? `, mental load: ${cli}/100 (${cliLabel})` : '';
    return `Session ${i + 1}: mood=${s.dominantEmotion || s.moodLabel}, wellbeing=${s.positivityScore}/100${loadText}, emotions=[${topEmotions.join(', ')}], themes=[${themes}]`;
  }).join('\n');

  // ── Derived stats — for the model to interpret, not to surface ─
  const scores   = sessions.map(s => s.positivityScore).filter(Number.isFinite);
  const avg      = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const highest  = Math.max(...scores);
  const lowest   = Math.min(...scores);

  // Renamed inner var to `val` to avoid shadowing the outer `scores` array.
  const diffs    = scores.slice(1).map((val, i) => Math.abs(val - scores[i]));
  const avgSwing = diffs.length
    ? Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    : 0;

  const delta     = scores[scores.length - 1] - scores[0];
  const trendWord = delta > 10
    ? 'improving toward the end of the week'
    : delta < -10
      ? 'declining toward the end of the week'
      : 'staying roughly level throughout';

  const stability = avgSwing > 20
    ? 'quite unstable — large swings between sessions'
    : avgSwing > 10
      ? 'somewhat variable'
      : 'relatively stable';

  const userMessage = `\
━━━ SESSION RESULTS ━━━
${sessionData}

━━━ WEEK AT A GLANCE (interpret these — do not quote them back) ━━━
Sessions completed: ${sessions.length}
Average wellbeing: ${avg}/100
Range: ${lowest} (hardest) → ${highest} (best)
Direction: ${trendWord}
Stability: ${stability} (average shift of ${avgSwing} points between sessions)

━━━ WHAT TO WRITE ━━━
Three short paragraphs. No headers. No bullet points.

Paragraph 1: The honest big picture — what kind of week was this overall?
Paragraph 2: The one thing most worth naming — specific, explained, not vague.
Paragraph 3: One concrete takeaway for next week — grounded in what you actually saw.

Write the consultation now.`;

  return callModel({
    system:      SYSTEM_REFLECTION,
    messages:    [{ role: 'user', content: userMessage }],
    max_tokens:  768,
    temperature: TEMPERATURE.reflection,
    taskLabel:   'weekly reflection',
    badStarts:   GENERIC_BAD_STARTS,
    timeoutMs:   TIMEOUT_MS.reflection,
  });
};


// ════════════════════════════════════════════════════════════════
//  DAILY AFFIRMATION
//  The last thing the user reads. Should feel like the session
//  closing quietly, not a new thought arriving from outside.
// ════════════════════════════════════════════════════════════════

/**
 * generateAffirmation
 *
 * @param {string}      moodLabel       — e.g. "calm", "anxious"
 * @param {number}      positivityScore — 0–100
 * @param {string|null} storyText       — story from this session (pass this — it matters)
 * @returns {Promise<string>} A single closing sentence
 */
exports.generateAffirmation = async (moodLabel, positivityScore, storyText = null) => {
  const moodWeight = getMoodWeight(positivityScore);

  // Story context keeps the affirmation tonally connected to what
  // the user just experienced — not a random thought dropped in.
  const storyContext = storyText
    ? `The story that just ended this session:\n"${storyText}"\n\nThe closing sentence should feel like it belongs to the same quiet moment — not a new thought from outside.`
    : 'No story this session.';

  const userMessage = `\
Mood: ${moodLabel}
Overall feeling: ${moodWeight}

${storyContext}

Write the closing sentence.`;

  return callModel({
    system:      SYSTEM_AFFIRMATION,
    messages:    [{ role: 'user', content: userMessage }],
    max_tokens:  64,
    temperature: TEMPERATURE.affirmation,
    taskLabel:   'affirmation',
    badStarts:   GENERIC_BAD_STARTS,
    timeoutMs:   TIMEOUT_MS.affirmation,
  });
};
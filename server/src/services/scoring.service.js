// Converts raw word data into all derived scores used across the app

exports.calculateMoodLabel = (positivityScore, avgReactionTime) => {
  if (positivityScore >= 80 && avgReactionTime < 2000) return 'Focused';
  if (positivityScore >= 80) return 'Joyful';
  if (positivityScore >= 60 && avgReactionTime < 2000) return 'Calm';
  if (positivityScore >= 60) return 'Content';
  if (positivityScore >= 40 && avgReactionTime > 3000) return 'Overwhelmed';
  if (positivityScore >= 40) return 'Neutral';
  if (positivityScore < 40 && avgReactionTime > 3000) return 'Drained';
  return 'Stressed';
};

exports.extractThemes = (words) => {
  const themeMap = {
    work:    ['work','job','office','deadline','meeting','project','task','boss','email','client'],
    family:  ['family','mom','dad','sister','brother','home','parents','love','together','kids'],
    growth:  ['growth','learn','improve','better','progress','goal','future','dream','achieve','success'],
    health:  ['health','sleep','tired','energy','exercise','rest','food','water','body','mind'],
    social:  ['friends','people','talk','laugh','connect','party','alone','lonely','miss','care'],
    nature:  ['sun','rain','sky','peace','quiet','calm','fresh','air','green','light'],
  };
  const found = new Set();
  const wordList = words.map(w => w.word.toLowerCase());
  for (const [theme, keywords] of Object.entries(themeMap)) {
    if (keywords.some(k => wordList.includes(k))) found.add(theme);
  }
  return [...found];
};

// ─── Plutchik Emotion Wheel ───────────────────────────────────────
// Maps words to one of 8 primary emotions + intensity
// This runs CLIENT SIDE in useSentiment.js too — keep logic in sync

const EMOTION_LEXICON = {
  // Joy
  joy:          ['happy','joy','love','wonderful','amazing','beautiful','excited','grateful',
                 'blessed','peaceful','content','delight','pleasure','smile','laugh','fun',
                 'celebrate','win','success','hope','warm','sunshine','free','alive','proud'],
  // Trust
  trust:        ['trust','believe','faith','safe','secure','reliable','honest','loyal',
                 'confident','sure','steady','stable','support','together','family','friend',
                 'bond','care','respect','integrity','truth'],
  // Fear
  fear:         ['fear','scared','afraid','anxious','worry','nervous','panic','dread',
                 'terror','horror','phobia','uncertain','insecure','vulnerable','risk',
                 'danger','threat','dark','alone','lost'],
  // Surprise
  surprise:     ['surprise','unexpected','shock','sudden','wow','amazing','unbelievable',
                 'discover','reveal','change','new','different','strange','weird','curious',
                 'wonder','astonish'],
  // Sadness
  sadness:      ['sad','unhappy','depressed','grief','loss','cry','tears','lonely','empty',
                 'hopeless','despair','pain','hurt','miss','regret','sorry','broken','tired',
                 'exhausted','down','low','heavy','mourn'],
  // Disgust
  disgust:      ['disgust','hate','awful','terrible','horrible','nasty','gross','repulsed',
                 'sick','wrong','bad','toxic','bitter','corrupt','fake','lies','betrayal',
                 'disappoint','failure','shame'],
  // Anger
  anger:        ['angry','mad','furious','rage','frustrat','annoy','irritat','resent',
                 'hate','blame','unfair','injustice','betray','stress','pressure','overwhelm',
                 'scream','fight','conflict','tension'],
  // Anticipation
  anticipation: ['excited','eager','expect','anticipate','hope','ready','prepare','plan',
                 'future','goal','dream','look forward','upcoming','soon','waiting','impatient',
                 'curious','explore','adventure','growth','learn'],
};

// Intensity modifiers — these amplify or dampen the base score
const INTENSIFIERS  = ['very','extremely','so','really','deeply','truly','absolutely','utterly'];
const DIMINISHERS   = ['slightly','a bit','somewhat','kind of','sort of','barely','hardly'];

exports.classifyEmotion = (word, context = []) => {
  const w = word.toLowerCase().trim();

  // Check context for intensifiers/diminishers
  const hasIntensifier = context.some(c => INTENSIFIERS.includes(c.toLowerCase()));
  const hasDiminisher  = context.some(c => DIMINISHERS.includes(c.toLowerCase()));

  let bestEmotion   = 'neutral';
  let bestScore     = 0;

  for (const [emotion, keywords] of Object.entries(EMOTION_LEXICON)) {
    // Exact match gets full score, partial match (stem) gets 0.7
    const exactMatch   = keywords.includes(w);
    const partialMatch = !exactMatch && keywords.some(k => w.includes(k) || k.includes(w));

    if (exactMatch || partialMatch) {
      let score = exactMatch ? 1.0 : 0.7;
      if (hasIntensifier) score = Math.min(1, score * 1.3);
      if (hasDiminisher)  score = score * 0.6;
      if (score > bestScore) {
        bestScore   = score;
        bestEmotion = emotion;
      }
    }
  }

  return {
    emotion:          bestEmotion,
    emotionIntensity: parseFloat(bestScore.toFixed(2)),
  };
};

// Dominant emotion across a session
exports.getDominantEmotion = (words) => {
  const counts = {};
  words.forEach(w => {
    counts[w.emotion] = (counts[w.emotion] || 0) + (w.emotionIntensity || 1);
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
};

// Emotion breakdown counts
exports.getEmotionBreakdown = (words) => {
  const breakdown = {
    joy:0, trust:0, fear:0, surprise:0,
    sadness:0, disgust:0, anger:0, anticipation:0, neutral:0
  };
  words.forEach(w => { if (breakdown[w.emotion] !== undefined) breakdown[w.emotion]++; });
  return breakdown;
};


// ─── Cognitive Load Index ─────────────────────────────────────────
// Based on Sweller (1988) Cognitive Load Theory
// CLi = f(reaction time variance, sentiment complexity, emotional volatility)
//
// Three components:
//   1. Intrinsic load  — complexity of the words chosen (sentiment variance)
//   2. Extraneous load — inconsistency in response times (RT variance)
//   3. Germane load    — emotional switching (how often emotion changes)
//
// Final CLi is 0–100. Higher = more cognitive strain during session.

exports.calculateCognitiveLoadIndex = (words) => {
  if (!words || words.length < 2) return null;

  // ── Component 1: Extraneous load (reaction time variance) ────────
  const times = words.map(w => w.reactionTime);
  const rtMean = times.reduce((a, b) => a + b, 0) / times.length;
  const rtVariance = times.reduce((a, b) => a + Math.pow(b - rtMean, 2), 0) / times.length;
  const rtStdDev = Math.sqrt(rtVariance);

  // Normalize: stdDev of 0ms = 0 load, 2000ms = max load
  const extraneousLoad = Math.min(100, (rtStdDev / 2000) * 100);

  // ── Component 2: Intrinsic load (sentiment complexity) ───────────
  const scores = words.map(w => w.sentimentScore);
  const sentimentMean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const sentimentVariance = scores.reduce((a, b) => a + Math.pow(b - sentimentMean, 2), 0) / scores.length;

  // High variance = complex mixed emotions = higher intrinsic load
  // sentimentScore is -1 to 1, so max variance is ~1.0
  const intrinsicLoad = Math.min(100, sentimentVariance * 100);

  // ── Component 3: Germane load (emotional switching cost) ─────────
  let switches = 0;
  for (let i = 1; i < words.length; i++) {
    if (words[i].emotion !== words[i - 1].emotion) switches++;
  }
  // 0 switches = 0, 9 switches (every word different) = 100
  const germaneLoad = (switches / (words.length - 1)) * 100;

  // ── Weighted composite ────────────────────────────────────────────
  // Weights based on cognitive load literature:
  // Extraneous load is most disruptive, intrinsic is content-driven,
  // germane load reflects active schema formation (can be positive)
  const CLI = (
    extraneousLoad * 0.45 +
    intrinsicLoad  * 0.35 +
    germaneLoad    * 0.20
  );

  return {
    index:          Math.round(CLI),       // 0–100 final score
    label:          getCLILabel(CLI),      // human readable
    components: {
      extraneousLoad: Math.round(extraneousLoad),  // RT inconsistency
      intrinsicLoad:  Math.round(intrinsicLoad),   // sentiment complexity
      germaneLoad:    Math.round(germaneLoad),      // emotion switching
    },
    insight: getCLIInsight(CLI, rtStdDev, switches),
  };
};

function getCLILabel(cli) {
  if (cli < 20) return 'Effortless';
  if (cli < 40) return 'Light';
  if (cli < 60) return 'Moderate';
  if (cli < 75) return 'High';
  return 'Overloaded';
}

function getCLIInsight(cli, rtStdDev, switches) {
  if (cli < 20)
    return 'Your mind was clear and flowing. Words came without effort.';
  if (cli < 40)
    return 'Comfortable cognitive state. You were present but not strained.';
  if (cli < 60)
    return 'Moderate mental effort. You were processing multiple things at once.';
  if (cli < 75) {
    if (rtStdDev > 1500)
      return 'High load driven by inconsistent response times — something was pulling your attention.';
    if (switches > 6)
      return 'High emotional switching suggests an unsettled mental state.';
    return 'Your mind was working hard this session.';
  }
  return 'Very high cognitive load. You may have been overwhelmed or distracted during this session.';
}


// ─── Update existing exports ──────────────────────────────────────
// Add this to calculateRadarScores — replace the existing export:

exports.calculateRadarScores = (session) => {
  const { words, positivityScore, avgReactionTime } = session;

  const unique   = new Set(words.map(w => w.word)).size;
  const variety  = Math.round((unique / words.length) * 100);
  const speed    = Math.min(100, Math.round((2000 / avgReactionTime) * 70));

  const calmWords = words.filter(w => w.sentiment !== 'negative' && w.reactionTime < 2000);
  const calm      = Math.round((calmWords.length / words.length) * 100);

  const times   = words.map(w => w.reactionTime);
  const mean    = times.reduce((a, b) => a + b, 0) / times.length;
  const variance= times.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / times.length;
  const focus   = Math.max(0, Math.round(100 - Math.sqrt(variance) / 30));

  const energetic = words.filter(w => Math.abs(w.sentimentScore) > 0.6);
  const energy    = Math.round((energetic.length / words.length) * 100);

  // Add cognitive load as inverse (low load = high clarity on radar)
  const cli     = session.cognitiveLoadIndex?.index ?? 50;
  const clarity = Math.max(0, 100 - cli);

  return { positivity: positivityScore, speed, variety, calm, focus, energy, clarity };
};


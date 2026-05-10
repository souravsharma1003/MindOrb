const Session = require('../models/Session.model');
const { generateWeeklyReflection } = require('./ai.service');
const { calculateRadarScores } = require('./scoring.service');

// ─── Overview ─────────────────────────────────────────────────────
exports.buildOverview = async (userId) => {
  const sessions = await Session.find({ userId }).sort({ createdAt: -1 });
  if (!sessions.length) return { empty: true };

  return {
    totalSessions:      sessions.length,
    timeline:           buildTimeline(sessions),
    sentimentBreakdown: buildSentimentBreakdown(sessions),
    wordCloud:          buildWordCloud(sessions),
    heatmap:            buildHeatmap(sessions),
    weeklyComparison:   buildWeeklyComparison(sessions),
    patterns:           buildPatterns(sessions),
    latestSession:      sessions[0],
  };
};

// ─── Weekly reflection ────────────────────────────────────────────
exports.buildWeeklyReflection = async (userId) => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await Session.find({ userId, createdAt: { $gte: since } });

  if (sessions.length < 2)
    return { reflection: 'Complete at least 2 sessions this week to unlock your weekly reflection.' };

  const reflection = await generateWeeklyReflection(sessions);
  return { reflection };
};

// ─── Streak data ──────────────────────────────────────────────────
exports.buildStreakData = async (user) => {
  const sessions = await Session.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('createdAt positivityScore moodLabel');

  return {
    currentStreak:   user.streak,
    lastSessionDate: user.lastSessionDate,
    totalSessions:   user.totalSessions,
    recentSessions:  sessions,
  };
};

// ─── Compare two sessions ─────────────────────────────────────────
exports.buildComparison = async (userId, idA, idB) => {
  const [sessionA, sessionB] = await Promise.all([
    Session.findOne({ _id: idA, userId }),
    Session.findOne({ _id: idB, userId }),
  ]);

  if (!sessionA || !sessionB) return null;

  return {
    sessionA: { ...sessionA.toObject(), radar: calculateRadarScores(sessionA) },
    sessionB: { ...sessionB.toObject(), radar: calculateRadarScores(sessionB) },
    delta:    buildDelta(sessionA, sessionB),
  };
};

// ─── Word-level deep analysis for a single session ────────────────
exports.buildSessionAnalysis = async (userId, sessionId) => {
  const session = await Session.findOne({ _id: sessionId, userId });
  if (!session) return null;

  return {
    session,
    radar:        calculateRadarScores(session),
    wordTimeline: buildWordTimeline(session.words),
    arcAnalysis:  buildArcAnalysis(session.words),
  };
};

// ══════════════════════════════════════════════════════════════════
// Private helpers
// ══════════════════════════════════════════════════════════════════

// Mood timeline — last 30 sessions in chronological order
function buildTimeline(sessions) {
  return sessions
    .slice(0, 30)
    .map(s => ({
      date:             s.createdAt,
      positivityScore:  s.positivityScore,
      moodLabel:        s.moodLabel,
      dominantSentiment:s.dominantSentiment,
      avgReactionTime:  s.avgReactionTime,
    }))
    .reverse();
}

// Positive / neutral / negative breakdown as percentages
function buildSentimentBreakdown(sessions) {
  let pos = 0, neg = 0, neu = 0, total = 0;
  sessions.forEach(s =>
    s.words.forEach(w => {
      if      (w.sentiment === 'positive') pos++;
      else if (w.sentiment === 'negative') neg++;
      else                                 neu++;
      total++;
    })
  );
  return {
    positive: Math.round((pos / total) * 100),
    neutral:  Math.round((neu / total) * 100),
    negative: Math.round((neg / total) * 100),
  };
}

// Top 20 words by frequency, each tagged with its dominant sentiment
function buildWordCloud(sessions) {
  const freq = {};
  sessions.forEach(s =>
    s.words.forEach(w => {
      if (!freq[w.word]) freq[w.word] = { count: 0, sentiment: w.sentiment, scores: [] };
      freq[w.word].count++;
      freq[w.word].scores.push(w.sentimentScore);
    })
  );

  return Object.entries(freq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([word, data]) => ({
      word,
      count:     data.count,
      sentiment: data.sentiment,
      avgScore:  parseFloat(
        (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(2)
      ),
    }));
}

// 28-day calendar heatmap — null means no session that day
function buildHeatmap(sessions) {
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    d.setHours(0, 0, 0, 0);

    const match = sessions.find(s => {
      const sd = new Date(s.createdAt);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === d.getTime();
    });

    return {
      date:  new Date(d),
      score: match ? match.positivityScore : null,
      mood:  match ? match.moodLabel : null,
    };
  });
}

// This week vs last week averages + delta
function buildWeeklyComparison(sessions) {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;

  const thisWeek = sessions.filter(s => (now - new Date(s.createdAt)) / DAY <= 7);
  const lastWeek = sessions.filter(s => {
    const d = (now - new Date(s.createdAt)) / DAY;
    return d > 7 && d <= 14;
  });

  const avg = (arr) =>
    arr.length ? Math.round(arr.reduce((s, x) => s + x.positivityScore, 0) / arr.length) : null;

  const thisAvg = avg(thisWeek);
  const lastAvg = avg(lastWeek);

  return {
    thisWeek:       { sessions: thisWeek.length, avgPositivity: thisAvg },
    lastWeek:       { sessions: lastWeek.length, avgPositivity: lastAvg },
    delta:          thisAvg !== null && lastAvg !== null ? thisAvg - lastAvg : null,
    avgReactionTime: thisWeek.length
      ? Math.round(thisWeek.reduce((s, x) => s + x.avgReactionTime, 0) / thisWeek.length)
      : null,
  };
}

// Rule-based pattern detection across all sessions
function buildPatterns(sessions) {
  const patterns = [];
  if (sessions.length < 3) return patterns;

  // 1. Morning vs evening positivity
  const morning = sessions.filter(s => new Date(s.createdAt).getHours() < 12);
  const evening = sessions.filter(s => new Date(s.createdAt).getHours() >= 17);
  if (morning.length >= 2 && evening.length >= 2) {
    const mAvg = morning.reduce((s, x) => s + x.positivityScore, 0) / morning.length;
    const eAvg = evening.reduce((s, x) => s + x.positivityScore, 0) / evening.length;
    const diff = Math.round(Math.abs(mAvg - eAvg));
    if (diff > 10) {
      patterns.push({
        type: 'time',
        icon: 'clock',
        positive: mAvg > eAvg,
        text: `${mAvg > eAvg ? 'Morning' : 'Evening'} sessions are ${diff}% more positive for you.`,
        suggestion: mAvg > eAvg
          ? 'Try to do your session before noon when possible.'
          : 'Your mind opens up later in the day — evening sessions suit you.',
      });
    }
  }

  // 2. Reaction time trend (getting faster or slower?)
  if (sessions.length >= 6) {
    const recent  = sessions.slice(0, 3).reduce((s, x) => s + x.avgReactionTime, 0) / 3;
    const earlier = sessions.slice(-3).reduce((s, x) => s + x.avgReactionTime, 0) / 3;
    const delta   = Math.round(((earlier - recent) / earlier) * 100);
    if (Math.abs(delta) > 10) {
      patterns.push({
        type: 'speed',
        icon: 'zap',
        positive: delta > 0,
        text: delta > 0
          ? `Your response time is ${delta}% faster than when you started.`
          : `Your response time has slowed by ${Math.abs(delta)}%.`,
        suggestion: delta > 0
          ? 'Your mind is sharpening. Keep the streak alive.'
          : 'You may be overthinking — trust your first instinct.',
      });
    }
  }

  // 3. Recurring negative words (appear 3+ times in last 10 sessions)
  const negFreq = {};
  sessions.slice(0, 10).forEach(s =>
    s.words
      .filter(w => w.sentiment === 'negative')
      .forEach(w => { negFreq[w.word] = (negFreq[w.word] || 0) + 1; })
  );
  const topNeg = Object.entries(negFreq).sort((a, b) => b[1] - a[1])[0];
  if (topNeg && topNeg[1] >= 3) {
    patterns.push({
      type: 'word',
      icon: 'repeat',
      positive: false,
      text: `"${topNeg[0]}" has surfaced ${topNeg[1]} times in your recent sessions.`,
      suggestion: 'Recurring negative words often point to something worth reflecting on.',
    });
  }

  // 4. Positivity trend — last 7 vs previous 7 sessions
  if (sessions.length >= 7) {
    const last7 = sessions.slice(0, 7);
    const prev7 = sessions.slice(7, 14);
    if (prev7.length >= 3) {
      const l = last7.reduce((s, x) => s + x.positivityScore, 0) / last7.length;
      const p = prev7.reduce((s, x) => s + x.positivityScore, 0) / prev7.length;
      const trend = Math.round(l - p);
      if (Math.abs(trend) >= 5) {
        patterns.push({
          type: 'trend',
          icon: 'trending',
          positive: trend > 0,
          text: trend > 0
            ? `Positivity up ${trend} points across your last 7 sessions.`
            : `Positivity down ${Math.abs(trend)} points recently.`,
          suggestion: trend > 0
            ? 'Something good is happening — notice what\'s different.'
            : 'Small dips are normal. One session at a time.',
        });
      }
    }
  }

  // 5. Day-of-week pattern — best and worst days
  const byDay = Array.from({ length: 7 }, () => []);
  sessions.forEach(s => byDay[new Date(s.createdAt).getDay()].push(s.positivityScore));
  const dayAvgs = byDay.map(scores =>
    scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  );
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const validDays = dayAvgs.map((avg, i) => ({ day: days[i], avg })).filter(d => d.avg !== null);
  if (validDays.length >= 3) {
    const best  = validDays.reduce((a, b) => a.avg > b.avg ? a : b);
    const worst = validDays.reduce((a, b) => a.avg < b.avg ? a : b);
    if (best.avg - worst.avg > 10) {
      patterns.push({
        type: 'day',
        icon: 'calendar',
        positive: true,
        text: `${best.day}s are your best days (avg ${Math.round(best.avg)}%). ${worst.day}s tend to be harder (${Math.round(worst.avg)}%).`,
        suggestion: `Use ${worst.day} sessions as a reset, not a measure of progress.`,
      });
    }
  }

  return patterns;
}

// Per-word sentiment timeline within a single session
// Shows the emotional arc: did the user start negative and end positive?
function buildWordTimeline(words) {
  return words.map(w => ({
    index:         w.wordIndex,
    word:          w.word,
    sentimentScore:w.sentimentScore,
    sentiment:     w.sentiment,
    reactionTime:  w.reactionTime,
  }));
}

// Arc analysis — did mood improve, decline, or stay flat across the 10 words?
function buildArcAnalysis(words) {
  const firstHalf  = words.slice(0, 5);
  const secondHalf = words.slice(5);

  const avg = (arr) => arr.reduce((s, w) => s + w.sentimentScore, 0) / arr.length;

  const firstAvg  = avg(firstHalf);
  const secondAvg = avg(secondHalf);
  const delta     = secondAvg - firstAvg;

  let arc = 'flat';
  if (delta >  0.15) arc = 'rising';
  if (delta < -0.15) arc = 'falling';

  // Peak and valley words
  const peak   = [...words].sort((a, b) => b.sentimentScore - a.sentimentScore)[0];
  const valley = [...words].sort((a, b) => a.sentimentScore - b.sentimentScore)[0];

  return {
    arc,          // 'rising' | 'falling' | 'flat'
    delta:        parseFloat(delta.toFixed(2)),
    firstHalfAvg: parseFloat(firstAvg.toFixed(2)),
    secondHalfAvg:parseFloat(secondAvg.toFixed(2)),
    peakWord:     peak.word,
    valleyWord:   valley.word,
    insight:      arc === 'rising'
      ? 'You started cautious and opened up — a sign of growing comfort.'
      : arc === 'falling'
      ? 'Energy dipped toward the end. You may have been processing something difficult.'
      : 'Your mood stayed consistent throughout the session.',
  };
}

// Delta object for session comparison
function buildDelta(sessionA, sessionB) {
  return {
    positivityScore:  sessionB.positivityScore - sessionA.positivityScore,
    avgReactionTime:  sessionB.avgReactionTime  - sessionA.avgReactionTime,
    wordVariety:
      new Set(sessionB.words.map(w => w.word)).size -
      new Set(sessionA.words.map(w => w.word)).size,
  };
}

// ─── Emotion wheel data for dashboard ────────────────────────────
exports.buildEmotionProfile = async (userId) => {
  const sessions = await Session.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30);

  if (!sessions.length) return null;

  // Aggregate emotion breakdown across all recent sessions
  const totals = {
    joy:0, trust:0, fear:0, surprise:0,
    sadness:0, disgust:0, anger:0, anticipation:0, neutral:0
  };

  sessions.forEach(s => {
    if (s.emotionBreakdown) {
      Object.keys(totals).forEach(e => {
        totals[e] += s.emotionBreakdown[e] || 0;
      });
    }
  });

  const totalWords = Object.values(totals).reduce((a, b) => a + b, 0);

  // Convert to percentages
  const percentages = {};
  Object.entries(totals).forEach(([emotion, count]) => {
    percentages[emotion] = totalWords > 0 ? Math.round((count / totalWords) * 100) : 0;
  });

  // Dominant and rarest emotions
  const sorted = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const rarest   = sorted.filter(([,v]) => v > 0).at(-1)?.[0];

  // Emotion trend — is joy increasing or decreasing over last 10 sessions?
  const joyTrend = sessions.slice(0, 5).reduce((s, x) => s + (x.emotionBreakdown?.joy || 0), 0)
                 - sessions.slice(5, 10).reduce((s, x) => s + (x.emotionBreakdown?.joy || 0), 0);

  return {
    percentages,
    dominant,
    rarest,
    joyTrend: joyTrend > 0 ? 'rising' : joyTrend < 0 ? 'falling' : 'stable',
    insight:  buildEmotionInsight(dominant, percentages),
  };
};

function buildEmotionInsight(dominant, pct) {
  const insights = {
    joy:          `Joy is your most expressed emotion (${pct.joy}%). Your words carry warmth and lightness.`,
    trust:        `Trust dominates your vocabulary (${pct.trust}%). You feel secure and connected.`,
    fear:         `Fear appears frequently (${pct.fear}%). Something is creating uncertainty right now.`,
    surprise:     `Surprise is your most common emotion (${pct.surprise}%). Your world feels unpredictable — in interesting ways.`,
    sadness:      `Sadness shows up most in your words (${pct.sadness}%). Your mind may be processing something heavy.`,
    disgust:      `Disgust or dissatisfaction is prominent (${pct.disgust}%). Something in your environment feels misaligned.`,
    anger:        `Anger surfaces most in your language (${pct.anger}%). There may be unresolved frustration worth examining.`,
    anticipation: `Anticipation drives your word choices (${pct.anticipation}%). You are future-oriented and goal-driven.`,
    neutral:      `Your word choices are mostly neutral. You may be in observation mode rather than feeling mode.`,
  };
  return insights[dominant] || '';
}

// ─── Cognitive load trend ─────────────────────────────────────────
exports.buildCognitiveLoadTrend = async (userId) => {
  const sessions = await Session.find({ userId, 'cognitiveLoadIndex.index': { $exists: true } })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('cognitiveLoadIndex createdAt moodLabel');

  if (!sessions.length) return null;

  const trend = sessions.map(s => ({
    date:       s.createdAt,
    index:      s.cognitiveLoadIndex?.index,
    label:      s.cognitiveLoadIndex?.label,
    components: s.cognitiveLoadIndex?.components,
    mood:       s.moodLabel,
  })).reverse();

  // Average CLI across all sessions
  const avgCLI = Math.round(
    trend.reduce((s, x) => s + (x.index || 0), 0) / trend.length
  );

  // Correlation: high CLI sessions — what mood were they?
  const highLoadSessions = trend.filter(s => s.index > 60);
  const highLoadMoods    = [...new Set(highLoadSessions.map(s => s.mood))];

  return {
    trend,
    avgCLI,
    avgLabel:       getCLILabelPublic(avgCLI),
    highLoadMoods,
    insight: avgCLI < 40
      ? 'Your average cognitive load is low — you approach these sessions with a clear mind.'
      : avgCLI < 65
      ? 'Moderate average cognitive load. Some sessions are more mentally taxing than others.'
      : 'High average cognitive load. Consider doing sessions earlier in the day when mental resources are fresh.',
  };
};

function getCLILabelPublic(cli) {
  if (cli < 20) return 'Effortless';
  if (cli < 40) return 'Light';
  if (cli < 60) return 'Moderate';
  if (cli < 75) return 'High';
  return 'Overloaded';
}
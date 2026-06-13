const Session = require('../models/Session.model');
const User = require('../models/User.model');
const { generateStory } = require('../services/ai.service');
const {
  calculateMoodLabel,
  extractThemes,
  calculateRadarScores,
  calculateCognitiveLoadIndex,
  getDominantEmotion,
  getEmotionBreakdown,
} = require('../services/scoring.service');

// POST /api/sessions
// Body: { words: [{ word, sentiment, sentimentScore, reactionTime, wordIndex, orbState }], roundType }
exports.createSession = async (req, res) => {
  try {
    const { words, roundType = 'free' } = req.body;

    if (!words || words.length !== 10)
      return res.status(400).json({ message: 'Exactly 10 words required' });

    // ── Compute all derived fields ────────────────────────────────
    const avgRT = Math.round(
      words.reduce((s, w) => s + w.reactionTime, 0) / 10
    );

    const avgSentiment   = words.reduce((s, w) => s + w.sentimentScore, 0) / 10;
    const positivityScore = Math.round(((avgSentiment + 1) / 2) * 100);

    const counts = { positive: 0, negative: 0, neutral: 0 };
    words.forEach(w => counts[w.sentiment]++);
    const dominantSentiment = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    );

    const moodLabel         = calculateMoodLabel(positivityScore, avgRT);
    const themes            = extractThemes(words);
    const dominantEmotion   = getDominantEmotion(words);
    const emotionBreakdown  = getEmotionBreakdown(words);
    const cognitiveLoadData = calculateCognitiveLoadIndex(words);

    // ── Generate story ────────────────────────────────────────────
    // FIX: dominantEmotion and emotionBreakdown were computed above
    // but never forwarded to generateStory — causing the emotion
    // pipeline in story.service.js to always fall back to the plain
    // mood/score line. All five arguments are now passed correctly.
    let story = '';
    try {
      story = await generateStory(
        words,
        moodLabel,
        positivityScore,
        dominantEmotion,    // ← was missing
        emotionBreakdown,   // ← was missing
      );
    } catch (e) {
      console.error('[MindOrb] Story generation failed:', e.message);
      story = 'Your mind spoke today. The words you chose carry meaning only you can fully understand.';
    }

    // ── Persist session ───────────────────────────────────────────
    const session = new Session({
      userId: req.user._id,
      words,
      roundType,
      story,
      positivityScore,
      avgReactionTime: avgRT,
      dominantSentiment,
      dominantEmotion,
      moodLabel,
      themes,
      emotionBreakdown,
      cognitiveLoadIndex: cognitiveLoadData,
    });

    await session.save();

    // ── Update user streak ────────────────────────────────────────
    const user = await User.findById(req.user._id);
    user.recordSession();
    if (!user.baselineScore) user.baselineScore = positivityScore;
    await user.save();

    // ── Respond with just the session ────────────────────────────
    // StoryScreen reads session.story, session.words, etc. directly —
    // so the { session } wrapper is correct. Make sure the frontend
    // reads response.data.session (not response.data) on the other end.
    res.status(201).json({ session });

  } catch (err) {
    console.error('[MindOrb] createSession error:', err);
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sessions — all sessions for current user (paginated)
exports.getSessions = async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
      Session.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-words'), // exclude word details in list view
      Session.countDocuments({ userId: req.user._id }),
    ]);

    res.json({ sessions, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sessions/:id — single session with all words
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findOne({
      _id: req.params.id,
      userId: req.user._id, // ensure ownership
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const radar = calculateRadarScores(session);
    res.json({ session, radar });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/sessions/compare?a=id1&b=id2
exports.compareSessions = async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b)
      return res.status(400).json({ message: 'Provide two session ids: ?a=id1&b=id2' });

    const [sessionA, sessionB] = await Promise.all([
      Session.findOne({ _id: a, userId: req.user._id }),
      Session.findOne({ _id: b, userId: req.user._id }),
    ]);

    if (!sessionA || !sessionB)
      return res.status(404).json({ message: 'One or both sessions not found' });

    res.json({
      sessionA: { ...sessionA.toObject(), radar: calculateRadarScores(sessionA) },
      sessionB: { ...sessionB.toObject(), radar: calculateRadarScores(sessionB) },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/sessions/:id
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
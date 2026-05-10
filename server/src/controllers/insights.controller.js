const insightsService = require('../services/insights.service');

// GET /api/insights/overview
exports.getOverview = async (req, res) => {
  try {
    const data = await insightsService.buildOverview(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/insights/weekly-reflection
exports.getWeeklyReflection = async (req, res) => {
  try {
    const data = await insightsService.buildWeeklyReflection(req.user._id);
    console.log(data)
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/insights/streaks
exports.getStreakData = async (req, res) => {
  try {
    const data = await insightsService.buildStreakData(req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/insights/session/:id — deep analysis of a single session
exports.getSessionAnalysis = async (req, res) => {
  try {
    const data = await insightsService.buildSessionAnalysis(req.user._id, req.params.id);
    if (!data) return res.status(404).json({ message: 'Session not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getEmotionProfile = async (req, res) => {
  try {
    const data = await insightsService.buildEmotionProfile(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCognitiveLoadTrend = async (req, res) => {
  try {
    const data = await insightsService.buildCognitiveLoadTrend(req.user._id);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
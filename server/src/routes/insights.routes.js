const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  getOverview,
  getWeeklyReflection,
  getStreakData,
  getSessionAnalysis, 
  getEmotionProfile,
  getCognitiveLoadTrend       
} = require('../controllers/insights.controller');

router.use(protect);

router.get('/overview',           getOverview);
router.get('/weekly-reflection',  getWeeklyReflection);
router.get('/streaks',            getStreakData);
router.get('/session/:id',        getSessionAnalysis); 
router.get('/emotions',        getEmotionProfile);
router.get('/cognitive-load',  getCognitiveLoadTrend);  

module.exports = router;
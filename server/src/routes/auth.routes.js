const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');

// ── Local ─────────────────────────────────────────────────────
router.post('/signup',   controller.signup);
router.post('/login',    controller.login);
router.get('/me',        protect, controller.getMe);

// ── OAuth ─────────────────────────────────────────────────────
router.post('/google',   controller.googleAuth);
router.post('/facebook', controller.facebookAuth);

module.exports = router;
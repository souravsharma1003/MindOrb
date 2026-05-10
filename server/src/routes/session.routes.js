const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const {
  createSession,
  getSessions,
  getSession,
  compareSessions,
  deleteSession,
} = require('../controllers/session.controller');

router.use(protect); // all session routes require auth

router.post('/',           createSession);
router.get('/',            getSessions);
router.get('/compare',     compareSessions);  // before /:id so it's not swallowed
router.get('/:id',         getSession);
router.delete('/:id',      deleteSession);

module.exports = router;
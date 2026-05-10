const express    = require('express')
const router     = express.Router()
const { protect } = require('../middleware/auth.middleware')
const {
  createRoom,
  joinRoom,
  getRoom,
  submitSession,
  getResult,
} = require('../controllers/duo.controller')

router.use(protect)

router.post('/',             createRoom)
router.post('/join',         joinRoom)
router.get('/:code',         getRoom)
router.post('/:code/submit', submitSession)
router.get('/:code/result',  getResult)

module.exports = router
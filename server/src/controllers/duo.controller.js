const DuoRoom  = require('../models/DuoRoom.model')
const Session  = require('../models/Session.model')
const User     = require('../models/User.model')
const { calculateRadarScores } = require('../services/scoring.service')
const { generateStory }        = require('../services/ai.service')
const {
  calculateMoodLabel,
  extractThemes,
  getDominantEmotion,
  getEmotionBreakdown,
  calculateCognitiveLoadIndex,
} = require('../services/scoring.service')

// Generate a readable 4-digit room code
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

// POST /api/duo/create
exports.createRoom = async (req, res) => {
  try {
    // Generate unique code
    let code, exists = true
    while (exists) {
      code  = generateCode()
      exists = await DuoRoom.findOne({ code })
    }

    const room = await DuoRoom.create({
      code,
      createdBy: req.user._id,
    })

    res.status(201).json({ room })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/duo/join
// Body: { code }
exports.joinRoom = async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ message: 'Room code required' })

    const room = await DuoRoom.findOne({ code: code.toUpperCase() })
    if (!room) return res.status(404).json({ message: 'Room not found' })

    if (room.status !== 'waiting')
      return res.status(400).json({ message: 'Room is already full or in progress' })

    if (room.createdBy.toString() === req.user._id.toString())
      return res.status(400).json({ message: 'You cannot join your own room' })

    room.joinedBy = req.user._id
    room.status   = 'ready'
    await room.save()

    res.json({ room })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/duo/:code — poll room status
exports.getRoom = async (req, res) => {
  try {
    const room = await DuoRoom
      .findOne({ code: req.params.code.toUpperCase() })
      .populate('createdBy', 'name')
      .populate('joinedBy',  'name')

    if (!room) return res.status(404).json({ message: 'Room not found' })

    // Check if this user belongs to the room
    const uid = req.user._id.toString()
    const isA = room.createdBy._id.toString() === uid
    const isB = room.joinedBy?._id?.toString()  === uid
    if (!isA && !isB)
      return res.status(403).json({ message: 'You are not in this room' })

    res.json({ room, isCreator: isA })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// POST /api/duo/:code/submit
// Submit session words for one player
// Body: { words, roundType }
exports.submitSession = async (req, res) => {
  try {
    const { words, roundType = 'free' } = req.body
    const room = await DuoRoom.findOne({ code: req.params.code.toUpperCase() })

    if (!room) return res.status(404).json({ message: 'Room not found' })
    if (room.status === 'complete')
      return res.status(400).json({ message: 'Room already complete' })

    const uid  = req.user._id.toString()
    const isA  = room.createdBy.toString() === uid
    const isB  = room.joinedBy?.toString() === uid
    if (!isA && !isB)
      return res.status(403).json({ message: 'You are not in this room' })

    // Don't allow double submission
    if (isA && room.sessionA) return res.status(400).json({ message: 'Already submitted' })
    if (isB && room.sessionB) return res.status(400).json({ message: 'Already submitted' })

    if (!words || words.length !== 10)
      return res.status(400).json({ message: 'Exactly 10 words required' })

    // Build session (same logic as session.controller)
    const avgRT = Math.round(words.reduce((s, w) => s + w.reactionTime, 0) / 10)
    const avgSentiment = words.reduce((s, w) => s + w.sentimentScore, 0) / 10
    const positivityScore = Math.round(((avgSentiment + 1) / 2) * 100)

    const counts = { positive: 0, negative: 0, neutral: 0 }
    words.forEach(w => counts[w.sentiment]++)
    const dominantSentiment = Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b
    )

    const moodLabel      = calculateMoodLabel(positivityScore, avgRT)
    const themes         = extractThemes(words)
    const dominantEmotion   = getDominantEmotion(words)
    const emotionBreakdown  = getEmotionBreakdown(words)
    const cognitiveLoadData = calculateCognitiveLoadIndex(words)

    let story = ''
    try {
      story = await generateStory(words, moodLabel, positivityScore)
    } catch {
      story = 'Your mind spoke today. The words you chose carry meaning only you fully understand.'
    }

    const session = new Session({
      userId: req.user._id,
      words, roundType, story,
      positivityScore,
      avgReactionTime: avgRT,
      dominantSentiment,
      dominantEmotion,
      moodLabel, themes,
      emotionBreakdown,
      cognitiveLoadIndex: cognitiveLoadData,
    })
    await session.save()

    // Update user streak
    const user = await User.findById(req.user._id)
    user.updateStreak()
    await user.save()

    // Link session to room
    if (isA) room.sessionA = session._id
    if (isB) room.sessionB = session._id

    // Both submitted → complete
    if (room.sessionA && room.sessionB) {
      room.status = 'complete'
    } else {
      room.status = 'in_progress'
    }
    await room.save()

    res.status(201).json({ session, roomStatus: room.status })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// GET /api/duo/:code/result — fetch comparison once both done
exports.getResult = async (req, res) => {
  try {
    const room = await DuoRoom
      .findOne({ code: req.params.code.toUpperCase() })
      .populate('createdBy', 'name avatar')
      .populate('joinedBy',  'name avatar')

    if (!room) return res.status(404).json({ message: 'Room not found' })
    if (room.status !== 'complete')
      return res.status(202).json({ message: 'Not complete yet', status: room.status })

    const [sessionA, sessionB] = await Promise.all([
      Session.findById(room.sessionA),
      Session.findById(room.sessionB),
    ])

    const radarA = calculateRadarScores(sessionA)
    const radarB = calculateRadarScores(sessionB)

    // Delta — positive means B is higher
    const delta = {
      positivityScore:  sessionB.positivityScore - sessionA.positivityScore,
      avgReactionTime:  sessionB.avgReactionTime  - sessionA.avgReactionTime,
      cognitiveLoad:    (sessionB.cognitiveLoadIndex?.index ?? 0)-(sessionA.cognitiveLoadIndex?.index ?? 0),
    }

    // Who "won" each axis
    const winner = Object.fromEntries(
      Object.entries(radarA).map(([key, valA]) => [
        key,
        radarB[key] > valA ? 'B'
          : radarB[key] < valA ? 'A'
          : 'tie',
      ])
    )

    res.json({
      room,
      sessionA: { ...sessionA.toObject(), radar: radarA, user: room.createdBy },
      sessionB: { ...sessionB.toObject(), radar: radarB, user: room.joinedBy  },
      delta,
      winner,
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
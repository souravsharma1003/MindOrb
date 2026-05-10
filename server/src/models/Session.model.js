const mongoose = require('mongoose');

// Embedded subdocument — not a model itself
const wordEntrySchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true,
    },
    sentimentScore: {
      type: Number, // -1 (very negative) to 1 (very positive)
      required: true,
    },
    reactionTime: {
      type: Number, // milliseconds
      required: true,
    },
    wordIndex: {
      type: Number, // 1 to 10
      required: true,
    },
    orbState: {
      type: String, // hex color or named state e.g. "warm", "cool"
      default: 'neutral',
    },
    // In wordEntrySchema — add after orbState:
    emotion: {
      type: String,
      enum: [
        'joy', 'trust', 'fear', 'surprise',
        'sadness', 'disgust', 'anger', 'anticipation', 'neutral'
      ],
      default: 'neutral',
    },
    emotionIntensity: {
      type: Number, // 0 to 1 — how strongly the emotion is felt
      default: 0,
    },
  },
  { _id: false } // no separate _id for each word
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // fast lookup by user
    },
    roundType: {
      type: String,
      enum: ['free', 'themed', 'speed', 'reflection'],
      default: 'free',
    },
    words: {
      type: [wordEntrySchema],
      default: [],
    },
    story: {
      type: String,
      default: '',
    },
    positivityScore: {
      type: Number, // 0–100
      required: true,
    },
    avgReactionTime: {
      type: Number, // ms
      required: true,
    },
    dominantSentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      required: true,
    },
    moodLabel: {
      type: String, // "Calm", "Stressed", "Focused", "Joyful" etc.
      default: '',
    },
    themes: {
      type: [String], // ["work", "family", "growth"]
      default: [],
    },
    // In sessionSchema — add after themes:
    cognitiveLoadIndex: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    dominantEmotion: {
      type: String,
      enum: ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation', 'neutral'],
      default: 'neutral',
    },
    emotionBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isBaseline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);


module.exports = mongoose.model('Session', sessionSchema);
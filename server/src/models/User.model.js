const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ── Auth provider ──────────────────────────────────────────
    // 'local'    → email + password
    // 'google'   → Google OAuth
    // 'facebook' → Facebook OAuth
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    // Stores Google sub ID or Facebook user ID
    providerId: {
      type: String,
      default: null,
    },

    // ── Password — only set for local accounts ─────────────────
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: false,  // OAuth users have no password
    },

    // ── Profile ────────────────────────────────────────────────
    avatar:          { type: String, default: '' },
    streak:          { type: Number, default: 0  },
    lastSessionDate: { type: Date,   default: null },
    totalSessions:   { type: Number, default: 0  },
    baselineScore:   { type: Number, default: null },
    orbSkin:         { type: String, default: 'default' },
    preferredTime: {
      type: String,
      enum: ['morning', 'evening', 'anytime'],
      default: 'anytime',
    },
  },
  { timestamps: true }
);

// ── Hash password before saving (local accounts only) ─────────
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// ── Compare password ──────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false; // OAuth user — no password
  return bcrypt.compare(candidate, this.password);
};

// ── Streak logic ──────────────────────────────────────────────
userSchema.methods.updateStreak = function () {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastSessionDate) {
    this.streak = 1;
  } else {
    const last = new Date(this.lastSessionDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = (today - last) / (1000 * 60 * 60 * 24);

    if      (diffDays === 1) this.streak += 1;
    else if (diffDays === 0) { /* same day — no change */ }
    else                     this.streak = 1;
  }

  this.lastSessionDate = new Date();
  this.totalSessions  += 1;
};

module.exports = mongoose.model('User', userSchema);
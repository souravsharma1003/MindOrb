# MindOrb — Server API Documentation

> Complete reference for frontend developers. Everything you need to build the client without touching the server code.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Getting Started](#2-getting-started)
3. [Environment Variables](#3-environment-variables)
4. [Folder Structure](#4-folder-structure)
5. [Authentication](#5-authentication)
6. [API Reference](#6-api-reference)
   - [Auth Routes](#auth-routes)
   - [Session Routes](#session-routes)
   - [Insights Routes](#insights-routes)
   - [User Routes](#user-routes)
7. [Data Models](#7-data-models)
8. [Scoring System](#8-scoring-system)
9. [Emotion Wheel](#9-emotion-wheel)
10. [Cognitive Load Index](#10-cognitive-load-index)
11. [Error Handling](#11-error-handling)
12. [Rate Limiting](#12-rate-limiting)
13. [Frontend Integration Guide](#13-frontend-integration-guide)
14. [TF.js ↔ Server Contract](#14-tfjs--server-contract)
15. [Complete Request/Response Examples](#15-complete-requestresponse-examples)

---

## 1. Project Overview

MindOrb is a cognitive assessment web app. Users complete rounds of 10 words, the app classifies each word's sentiment and emotion, tracks reaction time, and generates an AI story at the end of each session.

**Tech stack:**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Anthropic Claude API (story + reflection generation)
- TensorFlow.js runs on the **client** — server only stores the computed scores

**Base URL (development):** `http://localhost:5000/api`

---

## 2. Getting Started

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongodb://localhost:27017`) or MongoDB Atlas URI
- Anthropic API key

### Installation

```bash
# Clone and navigate to server
cd mindorb/server

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Fill in your values (see Section 3)

# Start development server
npm run dev
```

Server starts on `http://localhost:5000`

### Verify it's running

```bash
curl http://localhost:5000/api/health
# → { "status": "ok", "time": "2024-01-15T10:30:00.000Z" }
```

---

## 3. Environment Variables

Create `server/.env` with these values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mindorb
JWT_SECRET=your_super_secret_key_min_32_chars
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Min 32 chars, used to sign JWTs |
| `ANTHROPIC_API_KEY` | Yes | Claude API key for story generation |
| `CLIENT_URL` | Yes | Frontend URL for CORS |
| `NODE_ENV` | No | `development` or `production` |

> **Note:** If `ANTHROPIC_API_KEY` is missing or invalid, sessions will still save but the story field will contain a fallback message instead of AI-generated content. The app will not crash.

---

## 4. Folder Structure

```
server/
└── src/
    ├── config/
    │   ├── db.js              # MongoDB connection
    │   └── env.js             # Env var validation on startup
    ├── controllers/
    │   ├── auth.controller.js
    │   ├── session.controller.js
    │   └── insights.controller.js
    ├── middleware/
    │   ├── auth.middleware.js  # JWT verification — protect()
    │   ├── error.middleware.js # Global error handler
    │   └── rateLimiter.js      # Per-route rate limits
    ├── models/
    │   ├── User.model.js       # Users collection
    │   └── Session.model.js    # Sessions + embedded WordEntry
    ├── routes/
    │   ├── auth.routes.js
    │   ├── session.routes.js
    │   ├── insights.routes.js
    │   └── user.routes.js
    ├── services/
    │   ├── claude.service.js   # Anthropic API calls
    │   ├── scoring.service.js  # All score calculations
    │   └── insights.service.js # Dashboard data builders
    ├── app.js                  # Express app setup
    └── server.js               # Entry point
```

---

## 5. Authentication

MindOrb uses **JWT Bearer token** authentication.

### How it works

1. User signs up or logs in → server returns a `token`
2. Frontend stores token in `localStorage`
3. Every protected request must include the header:

```
Authorization: Bearer <token>
```

4. Token expires after **7 days**
5. On expiry, server returns `401` — frontend should redirect to `/auth`

### Setting up Axios

```js
// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## 6. API Reference

### Auth Routes

#### POST `/auth/signup`

Register a new user.

**Request body:**
```json
{
  "name": "Aryan Sharma",
  "email": "aryan@example.com",
  "password": "securepassword123"
}
```

**Response `201`:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Aryan Sharma",
    "email": "aryan@example.com",
    "streak": 0,
    "totalSessions": 0,
    "baselineScore": null,
    "orbSkin": "default",
    "preferredTime": "anytime",
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| `400` | `Email already in use` |
| `400` | Mongoose validation errors |
| `500` | Server error |

---

#### POST `/auth/login`

Log in an existing user.

**Request body:**
```json
{
  "email": "aryan@example.com",
  "password": "securepassword123"
}
```

**Response `200`:** Same shape as signup — `{ token, user }`

**Errors:**
| Status | Message |
|--------|---------|
| `400` | `Email and password required` |
| `401` | `Invalid email or password` |

---

#### GET `/auth/me` 🔒

Get the currently authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response `200`:**
```json
{
  "user": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d1",
    "name": "Aryan Sharma",
    "email": "aryan@example.com",
    "streak": 12,
    "lastSessionDate": "2024-01-15T08:30:00.000Z",
    "totalSessions": 24,
    "baselineScore": 58,
    "orbSkin": "default",
    "preferredTime": "morning"
  }
}
```

---

### Session Routes

> All session routes require `Authorization: Bearer <token>`

#### POST `/sessions` 🔒

Save a completed session. Call this after the user finishes all 10 words.

**⚠️ Important:** TF.js classification happens on the client. Send the already-computed `sentiment`, `sentimentScore`, `emotion`, and `emotionIntensity` for each word. The server stores and aggregates them — it does not re-classify.

**Request body:**
```json
{
  "roundType": "free",
  "words": [
    {
      "word": "growth",
      "sentiment": "positive",
      "sentimentScore": 0.85,
      "emotion": "anticipation",
      "emotionIntensity": 0.9,
      "reactionTime": 1200,
      "wordIndex": 1,
      "orbState": "warm"
    },
    {
      "word": "tired",
      "sentiment": "negative",
      "sentimentScore": -0.6,
      "emotion": "sadness",
      "emotionIntensity": 0.7,
      "reactionTime": 2800,
      "wordIndex": 2,
      "orbState": "cool"
    }
    // ... 8 more words, exactly 10 total
  ]
}
```

**Word object fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `word` | String | Yes | The word the user typed |
| `sentiment` | `"positive"` \| `"negative"` \| `"neutral"` | Yes | From TF.js USE classifier |
| `sentimentScore` | Number `-1` to `1` | Yes | Confidence score from TF.js |
| `emotion` | String (see emotion wheel) | Yes | Plutchik emotion from lexicon |
| `emotionIntensity` | Number `0` to `1` | Yes | Emotion strength |
| `reactionTime` | Number (ms) | Yes | Time from prompt shown to Enter pressed |
| `wordIndex` | Number `1`–`10` | Yes | Position in round |
| `orbState` | String | No | Orb color/state at this moment |

**roundType values:**
- `"free"` — default, any words
- `"themed"` — constrained by theme prompt
- `"speed"` — 3 second time limit per word
- `"reflection"` — user adds a sentence to each word

**Response `201`:**
```json
{
  "session": {
    "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
    "userId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "roundType": "free",
    "words": [ /* all 10 word objects */ ],
    "story": "Something opened today. The mind was clear, each word arriving without hesitation...",
    "positivityScore": 74,
    "avgReactionTime": 1650,
    "dominantSentiment": "positive",
    "dominantEmotion": "anticipation",
    "moodLabel": "Focused",
    "themes": ["growth", "health"],
    "emotionBreakdown": {
      "joy": 3,
      "trust": 1,
      "fear": 0,
      "surprise": 0,
      "sadness": 2,
      "disgust": 0,
      "anger": 0,
      "anticipation": 3,
      "neutral": 1
    },
    "cognitiveLoadIndex": {
      "index": 38,
      "label": "Light",
      "components": {
        "extraneousLoad": 42,
        "intrinsicLoad": 31,
        "germaneLoad": 40
      },
      "insight": "Comfortable cognitive state. You were present but not strained."
    },
    "isBaseline": false,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| `400` | `Exactly 10 words required` |
| `401` | Not authenticated |
| `500` | Server error (story generation failure is handled — session still saves) |

---

#### GET `/sessions` 🔒

Get paginated list of user's sessions. Words array is excluded for performance.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| `page` | `1` | Page number |
| `limit` | `10` | Results per page |

**Example:** `GET /sessions?page=1&limit=10`

**Response `200`:**
```json
{
  "sessions": [
    {
      "_id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "roundType": "free",
      "story": "Something opened today...",
      "positivityScore": 74,
      "avgReactionTime": 1650,
      "dominantSentiment": "positive",
      "dominantEmotion": "anticipation",
      "moodLabel": "Focused",
      "themes": ["growth"],
      "cognitiveLoadIndex": { "index": 38, "label": "Light" },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
    // ... more sessions
  ],
  "total": 24,
  "page": 1,
  "pages": 3
}
```

> **Note:** `words` array is NOT included in list view. Fetch individual session with `GET /sessions/:id` to get words.

---

#### GET `/sessions/:id` 🔒

Get a single session with full word data and radar scores.

**Response `200`:**
```json
{
  "session": {
    "_id": "...",
    "words": [
      {
        "word": "growth",
        "sentiment": "positive",
        "sentimentScore": 0.85,
        "emotion": "anticipation",
        "emotionIntensity": 0.9,
        "reactionTime": 1200,
        "wordIndex": 1,
        "orbState": "warm"
      }
      // ... all 10 words
    ],
    "story": "...",
    "positivityScore": 74,
    "cognitiveLoadIndex": { /* full object */ },
    "emotionBreakdown": { /* full object */ }
    // ... all session fields
  },
  "radar": {
    "positivity": 74,
    "speed": 85,
    "variety": 100,
    "calm": 70,
    "focus": 78,
    "energy": 60,
    "clarity": 62
  }
}
```

**Errors:**
| Status | Message |
|--------|---------|
| `404` | `Session not found` |

---

#### GET `/sessions/compare?a=<id>&b=<id>` 🔒

Compare two sessions. Both must belong to the authenticated user.

**Example:** `GET /sessions/compare?a=64f1...d2&b=64f1...d3`

**Response `200`:**
```json
{
  "sessionA": {
    "_id": "...",
    "positivityScore": 65,
    "avgReactionTime": 2100,
    "moodLabel": "Stressed",
    "radar": { "positivity": 65, "speed": 58, "variety": 70, "calm": 60, "focus": 55, "energy": 72, "clarity": 45 }
    // ... full session
  },
  "sessionB": {
    "_id": "...",
    "positivityScore": 82,
    "avgReactionTime": 1800,
    "moodLabel": "Focused",
    "radar": { "positivity": 82, "speed": 75, "variety": 90, "calm": 85, "focus": 80, "energy": 68, "clarity": 72 }
    // ... full session
  },
  "delta": {
    "positivityScore": 17,
    "avgReactionTime": -300,
    "wordVariety": 2
  }
}
```

> **delta:** Positive = sessionB is better. Negative avgReactionTime delta means sessionB was faster (good).

---

#### DELETE `/sessions/:id` 🔒

Delete a session. Only the owner can delete their sessions.

**Response `200`:**
```json
{ "message": "Session deleted" }
```

---

### Insights Routes

> All insights routes require `Authorization: Bearer <token>`

#### GET `/insights/overview` 🔒

Main dashboard data endpoint. Returns everything the dashboard needs in one call.

**Response `200`:**
```json
{
  "totalSessions": 24,
  "timeline": [
    {
      "date": "2024-01-01T10:00:00.000Z",
      "positivityScore": 62,
      "moodLabel": "Calm",
      "dominantSentiment": "positive",
      "avgReactionTime": 1900
    }
    // ... up to 30 entries, chronological
  ],
  "sentimentBreakdown": {
    "positive": 67,
    "neutral": 21,
    "negative": 12
  },
  "wordCloud": [
    { "word": "growth", "count": 8, "sentiment": "positive", "avgScore": 0.82 },
    { "word": "calm", "count": 6, "sentiment": "positive", "avgScore": 0.75 }
    // ... top 20 words
  ],
  "heatmap": [
    { "date": "2023-12-19T00:00:00.000Z", "score": null, "mood": null },
    { "date": "2023-12-20T00:00:00.000Z", "score": 72, "mood": "Calm" }
    // ... exactly 28 entries, last 28 days
  ],
  "weeklyComparison": {
    "thisWeek":  { "sessions": 5, "avgPositivity": 74 },
    "lastWeek":  { "sessions": 4, "avgPositivity": 66 },
    "delta": 8,
    "avgReactionTime": 1720
  },
  "patterns": [
    {
      "type": "time",
      "icon": "clock",
      "positive": true,
      "text": "Morning sessions are 23% more positive for you.",
      "suggestion": "Try to do your session before noon when possible."
    }
    // ... up to 5 pattern objects
  ],
  "latestSession": { /* full session object without words */ }
}
```

> **Tip:** Call this once when the dashboard mounts. Don't poll it — it's expensive. Cache it in React state or React Query.

---

#### GET `/insights/weekly-reflection` 🔒

AI-generated weekly reflection via Claude API.

> **Note:** Only available if user has ≥2 sessions in the last 7 days. Costs one Claude API call — consider caching the result for 24 hours on the frontend.

**Response `200`:**
```json
{
  "reflection": "This week carried a quiet kind of momentum. Your words moved from uncertainty early on toward something steadier — growth appearing three times, calm twice. Whatever shifted on Wednesday seems to have opened something. Consider carrying that energy into next week with intention."
}
```

If fewer than 2 sessions this week:
```json
{
  "reflection": "Complete at least 2 sessions this week to unlock your weekly reflection."
}
```

---

#### GET `/insights/streaks` 🔒

Streak and session history data.

**Response `200`:**
```json
{
  "currentStreak": 12,
  "lastSessionDate": "2024-01-15T08:30:00.000Z",
  "totalSessions": 24,
  "recentSessions": [
    {
      "_id": "...",
      "createdAt": "2024-01-15T08:30:00.000Z",
      "positivityScore": 82,
      "moodLabel": "Focused"
    }
    // ... last 30 sessions
  ]
}
```

---

#### GET `/insights/session/:id` 🔒

Deep analysis of a single session including arc analysis and word timeline.

**Response `200`:**
```json
{
  "session": { /* full session object with words */ },
  "radar": { /* 7-axis radar scores */ },
  "wordTimeline": [
    {
      "index": 1,
      "word": "growth",
      "sentimentScore": 0.85,
      "sentiment": "positive",
      "reactionTime": 1200
    }
    // ... all 10 words
  ],
  "arcAnalysis": {
    "arc": "rising",
    "delta": 0.32,
    "firstHalfAvg": 0.21,
    "secondHalfAvg": 0.53,
    "peakWord": "grateful",
    "valleyWord": "tired",
    "insight": "You started cautious and opened up — a sign of growing comfort."
  }
}
```

**arc values:** `"rising"` | `"falling"` | `"flat"`

---

#### GET `/insights/emotions` 🔒

Plutchik emotion wheel profile across last 30 sessions.

**Response `200`:**
```json
{
  "percentages": {
    "joy": 28,
    "trust": 18,
    "fear": 5,
    "surprise": 8,
    "sadness": 12,
    "disgust": 3,
    "anger": 6,
    "anticipation": 15,
    "neutral": 5
  },
  "dominant": "joy",
  "rarest": "disgust",
  "joyTrend": "rising",
  "insight": "Joy is your most expressed emotion (28%). Your words carry warmth and lightness."
}
```

**joyTrend values:** `"rising"` | `"falling"` | `"stable"`

---

#### GET `/insights/cognitive-load` 🔒

Cognitive Load Index trend over last 20 sessions.

**Response `200`:**
```json
{
  "trend": [
    {
      "date": "2024-01-01T10:00:00.000Z",
      "index": 45,
      "label": "Moderate",
      "components": {
        "extraneousLoad": 52,
        "intrinsicLoad": 38,
        "germaneLoad": 44
      },
      "mood": "Stressed"
    }
    // ... up to 20 entries, chronological
  ],
  "avgCLI": 41,
  "avgLabel": "Moderate",
  "highLoadMoods": ["Stressed", "Overwhelmed"],
  "insight": "Moderate average cognitive load. Some sessions are more mentally taxing than others."
}
```

---

### User Routes

#### GET `/users/profile` 🔒

Get full user profile.

**Response `200`:**
```json
{
  "user": {
    "_id": "...",
    "name": "Aryan Sharma",
    "email": "aryan@example.com",
    "avatar": "",
    "streak": 12,
    "totalSessions": 24,
    "baselineScore": 58,
    "orbSkin": "default",
    "preferredTime": "morning",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### PATCH `/users/profile` 🔒

Update user profile. Only these fields can be updated:

**Request body (all fields optional):**
```json
{
  "name": "Aryan R. Sharma",
  "avatar": "https://...",
  "orbSkin": "crystal",
  "preferredTime": "morning"
}
```

**orbSkin values:** `"default"` | `"crystal"` | `"smoke"` | `"cosmic"`

**preferredTime values:** `"morning"` | `"evening"` | `"anytime"`

**Response `200`:** Updated user object

---

## 7. Data Models

### User

```
_id              ObjectId    auto
name             String      required
email            String      unique, lowercase
password         String      bcrypt hashed, never returned
avatar           String      URL or empty
streak           Number      consecutive session days
lastSessionDate  Date        used to calculate streak
totalSessions    Number      cached count
baselineScore    Number      from first session, null until then
orbSkin          String      default | crystal | smoke | cosmic
preferredTime    String      morning | evening | anytime
createdAt        Date        auto
updatedAt        Date        auto
```

> `password` has `select: false` — it is never returned in any response unless explicitly selected in the query (which never happens in routes).

---

### Session

```
_id               ObjectId
userId            ObjectId    ref: User
roundType         String      free | themed | speed | reflection
words             [WordEntry] exactly 10, embedded subdocuments
story             String      AI generated
positivityScore   Number      0–100, auto-calculated
avgReactionTime   Number      ms, auto-calculated
dominantSentiment String      positive | negative | neutral
dominantEmotion   String      one of 8 Plutchik emotions
moodLabel         String      Calm | Focused | Stressed | etc.
themes            [String]    detected topics: work, family, growth...
emotionBreakdown  Object      count of each emotion across 10 words
cognitiveLoadIndex Object     { index, label, components, insight }
isBaseline        Boolean     true for the onboarding session
createdAt         Date        auto
updatedAt         Date        auto
```

---

### WordEntry (embedded in Session)

```
word              String    the word typed, trimmed, lowercase
sentiment         String    positive | negative | neutral
sentimentScore    Number    -1.0 to 1.0
emotion           String    joy | trust | fear | surprise | sadness | disgust | anger | anticipation | neutral
emotionIntensity  Number    0.0 to 1.0
reactionTime      Number    milliseconds
wordIndex         Number    1 to 10
orbState          String    warm | cool | neutral | (custom)
```

---

## 8. Scoring System

All scoring happens in `scoring.service.js`. Here's how each metric is calculated — frontend developers need this to display values correctly.

### Positivity Score (0–100)

```
avgSentiment = mean of all 10 sentimentScore values (-1 to 1)
positivityScore = ((avgSentiment + 1) / 2) * 100
```

Example: average sentimentScore of 0.48 → positivityScore of 74

### Mood Label

Derived from `positivityScore` + `avgReactionTime`:

| Positivity | Reaction Time | Label |
|-----------|---------------|-------|
| ≥ 80 | < 2000ms | Focused |
| ≥ 80 | ≥ 2000ms | Joyful |
| ≥ 60 | < 2000ms | Calm |
| ≥ 60 | ≥ 2000ms | Content |
| ≥ 40 | > 3000ms | Overwhelmed |
| ≥ 40 | ≤ 3000ms | Neutral |
| < 40 | > 3000ms | Drained |
| < 40 | ≤ 3000ms | Stressed |

### Radar Scores (all 0–100)

| Axis | Formula |
|------|---------|
| `positivity` | Same as positivityScore |
| `speed` | `min(100, (2000 / avgReactionTime) * 70)` |
| `variety` | `(uniqueWords / 10) * 100` |
| `calm` | `% of non-negative words with RT < 2000ms` |
| `focus` | `100 - (stdDevRT / 30)` — low variance = high focus |
| `energy` | `% of words with abs(sentimentScore) > 0.6` |
| `clarity` | `100 - cognitiveLoadIndex.index` |

---

## 9. Emotion Wheel

MindOrb uses **Plutchik's Wheel of Emotions** — 8 primary emotions instead of simple positive/negative/neutral.

### The 8 Emotions

| Emotion | Orb Color (suggestion) | Associated with |
|---------|----------------------|-----------------|
| `joy` | Warm gold `#F9CB42` | happiness, love, gratitude |
| `trust` | Steady green `#1D9E75` | faith, security, loyalty |
| `fear` | Cool blue `#185FA5` | anxiety, worry, dread |
| `surprise` | Bright cyan `#5DCAA5` | shock, wonder, discovery |
| `sadness` | Deep indigo `#3C3489` | grief, loneliness, pain |
| `disgust` | Muted coral `#D85A30` | hate, contempt, disgust |
| `anger` | Red `#E24B4A` | rage, frustration, blame |
| `anticipation` | Purple `#7F77DD` | excitement, goals, future |
| `neutral` | Gray `#888780` | no strong emotion |

### Classification logic

The emotion lexicon is defined in `scoring.service.js` as `EMOTION_LEXICON`. The **same lexicon must be replicated in `client/src/services/sentiment.js`** so TF.js classification matches what the server expects.

When the client sends `emotion: "anticipation"` the server stores it as-is — no re-classification.

---

## 10. Cognitive Load Index

The CLi (Cognitive Load Index) is MindOrb's novel derived metric, based on Sweller's Cognitive Load Theory (1988).

### Formula

```
CLi = (extraneousLoad × 0.45) + (intrinsicLoad × 0.35) + (germaneLoad × 0.20)
```

### Three Components

**Extraneous Load** (reaction time inconsistency, weight 45%)
```
rtStdDev = standard deviation of 10 reaction times
extraneousLoad = min(100, (rtStdDev / 2000) * 100)
```
High = attention was being pulled away inconsistently.

**Intrinsic Load** (sentiment complexity, weight 35%)
```
sentimentVariance = variance of 10 sentimentScore values
intrinsicLoad = min(100, sentimentVariance * 100)
```
High = mixed emotions, complex mental state.

**Germane Load** (emotional switching, weight 20%)
```
switches = count of times emotion changed between consecutive words
germaneLoad = (switches / 9) * 100
```
High = rapid emotional context-switching.

### Labels

| CLi Range | Label |
|-----------|-------|
| 0–19 | Effortless |
| 20–39 | Light |
| 40–59 | Moderate |
| 60–74 | High |
| 75–100 | Overloaded |

### How to display it

- Show as a gauge or progress bar (0–100)
- Color it: green < 40, amber 40–65, red > 65
- Always show the `insight` string below the number
- Show three component bars in the session detail view

---

## 11. Error Handling

All errors follow this shape:

```json
{ "message": "Human readable error description" }
```

### Common Status Codes

| Code | Meaning | Frontend action |
|------|---------|----------------|
| `200` | Success | Use data |
| `201` | Created | Use data |
| `400` | Bad request | Show `message` to user |
| `401` | Unauthorized | Clear token, redirect to `/auth` |
| `404` | Not found | Show empty state |
| `429` | Rate limited | Show "too many requests" message |
| `500` | Server error | Show generic error toast |

### Handling in Axios

```js
try {
  const { data } = await api.post('/sessions', payload);
  // use data
} catch (err) {
  const message = err.response?.data?.message || 'Something went wrong';
  // show message to user
}
```

---

## 12. Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| `/auth/*` | 10 requests | 15 minutes |
| `/sessions` POST | 20 requests | 1 hour |
| All other routes | 100 requests | 15 minutes |

When rate limited, server returns `429` with:
```json
{ "message": "Too many attempts, please try again in 15 minutes" }
```

---

## 13. Frontend Integration Guide

### Recommended call sequence for each user flow

#### App startup
```
1. GET /auth/me          → restore user from stored token
2. If 401 → redirect to /auth
3. If success → load user into AuthContext
```

#### Auth page
```
Signup: POST /auth/signup → store token → redirect to /session
Login:  POST /auth/login  → store token → redirect to /session
```

#### Session page (the core loop)
```
1. User completes 10 words (TF.js runs locally, no API calls)
2. All 10 word objects collected with reactionTime
3. POST /sessions with all 10 words
4. Show story from response
5. Show positivity score, moodLabel, cognitiveLoadIndex
6. Option to navigate to dashboard
```

#### Dashboard page
```
1. GET /insights/overview         → all chart data
2. GET /insights/streaks          → streak widget
3. GET /insights/emotions         → emotion wheel chart
4. GET /insights/cognitive-load   → CLI trend chart
5. (On demand) GET /insights/weekly-reflection
```

#### Session history page
```
1. GET /sessions?page=1&limit=10  → list
2. User clicks session → GET /sessions/:id
3. User selects two → GET /sessions/compare?a=id1&b=id2
```

### State management recommendations

```
AuthContext:    user, token, login(), logout(), signup()
SessionContext: currentWords[], sessionStatus, submitSession()
```

Use **React Query** or **SWR** for dashboard data — built-in caching prevents redundant calls.

### Loading states to implement

Every API call needs three UI states:
1. **Loading** — skeleton or spinner
2. **Success** — render data
3. **Error** — error message with retry

---

## 14. TF.js ↔ Server Contract

This is the most critical integration point. The frontend classifies words and sends results to the server — both sides must agree on the schema.

### What TF.js must produce for each word

```js
// This object shape must be sent for each of the 10 words
{
  word: "growth",              // String: trimmed, no numbers, no special chars
  sentiment: "positive",       // "positive" | "negative" | "neutral"
  sentimentScore: 0.85,        // Float -1.0 to 1.0
  emotion: "anticipation",     // One of 9 emotion values (see Section 9)
  emotionIntensity: 0.9,       // Float 0.0 to 1.0
  reactionTime: 1200,          // Integer milliseconds
  wordIndex: 1,                // Integer 1–10
  orbState: "warm",            // String describing orb at this moment
}
```

### Sentiment score mapping

```
TF.js USE model output → sentimentScore
  Positive class probability > 0.6  → sentiment: "positive", score: probability (0.6–1.0 mapped to 0–1)
  Negative class probability > 0.6  → sentiment: "negative", score: -(probability mapped to 0–1)
  Neither                           → sentiment: "neutral",  score: 0.0 to 0.2
```

### Emotion classification

Run the same `EMOTION_LEXICON` from `scoring.service.js` on the client inside `useSentiment.js`. The lexicon must be identical so that client-side orb reactions match the server-stored data.

### Reaction time measurement

```js
// Start timer when input receives focus or word prompt appears
const startTime = performance.now();

// Stop timer when user presses Enter or clicks Submit
const reactionTime = Math.round(performance.now() - startTime);
```

Use `performance.now()` not `Date.now()` — it's higher precision and monotonic.

### Word validation before sending

Reject and prompt retry if:
- Word is empty or only whitespace
- Word contains numbers (`/\d/`)
- Word contains special characters (allow only letters and hyphens)
- Word was already used in this session
- Word is shorter than 2 characters

---

## 15. Complete Request/Response Examples

### Full session creation (curl)

```bash
TOKEN="your_jwt_token"

curl -X POST http://localhost:5000/api/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "roundType": "free",
    "words": [
      {"word":"growth","sentiment":"positive","sentimentScore":0.85,"emotion":"anticipation","emotionIntensity":0.9,"reactionTime":1200,"wordIndex":1,"orbState":"warm"},
      {"word":"calm","sentiment":"positive","sentimentScore":0.75,"emotion":"trust","emotionIntensity":0.8,"reactionTime":1400,"wordIndex":2,"orbState":"warm"},
      {"word":"tired","sentiment":"negative","sentimentScore":-0.6,"emotion":"sadness","emotionIntensity":0.7,"reactionTime":2800,"wordIndex":3,"orbState":"cool"},
      {"word":"focus","sentiment":"positive","sentimentScore":0.7,"emotion":"anticipation","emotionIntensity":0.75,"reactionTime":1100,"wordIndex":4,"orbState":"warm"},
      {"word":"hope","sentiment":"positive","sentimentScore":0.9,"emotion":"joy","emotionIntensity":0.95,"reactionTime":900,"wordIndex":5,"orbState":"warm"},
      {"word":"pressure","sentiment":"negative","sentimentScore":-0.5,"emotion":"fear","emotionIntensity":0.6,"reactionTime":3100,"wordIndex":6,"orbState":"cool"},
      {"word":"peace","sentiment":"positive","sentimentScore":0.8,"emotion":"trust","emotionIntensity":0.85,"reactionTime":1300,"wordIndex":7,"orbState":"warm"},
      {"word":"work","sentiment":"neutral","sentimentScore":0.0,"emotion":"neutral","emotionIntensity":0.1,"reactionTime":1800,"wordIndex":8,"orbState":"neutral"},
      {"word":"grateful","sentiment":"positive","sentimentScore":0.95,"emotion":"joy","emotionIntensity":0.98,"reactionTime":800,"wordIndex":9,"orbState":"warm"},
      {"word":"clarity","sentiment":"positive","sentimentScore":0.88,"emotion":"anticipation","emotionIntensity":0.9,"reactionTime":1000,"wordIndex":10,"orbState":"warm"}
    ]
  }'
```

### Dashboard data fetch (JavaScript)

```js
// Fetch all dashboard data in parallel
const [overview, streaks, emotions, cliTrend] = await Promise.all([
  api.get('/insights/overview'),
  api.get('/insights/streaks'),
  api.get('/insights/emotions'),
  api.get('/insights/cognitive-load'),
]);

const dashboardData = {
  ...overview.data,
  streak: streaks.data.currentStreak,
  emotionProfile: emotions.data,
  cognitiveLoadTrend: cliTrend.data,
};
```

### Session comparison (JavaScript)

```js
// User selects two sessions from history
const sessionAId = "64f1a2b3c4d5e6f7a8b9c0d2";
const sessionBId = "64f1a2b3c4d5e6f7a8b9c0d3";

const { data } = await api.get(`/sessions/compare?a=${sessionAId}&b=${sessionBId}`);

// data.sessionA.radar  → first session radar scores
// data.sessionB.radar  → second session radar scores
// data.delta           → { positivityScore: 17, avgReactionTime: -300, wordVariety: 2 }
```

---

## Quick Reference — All Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | No | Server health check |
| `POST` | `/auth/signup` | No | Register |
| `POST` | `/auth/login` | No | Login |
| `GET` | `/auth/me` | Yes | Current user |
| `POST` | `/sessions` | Yes | Save session |
| `GET` | `/sessions` | Yes | List sessions |
| `GET` | `/sessions/compare` | Yes | Compare two sessions |
| `GET` | `/sessions/:id` | Yes | Single session + radar |
| `DELETE` | `/sessions/:id` | Yes | Delete session |
| `GET` | `/insights/overview` | Yes | Full dashboard data |
| `GET` | `/insights/weekly-reflection` | Yes | AI weekly summary |
| `GET` | `/insights/streaks` | Yes | Streak data |
| `GET` | `/insights/session/:id` | Yes | Deep session analysis |
| `GET` | `/insights/emotions` | Yes | Emotion wheel profile |
| `GET` | `/insights/cognitive-load` | Yes | CLI trend |
| `GET` | `/users/profile` | Yes | User profile |
| `PATCH` | `/users/profile` | Yes | Update profile |

---

*MindOrb Server — Built with Node.js, Express, MongoDB, and Anthropic Claude*
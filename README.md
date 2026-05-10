# MindOrb

A real-time emotional intelligence platform for mindfulness and self-awareness, featuring interactive sessions, sentiment analysis, and collaborative duo modes with beautiful visualizations.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Express](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-9.3-47A248?style=flat-square&logo=mongodb)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.2-06B6D4?style=flat-square&logo=tailwindcss)
![Capacitor](https://img.shields.io/badge/Capacitor-8.3-119EFF?style=flat-square&logo=capacitorjs)

## Overview

MindOrb is a full-stack emotion tracking application that combines real-time sentiment analysis, interactive orb visualizations, and AI-powered insights. Users can engage in guided sessions, track emotional patterns, participate in collaborative duo sessions, and gain actionable insights from their emotional data.

**Key features:**
- Real-time sentiment analysis and emotion detection
- Interactive 3D orb visualization during sessions
- Personal dashboard with historical insights
- Collaborative duo mode for shared experiences
- Mobile-native support (iOS & Android)
- Emotion-based scoring and pattern recognition
- OAuth 2.0 authentication (Google)
- Rate-limited API with comprehensive error handling

## Tech Stack

**Frontend:**
- React 19 + Vite
- Tailwind CSS 4 with Radix UI components
- Three.js for 3D visualizations
- Framer Motion for animations
- Capacitor for mobile deployment

**Backend:**
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Anthropic AI SDK for insights generation
- Rate limiting and security middleware

**Mobile:**
- Capacitor (iOS & Android)
- Native haptics and notifications
- Google OAuth integration

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB instance (local or Atlas)
- Google OAuth credentials (for authentication)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/mindorb.git
cd mindorb
```

2. Install dependencies
```bash
npm run build
```

This will install dependencies for both client and server.

### Development Setup

**Terminal 1 - Start the server:**
```bash
cd server
npm run dev
```
Server runs on `http://localhost:5000` (or configured port)

**Terminal 2 - Start the client:**
```bash
cd client
npm run dev
```
Client runs on `http://localhost:5173`

### Environment Variables

<details>
<summary><b>Click to expand environment variables</b></summary>

Create a `.env` file in the `server` directory:

```env
# Database
MONGO_URI=mongodb://localhost:27017/mindorb
# or MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/mindorb

# Authentication
JWT_SECRET=your-secret-key-min-32-characters-long

# AI Services
OPENROUTER_API_KEY=your-openrouter-api-key
# or ANTHROPIC_API_KEY for direct Anthropic access

# Application
CLIENT_URL=http://localhost:5173
NODE_ENV=development
PORT=5000

# Google OAuth (optional, for authentication)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

For production, set `NODE_ENV=production` and use secure values for JWT_SECRET and OAuth credentials.

</details>

## Project Structure

```
mindorb/
├── client/                    # React Vite frontend
│   ├── src/
│   │   ├── components/       # UI components
│   │   ├── pages/            # Route pages
│   │   ├── context/          # Auth context
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API client, sentiment analysis
│   │   └── lib/              # Utilities
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── models/           # Mongoose schemas
│   │   ├── routes/           # API endpoints
│   │   ├── services/         # Business logic
│   │   ├── middleware/       # Auth, errors, rate limiting
│   │   ├── config/           # Database & env validation
│   │   ├── app.js            # Express app setup
│   │   └── server.js         # Entry point
│   └── package.json
│
└── package.json              # Root monorepo config
```

## API Endpoints

<details>
<summary><b>Click to expand API documentation</b></summary>

All endpoints are prefixed with `/api`.

### Authentication

```
POST   /auth/register          Register new user
POST   /auth/login             Login with credentials
POST   /auth/oauth             OAuth callback handler
GET    /auth/verify            Verify JWT token
POST   /auth/refresh           Refresh access token
```

### Sessions

```
POST   /sessions               Create new session
GET    /sessions               List user sessions
GET    /sessions/:id           Get session details
PUT    /sessions/:id           Update session
DELETE /sessions/:id           Delete session
POST   /sessions/:id/complete  Mark session as complete
```

### Insights

```
GET    /insights               Get user insights
POST   /insights/analyze       Analyze session data
GET    /insights/:id           Get specific insight
```

### Duo Mode

```
POST   /duo/create-room        Create collaboration room
GET    /duo/rooms/:id          Get room details
POST   /duo/join               Join existing room
POST   /duo/leave              Leave room
```

### Users

```
GET    /users/profile          Get current user profile
PUT    /users/profile          Update user settings
GET    /users/stats            Get user statistics
```

### Health

```
GET    /health                 Server health check
```

Authentication required for all endpoints except `/auth/register`, `/auth/login`, and `/health`.

</details>

## Authentication

The app uses JWT-based authentication with optional Google OAuth integration:

1. Users authenticate via email/password or Google OAuth
2. JWT tokens are issued upon successful login
3. Tokens are stored in secure storage (httpOnly cookies for web, secure storage for mobile)
4. Protected routes require a valid JWT in the Authorization header
5. Sessions are rate-limited (configurable per endpoint)

## Database Schema

**User**
- Email, hashed password, profile info
- Authentication metadata

**Session**
- User reference, start/end times
- Array of word entries with sentiment data
- Overall emotion and score

**Word Entry**
- Word text, sentiment (positive/negative/neutral)
- Sentiment score (-1 to 1)
- Reaction time, emotion, emotion intensity
- Visual orb state

**DuoRoom**
- Participants (user references)
- Room state and expiration
- Shared session data

**Insights**
- User reference, analysis data
- Generated recommendations
- Emotional patterns and trends

## Development

### Code Quality

Run linter on client code:
```bash
cd client && npm run lint
```

### Building

Build for production:
```bash
npm run build
```

This builds the client and prepares the server for deployment.

### Testing

Create unit tests in `__tests__` directories. Currently no automated test suite is configured.

## Mobile Deployment

### Android

```bash
cd client
npx cap add android
npx cap build android
```

### iOS

```bash
cd client
npx cap add ios
npx cap build ios
```

Capacitor automatically syncs web assets to native projects.

## Performance Considerations

- Rate limiting is applied to all API endpoints
- Database queries use indexing for frequently searched fields
- Frontend uses code splitting and lazy loading via Vite
- Animations and 3D rendering are GPU-accelerated where available
- Session data is streamed in real-time to minimize latency

## Security

- Passwords are hashed with bcryptjs
- JWTs are signed and verified server-side
- CORS is configured to allow only trusted origins
- Helmet.js is used for HTTP security headers
- Rate limiting prevents brute-force attacks
- Input validation is performed on all endpoints

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues, questions, or suggestions, please open an issue on the GitHub repository.

---

Built with care for emotional awareness and mindful growth.

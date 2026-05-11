require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { validateEnv } = require('./config/env');
const { errorHandler } = require('./middleware/error.middleware');
const { authLimiter, sessionLimiter, apiLimiter } = require('./middleware/rateLimiter');

const path = require("path")

validateEnv();

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'", "'unsafe-inline'", "'unsafe-eval'", "blob:",
                      "https://accounts.google.com",
                      "https://connect.facebook.net",
                      "https://cdn.jsdelivr.net"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", "blob:",
                      "https://accounts.google.com",
                      "https://connect.facebook.net",
                      "https://cdn.jsdelivr.net"],
      connectSrc:    ["'self'",
                      "https://huggingface.co",
                      "https://cdn-lfs.huggingface.co",
                      "https://cas-bridge.xethub.hf.co",
                      "https://*.xethub.hf.co",
                      "https://accounts.google.com",
                      "https://api.anthropic.com",
                      "https://cdn.jsdelivr.net",
                      // ── ADD THESE ──
                      "https://www.facebook.com",
                      "https://graph.facebook.com",
                      "https://*.facebook.com",
                      "https://apis.google.com",
                      "https://oauth2.googleapis.com",
                      "https://www.googleapis.com"],
      frameSrc:      ["'self'",
                      "https://accounts.google.com",
                      // ── ADD THESE ──
                      "https://www.facebook.com",
                      "https://staticxx.facebook.com"],
      imgSrc:        ["'self'", "data:", "blob:", "https:"],
      workerSrc:     ["'self'", "blob:"],
      childSrc:      ["'self'", "blob:",
                      // ── ADD THIS ──
                      "https://www.facebook.com"],
    },
  },
}));

const allowedOrigins = [
  'http://localhost:5173',                              // browser dev
  'http://localhost:4173',                              // vite preview
  'https://localhost:5173',
  'capacitor://localhost',                              // Capacitor iOS
  'http://localhost',                                   // Capacitor Android
  'https://localhost',                                  // Capacitor Android (https)
  process.env.CLIENT_URL,                               // production web
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error(`CORS blocked: ${origin}`))
  },
  credentials: true,
}))

app.use(express.json());

app.use(apiLimiter);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/sessions', sessionLimiter, require('./routes/session.routes'));
app.use('/api/insights', require('./routes/insights.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/duo', require('./routes/duo.routes'))

app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// 404
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use(errorHandler);

module.exports = app;
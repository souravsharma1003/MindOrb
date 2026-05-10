const rateLimit = require('express-rate-limit');

exports.authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10,
  message: { message: 'Too many attempts, please try again in 15 minutes' },
});

exports.sessionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { message: 'Session limit reached for this hour' },
});

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
});
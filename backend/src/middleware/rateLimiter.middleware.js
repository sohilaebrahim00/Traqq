const { rateLimit } = require('express-rate-limit');

// Tight limiter for login / register — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again in 15 minutes.' }
});

// Tracking endpoint — 60 req/min; generous for 12-second polling but throttles enumeration
const trackingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many tracking requests. Please slow down.' }
});

module.exports = { authLimiter, trackingLimiter };

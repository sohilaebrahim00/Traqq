require('dotenv').config();

// Fail fast on startup if any critical secret is missing — prevents silent misconfig
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  console.error('[FATAL] Copy backend/.env.example to backend/.env and fill in all values.');
  process.exit(1);
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const authRoutes    = require('./src/routes/auth.routes');
const bookingRoutes = require('./src/routes/booking.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const adminRoutes   = require('./src/routes/admin.routes');
const driverRoutes  = require('./src/routes/driver.routes');
const customerRoutes = require('./src/routes/customer.routes');
const packageRoutes = require('./src/routes/package.routes');
const promoRoutes   = require('./src/routes/promo.routes');
const prisma        = require('./src/config/prisma');

const app = express();
const PORT = process.env.PORT || 3000;

const isProd = process.env.NODE_ENV === 'production';

// Trust the first proxy (Nginx) so express-rate-limit and req.ip resolve correctly
app.set('trust proxy', 1);

// Always allow these production origins; also allow FRONTEND_URL from env
const allowedOrigins = [
  'https://traqq.com',
  'https://www.traqq.com',
  'https://traaqq.com',
  'https://www.traaqq.com',
  'https://mytraqq.com',
  'https://www.mytraqq.com',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(!isProd ? ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'] : [])
];

// Stripe webhook needs raw body — must come before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server requests (no Origin header) and listed origins
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true
}));
app.use(express.json());

// Global rate limit — covers all /api/ routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth',             authRoutes);
app.use('/api/bookings',         bookingRoutes);
app.use('/api/payments',         paymentRoutes);
app.use('/api/admin',            adminRoutes);
app.use('/api/driver',           driverRoutes);
app.use('/api/customer/bookings', customerRoutes);
app.use('/api/packages',         packageRoutes);
app.use('/api/promo',            promoRoutes);

// Exposes non-secret config values to the frontend
app.get('/api/config', (req, res) => {
  res.json({
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'TRAQQ API' }));

// Centralized error handler
app.use((err, req, res, next) => {
  // Never expose raw Zod validation details to clients
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Invalid request data. Please check your input.' });
  }
  // Log all unexpected errors for ops visibility
  console.error(`[error] ${req.method} ${req.path}:`, err.message);
  if (isProd) {
    // Never leak stack traces in production
    res.status(err.status || 500).json({ error: 'Internal server error' });
  } else {
    res.status(err.status || 500).json({ error: err.message, stack: err.stack });
  }
});

const server = app.listen(PORT, () => {
  console.log(`TRAQQ API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
});

// Graceful shutdown — PM2/systemd sends SIGTERM before force-killing
function shutdown(signal) {
  console.log(`[${signal}] Graceful shutdown initiated...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('[shutdown] DB disconnected. Exiting cleanly.');
      process.exit(0);
    } catch {
      process.exit(1);
    }
  });
  // Force-exit after 10 s if in-flight requests do not complete
  setTimeout(() => {
    console.error('[shutdown] Force exit after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

const router = require('express').Router();
const {
  login,
  getBookings,
  getBookingDetails,
  updateBookingStatus,
  updateLocation
} = require('../controllers/driver.controller');
const { authenticate, requireDriver } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Public — rate-limited to prevent brute-force
router.post('/login', authLimiter, login);

// All routes below require valid driver JWT
router.use(authenticate);
router.use(requireDriver);

router.get('/bookings',             getBookings);
router.get('/bookings/:id',         getBookingDetails);
router.patch('/bookings/:id/status', updateBookingStatus);
router.post('/location/update',     updateLocation);

module.exports = router;

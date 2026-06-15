const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { trackingLimiter } = require('../middleware/rateLimiter.middleware');
const { getTracking, getMyBookings } = require('../controllers/customer.controller');

router.get('/', authenticate, getMyBookings);
router.get('/:ref/tracking', trackingLimiter, getTracking);

module.exports = router;

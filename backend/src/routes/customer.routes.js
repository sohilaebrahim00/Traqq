const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { getTracking, getMyBookings } = require('../controllers/customer.controller');

router.get('/', authenticate, getMyBookings);
router.get('/:ref/tracking', getTracking);

module.exports = router;

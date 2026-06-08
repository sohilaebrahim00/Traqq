const router = require('express').Router();
const { authenticate, authenticateOptional, requireAdmin } = require('../middleware/auth.middleware');
const {
  createBooking, getBooking, updateBooking, deleteBooking, getAllBookings, getAvailability, verifyBooking
} = require('../controllers/booking.controller');

router.post('/create', authenticateOptional, createBooking);
router.get('/availability', getAvailability);   // MUST be before /:id
router.get('/verify/:id', verifyBooking);       // MUST be before /:id
router.get('/:id', getBooking);
router.put('/:id', authenticate, updateBooking);
router.delete('/:id', authenticate, requireAdmin, deleteBooking);
router.get('/', authenticate, requireAdmin, getAllBookings);

module.exports = router;

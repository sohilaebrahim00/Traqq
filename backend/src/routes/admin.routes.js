const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getOverview,
  updateBookingStatus,
  createDriver,
  getDrivers,
  assignDriver
} = require('../controllers/admin.controller');

// All admin routes require admin authentication
router.use(authenticate, requireAdmin);

router.get('/overview', getOverview);
router.patch('/bookings/:id/status', updateBookingStatus);

router.post('/drivers', createDriver);
router.get('/drivers', getDrivers);
router.patch('/bookings/:id/assign', assignDriver);

module.exports = router;

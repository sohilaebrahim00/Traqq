const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const {
  getOverview,
  updateBookingStatus,
  editBooking,
  getBookingEditLogs,
  createDriver,
  getDrivers,
  assignDriver
} = require('../controllers/admin.controller');
const { getPromoUsage, getAllPromoCodes, createPromoCode, updatePromoCode } = require('../controllers/promo.controller');

// All admin routes require admin authentication
router.use(authenticate, requireAdmin);

router.get('/overview', getOverview);
router.patch('/bookings/:id/status', updateBookingStatus);
router.patch('/bookings/:id/edit', editBooking);
router.get('/bookings/:id/logs', getBookingEditLogs);

router.post('/drivers', createDriver);
router.get('/drivers', getDrivers);
router.patch('/bookings/:id/assign', assignDriver);

// Promo management — /promo must be registered before /promo/usage and /promo/:id
router.get('/promo',          getAllPromoCodes);
router.post('/promo',         createPromoCode);
router.get('/promo/usage',    getPromoUsage);
router.patch('/promo/:id',    updatePromoCode);

module.exports = router;

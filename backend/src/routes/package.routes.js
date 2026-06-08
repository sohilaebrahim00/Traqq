const router = require('express').Router();
const { authenticate } = require('../middleware/auth.middleware');
const { createCheckoutSession, getActivePackages, redeemPackageRide } = require('../controllers/package.controller');

// All package routes require authentication
router.use(authenticate);

router.post('/checkout', createCheckoutSession);
router.get('/active', getActivePackages);
router.post('/redeem', redeemPackageRide);

module.exports = router;


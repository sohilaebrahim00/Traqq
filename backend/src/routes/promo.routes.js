const router = require('express').Router();
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { applyPromo, getPromoUsage } = require('../controllers/promo.controller');

// Apply a promo code to a booking (public — no auth required, guest-friendly)
router.post('/apply', applyPromo);

// Admin: view all promo code usage
router.get('/usage', authenticate, requireAdmin, getPromoUsage);

module.exports = router;

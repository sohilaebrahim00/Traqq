const router = require('express').Router();
const { createPaymentIntent, handleWebhook } = require('../controllers/payment.controller');
const { authenticateOptional } = require('../middleware/auth.middleware');

// Guest-friendly: authenticateOptional populates req.user when a valid token is present,
// allowing the controller to enforce ownership for logged-in users.
router.post('/create-intent', authenticateOptional, createPaymentIntent);
router.post('/webhook', handleWebhook);

module.exports = router;

const router = require('express').Router();
const { createPaymentIntent, handleWebhook } = require('../controllers/payment.controller');

router.post('/create-intent', createPaymentIntent);
router.post('/webhook', handleWebhook);

module.exports = router;

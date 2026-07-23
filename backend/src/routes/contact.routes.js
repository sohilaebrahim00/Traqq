const router = require('express').Router();
const { z } = require('zod');
const { rateLimit } = require('express-rate-limit');
const emailService = require('../services/email.service');

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { error: 'Too many contact form submissions. Please try again later.' }
});

const contactSchema = z.object({
  name:    z.string().min(2, 'Please enter your full name.'),
  email:   z.string().email('Please enter a valid email address.'),
  phone:   z.string().min(7, 'Please enter a valid phone number.'),
  type:    z.string().min(1, 'Please select an inquiry type.'),
  message: z.string().min(10, 'Message must be at least 10 characters.')
});

router.post('/', contactLimiter, async (req, res, next) => {
  try {
    const data = contactSchema.parse(req.body);
    await emailService.sendContactFormEmail(data);
    res.json({ success: true, message: 'Message received. Our team will respond shortly.' });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0]?.message || 'Invalid form data.' });
    }
    next(err);
  }
});

module.exports = router;

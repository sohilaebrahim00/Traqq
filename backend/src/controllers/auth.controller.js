const bcrypt = require('bcryptjs');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/tokens');

const registerSchema = z.object({
  fullName:    z.string().min(2),
  phoneNumber: z.string().min(10),
  email:       z.string().email().optional(),
  password:    z.string().min(8)
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string()
});

// Maps Zod issue codes + field names to user-friendly messages.
function friendlyZodError(issues) {
  const messages = {
    fullName: {
      too_small:    'Full name must be at least 2 characters.',
      invalid_type: 'Please enter your full name.',
      _missing:     'Please enter your full name.'
    },
    phoneNumber: {
      too_small:    'Phone number must be at least 10 digits.',
      invalid_type: 'Please enter your phone number.',
      _missing:     'Please enter your phone number.'
    },
    email: {
      invalid_string: 'Please enter a valid email address.',
      invalid_type:   'Please enter a valid email address.',
      _missing:       'Please enter a valid email address.'
    },
    password: {
      too_small:    'Password must be at least 8 characters.',
      invalid_type: 'Please enter a password.',
      _missing:     'Please enter a password.'
    }
  };

  const errors = {};
  issues.forEach(issue => {
    const field = issue.path[0];
    if (!field || errors[field]) return;
    const fieldMap = messages[field];
    errors[field] = (fieldMap && fieldMap[issue.code]) || issue.message;
  });
  return errors;
}

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { ...data, password: hash },
      select: { id: true, fullName: true, email: true, phoneNumber: true, role: true }
    });
    const accessToken = signAccess({ id: user.id, role: user.role });
    const refreshToken = signRefresh({ id: user.id });
    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Please fix the highlighted fields.',
        errors: friendlyZodError(err.errors)
      });
    }
    if (err.code === 'P2002') {
      const target = err.meta?.target || '';
      const isEmail = String(target).includes('email');
      return res.status(409).json({
        success: false,
        message: 'An account with this information already exists.',
        errors: {
          [isEmail ? 'email' : 'phoneNumber']: isEmail
            ? 'An account with this email already exists.'
            : 'An account with this phone number already exists.'
        }
      });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const accessToken = signAccess({ id: user.id, role: user.role });
    const refreshToken = signRefresh({ id: user.id });
    res.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      accessToken,
      refreshToken
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid email and password.',
        errors: friendlyZodError(err.errors)
      });
    }
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
    const payload = verifyRefresh(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const accessToken = signAccess({ id: user.id, role: user.role });
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
}

module.exports = { register, login, refresh };

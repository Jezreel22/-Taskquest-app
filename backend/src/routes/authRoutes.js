'use strict';

const { Router }  = require('express');
const rateLimit   = require('express-rate-limit');
const { body }    = require('express-validator');
const authCtrl    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { AUTH_RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } = require('../config/constants');

const router = Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  message: { status: 'fail', message: 'Too many requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validators ───────────────────────────────────────────────────────────────

const registerValidator = [
  body('username')
    .trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-z0-9_-]+$/i).withMessage('Username may only contain letters, numbers, _ and -'),
  body('displayName')
    .trim().isLength({ min: 2, max: 50 }).withMessage('Display name must be 2–50 characters'),
  body('email')
    .trim().isEmail().withMessage('Provide a valid email address').normalizeEmail(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Provide a valid email').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ─── Public routes ────────────────────────────────────────────────────────────

router.post('/register', authLimiter, registerValidator, validate, authCtrl.register);
router.post('/login',    authLimiter, loginValidator,    validate, authCtrl.login);
router.post('/refresh',  authLimiter, authCtrl.refreshToken);

// ─── Protected routes ─────────────────────────────────────────────────────────

router.use(protect);

router.post('/logout',          authCtrl.logout);
router.get('/me',               authCtrl.getMe);
router.patch('/me',             authCtrl.updateMe);
router.patch('/change-password', changePasswordValidator, validate, authCtrl.changePassword);
router.delete('/me',            authCtrl.deleteMe);

module.exports = router;

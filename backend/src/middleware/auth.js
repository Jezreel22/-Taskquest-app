'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const User     = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Protect routes — requires a valid Bearer JWT in the Authorization header.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Extract token
  let token;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return next(new AppError('You are not logged in. Please sign in to access this resource.', 401, 'UNAUTHORIZED'));
  }

  // 2. Verify
  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Your session has expired. Please log in again.'
      : 'Invalid token. Please log in again.';
    return next(new AppError(msg, 401, 'TOKEN_INVALID'));
  }

  if (decoded.type !== 'access') {
    return next(new AppError('Invalid token type.', 401, 'TOKEN_INVALID'));
  }

  // 3. Check user still exists and is active
  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user || !user.isActive) {
    return next(new AppError('The account belonging to this token no longer exists.', 401, 'USER_NOT_FOUND'));
  }

  // 4. Attach user to request and update last seen (fire & forget)
  req.user = user;
  user.updateLastSeen().catch(() => {});

  next();
});

module.exports = { protect };

'use strict';

const User       = require('../models/User');
const AppError   = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { successResponse } = require('../utils/response');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');

// ─── Register ─────────────────────────────────────────────────────────────────

exports.register = catchAsync(async (req, res, next) => {
  const { username, displayName, email, password, avatar } = req.body;

  // Check duplicates
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    const field = existing.email === email ? 'email' : 'username';
    return next(new AppError(`An account with that ${field} already exists.`, 409, 'DUPLICATE'));
  }

  const user = await User.create({ username, displayName, email, password, avatar });

  const accessToken  = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());

  // Persist refresh token
  user.refreshTokens = [refreshToken];
  await user.save({ validateBeforeSave: false });

  successResponse(res, 201, 'Account created successfully.', {
    user,
    accessToken,
    refreshToken,
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokens');
  if (!user || !user.isActive) {
    return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS'));
  }

  const accessToken  = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());

  // Keep only last 5 refresh tokens (multi-device support)
  user.refreshTokens = [...(user.refreshTokens || []).slice(-4), refreshToken];
  user.lastSeenAt    = new Date();
  await user.save({ validateBeforeSave: false });

  // Return user without password
  const userObj = user.toJSON();

  successResponse(res, 200, 'Logged in successfully.', {
    user: userObj,
    accessToken,
    refreshToken,
  });
});

// ─── Refresh token ────────────────────────────────────────────────────────────

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return next(new AppError('Refresh token is required.', 400, 'MISSING_TOKEN'));
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    return next(new AppError('Invalid or expired refresh token.', 401, 'TOKEN_INVALID'));
  }

  const user = await User.findById(decoded.sub).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(refreshToken)) {
    return next(new AppError('Refresh token has been revoked.', 401, 'TOKEN_REVOKED'));
  }

  // Rotate refresh token
  const newAccessToken  = signAccessToken(user._id.toString());
  const newRefreshToken = signRefreshToken(user._id.toString());

  user.refreshTokens = user.refreshTokens
    .filter((t) => t !== refreshToken)
    .concat(newRefreshToken)
    .slice(-5);
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Token refreshed.', {
    accessToken:  newAccessToken,
    refreshToken: newRefreshToken,
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

exports.logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken && req.user) {
    const user = await User.findById(req.user._id).select('+refreshTokens');
    if (user) {
      user.refreshTokens = (user.refreshTokens || []).filter((t) => t !== refreshToken);
      await user.save({ validateBeforeSave: false });
    }
  }

  successResponse(res, 200, 'Logged out successfully.');
});

// ─── Get current user (me) ────────────────────────────────────────────────────

exports.getMe = catchAsync(async (req, res) => {
  successResponse(res, 200, 'Profile fetched.', { user: req.user });
});

// ─── Update profile ───────────────────────────────────────────────────────────

exports.updateMe = catchAsync(async (req, res, next) => {
  const { displayName, avatar, settings } = req.body;

  if (req.body.password) {
    return next(new AppError('Use /change-password to update your password.', 400));
  }

  const updates = {};
  if (displayName) updates.displayName = displayName;
  if (avatar)      updates.avatar      = avatar;
  if (settings)    updates.settings    = { ...req.user.settings, ...settings };

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  successResponse(res, 200, 'Profile updated.', { user });
});

// ─── Change password ──────────────────────────────────────────────────────────

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect.', 400, 'WRONG_PASSWORD'));
  }

  user.password = newPassword;
  await user.save();

  const accessToken  = signAccessToken(user._id.toString());
  const refreshToken = signRefreshToken(user._id.toString());
  user.refreshTokens = [refreshToken];
  await user.save({ validateBeforeSave: false });

  successResponse(res, 200, 'Password changed successfully.', { accessToken, refreshToken });
});

// ─── Delete account ───────────────────────────────────────────────────────────

exports.deleteMe = catchAsync(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { isActive: false });
  successResponse(res, 200, 'Account deactivated successfully.');
});

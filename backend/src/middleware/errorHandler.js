'use strict';

const AppError = require('../utils/AppError');

// ─── Mongoose error handlers ──────────────────────────────────────────────────

function handleCastError(err) {
  return new AppError(`Invalid value for field "${err.path}": ${err.value}`, 400, 'CAST_ERROR');
}

function handleDuplicateKey(err) {
  const field = Object.keys(err.keyValue || {})[0] || 'field';
  const value = err.keyValue?.[field];
  return new AppError(`A record with ${field} "${value}" already exists.`, 409, 'DUPLICATE_KEY');
}

function handleValidationError(err) {
  const messages = Object.values(err.errors).map((e) => e.message).join('; ');
  return new AppError(`Validation failed: ${messages}`, 422, 'VALIDATION_ERROR');
}

function handleJWTError() {
  return new AppError('Invalid token. Please log in again.', 401, 'TOKEN_INVALID');
}

function handleJWTExpiredError() {
  return new AppError('Your session has expired. Please log in again.', 401, 'TOKEN_EXPIRED');
}

// ─── Dev vs Prod formatting ────────────────────────────────────────────────────

function sendErrorDev(err, res) {
  res.status(err.statusCode).json({
    status:  err.status,
    message: err.message,
    code:    err.code,
    stack:   err.stack,
    error:   err,
  });
}

function sendErrorProd(err, res) {
  if (err.isOperational) {
    // Known, safe-to-expose error
    return res.status(err.statusCode).json({
      status:  err.status,
      message: err.message,
      code:    err.code || null,
    });
  }
  // Unknown / programming error — don't leak details
  console.error('[ERROR] Unhandled:', err);
  res.status(500).json({
    status:  'error',
    message: 'Something went wrong. Please try again later.',
    code:    'INTERNAL_ERROR',
  });
}

// ─── Global error handler (4-argument Express handler) ───────────────────────

// eslint-disable-next-line no-unused-vars
function globalErrorHandler(err, req, res, next) {
  err.statusCode = err.statusCode || 500;
  err.status     = err.status     || 'error';

  const env = process.env.NODE_ENV || 'development';

  if (env === 'development') {
    return sendErrorDev(err, res);
  }

  // Transform known Mongoose / JWT errors into AppErrors
  let transformed = err;
  if (err.name === 'CastError')            transformed = handleCastError(err);
  if (err.code === 11000)                  transformed = handleDuplicateKey(err);
  if (err.name === 'ValidationError')      transformed = handleValidationError(err);
  if (err.name === 'JsonWebTokenError')    transformed = handleJWTError();
  if (err.name === 'TokenExpiredError')    transformed = handleJWTExpiredError();

  sendErrorProd(transformed, res);
}

module.exports = globalErrorHandler;

'use strict';

/**
 * Custom operational error class for expected (non-programming) errors.
 * Middleware will format these as structured JSON responses.
 */
class AppError extends Error {
  /**
   * @param {string} message   Human-readable error message
   * @param {number} statusCode HTTP status code (4xx / 5xx)
   * @param {string} [code]    Optional machine-readable error code
   */
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

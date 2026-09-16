'use strict';

/**
 * Utility: wrap async route handlers to avoid try/catch boilerplate.
 * @param {Function} fn  async express handler (req, res, next)
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;

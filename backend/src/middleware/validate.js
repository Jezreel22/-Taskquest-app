'use strict';

const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Run after express-validator rules.
 * Collects validation errors and returns a 422 with details.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => `${e.path}: ${e.msg}`).join('; ');
    return next(new AppError(`Validation failed: ${messages}`, 422, 'VALIDATION_ERROR'));
  }
  next();
}

module.exports = { validate };

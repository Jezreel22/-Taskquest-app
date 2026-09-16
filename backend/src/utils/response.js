'use strict';

/**
 * Consistent JSON response helpers.
 */

function successResponse(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data,
  });
}

function paginatedResponse(res, message, data, pagination) {
  return res.status(200).json({
    status: 'success',
    message,
    data,
    pagination,
  });
}

module.exports = { successResponse, paginatedResponse };

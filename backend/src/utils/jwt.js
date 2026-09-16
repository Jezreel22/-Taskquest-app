'use strict';

const jwt = require('jsonwebtoken');
const { JWT_EXPIRES_IN, REFRESH_EXPIRES_IN } = require('../config/constants');

/**
 * Sign a new access token.
 * @param {string} userId  MongoDB ObjectId as string
 */
function signAccessToken(userId) {
  return jwt.sign({ sub: userId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Sign a new refresh token.
 * @param {string} userId
 */
function signRefreshToken(userId) {
  return jwt.sign({ sub: userId, type: 'refresh' }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify an access token. Throws if invalid.
 * @param {string} token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

/**
 * Verify a refresh token. Throws if invalid.
 * @param {string} token
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };

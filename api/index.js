'use strict';

const app = require('../backend/src/app');
const { connectDB } = require('../backend/src/config/db');

module.exports = async (req, res) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('Vercel DB Connection Error:', err);
  }
  return app(req, res);
};

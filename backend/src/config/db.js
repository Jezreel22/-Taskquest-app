'use strict';

const mongoose = require('mongoose');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let retryCount = 0;

/**
 * Establish MongoDB connection with exponential-backoff retry.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[DB] MongoDB connected successfully.');
    retryCount = 0;
  });

  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected.');
  });

  await attemptConnect(uri);
}

async function attemptConnect(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    retryCount += 1;
    if (retryCount > MAX_RETRIES) {
      console.error('[DB] Max connection retries reached. Exiting.');
      process.exit(1);
    }
    const delay = RETRY_DELAY_MS * retryCount;
    console.warn(`[DB] Connection failed. Retrying in ${delay / 1000}s... (${retryCount}/${MAX_RETRIES})`);
    await new Promise((res) => setTimeout(res, delay));
    return attemptConnect(uri);
  }
}

/**
 * Gracefully close the MongoDB connection.
 */
async function disconnectDB() {
  await mongoose.connection.close();
  console.log('[DB] MongoDB connection closed.');
}

module.exports = { connectDB, disconnectDB };

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env.local') });
// Fall back to .env if variables not in .env.local
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(PORT, () => {
      console.log(`\n🚀 TaskQuest API running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`   → http://localhost:${PORT}/health\n`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server] Port ${PORT} is already in use.`);
        process.exit(1);
      }
      throw err;
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      process.exit(0);
    });
    // Force close after 10 s
    setTimeout(() => {
      console.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 10_000).unref();
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  process.exit(1);
});

start();

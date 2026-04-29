'use strict';

/**
 * src/config/db.js
 * -----------------
 * Serverless-compatible MongoDB connection.
 *
 * Key fixes for Vercel:
 * 1. NO process.exit() — kills the serverless function instantly
 * 2. Cached connection — reused across warm invocations
 * 3. bufferCommands: false — fail fast instead of hanging
 */

const mongoose = require('mongoose');

let cached = global._mongooseConnection;

if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      bufferCommands:           false,
      maxPoolSize:              10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
    };

    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, opts)
      .then((instance) => {
        console.log(`[db] MongoDB connected: ${instance.connection.host}`);
        return instance;
      })
      .catch((err) => {
        cached.promise = null;
        console.error(`[db] MongoDB connection error: ${err.message}`);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
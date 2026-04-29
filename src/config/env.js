'use strict';

/**
 * src/config/env.js
 * -----------------
 * Single source of truth for all environment variables.
 * The server REFUSES to start if a required variable is missing.
 * This prevents the worst class of production bugs: a server that
 * boots fine but silently fails because GITHUB_CLIENT_SECRET is blank.
 */
require('dotenv').config();

const required = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',
  'CLIENT_URL',
];

const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[env] FATAL — missing required environment variables:\n  ${missing.join('\n  ')}`
  );
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,

  // JWT
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // GitHub OAuth
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },

  // CORS / Cookie origin
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

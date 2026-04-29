'use strict';

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
  console.error(`[env] FATAL — missing required environment variables:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

module.exports = {
  port:    process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    accessSecret:    process.env.JWT_ACCESS_SECRET,
    refreshSecret:   process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN  || '3m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '5m',
  },
  github: {
    clientId:    process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
};

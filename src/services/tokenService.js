'use strict';

/**
 * src/services/tokenService.js
 * ----------------------------
 * Everything related to our own JWT tokens lives here.
 * Notice we don't touch GitHub tokens here — those are in githubOAuth.js.
 * This service only manages tokens WE issue to our own clients.
 *
 * Architecture decision: access tokens are short-lived JWTs (15 min).
 * Refresh tokens are long-lived random strings stored hashed in the DB.
 * The access token carries the user's id + role in its payload —
 * so protected routes never need a DB lookup just to authorise a request.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');
const { jwt: jwtConfig } = require('../config/env');

/**
 * Issue a short-lived access token.
 * Payload includes userId and role so middleware can authorise
 * without a DB call on every single request.
 */
const issueAccessToken = (user) =>
  jwt.sign(
    { sub: user._id.toString(), role: user.role, username: user.username },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessExpiresIn }
  );

/**
 * Issue a long-lived refresh token and save its hash to the DB.
 * Returns the RAW token (sent to client once, never stored raw).
 */
const issueRefreshToken = async (user, meta = {}) => {
  // Generate a cryptographically random token string
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = RefreshToken.hash(rawToken);

  // Parse expiry string like "7d" into a real Date
  const expiresAt = parseExpiry(jwtConfig.refreshExpiresIn);

  await RefreshToken.create({
    tokenHash,
    userId: user._id,
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
  });

  return rawToken;
};

/**
 * Verify an access token and return its decoded payload.
 * Throws if expired or tampered.
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, jwtConfig.accessSecret);

/**
 * Rotate a refresh token:
 *  1. Find and validate the existing DB record
 *  2. Delete it (one-time use)
 *  3. Issue a fresh pair
 *
 * If the token is unknown or expired, throws — the caller should
 * respond with 401 and force the user to log in again.
 */
const rotateRefreshToken = async (rawToken, meta = {}) => {
  const tokenHash = RefreshToken.hash(rawToken);
  const record = await RefreshToken.findOne({ tokenHash }).populate('userId');

  if (!record) {
    throw new Error('Refresh token not found or already used');
  }

  if (record.expiresAt < new Date()) {
    await record.deleteOne();
    throw new Error('Refresh token expired');
  }

  const user = record.userId; // populated User document

  // Invalidate the old token immediately (rotation)
  await record.deleteOne();

  // Issue fresh pair
  const newAccessToken = issueAccessToken(user);
  const newRefreshToken = await issueRefreshToken(user, meta);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken, user };
};

/**
 * Revoke all refresh tokens for a user (logout everywhere).
 */
const revokeAllUserTokens = (userId) =>
  RefreshToken.deleteMany({ userId });

/**
 * Parse an expiry string like "7d", "15m", "2h" into a future Date.
 */
const parseExpiry = (expiry) => {
  const units = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = String(expiry).match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid expiry format: ${expiry}`);
  const seconds = parseInt(match[1]) * units[match[2]];
  return new Date(Date.now() + seconds * 1000);
};

module.exports = {
  issueAccessToken,
  issueRefreshToken,
  verifyAccessToken,
  rotateRefreshToken,
  revokeAllUserTokens,
};

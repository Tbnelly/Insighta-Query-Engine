'use strict';

/**
 * src/models/refreshToken.js
 * --------------------------
 * We store refresh tokens in the DB for two critical reasons:
 *
 *  1. ROTATION — every use of a refresh token issues a brand-new one
 *     and invalidates the old one. If an attacker steals a refresh
 *     token and uses it before the real user does, the real user's
 *     next request will fail (token already rotated) — alerting you
 *     to a possible breach.
 *
 *  2. REVOCATION — JWTs are stateless; you can't "cancel" one. By
 *     keeping refresh tokens in the DB, logout actually works: we
 *     delete the record and the token becomes permanently invalid.
 *
 * We store a HASH of the token, never the raw value — same reason
 * you hash passwords. If the DB leaks, raw tokens can't be used.
 */

const mongoose = require('mongoose');
const crypto = require('crypto');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    // Track which client issued this (for audit / anomaly detection)
    userAgent: String,
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

// Auto-delete expired tokens — MongoDB TTL index does this for free
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static helper: hash a raw token string before storing/querying
refreshTokenSchema.statics.hash = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

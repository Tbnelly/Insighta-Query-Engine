'use strict';

/**
 * src/models/cliSession.js
 * -------------------------
 * Temporary store for CLI login tokens.
 *
 * Here is the full flow this model supports:
 *
 *  1. CLI generates a random session_id and opens GitHub with
 *     state=<session_id>&cli=1 in the URL
 *  2. GitHub redirects to the SAME backend callback URL as the web
 *  3. Backend detects cli=1 in the state, issues tokens, and saves
 *     them here keyed by session_id — then shows a "you can close
 *     this tab" HTML page
 *  4. CLI polls GET /api/v1/auth/cli-token?session=<session_id>
 *     every 2 seconds until the record appears
 *  5. Backend returns the tokens, deletes the record, CLI saves them
 *
 * The TTL index auto-deletes records after 10 minutes — so if the
 * user never completes the flow, no tokens are left dangling in the DB.
 */

const mongoose = require('mongoose');

const cliSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accessToken:  { type: String, required: true },
  refreshToken: { type: String, required: true },
  user: {
    id:       String,
    username: String,
    role:     String,
  },
  // Auto-delete after 10 minutes via MongoDB TTL index
  expiresAt: {
    type:    Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
  },
}, { timestamps: true });

cliSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CliSession', cliSessionSchema);

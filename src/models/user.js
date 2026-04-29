'use strict';

/**
 * src/models/user.js
 * ------------------
 * Stores every user who has authenticated via GitHub OAuth.
 * The `githubId` is the stable identifier — a GitHub username can
 * change, but the numeric ID never does. That's why we key on it.
 *
 * Roles:
 *   analyst — default for new signups; can query and export
 *   admin   — can manage users and view audit data
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      sparse: true, // GitHub email can be null/private
    },
    avatarUrl: {
      type: String,
    },
    role: {
      type: String,
      enum: ['admin', 'analyst'],
      default: 'analyst',
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);

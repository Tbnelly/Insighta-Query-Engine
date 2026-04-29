'use strict';

/**
 * src/services/githubOAuth.js
 * ---------------------------
 * Pure functions that talk to GitHub's OAuth API.
 * Keeping this in a service (not the controller) means you can
 * unit-test it in isolation and swap providers later without
 * touching controller logic.
 *
 * OAuth flow (two steps):
 *   Step 1 — User visits GitHub, approves, GitHub redirects back
 *             with a one-time `code`.
 *   Step 2 — We exchange that `code` (+ our client_secret) for
 *             a GitHub access token. Then we use THAT token to
 *             fetch the user's profile.
 */

const { github } = require('../config/env');

/**
 * Exchange a GitHub OAuth code for a GitHub access token.
 * @param {string} code  — the one-time code from GitHub's redirect
 * @returns {string}      — GitHub access token
 */
const exchangeCodeForToken = async (code) => {
  const params = new URLSearchParams({
    client_id: github.clientId,
    client_secret: github.clientSecret,
    code,
    redirect_uri: github.callbackUrl,
  });

  const response = await fetch(
    `https://github.com/login/oauth/access_token?${params}`,
    { headers: { Accept: 'application/json' } }
  );

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description}`);
  }

  return data.access_token;
};

/**
 * Use a GitHub access token to fetch the authenticated user's profile.
 * @param {string} accessToken — GitHub access token (not our JWT!)
 * @returns {object}           — GitHub user profile
 */
const fetchGitHubUser = async (accessToken) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch the user's verified primary email from GitHub.
 * We need this separately because `user.email` can be null
 * if the user has set their email to private on GitHub.
 * @param {string} accessToken
 * @returns {string|null}
 */
const fetchGitHubEmail = async (accessToken) => {
  const response = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) return null;

  const emails = await response.json();
  const primary = emails.find((e) => e.primary && e.verified);
  return primary ? primary.email : null;
};

module.exports = { exchangeCodeForToken, fetchGitHubUser, fetchGitHubEmail };

'use strict';

/**
 * src/controllers/authController.js
 * -----------------------------------
 * Handles all authentication flows:
 *
 *  GET  /api/v1/auth/github              → redirect user to GitHub
 *  GET  /api/v1/auth/github/callback     → GitHub redirects back here (web + CLI)
 *  GET  /api/v1/auth/cli-token           → CLI polls here to collect tokens
 *  POST /api/v1/auth/refresh             → rotate refresh token
 *  POST /api/v1/auth/logout              → revoke tokens
 *  GET  /api/v1/auth/me                  → return current user (protected)
 *
 * ONE callback URL works for BOTH web and CLI.
 * The CLI passes state=<sessionId>&cli=1 so the callback knows
 * to store tokens for polling instead of redirecting.
 */

const User       = require('../models/user');
const CliSession = require('../models/cliSession');
const { exchangeCodeForToken, fetchGitHubUser, fetchGitHubEmail } = require('../services/githubOAuth');
const {
  issueAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeAllUserTokens,
} = require('../services/tokenService');
const { github, clientUrl, nodeEnv } = require('../config/env');

// ── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   nodeEnv === 'production',
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,
  path:     '/',
};

const setRefreshCookie  = (res, token) => res.cookie('refreshToken', token, COOKIE_OPTIONS);
const clearRefreshCookie = (res)       => res.clearCookie('refreshToken', { path: '/' });

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/github
 * Redirect to GitHub OAuth — used by the WEB portal only.
 * The CLI builds its own URL directly (with session_id in state).
 */
const redirectToGitHub = (req, res) => {
  const params = new URLSearchParams({
    client_id:    github.clientId,
    redirect_uri: github.callbackUrl,
    scope:        'read:user user:email',
    state:        Math.random().toString(36).slice(2),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

/**
 * GET /api/v1/auth/github/callback
 * GitHub always redirects here — for BOTH web and CLI logins.
 *
 * How we tell them apart:
 *   CLI  → state param contains "<sessionId>__cli"
 *   Web  → state is a plain random string
 *
 * CLI path:  store tokens in CliSession keyed by sessionId, show HTML page
 * Web path:  set HTTP-only cookie, redirect to frontend
 */
const githubCallback = async (req, res, next) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({ status: 'error', message: 'Missing OAuth code' });
    }

    // Detect CLI flow — state ends with "__cli"
    const isCli      = typeof state === 'string' && state.endsWith('__cli');
    const sessionId  = isCli ? state.replace('__cli', '') : null;

    // Exchange code for GitHub access token
    const ghAccessToken = await exchangeCodeForToken(code);

    // Fetch profile + email in parallel
    const [ghUser, ghEmail] = await Promise.all([
      fetchGitHubUser(ghAccessToken),
      fetchGitHubEmail(ghAccessToken),
    ]);

    // Upsert user record
    const user = await User.findOneAndUpdate(
      { githubId: String(ghUser.id) },
      {
        username:    ghUser.login,
        displayName: ghUser.name || ghUser.login,
        email:       ghEmail || ghUser.email || undefined,
        avatarUrl:   ghUser.avatar_url,
        lastLoginAt: new Date(),
      },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );

    // Issue our JWT pair
    const meta         = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const accessToken  = issueAccessToken(user);
    const refreshToken = await issueRefreshToken(user, meta);

    // ── CLI path ─────────────────────────────────────────────────────────────
    if (isCli && sessionId) {
      // Store tokens in DB — CLI will poll and pick them up
      await CliSession.create({
        sessionId,
        accessToken,
        refreshToken,
        user: { id: user._id, username: user.username, role: user.role },
      });

      // Show a friendly browser page — no redirect needed
      return res.send(`
        <html>
          <body style="font-family:sans-serif;text-align:center;padding:60px;background:#f9f9f9">
            <h2 style="color:#2da44e">✅ Login successful!</h2>
            <p style="color:#555">You are logged in as <strong>${user.username}</strong>.</p>
            <p style="color:#555">You can close this tab and return to your terminal.</p>
          </body>
        </html>
      `);
    }

    // ── Web path ──────────────────────────────────────────────────────────────
    setRefreshCookie(res, refreshToken);
    return res.redirect(`${clientUrl}/auth/success.html#token=${accessToken}`);

  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/cli-token?session=<sessionId>
 * CLI polls this endpoint every 2 seconds after opening the browser.
 * When the record is found, tokens are returned and the record is deleted.
 * Returns 202 (still waiting) or 200 (tokens ready).
 */
const getCliToken = async (req, res, next) => {
  try {
    const { session } = req.query;

    if (!session) {
      return res.status(400).json({ status: 'error', message: 'Missing session parameter' });
    }

    const record = await CliSession.findOneAndDelete({ sessionId: session });

    if (!record) {
      // Not ready yet — CLI should keep polling
      return res.status(202).json({ status: 'pending', message: 'Waiting for GitHub authorization' });
    }

    // Tokens are ready — return them and delete the record (findOneAndDelete above)
    return res.json({
      status:       'success',
      accessToken:  record.accessToken,
      refreshToken: record.refreshToken,
      user:         record.user,
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/v1/auth/refresh
 * Works for both web (cookie) and CLI (body).
 */
const refreshTokens = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({ status: 'error', message: 'No refresh token provided' });
    }

    const meta = { userAgent: req.headers['user-agent'], ipAddress: req.ip };
    const { accessToken, refreshToken, user } = await rotateRefreshToken(rawToken, meta);

    setRefreshCookie(res, refreshToken);

    return res.json({
      status: 'success',
      accessToken,
      refreshToken,
      user: { id: user._id, username: user.username, role: user.role },
    });

  } catch (err) {
    if (err.message.includes('not found') || err.message.includes('expired')) {
      clearRefreshCookie(res);
      return res.status(401).json({ status: 'error', message: 'Session expired. Please log in again.' });
    }
    next(err);
  }
};

/**
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    await revokeAllUserTokens(req.user.sub);
    clearRefreshCookie(res);
    return res.json({ status: 'success', message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.sub).select('-__v');
    if (!user) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }
    return res.json({ status: 'success', data: user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  redirectToGitHub,
  githubCallback,
  getCliToken,
  refreshTokens,
  logout,
  getMe,
};

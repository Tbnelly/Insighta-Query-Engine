'use strict';

const { github } = require('../config/env');

const exchangeCodeForToken = async (code, redirectUri) => {
  const params = new URLSearchParams({
    client_id:     github.clientId,
    client_secret: github.clientSecret,
    code,
    redirect_uri:  redirectUri || github.callbackUrl,
  });

  const response = await fetch(
    `https://github.com/login/oauth/access_token?${params}`,
    { headers: { Accept: 'application/json' } }
  );

  const data = await response.json();
  if (data.error) throw new Error(`GitHub OAuth error: ${data.error_description}`);
  return data.access_token;
};

const fetchGitHubUser = async (accessToken) => {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
};

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

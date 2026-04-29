# Insighta Query Engine — Backend API

Production-grade REST API for the Insighta Labs profile query platform. Built with Node.js, Express, and MongoDB.

## Live URL
```
https://insighta-query-engine.vercel.app
```

## Tech Stack
- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB + Mongoose
- **Auth:** GitHub OAuth 2.0 + JWT
- **Deployment:** Vercel (Serverless)

---

## Features
- GitHub OAuth authentication (web + CLI — single callback URL)
- JWT access tokens (15 min) + rotating refresh tokens (7 days)
- Role-based access control (admin / analyst)
- Profile filtering, sorting, pagination
- Natural language query parsing
- CSV export
- Rate limiting, input validation, secure headers

---

## Project Structure

```
src/
├── config/
│   ├── db.js               ← Serverless-compatible MongoDB connection
│   └── env.js              ← Env validation (fail-fast on startup)
├── controllers/
│   ├── authController.js   ← GitHub OAuth, tokens, me, CLI polling
│   ├── profileController.js← Filter, sort, paginate, NL search
│   └── exportController.js ← CSV download
├── middleware/
│   ├── authenticate.js     ← JWT verification
│   ├── authorize.js        ← RBAC role enforcement
│   ├── validate.js         ← Input validation (express-validator)
│   ├── rateLimiter.js      ← Per-route rate limits
│   ├── requestLogger.js    ← Morgan HTTP logging
│   └── errorHandler.js     ← Global error handler
├── models/
│   ├── profile.js          ← Profile schema
│   ├── user.js             ← GitHub user record
│   ├── refreshToken.js     ← Hashed refresh tokens
│   └── cliSession.js       ← CLI login polling sessions
├── routes/v1/
│   ├── auth.js             ← /api/v1/auth/*
│   ├── profiles.js         ← /api/v1/profiles/*
│   └── export.js           ← /api/v1/export/*
├── services/
│   ├── queryBuilder.js     ← Filter/sort/paginate logic
│   ├── tokenService.js     ← JWT issue/rotate/revoke
│   ├── githubOAuth.js      ← GitHub API calls
│   └── exportService.js    ← CSV builder
├── parser/
│   └── nlParser.js         ← Natural language → MongoDB filter
└── utils/
    ├── apiResponse.js      ← Standard response helpers
    └── uuidv7.js           ← UUID generation
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/auth/github` | None | Redirect to GitHub OAuth |
| GET | `/api/v1/auth/github/callback` | None | OAuth callback (web + CLI) |
| GET | `/api/v1/auth/cli-token?session=<id>` | None | CLI token polling |
| POST | `/api/v1/auth/refresh` | None | Rotate refresh token |
| GET | `/api/v1/auth/me` | Bearer | Current user profile |
| POST | `/api/v1/auth/logout` | Bearer | Revoke all tokens |

### Profiles
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/profiles` | Bearer | List profiles with filters |
| GET | `/api/v1/profiles/search?q=` | Bearer | Natural language search |
| GET | `/api/v1/export/profiles` | Bearer | Download CSV |

### Query Parameters
| Parameter | Type | Example |
|---|---|---|
| `gender` | string | `male` / `female` |
| `age_group` | string | `child` / `teenager` / `adult` / `senior` |
| `country_id` | string | `NG` / `ZA` / `KE` |
| `min_age` | number | `18` |
| `max_age` | number | `65` |
| `sort_by` | string | `age` / `gender_probability` / `created_at` |
| `order` | string | `asc` / `desc` |
| `page` | number | `1` |
| `limit` | number | `10` (max 50) |

### Response Format
```json
{
  "status": "success",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 2026,
    "totalPages": 203
  }
}
```

---

## Authentication Flow

### Web Portal
```
User clicks login → GET /api/v1/auth/github
→ Redirects to GitHub consent screen
→ User approves
→ GitHub → GET /api/v1/auth/github/callback?code=xxx&state=yyy
→ Backend exchanges code, upserts user, issues tokens
→ Sets refresh token as HTTP-only cookie
→ Redirects to web portal with access token in URL fragment
```

### CLI Tool
```
insighta login
→ Generates random sessionId
→ Opens: github.com/login/oauth/authorize?state=<sessionId>__cli
→ User approves on GitHub
→ GitHub → GET /api/v1/auth/github/callback?state=<sessionId>__cli
→ Backend detects "__cli", stores tokens in CliSession (TTL: 10 min)
→ CLI polls GET /api/v1/auth/cli-token?session=<sessionId> every 2s
→ Backend returns tokens, CLI saves to ~/.insighta/credentials.json
```

---

## Token Handling

| Token | Lifetime | Storage |
|---|---|---|
| Access token (JWT) | 15 minutes | sessionStorage (web) / credentials.json (CLI) |
| Refresh token (hashed in DB) | 7 days | HTTP-only cookie (web) / credentials.json (CLI) |

**Rotation:** Every refresh token is deleted and replaced on use — one-time only.

---

## Roles

| Role | Permissions |
|---|---|
| `analyst` | Query profiles, NL search, CSV export |
| `admin` | All analyst permissions + user management |

To promote a user to admin:
```js
db.users.updateOne({ username: "Tbnelly" }, { $set: { role: "admin" } })
```

---

## Security

| Feature | Detail |
|---|---|
| Secure headers | `helmet()` |
| Rate limiting | Auth: 10/15min · API: 100/15min · Export: 10/hour |
| Input validation | `express-validator` on all query params |
| Refresh token | SHA-256 hashed, one-time use, auto-rotating |
| HTTP-only cookie | Refresh token unreachable by JavaScript |
| Body size limit | 10kb max |
| Stack traces | Never exposed in production |
| CORS | Restricted to `CLIENT_URL` only |

---

## Environment Variables

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=<64-byte hex>
JWT_REFRESH_SECRET=<different 64-byte hex>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
GITHUB_CALLBACK_URL=https://your-backend.vercel.app/api/v1/auth/github/callback
CLIENT_URL=https://your-web-portal.vercel.app
```

Generate JWT secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## Running Locally

```bash
npm install
cp .env.example .env
# Fill in all env variables
npm run dev
```

## Deployment

Deployed on Vercel. Connects via `api/index.js` which exports the Express app. MongoDB connection is cached on the global object for serverless compatibility.
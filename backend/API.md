# ELI6 Movies — Backend API Reference

Base URL: `https://eli6movies.onrender.com/api` (production) or `http://localhost:3000/api` (local).

All endpoints return JSON. Errors use the shape `{ "error": "CODE" }` (and, for 500s, `{ "error": "INTERNAL_ERROR", "message": "..." }`).

## Authentication

The backend issues a **JWT** on login/register. It is delivered two ways:

1. **httpOnly cookie** (`token`) — used by the web frontend (browser sends it automatically with `credentials: 'include'`).
2. **JSON body** (`token` field) — used by native clients (Android TV). Send it back as `Authorization: Bearer <token>`.

The `auth` middleware accepts the token from **either** the cookie or the `Authorization` header, so both clients work against the same endpoints.

| Auth method | Header / mechanism |
|-------------|--------------------|
| Cookie | `Cookie: token=<jwt>` (set automatically by browser) |
| Bearer | `Authorization: Bearer <jwt>` |

---

## Public endpoints (no auth)

### `GET /health`
Health check. Returns `{ "status": "ok" }`.

### `POST /register`
Create an account.

**Body:** `{ "username": string, "email": string, "password": string }`

- `username`: 3–30 chars, `[a-zA-Z0-9_-]`
- `password`: 8–128 chars, at least one letter and one digit/symbol

**Response `201`:** `{ "token": string, "user": { ... } }` (also sets the `token` cookie).

**Errors:** `400 INVALID_INPUT`, `400 REGISTRATION_FAILED` (email already in use).

### `POST /login`
**Body:** `{ "email": string, "password": string }`

**Response `200`:** `{ "token": string, "user": { ... } }` (also sets the `token` cookie).

**Errors:** `400 INVALID_INPUT`, `401 INVALID_CREDENTIALS`.

### `POST /logout`
Clears the session (revokes the current JWT `jti`) and the cookie. Accepts the token via cookie or `Authorization` header.

**Response:** `{ "message": "LOGGED_OUT" }`.

### `POST /auth/forgot-password`
**Body:** `{ "email": string }`. Always returns the same message to prevent user enumeration.

### `POST /auth/reset-password`
**Body:** `{ "token": string, "newPassword": string }`.

### `GET /auth/verify-email?token=...`
Verifies an email address.

### `POST /auth/resend-verification`
**Body:** `{ "email": string }`.

### `GET /auth/google/start` / `GET /auth/google/callback`
Google OAuth flow (browser redirect based).

---

## Authenticated endpoints (JWT required)

> All of these require a valid token via cookie or `Authorization: Bearer`.

### `GET /auth/me`
Returns the authenticated user. Useful for native clients to validate a stored token.

**Response:** `{ "user": { ... } }`.

### `GET /user/profile`
**Response:** `{ username, email, role, emailVerified, myList, createdAt }`.

### `PUT /user/update`
Update username/email. Requires `currentPassword` when changing either.

**Body:** `{ "username"?, "email"?, "currentPassword"? }`.

### `PUT /user/password`
**Body:** `{ "currentPassword", "newPassword" }`. Revokes all other sessions.

### `DELETE /user/delete`
**Body:** `{ "password" }`. Deletes the account.

### Profile picture
- `GET /user/profile-picture` → `{ "profilePicture": string }`
- `PUT /user/profile-picture` — body `{ "data": "data:image/..." }` (base64, ≤160 KB)
- `DELETE /user/profile-picture`

### My List
- `GET /user/mylist` → `[ { id, title, type, poster_path, overview, addedAt } ]`
- `POST /user/mylist` — body `{ "id", "title", "type", "poster_path"?, "overview"? }`; `type` ∈ `movie|tv|anime`
- `DELETE /user/mylist/:id/:type`

### Keep Watching
- `GET /user/keep-watching`
- `POST /user/keep-watching` — body `{ id, type, title, poster_path?, overview?, progress?, season?, episode? }`
- `DELETE /user/keep-watching/:id/:type`

### Watch history
- `GET /user/watched`
- `POST /user/watch-history` — body `{ item: { id, type, title, poster_path?, progress? } }`
- `DELETE /user/watch-history` — body `{ id, type }`
- `DELETE /user/watch-history/all`

### Sessions
- `GET /user/sessions` → `{ sessions, currentJti }`
- `DELETE /user/sessions/others`
- `DELETE /user/sessions/:jti`

### Discord linking
- `GET /user/discord-status`
- `POST /user/link-discord` — body `{ code }`
- `DELETE /user/link-discord`

### Trakt
- `GET /trakt/auth-url`
- `POST /trakt/callback` — body `{ code }`
- `GET /trakt/status`
- `DELETE /trakt/disconnect`
- `POST /trakt/scrobble` — body `{ action, mediaType, imdb_id?, tmdb_id?, title?, year?, progress?, season?, episode? }`

---

## Catalog / metadata (no auth)

### TMDB proxy — `GET /tmdb/*`
Proxies TMDB v3 with caching. Allowed prefixes: `/movie/`, `/tv/`, `/search/`, `/person/`, `/collection/`, `/discover/`, `/genre/`, `/trending/`, `/configuration`, `/network/`, `/keyword/`, `/review/`.

Examples:
- `GET /tmdb/trending/all/week`
- `GET /tmdb/movie/popular?page=1`
- `GET /tmdb/search/multi?query=...`

### Catalog helpers — `GET /catalog/*`
- `GET /catalog/movies/:category` — `now_playing|popular|top_rated|upcoming`
- `GET /catalog/tv/:category` — `airing_today|popular|top_rated|on_the_air`
- `GET /catalog/trending/:mediaType/:timeWindow` — `all|movie|tv|person` × `day|week`
- `GET /catalog/movies/genres`
- `GET /catalog/tv/genres`
- `GET /catalog/tv/genre/:id`
- `GET /catalog/movies/details/:id`
- `GET /catalog/movies/:id/credits`
- `GET /catalog/tv/:id/seasons`
- `GET /catalog/anime/popular`
- `GET /catalog/anime/search?q=...`
- `GET /catalog/anime/category/:category`
- `GET /catalog/anime/:id/episodes`
- `GET /catalog/vidsrc/:type` — `add|new`

### Anime (AniList) — `GET /anime/trending`

### Embed providers — `GET /embed/ru` (auth required)
Resolves a stream URL from a Russian CDN provider.

**Query:** `server` (`kodik|bazon|collaps|alloha|hdvb|videocdn`), `imdb` (`tt1234567`), `season`, `episode`.

### Server health — `GET /check-servers`
Probes embed providers for availability.

**Query:** `type` (`movie|tv|anime`), `id` (TMDB id), `imdb_id?`, `season?`, `episode?`.

### Translation — `POST /translation/translate`, `POST /translation/translate-batch`, `GET /translation/languages`

---

## Admin endpoints (JWT + `admin` role)

All under `/admin/*`, guarded by `auth` + `adminOnly`.

- `GET /admin/users`
- `POST /admin/users`
- `PUT /admin/users/:id`
- `DELETE /admin/users/:id`
- `PUT /admin/users/:id/reset-password`
- `PUT /admin/users/:id/role`
- `GET /admin/feedback`, `DELETE /admin/feedback/:id`
- `GET /admin/analytics/*` — many analytics aggregates (overview, daily, pages, countries, devices, retention, etc.)

---

## Analytics / tracking (no auth)

### `POST /data`
Fire-and-forget beacon endpoint (responds `204` immediately). Accepts `application/json` or `text/plain` (sendBeacon). Body `type` ∈ `pv|hb|dur|evt|vital|err`.

---

## Cron (shared secret)

### `POST /cron/check-episodes`
Triggered by an external cron. Requires `X-Cron-Secret` header (or `?secret=`).

---

## Rate limiting

Per-IP buckets (in-memory):

| Bucket | Default limit |
|--------|---------------|
| `auth` (`/register`, `/login`) | 10 / 15 min |
| `api` (everything else) | 200 / 15 min |
| `admin` (`/admin/*`) | 500 / 15 min |

Responses include `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers. On limit: `429 { "error": "RATE_LIMITED", "retryAfter": seconds }`.

---

## CSRF protection

State-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) require an `Origin`/`Referer` matching `FRONTEND_ORIGIN`. Requests with no `Origin`/`Referer` (curl, mobile, server-to-server) are allowed through — native clients are unaffected.

# ELI6 Movies

> Free streaming for movies, TV shows, and anime. Zero ads, zero subscription, zero sign-up required.

**Live:** https://eli6movies.vercel.app

---

## Features

- **10+ embed servers** with automatic failover — if one source doesn't play, it tries the next
- **Source quality badge** — shows CAM / WEB / HD / AIRING based on release dates (TMDB)
- **User accounts** — optional; required only for My List and episode notifications
- **My List & Keep Watching** — pick up where you left off, with auto-resume
- **Trakt.tv scrobbling** — connect your Trakt account and watched items sync automatically
- **Episode notifications** — get an email when a new episode of a show you follow drops
- **Multi-language UI** — English, Italian, Russian
- **Mobile-first** — bottom navigation, responsive layout, Android TV / spatial nav support
- **Multiple themes** — Pulse, Noir, Marquee, and more
- **Zero tracking** — no third-party analytics or ad networks

---

## Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Vanilla JS + HTML/CSS on [Vercel](https://vercel.com) | Free |
| Backend | Node.js / Express on [Render](https://render.com) | Free |
| Database | [MongoDB Atlas M0](https://mongodb.com/atlas) | Free |
| Metadata | [TMDB API](https://themoviedb.org/documentation/api) | Free |
| Avatars | [Cloudinary](https://cloudinary.com) | Free |
| Email | [Resend](https://resend.com) | Free |
| Video | Third-party embed providers (no files hosted here) | — |

**Total hosting cost: $0/month**

---

## Self-hosting guide

### 1. Clone the repo

```bash
git clone https://github.com/EliseyRotar/eli6_movies.git
cd eli6_movies
```

### 2. MongoDB Atlas (free database)

1. Create a free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Database Access** → add a user with a strong password
3. **Network Access** → Add Render's outbound CIDR ranges for your region (Render Dashboard → your service → Connect → Outbound tab). This is safer than `0.0.0.0/0` — restricts access to Render's IP space only. Ranges are fixed per region even on the free tier.
4. **Database → Connect → Drivers** → copy the connection string:
   ```
   mongodb+srv://user:password@cluster.mongodb.net/eli6_movies?retryWrites=true&w=majority
   ```

### 3. TMDB API key (free)

1. Register at [themoviedb.org](https://themoviedb.org)
2. Settings → API → Request an API key (v3 auth)

### 4. Backend on Render

1. [render.com](https://render.com) → New Web Service → connect your fork
2. **Root Directory:** `backend`
3. **Start command:** `node server.js`
4. **Environment variables:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | any 64+ character random string (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `90d` |
| `JWT_COOKIE_MAX_AGE` | `7776000000` |
| `TMDB_API_KEY` | your TMDB v3 API key |
| `TMDB_LANGUAGE` | `en-US` |
| `TMDB_TIMEOUT_MS` | `8000` |
| `FRONTEND_ORIGIN` | your Vercel URL |
| `APP_URL` | your Vercel URL |
| `SITE_HOST` | your Vercel domain (no `https://`) |

**Optional — for episode email notifications:**

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) |
| `MAIL_FROM` | e.g. `ELI6 Movies <you@yourdomain.com>` |
| `CRON_SECRET` | any random string (protects the cron endpoint) |

**Optional — for Trakt.tv scrobbling:**

| Variable | Value |
|----------|-------|
| `TRAKT_CLIENT_ID` | from [trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) |
| `TRAKT_CLIENT_SECRET` | from the same Trakt app page |
| `TRAKT_REDIRECT_URI` | `https://your-vercel-url.vercel.app/trakt-callback.html` |

> To set up: create a new app at trakt.tv/oauth/applications, set the redirect URI to your Vercel URL + `/trakt-callback.html`, and add your Vercel origin in the CORS origins field.

**Optional — for profile picture uploads:**

| Variable | Value |
|----------|-------|
| `CLOUDINARY_CLOUD_NAME` | from [cloudinary.com](https://cloudinary.com) |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### 5. Frontend on Vercel

1. [vercel.com](https://vercel.com) → New Project → import your fork
2. Set **Root Directory** to `frontend`
3. No build step needed — pure static files
4. In `frontend/js/config.js`, update the API URL to your Render service:
   ```js
   window.API_BASE_URL = 'https://your-render-service.onrender.com/api';
   ```

### 6. Wire together and deploy

```bash
# Update config.js with your Render URL, then commit
git add frontend/js/config.js
git commit -m "config: set production API URL"
git push
```

Vercel auto-deploys on push. In Render, update `FRONTEND_ORIGIN` to your Vercel URL and redeploy.

### 7. Keep backend awake (optional)

Render free tier sleeps after 15 minutes idle. Prevent this with [UptimeRobot](https://uptimerobot.com) (free):
- Monitor type: HTTP(S)
- URL: `https://your-render-url.onrender.com/api/health`
- Interval: 5 minutes

### 8. Episode notifier cron (optional)

If you set up Resend, trigger the episode checker daily via [cron-job.org](https://cron-job.org):
- URL: `POST https://your-render-url.onrender.com/api/cron/check-episodes`
- Header: `X-Cron-Secret: <your CRON_SECRET>`
- Schedule: once daily

---

## Local development

```bash
cd backend
cp env.example .env
# Fill in MONGODB_URI, JWT_SECRET, TMDB_API_KEY in .env
npm install
node server.js

# In a separate terminal — serve the frontend
cd ../frontend
python3 -m http.server 5500
# Open http://localhost:5500
```

---

## Project structure

```
eli6_movies/
├── frontend/          # Static site (Vercel)
│   ├── index.html     # Homepage
│   ├── movies.html    # Movies browse
│   ├── tvshows.html   # TV shows browse
│   ├── anime.html     # Anime browse
│   ├── player.html    # Video player
│   ├── search.html    # Search
│   ├── mylist.html    # Watchlist
│   ├── account.html   # Login / profile
│   ├── settings.html  # User settings
│   ├── css/           # Stylesheets (theme system)
│   ├── js/
│   │   ├── config.js      # API URL configuration
│   │   ├── components.js  # Shared UI components
│   │   ├── theme.js       # Theme switcher
│   │   ├── i18n.js        # Internationalization (EN/IT/RU)
│   │   ├── mylist.js      # My List sync
│   │   └── ...
│   └── vercel.json    # Clean URL rewrites + CSP headers
└── backend/           # Express API (Render)
    ├── server.js      # Entry point
    ├── routes/
    │   ├── auth.js         # Login, register, logout
    │   ├── user.js         # Profile, My List, Keep Watching, avatar
    │   ├── tmdb.js         # TMDB proxy with tiered cache
    │   ├── catalog.js      # Browse endpoints
    │   ├── checkServers.js # Embed provider health check
    │   ├── cron.js         # Episode notifier trigger
    │   └── passwordReset.js
    ├── models/
    │   └── User.js         # User schema
    ├── middleware/
    │   ├── auth.js         # JWT auth
    │   ├── rateLimit.js    # Rate limiting
    │   └── csrf.js         # CSRF protection
    └── jobs/
        └── episodeNotifier.js  # New episode email logic
```

---

## API reference

> Full documentation: [`backend/API.md`](backend/API.md)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/register` | — | Create account (returns JWT) |
| `POST` | `/api/login` | — | Login (returns JWT) |
| `POST` | `/api/logout` | — | Logout |
| `GET` | `/api/auth/me` | JWT | Current user (token validation) |
| `GET` | `/api/user/profile` | JWT | Profile + My List |
| `GET` | `/api/user/mylist` | JWT | My List |
| `POST` | `/api/user/mylist` | JWT | Add to My List |
| `DELETE` | `/api/user/mylist/:id/:type` | JWT | Remove from My List |
| `GET` | `/api/user/keep-watching` | JWT | Keep Watching list |
| `POST` | `/api/user/keep-watching` | JWT | Update progress |
| `PUT` | `/api/user/profile-picture` | JWT | Upload profile picture |
| `GET` | `/api/tmdb/*` | — | Proxied TMDB requests (cached) |
| `GET` | `/api/check-servers` | — | Embed provider health |
| `GET` | `/api/embed/ru` | JWT | Russian CDN embed proxy |
| `POST` | `/api/cron/check-episodes` | Cron-Secret header | Episode notifier trigger |
| `GET` | `/api/trakt/auth-url` | JWT | Returns Trakt OAuth URL |
| `POST` | `/api/trakt/callback` | JWT | Exchange OAuth code for tokens |
| `GET` | `/api/trakt/status` | JWT | Trakt connection status |
| `DELETE` | `/api/trakt/disconnect` | JWT | Disconnect Trakt |
| `POST` | `/api/trakt/scrobble` | JWT | Proxy scrobble to Trakt |

---

## Credits

- Movie and TV metadata: [TMDB](https://themoviedb.org)
- Video embed providers: third-party (this project does not host any video files)

---

## License

MIT

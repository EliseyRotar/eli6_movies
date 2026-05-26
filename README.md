# ELI6 Movies

Free streaming site for movies, TV shows, and anime. No subscription, no sign-up required to browse.

**Live site:** _(set after Vercel deployment)_
**API:** _(set after Render deployment)_

---

## Stack

| Layer | Service | Cost |
|-------|---------|------|
| Frontend | [Vercel](https://vercel.com) | Free |
| Backend API | [Render](https://render.com) | Free |
| Database | [MongoDB Atlas M0](https://www.mongodb.com/atlas) | Free |
| Metadata | [TMDB API](https://www.themoviedb.org/documentation/api) | Free |
| Video embeds | VidSrc, VixSrc, Embed.su, AutoEmbed + more | Third-party |

---

## Deploy (one-time setup)

### 1. MongoDB Atlas — free database

1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas) → **Try Free**
2. Create a free **M0** cluster (any region)
3. Under **Security → Database Access**: add a user with a password
4. Under **Security → Network Access**: click **Allow Access from Anywhere** (0.0.0.0/0)
5. Under **Database → Connect**: choose **Drivers**, copy the connection string
   It looks like: `mongodb+srv://user:password@cluster.mongodb.net/eli6_movies?retryWrites=true&w=majority`

### 2. Backend — Render

1. Go to [render.com](https://render.com) → **New Web Service**
2. Connect the GitHub repo `EliseyRotar/eli6_movies`
3. Set **Root Directory** to `backend`
4. Set these environment variables in the Render dashboard:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `MONGODB_URI` | _(your Atlas connection string)_ |
| `JWT_SECRET` | `REDACTED_JWT_SECRET` |
| `JWT_EXPIRES_IN` | `7d` |
| `JWT_COOKIE_MAX_AGE` | `604800000` |
| `TMDB_API_KEY` | `REDACTED_TMDB_API_KEY` |
| `TMDB_LANGUAGE` | `en-US` |
| `TMDB_TIMEOUT_MS` | `8000` |
| `FRONTEND_ORIGIN` | _(your Vercel URL, e.g. `https://eli6-movies.vercel.app`)_ |

5. Deploy. Render will give you a URL like `https://eli6-movies-api.onrender.com`

### 3. Frontend — Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import `EliseyRotar/eli6_movies`
2. Vercel auto-detects `vercel.json` and serves the `frontend/` folder
3. No build step needed (pure HTML/JS/CSS)
4. After deployment, copy your Vercel URL (e.g. `https://eli6-movies.vercel.app`)

### 4. Wire them together

1. In `frontend/js/config.js`, set your Render URL:
   ```js
   window.API_BASE_URL = 'https://eli6-movies-api.onrender.com/api';
   window.TMDB_PROXY_URL = window.API_BASE_URL + '/tmdb';
   ```
2. Commit and push — Vercel auto-redeploys
3. In Render dashboard, update `FRONTEND_ORIGIN` to your Vercel URL and redeploy

### 5. Keep backend awake (optional)

Render free tier sleeps after 15 minutes idle. To prevent this:
1. Sign up at [uptimerobot.com](https://uptimerobot.com) (free)
2. Add a **HTTP(S)** monitor pointing to `https://your-render-url.onrender.com/api/health`
3. Set interval to **5 minutes**

---

## Local development

```bash
git clone https://github.com/EliseyRotar/eli6_movies.git
cd eli6_movies/backend
cp env.example .env
# Edit .env: set JWT_SECRET, TMDB_API_KEY, MONGODB_URI
npm install
node server.js

# Frontend: open frontend/index.html with any static server
# python3 -m http.server 5500 --directory ../frontend
```

---

## Environment variables

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=<64+ char random string>
JWT_EXPIRES_IN=7d
JWT_COOKIE_MAX_AGE=604800000
TMDB_API_KEY=REDACTED_TMDB_API_KEY
TMDB_LANGUAGE=en-US
TMDB_TIMEOUT_MS=8000
FRONTEND_ORIGIN=https://your-app.vercel.app
```

---

## Features

- Trending movies, TV shows, and anime from TMDB
- Full-text search with live results
- 10+ embed servers (VidSrc, VixSrc, Embed.su, AutoEmbed, and more)
- User accounts with persistent My List and watch history
- Keep Watching — resume where you left off
- Multi-language UI (EN / IT / RU)
- Mobile-first responsive design with bottom navigation
- Android TV / spatial navigation support

---

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/register` | — | Create account |
| POST | `/api/login` | — | Login |
| POST | `/api/logout` | — | Logout |
| GET | `/api/user/profile` | JWT | Profile + myList |
| POST | `/api/user/mylist` | JWT | Add to My List |
| DELETE | `/api/user/mylist/:id/:type` | JWT | Remove from My List |
| GET | `/api/user/keep-watching` | JWT | Keep Watching list |
| POST | `/api/user/keep-watching` | JWT | Update Keep Watching |
| GET | `/api/tmdb/*` | — | Proxied TMDB requests |

---

## Credits

Movie/TV data: [TMDB](https://www.themoviedb.org) — Anime data: [Jikan](https://jikan.moe) — Video embeds: third-party providers (this site does not host any files)

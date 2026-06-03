const express = require('express');
const auth = require('../middleware/auth');
const router = express.Router();

const CLIENT_ID     = process.env.TRAKT_CLIENT_ID     || '';
const CLIENT_SECRET = process.env.TRAKT_CLIENT_SECRET || '';
const REDIRECT_URI  = process.env.TRAKT_REDIRECT_URI  || '';
const API           = 'https://api.trakt.tv';

function traktHeaders(token) {
    return {
        'Content-Type':       'application/json',
        'trakt-api-version':  '2',
        'trakt-api-key':      CLIENT_ID,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
    };
}

async function refreshToken(user) {
    const r = await fetch('https://trakt.tv/oauth/token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refresh_token: user.traktRefreshToken,
            client_id:     CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri:  REDIRECT_URI,
            grant_type:    'refresh_token',
        }),
    });
    if (!r.ok) throw new Error('refresh_failed');
    const d = await r.json();
    user.traktAccessToken  = d.access_token;
    user.traktRefreshToken = d.refresh_token;
    user.traktTokenExpiry  = new Date(Date.now() + d.expires_in * 1000);
    await user.save();
    return d.access_token;
}

async function validToken(user) {
    if (!user.traktAccessToken) return null;
    const expiring = user.traktTokenExpiry && user.traktTokenExpiry < new Date(Date.now() + 60000);
    if (expiring) return await refreshToken(user);
    return user.traktAccessToken;
}

// GET /trakt/auth-url
router.get('/trakt/auth-url', auth, (req, res) => {
    if (!CLIENT_ID) return res.status(503).json({ error: 'TRAKT_NOT_CONFIGURED' });
    const url = 'https://trakt.tv/oauth/authorize?response_type=code&client_id=' + CLIENT_ID + '&redirect_uri=' + encodeURIComponent(REDIRECT_URI);
    res.json({ url });
});

// POST /trakt/callback
router.post('/trakt/callback', auth, async (req, res) => {
    const { code } = req.body || {};
    if (!code || typeof code !== 'string') return res.status(400).json({ error: 'MISSING_CODE' });
    if (!CLIENT_ID || !CLIENT_SECRET) return res.status(503).json({ error: 'TRAKT_NOT_CONFIGURED' });
    try {
        const r = await fetch('https://trakt.tv/oauth/token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
        });
        if (!r.ok) return res.status(400).json({ error: 'TOKEN_EXCHANGE_FAILED' });
        const tokens = await r.json();

        const meR = await fetch(API + '/users/me', { headers: traktHeaders(tokens.access_token) });
        const me  = meR.ok ? await meR.json() : {};

        req.user.traktAccessToken  = tokens.access_token;
        req.user.traktRefreshToken = tokens.refresh_token;
        req.user.traktTokenExpiry  = new Date(Date.now() + tokens.expires_in * 1000);
        req.user.traktUsername     = me.username || null;
        await req.user.save();
        res.json({ connected: true, username: req.user.traktUsername });
    } catch (e) {
        res.status(500).json({ error: 'TRAKT_CALLBACK_FAILED' });
    }
});

// GET /trakt/status
router.get('/trakt/status', auth, (req, res) => {
    res.json({ connected: !!req.user.traktAccessToken, username: req.user.traktUsername || null });
});

// DELETE /trakt/disconnect
router.delete('/trakt/disconnect', auth, async (req, res) => {
    req.user.traktAccessToken  = null;
    req.user.traktRefreshToken = null;
    req.user.traktTokenExpiry  = null;
    req.user.traktUsername     = null;
    await req.user.save();
    res.json({ ok: true });
});

// POST /trakt/scrobble
router.post('/trakt/scrobble', auth, async (req, res) => {
    const { action, mediaType, imdb_id, tmdb_id, title, year, progress, season, episode } = req.body || {};
    if (!['start', 'pause', 'stop'].includes(action)) return res.status(400).json({ error: 'INVALID_ACTION' });
    if (!req.user.traktAccessToken) return res.json({ ok: false, reason: 'not_connected' });
    try {
        const token = await validToken(req.user);
        if (!token) return res.json({ ok: false, reason: 'no_token' });
        const pct = Math.max(0, Math.min(100, Math.round(progress || 0)));
        let body = { progress: pct };
        if (mediaType === 'movie') {
            body.movie = { title, year: year ? +year : undefined, ids: { imdb: imdb_id || undefined, tmdb: tmdb_id ? +tmdb_id : undefined } };
        } else {
            body.episode = { season: season || 1, number: episode || 1, ids: { imdb: imdb_id || undefined, tmdb: tmdb_id ? +tmdb_id : undefined } };
            body.show    = { title, year: year ? +year : undefined, ids: { imdb: imdb_id || undefined, tmdb: tmdb_id ? +tmdb_id : undefined } };
        }
        const r = await fetch(API + '/scrobble/' + action, {
            method: 'POST', headers: traktHeaders(token), body: JSON.stringify(body),
        });
        if (r.status === 409) return res.json({ ok: true, duplicate: true });
        const data = r.ok ? await r.json() : null;
        res.json({ ok: r.ok, action, data });
    } catch (e) {
        res.json({ ok: false, reason: 'error' });
    }
});

module.exports = router;

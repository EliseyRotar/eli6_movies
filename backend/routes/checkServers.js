const express = require('express');
const router  = express.Router();
const https   = require('https');
const http    = require('http');

const CACHE_TTL     = 30 * 60 * 1000; // 30 min
const PROBE_TIMEOUT = 5000;            // 5 s per probe
const MAX_BODY      = 8192;            // read first 8 KB of response

// Patterns found on generic "not found" / error pages
const NEG_RE = /\b(video\s+not\s+found|content\s+not\s+found|not\s+available|page\s+not\s+found|404\s+not\s+found|error\s+404|no\s+results\s+found)\b/i;

const cache = new Map();

function buildUrls({ type, tmdbId, imdbId, season, episode }) {
    const s    = parseInt(season)  || 1;
    const e    = parseInt(episode) || 1;
    const imdb = imdbId && String(imdbId).startsWith('tt') ? String(imdbId) : null;
    const tmdb = tmdbId ? String(tmdbId) : null;
    const mid  = imdb || tmdb;

    const u = {};

    if (mid) {
        u.vidsrcfyi = type === 'tv'
            ? `https://vidsrc.fyi/embed/tv/${mid}/${s}/${e}`
            : `https://vidsrc.fyi/embed/movie/${mid}`;
    }
    if (tmdb) {
        u.vixsrc = type === 'tv'
            ? `https://vixsrc.to/tv/${tmdb}/${s}/${e}`
            : `https://vixsrc.to/movie/${tmdb}`;
    }
    // SuperEmbed: &check=1 returns "1" (available) or "0" (unavailable)
    if (mid) {
        u.superembed = `https://multiembed.mov/?video_id=${mid}&check=1`;
    }
    if (tmdb) {
        u['2embed'] = type === 'tv'
            ? `https://www.2embed.stream/embed/tv/${tmdb}/${s}/${e}`
            : `https://www.2embed.stream/embed/movie/${tmdb}`;
        u.vidlink = type === 'tv'
            ? `https://vidlink.pro/tv/${tmdb}/${s}/${e}`
            : `https://vidlink.pro/movie/${tmdb}`;
        u.vidfast = type === 'tv'
            ? `https://vidfast.pro/tv/${tmdb}/${s}/${e}`
            : `https://vidfast.pro/movie/${tmdb}`;
        u.embedsu = type === 'tv'
            ? `https://embed.su/embed/tv/${tmdb}/${s}/${e}`
            : `https://embed.su/embed/movie/${tmdb}`;
        u.autoembed = type === 'tv'
            ? `https://autoembed.co/tv/tmdb/${tmdb}-${s}-${e}`
            : `https://autoembed.co/movie/tmdb/${tmdb}`;
        u.vidsrcme = type === 'tv'
            ? `https://vidsrcme.ru/embed/tv?tmdb=${tmdb}&season=${s}&episode=${e}`
            : `https://vidsrcme.ru/embed/movie?tmdb=${tmdb}`;
        u.smashystream = type === 'tv'
            ? `https://player.smashy.stream/tv/${tmdb}?s=${s}&e=${e}`
            : `https://player.smashy.stream/movie/${tmdb}`;
    }
    if (mid) {
        u.vidsrcrip = type === 'tv'
            ? `https://vidsrc.rip/embed/tv/${mid}/${s}/${e}`
            : `https://vidsrc.rip/embed/movie/${mid}`;
        u.vidsrccc = type === 'tv'
            ? `https://vidsrc.cc/v2/embed/tv/${mid}/${s}/${e}`
            : `https://vidsrc.cc/v2/embed/movie/${mid}`;
        u.apiplayer = type === 'tv'
            ? `https://apiplayer.ru/embed/tv/${mid}/${s}/${e}`
            : `https://apiplayer.ru/embed/movie/${mid}`;
        u.vaplayer = type === 'tv'
            ? `https://vaplayer.ru/embed/tv/${mid}/${s}/${e}`
            : `https://vaplayer.ru/embed/movie/${mid}`;
    }
    if (type === 'anime' && tmdb) {
        u['2anime'] = `https://vidsrc.rip/embed/anime/${tmdb}/${e}`;
    }
    return u;
}

function probe(key, url) {
    return new Promise((resolve) => {
        const t0      = Date.now();
        const mod     = url.startsWith('https') ? https : http;
        const isSE    = key === 'superembed';
        let body      = '';
        let settled   = false;

        const done = (r) => { if (!settled) { settled = true; resolve(r); } };

        let req;
        try {
            req = mod.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; ELI6ServerCheck/1.0)',
                    Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
                },
            }, (res) => {
                const status = res.statusCode;

                // SuperEmbed check=1: body is "0" or "1"
                if (isSE) {
                    res.on('data', c => { body += c.toString(); });
                    res.on('end', () => done({ key, available: body.trim() === '1', status, ms: Date.now() - t0, method: 'check-api' }));
                    return;
                }

                // Definitive 4xx/5xx → unavailable
                if (status >= 400) {
                    res.resume();
                    return done({ key, available: false, status, ms: Date.now() - t0 });
                }

                res.on('data', c => {
                    body += c.toString();
                    if (body.length >= MAX_BODY) req.destroy();
                });
                res.on('end', () => {
                    done({ key, available: !NEG_RE.test(body), status, ms: Date.now() - t0 });
                });
                res.on('error', () => done({ key, available: false, status, ms: Date.now() - t0 }));
            });
        } catch (err) {
            return done({ key, available: false, status: 0, ms: Date.now() - t0, err: err.message });
        }

        req.setTimeout(PROBE_TIMEOUT, () => {
            req.destroy();
            done({ key, available: false, status: 0, ms: PROBE_TIMEOUT, timedOut: true });
        });
        req.on('error', (err) => done({ key, available: false, status: 0, ms: Date.now() - t0, err: err.code }));
    });
}

router.get('/check-servers', async (req, res) => {
    const { type, id, imdb_id, season, episode } = req.query;
    if (!type || !id) return res.status(400).json({ error: 'type and id required' });

    const ck  = `${type}:${id}:${season || ''}:${episode || ''}`;
    const hit = cache.get(ck);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
        return res.json({ results: hit.results, cached: true });
    }

    const urls    = buildUrls({ type, tmdbId: id, imdbId: imdb_id, season, episode });
    const results = await Promise.all(Object.keys(urls).map(k => probe(k, urls[k])));

    // Available servers first, then by response time
    results.sort((a, b) => {
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.ms - b.ms;
    });

    cache.set(ck, { results, ts: Date.now() });

    // Prevent unbounded memory growth
    if (cache.size > 500) {
        const cutoff = Date.now() - CACHE_TTL;
        for (const [k, v] of cache) { if (v.ts < cutoff) cache.delete(k); }
    }

    return res.json({ results, cached: false });
});

module.exports = router;

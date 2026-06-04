const express = require('express');
const router = express.Router();

const JIKAN = 'https://api.jikan.moe/v4';
const TIMEOUT_MS = 12000;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let _cache = null;
let _cacheAt = 0;

router.get('/trending', async (req, res) => {
    if (_cache && (Date.now() - _cacheAt) < CACHE_TTL) {
        return res.json(_cache);
    }
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const r = await fetch(JIKAN + '/top/anime?limit=25&filter=airing', { signal: controller.signal })
            .finally(() => clearTimeout(timer));
        if (!r.ok) throw new Error('Jikan ' + r.status);
        const json = await r.json();
        // Filter out shorts, music videos, and specials — only keep TV series and ONAs
        const VALID_TYPES = new Set(['TV', 'ONA']);
        const items = (json.data || [])
            .filter(a => !a.type || VALID_TYPES.has(a.type))
            .slice(0, 20)
            .map(a => ({
                id:             String(a.mal_id),
                title:          a.title_english || a.title,
                poster_path:    a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
                overview:       a.synopsis || '',
                vote_average:   a.score || null,
                first_air_date: a.aired?.from ? a.aired.from.slice(0, 10) : '',
                link_url:       null,
            }));
        _cache = items;
        _cacheAt = Date.now();
        res.json(items);
    } catch (err) {
        if (_cache) return res.json(_cache); // serve stale cache on error
        res.status(502).json({ message: 'anime fetch failed', error: err.message });
    }
});

module.exports = router;

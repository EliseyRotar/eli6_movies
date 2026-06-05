const express = require('express');
const router = express.Router();

const ANILIST_URL = 'https://graphql.anilist.co';
const TIMEOUT_MS = 12000;
const CACHE_TTL = 5 * 60 * 1000;

let _cache = null;
let _cacheAt = 0;

const QUERY = `query {
  Page(perPage: 25) {
    media(type: ANIME, sort: TRENDING_DESC, status: RELEASING, format_in: [TV, ONA]) {
      id
      title { english romaji }
      coverImage { large }
      description(asHtml: false)
      averageScore
      startDate { year month day }
    }
  }
}`;

router.get('/trending', async (req, res) => {
    if (_cache && (Date.now() - _cacheAt) < CACHE_TTL) {
        return res.json(_cache);
    }
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const r = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ query: QUERY }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (!r.ok) throw new Error('AniList ' + r.status);
        const json = await r.json();
        const media = json?.data?.Page?.media || [];

        const items = media.slice(0, 20).map(a => {
            const sd = a.startDate;
            const dateStr = sd?.year
                ? [sd.year, String(sd.month || 1).padStart(2, '0'), String(sd.day || 1).padStart(2, '0')].join('-')
                : '';
            return {
                id:             a.id,
                title:          a.title?.english || a.title?.romaji || '',
                poster_path:    a.coverImage?.large || null,
                overview:       (a.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
                vote_average:   a.averageScore ? +(a.averageScore / 10).toFixed(1) : null,
                first_air_date: dateStr,
                type:           'anime',
                link_url:       null,
            };
        });

        _cache = items;
        _cacheAt = Date.now();
        res.json(items);
    } catch (err) {
        if (_cache) return res.json(_cache);
        res.status(502).json({ message: 'anime fetch failed', error: err.message });
    }
});

module.exports = router;

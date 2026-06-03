const express = require('express');
const router = express.Router();

const JIKAN = 'https://api.jikan.moe/v4';
const TIMEOUT_MS = 10000;

router.get('/trending', async (req, res) => {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const r = await fetch(JIKAN + '/top/anime?limit=20&filter=airing', { signal: controller.signal })
            .finally(() => clearTimeout(timer));
        if (!r.ok) throw new Error('Jikan ' + r.status);
        const json = await r.json();
        const items = (json.data || []).map(a => ({
            id:           String(a.mal_id),
            title:        a.title_english || a.title,
            poster_path:  a.images?.jpg?.large_image_url || a.images?.jpg?.image_url || null,
            overview:     a.synopsis || '',
            vote_average: a.score || null,
            first_air_date: a.aired?.from ? a.aired.from.slice(0, 10) : '',
            link_url:     null,
        }));
        res.json(items);
    } catch (err) {
        res.status(502).json({ message: 'anime fetch failed', error: err.message });
    }
});

module.exports = router;

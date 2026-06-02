const express = require('express');
const axios = require('axios');
const router = express.Router();

// Cache imdb → kinopoisk_id to avoid repeat lookups
const kpCache = new Map();

async function toKinopoiskId(imdbId) {
    if (kpCache.has(imdbId)) return kpCache.get(imdbId);
    const token = process.env.KP_API_TOKEN;
    if (!token) return null;
    try {
        const r = await axios.get('https://kinopoiskapiunofficial.tech/api/v2.2/films', {
            params: { imdbId },
            headers: { 'X-API-KEY': token },
            timeout: 5000,
        });
        const items = r.data?.items || r.data?.films || [];
        const kpId = items[0]?.kinopoiskId || items[0]?.filmId;
        if (kpId) kpCache.set(imdbId, String(kpId));
        return kpId ? String(kpId) : null;
    } catch {
        return null;
    }
}

function withHttps(url) {
    if (!url) return null;
    return url.startsWith('//') ? 'https:' + url : url;
}

// GET /api/embed/ru?server=kodik&imdb=tt1234567&season=1&episode=1
router.get('/ru', async (req, res) => {
    const { server, imdb, season = 1, episode = 1 } = req.query;
    if (!server || !imdb) {
        return res.status(400).json({ error: 'server and imdb params required' });
    }
    if (!/^tt\d{7,8}$/.test(imdb)) {
        return res.status(400).json({ error: 'Invalid IMDB ID format' });
    }

    const s = parseInt(season) || 1;
    const e = parseInt(episode) || 1;

    try {
        let url = null;

        if (server === 'kodik') {
            const token = process.env.KODIK_TOKEN;
            if (!token) return res.status(503).json({ error: 'KODIK_TOKEN not configured' });

            const r = await axios.get('https://kodikapi.com/search', {
                params: { token, imdb_id: imdb, limit: 1, with_episodes: 1 },
                timeout: 6000,
            });
            const link = r.data?.results?.[0]?.link;
            if (!link) return res.status(404).json({ error: 'Not found on Kodik' });
            const sep = link.includes('?') ? '&' : '?';
            url = withHttps(link) + sep + `season=${s}&episode=${e}`;

        } else if (server === 'bazon') {
            const token = process.env.BAZON_TOKEN;
            if (!token) return res.status(503).json({ error: 'BAZON_TOKEN not configured' });
            const kpId = await toKinopoiskId(imdb);
            if (!kpId) return res.status(404).json({ error: 'Kinopoisk ID lookup failed — set KP_API_TOKEN' });

            const r = await axios.get('https://bazon.cc/api/search', {
                params: { token, kp: kpId, s, e },
                timeout: 6000,
            });
            url = withHttps(r.data?.results?.[0]?.link);

        } else if (server === 'collaps') {
            const token = process.env.COLLAPS_TOKEN;
            if (!token) return res.status(503).json({ error: 'COLLAPS_TOKEN not configured' });
            const kpId = await toKinopoiskId(imdb);
            if (!kpId) return res.status(404).json({ error: 'Kinopoisk ID lookup failed — set KP_API_TOKEN' });

            const r = await axios.get('https://api.bhcesh.me/list', {
                params: { token, kinopoisk_id: kpId },
                timeout: 6000,
            });
            url = withHttps(r.data?.results?.[0]?.iframe_url);

        } else if (server === 'alloha') {
            const token = process.env.ALLOHA_TOKEN;
            if (!token) return res.status(503).json({ error: 'ALLOHA_TOKEN not configured' });
            const kpId = await toKinopoiskId(imdb);
            if (!kpId) return res.status(404).json({ error: 'Kinopoisk ID lookup failed — set KP_API_TOKEN' });

            const r = await axios.get('https://api.alloha.tv/', {
                params: { token, kp: kpId },
                timeout: 6000,
            });
            url = withHttps(r.data?.data?.iframe);

        } else if (server === 'hdvb') {
            const token = process.env.HDVB_TOKEN;
            if (!token) return res.status(503).json({ error: 'HDVB_TOKEN not configured' });
            const kpId = await toKinopoiskId(imdb);
            if (!kpId) return res.status(404).json({ error: 'Kinopoisk ID lookup failed — set KP_API_TOKEN' });

            const r = await axios.get('https://apivb.info/api/videos.json', {
                params: { token, id_kp: kpId },
                timeout: 6000,
            });
            url = withHttps(r.data?.[0]?.iframe_url);

        } else if (server === 'videocdn') {
            const token = process.env.VIDEOCDN_TOKEN;
            if (!token) return res.status(503).json({ error: 'VIDEOCDN_TOKEN not configured' });
            const kpId = await toKinopoiskId(imdb);
            if (!kpId) return res.status(404).json({ error: 'Kinopoisk ID lookup failed — set KP_API_TOKEN' });

            const r = await axios.get('https://videocdn.tv/api/short', {
                params: { api_token: token, kinopoisk_id: kpId },
                timeout: 6000,
            });
            url = withHttps(r.data?.data?.[0]?.iframe_src);

        } else {
            return res.status(400).json({ error: 'Unknown server' });
        }

        if (!url) return res.status(404).json({ error: 'No embed URL in API response' });
        res.json({ url });

    } catch (err) {
        const status = err.response?.status || 502;
        res.status(status).json({ error: 'Upstream error' });
    }
});

module.exports = router;

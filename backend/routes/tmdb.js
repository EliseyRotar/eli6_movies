const express = require('express');
const router = express.Router();
const tmdbClient = require('../services/tmdbClient');

const ALLOWED_TMDB_PREFIXES = [
    '/movie/', '/tv/', '/search/', '/person/', '/collection/',
    '/discover/', '/genre/', '/trending/', '/configuration',
    '/network/', '/keyword/', '/review/',
];

// Strip params that must never come from callers
const BLOCKED_PARAMS = new Set(['api_key', 'session_id', 'request_token', 'guest_session_id']);

router.get('/*', async (req, res) => {
    try {
        const endpoint = req.path;

        const allowed = ALLOWED_TMDB_PREFIXES.some(p => endpoint.startsWith(p));
        if (!allowed) {
            return res.status(403).json({ message: 'Endpoint not allowed' });
        }

        // Remove any caller-supplied sensitive params before forwarding
        const params = Object.fromEntries(
            Object.entries(req.query).filter(([k]) => !BLOCKED_PARAMS.has(k))
        );

        const data = await tmdbClient.fetchTMDB(endpoint, params);
        res.json(data);
    } catch (error) {
        res.status(error.status || 500).json({
            message: 'Error fetching data from TMDB',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

module.exports = router;

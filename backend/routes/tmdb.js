const express = require('express');
const router = express.Router();
const tmdbClient = require('../services/tmdbClient');

// Proxy all GET requests to TMDB
router.get('/*', async (req, res) => {
    try {
        const endpoint = req.path;
        // Pass all query parameters from the frontend to TMDB
        const params = req.query;

        const data = await tmdbClient.fetchTMDB(endpoint, params);
        res.json(data);
    } catch (error) {
        console.error('TMDB Proxy Error:', error);
        res.status(error.status || 500).json({
            message: 'Error fetching data from TMDB',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
});

module.exports = router;

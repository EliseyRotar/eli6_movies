const express = require('express');
const router = express.Router();
const axios = require('axios');

const ANIME_API = 'https://animeapi.skin';
const TIMEOUT_MS = 8000;

router.get('/trending', async (req, res) => {
    try {
        const r = await axios.get(ANIME_API + '/trending', { timeout: TIMEOUT_MS });
        res.json(r.data);
    } catch (err) {
        res.status(502).json({ message: 'Failed to fetch anime trending', error: err.message });
    }
});

module.exports = router;

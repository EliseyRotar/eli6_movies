const axios = require('axios');
const cache = require('../utils/cache');
const logger = require('../utils/logger');

const TMDB_API_KEY = process.env.TMDB_API_KEY;
if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY must be set');
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DEFAULT_LANGUAGE = process.env.TMDB_LANGUAGE || 'it-IT';
const HTTP_TIMEOUT_MS = Number(process.env.TMDB_TIMEOUT_MS || 8000);

async function fetchTMDB(endpoint, params = {}) {
    const cacheKey = `${endpoint}|${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            timeout: HTTP_TIMEOUT_MS,
            params: {
                api_key: TMDB_API_KEY,
                language: DEFAULT_LANGUAGE,
                ...params,
            },
        });
        cache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        logger.error('TMDB request failed', {
            endpoint,
            status: error.response?.status,
            data: error.response?.data,
        });
        const err = new Error('TMDB_REQUEST_FAILED');
        err.status = 502;
        throw err;
    }
}

module.exports = {
    fetchTMDB,
};

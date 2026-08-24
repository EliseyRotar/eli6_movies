require('dotenv').config();
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

const MIN = 60 * 1000;
function getTtl(endpoint) {
    if (endpoint.startsWith('/search/'))                        return 15 * MIN;
    if (/^\/trending\//.test(endpoint) || endpoint.startsWith('/discover/')) return 60 * MIN;
    if (endpoint.startsWith('/genre/') || endpoint === '/configuration') return 24 * 60 * MIN;
    return 6 * 60 * MIN; // movie/tv details, season info, etc.
}

async function fetchTMDB(endpoint, params = {}) {
    const cacheKey = `${endpoint}|${JSON.stringify(params)}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        logger.info('TMDB cache hit', { endpoint });
        return cached;
    }

    try {
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            timeout: HTTP_TIMEOUT_MS,
            params: {
                api_key: TMDB_API_KEY,
                language: DEFAULT_LANGUAGE,
                ...params,
            },
        });
        cache.set(cacheKey, response.data, getTtl(endpoint));
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

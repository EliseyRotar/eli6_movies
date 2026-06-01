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
        console.log(`[TMDB] Cache Hit: ${endpoint}`);
        return cached;
    }

    try {
        console.log(`[TMDB] Fetching: ${endpoint} with params:`, params);
        const response = await axios.get(`${TMDB_BASE_URL}${endpoint}`, {
            timeout: HTTP_TIMEOUT_MS,
            params: {
                api_key: TMDB_API_KEY,
                language: DEFAULT_LANGUAGE,
                ...params,
            },
        });
        const resultsCount = response.data.results ? response.data.results.length : (response.data ? 'object' : 0);
        console.log(`[TMDB] Success: ${endpoint} - Results: ${resultsCount}`);
        cache.set(cacheKey, response.data, getTtl(endpoint));
        return response.data;
    } catch (error) {
        console.error(`[TMDB] Error: ${endpoint}`, {
            status: error.response?.status,
            message: error.message
        });
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

const express = require('express');
const axios = require('axios');
const { fetchTMDB } = require('../services/tmdbClient');
const logger = require('../utils/logger');

const router = express.Router();

const MOVIE_CATEGORIES = ['now_playing', 'popular', 'top_rated', 'upcoming'];
const TV_CATEGORIES = ['airing_today', 'popular', 'top_rated', 'on_the_air'];
const TREND_MEDIA_TYPES = ['all', 'movie', 'tv', 'person'];
const TREND_WINDOWS = ['day', 'week'];

// VidSrc proxy (kept for compatibility, namespaced)
router.get('/catalog/vidsrc/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const response = await axios.get(`https://vidsrc.to/vapi/movie/${type}`, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });
        res.json(response.data);
    } catch (error) {
        logger.error('VidSrc fetch failed', { status: error.response?.status });
        res.status(500).json({ error: 'VIDSRC_ERROR' });
    }
});

router.get('/catalog/movies/:category', async (req, res, next) => {
    try {
        const { category } = req.params;
        const safeCategory = MOVIE_CATEGORIES.includes(category) ? category : 'popular';
        const data = await fetchTMDB(`/movie/${safeCategory}`);
        res.json(data.results || data);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/tv/:category', async (req, res, next) => {
    try {
        const { category } = req.params;
        const safeCategory = TV_CATEGORIES.includes(category) ? category : 'popular';
        const data = await fetchTMDB(`/tv/${safeCategory}`);
        res.json(data.results || data);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/trending/:mediaType/:timeWindow', async (req, res, next) => {
    try {
        const { mediaType, timeWindow } = req.params;
        const mt = TREND_MEDIA_TYPES.includes(mediaType) ? mediaType : 'all';
        const tw = TREND_WINDOWS.includes(timeWindow) ? timeWindow : 'day';
        const data = await fetchTMDB(`/trending/${mt}/${tw}`);
        res.json(data.results || data);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/tv/:id/seasons', async (req, res, next) => {
    try {
        const data = await fetchTMDB(`/tv/${req.params.id}`);
        res.json(data.seasons || []);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/movies/genres', async (_req, res, next) => {
    try {
        const data = await fetchTMDB('/genre/movie/list');
        res.json(data.genres || []);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/tv/genres', async (_req, res, next) => {
    try {
        const data = await fetchTMDB('/genre/tv/list');
        res.json(data.genres || []);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/tv/genre/:id', async (req, res, next) => {
    try {
        const data = await fetchTMDB('/discover/tv', {
            with_genres: req.params.id,
            sort_by: 'popularity.desc',
        });
        res.json(data.results || []);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/movies/details/:id', async (req, res, next) => {
    try {
        const data = await fetchTMDB(`/movie/${req.params.id}`);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/movies/:id/credits', async (req, res, next) => {
    try {
        const data = await fetchTMDB(`/movie/${req.params.id}/credits`);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/anime/popular', async (_req, res, next) => {
    try {
        const data = await fetchTMDB('/discover/tv', {
            with_keywords: 210024,
            sort_by: 'popularity.desc',
        });
        const mapped = (data.results || []).map((anime) => ({
            id: `tv/${anime.id}`,
            title: anime.name,
            english_title: anime.name,
            poster_path: anime.poster_path
                ? `https://image.tmdb.org/t/p/w500${anime.poster_path}`
                : null,
            overview: anime.overview,
            vote_average: anime.vote_average,
            first_air_date: anime.first_air_date,
            type: 'tv',
        }));
        res.json(mapped);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/anime/:id/episodes', async (req, res, next) => {
    try {
        const animeId = req.params.id;
        const [type, id] = animeId.split('/');
        if (!type || !id) return res.status(400).json({ error: 'INVALID_ID' });
        const data = await fetchTMDB(`/tv/${id}/season/1`);
        const mapped = (data.episodes || []).map((episode) => ({
            id: episode.id,
            title: episode.name,
            episode_number: episode.episode_number,
            overview: episode.overview,
            air_date: episode.air_date,
        }));
        res.json(mapped);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/anime/search', async (req, res, next) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ error: 'MISSING_QUERY' });
        const data = await fetchTMDB('/search/tv', { query, with_keywords: 210024 });
        const mapped = (data.results || []).map((anime) => ({
            id: `tv/${anime.id}`,
            title: anime.name,
            english_title: anime.name,
            poster_path: anime.poster_path
                ? `https://image.tmdb.org/t/p/w500${anime.poster_path}`
                : null,
            overview: anime.overview,
            vote_average: anime.vote_average,
            first_air_date: anime.first_air_date,
            type: 'tv',
        }));
        res.json(mapped);
    } catch (error) {
        next(error);
    }
});

router.get('/catalog/anime/category/:category', async (req, res, next) => {
    try {
        const { category } = req.params;
        const genreMap = {
            action: 28,
            adventure: 12,
            comedy: 35,
            drama: 18,
            fantasy: 14,
            horror: 27,
            romance: 10749,
            scifi: 878,
            'slice of life': 36,
            sports: 53,
            supernatural: 9648,
        };
        const genreId = genreMap[category.toLowerCase()];
        const endpoint = genreId ? '/discover/tv' : '/discover/tv';
        const params = {
            with_keywords: 210024,
            sort_by: 'popularity.desc',
            ...(genreId ? { with_genres: genreId } : {}),
        };
        const data = await fetchTMDB(endpoint, params);
        const mapped = (data.results || []).map((anime) => ({
            id: anime.id,
            title: anime.name,
            english_title: anime.name,
            poster_path: anime.poster_path
                ? `https://image.tmdb.org/t/p/w500${anime.poster_path}`
                : null,
            overview: anime.overview,
            vote_average: anime.vote_average,
            first_air_date: anime.first_air_date,
            episodes: anime.number_of_episodes || null,
            status: anime.status,
            airing: anime.in_production,
        }));
        res.json(mapped);
    } catch (error) {
        next(error);
    }
});

module.exports = router;

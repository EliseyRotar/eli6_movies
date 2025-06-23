const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fetch = require("node-fetch");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Environment variables
const TMDB_API_KEY = "c6d6b7a2b5266ea9062197d198e64d51"; // ✅ your real key here
// Get one from https://www.themoviedb.org/settings/api

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// In-memory cache object
const cache = {};

// Cache middleware
async function getCachedData(key, fetchFunction) {
    if (cache[key] && (Date.now() - cache[key].timestamp) < CACHE_DURATION) {
        return cache[key].data;
    }
    const data = await fetchFunction();
    cache[key] = {
        data,
        timestamp: Date.now()
    };
    return data;
}

// Search movies route
app.get("/api/search/movies", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
                query
            )}&api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch from TMDb" });
    }
});

// Search TV shows route
app.get("/api/search/tv", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(
                query
            )}&api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch from TMDb" });
    }
});

// Get movies by category
app.get("/api/movies/:category", async (req, res) => {
    const { category } = req.params;
    try {
        let endpoint;
        switch (category) {
            case 'now_playing':
                endpoint = 'now_playing';
                break;
            case 'popular':
                endpoint = 'popular';
                break;
            case 'top_rated':
                endpoint = 'top_rated';
                break;
            case 'upcoming':
                endpoint = 'upcoming';
                break;
            default:
                endpoint = 'popular';
        }

        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${endpoint}?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch movies" });
    }
});

// Get TV shows by category
app.get("/api/tv/:category", async (req, res) => {
    const { category } = req.params;
    try {
        let endpoint;
        switch (category) {
            case 'airing_today':
                endpoint = 'airing_today';
                break;
            case 'popular':
                endpoint = 'popular';
                break;
            case 'top_rated':
                endpoint = 'top_rated';
                break;
            case 'on_the_air':
                endpoint = 'on_the_air';
                break;
            default:
                endpoint = 'popular';
        }

        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/tv/${endpoint}?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch TV shows" });
    }
});

// Get trending content
app.get("/api/trending/:mediaType/:timeWindow", async (req, res) => {
    const { mediaType, timeWindow } = req.params;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/trending/${mediaType}/${timeWindow}?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch trending content" });
    }
});

// Get TV show seasons
app.get("/api/tv/:id/seasons", async (req, res) => {
    const showId = req.params.id;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/tv/${showId}?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.seasons);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch TV show seasons" });
    }
});

// Discover movies by genre
app.get("/api/movies/discover", async (req, res) => {
    const { with_genres } = req.query;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${with_genres}&sort_by=popularity.desc`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch movies by genre" });
    }
});

// Discover TV shows by genre
app.get("/api/tv/discover", async (req, res) => {
    const { with_genres } = req.query;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${with_genres}&sort_by=popularity.desc`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch TV shows by genre" });
    }
});

// Legacy search route for backward compatibility
app.get("/api/search", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing search query" });
    try {
        if (query === 'popular') {
            const tmdbRes = await axios.get(
                `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}`
            );
            res.json(tmdbRes.data.results);
        } else {
            const tmdbRes = await axios.get(
                `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
                    query
                )}&api_key=${TMDB_API_KEY}`
            );
            res.json(tmdbRes.data.results);
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch from TMDb" });
    }
});

// Get movie genres
app.get("/api/movies/genres", async (req, res) => {
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/genre/movie/list?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.genres);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch movie genres" });
    }
});

// Get TV show genres
app.get("/api/tv/genres", async (req, res) => {
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/genre/tv/list?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data.genres);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch TV show genres" });
    }
});

// Get TV shows by genre
app.get("/api/tv/genre/:id", async (req, res) => {
    const genreId = req.params.id;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_genres=${genreId}&sort_by=popularity.desc`
        );
        res.json(tmdbRes.data.results);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch TV shows by genre" });
    }
});

// Anime Routes

// Get popular anime
app.get("/api/anime/popular", async (req, res) => {
    try {
        const cacheKey = 'popular_anime';
        const animes = await getCachedData(cacheKey, async () => {
            // Try both movie and TV endpoints
            try {
                const response = await axios.get(
                    `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=210024&sort_by=popularity.desc`
                );
                console.log('TMDB Response:', response.data); // Debug log
                return response.data.results.map(anime => ({
                    id: `tv/${anime.id}`,
                    title: anime.name,
                    english_title: anime.name,
                    poster_path: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : null,
                    overview: anime.overview,
                    vote_average: anime.vote_average,
                    first_air_date: anime.first_air_date,
                    type: 'tv'
                }));
            } catch (error) {
                console.error('TMDB API Error:', error.response?.data || error.message);
                throw error;
            }
        });
        res.json(animes);
    } catch (err) {
        console.error('Error fetching popular anime:', err);
        res.status(500).json({ error: "Failed to fetch popular anime", details: err.message });
    }
});

// Get anime episodes
app.get("/api/anime/:id/episodes", async (req, res) => {
    const animeId = req.params.id;
    try {
        const [type, id] = animeId.split('/');
        if (!type || !id) {
            throw new Error('Invalid anime ID format');
        }

        const cacheKey = `anime_episodes_${animeId}`;
        const episodes = await getCachedData(cacheKey, async () => {
            const response = await axios.get(
                `https://api.themoviedb.org/3/tv/${id}/season/1?api_key=${TMDB_API_KEY}`
            );
            return response.data.episodes.map(episode => ({
                id: episode.id,
                title: episode.name,
                episode_number: episode.episode_number,
                overview: episode.overview,
                air_date: episode.air_date
            }));
        });
        res.json(episodes);
    } catch (err) {
        console.error('Error fetching anime episodes:', err);
        res.status(500).json({ error: "Failed to fetch episodes", details: err.message });
    }
});

// Search anime
app.get("/api/search/anime", async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    try {
        const cacheKey = `search_anime_${query}`;
        const animes = await getCachedData(cacheKey, async () => {
            const response = await axios.get(
                `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&with_keywords=210024`
            );
            return response.data.results.map(anime => ({
                id: `tv/${anime.id}`,
                title: anime.name,
                english_title: anime.name,
                poster_path: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : null,
                overview: anime.overview,
                vote_average: anime.vote_average,
                first_air_date: anime.first_air_date,
                type: 'tv'
            }));
        });
        res.json(animes);
    } catch (err) {
        console.error('Error searching anime:', err);
        res.status(500).json({ error: "Failed to search anime", details: err.message });
    }
});

// Get anime by category/genre
app.get("/api/anime/category/:category", async (req, res) => {
    const { category } = req.params;
    try {
        const cacheKey = `category_anime_${category}`;
        const animes = await getCachedData(cacheKey, async () => {
            let endpoint;
            // TMDB genre IDs
            const genreMap = {
                'action': 28,
                'adventure': 12,
                'comedy': 35,
                'drama': 18,
                'fantasy': 14,
                'horror': 27,
                'romance': 10749,
                'scifi': 878,
                'slice of life': 36,
                'sports': 53,
                'supernatural': 9648
            };

            const genreId = genreMap[category.toLowerCase()];
            if (category.toLowerCase() === 'all') {
                endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=210024&sort_by=popularity.desc`;
            } else if (genreId) {
                endpoint = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&with_keywords=210024&with_genres=${genreId}&sort_by=popularity.desc`;
            } else {
                throw new Error("Invalid category");
            }

            const response = await axios.get(endpoint);
            return response.data.results.map(anime => ({
                id: anime.id,
                title: anime.name,
                english_title: anime.name,
                poster_path: anime.poster_path ? `https://image.tmdb.org/t/p/w500${anime.poster_path}` : null,
                overview: anime.overview,
                vote_average: anime.vote_average,
                first_air_date: anime.first_air_date,
                episodes: anime.number_of_episodes || null,
                status: anime.status,
                airing: anime.in_production
            }));
        });
        res.json(animes);
    } catch (err) {
        console.error('Error fetching anime by category:', err);
        res.status(500).json({ error: "Failed to fetch anime by category" });
    }
});

// Get movie details
app.get("/api/movies/:id", async (req, res) => {
    const movieId = req.params.id;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data);
    } catch (err) {
        console.error('Error fetching movie details:', err);
        res.status(500).json({ error: "Failed to fetch movie details" });
    }
});

// Get movie credits
app.get("/api/movies/:id/credits", async (req, res) => {
    const movieId = req.params.id;
    try {
        const tmdbRes = await axios.get(
            `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
        );
        res.json(tmdbRes.data);
    } catch (err) {
        console.error('Error fetching movie credits:', err);
        res.status(500).json({ error: "Failed to fetch movie credits" });
    }
});

// Translation API using LibreTranslate
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000';

// Language code mapping for LibreTranslate
const languageCodeMap = {
    'en': 'en',
    'it': 'it',
    'ru': 'ru'
};

// Translate single text
app.post("/api/translation/translate", async (req, res) => {
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Missing text or target language" });
    }

    if (targetLanguage === 'en') {
        return res.json({ translation: text }); // No translation needed for English
    }

    try {
        const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: 'en',
                target: languageCodeMap[targetLanguage] || targetLanguage,
                format: 'text'
            })
        });

        if (!response.ok) {
            throw new Error(`LibreTranslate API error: ${response.status}`);
        }

        const result = await response.json();
        res.json({ translation: result.translatedText });
    } catch (error) {
        console.error('Translation error:', error);
        res.status(500).json({
            error: "Translation failed",
            details: error.message,
            fallback: text
        });
    }
});

// Translate batch of texts
app.post("/api/translation/translate-batch", async (req, res) => {
    const { texts, targetLanguage } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLanguage) {
        return res.status(400).json({ error: "Missing texts array or target language" });
    }

    if (targetLanguage === 'en') {
        return res.json({ translations: texts }); // No translation needed for English
    }

    try {
        const translations = [];

        // Process texts in batches to avoid overwhelming the API
        const batchSize = 5;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            // Translate each text in the batch
            for (const text of batch) {
                try {
                    const response = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            q: text,
                            source: 'en',
                            target: languageCodeMap[targetLanguage] || targetLanguage,
                            format: 'text'
                        })
                    });

                    if (response.ok) {
                        const result = await response.json();
                        translations.push(result.translatedText);
                    } else {
                        console.warn(`Translation failed for text: ${text}`);
                        translations.push(text); // Fallback to original text
                    }
                } catch (error) {
                    console.error(`Error translating text "${text}":`, error);
                    translations.push(text); // Fallback to original text
                }

                // Add small delay to be respectful to the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        res.json({ translations });
    } catch (error) {
        console.error('Batch translation error:', error);
        res.status(500).json({
            error: "Batch translation failed",
            details: error.message,
            fallback: texts
        });
    }
});

// Get supported languages from LibreTranslate
app.get("/api/translation/languages", async (req, res) => {
    try {
        const response = await fetch(`${LIBRETRANSLATE_URL}/languages`);
        if (!response.ok) {
            throw new Error(`LibreTranslate API error: ${response.status}`);
        }

        const languages = await response.json();
        res.json(languages);
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({
            error: "Failed to fetch languages",
            details: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
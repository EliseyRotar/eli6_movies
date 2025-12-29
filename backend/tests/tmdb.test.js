const request = require('supertest');
const express = require('express');
const tmdbRoutes = require('../routes/tmdb');

// Mock tmdbClient
jest.mock('../services/tmdbClient', () => ({
    fetchTMDB: jest.fn()
}));

const { fetchTMDB } = require('../services/tmdbClient');

const app = express();
app.use(express.json());
app.use('/api/tmdb', tmdbRoutes);

describe('TMDB Proxy Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/tmdb/movie/:id', () => {
        it('should fetch movie details successfully', async () => {
            const mockMovie = { id: 123, title: 'Test Movie' };
            fetchTMDB.mockResolvedValue(mockMovie);

            const res = await request(app).get('/api/tmdb/movie/123');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockMovie);
            expect(fetchTMDB).toHaveBeenCalledWith('/movie/123', expect.any(Object));
        });

        it('should handle TMDB errors', async () => {
            const error = new Error('TMDB Error');
            error.status = 404;
            fetchTMDB.mockRejectedValue(error);

            const res = await request(app).get('/api/tmdb/movie/999');

            expect(res.statusCode).toBe(404); // Proxy should return upstream status
        });
    });

    describe('GET /api/tmdb/search/movie', () => {
        it('should search for movies', async () => {
            const mockResults = { results: [{ id: 1, title: 'Found Movie' }] };
            fetchTMDB.mockResolvedValue(mockResults);

            const res = await request(app).get('/api/tmdb/search/movie?query=test');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mockResults);
            expect(fetchTMDB).toHaveBeenCalledWith('/search/movie', expect.objectContaining({ query: 'test' }));
        });
    });
});

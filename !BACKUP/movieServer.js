const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Make sure to install this: npm install node-fetch

const app = express();

app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://127.0.0.1:35193'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Sample movie data
const movies = {
    popular: [
        {
            id: 1,
            title: "Sample Movie 1",
            overview: "This is a sample movie description.",
            poster_path: "/sample1.jpg",
            backdrop_path: "/backdrop1.jpg",
            vote_average: 8.5,
            release_date: "2024-01-01",
            genre_ids: [28, 12, 878]
        },
        {
            id: 2,
            title: "Sample Movie 2",
            overview: "Another exciting movie description.",
            poster_path: "/sample2.jpg",
            backdrop_path: "/backdrop2.jpg",
            vote_average: 7.9,
            release_date: "2024-01-15",
            genre_ids: [18, 53]
        }
    ],
    trending: [
        {
            id: 3,
            title: "Trending Movie 1",
            overview: "This is a trending movie description.",
            poster_path: "/trending1.jpg",
            backdrop_path: "/backdrop3.jpg",
            vote_average: 7.8,
            release_date: "2024-02-01",
            genre_ids: [28, 12]
        },
        {
            id: 4,
            title: "Trending Movie 2",
            overview: "Another trending movie description.",
            poster_path: "/trending2.jpg",
            backdrop_path: "/backdrop4.jpg",
            vote_average: 8.2,
            release_date: "2024-02-15",
            genre_ids: [18, 10749]
        }
    ]
};

// Genre data
const genres = [
    { id: 28, name: "Action" },
    { id: 12, name: "Adventure" },
    { id: 16, name: "Animation" },
    { id: 35, name: "Comedy" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentary" },
    { id: 18, name: "Drama" },
    { id: 10751, name: "Family" },
    { id: 14, name: "Fantasy" },
    { id: 36, name: "History" },
    { id: 27, name: "Horror" },
    { id: 10402, name: "Music" },
    { id: 9648, name: "Mystery" },
    { id: 10749, name: "Romance" },
    { id: 878, name: "Science Fiction" },
    { id: 53, name: "Thriller" },
    { id: 10752, name: "War" },
    { id: 37, name: "Western" }
];

// TV show data
const tvShows = [
    {
        id: 102,
        name: "Stranger Things",
        overview: "When a young boy disappears, his mother, a police chief, and his friends must confront terrifying supernatural forces in order to get him back.",
        poster_path: "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
        backdrop_path: "/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
        vote_average: 8.7,
        first_air_date: "2016-07-15",
        genre_ids: [18, 9648, 10765],
        number_of_seasons: 4,
        seasons: [
            {
                season_number: 1,
                episode_count: 8,
                episodes: [
                    { episode_number: 1, name: "Chapter One: The Vanishing of Will Byers", overview: "On his way home from a friend's house, young Will sees something terrifying. Nearby, a sinister secret lurks in the depths of a government lab." },
                    { episode_number: 2, name: "Chapter Two: The Weirdo on Maple Street", overview: "Lucas, Mike and Dustin try to talk to the girl they found in the woods. Hopper questions an anxious Joyce about an unsettling phone call." },
                    { episode_number: 3, name: "Chapter Three: Holly, Jolly", overview: "An increasingly concerned Nancy looks for Barb and finds out what Jonathan's been up to. Joyce is convinced Will is trying to talk to her." },
                    { episode_number: 4, name: "Chapter Four: The Body", overview: "Refusing to believe Will is dead, Joyce tries to connect with her son. The boys give Eleven a makeover. Jonathan and Nancy form an unlikely alliance." }
                ]
            },
            {
                season_number: 2,
                episode_count: 9,
                episodes: [
                    { episode_number: 1, name: "Chapter One: MADMAX", overview: "As the town preps for Halloween, a high-scoring rival shakes things up at the arcade, and a skeptical Hopper inspects a field of rotting pumpkins." },
                    { episode_number: 2, name: "Chapter Two: Trick or Treat, Freak", overview: "After Will sees something terrible on trick-or-treat night, Mike wonders whether Eleven's still out there. Nancy wrestles with the truth about Barb." }
                ]
            }
        ]
    },
    {
        id: 103,
        name: "Rick and Morty",
        overview: "An animated series that follows the exploits of a super scientist and his not-so-bright grandson.",
        poster_path: "https://image.tmdb.org/t/p/w500/8kOWDBK6XlPUzckuHDo3wwVRFwt.jpg",
        backdrop_path: "/eV3XnUul4UfIivz3kxgeIozeo50.jpg",
        vote_average: 8.9,
        first_air_date: "2013-12-02",
        genre_ids: [16, 35, 10765],
        number_of_seasons: 6,
        seasons: [
            {
                season_number: 1,
                episode_count: 11,
                episodes: [
                    { episode_number: 1, name: "Pilot", overview: "Rick moves in with his daughter's family and establishes himself as a bad influence on his grandson, Morty." },
                    { episode_number: 2, name: "Lawnmower Dog", overview: "Rick helps Jerry with the dog and Morty incepts his math teacher." },
                    { episode_number: 3, name: "Anatomy Park", overview: "Rick shrinks Morty and Summer and puts them inside a homeless man to save Christmas." },
                    { episode_number: 4, name: "M. Night Shaym-Aliens!", overview: "Rick and Morty are captured by aliens and put in a simulation." }
                ]
            },
            {
                season_number: 2,
                episode_count: 10,
                episodes: [
                    { episode_number: 1, name: "A Rickle in Time", overview: "Rick, Morty, and Summer deal with the consequences of freezing time." },
                    { episode_number: 2, name: "Mortynight Run", overview: "Rick and Morty go to a futuristic arcade, and Jerry gets a job." }
                ]
            }
        ]
    }
];

// --- API ROUTES ---

// Movies
app.get('/api/movies/popular', (req, res) => res.json(movies.popular));
app.get('/api/trending/movie/week', (req, res) => res.json(movies.trending));
app.get('/api/movies/now_playing', (req, res) => res.json(movies.popular));

// TV Shows
app.get('/api/trending/tv/week', (req, res) => res.json(tvShows));
app.get('/api/tv/top_rated', (req, res) => res.json(tvShows));
app.get('/api/tv/:id', (req, res) => {
    const show = tvShows.find(s => s.id === parseInt(req.params.id));
    if (!show) return res.status(404).json({ error: 'Show not found' });
    res.json(show);
});
app.get('/api/tv/:id/season/:seasonNumber', (req, res) => {
    const show = tvShows.find(s => s.id === parseInt(req.params.id));
    if (!show) return res.status(404).json({ error: 'Show not found' });
    const season = show.seasons.find(s => s.season_number === parseInt(req.params.seasonNumber));
    if (!season) return res.status(404).json({ error: 'Season not found' });
    res.json(season);
});

// Genres
app.get('/api/movies/genres', (req, res) => res.json(genres));

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Movie server running on port ${PORT}`);
});

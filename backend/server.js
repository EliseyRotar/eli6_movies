require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require('./db');

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const catalogRoutes = require('./routes/catalog');
const translationRoutes = require('./routes/translation');
const tmdbRoutes = require('./routes/tmdb');

const app = express();
app.set('trust proxy', true);

const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://localhost:5173'
).split(',').map(o => o.trim());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (/\.vercel\.app$/.test(origin) || /\.netlify\.app$/.test(origin) || /\.onrender\.com$/.test(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);

app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());

// Mount routers
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);
app.use('/api', catalogRoutes);
app.use('/api', translationRoutes);
app.use('/api/tmdb', tmdbRoutes);

app.use('/api/v1', authRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', catalogRoutes);
app.use('/api/v1', translationRoutes);
app.use('/api/v1/tmdb', tmdbRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

// Connect to MongoDB then start server (skip when imported as serverless function)
if (require.main === module) {
    connectDB()
        .then(() => {
            const PORT = process.env.PORT || 3000;
            app.listen(PORT, '0.0.0.0', () => {
                // eslint-disable-next-line no-console
                console.log(`Server running on port ${PORT}`);
            });
        })
        .catch((err) => {
            // eslint-disable-next-line no-console
            console.error('Failed to connect to MongoDB:', err.message);
            process.exit(1);
        });
}

module.exports = app;

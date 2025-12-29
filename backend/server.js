require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

// const rateLimit = require('./middleware/rateLimit'); // Rate limiting disabled
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const catalogRoutes = require('./routes/catalog');
const translationRoutes = require('./routes/translation');
const tmdbRoutes = require('./routes/tmdb');

const app = express();
app.set('trust proxy', true);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5500,https://streaming.ecolens.me').split(',');
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://api.themoviedb.org", "https://plausible.io"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                imgSrc: ["'self'", "data:", "https://image.tmdb.org", "https://via.placeholder.com"],
                connectSrc: ["'self'", "https://api.themoviedb.org", "https://api.jikan.moe", "https://vidsrc.to", "https://vixsrc.to"],
                fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'self'", "https://vidsrc.to", "https://vixsrc.to"],
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
);
app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
// app.use(rateLimit); // Rate limiting disabled

// Mount routers (support both /api and /api/v1 prefixes for compatibility/versioning)
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

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
    // eslint-disable-next-line no-console
    console.log(`Server is running on 127.0.0.1:${PORT}`);
});

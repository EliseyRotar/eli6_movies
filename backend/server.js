require('dotenv').config();

// Sentry has to be initialised before any other require that we want to
// instrument (express, mongoose, http). No-op when SENTRY_DSN isn't set.
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.1),
        sendDefaultPii: false,
        release: process.env.RENDER_GIT_COMMIT || undefined,
    });
}

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require('./db');

const rateLimit = require('./middleware/rateLimit');
const csrfProtect = require('./middleware/csrf');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const googleAuthRoutes = require('./routes/googleAuth');
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const catalogRoutes = require('./routes/catalog');
const translationRoutes = require('./routes/translation');
const tmdbRoutes  = require('./routes/tmdb');
const animeRoutes = require('./routes/anime');
const ruembedRoutes = require('./routes/ruembed');
const { router: trackRoutes } = require('./routes/track');
const analyticsRoutes    = require('./routes/analytics');
const passwordResetRoutes = require('./routes/passwordReset');
const cronRoutes          = require('./routes/cron');
const contactRoutes       = require('./routes/contact');
const traktRoutes = require('./routes/trakt');
const auth = require('./middleware/auth');
const { startBot } = require('./discord/bot');

const app = express();
// Render runs behind multiple internal proxy hops (all RFC1918, 10.x/192.168.x/172.16-31.x).
// Trust only those private ranges + loopback — public IPs sending forged
// X-Forwarded-For headers are NOT trusted, so req.ip can't be spoofed
// (defeats rate-limit bypass via XFF injection).
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://localhost:5173'
).split(',').map(o => o.trim());

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
};

app.use(
    helmet({
        // Backend renders JSON + occasional HTML for error/health pages only.
        // Strict CSP so any reflected payload can't execute inline JS.
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                frameAncestors: ["'none'"],
            },
        },
        // COEP not enabled because the frontend embeds cross-origin video
        // providers; reintroducing this would break the player iframes.
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
app.use(csrfProtect);
app.use(rateLimit);
app.use(express.json({ limit: '200kb' }));
app.use(express.text({ limit: '20kb', type: 'text/plain' }));
app.use(cookieParser());

// Health check — must be registered before any auth-protected routers
app.get('/', (req, res) => res.json({ status: 'ok', service: 'ELI6 Movies API', version: '1.0' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Mount routers
app.use('/api', authRoutes);
app.use('/api', googleAuthRoutes);
app.use('/api', userRoutes);
app.use('/api', adminRoutes);
app.use('/api', catalogRoutes);
app.use('/api', translationRoutes);
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/embed', auth, ruembedRoutes);
app.use('/api', trackRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', passwordResetRoutes);
app.use('/api', cronRoutes);
app.use('/api', contactRoutes);
app.use('/api', traktRoutes);

// Sentry's express error handler must come BEFORE the app's errorHandler so
// exceptions thrown in route handlers are captured before we send the JSON
// response. No-op when SENTRY_DSN is unset (Sentry.init was a no-op too).
if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}
app.use(errorHandler);

// Start HTTP server immediately, connect DB in background with retries
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        // eslint-disable-next-line no-console
        console.log(`Server running on port ${PORT}`);
    });

    (async function connectWithRetry(attempt = 1) {
        try {
            await connectDB();
            // eslint-disable-next-line no-console
            console.log('MongoDB connected');
            startBot(process.env.DISCORD_TOKEN);
        } catch (err) {
            const delay = Math.min(attempt * 5000, 60000);
            // eslint-disable-next-line no-console
            console.error(`MongoDB connection failed (attempt ${attempt}): ${err.message}. Retrying in ${delay / 1000}s...`);
            setTimeout(() => connectWithRetry(attempt + 1), delay);
        }
    })();
}

module.exports = app; // v2


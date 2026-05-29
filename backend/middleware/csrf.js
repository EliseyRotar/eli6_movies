const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://localhost:5173'
).split(',').map(o => o.trim());

function csrfProtect(req, res, next) {
    if (!MUTATIONS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (!origin) return next(); // non-browser client (curl, mobile app, server-to-server)
    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
    next();
}

module.exports = csrfProtect;

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const allowedOrigins = (
    process.env.FRONTEND_ORIGIN || 'http://localhost:5500,http://localhost:5173'
).split(',').map(o => o.trim());

function csrfProtect(req, res, next) {
    if (!MUTATIONS.has(req.method)) return next();
    const origin = req.headers.origin;
    if (!origin) {
        // No Origin: check Referer as fallback — if present and not allowed, block
        const referer = req.headers.referer;
        if (referer) {
            let refOrigin;
            try { refOrigin = new URL(referer).origin; } catch (_) { refOrigin = ''; }
            if (!allowedOrigins.includes(refOrigin)) {
                return res.status(403).json({ error: 'FORBIDDEN' });
            }
        }
        return next(); // no Origin and no Referer = non-browser (curl, mobile, server-to-server)
    }
    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'FORBIDDEN' });
    }
    next();
}

module.exports = csrfProtect;

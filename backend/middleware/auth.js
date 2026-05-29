const { verifyToken } = require('../utils/jwt');
const userService = require('../services/userService');

async function auth(req, res, next) {
    try {
        const cookieToken = req.cookies && req.cookies.token;
        const headerToken = req.header('Authorization')
            ? req.header('Authorization').replace('Bearer ', '')
            : null;
        const token = cookieToken || headerToken;
        if (!token) {
            return res.status(401).json({ error: 'AUTH_REQUIRED' });
        }

        const decoded = verifyToken(token);
        const user = await userService.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ error: 'USER_NOT_FOUND' });
        }

        if (!decoded.jti) {
            return res.status(401).json({ error: 'SESSION_INVALID' });
        }
        const session = user.sessions.find(s => s.jti === decoded.jti);
        if (!session) {
            return res.status(401).json({ error: 'SESSION_REVOKED' });
        }
        // update lastSeen without blocking the request
        session.lastSeen = new Date();
        user.save().catch(() => {});

        req.user = user;
        req.jti = decoded.jti || null;
        req.userRole = user.role;
        return next();
    } catch (error) {
        const status = error.code === 'TOKEN_EXPIRED' ? 401 : 401;
        return res.status(status).json({ error: error.code || 'AUTH_ERROR' });
    }
}

module.exports = auth;

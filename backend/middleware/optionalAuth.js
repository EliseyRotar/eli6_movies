const { verifyToken } = require('../utils/jwt');
const userService = require('../services/userService');

async function optionalAuth(req, res, next) {
    try {
        const token =
            (req.cookies && req.cookies.token) ||
            (req.header('Authorization') || '').replace('Bearer ', '') ||
            null;
        if (token) {
            const decoded = verifyToken(token);
            const user = await userService.findById(decoded.userId);
            if (user && decoded.jti && user.sessions.find(s => s.jti === decoded.jti)) {
                req.user = user;
            }
        }
    } catch (_) { /* invalid token — proceed anonymously */ }
    next();
}

module.exports = optionalAuth;

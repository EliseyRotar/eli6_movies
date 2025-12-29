function adminOnly(req, res, next) {
    if (!req.userRole || req.userRole !== 'admin') {
        return res.status(403).json({ error: 'ADMIN_ONLY' });
    }
    return next();
}

module.exports = adminOnly;

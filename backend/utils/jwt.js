const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET must be set');
}

const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

function createToken(payload, options = {}) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: DEFAULT_EXPIRES_IN, ...options });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        const code = error?.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
        const err = new Error(code);
        err.code = code;
        throw err;
    }
}

module.exports = {
    createToken,
    verifyToken,
};

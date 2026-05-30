const express = require('express');
const crypto = require('crypto');
const { createToken } = require('../utils/jwt');
const { verifyToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const {
    validateEmail,
    validatePassword,
    validateNewPassword,
    validateUsername,
    normalizeEmail,
} = require('../utils/validators');
const userService = require('../services/userService');
const ActivityLog = require('../models/ActivityLog');
const { sendEmail, verifyEmailTemplate, APP_URL } = require('../utils/mailer');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieBase = {
    httpOnly: true,
    // none required for cross-origin (Vercel frontend ↔ Render backend)
    sameSite: isProd ? 'none' : 'strict',
    secure: isProd,
    maxAge: Number(process.env.JWT_COOKIE_MAX_AGE || 15 * 60 * 1000),
};

function sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    const { password, __v, ...safe } = obj;
    return safe;
}

router.post('/register', async (req, res, next) => {
    try {
        const { username, email, password } = req.body || {};
        if (!validateUsername(username) || !validateEmail(email) || !validateNewPassword(password)) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }

        const existing = await userService.findByEmail(email);
        if (existing) {
            return res.status(400).json({ error: 'USER_EXISTS' });
        }

        const user = await userService.createUser({
            username: username.trim(),
            email: normalizeEmail(email),
            password,
        });

        const jti = crypto.randomUUID();
        const token = createToken({ userId: user._id, jti });
        user.sessions.push({ jti, ua: req.headers['user-agent'] || '', ip: req.ip || '' });
        if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
        await user.save();
        ActivityLog.create({
            userId: user._id, username: user.username, email: user.email,
            event: 'register', ip: req.ip || '', userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});

        // Send email verification (non-blocking — failure doesn't affect registration)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.emailVerified = false;
        await user.save();
        const verifyUrl = `${APP_URL}/verify-email.html?token=${verificationToken}`;
        sendEmail({
            to:      user.email,
            subject: 'Verify your ELI6 Movies email',
            html:    verifyEmailTemplate(user.username, verifyUrl),
        }).catch(() => {});

        res.cookie('token', token, cookieBase)
            .status(201)
            .json({ token, user: sanitizeUser(user) });
    } catch (error) {
        logger.error('Register failed', { error: error.message });
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        if (!validateEmail(email) || !validatePassword(password)) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }

        const user = await userService.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        const isMatch = await userService.verifyPassword(user, password);
        if (!isMatch) {
            return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        }

        const jti = crypto.randomUUID();
        const token = createToken({ userId: user._id, jti });
        user.sessions.push({ jti, ua: req.headers['user-agent'] || '', ip: req.ip || '' });
        if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
        await user.save();
        ActivityLog.create({
            userId: user._id, username: user.username, email: user.email,
            event: 'login', ip: req.ip || '', userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});
        res.cookie('token', token, cookieBase).json({ token, user: sanitizeUser(user) });
    } catch (error) {
        logger.error('Login failed', { error: error.message });
        next(error);
    }
});

router.post('/logout', async (req, res) => {
    try {
        const cookieToken = req.cookies && req.cookies.token;
        const headerToken = req.header('Authorization') ? req.header('Authorization').replace('Bearer ', '') : null;
        const token = cookieToken || headerToken;
        if (token) {
            try {
                const decoded = verifyToken(token);
                if (decoded.jti && decoded.userId) {
                    const userService = require('../services/userService');
                    const user = await userService.findById(decoded.userId);
                    if (user) {
                        user.sessions = user.sessions.filter(s => s.jti !== decoded.jti);
                        await user.save();
                    }
                }
            } catch (_) { /* token already invalid — just clear the cookie */ }
        }
    } catch (_) {}
    res.clearCookie('token', { ...cookieBase, maxAge: 0 }).json({ message: 'LOGGED_OUT' });
});

// POST /auth/resend-verification
router.post('/auth/resend-verification', async (req, res) => {
    const { email } = req.body || {};
    const OK = { message: 'If that account exists and is unverified, a new email has been sent.' };
    if (!email || typeof email !== 'string') return res.json(OK);

    try {
        const user = await userService.findByEmail(email.trim().toLowerCase());
        if (!user || user.emailVerified) return res.json(OK);

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        await user.save();
        const verifyUrl = `${APP_URL}/verify-email.html?token=${verificationToken}`;
        sendEmail({
            to:      user.email,
            subject: 'Verify your ELI6 Movies email',
            html:    verifyEmailTemplate(user.username, verifyUrl),
        }).catch(() => {});
    } catch (_) {}

    res.json(OK);
});

// GET /auth/verify-email?token=...
router.get('/auth/verify-email', async (req, res) => {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ error: 'MISSING_TOKEN' });

    try {
        const user = await userService.findOne({ verificationToken: token });
        if (!user) return res.status(400).json({ error: 'TOKEN_INVALID' });
        user.emailVerified     = true;
        user.verificationToken = null;
        await user.save();
        res.json({ message: 'EMAIL_VERIFIED' });
    } catch (err) {
        logger.error('Email verification failed', { error: err.message });
        res.status(500).json({ error: 'VERIFY_FAILED' });
    }
});

module.exports = router;

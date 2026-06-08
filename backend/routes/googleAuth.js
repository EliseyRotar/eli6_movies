const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { createToken } = require('../utils/jwt');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const logger = require('../utils/logger');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const APP_URL = process.env.APP_URL || 'https://eli6movies.vercel.app';

const cookieBase = {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'strict',
    secure: isProd,
    maxAge: Number(process.env.JWT_COOKIE_MAX_AGE || 90 * 24 * 60 * 60 * 1000),
};

// The state cookie carries a single-use CSRF nonce + the post-login redirect
// target. 10-minute expiry — covers a slow Google consent flow without giving
// a stale link forever to use.
const STATE_COOKIE = 'eli6_oauth_state';
const STATE_MAX_AGE = 10 * 60 * 1000;

function configured() {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri() {
    return process.env.GOOGLE_REDIRECT_URI
        || `${process.env.BACKEND_URL || 'https://eli6movies.onrender.com'}/api/auth/google/callback`;
}

function safeReturnTo(raw) {
    // Only allow returning to a same-origin path on the configured frontend
    // — never to an external host, no protocol-relative URLs.
    if (typeof raw !== 'string' || !raw.startsWith('/')) return '/';
    if (raw.startsWith('//')) return '/';
    return raw;
}

// Step 1: kick off the OAuth flow.
router.get('/auth/google/start', (req, res) => {
    if (!configured()) {
        return res.status(503).json({ error: 'GOOGLE_OAUTH_NOT_CONFIGURED' });
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    const returnTo = safeReturnTo(req.query.returnTo);
    const statePayload = `${nonce}.${Buffer.from(returnTo).toString('base64url')}`;

    res.cookie(STATE_COOKIE, statePayload, {
        httpOnly: true,
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd,
        maxAge: STATE_MAX_AGE,
        path: '/api/auth/google',
    });

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', redirectUri());
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'openid email profile');
    url.searchParams.set('state', statePayload);
    url.searchParams.set('access_type', 'online');
    url.searchParams.set('prompt', 'select_account');

    res.redirect(url.toString());
});

// Step 2: Google bounces back here with ?code=&state=.
router.get('/auth/google/callback', async (req, res) => {
    try {
        if (!configured()) {
            return res.status(503).json({ error: 'GOOGLE_OAUTH_NOT_CONFIGURED' });
        }

        const { code, state } = req.query || {};
        const stateCookie = req.cookies && req.cookies[STATE_COOKIE];
        res.clearCookie(STATE_COOKIE, { path: '/api/auth/google' });

        if (!code || !state || !stateCookie || state !== stateCookie) {
            return res.redirect(`${APP_URL}/account.html?error=oauth_state`);
        }

        const [, returnToB64] = String(state).split('.');
        const returnTo = returnToB64
            ? safeReturnTo(Buffer.from(returnToB64, 'base64url').toString('utf8'))
            : '/';

        // Exchange the code for tokens.
        const tokenResp = await axios.post(
            'https://oauth2.googleapis.com/token',
            new URLSearchParams({
                code,
                client_id:     process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri:  redirectUri(),
                grant_type:    'authorization_code',
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 8000,
            }
        );

        const { access_token: accessToken, id_token: idToken } = tokenResp.data || {};
        if (!accessToken) {
            logger.warn('Google token exchange returned no access_token');
            return res.redirect(`${APP_URL}/account.html?error=oauth_token`);
        }

        // Fetch the user profile. (We could decode the id_token JWT, but a
        // userinfo call sidesteps having to verify Google's signing keys here.)
        const profileResp = await axios.get(
            'https://openidconnect.googleapis.com/v1/userinfo',
            { headers: { Authorization: `Bearer ${accessToken}` }, timeout: 8000 }
        );

        const profile = profileResp.data || {};
        const googleId = profile.sub;
        const email = (profile.email || '').toLowerCase();
        const emailVerified = profile.email_verified === true;
        const name = profile.name || profile.given_name || (email ? email.split('@')[0] : '');

        if (!googleId || !email || !emailVerified) {
            return res.redirect(`${APP_URL}/account.html?error=oauth_profile`);
        }

        // Resolve to a user: existing googleId, then existing email, then create.
        let user = await User.findOne({ googleId });
        if (!user) {
            const byEmail = await User.findOne({ email });
            if (byEmail) {
                byEmail.googleId = googleId;
                if (!byEmail.emailVerified) byEmail.emailVerified = true;
                await byEmail.save();
                user = byEmail;
            } else {
                // Username collision guard — append a short random suffix.
                let baseUsername = (name || 'user')
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, '')
                    .slice(0, 16) || 'user';
                let attempts = 0;
                while (await User.findOne({ username: baseUsername }) && attempts < 6) {
                    baseUsername = `${baseUsername.slice(0, 16)}${crypto.randomBytes(2).toString('hex')}`;
                    attempts++;
                }

                user = await User.create({
                    username: baseUsername,
                    email,
                    googleId,
                    emailVerified: true,
                });
            }
        }

        const jti = crypto.randomUUID();
        const token = createToken({ userId: user._id, jti });
        user.sessions.push({ jti, ua: req.headers['user-agent'] || '', ip: req.ip || '' });
        if (user.sessions.length > 10) user.sessions = user.sessions.slice(-10);
        await user.save();

        ActivityLog.create({
            userId: user._id, username: user.username, email: user.email,
            event: 'login_google', ip: req.ip || '', userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});

        res.cookie('token', token, cookieBase);
        return res.redirect(`${APP_URL}${returnTo}`);
    } catch (err) {
        logger.error('Google OAuth callback failed', { error: err.message });
        return res.redirect(`${APP_URL}/account.html?error=oauth_failed`);
    }
});

module.exports = router;

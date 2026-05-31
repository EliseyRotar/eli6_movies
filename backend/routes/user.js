const express = require('express');
const auth = require('../middleware/auth');
const userService = require('../services/userService');
const logger = require('../utils/logger');
const {
    validateEmail,
    validateUsername,
    validatePassword,
    validateNewPassword,
} = require('../utils/validators');

const router = express.Router();

function sanitizeUser(user) {
    const obj = user.toObject ? user.toObject() : { ...user };
    const { password, __v, ...safe } = obj;
    return safe;
}

router.get('/user/profile', auth, async (req, res) => {
    res.json({
        username:      req.user.username,
        email:         req.user.email,
        role:          req.user.role,
        emailVerified: req.user.emailVerified ?? false,
        myList:        req.user.myList || [],
        createdAt:     req.user.createdAt,
    });
});

// Returns the profile picture separately so the myList sync call stays lean
router.get('/user/profile-picture', auth, async (req, res) => {
    res.json({ profilePicture: req.user.profilePicture || '' });
});

router.put('/user/profile-picture', auth, async (req, res) => {
    try {
        const { data } = req.body || {};
        if (!data || typeof data !== 'string') return res.status(400).json({ error: 'INVALID_DATA' });
        if (!data.startsWith('data:image/')) return res.status(400).json({ error: 'INVALID_FORMAT' });
        // ~120 KB base64 = ≈90 KB binary, plenty for a 300×300 JPEG
        if (data.length > 160000) return res.status(400).json({ error: 'IMAGE_TOO_LARGE' });
        req.user.profilePicture = data;
        await req.user.save();
        res.json({ profilePicture: data });
    } catch (error) {
        logger.error('Profile picture update failed', { error: error.message });
        res.status(500).json({ error: 'UPDATE_ERROR' });
    }
});

router.delete('/user/profile-picture', auth, async (req, res) => {
    try {
        req.user.profilePicture = '';
        await req.user.save();
        res.json({ ok: true });
    } catch (error) {
        res.status(500).json({ error: 'UPDATE_ERROR' });
    }
});

router.post('/user/mylist', auth, async (req, res) => {
    try {
        const { id, title, type, poster_path, overview } = req.body || {};
        if (!id || !title || !type) {
            return res.status(400).json({ error: 'MISSING_FIELDS' });
        }
        if (!['movie', 'tv', 'anime'].includes(type)) {
            return res.status(400).json({ error: 'INVALID_TYPE' });
        }
        const exists = req.user.myList.some((item) => item.id === id && item.type === type);
        if (exists) {
            return res.status(400).json({ error: 'ALREADY_EXISTS' });
        }
        req.user.myList.unshift({ id, title, type, poster_path, overview: overview || '', addedAt: new Date() });
        if (req.user.myList.length > 100) req.user.myList = req.user.myList.slice(0, 100);
        await req.user.save();
        res.json(req.user.myList);
    } catch (error) {
        logger.error('Add to my list failed', { error: error.message });
        res.status(500).json({ error: 'MYLIST_ERROR' });
    }
});

router.delete('/user/mylist/:id/:type', auth, async (req, res) => {
    try {
        const { id, type } = req.params;
        req.user.myList = req.user.myList.filter(
            (item) => !(String(item.id) === String(id) && item.type === type)
        );
        await req.user.save();
        res.json(req.user.myList);
    } catch (error) {
        res.status(500).json({ error: 'MYLIST_ERROR' });
    }
});

router.post('/user/watch-history', auth, async (req, res) => {
    try {
        const raw = (req.body || {}).item || {};
        const id       = parseInt(raw.id);
        const type     = ['movie', 'tv', 'anime'].includes(raw.type) ? raw.type : null;
        const title    = typeof raw.title === 'string' ? raw.title.slice(0, 300) : '';
        const poster   = typeof raw.poster_path === 'string' ? raw.poster_path.slice(0, 500) : '';
        const progress = Math.min(100, Math.max(0, parseInt(raw.progress) || 0));
        if (!id || !type) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }
        const item = { id, type, title, poster_path: poster, progress, last_watched: new Date() };
        const existing = req.user.watchHistory.find((i) => i.id === item.id);
        if (existing) {
            existing.progress = item.progress;
            existing.last_watched = new Date();
        } else {
            req.user.watchHistory.unshift(item);
        }
        if (req.user.watchHistory.length > 100) req.user.watchHistory = req.user.watchHistory.slice(0, 100);
        await req.user.save();
        res.json(req.user.watchHistory);
    } catch (error) {
        logger.error('Watch history update failed', { error: error.message });
        res.status(500).json({ error: 'WATCH_HISTORY_ERROR' });
    }
});

router.delete('/user/watch-history/all', auth, async (req, res) => {
    try {
        req.user.watchHistory = [];
        await req.user.save();
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: 'WATCH_HISTORY_ERROR' });
    }
});

router.delete('/user/watch-history', auth, async (req, res) => {
    try {
        const { id, type } = req.body || {};
        if (!id || !type) return res.status(400).json({ error: 'INVALID_INPUT' });
        req.user.watchHistory = req.user.watchHistory.filter(
            (item) => !(String(item.id) === String(id) && item.type === type)
        );
        await req.user.save();
        res.json(req.user.watchHistory);
    } catch (error) {
        res.status(500).json({ error: 'WATCH_HISTORY_ERROR' });
    }
});

router.get('/user/keep-watching', auth, async (req, res) => {
    res.json(req.user.keepWatching || []);
});

router.post('/user/keep-watching', auth, async (req, res) => {
    try {
        const body = req.body || {};
        const id       = parseInt(body.id);
        const type     = ['movie', 'tv', 'anime'].includes(body.type) ? body.type : null;
        const title    = typeof body.title === 'string' ? body.title.slice(0, 300) : '';
        const poster   = typeof body.poster_path === 'string' ? body.poster_path.slice(0, 500) : '';
        const overview = typeof body.overview === 'string' ? body.overview.slice(0, 1000) : '';
        const progress = Math.min(100, Math.max(0, parseInt(body.progress) || 0));
        const season   = body.season != null ? (parseInt(body.season) || undefined) : undefined;
        const episode  = body.episode != null ? (parseInt(body.episode) || undefined) : undefined;

        if (!id || !type || !title) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }

        const kwItem = { id, type, title, poster_path: poster, overview, progress, addedAt: new Date() };
        if (season != null) kwItem.season = season;
        if (episode != null) kwItem.episode = episode;

        const whItem = { id, type, title, poster_path: poster, overview, progress, last_watched: new Date() };
        if (season != null) whItem.season = season;
        if (episode != null) whItem.episode = episode;

        const User = req.user.constructor;

        // Atomic: remove existing entry then prepend new one — bypasses full-document validation
        await User.findByIdAndUpdate(req.user._id, {
            $pull: { keepWatching: { id, type }, watchHistory: { id, type } },
        }, { strict: false });

        const updated = await User.findByIdAndUpdate(
            req.user._id,
            {
                $push: {
                    keepWatching: { $each: [kwItem], $position: 0, $slice: 20 },
                    watchHistory: { $each: [whItem], $position: 0, $slice: 100 },
                },
            },
            { new: true, strict: false, select: 'keepWatching' }
        );

        res.json(updated ? updated.keepWatching : []);
    } catch (error) {
        logger.error('Keep watching update failed', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'KEEP_WATCHING_ERROR' });
    }
});

router.delete('/user/keep-watching/:id/:type', auth, async (req, res) => {
    try {
        const { id, type } = req.params;
        req.user.keepWatching = req.user.keepWatching.filter(
            (item) => !(String(item.id) === String(id) && item.type === type)
        );
        await req.user.save();
        res.json(req.user.keepWatching);
    } catch (error) {
        res.status(500).json({ error: 'KEEP_WATCHING_ERROR' });
    }
});

router.get('/user/watched', auth, async (req, res) => {
    res.json(req.user.watchHistory || []);
});

router.put('/user/update', auth, async (req, res) => {
    try {
        const { username, email } = req.body || {};

        // Require current password for sensitive field changes
        if (username || email) {
            const { currentPassword } = req.body || {};
            if (!currentPassword) {
                return res.status(400).json({ error: 'CURRENT_PASSWORD_REQUIRED' });
            }
            const valid = await userService.verifyPassword(req.user, currentPassword);
            if (!valid) {
                return res.status(401).json({ error: 'INVALID_PASSWORD' });
            }
        }

        if (username && !validateUsername(username)) {
            return res.status(400).json({ error: 'INVALID_USERNAME' });
        }
        if (email && !validateEmail(email)) {
            return res.status(400).json({ error: 'INVALID_EMAIL' });
        }

        if (username && username !== req.user.username) {
            const existing = await userService.findByUsername(username.trim());
            if (existing && String(existing._id) !== String(req.user._id)) {
                return res.status(400).json({ error: 'USERNAME_EXISTS' });
            }
            req.user.username = username.trim();
        }
        if (email && email !== req.user.email) {
            const normalized = email.trim().toLowerCase();
            const existing = await userService.findByEmail(normalized);
            if (existing && String(existing._id) !== String(req.user._id)) {
                return res.status(400).json({ error: 'EMAIL_EXISTS' });
            }
            req.user.email = normalized;
        }

        await req.user.save();
        res.json({ message: 'PROFILE_UPDATED', user: sanitizeUser(req.user) });
    } catch (error) {
        logger.error('Profile update failed', { error: error.message });
        res.status(500).json({ error: 'UPDATE_ERROR' });
    }
});

router.put('/user/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!validatePassword(currentPassword) || !validateNewPassword(newPassword)) {
            return res.status(400).json({ error: 'INVALID_PASSWORD' });
        }
        const isMatch = await userService.verifyPassword(req.user, currentPassword);
        if (!isMatch) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        req.user.password = await userService.hashPassword(newPassword);
        // Revoke all other sessions — attacker holding a stolen token can no longer authenticate
        req.user.sessions = req.jti ? req.user.sessions.filter(s => s.jti === req.jti) : [];
        await req.user.save();
        res.json({ message: 'PASSWORD_UPDATED' });
    } catch (error) {
        logger.error('Password change failed', { error: error.message });
        res.status(500).json({ error: 'PASSWORD_ERROR' });
    }
});

router.get('/user/sessions', auth, async (req, res) => {
    res.json({
        sessions: req.user.sessions || [],
        currentJti: req.jti || null,
    });
});

router.delete('/user/sessions/others', auth, async (req, res) => {
    try {
        const currentJti = req.jti;
        if (!currentJti) {
            req.user.sessions = [];
        } else {
            req.user.sessions = req.user.sessions.filter(s => s.jti === currentJti);
        }
        await req.user.save();
        res.json({ message: 'SESSIONS_CLEARED' });
    } catch (error) {
        res.status(500).json({ error: 'SESSION_ERROR' });
    }
});

router.delete('/user/sessions/:jti', auth, async (req, res) => {
    try {
        const { jti } = req.params;
        const owned = req.user.sessions.some(s => s.jti === jti);
        if (!owned) return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
        req.user.sessions = req.user.sessions.filter(s => s.jti !== jti);
        await req.user.save();
        res.json({ message: 'SESSION_REVOKED' });
    } catch (error) {
        res.status(500).json({ error: 'SESSION_ERROR' });
    }
});

router.delete('/user/delete', auth, async (req, res) => {
    try {
        const { password } = req.body || {};
        if (!password) return res.status(400).json({ error: 'PASSWORD_REQUIRED' });
        const valid = await userService.verifyPassword(req.user, password);
        if (!valid) return res.status(401).json({ error: 'INVALID_PASSWORD' });
        await userService.deleteUser(req.user._id);
        res.clearCookie('token').json({ message: 'ACCOUNT_DELETED' });
    } catch (error) {
        logger.error('Delete account failed', { error: error.message });
        res.status(500).json({ error: 'DELETE_FAILED' });
    }
});

module.exports = router;

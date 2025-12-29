const express = require('express');
const auth = require('../middleware/auth');
const userService = require('../services/userService');
const logger = require('../utils/logger');
const {
    requireNumber,
    validateEmail,
    validateUsername,
    validatePassword,
} = require('../utils/validators');

const router = express.Router();

const sanitizeUser = (user) => {
    const { password, ...safe } = user;
    return safe;
};

router.get('/user/profile', auth, async (req, res) => {
    res.json({
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        myList: req.user.myList || [],
    });
});

router.post('/user/mylist', auth, async (req, res) => {
    try {
        const { id, title, type, poster_path, overview } = req.body || {};
        if (!id || !title || !type || !poster_path) {
            return res.status(400).json({ error: 'MISSING_FIELDS' });
        }
        if (!['movie', 'tv', 'anime'].includes(type)) {
            return res.status(400).json({ error: 'INVALID_TYPE' });
        }
        if (!Array.isArray(req.user.myList)) req.user.myList = [];
        const exists = req.user.myList.some((item) => item.id === id && item.type === type);
        if (exists) {
            return res.status(400).json({ error: 'ALREADY_EXISTS' });
        }
        req.user.myList.unshift({
            id,
            title,
            type,
            poster_path,
            overview: overview || '',
            addedAt: new Date(),
        });
        if (req.user.myList.length > 100) {
            req.user.myList = req.user.myList.slice(0, 100);
        }
        res.json(req.user.myList);
    } catch (error) {
        logger.error('Add to my list failed', { error: error.message });
        res.status(500).json({ error: 'MYLIST_ERROR' });
    }
});

router.delete('/user/mylist/:id/:type', auth, async (req, res) => {
    const { id, type } = req.params;
    const numericId = requireNumber(id);
    if (!numericId || !type) return res.status(400).json({ error: 'INVALID_INPUT' });
    req.user.myList = (req.user.myList || []).filter(
        (item) => !(item.id === numericId && item.type === type)
    );
    return res.json(req.user.myList);
});

router.post('/user/watch-history', auth, async (req, res) => {
    try {
        const { item } = req.body || {};
        if (!item || !item.id || !item.type) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }
        const watchHistory = req.user.watchHistory || [];
        const existing = watchHistory.find((i) => i.id === item.id);
        if (existing) {
            existing.progress = item.progress;
            existing.last_watched = new Date();
        } else {
            watchHistory.unshift(item);
        }
        req.user.watchHistory = watchHistory.slice(0, 100);
        res.json(req.user.watchHistory);
    } catch (error) {
        logger.error('Watch history update failed', { error: error.message });
        res.status(500).json({ error: 'WATCH_HISTORY_ERROR' });
    }
});

router.delete('/user/watch-history', auth, async (req, res) => {
    const { id, type } = req.body || {};
    if (!id || !type) return res.status(400).json({ error: 'INVALID_INPUT' });
    req.user.watchHistory = (req.user.watchHistory || []).filter(
        (item) => !(item.id === id && item.type === type)
    );
    res.json(req.user.watchHistory);
});

router.get('/user/keep-watching', auth, async (req, res) => {
    res.json(req.user.keepWatching || []);
});

router.post('/user/keep-watching', auth, async (req, res) => {
    try {
        const item = req.body || {};
        if (!item.id || !item.type) {
            return res.status(400).json({ error: 'INVALID_INPUT' });
        }
        const keepWatching = req.user.keepWatching || [];
        const watchHistory = req.user.watchHistory || [];

        const kwIndex = keepWatching.findIndex((i) => i.id === item.id && i.type === item.type);
        if (kwIndex > -1) keepWatching.splice(kwIndex, 1);
        keepWatching.unshift(item);
        if (keepWatching.length > 20) keepWatching.pop();
        req.user.keepWatching = keepWatching;

        const whIndex = watchHistory.findIndex((i) => i.id === item.id && i.type === item.type);
        if (whIndex > -1) {
            watchHistory[whIndex].last_watched = new Date();
            watchHistory[whIndex].progress = item.progress || 0;
        } else {
            watchHistory.unshift({
                ...item,
                last_watched: new Date(),
                progress: item.progress || 0,
            });
        }
        req.user.watchHistory = watchHistory.slice(0, 100);

        res.json(req.user.keepWatching);
    } catch (error) {
        logger.error('Keep watching update failed', { error: error.message });
        res.status(500).json({ error: 'KEEP_WATCHING_ERROR' });
    }
});

router.delete('/user/keep-watching/:id/:type', auth, async (req, res) => {
    const { id, type } = req.params;
    const numericId = requireNumber(id);
    if (!numericId || !type) return res.status(400).json({ error: 'INVALID_INPUT' });
    req.user.keepWatching = (req.user.keepWatching || []).filter(
        (item) => !(item.id === numericId && item.type === type)
    );
    res.json(req.user.keepWatching);
});

router.get('/user/watched', auth, async (req, res) => {
    res.json(req.user.watchHistory || []);
});

router.put('/user/update', auth, async (req, res) => {
    const { username, email } = req.body || {};

    if (username && !validateUsername(username)) {
        return res.status(400).json({ error: 'INVALID_USERNAME' });
    }
    if (email && !validateEmail(email)) {
        return res.status(400).json({ error: 'INVALID_EMAIL' });
    }

    if (username && username !== req.user.username) {
        const existing = (await userService.getInternalStore()).find(
            (u) => u.username === username && u._id !== req.user._id
        );
        if (existing) return res.status(400).json({ error: 'USERNAME_EXISTS' });
        req.user.username = username.trim();
    }
    if (email && email !== req.user.email) {
        const normalized = email.trim().toLowerCase();
        const existing = (await userService.getInternalStore()).find(
            (u) => u.email === normalized && u._id !== req.user._id
        );
        if (existing) return res.status(400).json({ error: 'EMAIL_EXISTS' });
        req.user.email = normalized;
    }

    res.json({ message: 'PROFILE_UPDATED', user: sanitizeUser(req.user) });
});

router.put('/user/password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!validatePassword(currentPassword) || !validatePassword(newPassword)) {
            return res.status(400).json({ error: 'INVALID_PASSWORD' });
        }
        const isMatch = await userService.verifyPassword(req.user, currentPassword);
        if (!isMatch) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });
        req.user.password = await userService.hashPassword(newPassword);
        res.json({ message: 'PASSWORD_UPDATED' });
    } catch (error) {
        logger.error('Password change failed', { error: error.message });
        res.status(500).json({ error: 'PASSWORD_ERROR' });
    }
});

router.delete('/user/delete', auth, async (req, res) => {
    try {
        await userService.deleteUser(req.user._id);
        res.json({ message: 'ACCOUNT_DELETED' });
    } catch (error) {
        logger.error('Delete account failed', { error: error.message });
        res.status(500).json({ error: 'DELETE_FAILED' });
    }
});

module.exports = router;

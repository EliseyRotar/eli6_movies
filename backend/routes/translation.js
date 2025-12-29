const express = require('express');
const axios = require('axios');

const router = express.Router();

const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || 'http://localhost:5000';
const languageCodeMap = { en: 'en', it: 'it', ru: 'ru' };
const MAX_TEXT_LENGTH = Number(process.env.TRANSLATION_MAX_CHARS || 2000);
const MAX_BATCH = Number(process.env.TRANSLATION_BATCH_MAX || 20);

function assertLanguage(targetLanguage) {
    return languageCodeMap[targetLanguage] || null;
}

router.post('/translation/translate', async (req, res) => {
    const { text, targetLanguage } = req.body || {};
    const lang = assertLanguage(targetLanguage);
    if (!text || !lang) return res.status(400).json({ error: 'INVALID_INPUT' });
    if (text.length > MAX_TEXT_LENGTH) return res.status(400).json({ error: 'TEXT_TOO_LONG' });
    if (lang === 'en') return res.json({ translation: text });

    try {
        const response = await axios.post(
            `${LIBRETRANSLATE_URL}/translate`,
            {
                q: text,
                source: 'en',
                target: lang,
                format: 'text',
            },
            { timeout: 8000 }
        );
        res.json({ translation: response.data.translatedText });
    } catch (error) {
        res.status(500).json({ error: 'TRANSLATION_FAILED', details: error.message });
    }
});

router.post('/translation/translate-batch', async (req, res) => {
    const { texts, targetLanguage } = req.body || {};
    const lang = assertLanguage(targetLanguage);
    if (!Array.isArray(texts) || !lang) return res.status(400).json({ error: 'INVALID_INPUT' });
    const safeTexts = texts.slice(0, MAX_BATCH).map((t) => String(t).slice(0, MAX_TEXT_LENGTH));
    if (lang === 'en') return res.json({ translations: safeTexts });

    try {
        const translations = [];
        for (const text of safeTexts) {
            try {
                const response = await axios.post(
                    `${LIBRETRANSLATE_URL}/translate`,
                    {
                        q: text,
                        source: 'en',
                        target: lang,
                        format: 'text',
                    },
                    { timeout: 8000 }
                );
                translations.push(response.data.translatedText);
            } catch (error) {
                translations.push(text);
            }
        }
        res.json({ translations });
    } catch (error) {
        res.status(500).json({ error: 'TRANSLATION_FAILED', details: error.message });
    }
});

router.get('/translation/languages', async (_req, res) => {
    res.json([
        { code: 'en', name: 'English' },
        { code: 'it', name: 'Italiano' },
        { code: 'ru', name: 'Русский' },
    ]);
});

module.exports = router;

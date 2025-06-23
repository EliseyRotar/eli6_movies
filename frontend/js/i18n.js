/**
 * ELI6 Movies Internationalization (i18n) System
 * Supports English, Italian, and Russian languages
 * Uses LibreTranslate for dynamic content translation
 */

class I18nManager {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.supportedLanguages = ['en', 'it', 'ru'];
        this.languageNames = {
            'en': 'English',
            'it': 'Italiano',
            'ru': 'Русский'
        };
        this.init();
    }

    /**
     * Initialize the i18n system
     */
    async init() {
        // Detect language from URL parameter, cookie, or browser
        this.detectLanguage();

        // Load translations for current language
        await this.loadTranslations();

        // Apply translations to static content
        this.translateStaticContent();

        // Set up language switcher
        this.setupLanguageSwitcher();

        // Set up dynamic content translation observer
        this.setupDynamicTranslationObserver();
    }

    /**
     * Detect the current language from various sources
     */
    detectLanguage() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lng');

        if (urlLang && this.supportedLanguages.includes(urlLang)) {
            this.currentLanguage = urlLang;
            this.setLanguageCookie(urlLang);
            return;
        }

        // Check cookie
        const cookieLang = this.getLanguageCookie();
        if (cookieLang && this.supportedLanguages.includes(cookieLang)) {
            this.currentLanguage = cookieLang;
            return;
        }

        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        if (this.supportedLanguages.includes(browserLang)) {
            this.currentLanguage = browserLang;
            this.setLanguageCookie(browserLang);
            return;
        }

        // Default to English
        this.currentLanguage = 'en';
        this.setLanguageCookie('en');
    }

    /**
     * Set language cookie
     */
    setLanguageCookie(lang) {
        document.cookie = `eli6_language=${lang}; path=/; max-age=31536000`; // 1 year
    }

    /**
     * Get language from cookie
     */
    getLanguageCookie() {
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'eli6_language') {
                return value;
            }
        }
        return null;
    }

    /**
     * Load translations for the current language
     */
    async loadTranslations() {
        try {
            const response = await fetch(`/locales/${this.currentLanguage}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load translations for ${this.currentLanguage}`);
            }
            this.translations = await response.json();
            console.log(`✅ Loaded translations for ${this.currentLanguage}`);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English
            if (this.currentLanguage !== 'en') {
                this.currentLanguage = 'en';
                await this.loadTranslations();
            }
        }
    }

    /**
     * Get translation for a key
     */
    t(key, fallback = '') {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return fallback || key;
            }
        }

        return value || fallback || key;
    }

    /**
     * Translate static content with data-i18n attributes
     */
    translateStaticContent() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);

            if (translation && translation !== key) {
                // Handle different element types
                if (element.tagName === 'INPUT' && element.type === 'placeholder') {
                    element.placeholder = translation;
                } else if (element.tagName === 'IMG') {
                    element.alt = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });
    }

    /**
     * Setup language switcher in navbar
     */
    setupLanguageSwitcher() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        // Find the nav-icons container
        let navIcons = navbar.querySelector('.nav-icons');
        if (!navIcons) {
            // Create nav-icons if it doesn't exist
            navIcons = document.createElement('div');
            navIcons.className = 'nav-icons';
            navbar.appendChild(navIcons);
        }

        // Create language switcher
        const languageSwitcher = document.createElement('div');
        languageSwitcher.className = 'language-switcher';
        languageSwitcher.innerHTML = `
            <button class="language-btn" onclick="i18n.toggleLanguageMenu()">
                <i class="material-icons">language</i>
                <span>${this.languageNames[this.currentLanguage]}</span>
                <i class="material-icons">arrow_drop_down</i>
            </button>
            <div class="language-menu" id="language-menu">
                ${this.supportedLanguages.map(lang => `
                    <div class="language-option ${lang === this.currentLanguage ? 'active' : ''}" 
                         onclick="i18n.changeLanguage('${lang}')">
                        <span>${this.languageNames[lang]}</span>
                        ${lang === this.currentLanguage ? '<i class="material-icons">check</i>' : ''}
                    </div>
                `).join('')}
            </div>
        `;

        // Insert before the first nav-icon
        const firstIcon = navIcons.querySelector('.nav-icon');
        if (firstIcon) {
            navIcons.insertBefore(languageSwitcher, firstIcon);
        } else {
            navIcons.appendChild(languageSwitcher);
        }

        // Add CSS for language switcher
        this.addLanguageSwitcherStyles();
    }

    /**
     * Add CSS styles for language switcher
     */
    addLanguageSwitcherStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .language-switcher {
                position: relative;
                display: inline-block;
            }

            .language-btn {
                background: none;
                border: none;
                color: #e5e5e5;
                display: flex;
                align-items: center;
                gap: 5px;
                cursor: pointer;
                padding: 8px 12px;
                border-radius: 4px;
                transition: all 0.3s ease;
                font-size: 14px;
            }

            .language-btn:hover {
                color: #fff;
                background: rgba(255, 255, 255, 0.1);
            }

            .language-menu {
                position: absolute;
                top: 100%;
                right: 0;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                min-width: 150px;
                z-index: 1000;
                display: none;
                backdrop-filter: blur(10px);
            }

            .language-menu.show {
                display: block;
            }

            .language-option {
                padding: 10px 15px;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.3s ease;
                color: #e5e5e5;
            }

            .language-option:hover {
                background: rgba(255, 255, 255, 0.1);
                color: #fff;
            }

            .language-option.active {
                background: rgba(229, 9, 20, 0.2);
                color: #e50914;
            }

            .language-option i {
                font-size: 16px;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Toggle language menu visibility
     */
    toggleLanguageMenu() {
        const menu = document.getElementById('language-menu');
        if (menu) {
            menu.classList.toggle('show');
        }
    }

    /**
     * Change language
     */
    async changeLanguage(lang) {
        if (lang === this.currentLanguage) return;

        this.currentLanguage = lang;
        this.setLanguageCookie(lang);

        // Update URL parameter
        const url = new URL(window.location);
        url.searchParams.set('lng', lang);
        window.history.replaceState({}, '', url);

        // Reload translations
        await this.loadTranslations();

        // Re-translate static content
        this.translateStaticContent();

        // Update language switcher
        this.updateLanguageSwitcher();

        // Translate dynamic content
        await this.translateDynamicContent();

        // Close language menu
        this.toggleLanguageMenu();
    }

    /**
     * Update language switcher display
     */
    updateLanguageSwitcher() {
        const btn = document.querySelector('.language-btn span');
        if (btn) {
            btn.textContent = this.languageNames[this.currentLanguage];
        }

        // Update active state in menu
        const options = document.querySelectorAll('.language-option');
        options.forEach(option => {
            option.classList.remove('active');
            const lang = option.getAttribute('onclick').match(/'([^']+)'/)[1];
            if (lang === this.currentLanguage) {
                option.classList.add('active');
            }
        });
    }

    /**
     * Setup observer for dynamic content translation
     */
    setupDynamicTranslationObserver() {
        // Create a mutation observer to watch for new content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.translateDynamicElements(node);
                        }
                    });
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Translate dynamic elements
     */
    async translateDynamicElements(container = document.body) {
        if (this.currentLanguage === 'en') return; // No translation needed for English

        const dynamicElements = container.querySelectorAll('[data-dynamic-translate="true"]');
        if (dynamicElements.length === 0) return;

        const textsToTranslate = [];
        const elementMap = new Map();

        // Collect all texts that need translation
        dynamicElements.forEach((element, index) => {
            const originalText = element.getAttribute('data-original-text') || element.textContent.trim();
            if (originalText && !textsToTranslate.includes(originalText)) {
                textsToTranslate.push(originalText);
                elementMap.set(originalText, []);
            }
            if (originalText) {
                elementMap.get(originalText).push(element);
            }
        });

        if (textsToTranslate.length === 0) return;

        try {
            // Translate texts using LibreTranslate
            const translations = await this.translateBatch(textsToTranslate);

            // Apply translations
            textsToTranslate.forEach((originalText, index) => {
                const translatedText = translations[index];
                const elements = elementMap.get(originalText);

                if (elements && translatedText) {
                    elements.forEach(element => {
                        element.textContent = translatedText;
                    });
                }
            });
        } catch (error) {
            console.error('Error translating dynamic content:', error);
        }
    }

    /**
     * Translate batch of texts using LibreTranslate
     */
    async translateBatch(texts) {
        if (this.currentLanguage === 'en') return texts;

        try {
            const response = await fetch('/api/translation/translate-batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    texts: texts,
                    targetLanguage: this.currentLanguage
                })
            });

            if (!response.ok) {
                throw new Error(`Translation failed: ${response.status}`);
            }

            const result = await response.json();
            return result.translations;
        } catch (error) {
            console.error('Translation error:', error);
            return texts; // Return original texts on error
        }
    }

    /**
     * Mark element for dynamic translation
     */
    markForTranslation(element, originalText) {
        element.setAttribute('data-dynamic-translate', 'true');
        element.setAttribute('data-original-text', originalText);
    }

    /**
     * Translate movie/TV show content
     */
    async translateContent(content) {
        if (this.currentLanguage === 'en') return content;

        const textsToTranslate = [];
        const translationMap = new Map();

        // Extract texts that need translation
        if (content.title) {
            textsToTranslate.push(content.title);
            translationMap.set('title', content.title);
        }
        if (content.overview) {
            textsToTranslate.push(content.overview);
            translationMap.set('overview', content.overview);
        }
        if (content.name) {
            textsToTranslate.push(content.name);
            translationMap.set('name', content.name);
        }

        if (textsToTranslate.length === 0) return content;

        try {
            const translations = await this.translateBatch(textsToTranslate);

            // Apply translations
            const translatedContent = { ...content };
            textsToTranslate.forEach((originalText, index) => {
                const translatedText = translations[index];
                if (translatedText) {
                    // Find which field this text belongs to
                    for (const [key, value] of translationMap.entries()) {
                        if (value === originalText) {
                            translatedContent[key] = translatedText;
                            break;
                        }
                    }
                }
            });

            return translatedContent;
        } catch (error) {
            console.error('Error translating content:', error);
            return content;
        }
    }
}

// Initialize i18n system
const i18n = new I18nManager();

// Close language menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.language-switcher')) {
        const menu = document.getElementById('language-menu');
        if (menu) {
            menu.classList.remove('show');
        }
    }
});

// Export for use in other scripts
window.i18n = i18n; 
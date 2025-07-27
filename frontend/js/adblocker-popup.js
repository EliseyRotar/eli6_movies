// Adblocker Popup Logic
(function () {
    function showAdblockerPopup() {
        if (localStorage.getItem('adblockerPopupDismissed')) return;

        // UAParser setup
        var parser = new UAParser();
        var result = parser.getResult();
        var os = (result.os && result.os.name) ? result.os.name : '';
        var browser = (result.browser && result.browser.name) ? result.browser.name : '';
        var combo = (os + ' ' + browser).toLowerCase();

        // Adblocker download links by OS/browser
        var adblockLinks = {
            'windows chrome': {
                name: 'uBlock Origin Lite for Chrome',
                url: 'https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh'
            },
            'windows firefox': {
                name: 'uBlock Origin for Firefox',
                url: 'https://addons.mozilla.org/firefox/addon/ublock-origin/'
            },
            'windows edge': {
                name: 'uBlock Origin for Edge',
                url: 'https://microsoftedge.microsoft.com/addons/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm'
            },
            'mac os chrome': {
                name: 'uBlock Origin Lite for Chrome',
                url: 'https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh'
            },
            'mac os firefox': {
                name: 'uBlock Origin for Firefox',
                url: 'https://addons.mozilla.org/firefox/addon/ublock-origin/'
            },
            'mac os safari': {
                name: 'AdGuard for Safari',
                url: 'https://apps.apple.com/app/adguard-for-safari/id1440147259'
            },
            'android chrome': {
                name: 'AdGuard for Android',
                url: 'https://adguard.com/en/adguard-android/overview.html'
            },
            'android firefox': {
                name: 'uBlock Origin for Firefox',
                url: 'https://addons.mozilla.org/firefox/addon/ublock-origin/'
            },
            'ios safari': {
                name: 'AdGuard for iOS',
                url: 'https://apps.apple.com/app/adguard-adblock-privacy/id1047223162'
            },
            'ios chrome': {
                name: 'AdGuard for iOS',
                url: 'https://apps.apple.com/app/adguard-adblock-privacy/id1047223162'
            },
            'linux chrome': {
                name: 'uBlock Origin Lite for Chrome',
                url: 'https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh'
            },
            'linux firefox': {
                name: 'uBlock Origin for Firefox',
                url: 'https://addons.mozilla.org/firefox/addon/ublock-origin/'
            }
        };

        // Fallback generic adblockers
        var genericList = [
            { name: 'uBlock Origin', url: 'https://ublockorigin.com/' },
            { name: 'AdGuard', url: 'https://adguard.com/' },
            { name: 'Brave Browser', url: 'https://brave.com/download/' }
        ];

        // Modal HTML
        var modal = document.createElement('div');
        modal.id = 'adblocker-popup-modal';
        modal.innerHTML = `
            <div class="adblocker-popup-backdrop"></div>
            <div class="adblocker-popup-content">
                <div class="adblocker-popup-icon-container">
                    <i class="material-icons" style="font-size: 48px; color: #4caf50;">shield</i>
                </div>
                <div class="adblocker-popup-header">
                    <h2 data-i18n="adblocker.title">Enhance Your Experience: Install an Adblocker</h2>
                </div>
                <p data-i18n="adblocker.description">Adblockers provide a smoother, ad-free experience and protect you from malicious ads and trackers. Stay safe and virus-free while you stream!</p>
                <div class="adblocker-popup-actions"></div>
                <div class="adblocker-popup-footer">
                    <div class="adblocker-language-selector"></div>
                    <div class="footer-right-controls">
                        <label style="cursor:pointer;"><input type="checkbox" id="adblocker-popup-dontshow" style="margin-right:6px;"> <span data-i18n="adblocker.dont_show">Don't show again</span></label>
                        <button id="adblocker-popup-dismiss" data-i18n="adblocker.dismiss">Dismiss</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Trigger entrance animation
        setTimeout(() => modal.classList.add('visible'), 10);

        // --- Language Selector ---
        var langSelector = modal.querySelector('.adblocker-language-selector');
        langSelector.classList.add('language-switcher');
        var supportedLanguages = ['en', 'it', 'ru'];
        var langNames = { 'en': 'English', 'it': 'Italiano', 'ru': 'Русский' };
        var currentLang = (window.i18n && i18n.currentLanguage) ? i18n.currentLanguage : 'en';

        // Set initial UI text using i18n or fallback
        function setInitialUIText() {
            modal.querySelector('[data-i18n="adblocker.title"]').textContent = (window.i18n && i18n.t) ? (i18n.t('adblocker.title') || 'Enhance Your Experience: Install an Adblocker') : 'Enhance Your Experience: Install an Adblocker';
            modal.querySelector('[data-i18n="adblocker.description"]').textContent = (window.i18n && i18n.t) ? (i18n.t('adblocker.description') || 'Adblockers provide a smoother, ad-free experience and protect you from malicious ads and trackers. Stay safe and virus-free while you stream!') : 'Adblockers provide a smoother, ad-free experience and protect you from malicious ads and trackers. Stay safe and virus-free while you stream!';
        }
        setInitialUIText();

        function updateLangSelector() {
            langSelector.innerHTML = `
                <button class="language-btn">
                    <i class="material-icons">language</i>
                    <span>${langNames[currentLang]}</span>
                    <i class="material-icons">arrow_drop_down</i>
                </button>
                <div class="language-menu">
                    ${supportedLanguages.map(lang => `
                        <div class="language-option ${lang === currentLang ? 'active' : ''}" data-lang="${lang}">
                            <span>${langNames[lang]}</span>
                            ${lang === currentLang ? '<i class="material-icons">check</i>' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            // Toggle dropdown
            langSelector.querySelector('.language-btn').onclick = function () {
                langSelector.querySelector('.language-menu').classList.toggle('show');
            };
            // Change language
            langSelector.querySelectorAll('.language-option').forEach(option => {
                option.onclick = function () {
                    var lang = this.getAttribute('data-lang');
                    currentLang = lang;
                    i18n.changeLanguage(lang);
                    langSelector.querySelector('.language-menu').classList.remove('show');
                };
            });
        }
        updateLangSelector();
        document.addEventListener('languageChanged', function () {
            currentLang = i18n.currentLanguage;
            updateLangSelector();
            updateUIText();
        });

        // --- Update UI Text on Language Change ---
        function updateUIText() {
            modal.querySelector('[data-i18n="adblocker.title"]').textContent = i18n.t('adblocker.title');
            modal.querySelector('[data-i18n="adblocker.description"]').textContent = i18n.t('adblocker.description');
            modal.querySelector('[data-i18n="adblocker.dont_show"]').textContent = i18n.t('adblocker.dont_show');
            modal.querySelector('[data-i18n="adblocker.dismiss"]').textContent = i18n.t('adblocker.dismiss');
            // Update buttons
            var actionsDiv = modal.querySelector('.adblocker-popup-actions');
            var found = false;
            for (var key in adblockLinks) {
                if (combo.indexOf(key) !== -1) {
                    var link = adblockLinks[key];
                    actionsDiv.innerHTML = `
                        <a href="${link.url}" target="_blank" class="adblocker-popup-btn primary">${i18n.t('adblocker.download_recommended') || 'Download Recommended'}: ${link.name}</a>
                        <a href="https://ublockorigin.com/" target="_blank" class="adblocker-popup-btn secondary">${i18n.t('adblocker.learn_more') || 'Learn More'}</a>
                    `;
                    found = true;
                    break;
                }
            }
            if (!found) {
                actionsDiv.innerHTML = `<div style='margin-bottom:8px;'>${i18n.t('adblocker.fallback') || 'We recommend these popular adblockers for your browser:'}</div>` +
                    genericList.map(function (item) {
                        return `<a href="${item.url}" target="_blank" class="adblocker-popup-btn primary">${i18n.t('adblocker.download') || 'Download'} ${item.name}</a>`;
                    }).join('') + `<a href="https://ublockorigin.com/" target="_blank" class="adblocker-popup-btn secondary">${i18n.t('adblocker.learn_more') || 'Learn More'}</a>`;
            }
        }
        updateUIText();

        // Fill actions
        var actionsDiv = modal.querySelector('.adblocker-popup-actions');
        var found = false;
        for (var key in adblockLinks) {
            if (combo.indexOf(key) !== -1) {
                var link = adblockLinks[key];
                actionsDiv.innerHTML = `
                    <a href="${link.url}" target="_blank" class="adblocker-popup-btn primary">Download ${link.name}</a>
                    <a href="https://ublockorigin.com/" target="_blank" class="adblocker-popup-btn secondary">Learn More</a>
                `;
                found = true;
                break;
            }
        }
        if (!found) {
            actionsDiv.innerHTML = genericList.map(function (item) {
                return `<a href="${item.url}" target="_blank" class="adblocker-popup-btn primary">${item.name}</a>`;
            }).join('') + `<a href="https://ublockorigin.com/" target="_blank" class="adblocker-popup-btn secondary">Learn More</a>`;
        }

        // Dismiss logic
        modal.querySelector('#adblocker-popup-dismiss').onclick = function () {
            if (modal.querySelector('#adblocker-popup-dontshow').checked) {
                localStorage.setItem('adblockerPopupDismissed', '1');
            }
            modal.classList.remove('visible');
            modal.addEventListener('transitionend', () => modal.remove());
        };
        modal.querySelector('.adblocker-popup-backdrop').onclick = function () {
            modal.querySelector('#adblocker-popup-dismiss').click();
        };

        // Style
        var style = document.createElement('style');
        style.innerHTML = `
#adblocker-popup-modal { position:fixed; z-index:99999; top:0; left:0; width:100vw; height:100vh; display:flex; align-items:center; justify-content:center; opacity:0; transition: opacity 0.3s ease; }
#adblocker-popup-modal.visible { opacity:1; }
.adblocker-popup-backdrop { position:absolute; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); backdrop-filter: blur(5px); }
.adblocker-popup-content { position:relative; background: linear-gradient(145deg, #1f1f1f, #111); color:var(--text-primary,#fff); border-radius:20px; padding:40px 36px 28px 36px; max-width:95vw; width:500px; box-shadow:0 12px 40px rgba(0,0,0,0.6); text-align:center; transform: translateY(20px); transition: transform 0.3s ease; }
#adblocker-popup-modal.visible .adblocker-popup-content { transform: translateY(0); }

.adblocker-popup-icon-container { margin-bottom: 20px; }
.adblocker-popup-icon-container .material-icons { background: -webkit-linear-gradient(45deg, #4caf50, #81c784); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

.adblocker-popup-header { text-align: center; margin-bottom: 16px; }
.adblocker-popup-header h2 { margin: 0 auto; font-size: 1.8rem; font-weight: 700; }
.adblocker-popup-content p { font-size: 1.1rem; margin-bottom: 28px; line-height: 1.6; color: #b0b0b0; }

.adblocker-popup-btn { display:inline-block; margin:8px 8px 16px 8px; padding: 14px 28px; border-radius:8px; font-size: 1.1rem; font-weight:600; text-decoration:none; transition: all 0.3s ease; transform: scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
.adblocker-popup-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
.adblocker-popup-btn.primary { background: linear-gradient(45deg, #e50914, #f40612); color:#fff; }
.adblocker-popup-btn.primary:hover { box-shadow: 0 6px 20px rgba(229,9,20,0.4); }
.adblocker-popup-btn.secondary { background:#333; color:#fff; }
.adblocker-popup-btn.secondary:hover { background:#444; }

.adblocker-popup-footer { margin-top:24px; display:flex; align-items:center; justify-content:space-between; color: #888; }
.footer-right-controls { display:flex; align-items:center; gap: 16px; font-size: 14px; }
#adblocker-popup-dismiss { background: #333; color: #fff; border: none; border-radius: 6px; padding: 8px 18px; font-size: 14px; cursor: pointer; transition: background 0.2s ease; }
#adblocker-popup-dismiss:hover { background: #444; }

.adblocker-language-selector.language-switcher { position: relative; }
.adblocker-language-selector .language-btn { background: none; border: none; color: #888; display: flex; align-items: center; gap: 4px; cursor: pointer; padding: 6px 10px; border-radius: 4px; transition: all 0.3s ease; font-size: 14px; }
.adblocker-language-selector .language-btn:hover { color:#fff; background: rgba(255, 255, 255, 0.1); }
.adblocker-language-selector .language-btn .material-icons { font-size: 18px; }
.adblocker-language-selector .language-menu { position: absolute; bottom: 100%; left: 0; background: rgba(30, 30, 30, 0.95); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; min-width: 140px; z-index: 1001; display: none; backdrop-filter: blur(10px); }
.adblocker-language-selector .language-menu.show { display: block; }
.adblocker-language-selector .language-option { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; cursor: pointer; transition: background 0.2s; font-size: 14px; }
.adblocker-language-selector .language-option:hover { background: rgba(255, 255, 255, 0.1); }
.adblocker-language-selector .language-option.active { font-weight: bold; color: var(--accent-color, #e50914); }

@media (max-width:600px) { .adblocker-popup-content { width:95vw; padding:24px 6vw 16px 6vw; } .adblocker-popup-header h2 { font-size:1.5rem; } .adblocker-popup-content p, .adblocker-popup-btn { font-size:1rem; } }
        `;
        document.head.appendChild(style);

        // Theme support
        function updateTheme() {
            var theme = document.documentElement.getAttribute('data-theme') || 'dark';
            var content = modal.querySelector('.adblocker-popup-content');
            if (theme === 'light') {
                content.style.background = '#fff';
                content.style.color = '#222';
            } else {
                content.style.background = '#181818';
                content.style.color = '#fff';
            }
        }
        updateTheme();
        document.addEventListener('themeChanged', updateTheme);
    }

    document.addEventListener('DOMContentLoaded', function () {
        // --- Adblocker Detection ---
        var adBait = document.createElement('div');
        adBait.innerHTML = '&nbsp;';
        adBait.className = 'adsbox'; // A class adblockers often target
        adBait.style.position = 'absolute';
        adBait.style.left = '-9999px';
        adBait.style.top = '-9999px';
        adBait.style.width = '1px';
        adBait.style.height = '1px';
        document.body.appendChild(adBait);

        // Wait for the browser to render and for adblocker to hide the element
        setTimeout(function () {
            if (adBait.offsetHeight === 0) {
                // Adblocker is active, do nothing.
                console.log('Adblocker detected. Popup suppressed.');
                adBait.remove();
            } else {
                // No adblocker detected, show the popup.
                console.log('No adblocker detected. Showing popup.');
                adBait.remove();
                showAdblockerPopup();
            }
        }, 100);
    });
})(); 
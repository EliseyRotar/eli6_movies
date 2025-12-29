const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const AUTH_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')
    ? `http://${window.location.hostname}:3000/api`
    : '/api';
const TMDB_BASE_URL = `${AUTH_API_URL}/tmdb`;

class FetchQueue {
    constructor(concurrency = 3) {
        this.concurrency = concurrency;
        this.running = 0;
        this.queue = [];
    }
    add(task) {
        this.queue.push(task);
        this.next();
    }
    async next() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;
        this.running++;
        const task = this.queue.shift();
        try {
            await task();
        } finally {
            this.running--;
            // Delay between tasks to avoid rate limiting (2000ms for sections, 500ms for durations)
            const delay = this === sectionQueue ? 2000 : 500;
            setTimeout(() => this.next(), delay);
        }
    }
}
const durationQueue = new FetchQueue(1); // Reduced to 1 to avoid overwhelming backend
const sectionQueue = new FetchQueue(1); // Load sections one at a time to avoid rate limiting

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        showNotification('Please log in to use this feature', 'error');
        return false;
    }
    return true;
}

function createMovieCard(movie) {
    const posterPath = movie.poster_path
        ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
        : 'https://via.placeholder.com/200x300?text=No+Image';
    const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const title = movie.title;
    const overview = movie.overview
        ? movie.overview.substring(0, 100) + (movie.overview.length > 100 ? '...' : '')
        : '';
    const myListArr = JSON.parse(localStorage.getItem('myList') || '[]');
    const isInList = myListArr.some(
        (listItem) => listItem.id === movie.id && listItem.type === 'movie'
    );
    let duration = 'N/A';
    if (typeof movie.runtime === 'number') {
        duration = `${movie.runtime} min`;
    }
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
        <img src="${posterPath}" alt="${title}" onerror="this.src='https://via.placeholder.com/200x300?text=No+Image'">
        <div class="movie-info">
            <div class="card-actions">
                <button class="action-btn play-btn" onclick="event.stopPropagation(); playContent(${movie.id}, 'movie')">
                    <i class="material-icons">play_arrow</i>
                </button>
                <button class="mylist-btn${isInList ? ' in-list' : ''}" data-mylist-item='{"id":${movie.id},"title":"${title}","type":"movie","poster_path":"${posterPath}","overview":"${overview}"}'>
                    <i class="material-icons">${isInList ? 'check' : 'add'}</i>
                </button>
            </div>
            <div class="movie-title">${title}</div>
            <div class="card-meta">
                <span class="rating"><i class="material-icons" style="font-size: 16px;">star</i> ${rating}</span>
                <span>|</span>
                <span>${year}</span>
                <span>|</span>
                <span class="duration">${duration}</span>
            </div>
            <p class="movie-overview">${overview}</p>
        </div>
    `;
    card.addEventListener('click', (e) => {
        if (e.target.closest('.action-btn, .mylist-btn')) return;
        playContent(movie.id, 'movie');
    });
    return card;
}

async function fetchAndSetMovieDuration(movie, card) {
    try {
        const url = `${TMDB_BASE_URL}/movie/${movie.id}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        let duration = 'N/A';
        if (typeof data.runtime === 'number') {
            duration = `${data.runtime} min`;
        }
        const durationSpan = card.querySelector('.duration');
        if (durationSpan) durationSpan.textContent = duration;
    } catch (e) { }
}

function playContent(id, type) {
    window.location.href = `player.php?type=${type}&id=${id}`;
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 10px 20px;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'};
        color: white;
        border-radius: 4px;
        z-index: 9999;
        animation: fadeInOut 3s forwards;
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function fetchContent(endpoint, lang, retryCount = 0) {
    try {
        let url = `${TMDB_BASE_URL}${endpoint}`;
        // Fix double & issue - check if URL already ends with & or ?
        if (lang) {
            if (url.includes('?')) {
                // URL already has query params, add & if not already there
                url += url.endsWith('&') ? '' : '&';
                url += `language=${lang}`;
            } else {
                url += `?language=${lang}`;
            }
        }
        const response = await fetch(url);
        if (!response.ok) {
            // Handle rate limiting (429) with retry
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const retryAfterSeconds = retryAfter ? parseInt(retryAfter) : 0;
                // Only retry if retry-after is reasonable (< 60 seconds) and we haven't retried too many times
                if (retryCount < 2 && retryAfterSeconds > 0 && retryAfterSeconds < 60) {
                    const delay = retryAfterSeconds * 1000;
                    console.warn(`Rate limited for ${endpoint}, retrying after ${retryAfterSeconds}s (attempt ${retryCount + 1}/2)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchContent(endpoint, lang, retryCount + 1);
                }
                // Rate limit is too long or we've retried enough - return special error code
                console.error(`Rate limited for ${endpoint}, retry-after: ${retryAfterSeconds}s`);
                return { error: 'RATE_LIMITED', retryAfter: retryAfterSeconds };
            }
            console.error(`HTTP error! status: ${response.status} for ${endpoint}`);
            return null; // Return null for HTTP errors
        }
        const data = await response.json();
        // Check if this is an error response from the backend (has error property)
        if (data.error) {
            console.error(`Backend error for ${endpoint}:`, data.error);
            return null; // Return null for backend errors
        }
        // Check if response has the expected structure (results array)
        // For discover/trending endpoints, results should always be an array
        if (data.results !== undefined) {
            return Array.isArray(data.results) ? data.results : [];
        }
        // If no results property, it might be a different endpoint structure
        // Return empty array as fallback (not an error)
        return [];
    } catch (error) {
        console.error(`Error fetching content for ${endpoint}:`, error);
        return null;
    }
}

async function loadContent() {
    const lang = window.i18n ? window.i18n.getTMDBLanguage() : 'en-US';
    const sections = [
        { id: 'trending-movies-row', endpoint: '/trending/movie/week', i18nKey: 'movies.sections.trending' },
        { id: 'action-movies-row', endpoint: '/discover/movie?with_genres=28&sort_by=popularity.desc', i18nKey: 'movies.sections.action' },
        { id: 'comedy-movies-row', endpoint: '/discover/movie?with_genres=35&sort_by=popularity.desc', i18nKey: 'movies.sections.comedy' },
        { id: 'drama-movies-row', endpoint: '/discover/movie?with_genres=18&sort_by=popularity.desc', i18nKey: 'movies.sections.drama' },
        { id: 'horror-movies-row', endpoint: '/discover/movie?with_genres=27&sort_by=popularity.desc', i18nKey: 'movies.sections.horror' },
        { id: 'animation-movies-row', endpoint: '/discover/movie?with_genres=16&sort_by=popularity.desc', i18nKey: 'movies.sections.animation' },
        { id: 'scifi-movies-row', endpoint: '/discover/movie?with_genres=878&sort_by=popularity.desc', i18nKey: 'movies.sections.scifi' },
        { id: 'crime-movies-row', endpoint: '/discover/movie?with_genres=80&sort_by=popularity.desc', i18nKey: 'movies.sections.crime' },
        { id: 'family-movies-row', endpoint: '/discover/movie?with_genres=10751&sort_by=popularity.desc', i18nKey: 'movies.sections.family' },
        { id: 'romance-movies-row', endpoint: '/discover/movie?with_genres=10749&sort_by=popularity.desc', i18nKey: 'movies.sections.romance' },
        { id: 'mystery-movies-row', endpoint: '/discover/movie?with_genres=9648&sort_by=popularity.desc', i18nKey: 'movies.sections.mystery' },
        { id: 'fantasy-movies-row', endpoint: '/discover/movie?with_genres=14&sort_by=popularity.desc', i18nKey: 'movies.sections.fantasy' },
        { id: 'documentary-movies-row', endpoint: '/discover/movie?with_genres=99&sort_by=popularity.desc', i18nKey: 'movies.sections.documentary' },
        { id: 'adventure-movies-row', endpoint: '/discover/movie?with_genres=12&sort_by=popularity.desc', i18nKey: 'movies.sections.adventure' },
        { id: 'history-movies-row', endpoint: '/discover/movie?with_genres=36&sort_by=popularity.desc', i18nKey: 'movies.sections.history' },
        { id: 'music-movies-row', endpoint: '/discover/movie?with_genres=10402&sort_by=popularity.desc', i18nKey: 'movies.sections.music' },
        { id: 'thriller-movies-row', endpoint: '/discover/movie?with_genres=53&sort_by=popularity.desc', i18nKey: 'movies.sections.thriller' },
        { id: 'war-movies-row', endpoint: '/discover/movie?with_genres=10752&sort_by=popularity.desc', i18nKey: 'movies.sections.war' },
        { id: 'western-movies-row', endpoint: '/discover/movie?with_genres=37&sort_by=popularity.desc', i18nKey: 'movies.sections.western' }
    ];

    const loadSection = async (section) => {
        const container = document.getElementById(section.id);
        if (!container) return;

        try {
            const results = await fetchContent(section.endpoint, lang);
            if (results === null) {
                // Fetch failed (server error)
                container.innerHTML = `<div class="loading">${window.i18n ? window.i18n.t('search.errorOccurred') : 'Error loading content'}</div>`;
            } else if (results && results.error === 'RATE_LIMITED') {
                // Rate limited - show specific message
                const retryAfter = results.retryAfter || 0;
                const minutes = Math.ceil(retryAfter / 60);
                const rateLimitMsg = window.i18n 
                    ? `Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`
                    : `Rate limit exceeded. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
                container.innerHTML = `<div class="loading">${rateLimitMsg}</div>`;
            } else if (Array.isArray(results) && results.length > 0) {
                container.innerHTML = '';
                results.forEach((movie, index) => {
                    const card = createMovieCard(movie);
                    container.appendChild(card);
                    // Duration fetches disabled to prevent backend overload
                    // if (index < 5) {
                    //     durationQueue.add(() => fetchAndSetMovieDuration(movie, card));
                    // }
                });
                if (window.initMyListButtons) window.initMyListButtons();
                // Initialize scroll buttons for this section
                initScrollButtons(container);
            } else {
                // Empty array or invalid response
                const sectionName = window.i18n ? window.i18n.t(section.i18nKey) : section.i18nKey;
                const noResultsMsg = window.i18n
                    ? window.i18n.t('search.noResultsFor').replace('{query}', sectionName)
                    : `No ${sectionName} found`;
                container.innerHTML = `<div class="loading">${noResultsMsg}</div>`;
            }
        } catch (error) {
            console.error(`Error loading section ${section.id}:`, error);
            container.innerHTML = `<div class="loading">${window.i18n ? window.i18n.t('search.errorOccurred') : 'Error loading content'}</div>`;
        }
    };

    // Load sections using queue with initial delay to avoid hitting rate limits
    // Wait 2 seconds before starting to let any previous rate limit buckets reset
    setTimeout(() => {
        sections.forEach(section => {
            sectionQueue.add(() => loadSection(section));
        });
    }, 2000);
}

function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

async function reloadAllTMDBContent() {
    await loadContent();
}

if (window.i18next && typeof window.i18next.on === 'function') {
    window.i18next.on(
        'languageChanged',
        debounce(async (lng) => {
            await reloadAllTMDBContent();
        }, 200)
    );
} else if (window.i18n) {
    const origChangeLanguage = window.i18n.changeLanguage.bind(window.i18n);
    window.i18n.changeLanguage = debounce(async function (lang) {
        await origChangeLanguage(lang);
        await reloadAllTMDBContent();
    }, 200);
}

document.addEventListener('DOMContentLoaded', reloadAllTMDBContent);

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

function initScrollButtons(row) {
    // Check if buttons already exist to avoid duplicates
    const parent = row.parentElement;
    if (parent.querySelector('.scroll-button')) {
        return; // Buttons already exist
    }

    const leftBtn = document.createElement('button');
    leftBtn.className = 'scroll-button scroll-left';
    leftBtn.innerHTML = '<i class="material-icons">chevron_left</i>';
    leftBtn.onclick = () => row.scrollBy({ left: -200, behavior: 'smooth' });

    const rightBtn = document.createElement('button');
    rightBtn.className = 'scroll-button scroll-right';
    rightBtn.innerHTML = '<i class="material-icons">chevron_right</i>';
    rightBtn.onclick = () => row.scrollBy({ left: 200, behavior: 'smooth' });

    parent.appendChild(leftBtn);
    parent.appendChild(rightBtn);
}

// Initialize scroll buttons for any existing rows (for initial page load)
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.movie-row').forEach((row) => {
        initScrollButtons(row);
    });
});


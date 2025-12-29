const AUTH_API_URL = 'https://streaming.ecolens.me/api';
const TMDB_BASE_URL = `${AUTH_API_URL}/tmdb`;
const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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
    } catch (e) {}
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

async function fetchContent(endpoint, lang) {
    try {
        let url = `${TMDB_BASE_URL}${endpoint}`;
        url += url.includes('?') ? '&' : '?';
        if (lang) {
            url += `&language=${lang}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error(`Error fetching content:`, error);
        return [];
    }
}

async function loadContent() {
    try {
        const lang = window.i18n ? window.i18n.getTMDBLanguage() : 'en-US';
        const trendingMovies = await fetchContent('/trending/movie/week', lang);
        const trendingContainer = document.getElementById('trending-movies-row');
        if (trendingContainer && trendingMovies.length > 0) {
            trendingContainer.innerHTML = '';
            trendingMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                trendingContainer.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (trendingContainer) {
            trendingContainer.innerHTML = '<div class="loading">No trending movies found</div>';
        }

        const actionMovies = await fetchContent(
            '/discover/movie?with_genres=28&sort_by=popularity.desc',
            lang
        );
        const actionMoviesRow = document.getElementById('action-movies-row');
        if (actionMoviesRow && actionMovies.length > 0) {
            actionMoviesRow.innerHTML = '';
            actionMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                actionMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (actionMoviesRow) {
            actionMoviesRow.innerHTML = '<div class="loading">No action movies found</div>';
        }

        const comedyMovies = await fetchContent(
            '/discover/movie?with_genres=35&sort_by=popularity.desc',
            lang
        );
        const comedyMoviesRow = document.getElementById('comedy-movies-row');
        if (comedyMoviesRow && comedyMovies.length > 0) {
            comedyMoviesRow.innerHTML = '';
            comedyMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                comedyMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (comedyMoviesRow) {
            comedyMoviesRow.innerHTML = '<div class="loading">No comedy movies found</div>';
        }

        const dramaMovies = await fetchContent(
            '/discover/movie?with_genres=18&sort_by=popularity.desc',
            lang
        );
        const dramaMoviesRow = document.getElementById('drama-movies-row');
        if (dramaMoviesRow && dramaMovies.length > 0) {
            dramaMoviesRow.innerHTML = '';
            dramaMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                dramaMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (dramaMoviesRow) {
            dramaMoviesRow.innerHTML = '<div class="loading">No drama movies found</div>';
        }

        const horrorMovies = await fetchContent(
            '/discover/movie?with_genres=27&sort_by=popularity.desc',
            lang
        );
        const horrorMoviesRow = document.getElementById('horror-movies-row');
        if (horrorMoviesRow && horrorMovies.length > 0) {
            horrorMoviesRow.innerHTML = '';
            horrorMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                horrorMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (horrorMoviesRow) {
            horrorMoviesRow.innerHTML = '<div class="loading">No horror movies found</div>';
        }

        const animationMovies = await fetchContent(
            '/discover/movie?with_genres=16&sort_by=popularity.desc',
            lang
        );
        const animationMoviesRow = document.getElementById('animation-movies-row');
        if (animationMoviesRow && animationMovies.length > 0) {
            animationMoviesRow.innerHTML = '';
            animationMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                animationMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (animationMoviesRow) {
            animationMoviesRow.innerHTML = '<div class="loading">No animation movies found</div>';
        }

        const scifiMovies = await fetchContent(
            '/discover/movie?with_genres=878&sort_by=popularity.desc',
            lang
        );
        const scifiMoviesRow = document.getElementById('scifi-movies-row');
        if (scifiMoviesRow && scifiMovies.length > 0) {
            scifiMoviesRow.innerHTML = '';
            scifiMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                scifiMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (scifiMoviesRow) {
            scifiMoviesRow.innerHTML = '<div class="loading">No science fiction movies found</div>';
        }

        const crimeMovies = await fetchContent(
            '/discover/movie?with_genres=80&sort_by=popularity.desc',
            lang
        );
        const crimeMoviesRow = document.getElementById('crime-movies-row');
        if (crimeMoviesRow && crimeMovies.length > 0) {
            crimeMoviesRow.innerHTML = '';
            crimeMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                crimeMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (crimeMoviesRow) {
            crimeMoviesRow.innerHTML = '<div class="loading">No crime movies found</div>';
        }

        const familyMovies = await fetchContent(
            '/discover/movie?with_genres=10751&sort_by=popularity.desc',
            lang
        );
        const familyMoviesRow = document.getElementById('family-movies-row');
        if (familyMoviesRow && familyMovies.length > 0) {
            familyMoviesRow.innerHTML = '';
            familyMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                familyMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (familyMoviesRow) {
            familyMoviesRow.innerHTML = '<div class="loading">No family movies found</div>';
        }

        const romanceMovies = await fetchContent(
            '/discover/movie?with_genres=10749&sort_by=popularity.desc',
            lang
        );
        const romanceMoviesRow = document.getElementById('romance-movies-row');
        if (romanceMoviesRow && romanceMovies.length > 0) {
            romanceMoviesRow.innerHTML = '';
            romanceMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                romanceMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (romanceMoviesRow) {
            romanceMoviesRow.innerHTML = '<div class="loading">No romance movies found</div>';
        }

        const mysteryMovies = await fetchContent(
            '/discover/movie?with_genres=9648&sort_by=popularity.desc',
            lang
        );
        const mysteryMoviesRow = document.getElementById('mystery-movies-row');
        if (mysteryMoviesRow && mysteryMovies.length > 0) {
            mysteryMoviesRow.innerHTML = '';
            mysteryMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                mysteryMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (mysteryMoviesRow) {
            mysteryMoviesRow.innerHTML = '<div class="loading">No mystery movies found</div>';
        }

        const fantasyMovies = await fetchContent(
            '/discover/movie?with_genres=14&sort_by=popularity.desc',
            lang
        );
        const fantasyMoviesRow = document.getElementById('fantasy-movies-row');
        if (fantasyMoviesRow && fantasyMovies.length > 0) {
            fantasyMoviesRow.innerHTML = '';
            fantasyMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                fantasyMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (fantasyMoviesRow) {
            fantasyMoviesRow.innerHTML = '<div class="loading">No fantasy movies found</div>';
        }

        const documentaryMovies = await fetchContent(
            '/discover/movie?with_genres=99&sort_by=popularity.desc',
            lang
        );
        const documentaryMoviesRow = document.getElementById('documentary-movies-row');
        if (documentaryMoviesRow && documentaryMovies.length > 0) {
            documentaryMoviesRow.innerHTML = '';
            documentaryMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                documentaryMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (documentaryMoviesRow) {
            documentaryMoviesRow.innerHTML =
                '<div class="loading">No documentary movies found</div>';
        }

        const adventureMovies = await fetchContent(
            '/discover/movie?with_genres=12&sort_by=popularity.desc',
            lang
        );
        const adventureMoviesRow = document.getElementById('adventure-movies-row');
        if (adventureMoviesRow && adventureMovies.length > 0) {
            adventureMoviesRow.innerHTML = '';
            adventureMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                adventureMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (adventureMoviesRow) {
            adventureMoviesRow.innerHTML = '<div class="loading">No adventure movies found</div>';
        }

        const historyMovies = await fetchContent(
            '/discover/movie?with_genres=36&sort_by=popularity.desc',
            lang
        );
        const historyMoviesRow = document.getElementById('history-movies-row');
        if (historyMoviesRow && historyMovies.length > 0) {
            historyMoviesRow.innerHTML = '';
            historyMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                historyMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (historyMoviesRow) {
            historyMoviesRow.innerHTML = '<div class="loading">No history movies found</div>';
        }

        const musicMovies = await fetchContent(
            '/discover/movie?with_genres=10402&sort_by=popularity.desc',
            lang
        );
        const musicMoviesRow = document.getElementById('music-movies-row');
        if (musicMoviesRow && musicMovies.length > 0) {
            musicMoviesRow.innerHTML = '';
            musicMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                musicMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (musicMoviesRow) {
            musicMoviesRow.innerHTML = '<div class="loading">No music movies found</div>';
        }

        const thrillerMovies = await fetchContent(
            '/discover/movie?with_genres=53&sort_by=popularity.desc',
            lang
        );
        const thrillerMoviesRow = document.getElementById('thriller-movies-row');
        if (thrillerMoviesRow && thrillerMovies.length > 0) {
            thrillerMoviesRow.innerHTML = '';
            thrillerMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                thrillerMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (thrillerMoviesRow) {
            thrillerMoviesRow.innerHTML = '<div class="loading">No thriller movies found</div>';
        }

        const warMovies = await fetchContent(
            '/discover/movie?with_genres=10752&sort_by=popularity.desc',
            lang
        );
        const warMoviesRow = document.getElementById('war-movies-row');
        if (warMoviesRow && warMovies.length > 0) {
            warMoviesRow.innerHTML = '';
            warMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                warMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (warMoviesRow) {
            warMoviesRow.innerHTML = '<div class="loading">No war movies found</div>';
        }

        const westernMovies = await fetchContent(
            '/discover/movie?with_genres=37&sort_by=popularity.desc',
            lang
        );
        const westernMoviesRow = document.getElementById('western-movies-row');
        if (westernMoviesRow && westernMovies.length > 0) {
            westernMoviesRow.innerHTML = '';
            westernMovies.forEach((movie) => {
                const card = createMovieCard(movie);
                westernMoviesRow.appendChild(card);
                fetchAndSetMovieDuration(movie, card);
            });
            window.initMyListButtons && window.initMyListButtons();
        } else if (westernMoviesRow) {
            westernMoviesRow.innerHTML = '<div class="loading">No western movies found</div>';
        }
    } catch (error) {
        console.error('Error loading content:', error);
        document.querySelectorAll('.movie-row').forEach((row) => {
            row.innerHTML =
                '<div class="loading">Error loading content. Please try again later.</div>';
        });
    }
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

document.querySelectorAll('.movie-row').forEach((row) => {
    const leftBtn = document.createElement('button');
    leftBtn.className = 'scroll-button scroll-left';
    leftBtn.innerHTML = '<i class="material-icons">chevron_left</i>';
    leftBtn.onclick = () => row.scrollBy({ left: -200, behavior: 'smooth' });

    const rightBtn = document.createElement('button');
    rightBtn.className = 'scroll-button scroll-right';
    rightBtn.innerHTML = '<i class="material-icons">chevron_right</i>';
    rightBtn.onclick = () => row.scrollBy({ left: 200, behavior: 'smooth' });

    row.parentElement.appendChild(leftBtn);
    row.parentElement.appendChild(rightBtn);
});

if (window.i18n) {
    const origChangeLanguage = window.i18n.changeLanguage.bind(window.i18n);
    window.i18n.changeLanguage = async function (lang) {
        await origChangeLanguage(lang);
        await loadContent();
    };
}

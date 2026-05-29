// ELI6 Movies — home page logic
// Fetch layer preserved; render layer now uses components.js

const AUTH_API_URL  = window.API_BASE_URL  || '';
const TMDB_BASE_URL = window.TMDB_PROXY_URL || (AUTH_API_URL ? AUTH_API_URL + '/tmdb' : '');

// ─── TMDB fetch helpers ───────────────────────────────────────────────────────

async function fetchContent(type, category, lang) {
  const endpoints = {
    movie: {
      trending:  '/trending/movie/week',
      popular:   '/movie/popular',
      upcoming:  '/movie/upcoming',
      top_rated: '/movie/top_rated',
    },
    tv: {
      trending: '/trending/tv/week',
    },
  };
  const ep  = (endpoints[type] && endpoints[type][category]) || '/movie/popular';
  let url = TMDB_BASE_URL + ep;
  if (lang) url += (url.includes('?') ? '&' : '?') + 'language=' + encodeURIComponent(lang);
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    return d.results || [];
  } catch (e) {
    console.error('fetchContent error', e);
    return [];
  }
}

async function fetchTMDBWithFallback(type, category, lang) {
  const data = await fetchContent(type, category, lang);
  if (lang !== 'en-US') {
    const missing = data.filter(i => !(i.title || i.name) || !i.overview);
    if (missing.length) {
      const enData = await fetchContent(type, category, 'en-US');
      return data.map((item, i) => {
        const en = enData[i] || {};
        return Object.assign({}, item, {
          title:    item.title    || item.name    || en.title    || en.name,
          overview: item.overview || en.overview  || '',
        });
      });
    }
  }
  return data;
}

async function fetchKeepWatching() {
  if (!localStorage.getItem('user')) return [];
  try {
    const r = await fetch(AUTH_API_URL + '/user/keep-watching', {
      credentials: 'include',
    });
    return r.ok ? await r.json() : [];
  } catch (e) { return []; }
}

async function fetchTMDBItemWithFallback(id, type, lang) {
  const ep = (type === 'movie' ? '/movie/' : '/tv/') + id;
  try {
    const r = await fetch(TMDB_BASE_URL + ep + '?language=' + encodeURIComponent(lang));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    let data = await r.json();
    if (lang !== 'en-US' && ((!data.title && !data.name) || !data.overview)) {
      const enR = await fetch(TMDB_BASE_URL + ep + '?language=en-US');
      const en  = enR.ok ? await enR.json() : {};
      data = Object.assign({}, data, {
        title:    data.title    || data.name    || en.title    || en.name,
        overview: data.overview || en.overview  || '',
      });
    }
    return data;
  } catch (e) { return {}; }
}

async function fetchAnimeContent() {
  if (!AUTH_API_URL) return [];
  try {
    const r = await fetch(AUTH_API_URL + '/anime/trending');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();
    return (data || []).map(a => ({
      id:             a.slug,
      name:           a.title_en || a.title_jp || a.slug,
      poster_path:    a.poster_url,
      overview:       a.description || '',
      vote_average:   a.score,
      first_air_date: a.aired || '',
      kind:           'anime',
      link_url:       a.link_url,
    }));
  } catch (e) { return []; }
}

// ─── My List sync ─────────────────────────────────────────────────────────────

async function syncMyList() {
  if (!localStorage.getItem('user')) return;
  try {
    const r = await fetch(AUTH_API_URL + '/user/profile', {
      credentials: 'include',
    });
    const data = r.ok ? await r.json() : {};
    localStorage.setItem('myList', JSON.stringify(data.myList || []));
  } catch (e) {
    localStorage.setItem('myList', '[]');
  }
}

// ─── Play ─────────────────────────────────────────────────────────────────────

function playContent(id, type, link_url) {
  if (type === 'anime' && link_url) {
    window.location.href = 'player.html?type=anime&link_url=' + encodeURIComponent(link_url);
  } else {
    window.location.href = 'player.html?type=' + type + '&id=' + id;
  }
}

// ─── Item → component-compatible shape ───────────────────────────────────────

function normalise(item, type) {
  return Object.assign({}, item, {
    kind:   item.kind || type || (item.title ? 'movie' : 'tv'),
    year:   (item.release_date || item.first_air_date || '').slice(0, 4),
    rating: item.vote_average ? item.vote_average.toFixed(1) : '',
    title:  item.title || item.name || '',
  });
}

// ─── Remove from Keep Watching ───────────────────────────────────────────────

async function removeFromKeepWatching(id, type) {
  try {
    await fetch(AUTH_API_URL + '/user/keep-watching/' + id + '/' + type, {
      method: 'DELETE',
      credentials: 'include',
    });
    showToast('Removed from Continue Watching');
    initPage();
  } catch (e) {
    showToast('Failed to remove', 'error');
  }
}

// ─── Main page init ───────────────────────────────────────────────────────────

async function initPage() {
  const lang     = (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';
  const heroMnt  = document.getElementById('hero-mount');
  const rowsMnt  = document.getElementById('rows-mount');
  if (!rowsMnt) return;

  // Clear rows mount (keep watching re-renders)
  rowsMnt.innerHTML = '';

  // Show loading skeleton for rows
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'e6-loading';
  loadingDiv.innerHTML = '<div class="e6-spinner"></div><span>Loading…</span>';
  rowsMnt.appendChild(loadingDiv);

  // Fetch all data in parallel
  const [trending, trendingTV, popular, upcoming, topRated, anime, keepWatching] = await Promise.all([
    fetchTMDBWithFallback('movie', 'trending',  lang),
    fetchTMDBWithFallback('tv',    'trending',  lang),
    fetchTMDBWithFallback('movie', 'popular',   lang),
    fetchTMDBWithFallback('movie', 'upcoming',  lang),
    fetchTMDBWithFallback('movie', 'top_rated', lang),
    fetchAnimeContent(),
    fetchKeepWatching(),
  ]);

  rowsMnt.innerHTML = '';

  // Hero slider — first 7 from trending mix
  if (heroMnt) {
    const heroItems = [
      ...trending.slice(0, 3),
      ...trendingTV.slice(0, 2),
      ...popular.slice(0, 2),
    ]
    .sort(() => Math.random() - 0.5)
    .slice(0, 7)
    .map(i => normalise(i));

    makeHeroSlider(heroItems, heroMnt, {
      onWatch: function (item) { playContent(item.id, item.kind || 'movie'); },
    });
  }

  // Continue Watching row (only if logged in and has items)
  if (keepWatching.length) {
    const kwItems = keepWatching.map(function (kw) {
      const item = normalise({
        id:          kw.id,
        title:       kw.title,
        type:        kw.type,
        kind:        kw.type,
        poster_path: kw.poster_path,
        overview:    kw.overview || '',
        progress:    kw.progress ?? 0,
        season:      kw.season,
        episode:     kw.episode,
      }, kw.type);
      if (kw.type === 'tv' && kw.season) {
        item.episodeLabel = 'S' + kw.season + ' E' + (kw.episode || 1);
      }
      return item;
    });
    const kwRow = makeRow(tr('home.rows.keepWatching', 'Continue Watching'), kwItems, {
      onPick: function (item) {
        if (item.type === 'tv' && item.season) {
          window.location.href = 'player.html?type=tv&id=' + item.id + '&season=' + item.season + '&episode=' + (item.episode || 1);
        } else {
          playContent(item.id, item.kind || 'movie');
        }
      },
      onRemove: function (item) {
        removeFromKeepWatching(item.id, item.type);
      },
    });
    rowsMnt.insertBefore(kwRow, rowsMnt.firstChild);
  }

  // Trending Now (numbered, 10 items)
  if (trending.length) {
    const row = makeRow(tr('home.rows.trendingNow', 'Trending Now'), trending.slice(0, 10).map(i => normalise(i, 'movie')), {
      numbered:   true,
      seeAllHref: 'movies.html',
      onPick: function (item) { openDetailModal(item); },
    });
    rowsMnt.appendChild(row);
  }

  // New Releases
  if (upcoming.length) {
    const row = makeRow(tr('home.rows.newReleases', 'New Releases'), upcoming.slice(0, 20).map(i => normalise(i, 'movie')), {
      seeAllHref: 'movies.html',
      onPick: function (item) { openDetailModal(item); },
    });
    rowsMnt.appendChild(row);
  }

  // Critically Acclaimed
  if (topRated.length) {
    const row = makeRow(tr('home.rows.criticallyAcclaimed', 'Critically Acclaimed'), topRated.slice(0, 20).map(i => normalise(i, 'movie')), {
      seeAllHref: 'movies.html',
      onPick: function (item) { openDetailModal(item); },
    });
    rowsMnt.appendChild(row);
  }

  // Anime Spotlight
  if (anime.length) {
    const row = makeRow(tr('home.rows.animeSpotlight', 'Anime Spotlight'), anime.slice(0, 20), {
      seeAllHref: 'anime.html',
      onPick: function (item) { playContent(item.id, 'anime', item.link_url); },
    });
    rowsMnt.appendChild(row);
  }

  // Because you watched…
  if (trendingTV.length) {
    const row = makeRow(tr('home.rows.becauseYouWatched', 'Because You Watched'), trendingTV.slice(0, 20).map(i => normalise(i, 'tv')), {
      seeAllHref: 'tvshows.html',
      onPick: function (item) { openDetailModal(item); },
    });
    rowsMnt.appendChild(row);
  }

  // Footer
  renderFooter('footer-mount');
}

// ─── i18n row-title helper ────────────────────────────────────────────────────

function tr(key, fallback) {
  return (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async function () {
  renderTopNav('home');
  renderBottomNav('home');
  await syncMyList();
  await initPage();

  // Re-render nav on theme changes
  document.addEventListener('eli6.themeChanged', function () {
    renderTopNav('home');
    renderBottomNav('home');
  });
});

// Re-fetch all home page content in the new language when the user switches language
window.addEventListener('eli6.langChanged', function () {
  initPage();
});

// ELI6 Movies — movies browse page

(function () {
  var API_URL  = window.API_BASE_URL  || '';
  var TMDB_URL = window.TMDB_PROXY_URL || (API_URL ? API_URL + '/tmdb' : '');

  function tr(key, fallback) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;
  }

  var GENRES = [
    { id: 28,  name: "Action" },
    { id: 35,  name: "Comedy" },
    { id: 18,  name: "Drama" },
    { id: 27,  name: "Horror" },
    { id: 878, name: "Sci-Fi" },
    { id: 53,  name: "Thriller" },
    { id: 10749, name: "Romance" },
    { id: 16,  name: "Animation" },
    { id: 99,  name: "Documentary" },
    { id: 12,  name: "Adventure" },
    { id: 80,  name: "Crime" },
    { id: 14,  name: "Fantasy" },
  ];

  var GENRE_KEYS = {
    28:    'movies.sections.action',
    35:    'movies.sections.comedy',
    18:    'movies.sections.drama',
    27:    'movies.sections.horror',
    878:   'movies.sections.scifi',
    53:    'movies.sections.thriller',
    10749: 'movies.sections.romance',
    16:    'movies.sections.animation',
    99:    'movies.sections.documentary',
    12:    'movies.sections.adventure',
    80:    'movies.sections.crime',
    14:    'movies.sections.fantasy',
  };

  var activeGenre = null;
  var _moviePage = 1;
  var _movieLang = 'en-US';

  async function loadMoreMovies() {
    _moviePage++;
    var items = await fetchMovies('/discover/movie?with_genres=' + activeGenre + '&sort_by=popularity.desc&page=' + _moviePage, _movieLang);
    if (!items.length) return;
    var grid = document.getElementById('movies-genre-grid');
    if (!grid) return;
    items.forEach(function (item) {
      var n = normalise(item);
      grid.appendChild(window.makePoster(n, { onClick: function () { window.openDetailModal(n); } }));
    });
  }

  async function fetchMovies(endpoint, lang) {
    lang = lang || 'en-US';
    try {
      var r = await fetch(TMDB_URL + endpoint + (endpoint.includes('?') ? '&' : '?') + 'language=' + encodeURIComponent(lang));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      return d.results || [];
    } catch (e) { return []; }
  }

  function normalise(item) {
    return Object.assign({}, item, {
      kind:   item.kind || (item.title ? 'movie' : 'tv'),
      year:   (item.release_date || '').slice(0, 4),
      rating: item.vote_average ? item.vote_average.toFixed(1) : '',
      title:  item.title || item.name || '',
    });
  }

  function buildPills() {
    var mount = document.getElementById('pills-mount');
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'pills';

    var allPill = document.createElement('button');
    allPill.className = 'pill' + (!activeGenre ? ' pill--active' : '');
    allPill.textContent = tr('common.all', 'All');
    allPill.addEventListener('click', function () { activeGenre = null; renderPage(); });
    wrap.appendChild(allPill);

    GENRES.forEach(function (g) {
      var pill = document.createElement('button');
      pill.className = 'pill' + (activeGenre === g.id ? ' pill--active' : '');
      pill.textContent = tr(GENRE_KEYS[g.id] || '', g.name);
      pill.addEventListener('click', function () { activeGenre = g.id; renderPage(); });
      wrap.appendChild(pill);
    });

    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  async function renderPage() {
    buildPills();

    var mount = document.getElementById('rows-mount');
    if (!mount) return;

    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>' + tr('common.loading', 'Loading…') + '</span></div>';

    var lang = (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';
    _movieLang = lang;

    var sections;
    if (activeGenre) {
      _moviePage = 1;
      var items = await fetchMovies('/discover/movie?with_genres=' + activeGenre + '&sort_by=popularity.desc&page=1', lang);
      mount.innerHTML = '';
      if (!items.length) {
        mount.innerHTML = '<div class="empty"><div class="empty__icon">◻</div><div class="empty__title">' + tr('common.noResults', 'No results') + '</div><div class="empty__sub">' + tr('common.tryDifferentGenre', 'Try a different genre.') + '</div></div>';
        return;
      }
      var gridWrap = document.createElement('div');
      gridWrap.style.padding = '20px var(--pad-x) 0';
      var grid = document.createElement('div');
      grid.className = 'grid';
      grid.id = 'movies-genre-grid';
      items.forEach(function (item) {
        var n = normalise(item);
        grid.appendChild(window.makePoster(n, { onClick: function () { window.openDetailModal(n); } }));
      });
      gridWrap.appendChild(grid);
      mount.appendChild(gridWrap);
      var loadMoreWrap = document.createElement('div');
      loadMoreWrap.style.cssText = 'text-align:center;padding:28px 0 48px';
      var loadMoreBtn = document.createElement('button');
      loadMoreBtn.className = 'btn btn--ghost';
      loadMoreBtn.textContent = 'Load more';
      loadMoreBtn.style.cssText = 'padding:10px 32px;font-size:14px';
      loadMoreBtn.addEventListener('click', function () {
        loadMoreBtn.textContent = 'Loading…';
        loadMoreBtn.disabled = true;
        loadMoreMovies().then(function () {
          loadMoreBtn.textContent = 'Load more';
          loadMoreBtn.disabled = false;
        });
      });
      loadMoreWrap.appendChild(loadMoreBtn);
      mount.appendChild(loadMoreWrap);
    } else {
      var results = await Promise.all([
        fetchMovies('/trending/movie/week', lang),
        fetchMovies('/movie/popular', lang),
        fetchMovies('/movie/top_rated', lang),
        fetchMovies('/movie/now_playing', lang),
        fetchMovies('/movie/upcoming', lang),
      ]);

      mount.innerHTML = '';
      var rows = [
        { title: tr('movies.sections.trending',  'Trending Now'),   items: results[0] },
        { title: tr('movies.sections.popular',   'Popular'),        items: results[1] },
        { title: tr('movies.sections.topRated',  'Top Rated'),      items: results[2], numbered: true },
        { title: tr('movies.sections.nowPlaying','Now Playing'),    items: results[3] },
        { title: tr('movies.sections.upcoming',  'Coming Soon'),    items: results[4] },
      ];
      rows.forEach(function (r) {
        if (!r.items || !r.items.length) return;
        var row = window.makeRow(r.title, r.items.map(normalise), {
          numbered: r.numbered,
          onPick:   function (item) { window.openDetailModal(item); },
        });
        mount.appendChild(row);
      });
    }

    window.renderFooter('footer-mount');
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('movies');
    window.renderBottomNav('movies');
    var _p = new URLSearchParams(window.location.search);
    if (_p.get('genre')) activeGenre = parseInt(_p.get('genre'), 10) || null;
    if (_p.get('lang'))  _movieLang  = _p.get('lang');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('movies');
      window.renderBottomNav('movies');
    });
    window.addEventListener('eli6.langChanged', function () {
      renderPage();
    });
  });

})();

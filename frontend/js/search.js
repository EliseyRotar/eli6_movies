// ELI6 Movies — search page

(function () {
  var TMDB_URL = window.TMDB_PROXY_URL || ((window.API_BASE_URL || '') + '/tmdb');
  var _timer = null;
  var _currentQuery = '';

  var FILTER_LABELS = ['All', 'Movies', 'TV Shows', 'Anime'];
  var FILTER_VALUES = ['all', 'movie', 'tv', 'anime'];
  var activeFilter = 'all';
  var _searchPage = 1;
  var API_URL = window.API_BASE_URL || '';

  function _saveSearch(q) {
    try {
      var recent = JSON.parse(localStorage.getItem('eli6.searches') || '[]');
      recent = [q].concat(recent.filter(function (s) { return s !== q; })).slice(0, 8);
      localStorage.setItem('eli6.searches', JSON.stringify(recent));
    } catch (e) {}
  }
  function _getRecentSearches() {
    try { return JSON.parse(localStorage.getItem('eli6.searches') || '[]'); } catch (e) { return []; }
  }

  function buildPills() {
    var mount = document.getElementById('pills-mount');
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'pills';
    FILTER_LABELS.forEach(function (label, i) {
      var pill = document.createElement('button');
      pill.className = 'pill' + (activeFilter === FILTER_VALUES[i] ? ' pill--active' : '');
      pill.textContent = label;
      pill.addEventListener('click', function () {
        activeFilter = FILTER_VALUES[i];
        buildPills();
        if (_currentQuery) doSearch(_currentQuery);
        else showDefaultContent();
      });
      wrap.appendChild(pill);
    });
    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  async function _fetchSearchPage(q, page, lang) {
    var endpoints = [];
    if (activeFilter === 'all' || activeFilter === 'movie') {
      endpoints.push(fetch(TMDB_URL + '/search/movie?query=' + encodeURIComponent(q) + '&page=' + page + '&language=' + lang).then(function (r) { return r.ok ? r.json() : { results: [] }; }));
    }
    if (activeFilter === 'all' || activeFilter === 'tv') {
      endpoints.push(fetch(TMDB_URL + '/search/tv?query=' + encodeURIComponent(q) + '&page=' + page + '&language=' + lang).then(function (r) { return r.ok ? r.json() : { results: [] }; }));
    }
    if (activeFilter === 'anime') {
      endpoints.push(fetch(API_URL + '/catalog/anime/search?q=' + encodeURIComponent(q)).then(function (r) { return r.ok ? r.json().then(function (a) { return { results: a }; }) : { results: [] }; }).catch(function () { return { results: [] }; }));
    }
    var responses = await Promise.all(endpoints);
    var movies = (activeFilter === 'all' || activeFilter === 'movie') ? ((responses[0] && responses[0].results) || []) : [];
    var tv     = (activeFilter === 'all' || activeFilter === 'tv')    ? ((responses[activeFilter === 'all' ? 1 : 0] && responses[activeFilter === 'all' ? 1 : 0].results) || []) : [];
    var anime  = activeFilter === 'anime' ? ((responses[0] && responses[0].results) || []) : [];
    return [
      ...movies.map(function (i) { return Object.assign({}, i, { kind: 'movie', year: (i.release_date || '').slice(0, 4), rating: i.vote_average ? i.vote_average.toFixed(1) : '', title: i.title || i.name || '' }); }),
      ...tv.map(function (i) { return Object.assign({}, i, { kind: 'tv', year: (i.first_air_date || '').slice(0, 4), rating: i.vote_average ? i.vote_average.toFixed(1) : '', title: i.name || i.title || '' }); }),
      ...anime.map(function (i) { return Object.assign({}, i, { kind: 'tv', year: (i.first_air_date || '').slice(0, 4), rating: i.vote_average ? i.vote_average.toFixed(1) : '', title: i.title || i.english_title || '' }); }),
    ].sort(function (a, b) { return (b.vote_average || 0) - (a.vote_average || 0); });
  }

  async function doSearch(q) {
    _currentQuery = q;
    _searchPage = 1;
    _saveSearch(q);
    var mount = document.getElementById('results-mount');
    var countEl = document.getElementById('search-count');
    if (!mount) return;

    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Searching…</span></div>';

    var lang = (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';
    var combined = await _fetchSearchPage(q, 1, lang);

    mount.innerHTML = '';

    if (countEl) countEl.textContent = combined.length ? combined.length + '+ results for "' + q + '"' : '';

    if (!combined.length) {
      mount.innerHTML = '<div class="empty"><div class="empty__icon">⌕</div><div class="empty__title">No results</div><div class="empty__sub">Try different keywords.</div></div>';
      return;
    }

    var grid = document.createElement('div');
    grid.className = 'grid';
    grid.id = 'search-results-grid';
    grid.style.padding = '0 var(--pad-x)';
    combined.forEach(function (item) {
      grid.appendChild(window.makePoster(item, { onClick: function () { window.openDetailModal(item); } }));
    });
    mount.appendChild(grid);

    // Load more button (not shown for anime-only since backend returns all results)
    if (activeFilter !== 'anime') {
      var lmWrap = document.createElement('div');
      lmWrap.style.cssText = 'text-align:center;padding:28px 0 48px';
      var lmBtn = document.createElement('button');
      lmBtn.className = 'btn btn--ghost';
      lmBtn.textContent = 'Load more';
      lmBtn.style.cssText = 'padding:10px 32px;font-size:14px';
      lmBtn.addEventListener('click', function () {
        lmBtn.textContent = 'Loading…'; lmBtn.disabled = true;
        _searchPage++;
        _fetchSearchPage(_currentQuery, _searchPage, lang).then(function (more) {
          var g = document.getElementById('search-results-grid');
          if (g) more.forEach(function (item) {
            g.appendChild(window.makePoster(item, { onClick: function () { window.openDetailModal(item); } }));
          });
          lmBtn.textContent = 'Load more'; lmBtn.disabled = false;
        });
      });
      lmWrap.appendChild(lmBtn);
      mount.appendChild(lmWrap);
    }
  }

  async function showDefaultContent() {
    var mount = document.getElementById('results-mount');
    var countEl = document.getElementById('search-count');
    if (!mount) return;
    if (countEl) countEl.textContent = '';
    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div></div>';

    var lang = (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';

    var results = await Promise.all([
      fetch(TMDB_URL + '/movie/popular?language=' + lang).then(function (r) { return r.ok ? r.json() : { results: [] }; }),
      fetch(TMDB_URL + '/search/tv?query=anime&language=' + lang).then(function (r) { return r.ok ? r.json() : { results: [] }; }),
    ]);

    var popular = (results[0].results || []).map(function (i) {
      return Object.assign({}, i, { kind: 'movie', year: (i.release_date || '').slice(0, 4), rating: i.vote_average ? i.vote_average.toFixed(1) : '', title: i.title || '' });
    });
    var anime = (results[1].results || []).map(function (i) {
      return Object.assign({}, i, { kind: 'tv', year: (i.first_air_date || '').slice(0, 4), rating: i.vote_average ? i.vote_average.toFixed(1) : '', title: i.name || i.title || '' });
    });

    mount.innerHTML = '';

    // Recent searches pills
    var recentWrap = document.createElement('div');
    recentWrap.style.cssText = 'padding:0 var(--pad-x) 8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center';
    var recentLabel = document.createElement('span');
    recentLabel.style.cssText = 'font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--fg-muted);margin-right:4px';
    recentLabel.textContent = 'Recent searches';
    recentWrap.appendChild(recentLabel);
    var _recentTerms = _getRecentSearches();
    if (!_recentTerms.length) _recentTerms = ['trending', 'anime', 'thriller', 'sci-fi'];
    _recentTerms.slice(0, 5).forEach(function (term) {
      var pill = document.createElement('button');
      pill.className = 'pill';
      pill.textContent = '⌕ ' + term;
      pill.addEventListener('click', function () {
        var input = document.getElementById('search-input');
        if (input) { input.value = term; input.dispatchEvent(new Event('input')); }
      });
      recentWrap.appendChild(pill);
    });
    mount.appendChild(recentWrap);

    if (popular.length) {
      mount.appendChild(window.makeRow('Popular right now', popular, { onPick: function (item) { window.openDetailModal(item); } }));
    }
    if (anime.length) {
      mount.appendChild(window.makeRow('Trending in anime', anime, { onPick: function (item) { window.openDetailModal(item); } }));
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('search');
    window.renderBottomNav('search');
    buildPills();
    showDefaultContent();

    var input = document.getElementById('search-input');
    if (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim();
        clearTimeout(_timer);
        if (!q) { showDefaultContent(); return; }
        _timer = setTimeout(function () { doSearch(q); }, 320);
      });
      // Autofocus hint in URL
      var params = new URLSearchParams(window.location.search);
      var q = params.get('q');
      if (q) { input.value = q; doSearch(q); }
    }

    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('search');
      window.renderBottomNav('search');
    });
    window.addEventListener('eli6.langChanged', function () {
      if (_currentQuery) {
        doSearch(_currentQuery);
      } else {
        showDefaultContent();
      }
    });
  });
})();

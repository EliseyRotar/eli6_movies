// ELI6 Movies — search page (v2)
// Uses search/multi for typeahead + per-filter dedicated endpoints for accuracy.

(function () {
  'use strict';

  var TMDB_URL = window.TMDB_PROXY_URL || ((window.API_BASE_URL || '') + '/tmdb');
  var API_URL  = window.API_BASE_URL || '';

  var FILTER_LABELS = ['All', 'Movies', 'TV Shows', 'People', 'Anime'];
  var FILTER_VALUES = ['all', 'movie', 'tv', 'person', 'anime'];
  var activeFilter  = 'all';

  var _currentQuery  = '';
  var _searchPage    = 1;
  var _totalPages    = 1;
  var _debounceTimer = null;
  var _taTimer       = null;
  var _taIdx         = -1;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function _lang() {
    return (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';
  }

  function _get(url) {
    return fetch(url)
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  function _saveSearch(q) {
    try {
      var list = JSON.parse(localStorage.getItem('eli6.searches') || '[]');
      list = [q].concat(list.filter(function (s) { return s !== q; })).slice(0, 8);
      localStorage.setItem('eli6.searches', JSON.stringify(list));
    } catch (_) {}
  }

  function _getRecentSearches() {
    try { return JSON.parse(localStorage.getItem('eli6.searches') || '[]'); } catch (_) { return []; }
  }

  function _removeSearch(q) {
    try {
      var list = _getRecentSearches().filter(function (s) { return s !== q; });
      localStorage.setItem('eli6.searches', JSON.stringify(list));
    } catch (_) {}
  }

  // ── Normalizers ────────────────────────────────────────────────────────────

  function _normMovie(i) {
    return Object.assign({}, i, {
      kind:   'movie',
      year:   (i.release_date   || '').slice(0, 4),
      rating: i.vote_average ? Number(i.vote_average).toFixed(1) : '',
      title:  i.title || i.name || '',
    });
  }
  function _normTV(i) {
    return Object.assign({}, i, {
      kind:   'tv',
      year:   (i.first_air_date || '').slice(0, 4),
      rating: i.vote_average ? Number(i.vote_average).toFixed(1) : '',
      title:  i.name || i.title || '',
    });
  }
  function _normPerson(i) {
    return Object.assign({}, i, { kind: 'person' });
  }
  function _normAnime(i) {
    return Object.assign({}, i, {
      kind:   'tv',
      year:   (i.first_air_date || '').slice(0, 4),
      rating: i.vote_average ? Number(i.vote_average).toFixed(1) : '',
      title:  i.title || i.english_title || '',
    });
  }

  function _normalizeMulti(results) {
    return (results || []).map(function (i) {
      if (i.media_type === 'person') return _normPerson(i);
      if (i.media_type === 'tv')     return _normTV(i);
      return _normMovie(i);
    });
  }

  // ── Fetch helpers ──────────────────────────────────────────────────────────

  // Returns { items, total_results, total_pages }
  async function _doFetch(q, page) {
    var lang = _lang();
    var enc  = encodeURIComponent(q);

    if (activeFilter === 'anime') {
      if (page > 1) return { items: [], total_results: 0, total_pages: 1 };
      var arr = await _get(API_URL + '/catalog/anime/search?q=' + enc) || [];
      var items = (Array.isArray(arr) ? arr : []).map(_normAnime);
      return { items: items, total_results: items.length, total_pages: 1 };
    }

    if (activeFilter === 'movie') {
      var d = await _get(TMDB_URL + '/search/movie?query=' + enc + '&page=' + page + '&language=' + lang) || {};
      return { items: (d.results || []).map(_normMovie), total_results: d.total_results || 0, total_pages: d.total_pages || 1 };
    }

    if (activeFilter === 'tv') {
      var d = await _get(TMDB_URL + '/search/tv?query=' + enc + '&page=' + page + '&language=' + lang) || {};
      return { items: (d.results || []).map(_normTV), total_results: d.total_results || 0, total_pages: d.total_pages || 1 };
    }

    if (activeFilter === 'person') {
      var d = await _get(TMDB_URL + '/search/person?query=' + enc + '&page=' + page + '&language=' + lang) || {};
      return { items: (d.results || []).map(_normPerson), total_results: d.total_results || 0, total_pages: d.total_pages || 1 };
    }

    // 'all' — search/multi
    var d = await _get(TMDB_URL + '/search/multi?query=' + enc + '&page=' + page + '&language=' + lang) || {};
    return { items: _normalizeMulti(d.results), total_results: d.total_results || 0, total_pages: d.total_pages || 1 };
  }

  async function _fetchTrending() {
    var lang = _lang();
    var r = await Promise.all([
      _get(TMDB_URL + '/trending/movie/week?language=' + lang),
      _get(TMDB_URL + '/trending/tv/week?language='    + lang),
    ]);
    return [r[0] || { results: [] }, r[1] || { results: [] }];
  }

  // ── Pills ──────────────────────────────────────────────────────────────────

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

  // ── Typeahead ──────────────────────────────────────────────────────────────

  function _thumbUrl(item) {
    if (item.kind === 'person') {
      return item.profile_path
        ? 'https://image.tmdb.org/t/p/w92' + item.profile_path
        : null;
    }
    return item.poster_path
      ? 'https://image.tmdb.org/t/p/w92' + item.poster_path
      : null;
  }

  function _buildTaItem(item, idx) {
    var li = document.createElement('div');
    li.className = 'search-typeahead__item';
    li.dataset.idx = idx;

    // thumbnail
    var isPerson = item.kind === 'person';
    var thumbUrl = _thumbUrl(item);
    var thumb = document.createElement(thumbUrl ? 'img' : 'div');
    thumb.className = 'search-typeahead__thumb' + (isPerson ? ' search-typeahead__thumb--person' : '');
    if (thumbUrl) {
      thumb.src = thumbUrl;
      thumb.alt = item.title || item.name || '';
    } else {
      thumb.style.cssText = 'display:grid;place-items:center;font-size:14px;color:var(--fg-muted)';
      thumb.textContent = isPerson ? '👤' : '🎬';
    }
    li.appendChild(thumb);

    // info
    var info = document.createElement('div');
    info.className = 'search-typeahead__info';
    var titleEl = document.createElement('div');
    titleEl.className = 'search-typeahead__title';
    titleEl.textContent = item.title || item.name || '';
    var metaEl = document.createElement('div');
    metaEl.className = 'search-typeahead__meta';
    if (isPerson) {
      var dept = item.known_for_department || 'Person';
      var kf   = (item.known_for || []).slice(0, 2).map(function (k) { return k.title || k.name || ''; }).filter(Boolean).join(', ');
      metaEl.textContent = kf ? dept + ' · ' + kf : dept;
    } else {
      metaEl.textContent = [item.year, item.rating ? '★ ' + item.rating : ''].filter(Boolean).join(' · ');
    }
    info.appendChild(titleEl);
    info.appendChild(metaEl);
    li.appendChild(info);

    // type badge
    var badge = document.createElement('span');
    badge.className = 'search-typeahead__type search-typeahead__type--' + item.kind;
    badge.textContent = isPerson ? 'PERSON' : item.kind === 'tv' ? 'TV' : 'MOVIE';
    li.appendChild(badge);

    li.addEventListener('mousedown', function (e) {
      e.preventDefault();
      _selectTaItem(item);
    });
    return li;
  }

  function _selectTaItem(item) {
    closeTypeahead();
    if (item.kind === 'person') {
      showPersonFilmography(item);
    } else {
      var input = document.getElementById('search-input');
      if (input) {
        input.value = item.title || item.name || '';
        _currentQuery = input.value;
      }
      window.openDetailModal(item);
    }
  }

  function closeTypeahead() {
    var ta = document.getElementById('search-typeahead');
    if (ta) { ta.classList.remove('open'); ta.innerHTML = ''; }
    _taIdx = -1;
  }

  function openTypeahead(items) {
    var ta = document.getElementById('search-typeahead');
    if (!ta) return;
    ta.innerHTML = '';
    _taIdx = -1;
    if (!items.length) { ta.classList.remove('open'); return; }
    items.forEach(function (item, i) { ta.appendChild(_buildTaItem(item, i)); });
    ta.classList.add('open');
  }

  function _moveTa(dir) {
    var ta = document.getElementById('search-typeahead');
    if (!ta || !ta.classList.contains('open')) return;
    var items = ta.querySelectorAll('.search-typeahead__item');
    if (!items.length) return;
    if (_taIdx >= 0) items[_taIdx].classList.remove('search-typeahead__item--active');
    _taIdx = (_taIdx + dir + items.length) % items.length;
    items[_taIdx].classList.add('search-typeahead__item--active');
    items[_taIdx].scrollIntoView({ block: 'nearest' });
  }

  function _confirmTa() {
    var ta = document.getElementById('search-typeahead');
    if (!ta || !ta.classList.contains('open')) return false;
    var active = ta.querySelector('.search-typeahead__item--active');
    if (!active) return false;
    active.dispatchEvent(new MouseEvent('mousedown'));
    return true;
  }

  async function runTypeahead(q) {
    if (q.length < 2 || activeFilter === 'anime') { closeTypeahead(); return; }
    var d = await _get(TMDB_URL + '/search/multi?query=' + encodeURIComponent(q) + '&page=1&language=' + _lang()) || {};
    var items = _normalizeMulti(d.results);
    // filter to active tab if not 'all'
    if (activeFilter !== 'all') {
      items = items.filter(function (i) { return i.kind === activeFilter; });
    }
    openTypeahead(items.slice(0, 6));
  }

  // ── Person filmography ─────────────────────────────────────────────────────

  async function showPersonFilmography(person) {
    var mount   = document.getElementById('results-mount');
    var countEl = document.getElementById('search-count');
    if (!mount) return;

    if (countEl) countEl.textContent = person.name + ' — filmography';
    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Loading…</span></div>';

    var data = await _get(TMDB_URL + '/person/' + person.id + '/combined_credits?language=' + _lang());

    mount.innerHTML = '';

    // Back button
    var backRow = document.createElement('div');
    backRow.style.cssText = 'padding:8px var(--pad-x) 16px';
    var backBtn = document.createElement('button');
    backBtn.className = 'btn btn--ghost';
    backBtn.textContent = '← Back';
    backBtn.addEventListener('click', function () {
      if (_currentQuery) doSearch(_currentQuery);
      else showDefaultContent();
    });
    backRow.appendChild(backBtn);
    mount.appendChild(backRow);

    // Person header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:16px;padding:0 var(--pad-x) 24px';
    if (person.profile_path) {
      var photo = document.createElement('img');
      photo.src = 'https://image.tmdb.org/t/p/w185' + person.profile_path;
      photo.style.cssText = 'width:72px;height:72px;border-radius:50%;object-fit:cover;flex-shrink:0';
      header.appendChild(photo);
    }
    var hInfo = document.createElement('div');
    var hName = document.createElement('div');
    hName.style.cssText = 'font-size:22px;font-weight:700;font-family:var(--font-head)';
    hName.textContent = person.name;
    var hDept = document.createElement('div');
    hDept.style.cssText = 'font-size:13px;color:var(--fg-muted);margin-top:4px';
    hDept.textContent = person.known_for_department || 'Actor/Director';
    hInfo.appendChild(hName);
    hInfo.appendChild(hDept);
    header.appendChild(hInfo);
    mount.appendChild(header);

    if (!data || (!data.cast && !data.crew)) {
      mount.innerHTML += '<div class="empty"><div class="empty__icon">🎬</div><div class="empty__title">No credits found</div></div>';
      return;
    }

    var all = (data.cast || []).concat(data.crew || []);
    var seen = {};
    var credits = all.filter(function (c) {
      if (!c.id || !c.poster_path || seen[c.id]) return false;
      seen[c.id] = true;
      return true;
    }).sort(function (a, b) { return (b.popularity || 0) - (a.popularity || 0); }).slice(0, 40);

    var grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.padding = '0 var(--pad-x)';
    credits.forEach(function (item) {
      var norm = Object.assign({}, item, {
        kind:   item.media_type || (item.title ? 'movie' : 'tv'),
        year:   (item.release_date || item.first_air_date || '').slice(0, 4),
        rating: item.vote_average ? Number(item.vote_average).toFixed(1) : '',
        title:  item.title || item.name || '',
      });
      grid.appendChild(window.makePoster(norm, { onClick: function () { window.openDetailModal(norm); } }));
    });
    mount.appendChild(grid);
  }

  // ── Person card ────────────────────────────────────────────────────────────

  function makePersonCard(person) {
    var card = document.createElement('div');
    card.className = 'person-card';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', function () { showPersonFilmography(person); });
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') showPersonFilmography(person); });

    var photo = document.createElement(person.profile_path ? 'img' : 'div');
    photo.className = 'person-card__photo';
    if (person.profile_path) {
      photo.src = 'https://image.tmdb.org/t/p/w185' + person.profile_path;
      photo.alt = person.name || '';
      photo.loading = 'lazy';
    } else {
      photo.style.cssText = 'display:grid;place-items:center;font-size:28px;color:var(--fg-muted)';
      photo.textContent = '👤';
    }
    card.appendChild(photo);

    var name = document.createElement('div');
    name.className = 'person-card__name';
    name.textContent = person.name || '';
    card.appendChild(name);

    if (person.known_for_department) {
      var dept = document.createElement('div');
      dept.className = 'person-card__dept';
      dept.textContent = person.known_for_department;
      card.appendChild(dept);
    }

    var kfTitles = (person.known_for || []).slice(0, 2).map(function (k) { return k.title || k.name || ''; }).filter(Boolean);
    if (kfTitles.length) {
      var known = document.createElement('div');
      known.className = 'person-card__known';
      known.textContent = kfTitles.join(', ');
      card.appendChild(known);
    }

    return card;
  }

  // ── Render results ─────────────────────────────────────────────────────────

  function _renderResults(mount, items, q) {
    var people = items.filter(function (i) { return i.kind === 'person'; });
    var media  = items.filter(function (i) { return i.kind !== 'person'; });

    if (people.length) {
      var pSect = document.createElement('div');
      var pHead = document.createElement('div');
      pHead.style.cssText = 'padding:4px var(--pad-x) 12px;font-family:var(--font-head);font-weight:700;font-size:15px;letter-spacing:0.05em;color:var(--fg-muted);text-transform:uppercase';
      pHead.textContent = 'People';
      pSect.appendChild(pHead);
      var pGrid = document.createElement('div');
      pGrid.id = 'search-person-grid';
      pGrid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:12px;padding:0 var(--pad-x) 24px';
      people.forEach(function (p) { pGrid.appendChild(makePersonCard(p)); });
      pSect.appendChild(pGrid);
      mount.appendChild(pSect);
    }

    if (media.length) {
      var grid = document.createElement('div');
      grid.className = 'grid';
      grid.id = 'search-results-grid';
      grid.style.padding = '0 var(--pad-x)';
      media.forEach(function (item) {
        grid.appendChild(window.makePoster(item, { onClick: function () { window.openDetailModal(item); } }));
      });
      mount.appendChild(grid);
    }

    if (_totalPages > 1 && activeFilter !== 'anime') {
      var lmWrap = document.createElement('div');
      lmWrap.id = 'load-more-wrap';
      lmWrap.style.cssText = 'text-align:center;padding:28px 0 48px';
      var lmBtn = document.createElement('button');
      lmBtn.id = 'load-more-btn';
      lmBtn.className = 'btn btn--ghost';
      lmBtn.textContent = 'Load more';
      lmBtn.style.cssText = 'padding:10px 32px;font-size:14px';
      lmBtn.addEventListener('click', function () { _loadMore(q); });
      lmWrap.appendChild(lmBtn);
      mount.appendChild(lmWrap);
    }
  }

  async function _loadMore(q) {
    var lmBtn = document.getElementById('load-more-btn');
    if (lmBtn) { lmBtn.textContent = 'Loading…'; lmBtn.disabled = true; }

    _searchPage++;
    var result = await _doFetch(q, _searchPage);
    _totalPages = result.total_pages;

    var media  = result.items.filter(function (i) { return i.kind !== 'person'; });
    var people = result.items.filter(function (i) { return i.kind === 'person'; });

    var mediaGrid = document.getElementById('search-results-grid');
    if (mediaGrid) {
      media.forEach(function (item) {
        mediaGrid.appendChild(window.makePoster(item, { onClick: function () { window.openDetailModal(item); } }));
      });
    }

    var personGrid = document.getElementById('search-person-grid');
    if (personGrid) {
      people.forEach(function (p) { personGrid.appendChild(makePersonCard(p)); });
    }

    if (_searchPage >= _totalPages) {
      var wrap = document.getElementById('load-more-wrap');
      if (wrap) wrap.remove();
    } else if (lmBtn) {
      lmBtn.textContent = 'Load more';
      lmBtn.disabled = false;
    }
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  function _renderEmptyState(mount, q) {
    var empty = document.createElement('div');
    empty.className = 'empty';
    empty.innerHTML =
      '<div class="empty__icon">⌕</div>' +
      '<div class="empty__title">No results for "' + q.replace(/</g, '&lt;') + '"</div>' +
      '<div class="empty__sub">Try different keywords or check spelling.</div>';
    mount.appendChild(empty);

    _fetchTrending().then(function (data) {
      var movies = (data[0].results || []).slice(0, 10).map(_normMovie);
      if (movies.length) {
        mount.appendChild(window.makeRow('Trending this week', movies, {
          onPick: function (item) { window.openDetailModal(item); },
        }));
      }
    });
  }

  // ── Main search ────────────────────────────────────────────────────────────

  async function doSearch(q) {
    _currentQuery = q;
    _searchPage   = 1;
    _saveSearch(q);
    closeTypeahead();

    var mount   = document.getElementById('results-mount');
    var countEl = document.getElementById('search-count');
    if (!mount) return;

    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Searching…</span></div>';

    var result = await _doFetch(q, 1);
    _totalPages = result.total_pages;

    mount.innerHTML = '';

    if (countEl) {
      countEl.textContent = result.items.length
        ? 'About ' + Number(result.total_results).toLocaleString() + ' results for "' + q + '"'
        : '';
    }

    if (!result.items.length) {
      _renderEmptyState(mount, q);
      return;
    }

    _renderResults(mount, result.items, q);
  }

  // ── Default content ────────────────────────────────────────────────────────

  async function showDefaultContent() {
    var mount   = document.getElementById('results-mount');
    var countEl = document.getElementById('search-count');
    if (!mount) return;
    if (countEl) countEl.textContent = '';
    _currentQuery = '';
    closeTypeahead();
    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div></div>';

    var tData = await _fetchTrending();
    var tMovies = (tData[0].results || []).map(_normMovie);
    var tTV     = (tData[1].results || []).map(_normTV);

    mount.innerHTML = '';

    // Recent searches with × delete
    var recent = _getRecentSearches();
    if (recent.length) {
      var recentWrap = document.createElement('div');
      recentWrap.id  = 'recent-searches-wrap';
      recentWrap.style.cssText = 'padding:0 var(--pad-x) 8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center';

      var recentLabel = document.createElement('span');
      recentLabel.style.cssText = 'font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:var(--fg-muted);width:100%;margin-bottom:2px';
      recentLabel.textContent = 'Recent searches';
      recentWrap.appendChild(recentLabel);

      recent.slice(0, 6).forEach(function (term) {
        var pillWrap = document.createElement('div');
        pillWrap.className = 'search-recent-pill';

        var pillBtn = document.createElement('button');
        pillBtn.className = 'search-recent-pill__btn';
        pillBtn.textContent = '⌕ ' + term;
        pillBtn.addEventListener('click', function () {
          var input = document.getElementById('search-input');
          if (input) { input.value = term; input.dispatchEvent(new Event('input')); }
        });

        var delBtn = document.createElement('button');
        delBtn.className = 'search-recent-pill__del';
        delBtn.textContent = '×';
        delBtn.title = 'Remove';
        delBtn.setAttribute('aria-label', 'Remove ' + term);
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          _removeSearch(term);
          pillWrap.remove();
        });

        pillWrap.appendChild(pillBtn);
        pillWrap.appendChild(delBtn);
        recentWrap.appendChild(pillWrap);
      });
      mount.appendChild(recentWrap);
    }

    if (tMovies.length) {
      mount.appendChild(window.makeRow('Trending movies', tMovies, {
        onPick: function (item) { window.openDetailModal(item); },
      }));
    }
    if (tTV.length) {
      mount.appendChild(window.makeRow('Trending TV', tTV, {
        onPick: function (item) { window.openDetailModal(item); },
      }));
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('search');
    window.renderBottomNav('search');
    buildPills();
    showDefaultContent();

    var input    = document.getElementById('search-input');
    var clearBtn = document.getElementById('search-clear');

    if (input) {
      input.addEventListener('input', function () {
        var q = input.value.trim();
        if (clearBtn) clearBtn.classList.toggle('visible', q.length > 0);

        clearTimeout(_taTimer);
        if (q.length >= 2) {
          _taTimer = setTimeout(function () { runTypeahead(q); }, 150);
        } else {
          closeTypeahead();
        }

        clearTimeout(_debounceTimer);
        if (!q) { showDefaultContent(); return; }
        _debounceTimer = setTimeout(function () { doSearch(q); }, 280);
      });

      input.addEventListener('keydown', function (e) {
        if      (e.key === 'ArrowDown') { e.preventDefault(); _moveTa(1); }
        else if (e.key === 'ArrowUp')   { e.preventDefault(); _moveTa(-1); }
        else if (e.key === 'Enter')     { if (_confirmTa()) e.preventDefault(); }
        else if (e.key === 'Escape')    { closeTypeahead(); }
      });

      input.addEventListener('blur', function () {
        setTimeout(closeTypeahead, 160);
      });

      var params = new URLSearchParams(window.location.search);
      var preQ   = params.get('q');
      if (preQ) {
        input.value = preQ;
        if (clearBtn) clearBtn.classList.add('visible');
        doSearch(preQ);
      }
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        if (input) { input.value = ''; input.focus(); }
        clearBtn.classList.remove('visible');
        closeTypeahead();
        showDefaultContent();
      });
    }

    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('search');
      window.renderBottomNav('search');
    });
    window.addEventListener('eli6.langChanged', function () {
      if (_currentQuery) doSearch(_currentQuery);
      else showDefaultContent();
    });
  });
})();

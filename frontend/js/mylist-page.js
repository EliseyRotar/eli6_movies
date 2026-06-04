// ELI6 Movies — My List page (full redesign)
(function () {
  'use strict';

  var API_URL  = window.API_BASE_URL  || '';
  var TMDB_URL = window.TMDB_PROXY_URL || (API_URL ? API_URL + '/tmdb' : '');

  var state = {
    filter:   'all',        // all | movie | tv | anime | progress
    sort:     'added-desc', // added-desc | added-asc | alpha-asc | alpha-desc | rating-desc | type
    search:   '',
    view:     'grid',       // grid | list
    bulk:     false,
    selected: new Set(),
  };

  var allItems       = [];  // enriched items array
  var keepWatchMap   = {};  // "id:type" → {progress,season,episode}
  var watchedMap     = {};  // "id:type" → progress (0-100)
  var spotlightItem  = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function posterUrl(item, size) {
    var pp = item.poster_path || item.poster_url || '';
    if (!pp) return 'https://via.placeholder.com/300x450/1a1a22/7a7a90?text=No+Image';
    if (pp.startsWith('http')) return pp;
    if (pp.startsWith('/w500/') || pp.startsWith('/w92/')) return 'https://image.tmdb.org/t/p' + pp;
    if (pp.startsWith('/')) return 'https://image.tmdb.org/t/p/' + (size || 'w300') + pp;
    return 'https://image.tmdb.org/t/p/' + pp;
  }

  function itemType(item) {
    return item.kind || item.type || 'movie';
  }

  function itemKey(item) {
    return item.id + ':' + itemType(item);
  }

  function typeLabel(type) {
    return type === 'movie' ? 'MOVIE' : type === 'tv' ? 'TV' : 'ANIME';
  }

  async function fetchMyList() {
    try {
      var r = await fetch(API_URL + '/user/profile', { credentials: 'include' });
      if (r.ok) {
        var d = await r.json();
        var list = d.myList || [];
        localStorage.setItem('myList', JSON.stringify(list));
        return list;
      }
    } catch (e) {}
    return JSON.parse(localStorage.getItem('myList') || '[]');
  }

  async function fetchKeepWatching() {
    try {
      var r = await fetch(API_URL + '/user/keep-watching', { credentials: 'include' });
      if (r.ok) {
        var arr = await r.json();
        arr.forEach(function (i) { keepWatchMap[i.id + ':' + i.type] = i; });
      }
    } catch (e) {}
  }

  async function fetchWatchHistory() {
    try {
      var r = await fetch(API_URL + '/user/watched', { credentials: 'include' });
      if (r.ok) {
        var arr = await r.json();
        arr.forEach(function (i) { watchedMap[i.id + ':' + i.type] = i.progress || 0; });
      }
    } catch (e) {}
  }

  async function enrichItem(item) {
    var type = itemType(item);
    if (type === 'anime') {
      return Object.assign({}, item, { kind: 'anime', title: item.title || item.name || '', rating: item.rating || 0 });
    }
    var ep = (type === 'movie' ? '/movie/' : '/tv/') + item.id;
    try {
      var r = await fetch(TMDB_URL + ep);
      if (!r.ok) throw new Error('not ok');
      var d = await r.json();
      return Object.assign({}, item, d, {
        kind:   type,
        year:   (d.release_date || d.first_air_date || '').slice(0, 4),
        rating: d.vote_average ? parseFloat(d.vote_average.toFixed(1)) : 0,
        title:  d.title || d.name || item.title || '',
      });
    } catch (e) {
      return Object.assign({}, item, { kind: type, title: item.title || item.name || '', rating: 0 });
    }
  }

  async function removeItem(id, type) {
    try {
      await fetch(API_URL + '/user/mylist/' + id + '/' + type, { method: 'DELETE', credentials: 'include' });
    } catch (e) {}
    allItems = allItems.filter(function (i) { return !(i.id === id && itemType(i) === type); });
    var local = JSON.parse(localStorage.getItem('myList') || '[]');
    localStorage.setItem('myList', JSON.stringify(
      local.filter(function (i) { return !(i.id === id && i.type === type); })
    ));
    if (window.showMyListToast) window.showMyListToast('Removed from My List', 'info');
    render();
    updateStats();
  }

  async function bulkRemove() {
    var keys = Array.from(state.selected);
    for (var i = 0; i < keys.length; i++) {
      var parts = keys[i].split(':');
      var id    = parseInt(parts[0]);
      var type  = parts[1];
      try {
        await fetch(API_URL + '/user/mylist/' + id + '/' + type, { method: 'DELETE', credentials: 'include' });
      } catch (e) {}
      allItems = allItems.filter(function (item) { return !(item.id === id && itemType(item) === type); });
    }
    var local = JSON.parse(localStorage.getItem('myList') || '[]');
    var removed = new Set(keys);
    localStorage.setItem('myList', JSON.stringify(
      local.filter(function (i) { return !removed.has(i.id + ':' + i.type); })
    ));
    if (window.showMyListToast) window.showMyListToast('Removed ' + keys.length + ' items', 'info');
    exitBulk();
    render();
    updateStats();
  }

  function getFiltered() {
    var items = allItems.slice();

    if (state.search) {
      var q = state.search.toLowerCase();
      items = items.filter(function (i) { return (i.title || '').toLowerCase().indexOf(q) !== -1; });
    }

    switch (state.filter) {
      case 'movie':    items = items.filter(function (i) { return itemType(i) === 'movie'; }); break;
      case 'tv':       items = items.filter(function (i) { return itemType(i) === 'tv'; }); break;
      case 'anime':    items = items.filter(function (i) { return itemType(i) === 'anime'; }); break;
      case 'progress': items = items.filter(function (i) {
        var kw = keepWatchMap[itemKey(i)];
        return kw && kw.progress > 0 && kw.progress < 90;
      }); break;
    }

    items.sort(function (a, b) {
      switch (state.sort) {
        case 'added-asc':   return new Date(a.addedAt || 0) - new Date(b.addedAt || 0);
        case 'alpha-asc':   return (a.title || '').localeCompare(b.title || '');
        case 'alpha-desc':  return (b.title || '').localeCompare(a.title || '');
        case 'rating-desc': return (b.rating || 0) - (a.rating || 0);
        case 'type': {
          var order = { movie: 0, tv: 1, anime: 2 };
          var ta = order[itemType(a)] != null ? order[itemType(a)] : 3;
          var tb = order[itemType(b)] != null ? order[itemType(b)] : 3;
          return ta !== tb ? ta - tb : (a.title || '').localeCompare(b.title || '');
        }
        default: return new Date(b.addedAt || 0) - new Date(a.addedAt || 0); // added-desc
      }
    });

    return items;
  }

  function updateStats() {
    var movies = 0, shows = 0, anime = 0, inProg = 0;
    allItems.forEach(function (i) {
      var t  = itemType(i);
      if (t === 'movie') movies++;
      else if (t === 'tv') shows++;
      else if (t === 'anime') anime++;
      var kw = keepWatchMap[itemKey(i)];
      if (kw && kw.progress > 0 && kw.progress < 90) inProg++;
    });

    var el = document.getElementById('ml-stats');
    if (el) {
      var parts = [allItems.length + ' title' + (allItems.length !== 1 ? 's' : '')];
      if (movies) parts.push(movies + ' movie' + (movies !== 1 ? 's' : ''));
      if (shows)  parts.push(shows  + ' show'  + (shows  !== 1 ? 's' : ''));
      if (anime)  parts.push(anime  + ' anime');
      if (inProg) parts.push(inProg + ' in progress');
      el.textContent = parts.join(' · ');
    }

    var counts = { all: allItems.length, movie: movies, tv: shows, anime: anime, progress: inProg };
    document.querySelectorAll('.ml-chip[data-filter]').forEach(function (chip) {
      var badge = chip.querySelector('.ml-chip__count');
      if (badge) {
        var n = counts[chip.dataset.filter];
        badge.textContent = n != null ? n : '';
      }
    });
  }

  function render() {
    var mount = document.getElementById('grid-mount');
    if (!mount) return;
    var items = getFiltered();
    if (!items.length) {
      mount.innerHTML = buildEmptyHtml();
      return;
    }
    if (state.view === 'list') renderList(mount, items);
    else renderGrid(mount, items);
  }

  function buildEmptyHtml() {
    if (!allItems.length) {
      return '<div class="ml-empty">' +
        '<div class="ml-empty__icon">♥</div>' +
        '<div class="ml-empty__title">Your list is empty</div>' +
        '<div class="ml-empty__sub">Add movies and shows from any page using the + My List button.</div>' +
        '<div class="ml-empty__btns">' +
          '<a href="index.html" class="ml-empty__btn">Browse Movies</a>' +
          '<a href="tv.html" class="ml-empty__btn ml-empty__btn--sec">Browse TV Shows</a>' +
          '<a href="anime.html" class="ml-empty__btn ml-empty__btn--sec">Browse Anime</a>' +
        '</div>' +
      '</div>';
    }
    return '<div class="ml-empty">' +
      '<div class="ml-empty__icon">🔍</div>' +
      '<div class="ml-empty__title">No results</div>' +
      '<div class="ml-empty__sub">Try a different filter or search term.</div>' +
    '</div>';
  }

  function renderGrid(mount, items) {
    var grid = document.createElement('div');
    grid.className = 'ml-grid';
    items.forEach(function (item) { grid.appendChild(buildCard(item)); });
    mount.innerHTML = '';
    mount.appendChild(grid);
  }

  function buildCard(item) {
    var type      = itemType(item);
    var key       = itemKey(item);
    var kw        = keepWatchMap[key];
    var watched   = (watchedMap[key] || 0) >= 90;
    var inProg    = kw && kw.progress > 0 && kw.progress < 90;
    var progress  = kw ? kw.progress : 0;
    var selected  = state.bulk && state.selected.has(key);
    var url       = posterUrl(item, 'w300');
    var year      = item.year || '';
    var rating    = item.rating ? (typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating) : '';
    var title     = item.title || item.name || '';
    var kwInfo    = (inProg && kw && type === 'tv' && kw.season) ? ('S' + kw.season + (kw.episode ? 'E' + kw.episode : '')) : '';

    var el = document.createElement('div');
    el.className = 'ml-card' + (selected ? ' ml-card--selected' : '') + (watched ? ' ml-card--watched' : '');
    el.dataset.key = key;

    el.innerHTML =
      '<div class="ml-card__wrap">' +
        '<img class="ml-card__img" src="' + esc(url) + '" alt="' + esc(title) + '" loading="lazy"' +
          ' onerror="this.src=\'https://via.placeholder.com/300x450/1a1a22/7a7a90?text=No+Image\'">' +
        (watched ? '<div class="ml-card__watched"><i class="material-icons">check_circle</i><span>Watched</span></div>' : '') +
        (state.bulk ? '<div class="ml-card__check"><i class="material-icons">' + (selected ? 'check_box' : 'check_box_outline_blank') + '</i></div>' : '') +
        '<div class="ml-card__overlay">' +
          (inProg
            ? '<button class="ml-card__cont-btn" data-action="play">' + (window.ICONS ? window.ICONS.play : '') + ' Continue' + (kwInfo ? ' · ' + kwInfo : '') + '</button>'
            : '<button class="ml-card__play-btn" data-action="play">' + (window.ICONS ? window.ICONS.play : '') + ' Play</button>') +
          '<button class="ml-card__rm-btn" data-action="remove" title="Remove">' + (window.ICONS ? window.ICONS.close : '×') + '</button>' +
        '</div>' +
        (inProg ? '<div class="ml-card__prog"><div class="ml-card__prog-fill" style="width:' + progress + '%"></div></div>' : '') +
      '</div>' +
      '<div class="ml-card__info">' +
        '<div class="ml-card__badges">' +
          '<span class="ml-badge ml-badge--' + type + '">' + typeLabel(type) + '</span>' +
          (year ? '<span class="ml-card__year">' + esc(year) + '</span>' : '') +
          (rating ? '<span class="ml-card__rating">' + (window.ICONS ? window.ICONS.star : '★') + ' ' + esc(String(rating)) + '</span>' : '') +
        '</div>' +
        '<div class="ml-card__title">' + esc(title) + '</div>' +
      '</div>';

    el.addEventListener('click', function (e) {
      var action = e.target.closest('[data-action]');
      if (action) {
        e.stopPropagation();
        if (action.dataset.action === 'remove') { removeItem(item.id, type); return; }
        if (action.dataset.action === 'play') { playItem(item, kw); return; }
      }
      if (state.bulk) { toggleSelect(key); return; }
      if (typeof window.openDetailModal === 'function') window.openDetailModal(item);
      else playItem(item, kw);
    });

    return el;
  }

  function renderList(mount, items) {
    var list = document.createElement('div');
    list.className = 'ml-list';
    items.forEach(function (item) { list.appendChild(buildRow(item)); });
    mount.innerHTML = '';
    mount.appendChild(list);
  }

  function buildRow(item) {
    var type     = itemType(item);
    var key      = itemKey(item);
    var kw       = keepWatchMap[key];
    var watched  = (watchedMap[key] || 0) >= 90;
    var inProg   = kw && kw.progress > 0 && kw.progress < 90;
    var progress = kw ? kw.progress : 0;
    var selected = state.bulk && state.selected.has(key);
    var url      = posterUrl(item, 'w92');
    var year     = item.year || '';
    var rating   = item.rating ? (typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating) : '';
    var title    = item.title || item.name || '';
    var overview = (item.overview || '').slice(0, 160) + (item.overview && item.overview.length > 160 ? '…' : '');
    var kwInfo   = (inProg && kw && type === 'tv' && kw.season) ? (' · S' + kw.season + (kw.episode ? 'E' + kw.episode : '')) : '';

    var el = document.createElement('div');
    el.className = 'ml-row' + (selected ? ' ml-row--selected' : '') + (watched ? ' ml-row--watched' : '');
    el.dataset.key = key;

    el.innerHTML =
      '<div class="ml-row__thumb">' +
        '<img class="ml-row__img" src="' + esc(url) + '" alt="' + esc(title) + '" loading="lazy"' +
          ' onerror="this.src=\'https://via.placeholder.com/52x78/1a1a22/7a7a90?text=\'">' +
        (watched ? '<div class="ml-row__watched-icon"><i class="material-icons">check_circle</i></div>' : '') +
        (state.bulk ? '<div class="ml-row__check"><i class="material-icons">' + (selected ? 'check_box' : 'check_box_outline_blank') + '</i></div>' : '') +
      '</div>' +
      '<div class="ml-row__body">' +
        '<div class="ml-row__meta">' +
          '<span class="ml-badge ml-badge--' + type + '">' + typeLabel(type) + '</span>' +
          (year ? '<span class="ml-row__year">' + esc(year) + '</span>' : '') +
          (rating ? '<span class="ml-row__rating">' + (window.ICONS ? window.ICONS.star : '★') + ' ' + esc(String(rating)) + '</span>' : '') +
        '</div>' +
        '<div class="ml-row__title">' + esc(title) + '</div>' +
        (overview ? '<div class="ml-row__overview">' + esc(overview) + '</div>' : '') +
        (inProg ? '<div class="ml-row__prog-wrap"><div class="ml-row__prog-bg"><div class="ml-row__prog-fill" style="width:' + progress + '%"></div></div><span class="ml-row__prog-label">' + progress + '%' + esc(kwInfo) + '</span></div>' : '') +
      '</div>' +
      '<div class="ml-row__actions">' +
        '<button class="ml-row__play-btn" data-action="play">' + (window.ICONS ? window.ICONS.play : '') + (inProg ? ' Continue' : ' Play') + '</button>' +
        '<button class="ml-row__rm-btn" data-action="remove" title="Remove">' + (window.ICONS ? window.ICONS.close : '×') + '</button>' +
      '</div>';

    el.addEventListener('click', function (e) {
      var action = e.target.closest('[data-action]');
      if (action) {
        e.stopPropagation();
        if (action.dataset.action === 'remove') { removeItem(item.id, type); return; }
        if (action.dataset.action === 'play') { playItem(item, kw); return; }
      }
      if (state.bulk) { toggleSelect(key); return; }
      if (typeof window.openDetailModal === 'function') window.openDetailModal(item);
      else playItem(item, kw);
    });

    return el;
  }

  function playItem(item, kw) {
    var type = itemType(item);
    var url  = 'player.html?type=' + type + '&id=' + item.id;
    if (kw && type === 'tv') {
      if (kw.season)  url += '&season='  + kw.season;
      if (kw.episode) url += '&episode=' + kw.episode;
    }
    window.location.href = url;
  }

  function toggleSelect(key) {
    if (state.selected.has(key)) state.selected.delete(key);
    else state.selected.add(key);
    render();
    updateBulkBar();
  }

  function enterBulk() {
    state.bulk = true;
    state.selected.clear();
    document.getElementById('ml-bulk-bar').hidden = false;
    document.getElementById('ml-bulk-btn').classList.add('active');
    render();
    updateBulkBar();
  }

  function exitBulk() {
    state.bulk = false;
    state.selected.clear();
    document.getElementById('ml-bulk-bar').hidden = true;
    document.getElementById('ml-bulk-btn').classList.remove('active');
    render();
  }

  function updateBulkBar() {
    var n    = state.selected.size;
    var cnt  = document.getElementById('ml-bulk-count');
    var rmBtn = document.getElementById('ml-bulk-remove');
    if (cnt)  cnt.textContent = n + ' selected';
    if (rmBtn) rmBtn.disabled = n === 0;
  }

  function pickRandom() {
    var items = getFiltered();
    if (!items.length) {
      if (window.showMyListToast) window.showMyListToast('No items to pick from', 'info');
      return;
    }
    showSpotlight(items[Math.floor(Math.random() * items.length)]);
  }

  function showSpotlight(item) {
    spotlightItem = item;
    var modal   = document.getElementById('ml-spotlight');
    var content = document.getElementById('ml-spotlight-content');
    if (!modal || !content) return;

    var type    = itemType(item);
    var kw      = keepWatchMap[itemKey(item)];
    var url     = posterUrl(item, 'w500');
    var year    = item.year || '';
    var rating  = item.rating ? (typeof item.rating === 'number' ? item.rating.toFixed(1) : item.rating) : '';
    var overview = (item.overview || '').slice(0, 220) + (item.overview && item.overview.length > 220 ? '…' : '');

    content.innerHTML =
      '<img class="ml-spotlight__poster" src="' + esc(url) + '" alt="' + esc(item.title || '') + '"' +
        ' onerror="this.style.display=\'none\'">' +
      '<div class="ml-spotlight__info">' +
        '<div class="ml-spotlight__badges">' +
          '<span class="ml-badge ml-badge--' + type + '">' + typeLabel(type) + '</span>' +
          (year   ? '<span class="ml-spotlight__year">' + esc(year) + '</span>' : '') +
          (rating ? '<span class="ml-spotlight__rating">' + (window.ICONS ? window.ICONS.star : '★') + ' ' + esc(String(rating)) + '</span>' : '') +
        '</div>' +
        '<div class="ml-spotlight__title">' + esc(item.title || item.name || '') + '</div>' +
        (overview ? '<div class="ml-spotlight__overview">' + esc(overview) + '</div>' : '') +
      '</div>';

    var playBtn = document.getElementById('ml-spotlight-play');
    if (playBtn) {
      playBtn.onclick = function () { closeSpotlight(); playItem(item, kw); };
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeSpotlight() {
    var modal = document.getElementById('ml-spotlight');
    if (modal) modal.hidden = true;
    document.body.style.overflow = '';
  }

  function initControls() {
    var searchEl = document.getElementById('ml-search');
    var sortEl   = document.getElementById('ml-sort');
    var gridBtn  = document.getElementById('ml-view-grid');
    var listBtn  = document.getElementById('ml-view-list');
    var bulkBtn  = document.getElementById('ml-bulk-btn');
    var pickBtn  = document.getElementById('ml-pick-btn');
    var bulkBar  = document.getElementById('ml-bulk-bar');
    var bulkRm   = document.getElementById('ml-bulk-remove');
    var bulkCnl  = document.getElementById('ml-bulk-cancel');
    var modal    = document.getElementById('ml-spotlight');

    if (searchEl) {
      searchEl.addEventListener('input', function () {
        state.search = searchEl.value;
        render();
      });
    }

    if (sortEl) {
      sortEl.addEventListener('change', function () {
        state.sort = sortEl.value;
        render();
      });
    }

    document.querySelectorAll('.ml-chip[data-filter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        state.filter = chip.dataset.filter;
        document.querySelectorAll('.ml-chip[data-filter]').forEach(function (c) {
          c.classList.toggle('active', c === chip);
        });
        render();
      });
    });

    if (gridBtn) {
      gridBtn.addEventListener('click', function () {
        state.view = 'grid';
        gridBtn.classList.add('active');  gridBtn.setAttribute('aria-pressed', 'true');
        listBtn.classList.remove('active'); listBtn.setAttribute('aria-pressed', 'false');
        render();
      });
    }
    if (listBtn) {
      listBtn.addEventListener('click', function () {
        state.view = 'list';
        listBtn.classList.add('active');  listBtn.setAttribute('aria-pressed', 'true');
        gridBtn.classList.remove('active'); gridBtn.setAttribute('aria-pressed', 'false');
        render();
      });
    }

    if (bulkBtn) {
      bulkBtn.addEventListener('click', function () {
        if (state.bulk) exitBulk(); else enterBulk();
      });
    }

    if (bulkRm) {
      bulkRm.addEventListener('click', function () {
        var n = state.selected.size;
        if (n > 0 && confirm('Remove ' + n + ' item' + (n !== 1 ? 's' : '') + ' from your list?')) {
          bulkRemove();
        }
      });
    }

    if (bulkCnl) bulkCnl.addEventListener('click', exitBulk);
    if (pickBtn) pickBtn.addEventListener('click', pickRandom);

    // Spotlight controls
    if (modal) {
      var bd     = modal.querySelector('.ml-spotlight__bd');
      var close  = modal.querySelector('.ml-spotlight__close');
      var again  = document.getElementById('ml-spotlight-again');
      if (bd)    bd.addEventListener('click', closeSpotlight);
      if (close) close.addEventListener('click', closeSpotlight);
      if (again) again.addEventListener('click', function () { closeSpotlight(); pickRandom(); });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSpotlight();
      if (e.key === '/' && document.activeElement !== searchEl && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        if (searchEl) { searchEl.focus(); searchEl.select(); }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', async function () {
    window.renderTopNav('mylist');
    window.renderBottomNav('mylist');
    window.renderFooter('footer-mount');

    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('mylist');
      window.renderBottomNav('mylist');
    });

    // Must be logged in to view My List
    if (!localStorage.getItem('user')) {
      var mount = document.getElementById('grid-mount');
      if (mount) {
        mount.innerHTML =
          '<div class="ml-empty" style="padding:60px 24px">' +
          '<div class="ml-empty__icon">🔒</div>' +
          '<p class="ml-empty__title">Sign in to see your list</p>' +
          '<p class="ml-empty__sub">Create a free account to save movies and shows.</p>' +
          '<a href="account.html" class="btn btn--primary" style="margin-top:20px;display:inline-flex;gap:6px">Sign in / Register</a>' +
          '</div>';
      }
      return;
    }

    initControls();

    // Show loader
    var mount = document.getElementById('grid-mount');
    if (mount) {
      mount.innerHTML = '<div class="ml-loader"><div class="ml-spinner"></div><span>Loading your list…</span></div>';
    }

    // Fetch keep-watching + watch history in parallel with the list
    await Promise.all([fetchKeepWatching(), fetchWatchHistory()]);

    var rawList = await fetchMyList();

    // Phase 1: render immediately with raw data
    allItems = rawList.map(function (i) {
      return Object.assign({}, i, { kind: i.type || 'movie', rating: 0 });
    });
    render();
    updateStats();

    if (!rawList.length) return;

    // Phase 2: enrich via TMDB in background, then re-render
    var enriched = await Promise.all(rawList.map(enrichItem));
    allItems = enriched;
    render();
    updateStats();
  });

})();

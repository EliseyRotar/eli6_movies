(function () {
  'use strict';

  var STREAMED = 'https://streamed.pk/api';
  var ESX = 'https://api.embedsportex.site/api';
  var TSDB = 'https://www.thesportsdb.com/api/v1/json/3';

  // Sports where team lookups make sense (skip tennis, fight, motor — no team banners)
  var TEAM_SPORTS = { football: 1, basketball: 1, 'american-football': 1, hockey: 1, baseball: 1, cricket: 1, rugby: 1, volleyball: 1 };

  // Persistent image cache keyed by normalized team name (survives re-render within the session)
  var _teamImgCache = null;
  function teamImgCache() {
    if (!_teamImgCache) {
      try { _teamImgCache = JSON.parse(sessionStorage.getItem('eli6.teamImgs') || '{}'); } catch(e) { _teamImgCache = {}; }
    }
    return _teamImgCache;
  }
  function saveTeamImgCache() {
    try { sessionStorage.setItem('eli6.teamImgs', JSON.stringify(_teamImgCache)); } catch(e) {}
  }

  var _fetchInFlight = {};
  async function fetchTeamBanner(teamName) {
    var key = teamName.toLowerCase().trim();
    var cache = teamImgCache();
    if (key in cache) return cache[key];
    if (_fetchInFlight[key]) return _fetchInFlight[key];

    _fetchInFlight[key] = fetch(TSDB + '/searchteams.php?t=' + encodeURIComponent(teamName))
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(d) {
        var team = d && d.teams && d.teams[0];
        var url = team && (team.strTeamBanner || team.strTeamFanart1 || team.strTeamFanart2 || null);
        cache[key] = url || null;
        saveTeamImgCache();
        delete _fetchInFlight[key];
        return cache[key];
      })
      .catch(function() { cache[key] = null; delete _fetchInFlight[key]; return null; });

    return _fetchInFlight[key];
  }

  function applyCardImage(card, imgUrl, cat) {
    if (!imgUrl || !card.isConnected) return;
    var grad = CAT_GRAD[cat] || CAT_GRAD['other'];
    card.style.backgroundImage =
      'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.78) 60%,#080808 100%),url(' + imgUrl + '),' + grad;
    card.style.backgroundSize = 'cover,cover,cover';
    card.style.backgroundPosition = 'center,center top,center';
  }

  // IntersectionObserver — only fetches when card is near viewport
  var _cardObserver = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      _cardObserver.unobserve(entry.target);
      var card = entry.target;
      var m = card.__match;
      if (!m || m.poster) return; // already has an image
      if (!TEAM_SPORTS[m.category]) return;
      var vs = (m.title || '').match(/^(.+?)\s+vs\.?\s+(.+)$/i);
      if (!vs) return;
      fetchTeamBanner(vs[1].trim()).then(function(url) { applyCardImage(card, url, m.category); });
    });
  }, { rootMargin: '200px' });

  // ESX sport key → internal category
  var ESX_CAT = {
    'football': 'football',
    'basketball': 'basketball',
    'amfootball': 'american-football',
    'volleyball': 'volleyball',
    'badminton': 'badminton',
    'race': 'motorsports',
    'tennis': 'tennis',
    'baseball': 'baseball',
    'fight': 'fight',
    'hockey': 'hockey',
    'rugby': 'rugby',
    'cricket': 'cricket',
    'other': 'other',
  };

  // i18n helper (named lt to avoid conflict with local vars named t)
  function lt(key, fallback) {
    return (window.i18n && window.i18n.t(key, fallback)) || fallback || key;
  }

  var CAT_LABEL_KEYS = {
    'football':          'live.categories.football',
    'basketball':        'live.categories.basketball',
    'american-football': 'live.categories.americanFootball',
    'volleyball':        'live.categories.volleyball',
    'badminton':         'live.categories.badminton',
    'motorsports':       'live.categories.motorsports',
    'tennis':            'live.categories.tennis',
    'baseball':          'live.categories.baseball',
    'fight':             'live.categories.fight',
    'hockey':            'live.categories.hockey',
    'rugby':             'live.categories.rugby',
    'cricket':           'live.categories.cricket',
    'golf':              'live.categories.golf',
    'afl':               'live.categories.afl',
    'darts':             'live.categories.darts',
    'billiards':         'live.categories.billiards',
    'other':             'live.categories.other',
  };

  var CAT_LABEL_FALLBACK = {
    'football': 'Football', 'basketball': 'Basketball',
    'american-football': 'NFL / CFL', 'volleyball': 'Volleyball',
    'badminton': 'Badminton', 'motorsports': 'Motorsports',
    'tennis': 'Tennis', 'baseball': 'Baseball', 'fight': 'UFC / Boxing',
    'hockey': 'Hockey', 'rugby': 'Rugby', 'cricket': 'Cricket',
    'golf': 'Golf', 'afl': 'AFL', 'darts': 'Darts', 'billiards': 'Billiards', 'other': 'Other',
  };

  // vibrant radial color glow per sport — makes every card visually distinct
  var CAT_GRAD = {
    'football':          'radial-gradient(ellipse at top left,rgba(34,197,94,.45) 0%,transparent 65%)',
    'basketball':        'radial-gradient(ellipse at top left,rgba(249,115,22,.5) 0%,transparent 65%)',
    'american-football': 'radial-gradient(ellipse at top left,rgba(239,68,68,.45) 0%,transparent 65%)',
    'tennis':            'radial-gradient(ellipse at top left,rgba(163,230,53,.42) 0%,transparent 65%)',
    'motorsports':       'radial-gradient(ellipse at top left,rgba(248,113,113,.5) 0%,transparent 65%)',
    'fight':             'radial-gradient(ellipse at top left,rgba(236,72,153,.48) 0%,transparent 65%)',
    'hockey':            'radial-gradient(ellipse at top left,rgba(59,130,246,.48) 0%,transparent 65%)',
    'baseball':          'radial-gradient(ellipse at top left,rgba(245,158,11,.45) 0%,transparent 65%)',
    'cricket':           'radial-gradient(ellipse at top left,rgba(16,185,129,.45) 0%,transparent 65%)',
    'rugby':             'radial-gradient(ellipse at top left,rgba(180,83,9,.48) 0%,transparent 65%)',
    'volleyball':        'radial-gradient(ellipse at top left,rgba(139,92,246,.48) 0%,transparent 65%)',
    'badminton':         'radial-gradient(ellipse at top left,rgba(234,179,8,.45) 0%,transparent 65%)',
    'golf':              'radial-gradient(ellipse at top left,rgba(74,222,128,.38) 0%,transparent 65%)',
    'other':             'radial-gradient(ellipse at top left,rgba(107,114,128,.35) 0%,transparent 65%)',
  };

  var CAT_ICON = {
    'football': '⚽',
    'basketball': '🏀',
    'american-football': '🏈',
    'volleyball': '🏐',
    'badminton': '🏸',
    'motorsports': '🏎',
    'tennis': '🎾',
    'baseball': '⚾',
    'fight': '🥊',
    'hockey': '🏒',
    'rugby': '🏉',
    'cricket': '🏏',
    'golf': '⛳',
    'afl': '🏉',
    'darts': '🎯',
    'other': '📺',
  };

  var currentSport = 'all';
  var allMatches = [];
  var searchQuery = '';
  var refreshTimer = null;
  var refreshCountdown = 0;
  var countdownInterval = null;

  // --- data ---

  async function fetchStreamed() {
    try {
      var [liveRes, todayRes] = await Promise.all([
        fetch(STREAMED + '/matches/live'),
        fetch(STREAMED + '/matches/all-today'),
      ]);
      var live = liveRes.ok ? (await liveRes.json() || []) : [];
      var today = todayRes.ok ? (await todayRes.json() || []) : [];
      var liveIds = new Set(live.map(function (m) { return m.id; }));
      return (Array.isArray(today) ? today : []).map(function (m) {
        return Object.assign({}, m, {
          isLive: liveIds.has(m.id),
          provider: 'streamed',
        });
      });
    } catch (e) { return []; }
  }

  function parseWIB(str) {
    if (!str) return 0;
    var p = str.split(' ');
    var d = p[0].split('-').map(Number);
    var t = (p[1] || '00:00').split(':').map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], t[0] - 7, t[1]);
  }

  async function fetchESX() {
    try {
      var r = await fetch(ESX + '/streams');
      if (!r.ok) return [];
      var data = await r.json();
      var out = [];
      var now = Date.now();
      var sportKeys = Object.keys(ESX_CAT);

      sportKeys.forEach(function (esxKey) {
        if (!Array.isArray(data[esxKey])) return;
        var cat = ESX_CAT[esxKey];
        data[esxKey].forEach(function (m) {
          var start = parseWIB(m.kickoff);
          var end = parseWIB(m.endTime) || (start + 3 * 3600000);
          out.push({
            id: 'esx-' + (m.slug || m.slugkey || Math.random()),
            title: m.tag || '',
            category: cat,
            league: m.league || '',
            poster: m.poster || null,
            date: start,
            isLive: now >= start && now <= end,
            provider: 'esx',
            iframes: Array.isArray(m.iframes) ? m.iframes : [],
          });
        });
      });
      return out;
    } catch (e) { return []; }
  }

  // Normalize match title for dedup: remove punctuation, sort team names
  function normalizeTitle(title) {
    var s = (title || '').toLowerCase()
      .replace(/\./g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    // Sort "A vs B" so "A vs B" == "B vs A"
    var m = s.match(/^(.+?)\s+vs\.?\s+(.+)$/);
    if (m) {
      var teams = [m[1].trim(), m[2].trim()].sort();
      return teams.join('|');
    }
    return s;
  }

  async function loadMatches() {
    var [streamedData, esxData] = await Promise.all([fetchStreamed(), fetchESX()]);

    // Streamed.pk primary, ESX fills gaps (smart dedup by normalized title)
    var seenNorm = new Set(streamedData.map(function (m) { return normalizeTitle(m.title); }));

    var esxNew = esxData.filter(function (m) {
      var norm = normalizeTitle(m.title);
      if (seenNorm.has(norm)) return false;
      seenNorm.add(norm);
      return true;
    });

    allMatches = streamedData.concat(esxNew);
    return allMatches;
  }

  async function getStreamEmbed(source, id) {
    try {
      var r = await fetch(STREAMED + '/stream/' + source + '/' + encodeURIComponent(id));
      if (!r.ok) return [];
      var streams = await r.json();
      if (!Array.isArray(streams)) return [];
      // HD first
      streams.sort(function (a, b) { return (b.hd ? 1 : 0) - (a.hd ? 1 : 0); });
      return streams;
    } catch (e) { return []; }
  }

  // --- helpers ---

  function fmtRelTime(ts) {
    if (!ts) return '';
    var now = Date.now();
    var diff = ts - now;
    if (diff < 0) return 'Live now';
    var mins = Math.round(diff / 60000);
    if (mins < 60) return 'in ' + mins + 'm';
    var hrs = Math.floor(diff / 3600000);
    var rem = Math.round((diff % 3600000) / 60000);
    if (hrs < 24) return 'in ' + hrs + 'h' + (rem ? ' ' + rem + 'm' : '');
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function fmtAbsTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function catIcon(cat) { return CAT_ICON[cat] || '🔴'; }
  function catLabel(cat) {
    var key = CAT_LABEL_KEYS[cat];
    var fb  = CAT_LABEL_FALLBACK[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ') : '');
    return key ? lt(key, fb) : fb;
  }

  function filtered() {
    var q = searchQuery.toLowerCase().trim();
    return allMatches.filter(function (m) {
      if (currentSport !== 'all' && m.category !== currentSport) return false;
      if (q) {
        var hay = ((m.title || '') + ' ' + (m.league || '') + ' ' + catLabel(m.category)).toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }

  // --- tabs ---

  function renderTabs() {
    var mount = document.getElementById('sport-tabs-mount');
    if (!mount) return;

    var countByCat = {};
    allMatches.forEach(function (m) {
      countByCat[m.category] = (countByCat[m.category] || 0) + 1;
    });

    var sportOrder = [
      'football', 'basketball', 'tennis', 'american-football',
      'baseball', 'hockey', 'motorsports', 'fight',
      'rugby', 'cricket', 'volleyball', 'badminton', 'other',
    ];
    var presentSports = sportOrder.filter(function (s) { return countByCat[s]; });
    // append any sports not in the order list
    Object.keys(countByCat).forEach(function (s) {
      if (!presentSports.includes(s)) presentSports.push(s);
    });

    var wrap = document.createElement('div');
    wrap.className = 'pills';

    var allCount = allMatches.length;
    ['all'].concat(presentSports).forEach(function (s) {
      var cnt = s === 'all' ? allCount : (countByCat[s] || 0);
      var btn = document.createElement('button');
      btn.className = 'pill live-tab' + (s === currentSport ? ' pill--active' : '');
      btn.dataset.sport = s;

      var label = s === 'all' ? lt('live.tabs.all', 'All') : (catIcon(s) + ' ' + catLabel(s));
      btn.innerHTML = label + ' <span class="live-tab__count">' + cnt + '</span>';

      btn.addEventListener('click', function () {
        currentSport = s;
        mount.querySelectorAll('.live-tab').forEach(function (b) { b.classList.remove('pill--active'); });
        btn.classList.add('pill--active');
        renderMatches();
      });
      wrap.appendChild(btn);
    });

    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // --- search ---

  function renderSearch() {
    var mount = document.getElementById('live-search-mount');
    if (!mount) return;

    var wrap = document.createElement('div');
    wrap.className = 'live-search-wrap';

    var icon = document.createElement('span');
    icon.className = 'live-search-icon';
    icon.textContent = '⌕';

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'live-search-input';
    input.placeholder = lt('live.search.placeholder', 'Search matches, leagues, sports…');
    input.addEventListener('input', function () {
      searchQuery = input.value;
      renderMatches();
    });

    var clear = document.createElement('button');
    clear.className = 'live-search-clear';
    clear.textContent = '✕';
    clear.hidden = true;
    clear.addEventListener('click', function () {
      input.value = '';
      searchQuery = '';
      clear.hidden = true;
      renderMatches();
    });

    input.addEventListener('input', function () {
      clear.hidden = !input.value;
    });

    wrap.appendChild(icon);
    wrap.appendChild(input);
    wrap.appendChild(clear);
    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // --- matches ---

  function renderMatches() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;

    var list = filtered();
    list.sort(function (a, b) {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return (a.date || 0) - (b.date || 0);
    });

    mount.innerHTML = '';

    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'live-empty';
      empty.innerHTML = searchQuery
        ? '<span style="font-size:32px">🔍</span><br>' + lt('live.empty.noResults', 'No matches found for') + ' "' + searchQuery + '"'
        : '<span style="font-size:32px">📺</span><br>' + lt('live.empty.noMatches', 'No matches scheduled right now.');
      mount.appendChild(empty);
      return;
    }

    var live = list.filter(function (m) { return m.isLive; });
    var upcoming = list.filter(function (m) { return !m.isLive; });

    if (live.length) {
      var sec = document.createElement('div');
      sec.className = 'live-section';
      var head = document.createElement('div');
      head.className = 'row__head';
      var t = document.createElement('h2');
      t.className = 'row__title';
      t.innerHTML = '<span class="live-section-dot"></span> ' + lt('live.sections.liveNow', 'Live Now') + ' <span class="live-section-cnt">' + live.length + '</span>';
      head.appendChild(t);
      sec.appendChild(head);
      var grid = document.createElement('div');
      grid.className = 'match-grid';
      live.forEach(function (m) { grid.appendChild(makeCard(m)); });
      sec.appendChild(grid);
      mount.appendChild(sec);
    }

    if (upcoming.length) {
      var sec2 = document.createElement('div');
      sec2.className = 'live-section';
      var head2 = document.createElement('div');
      head2.className = 'row__head';
      var t2 = document.createElement('h2');
      t2.className = 'row__title';
      t2.textContent = lt('live.sections.todaySchedule', "Today's Schedule");
      head2.appendChild(t2);
      sec2.appendChild(head2);
      var grid2 = document.createElement('div');
      grid2.className = 'match-grid';
      upcoming.forEach(function (m) { grid2.appendChild(makeCard(m)); });
      sec2.appendChild(grid2);
      mount.appendChild(sec2);
    }
  }

  function makeCard(m) {
    var card = document.createElement('div');
    card.className = 'match-card' + (m.isLive ? ' match-card--live' : '');

    // vibrant sport glow + optional poster image on every card
    var grad = CAT_GRAD[m.category] || CAT_GRAD['other'];
    card.classList.add('match-card--has-poster');
    card.style.backgroundColor = '#0a0a0a';
    card.dataset.sportIcon = catIcon(m.category);
    if (m.poster) {
      card.style.backgroundImage =
        'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.75) 60%,#080808 100%),url(' + m.poster + '),' + grad;
      card.style.backgroundSize = 'cover,cover,cover';
      card.style.backgroundPosition = 'center,center top,center';
    } else {
      card.style.backgroundImage = grad;
    }

    // sport + live badge
    var top = document.createElement('div');
    top.className = 'match-card__top';

    var sportBadge = document.createElement('span');
    sportBadge.className = 'match-card__sport';
    sportBadge.textContent = catIcon(m.category) + ' ' + catLabel(m.category);
    top.appendChild(sportBadge);

    if (m.isLive) {
      var live = document.createElement('span');
      live.className = 'match-card__live-badge';
      live.innerHTML = '<span class="live-dot"></span>LIVE';
      top.appendChild(live);
    }

    card.appendChild(top);

    // title (teams)
    var title = document.createElement('div');
    title.className = 'match-card__title';
    title.textContent = m.title || '';
    card.appendChild(title);

    // league
    if ((m.league || '').trim() || (m.teams && m.teams.home)) {
      var league = document.createElement('div');
      league.className = 'match-card__league';
      league.textContent = m.league || '';
      card.appendChild(league);
    }

    // footer
    var bot = document.createElement('div');
    bot.className = 'match-card__bot';

    var timeEl = document.createElement('span');
    timeEl.className = 'match-card__time' + (m.isLive ? ' match-card__time--live' : '');
    if (m.isLive) {
      timeEl.innerHTML = 'Live now';
    } else {
      var rel = fmtRelTime(m.date);
      var abs = fmtAbsTime(m.date);
      timeEl.textContent = abs;
      timeEl.title = rel;
      if (m.date && (m.date - Date.now()) < 30 * 60000) {
        timeEl.classList.add('match-card__time--soon');
      }
    }

    var srcCount = m.sources ? m.sources.length : (m.iframes ? m.iframes.length : 0);
    var playEl = document.createElement('span');
    playEl.className = 'match-card__play';
    playEl.innerHTML = '&#9654; ' + (srcCount > 1 ? srcCount + ' ' + lt('live.streams.streams', 'streams') : lt('live.streams.watch', 'Watch'));

    bot.appendChild(timeEl);
    bot.appendChild(playEl);
    card.appendChild(bot);

    card.addEventListener('click', function () { openPlayer(m); });

    // lazy-load real team image from TheSportsDB when card enters viewport
    card.__match = m;
    _cardObserver.observe(card);

    return card;
  }

  // --- refresh bar ---

  function renderRefreshBar() {
    var mount = document.getElementById('live-refresh-mount');
    if (!mount) return;
    var bar = document.createElement('div');
    bar.className = 'live-refresh-bar';
    bar.id = 'live-refresh-bar';
    var label = document.createElement('span');
    label.id = 'live-refresh-label';
    label.textContent = lt('live.refresh.autoRefresh', 'Auto-refreshing in') + ' 5:00';
    var btn = document.createElement('button');
    btn.className = 'live-refresh-btn';
    btn.textContent = lt('live.refresh.button', '↻ Refresh now');
    btn.addEventListener('click', function () { forceRefresh(); });
    bar.appendChild(label);
    bar.appendChild(btn);
    mount.innerHTML = '';
    mount.appendChild(bar);
  }

  function startRefreshCountdown() {
    refreshCountdown = 300; // 5 minutes
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(function () {
      refreshCountdown--;
      var label = document.getElementById('live-refresh-label');
      if (label) {
        var m = Math.floor(refreshCountdown / 60);
        var s = refreshCountdown % 60;
        label.textContent = lt('live.refresh.autoRefresh', 'Auto-refreshing in') + ' ' + m + ':' + (s < 10 ? '0' : '') + s;
      }
      if (refreshCountdown <= 0) {
        clearInterval(countdownInterval);
        forceRefresh();
      }
    }, 1000);
  }

  async function forceRefresh() {
    var btn = document.querySelector('.live-refresh-btn');
    if (btn) { btn.textContent = lt('live.refresh.refreshing', '↻ Refreshing…'); btn.disabled = true; }
    await loadMatches();
    renderTabs();
    renderMatches();
    if (btn) { btn.textContent = lt('live.refresh.button', '↻ Refresh now'); btn.disabled = false; }
    startRefreshCountdown();
  }

  // --- player modal ---

  function ensureModal() {
    var existing = document.getElementById('live-modal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'live-modal';
    modal.className = 'live-modal';
    modal.hidden = true;

    var inner = document.createElement('div');
    inner.className = 'live-modal__inner';

    // header
    var hdr = document.createElement('div');
    hdr.className = 'live-modal__hdr';

    var info = document.createElement('div');
    info.className = 'live-modal__info';

    var sport = document.createElement('div');
    sport.className = 'live-modal__sport';
    sport.id = 'live-modal-sport';

    var titleEl = document.createElement('div');
    titleEl.className = 'live-modal__title';
    titleEl.id = 'live-modal-title';

    var leagueEl = document.createElement('div');
    leagueEl.className = 'live-modal__league';
    leagueEl.id = 'live-modal-league';

    info.appendChild(sport);
    info.appendChild(titleEl);
    info.appendChild(leagueEl);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'live-modal__close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', closePlayer);

    hdr.appendChild(info);
    hdr.appendChild(closeBtn);

    // player
    var playerWrap = document.createElement('div');
    playerWrap.className = 'live-modal__player';

    var loading = document.createElement('div');
    loading.className = 'live-modal__player-loading';
    loading.id = 'live-player-loading';
    loading.textContent = lt('live.player.loading', 'Loading stream…');

    playerWrap.id = 'live-player-wrap';
    playerWrap.appendChild(loading);
    // iframe is created fresh on each source load (replacing it bypasses beforeunload interception)

    // sources bar
    var srcBar = document.createElement('div');
    srcBar.className = 'live-modal__srcbar';

    var srcLabel = document.createElement('span');
    srcLabel.className = 'live-modal__src-label';
    srcLabel.textContent = lt('live.player.sources', 'Sources:');

    var srcBtns = document.createElement('div');
    srcBtns.className = 'live-modal__sources';
    srcBtns.id = 'live-sources';

    srcBar.appendChild(srcLabel);
    srcBar.appendChild(srcBtns);

    inner.appendChild(hdr);
    inner.appendChild(playerWrap);
    inner.appendChild(srcBar);
    modal.appendChild(inner);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) { if (e.target === modal) closePlayer(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePlayer(); });

    return modal;
  }

  async function openPlayer(match) {
    var modal = ensureModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    document.getElementById('live-modal-sport').textContent = catIcon(match.category) + ' ' + catLabel(match.category);
    document.getElementById('live-modal-title').textContent = match.title || 'Live Stream';
    document.getElementById('live-modal-league').textContent = match.league || '';

    var sourcesEl = document.getElementById('live-sources');
    var loading = document.getElementById('live-player-loading');

    // Kill any existing iframe immediately
    var oldFr = document.querySelector('#live-player-wrap iframe');
    if (oldFr) oldFr.remove();
    loading.style.display = 'flex';
    sourcesEl.innerHTML = '';

    if (match.provider === 'streamed' && Array.isArray(match.sources) && match.sources.length) {
      var results = await Promise.all(
        match.sources.map(async function (src) {
          var streams = await getStreamEmbed(src.source, src.id);
          return streams.map(function (s) {
            var label = src.source.charAt(0).toUpperCase() + src.source.slice(1);
            if (streams.length > 1) label += ' ' + (s.hd ? 'HD' : 'SD');
            return { label: label, url: s.embedUrl, hd: s.hd };
          });
        })
      );
      var sources = results.flat().filter(function (s) { return s.url; });
      renderSources(sourcesEl, loading, sources);

    } else if (match.provider === 'esx' && Array.isArray(match.iframes) && match.iframes.length) {
      var sources = match.iframes.map(function (f, i) {
        return { label: f.server || ('Stream ' + (i + 1)), url: f.url, hd: /fhd|hd/i.test(f.server || '') };
      });
      renderSources(sourcesEl, loading, sources);

    } else {
      loading.textContent = lt('live.player.noStreams', 'No streams found for this match.');
    }
  }

  function spawnIframe(url) {
    // Remove existing iframe — embed players hook beforeunload to block src changes,
    // so we destroy and recreate the element to bypass that interception entirely.
    var wrap = document.getElementById('live-player-wrap');
    var old = wrap && wrap.querySelector('iframe');
    if (old) old.remove();

    var fr = document.createElement('iframe');
    fr.allowFullscreen = true;
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-pointer-lock allow-orientation-lock');
    fr.src = url;
    if (wrap) wrap.appendChild(fr);
    return fr;
  }

  function renderSources(wrap, loading, sources) {
    wrap.innerHTML = '';
    if (!sources.length) {
      loading.textContent = lt('live.player.noAvailable', 'No streams available.');
      return;
    }

    loading.style.display = 'none';
    spawnIframe(sources[0].url);

    sources.forEach(function (src, i) {
      var btn = document.createElement('button');
      btn.className = 'live-src-btn' + (i === 0 ? ' live-src-btn--active' : '') + (src.hd ? ' live-src-btn--hd' : '');
      btn.textContent = src.label;
      btn.addEventListener('click', function () {
        wrap.querySelectorAll('.live-src-btn').forEach(function (b) { b.classList.remove('live-src-btn--active'); });
        btn.classList.add('live-src-btn--active');
        spawnIframe(src.url);
      });
      wrap.appendChild(btn);
    });
  }

  function closePlayer() {
    var modal = document.getElementById('live-modal');
    if (modal) modal.hidden = true;
    // Remove iframe entirely — stops the stream and any audio
    var fr = document.querySelector('#live-player-wrap iframe');
    if (fr) fr.remove();
    document.body.style.overflow = '';
  }

  // --- init ---

  async function init() {
    if (window.renderTopNav) renderTopNav('live');
    if (window.renderBottomNav) renderBottomNav('live');
    if (window.renderFooter) renderFooter('footer-mount');

    renderSearch();
    renderRefreshBar();

    var mount = document.getElementById('matches-mount');
    if (mount) {
      mount.innerHTML = '<div class="live-empty"><span style="font-size:32px">📡</span><br>' + lt('live.empty.fetching', 'Fetching live matches…') + '</div>';
    }

    await loadMatches();
    renderTabs();
    renderMatches();
    startRefreshCountdown();

    // re-render dynamic text when user switches language
    window.addEventListener('eli6.langChanged', function () {
      renderSearch();
      renderRefreshBar();
      renderTabs();
      renderMatches();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();

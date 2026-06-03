(function () {
  'use strict';

  // === CONSTANTS ===
  var STREAMED = 'https://streamed.pk/api';
  var ESX = 'https://api.embedsportex.site/api';
  var ESX_ORIGIN = 'https://api.embedsportex.site';
  var TSDB = 'https://www.thesportsdb.com/api/v1/json/123';

  // Sports where team lookups make sense (skip tennis, fight, motor — no team banners)
  var TEAM_SPORTS = { football: 1, basketball: 1, 'american-football': 1, hockey: 1, baseball: 1, cricket: 1, rugby: 1, volleyball: 1 };

  // Map our category → TSDB sport name for live score lookups via eventsday.php
  var TSDB_SPORT_FOR = {
    football: 'Soccer',
    basketball: 'Basketball',
    'american-football': 'American Football',
    baseball: 'Baseball',
    hockey: 'Ice Hockey',
    rugby: 'Rugby',
    cricket: 'Cricket',
  };

  // TSDB status codes → i18n key for badge
  var STATUS_KEY = {
    'NS': 'live.status.upcoming',
    'Not Started': 'live.status.upcoming',
    'Match Finished': 'live.status.ft',
    'FT': 'live.status.ft',
    'AET': 'live.status.ft',
    'PEN': 'live.status.ft',
    'HT': 'live.status.ht',
    'Half Time': 'live.status.ht',
    'Live': 'live.status.live',
    '1H': 'live.status.live',
    '2H': 'live.status.live',
    '3H': 'live.status.live',
    '4H': 'live.status.live',
    'OT': 'live.status.live',
    'Postponed': 'live.status.postponed',
    'PST': 'live.status.postponed',
    'Cancelled': 'live.status.cancelled',
    'Canceled': 'live.status.cancelled',
    'CANC': 'live.status.cancelled',
  };
  var STATUS_FALLBACK = {
    'live.status.upcoming': 'Upcoming',
    'live.status.ft': 'FT',
    'live.status.ht': 'HT',
    'live.status.live': 'Live',
    'live.status.postponed': 'Postponed',
    'live.status.cancelled': 'Cancelled',
  };

  // Iframe host allowlist (defense-in-depth on top of CSP frame-src)
  var IFRAME_HOST_ALLOW = [
    /(^|\.)streamed\.pk$/i,
    /(^|\.)embedsportex\.site$/i,
    /(^|\.)embedme\.top$/i,
    /(^|\.)embed\.su$/i,
    /(^|\.)vidsrc\./i,
    /(^|\.)vixsrc\.to$/i,
    /(^|\.)autoembed\.co$/i,
    /(^|\.)multiembed\.mov$/i,
    /(^|\.)superembed\.stream$/i,
    /(^|\.)smashy\.stream$/i,
    /(^|\.)vidlink\.pro$/i,
    /(^|\.)vidfast\.pro$/i,
    /(^|\.)2embed\.stream$/i,
    /(^|\.)apiplayer\.ru$/i,
    /(^|\.)vaplayer\.ru$/i,
    /(^|\.)youtube(?:-nocookie)?\.com$/i,
    /(^|\.)daddylive\.eu$/i,
    /(^|\.)dlhd\.(pk|link)$/i,
    /(^|\.)westream\.(su|top)$/i,
  ];
  function isAllowedIframeUrl(url) {
    try {
      var u = new URL(url, location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      return IFRAME_HOST_ALLOW.some(function (rx) { return rx.test(u.hostname); });
    } catch (e) { return false; }
  }

  // === TEAM-IMG CACHE (sessionStorage, v2 after property-name fix) ===
  var _teamImgCache = null;
  var TEAM_CACHE_KEY = 'eli6.teamImgs.v2';
  function teamImgCache() {
    if (!_teamImgCache) {
      try { _teamImgCache = JSON.parse(sessionStorage.getItem(TEAM_CACHE_KEY) || '{}'); } catch (e) { _teamImgCache = {}; }
      try { sessionStorage.removeItem('eli6.teamImgs'); } catch (e) {}
    }
    return _teamImgCache;
  }
  function saveTeamImgCache() {
    try { sessionStorage.setItem(TEAM_CACHE_KEY, JSON.stringify(_teamImgCache)); } catch (e) {}
  }

  var _fetchInFlight = {};
  async function fetchTeamBanner(teamName) {
    var key = teamName.toLowerCase().trim();
    var cache = teamImgCache();
    if (key in cache) return cache[key];
    if (_fetchInFlight[key]) return _fetchInFlight[key];

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 5000);

    _fetchInFlight[key] = fetch(TSDB + '/searchteams.php?t=' + encodeURIComponent(teamName), { signal: controller.signal })
      .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : null; })
      .then(function (d) {
        var team = d && d.teams && d.teams[0];
        var url = team && (team.strFanart1 || team.strFanart2 || team.strFanart3 || team.strFanart4 || team.strBanner || team.strBadge || team.strLogo || null);
        cache[key] = url || null;
        saveTeamImgCache();
        delete _fetchInFlight[key];
        return cache[key];
      })
      .catch(function () { clearTimeout(timer); cache[key] = null; delete _fetchInFlight[key]; return null; });

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
  var _cardObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      _cardObserver.unobserve(entry.target);
      var card = entry.target;
      var m = card.__match;
      if (!m || m.poster) return;
      if (!TEAM_SPORTS[m.category]) return;
      var vs = (m.title || '').match(/^(.+?)\s+vs\.?\s+(.+)$/i);
      if (!vs) return;
      fetchTeamBanner(vs[1].trim()).then(function (url) { applyCardImage(card, url, m.category); });
    });
  }, { rootMargin: '200px' });

  // ESX sport key → internal category
  var ESX_CAT = {
    'football': 'football', 'basketball': 'basketball', 'amfootball': 'american-football',
    'volleyball': 'volleyball', 'badminton': 'badminton', 'race': 'motorsports',
    'tennis': 'tennis', 'baseball': 'baseball', 'fight': 'fight', 'hockey': 'hockey',
    'rugby': 'rugby', 'cricket': 'cricket', 'other': 'other',
  };

  // i18n helper (named lt to avoid conflict with local vars named t)
  function lt(key, fallback) {
    return (window.i18n && window.i18n.t(key, fallback)) || fallback || key;
  }

  var CAT_LABEL_KEYS = {
    'football': 'live.categories.football', 'basketball': 'live.categories.basketball',
    'american-football': 'live.categories.americanFootball', 'volleyball': 'live.categories.volleyball',
    'badminton': 'live.categories.badminton', 'motorsports': 'live.categories.motorsports',
    'tennis': 'live.categories.tennis', 'baseball': 'live.categories.baseball',
    'fight': 'live.categories.fight', 'hockey': 'live.categories.hockey',
    'rugby': 'live.categories.rugby', 'cricket': 'live.categories.cricket',
    'golf': 'live.categories.golf', 'afl': 'live.categories.afl',
    'darts': 'live.categories.darts', 'billiards': 'live.categories.billiards',
    'other': 'live.categories.other',
  };
  var CAT_LABEL_FALLBACK = {
    'football': 'Football', 'basketball': 'Basketball',
    'american-football': 'NFL / CFL', 'volleyball': 'Volleyball',
    'badminton': 'Badminton', 'motorsports': 'Motorsports',
    'tennis': 'Tennis', 'baseball': 'Baseball', 'fight': 'UFC / Boxing',
    'hockey': 'Hockey', 'rugby': 'Rugby', 'cricket': 'Cricket',
    'golf': 'Golf', 'afl': 'AFL', 'darts': 'Darts', 'billiards': 'Billiards', 'other': 'Other',
  };

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
    'football': '⚽', 'basketball': '🏀', 'american-football': '🏈',
    'volleyball': '🏐', 'badminton': '🏸', 'motorsports': '🏎',
    'tennis': '🎾', 'baseball': '⚾', 'fight': '🥊', 'hockey': '🏒',
    'rugby': '🏉', 'cricket': '🏏', 'golf': '⛳', 'afl': '🏉',
    'darts': '🎯', 'other': '📺',
  };

  // === STATE ===
  var currentSport = 'all';
  var currentLeague = 'all';
  var currentDate = 'today'; // 'yesterday' | 'today' | 'tomorrow'
  var allMatches = [];
  var searchQuery = '';
  var refreshCountdown = 0;
  var countdownInterval = null;
  var _openPlayerSeq = 0;
  var _searchDebounce = null;
  var _refreshInFlight = false;
  var liveScores = {}; // norm title → { home, away, status, time, badgeHome, badgeAway }

  // === PERSISTENCE ===
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var favorites = loadJSON('eli6.live.favorites', []);       // array of team names (lowercase)
  var sourceVotes = loadJSON('eli6.live.sourceVotes', {});   // url → { up:n, down:n }

  // === FAVORITES ===
  function isFavoriteTeam(teamName) {
    if (!teamName) return false;
    return favorites.indexOf(teamName.toLowerCase().trim()) !== -1;
  }
  function toggleFavoriteTeam(teamName) {
    var t = teamName.toLowerCase().trim();
    var i = favorites.indexOf(t);
    if (i === -1) favorites.push(t);
    else favorites.splice(i, 1);
    saveJSON('eli6.live.favorites', favorites);
  }
  function matchHasFavorite(m) {
    if (!favorites.length) return false;
    var teams = extractTeams(m.title);
    return teams.some(function (t) { return isFavoriteTeam(t); });
  }
  function extractTeams(title) {
    if (!title) return [];
    var vs = title.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    return vs ? [vs[1].trim(), vs[2].trim()] : [title.trim()];
  }

  // === STREAM RELIABILITY VOTES ===
  function voteScore(url) {
    var v = sourceVotes[url];
    if (!v) return 0;
    return (v.up || 0) - (v.down || 0);
  }
  function voteSource(url, dir) {
    var v = sourceVotes[url] || (sourceVotes[url] = { up: 0, down: 0 });
    if (dir === 'up') v.up++; else v.down++;
    saveJSON('eli6.live.sourceVotes', sourceVotes);
  }
  function sortSourcesByVotes(sources) {
    return sources.slice().sort(function (a, b) {
      var sa = voteScore(a.url), sb = voteScore(b.url);
      if (sa !== sb) return sb - sa;
      return (b.hd ? 1 : 0) - (a.hd ? 1 : 0);
    });
  }

  // === DATA FETCHING ===

  async function fetchStreamed(targetDate) {
    try {
      var endpoints;
      if (targetDate === 'today') {
        endpoints = [STREAMED + '/matches/live', STREAMED + '/matches/all-today'];
      } else {
        // yesterday/tomorrow: fetch /matches/all and filter
        endpoints = [STREAMED + '/matches/live', STREAMED + '/matches/all'];
      }
      var [liveRes, todayRes] = await Promise.all(endpoints.map(function (u) { return fetch(u); }));
      var live = liveRes.ok ? (await liveRes.json() || []) : [];
      var all = todayRes.ok ? (await todayRes.json() || []) : [];
      var liveIds = new Set(live.map(function (m) { return m.id; }));

      var CAT_NORMALIZE = { 'motor-sports': 'motorsports' };

      var mapped = (Array.isArray(all) ? all : []).map(function (m) {
        var cat = m.category || 'other';
        return Object.assign({}, m, {
          isLive: liveIds.has(m.id),
          provider: 'streamed',
          category: CAT_NORMALIZE[cat] || cat,
        });
      });

      // Filter by target date if not 'today'
      if (targetDate !== 'today') {
        var range = dateRangeFor(targetDate);
        mapped = mapped.filter(function (m) { return m.date >= range.start && m.date < range.end; });
      }
      return mapped;
    } catch (e) { return []; }
  }

  function dateRangeFor(which) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    if (which === 'yesterday') d.setDate(d.getDate() - 1);
    else if (which === 'tomorrow') d.setDate(d.getDate() + 1);
    var start = d.getTime();
    return { start: start, end: start + 86400000 };
  }

  function parseWIB(str) {
    if (!str || typeof str !== 'string') return 0;
    var p = str.trim().split(' ');
    var d = p[0].split('-').map(Number);
    var t = (p[1] || '00:00').split(':').map(Number);
    if (d.length < 3 || isNaN(d[0]) || isNaN(d[1]) || isNaN(d[2])) return 0;
    var ts = Date.UTC(d[0], d[1] - 1, d[2], (t[0] || 0) - 7, t[1] || 0);
    return isNaN(ts) ? 0 : ts;
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
          var poster = m.poster || null;
          if (poster && poster.startsWith('/')) poster = ESX_ORIGIN + poster;
          out.push({
            id: 'esx-' + (m.slug || m.slugkey || Math.random()),
            title: m.tag || '',
            category: cat, league: m.league || '', poster: poster,
            date: start, isLive: now >= start && now <= end, provider: 'esx',
            iframes: Array.isArray(m.iframes) ? m.iframes : [],
          });
        });
      });
      return out;
    } catch (e) { return []; }
  }

  function normalizeTitle(title) {
    var s = (title || '').toLowerCase()
      .replace(/\./g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    var m = s.match(/^(.+?)\s+vs\.?\s+(.+)$/);
    if (m) {
      var teams = [m[1].trim(), m[2].trim()].sort();
      return teams.join('|');
    }
    return s;
  }

  async function loadMatches() {
    var [streamedData, esxData] = await Promise.all([fetchStreamed(currentDate), fetchESX()]);
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

  // === LIVE SCORES (TheSportsDB eventsday) ===

  async function fetchLiveScoresForDate(targetDate) {
    var d = new Date();
    if (targetDate === 'yesterday') d.setDate(d.getDate() - 1);
    else if (targetDate === 'tomorrow') d.setDate(d.getDate() + 1);
    var dateStr = d.toISOString().slice(0, 10);

    // Limit to sports that have team matches (2/sec rate limit)
    var sports = ['Soccer', 'Basketball', 'Baseball', 'Ice Hockey', 'American Football'];
    var scores = {};
    for (var i = 0; i < sports.length; i++) {
      var s = sports[i];
      try {
        var ctrl = new AbortController();
        var timer = setTimeout(function () { ctrl.abort(); }, 6000);
        var r = await fetch(TSDB + '/eventsday.php?d=' + dateStr + '&s=' + encodeURIComponent(s), { signal: ctrl.signal });
        clearTimeout(timer);
        if (!r.ok) continue;
        var data = await r.json();
        var events = data && data.events;
        if (!Array.isArray(events)) continue;
        events.forEach(function (ev) {
          var title = ev.strEvent || ((ev.strHomeTeam || '') + ' vs ' + (ev.strAwayTeam || ''));
          var key = normalizeTitle(title);
          if (!key) return;
          scores[key] = {
            home: ev.intHomeScore, away: ev.intAwayScore,
            status: ev.strStatus || (ev.strPostponed === 'yes' ? 'Postponed' : ''),
            badgeHome: ev.strHomeTeamBadge || null,
            badgeAway: ev.strAwayTeamBadge || null,
            homeName: ev.strHomeTeam, awayName: ev.strAwayTeam,
            league: ev.strLeague,
          };
        });
      } catch (e) { /* swallow per-sport errors */ }
      // Throttle: TSDB hard limit 2/sec
      if (i < sports.length - 1) await new Promise(function (r2) { setTimeout(r2, 600); });
    }
    return scores;
  }

  async function refreshLiveScores() {
    try { liveScores = await fetchLiveScoresForDate(currentDate); } catch (e) { liveScores = {}; }
  }

  function scoreFor(match) {
    var key = normalizeTitle(match.title);
    return liveScores[key] || null;
  }

  function statusBadgeFor(match) {
    var s = scoreFor(match);
    if (s && s.status) {
      var key = STATUS_KEY[s.status] || null;
      if (key) return { key: key, label: lt(key, STATUS_FALLBACK[key]) };
      // Numeric minute like "55'" → live
      if (/^\d/.test(s.status)) return { key: 'live.status.live', label: s.status };
    }
    if (match.isLive) return { key: 'live.status.live', label: lt('live.status.live', 'Live') };
    return null;
  }

  // === STREAM EMBED ===

  async function getStreamEmbed(source, id) {
    try {
      var r = await fetch(STREAMED + '/stream/' + source + '/' + encodeURIComponent(id));
      if (!r.ok) return [];
      var streams = await r.json();
      if (!Array.isArray(streams)) return [];
      streams.sort(function (a, b) { return (b.hd ? 1 : 0) - (a.hd ? 1 : 0); });
      return streams;
    } catch (e) { return []; }
  }

  // === FORMAT HELPERS ===

  function fmtAbsTime(ts) {
    if (!ts) return '';
    try {
      return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
    } catch (e) {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  }
  function fmtRelTime(ts) {
    if (!ts) return '';
    var diff = ts - Date.now();
    if (diff < 0) return lt('live.time.liveNow', 'Live now');
    var mins = Math.round(diff / 60000);
    if (mins < 60) return lt('live.time.inMins', 'in {n}m').replace('{n}', mins);
    var hrs = Math.floor(diff / 3600000);
    var rem = Math.round((diff % 3600000) / 60000);
    if (hrs < 24) return lt('live.time.inHrs', 'in {h}h {m}m').replace('{h}', hrs).replace('{m}', rem);
    return fmtAbsTime(ts);
  }

  function catIcon(cat) { return CAT_ICON[cat] || '🔴'; }
  function catLabel(cat) {
    var key = CAT_LABEL_KEYS[cat];
    var fb = CAT_LABEL_FALLBACK[cat] || (cat ? cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' ') : '');
    return key ? lt(key, fb) : fb;
  }

  // === FILTERING ===

  function filtered() {
    var q = searchQuery.toLowerCase().trim();
    return allMatches.filter(function (m) {
      if (currentSport === '__fav') {
        if (!matchHasFavorite(m)) return false;
      } else if (currentSport !== 'all' && m.category !== currentSport) {
        return false;
      }
      if (currentLeague !== 'all' && (m.league || '') !== currentLeague) return false;
      if (q) {
        var hay = ((m.title || '') + ' ' + (m.league || '') + ' ' + catLabel(m.category)).toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
  }

  // === DATE PICKER ===

  function renderDatePicker() {
    var mount = document.getElementById('live-date-mount');
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'pills live-date-pills';
    wrap.setAttribute('role', 'tablist');
    wrap.setAttribute('aria-label', lt('live.date.label', 'Match date'));
    [
      { id: 'yesterday', key: 'live.date.yesterday', fb: 'Yesterday' },
      { id: 'today', key: 'live.date.today', fb: 'Today' },
      { id: 'tomorrow', key: 'live.date.tomorrow', fb: 'Tomorrow' },
    ].forEach(function (d) {
      var btn = document.createElement('button');
      btn.className = 'pill live-date-pill' + (d.id === currentDate ? ' pill--active' : '');
      btn.textContent = lt(d.key, d.fb);
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', d.id === currentDate ? 'true' : 'false');
      btn.addEventListener('click', function () {
        if (currentDate === d.id) return;
        currentDate = d.id;
        currentLeague = 'all';
        showSkeleton();
        Promise.all([loadMatches(), refreshLiveScores()]).then(function () {
          renderTabs(); renderLeagueFilter(); renderDatePicker(); renderMatches();
        });
      });
      wrap.appendChild(btn);
    });
    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // === SPORT TABS ===

  function renderTabs() {
    var mount = document.getElementById('sport-tabs-mount');
    if (!mount) return;
    var countByCat = {};
    allMatches.forEach(function (m) { countByCat[m.category] = (countByCat[m.category] || 0) + 1; });
    var sportOrder = [
      'football', 'basketball', 'tennis', 'american-football',
      'baseball', 'hockey', 'motorsports', 'fight',
      'rugby', 'cricket', 'volleyball', 'badminton', 'other',
    ];
    var presentSports = sportOrder.filter(function (s) { return countByCat[s]; });
    Object.keys(countByCat).forEach(function (s) {
      if (!presentSports.includes(s)) presentSports.push(s);
    });

    var wrap = document.createElement('div');
    wrap.className = 'pills';
    wrap.setAttribute('role', 'tablist');
    wrap.setAttribute('aria-label', lt('live.tabs.label', 'Sport'));

    var favCount = allMatches.filter(matchHasFavorite).length;
    var allCount = allMatches.length;

    var tabs = [];
    if (favorites.length) tabs.push({ id: '__fav', label: '⭐ ' + lt('live.tabs.favorites', 'My Teams'), count: favCount });
    tabs.push({ id: 'all', label: lt('live.tabs.all', 'All'), count: allCount });
    presentSports.forEach(function (s) { tabs.push({ id: s, label: catIcon(s) + ' ' + catLabel(s), count: countByCat[s] || 0 }); });

    tabs.forEach(function (tab) {
      var btn = document.createElement('button');
      btn.className = 'pill live-tab' + (tab.id === currentSport ? ' pill--active' : '');
      btn.dataset.sport = tab.id;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', tab.id === currentSport ? 'true' : 'false');
      btn.innerHTML = tab.label + ' <span class="live-tab__count">' + tab.count + '</span>';
      btn.addEventListener('click', function () {
        currentSport = tab.id;
        currentLeague = 'all';
        renderTabs();
        renderLeagueFilter();
        renderMatches();
      });
      wrap.appendChild(btn);
    });

    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // === LEAGUE FILTER ===

  function renderLeagueFilter() {
    var mount = document.getElementById('live-league-mount');
    if (!mount) return;

    var sourceList = allMatches.filter(function (m) {
      if (currentSport === '__fav') return matchHasFavorite(m);
      if (currentSport !== 'all' && m.category !== currentSport) return false;
      return true;
    });
    var leagueCounts = {};
    sourceList.forEach(function (m) {
      var l = (m.league || '').trim();
      if (l) leagueCounts[l] = (leagueCounts[l] || 0) + 1;
    });
    var leagues = Object.keys(leagueCounts).sort(function (a, b) { return leagueCounts[b] - leagueCounts[a]; });

    if (leagues.length <= 1) {
      mount.innerHTML = '';
      return;
    }

    var wrap = document.createElement('div');
    wrap.className = 'pills pills--small live-league-pills';
    wrap.setAttribute('role', 'tablist');
    wrap.setAttribute('aria-label', lt('live.league.label', 'League'));

    var allBtn = document.createElement('button');
    allBtn.className = 'pill pill--small live-league-pill' + (currentLeague === 'all' ? ' pill--active' : '');
    allBtn.textContent = lt('live.league.all', 'All leagues');
    allBtn.setAttribute('role', 'tab');
    allBtn.addEventListener('click', function () { currentLeague = 'all'; renderLeagueFilter(); renderMatches(); });
    wrap.appendChild(allBtn);

    leagues.slice(0, 15).forEach(function (l) {
      var btn = document.createElement('button');
      btn.className = 'pill pill--small live-league-pill' + (currentLeague === l ? ' pill--active' : '');
      btn.textContent = l + ' (' + leagueCounts[l] + ')';
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', function () {
        currentLeague = (currentLeague === l ? 'all' : l);
        renderLeagueFilter();
        renderMatches();
      });
      wrap.appendChild(btn);
    });

    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // === SEARCH ===

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
    input.setAttribute('aria-label', lt('live.search.placeholder', 'Search matches'));
    input.value = searchQuery;

    var clear = document.createElement('button');
    clear.className = 'live-search-clear';
    clear.textContent = '✕';
    clear.hidden = !searchQuery;
    clear.setAttribute('aria-label', lt('live.search.clear', 'Clear search'));
    clear.addEventListener('click', function () {
      input.value = '';
      searchQuery = '';
      clear.hidden = true;
      renderMatches();
    });

    input.addEventListener('input', function () {
      clear.hidden = !input.value;
      if (_searchDebounce) clearTimeout(_searchDebounce);
      _searchDebounce = setTimeout(function () {
        searchQuery = input.value;
        renderMatches();
      }, 150);
    });

    wrap.appendChild(icon); wrap.appendChild(input); wrap.appendChild(clear);
    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  // === SKELETON LOADERS ===

  function showSkeleton() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;
    _cardObserver.disconnect();
    var html = '<div class="live-section"><div class="row__head"><h2 class="row__title"><span class="skeleton skeleton-text" style="width:140px;height:22px;display:inline-block"></span></h2></div><div class="match-grid">';
    for (var i = 0; i < 8; i++) {
      html += '<div class="match-card match-card--skeleton"><div class="skeleton skeleton-line" style="width:60%"></div><div class="skeleton skeleton-line" style="width:80%;height:18px"></div><div class="skeleton skeleton-line" style="width:40%"></div></div>';
    }
    html += '</div></div>';
    mount.innerHTML = html;
  }

  // === MATCHES ===

  function renderMatches() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;
    var list = filtered();
    list.sort(function (a, b) {
      var aFav = matchHasFavorite(a) ? 1 : 0;
      var bFav = matchHasFavorite(b) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return (a.date || 0) - (b.date || 0);
    });

    _cardObserver.disconnect();
    mount.innerHTML = '';

    if (!list.length) {
      var empty = document.createElement('div');
      empty.className = 'live-empty';
      if (searchQuery) {
        var icon = document.createElement('span'); icon.style.fontSize = '32px'; icon.textContent = '🔍';
        empty.appendChild(icon);
        empty.appendChild(document.createElement('br'));
        empty.appendChild(document.createTextNode(' ' + lt('live.empty.noResults', 'No matches found for') + ' “' + searchQuery + '”'));
      } else if (currentSport === '__fav') {
        var icon = document.createElement('span'); icon.style.fontSize = '32px'; icon.textContent = '⭐';
        empty.appendChild(icon);
        empty.appendChild(document.createElement('br'));
        empty.appendChild(document.createTextNode(' ' + lt('live.empty.noFavorites', 'No matches for your favorite teams today.')));
      } else {
        var icon = document.createElement('span'); icon.style.fontSize = '32px'; icon.textContent = '📺';
        empty.appendChild(icon);
        empty.appendChild(document.createElement('br'));
        empty.appendChild(document.createTextNode(' ' + lt('live.empty.noMatches', 'No matches scheduled right now.')));
      }
      mount.appendChild(empty);
      return;
    }

    // Group: favorites pinned, then live, then upcoming
    var favs = list.filter(matchHasFavorite);
    var rest = list.filter(function (m) { return !matchHasFavorite(m); });
    var live = rest.filter(function (m) { return m.isLive; });
    var upcoming = rest.filter(function (m) { return !m.isLive; });

    if (favs.length) appendSection(mount, '⭐ ' + lt('live.sections.favorites', 'My Teams'), favs, true);
    if (live.length) appendSection(mount, lt('live.sections.liveNow', 'Live Now'), live, true);
    if (upcoming.length) appendSection(mount, lt('live.sections.todaySchedule', "Today's Schedule"), upcoming, false);
  }

  function appendSection(mount, titleText, items, withDot) {
    var sec = document.createElement('div');
    sec.className = 'live-section';
    var head = document.createElement('div');
    head.className = 'row__head';
    var t = document.createElement('h2');
    t.className = 'row__title';
    if (withDot) {
      t.innerHTML = '<span class="live-section-dot"></span> ';
    }
    t.appendChild(document.createTextNode(titleText + ' '));
    var cnt = document.createElement('span');
    cnt.className = 'live-section-cnt';
    cnt.textContent = items.length;
    t.appendChild(cnt);
    head.appendChild(t);
    sec.appendChild(head);
    var grid = document.createElement('div');
    grid.className = 'match-grid';
    items.forEach(function (m) { grid.appendChild(makeCard(m)); });
    sec.appendChild(grid);
    mount.appendChild(sec);
  }

  function makeCard(m) {
    var card = document.createElement('div');
    card.className = 'match-card' + (m.isLive ? ' match-card--live' : '');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', (m.title || '') + (m.league ? ', ' + m.league : ''));

    var grad = CAT_GRAD[m.category] || CAT_GRAD['other'];
    card.classList.add('match-card--has-poster');
    card.style.backgroundColor = '#0a0a0a';
    card.dataset.sportIcon = catIcon(m.category);

    var liveData = scoreFor(m);
    if (m.poster) {
      card.style.backgroundImage =
        'linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.75) 60%,#080808 100%),url(' + m.poster + '),' + grad;
      card.style.backgroundSize = 'cover,cover,cover';
      card.style.backgroundPosition = 'center,center top,center';
    } else {
      card.style.backgroundImage = grad;
    }

    // top: sport badge + status pill + favorite star
    var top = document.createElement('div');
    top.className = 'match-card__top';
    var sportBadge = document.createElement('span');
    sportBadge.className = 'match-card__sport';
    sportBadge.textContent = catIcon(m.category) + ' ' + catLabel(m.category);
    top.appendChild(sportBadge);

    var status = statusBadgeFor(m);
    if (status) {
      var statusEl = document.createElement('span');
      statusEl.className = 'match-card__status match-card__status--' + status.key.replace(/[^a-z0-9]/gi, '');
      if (status.key === 'live.status.live') {
        statusEl.innerHTML = '<span class="live-dot"></span>' + status.label;
      } else {
        statusEl.textContent = status.label;
      }
      top.appendChild(statusEl);
    }

    // favorite star
    var teams = extractTeams(m.title);
    if (teams.length === 2) {
      var star = document.createElement('button');
      var anyFav = teams.some(isFavoriteTeam);
      star.className = 'match-card__star' + (anyFav ? ' match-card__star--active' : '');
      star.innerHTML = anyFav ? '★' : '☆';
      star.setAttribute('aria-label', anyFav ? lt('live.fav.remove', 'Remove from favorites') : lt('live.fav.add', 'Add to favorites'));
      star.title = star.getAttribute('aria-label');
      star.addEventListener('click', function (e) {
        e.stopPropagation();
        teams.forEach(toggleFavoriteTeam);
        renderTabs();
        renderMatches();
      });
      top.appendChild(star);
    }
    card.appendChild(top);

    // score row (if we have it)
    if (liveData && (liveData.home != null || liveData.away != null)) {
      var scoreRow = document.createElement('div');
      scoreRow.className = 'match-card__score';
      var homeBlock = document.createElement('div');
      homeBlock.className = 'match-card__team';
      if (liveData.badgeHome) {
        var bh = document.createElement('img');
        bh.src = liveData.badgeHome; bh.alt = ''; bh.loading = 'lazy';
        bh.className = 'match-card__badge';
        homeBlock.appendChild(bh);
      }
      var homeName = document.createElement('span');
      homeName.className = 'match-card__teamname';
      homeName.textContent = liveData.homeName || teams[0] || '';
      homeBlock.appendChild(homeName);

      var awayBlock = document.createElement('div');
      awayBlock.className = 'match-card__team';
      var awayName = document.createElement('span');
      awayName.className = 'match-card__teamname';
      awayName.textContent = liveData.awayName || teams[1] || '';
      awayBlock.appendChild(awayName);
      if (liveData.badgeAway) {
        var ba = document.createElement('img');
        ba.src = liveData.badgeAway; ba.alt = ''; ba.loading = 'lazy';
        ba.className = 'match-card__badge';
        awayBlock.appendChild(ba);
      }

      var scoreCenter = document.createElement('div');
      scoreCenter.className = 'match-card__scorenum';
      scoreCenter.textContent = (liveData.home == null ? '–' : liveData.home) + ' : ' + (liveData.away == null ? '–' : liveData.away);

      scoreRow.appendChild(homeBlock);
      scoreRow.appendChild(scoreCenter);
      scoreRow.appendChild(awayBlock);
      card.appendChild(scoreRow);
    } else {
      // title (teams)
      var title = document.createElement('div');
      title.className = 'match-card__title';
      title.textContent = m.title || '';
      card.appendChild(title);
    }

    // league
    if ((m.league || '').trim()) {
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
      timeEl.textContent = lt('live.time.liveNow', 'Live now');
    } else {
      var rel = fmtRelTime(m.date);
      var abs = fmtAbsTime(m.date);
      timeEl.textContent = abs;
      timeEl.title = rel;
      if (m.date && (m.date - Date.now()) < 30 * 60000 && (m.date - Date.now()) > 0) {
        timeEl.classList.add('match-card__time--soon');
      }
    }
    var srcCount = m.sources ? m.sources.length : (m.iframes ? m.iframes.length : 0);
    var playEl = document.createElement('span');
    playEl.className = 'match-card__play';
    if (currentDate === 'yesterday' && !srcCount) {
      playEl.textContent = lt('live.streams.finished', 'Finished');
    } else {
      playEl.innerHTML = '&#9654; ' + (srcCount > 1 ? srcCount + ' ' + lt('live.streams.streams', 'streams') : lt('live.streams.watch', 'Watch'));
    }
    bot.appendChild(timeEl);
    bot.appendChild(playEl);
    card.appendChild(bot);

    card.addEventListener('click', function () { openPlayer(m); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlayer(m); }
    });

    card.__match = m;
    _cardObserver.observe(card);
    return card;
  }

  // === REFRESH BAR ===

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
    refreshCountdown = 300;
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
    if (_refreshInFlight) return;
    _refreshInFlight = true;
    var btn = document.querySelector('.live-refresh-btn');
    if (btn) { btn.textContent = lt('live.refresh.refreshing', '↻ Refreshing…'); btn.disabled = true; }
    try {
      await Promise.all([loadMatches(), refreshLiveScores()]);
      renderTabs(); renderLeagueFilter(); renderMatches();
    } finally {
      if (btn) { btn.textContent = lt('live.refresh.button', '↻ Refresh now'); btn.disabled = false; }
      _refreshInFlight = false;
      startRefreshCountdown();
    }
  }

  // === PLAYER MODAL ===

  function ensureModal() {
    var existing = document.getElementById('live-modal');
    if (existing) return existing;

    var modal = document.createElement('div');
    modal.id = 'live-modal'; modal.className = 'live-modal'; modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var inner = document.createElement('div');
    inner.className = 'live-modal__inner';

    var hdr = document.createElement('div');
    hdr.className = 'live-modal__hdr';
    var info = document.createElement('div');
    info.className = 'live-modal__info';
    var sport = document.createElement('div');
    sport.className = 'live-modal__sport'; sport.id = 'live-modal-sport';
    var titleEl = document.createElement('div');
    titleEl.className = 'live-modal__title'; titleEl.id = 'live-modal-title';
    var leagueEl = document.createElement('div');
    leagueEl.className = 'live-modal__league'; leagueEl.id = 'live-modal-league';
    info.appendChild(sport); info.appendChild(titleEl); info.appendChild(leagueEl);

    var actions = document.createElement('div');
    actions.className = 'live-modal__actions';

    var theaterBtn = document.createElement('button');
    theaterBtn.className = 'live-modal__theater';
    theaterBtn.id = 'live-modal-theater';
    theaterBtn.innerHTML = '⛶';
    theaterBtn.title = lt('live.player.theater', 'Theater mode (F)');
    theaterBtn.setAttribute('aria-label', theaterBtn.title);
    theaterBtn.addEventListener('click', toggleTheater);

    var closeBtn = document.createElement('button');
    closeBtn.className = 'live-modal__close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.setAttribute('aria-label', lt('live.player.close', 'Close (Esc)'));
    closeBtn.addEventListener('click', closePlayer);

    actions.appendChild(theaterBtn);
    actions.appendChild(closeBtn);

    hdr.appendChild(info); hdr.appendChild(actions);

    var playerWrap = document.createElement('div');
    playerWrap.className = 'live-modal__player';
    var loading = document.createElement('div');
    loading.className = 'live-modal__player-loading'; loading.id = 'live-player-loading';
    loading.textContent = lt('live.player.loading', 'Loading stream…');
    playerWrap.id = 'live-player-wrap';
    playerWrap.appendChild(loading);

    var srcBar = document.createElement('div');
    srcBar.className = 'live-modal__srcbar';
    var srcLabel = document.createElement('span');
    srcLabel.className = 'live-modal__src-label';
    srcLabel.textContent = lt('live.player.sources', 'Sources:');
    var srcBtns = document.createElement('div');
    srcBtns.className = 'live-modal__sources'; srcBtns.id = 'live-sources';
    srcBar.appendChild(srcLabel); srcBar.appendChild(srcBtns);

    inner.appendChild(hdr);
    inner.appendChild(playerWrap);
    inner.appendChild(srcBar);
    modal.appendChild(inner);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) { if (e.target === modal) closePlayer(); });
    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closePlayer();
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleTheater(); }
      else if (e.key === 'ArrowRight') { switchSourceByOffset(1); }
      else if (e.key === 'ArrowLeft') { switchSourceByOffset(-1); }
    });

    return modal;
  }

  function toggleTheater() {
    var modal = document.getElementById('live-modal');
    if (!modal) return;
    modal.classList.toggle('live-modal--theater');
  }

  function switchSourceByOffset(offset) {
    var btns = document.querySelectorAll('#live-sources .live-src-btn');
    if (!btns.length) return;
    var idx = 0;
    btns.forEach(function (b, i) { if (b.classList.contains('live-src-btn--active')) idx = i; });
    var next = (idx + offset + btns.length) % btns.length;
    btns[next].click();
  }

  async function openPlayer(match) {
    var seq = ++_openPlayerSeq;
    var modal = ensureModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    document.getElementById('live-modal-sport').textContent = catIcon(match.category) + ' ' + catLabel(match.category);
    document.getElementById('live-modal-title').textContent = match.title || lt('live.player.fallbackTitle', 'Live Stream');
    document.getElementById('live-modal-league').textContent = match.league || '';

    var sourcesEl = document.getElementById('live-sources');
    var loading = document.getElementById('live-player-loading');

    var oldFr = document.querySelector('#live-player-wrap iframe');
    if (oldFr) oldFr.remove();
    loading.style.display = 'flex';
    loading.textContent = lt('live.player.loading', 'Loading stream…');
    sourcesEl.innerHTML = '';

    if (currentDate === 'yesterday' && match.provider === 'streamed' && !(match.sources && match.sources.length)) {
      // Finished — show highlights link
      loading.innerHTML = '';
      var msg = document.createElement('div');
      msg.textContent = lt('live.player.matchFinished', 'This match has ended.');
      var link = document.createElement('a');
      link.href = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(match.title + ' highlights');
      link.target = '_blank'; link.rel = 'noopener';
      link.className = 'btn-primary';
      link.style.cssText = 'display:inline-block;margin-top:12px;padding:8px 14px;border-radius:8px';
      link.textContent = '▶ ' + lt('live.player.watchHighlights', 'Watch highlights on YouTube');
      loading.appendChild(msg);
      loading.appendChild(link);
      return;
    }

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
      if (seq !== _openPlayerSeq) return;
      var sources = results.flat().filter(function (s) { return s.url; });
      renderSources(sourcesEl, loading, sources);
    } else if (match.provider === 'esx' && Array.isArray(match.iframes) && match.iframes.length) {
      if (seq !== _openPlayerSeq) return;
      var sources = match.iframes.map(function (f, i) {
        return { label: f.server || ('Stream ' + (i + 1)), url: f.url, hd: /fhd|hd/i.test(f.server || '') };
      });
      renderSources(sourcesEl, loading, sources);
    } else {
      if (seq !== _openPlayerSeq) return;
      loading.textContent = lt('live.player.noStreams', 'No streams found for this match.');
    }
  }

  function spawnIframe(url) {
    if (!isAllowedIframeUrl(url)) {
      var loadingEl0 = document.getElementById('live-player-loading');
      if (loadingEl0) { loadingEl0.style.display = 'flex'; loadingEl0.textContent = lt('live.player.blocked', 'Stream URL blocked for safety.'); }
      return null;
    }
    var wrap = document.getElementById('live-player-wrap');
    var old = wrap && wrap.querySelector('iframe');
    if (old) old.remove();

    var loadingEl = document.getElementById('live-player-loading');
    if (loadingEl) {
      loadingEl.textContent = lt('live.player.loading', 'Loading stream…');
      loadingEl.style.display = 'flex';
    }

    var fr = document.createElement('iframe');
    fr.allowFullscreen = true;
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.addEventListener('load', function () {
      if (loadingEl) loadingEl.style.display = 'none';
    });
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
    var sorted = sortSourcesByVotes(sources);
    loading.style.display = 'none';
    spawnIframe(sorted[0].url);

    sorted.forEach(function (src, i) {
      var box = document.createElement('div');
      box.className = 'live-src-box';

      var btn = document.createElement('button');
      btn.className = 'live-src-btn' + (i === 0 ? ' live-src-btn--active' : '') + (src.hd ? ' live-src-btn--hd' : '');
      var score = voteScore(src.url);
      var scoreLabel = score !== 0 ? ' (' + (score > 0 ? '+' + score : score) + ')' : '';
      btn.textContent = src.label + scoreLabel;
      btn.addEventListener('click', function () {
        wrap.querySelectorAll('.live-src-btn').forEach(function (b) { b.classList.remove('live-src-btn--active'); });
        btn.classList.add('live-src-btn--active');
        spawnIframe(src.url);
      });

      var voteUp = document.createElement('button');
      voteUp.className = 'live-src-vote live-src-vote--up';
      voteUp.textContent = '👍';
      voteUp.title = lt('live.vote.up', 'This stream works');
      voteUp.setAttribute('aria-label', voteUp.title);
      voteUp.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'up'); updateBtnLabel(); });

      var voteDown = document.createElement('button');
      voteDown.className = 'live-src-vote live-src-vote--down';
      voteDown.textContent = '👎';
      voteDown.title = lt('live.vote.down', 'This stream is broken');
      voteDown.setAttribute('aria-label', voteDown.title);
      voteDown.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'down'); updateBtnLabel(); });

      function updateBtnLabel() {
        var sc = voteScore(src.url);
        var lbl = sc !== 0 ? ' (' + (sc > 0 ? '+' + sc : sc) + ')' : '';
        btn.textContent = src.label + lbl;
      }

      box.appendChild(btn);
      box.appendChild(voteUp);
      box.appendChild(voteDown);
      wrap.appendChild(box);
    });
  }

  function closePlayer() {
    var modal = document.getElementById('live-modal');
    if (modal) {
      modal.hidden = true;
      modal.classList.remove('live-modal--theater');
    }
    var fr = document.querySelector('#live-player-wrap iframe');
    if (fr) fr.remove();
    document.body.style.overflow = '';
  }

  // === INIT ===

  async function init() {
    if (window.renderTopNav) renderTopNav('live');
    if (window.renderBottomNav) renderBottomNav('live');
    if (window.renderFooter) renderFooter('footer-mount');

    renderDatePicker();
    renderSearch();
    renderRefreshBar();
    showSkeleton();

    await Promise.all([loadMatches(), refreshLiveScores()]);
    renderTabs();
    renderLeagueFilter();
    renderMatches();
    startRefreshCountdown();

    // re-render dynamic text when user switches language
    window.addEventListener('eli6.langChanged', function () {
      renderDatePicker(); renderSearch(); renderRefreshBar();
      renderTabs(); renderLeagueFilter(); renderMatches();
    });

    // PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* swallow */ });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

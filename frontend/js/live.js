(function () {
  'use strict';

  // === CONSTANTS ===
  var STREAMED = 'https://streamed.pk/api';
  var STREAMED_ORIGIN = 'https://streamed.pk';
  var ESX = 'https://api.embedsportex.site/api';
  var ESX_ORIGIN = 'https://api.embedsportex.site';
  var TSDB = 'https://www.thesportsdb.com/api/v1/json/123';
  var DADDY = 'https://daddylive.eu';

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
    /(^|\.)embedsports\.top$/i,
    /(^|\.)embedsportex\.site$/i,
    /(^|\.)embedme\.top$/i,
    /(^|\.)embed\.su$/i,
    /(^|\.)vidsrc\.[a-z]{2,}$/i,
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
    /(^|\.)daddylive\.(eu|nl)$/i,
    /(^|\.)daddylives\.sbs$/i,
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
    // Replace the lower-tier composite/icon with a real fanart photo
    card.classList.remove('match-card--vs-composite', 'match-card--empty-bg');
    var grad = CAT_GRAD[cat] || CAT_GRAD['other'];
    // Only a soft fade near the bottom so the title stays readable; let the
    // image show through cleanly everywhere else.
    card.style.backgroundImage =
      'linear-gradient(180deg,transparent 0%,transparent 55%,rgba(0,0,0,.35) 100%),url(' + imgUrl + '),' + grad;
    card.style.backgroundSize = 'cover,cover,cover';
    card.style.backgroundPosition = 'center,center top,center';
    card.style.backgroundRepeat = '';
  }

  // Apply the streamed.pk two-badge composite as the card background.
  function applyBadgeComposite(card, m) {
    if (!card.isConnected) return;
    var grad = CAT_GRAD[m.category] || CAT_GRAD['other'];
    card.style.backgroundImage =
      'linear-gradient(180deg,transparent 0%,transparent 60%,rgba(0,0,0,.3) 100%),' +
      'url(' + m.homeBadgeUrl + '),' +
      'url(' + m.awayBadgeUrl + '),' + grad;
    card.style.backgroundSize = 'cover,90px,90px,cover';
    card.style.backgroundPosition = 'center,18% 38%,82% 38%,center';
    card.style.backgroundRepeat = 'no-repeat,no-repeat,no-repeat,no-repeat';
    card.classList.remove('match-card--pending-bg');
  }

  // Throttle badge loads — streamed.pk DDoS-guards parallel image bursts and
  // ~half of requests fail with ERR_HTTP2_PROTOCOL_ERROR if we fire >5 at once.
  // Probe each badge via new Image() so we can detect failure and fall back to
  // the sport-icon overlay instead of leaving the card mid-state.
  var _badgeQueue = [];
  var _badgeInFlight = 0;
  var BADGE_MAX_CONCURRENT = 3;
  var _badgeProbed = Object.create(null);

  function probeImage(url) {
    if (!url) return Promise.resolve(false);
    if (_badgeProbed[url] !== undefined) return Promise.resolve(_badgeProbed[url]);
    return new Promise(function (resolve) {
      var img = new Image();
      var done = false;
      var to = setTimeout(function () { if (!done) { done = true; _badgeProbed[url] = false; resolve(false); } }, 7000);
      img.onload = function () { if (!done) { done = true; clearTimeout(to); _badgeProbed[url] = true; resolve(true); } };
      img.onerror = function () { if (!done) { done = true; clearTimeout(to); _badgeProbed[url] = false; resolve(false); } };
      img.src = url;
    });
  }
  function _drainBadgeQueue() {
    while (_badgeInFlight < BADGE_MAX_CONCURRENT && _badgeQueue.length) {
      var task = _badgeQueue.shift();
      _badgeInFlight++;
      (function (t) {
        Promise.all([probeImage(t.m.homeBadgeUrl), probeImage(t.m.awayBadgeUrl)])
          .then(function (results) {
            if (!t.card.isConnected) return;
            if (results[0] && results[1]) {
              applyBadgeComposite(t.card, t.m);
            } else {
              // Both badges failed → degrade to the sport-icon overlay
              t.card.classList.remove('match-card--vs-composite', 'match-card--pending-bg');
              t.card.classList.add('match-card--empty-bg');
            }
          })
          .then(function () { _badgeInFlight--; _drainBadgeQueue(); }, function () { _badgeInFlight--; _drainBadgeQueue(); });
      })(task);
    }
  }
  function queueBadgeComposite(card, m) {
    _badgeQueue.push({ card: card, m: m });
    _drainBadgeQueue();
  }

  // IntersectionObserver — only triggers when card is near viewport. Two phases:
  //   1. If the match has streamed.pk team badges, apply the badge composite first
  //      (lazy so DDoS-guard doesn't 503 a hundred parallel requests).
  //   2. If the title is "X vs Y" and the sport supports team fanart, fetch TSDB
  //      strFanart for the home team and upgrade to that. Falls back to away team.
  var _cardObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      _cardObserver.unobserve(entry.target);
      var card = entry.target;
      var m = card.__match;
      if (!m || m.poster) return;
      // Phase 1: badge composite (queued + probed so failures don't leave the
      // card in a half-broken state and bursts don't trip streamed.pk's DDoS-guard)
      if (m.homeBadgeUrl && m.awayBadgeUrl && card.classList.contains('match-card--pending-bg')) {
        queueBadgeComposite(card, m);
      }
      // Phase 2: TSDB fanart upgrade (only for team sports with "X vs Y" titles)
      if (!TEAM_SPORTS[m.category]) return;
      var vs = (m.title || '').match(/^(.+?)\s+vs\.?\s+(.+)$/i);
      if (!vs) return;
      fetchTeamBanner(vs[1].trim()).then(function (url) {
        if (url) return applyCardImage(card, url, m.category);
        return fetchTeamBanner(vs[2].trim()).then(function (u2) { applyCardImage(card, u2, m.category); });
      });
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

  // === LANGUAGE DETECTION (for stream source labels) ===
  // Heuristic: parse channel/server names → {flag, code, name}.
  // 'code' is ISO-639-1 (or 'multi' for European feeds). Used to group sources in the player modal.
  var LANG_HINTS = [
    { rx: /\b(tnt|abc|nbc|fox(?!ports)|espn|peacock|cbs|usa network|nfl network|nba tv)\b/i, code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
    { rx: /\b(tsn|sportsnet|cbc)\b/i, code: 'en-ca', flag: '🇨🇦', name: 'English (CA)' },
    { rx: /\b(sky ?sports?|sky ?go|bbc|bt ?sport|itv|tnt sports?(?: uk)?)\b/i, code: 'en-gb', flag: '🇬🇧', name: 'English (UK)' },
    { rx: /\b(fox ?sports? (?:au|australia)|kayo|stan ?sport|main ?event)\b/i, code: 'en-au', flag: '🇦🇺', name: 'English (AU)' },
    { rx: /\b(bein(?: ?sports?)?(?: arabic)?|ssc|al ?jazeera|al ?kass|arab|abu ?dhabi)\b/i, code: 'ar', flag: '🇸🇦', name: 'Arabic' },
    { rx: /\b(movistar|la ?liga|dazn ?(?:es|spain)?|cosmote|gol ?espana)\b/i, code: 'es', flag: '🇪🇸', name: 'Spanish' },
    { rx: /\b(globo|sport ?tv brasil|esporte ?interativo|premiere|combate|cazetv|sportv)\b/i, code: 'pt-br', flag: '🇧🇷', name: 'Portuguese (BR)' },
    { rx: /\b(rai|sky ?italia|dazn ?it(?:alia)?|mediaset)\b/i, code: 'it', flag: '🇮🇹', name: 'Italian' },
    { rx: /\b(canal\+|rmc|bein ?sports? ?fr|eurosport ?(?:france|fr)|tf1|france ?\d|l ?equipe)\b/i, code: 'fr', flag: '🇫🇷', name: 'French' },
    { rx: /\b(sport ?(?:1|2|3)? ?(?:de|deutschland|german)|sky ?(?:de|deutsch))\b/i, code: 'de', flag: '🇩🇪', name: 'German' },
    { rx: /\b(sport ?tv|eleven ?sports?(?: pt|portugal)?)\b/i, code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
    { rx: /\b(match ?tv|nashe ?futbol|tv ?match)\b/i, code: 'ru', flag: '🇷🇺', name: 'Russian' },
    { rx: /\b(tv4|viaplay ?(?:se|sweden)?|c ?more)\b/i, code: 'sv', flag: '🇸🇪', name: 'Swedish' },
    { rx: /\b(nos|ziggo|fox sports nl|ne[d|t]er)\b/i, code: 'nl', flag: '🇳🇱', name: 'Dutch' },
    { rx: /\b(j ?sport|wowow|nhk|fuji ?tv|gaora|sky ?perfectv)\b/i, code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { rx: /\b(cctv|sport ?5|migu|pp ?sport)\b/i, code: 'zh', flag: '🇨🇳', name: 'Chinese' },
    { rx: /\b(spor ?smart|s ?sport|tivibu|bein ?turk|trt ?spor)\b/i, code: 'tr', flag: '🇹🇷', name: 'Turkish' },
    { rx: /\b(polsat ?sport|tvp ?sport)\b/i, code: 'pl', flag: '🇵🇱', name: 'Polish' },
    { rx: /\bnova ?sport(?: cz)?\b/i, code: 'cs', flag: '🇨🇿', name: 'Czech' },
    { rx: /\b(setanta ?(?:ireland|ire)|virgin ?media)\b/i, code: 'en-ie', flag: '🇮🇪', name: 'English (IE)' },
    { rx: /\beuro(?: ?sports?)?\b/i, code: 'multi', flag: '🇪🇺', name: 'Multi-EU' },
  ];
  // detect language from a label string (server name / channel name / streamed.pk language field)
  function detectLang(label) {
    if (!label) return null;
    // streamed.pk often returns explicit "English", "English - Fox Sports 507" etc.
    var plain = label.split(/[-–|()]/)[0].trim().toLowerCase();
    var exact = { english: 'en', spanish: 'es', italian: 'it', french: 'fr', german: 'de',
      portuguese: 'pt', arabic: 'ar', russian: 'ru', dutch: 'nl', polish: 'pl',
      japanese: 'ja', chinese: 'zh', turkish: 'tr', swedish: 'sv' };
    if (exact[plain]) {
      var hint = LANG_HINTS.find(function (h) { return h.code === exact[plain] || h.code.indexOf(exact[plain] + '-') === 0; });
      return hint || { code: exact[plain], flag: '🌐', name: plain.charAt(0).toUpperCase() + plain.slice(1) };
    }
    for (var i = 0; i < LANG_HINTS.length; i++) {
      if (LANG_HINTS[i].rx.test(label)) return LANG_HINTS[i];
    }
    return null;
  }

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
  var reminders = {};  // matchKey → timeoutId
  var _scoreTickInterval = null;

  // === PERSISTENCE ===
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var favorites = loadJSON('eli6.live.favorites', []);       // array of team names (lowercase)
  var sourceVotes = loadJSON('eli6.live.sourceVotes', {});   // url → { up:n, down:n }
  var savedReminders = loadJSON('eli6.live.reminders', {});  // matchKey → { ts, title }
  var preferredLang = (function () { try { return localStorage.getItem('eli6.live.preferredLang') || ''; } catch (e) { return ''; } })();

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
      var liveIds = liveRes.ok ? new Set(live.map(function (m) { return m.id; })) : null;

      var CAT_NORMALIZE = { 'motor-sports': 'motorsports' };

      var mapped = (Array.isArray(all) ? all : []).map(function (m) {
        var cat = m.category || 'other';
        // streamed.pk returns posters as relative paths like "/api/images/proxy/xxx.webp"
        // — prefix the origin so they don't 404 against our own host.
        var poster = m.poster;
        if (poster && typeof poster === 'string' && poster.charAt(0) === '/') {
          poster = STREAMED_ORIGIN + poster;
        }
        // Extract team badges to use as a "VS composite" fallback when no full
        // match poster is available. These IDs resolve to /api/images/badge/<id>.webp.
        var teams = m.teams || {};
        var hb = teams.home && teams.home.badge;
        var ab = teams.away && teams.away.badge;
        var homeBadgeUrl = hb ? STREAMED_ORIGIN + '/api/images/badge/' + hb + '.webp' : null;
        var awayBadgeUrl = ab ? STREAMED_ORIGIN + '/api/images/badge/' + ab + '.webp' : null;
        return Object.assign({}, m, {
          poster: poster,
          homeBadgeUrl: homeBadgeUrl,
          awayBadgeUrl: awayBadgeUrl,
          isLive: liveIds ? liveIds.has(m.id) : (m.isLive || false),
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
      if (!(r.headers.get('content-type') || '').includes('json')) return [];
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

  // strip common club/team noise so streamed.pk titles align with TSDB events
  function normalizeTeamName(s) {
    return (s || '')
      .toLowerCase()
      .replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b|\bac\b|\bbk\b|\bii\b/g, '')
      .replace(/\bunited\b/g, 'utd')
      .replace(/\bcity\b/g, '')
      .replace(/\bu\d{1,2}\b/g, '')
      .replace(/\b(women|women's|w|fem)\b/g, '')
      .replace(/\b(reserves|youth|academy)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normalizeTitle(title) {
    var s = (title || '').toLowerCase()
      .replace(/\./g, '')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var m = s.match(/^(.+?)\s+vs?\s+(.+)$/);
    if (m) {
      var teams = [normalizeTeamName(m[1]), normalizeTeamName(m[2])].sort();
      return teams.join('|');
    }
    return s;
  }

  // DaddyLive: thousands of country-named TV channels (Sky Sport DE, beIN Arabic, Movistar LaLiga, …)
  // Their /api/events groups today's matches with a `channels[]` array per event — we surface those
  // channels as additional language-tagged sources rather than as separate cards (would be very
  // noisy). New cards are only added when no existing match title matches.
  var DADDY_SPORT_MAP = {
    'soccer': 'football', 'football': 'football', 'futsal': 'football',
    'basketball': 'basketball', 'nba': 'basketball',
    'tennis': 'tennis', 'atp': 'tennis', 'wta': 'tennis', 'roland': 'tennis',
    'french open': 'tennis', 'wimbledon': 'tennis', 'us open': 'tennis',
    'australian open': 'tennis',
    'baseball': 'baseball', 'mlb': 'baseball',
    'ice hockey': 'hockey', 'nhl': 'hockey', 'hockey': 'hockey',
    'am. football': 'american-football', 'american football': 'american-football',
    'nfl': 'american-football',
    'motorsport': 'motorsports', 'motor sports': 'motorsports',
    'motorsports': 'motorsports',
    'f1': 'motorsports', 'formula 1': 'motorsports', 'motogp': 'motorsports',
    'rugby': 'rugby', 'cricket': 'cricket', 'volleyball': 'volleyball',
    'boxing': 'fight', 'mma': 'fight', 'ufc': 'fight', 'fight': 'fight',
    'wrestling': 'fight',
    'golf': 'golf', 'darts': 'darts', 'badminton': 'badminton',
    'aussie rules': 'afl', 'afl': 'afl',
  };
  function _daddyCatFromString(str) {
    var s = (str || '').toLowerCase();
    // Tennis: try specific match first because "atp/wta" appear inside the
    // long French Open category strings DaddyLive uses.
    if (/\b(atp|wta|tennis|roland|french open|wimbledon|us open|australian open)\b/.test(s)) return 'tennis';
    var keys = Object.keys(DADDY_SPORT_MAP);
    for (var i = 0; i < keys.length; i++) if (s.indexOf(keys[i]) !== -1) return DADDY_SPORT_MAP[keys[i]];
    return 'other';
  }

  // Parse the daddy `day` string ("Thursday 4th June 2026") + `time` ("13:00")
  // into a UTC epoch. Times in their API are stamped "UK GMT" but during June
  // that's actually BST (UTC+1). We treat the time as UTC since DST is messy
  // and a 1h offset matters less than getting the day right.
  var DADDY_MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  function parseDaddyTime(dayStr, timeStr) {
    if (!dayStr) return 0;
    var dm = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/.exec(dayStr || '');
    if (!dm) return 0;
    var day = parseInt(dm[1], 10);
    var mon = DADDY_MONTHS[dm[2].slice(0,3).toLowerCase()];
    var yr = parseInt(dm[3], 10);
    if (mon == null) return 0;
    var h = 0, mi = 0;
    var tm = /(\d{1,2}):(\d{2})/.exec(timeStr || '');
    if (tm) { h = parseInt(tm[1], 10); mi = parseInt(tm[2], 10); }
    // UK in June = BST = UTC+1. Compensate so "13:00 UK" -> 12:00 UTC.
    return Date.UTC(yr, mon, day, h - 1, mi);
  }
  async function fetchDaddy() {
    try {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 8000);
      var r = await fetch(DADDY + '/api/events', { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) return [];
      var data = await r.json();
      if (!Array.isArray(data)) return [];
      var out = [];
      var now = Date.now();
      var STALE_AFTER_MS = 3 * 3600000;   // a match 3h+ past kickoff is treated as finished
      var FUTURE_LIMIT_MS = 36 * 3600000; // ignore events more than 36h in the future (next-next-day noise)
      data.forEach(function (day) {
        var cats = day.categories || {};
        Object.keys(cats).forEach(function (catName) {
          var arr = cats[catName];
          if (!Array.isArray(arr)) return;
          // Try the category name first, fall back to scanning event titles.
          var defaultCat = _daddyCatFromString(catName);
          arr.forEach(function (ev) {
            var title = ev.event || '';
            if (!title) return;
            // event strings often look like "Football : Real Madrid vs Barcelona" → strip prefix
            var clean = title.replace(/^[^:]+:\s*/, '').trim();
            // Use category name first, but if that came back "other" probe the
            // title too (so "Roland-Garros 360 Day 12 | Semi-Final" → tennis).
            var cat = defaultCat;
            if (cat === 'other') cat = _daddyCatFromString(clean);
            var channels = Array.isArray(ev.channels) ? ev.channels.filter(function (c) {
              return c && c.url && /^https:\/\/(daddylive\.(eu|nl)|daddylives\.sbs|dlhd\.(pk|link))/.test(c.url);
            }) : [];
            if (!channels.length) return;
            var timeStr = (ev.time || '').trim();
            // "Live" string in the time field — treat as currently live, no date
            var explicitLive = /^live\b/i.test(timeStr);
            var kickoff = explicitLive ? now : parseDaddyTime(day.day, timeStr);
            if (!kickoff) return;
            // Drop stale (past) and too-far-future events
            if (kickoff < now - STALE_AFTER_MS) return;
            if (kickoff > now + FUTURE_LIMIT_MS) return;
            var isLive = explicitLive || (kickoff <= now && kickoff > now - STALE_AFTER_MS);
            out.push({
              id: 'daddy-' + (ev.event || Math.random()).slice(0, 80),
              title: clean,
              category: cat,
              league: '',
              poster: null,
              date: kickoff,
              isLive: isLive,
              provider: 'daddy',
              channels: channels,
            });
          });
        });
      });
      return out;
    } catch (e) { return []; }
  }

  async function loadMatches() {
    var [streamedData, esxData, daddyData] = await Promise.all([
      fetchStreamed(currentDate),
      fetchESX(),
      currentDate === 'today' ? fetchDaddy() : Promise.resolve([]),
    ]);
    var seenNorm = new Set(streamedData.map(function (m) { return normalizeTitle(m.title); }));
    var esxNew = esxData.filter(function (m) {
      var norm = normalizeTitle(m.title);
      if (seenNorm.has(norm)) return false;
      seenNorm.add(norm);
      return true;
    });
    // For DaddyLive, attach channels to existing matches when titles match.
    // Otherwise treat as a new live card (only if at least one channel left after dedupe).
    var daddyNew = [];
    daddyData.forEach(function (d) {
      var norm = normalizeTitle(d.title);
      var existing = streamedData.find(function (m) { return normalizeTitle(m.title) === norm; }) ||
                     esxNew.find(function (m) { return normalizeTitle(m.title) === norm; });
      if (existing) {
        // Augment with daddy channels so the source picker shows language-tagged options.
        existing._daddyChannels = (existing._daddyChannels || []).concat(d.channels);
      } else if (!seenNorm.has(norm)) {
        daddyNew.push(d);
        seenNorm.add(norm);
      }
    });
    allMatches = streamedData.concat(esxNew).concat(daddyNew);
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
      // Stable sort: HD first, then by viewer count, then by streamNo so ordering
      // doesn't flap between refreshes (was jumping the active source mid-watch).
      streams.sort(function (a, b) {
        var hd = (b.hd ? 1 : 0) - (a.hd ? 1 : 0);
        if (hd) return hd;
        var v = (b.viewers || 0) - (a.viewers || 0);
        if (v) return v;
        return (a.streamNo || 0) - (b.streamNo || 0);
      });
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
    if (favorites.length) tabs.push({ id: '__fav', label: (window.ICONS ? window.ICONS.star + ' ' : '') + lt('live.tabs.favorites', 'My Teams'), count: favCount });
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
        // Searching should look across all sports — narrow sport tab + search is confusing.
        if (searchQuery && currentSport !== 'all' && currentSport !== '__fav') {
          currentSport = 'all';
          currentLeague = 'all';
          renderTabs();
          renderLeagueFilter();
        }
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
        var icon = document.createElement('span'); icon.style.cssText = 'display:block;margin-bottom:8px'; icon.innerHTML = window.ICONS ? window.ICONS.search : '';
        empty.appendChild(icon);
        empty.appendChild(document.createElement('br'));
        empty.appendChild(document.createTextNode(' ' + lt('live.empty.noResults', 'No matches found for') + ' “' + searchQuery + '”'));
      } else if (currentSport === '__fav') {
        var icon = document.createElement('span'); icon.style.cssText = 'display:block;margin-bottom:8px'; icon.innerHTML = window.ICONS ? window.ICONS.star : '';
        empty.appendChild(icon);
        empty.appendChild(document.createElement('br'));
        empty.appendChild(document.createTextNode(' ' + lt('live.empty.noFavorites', 'No matches for your favorite teams today.')));
      } else {
        var icon = document.createElement('span'); icon.style.cssText = 'display:block;margin-bottom:8px'; icon.innerHTML = window.ICONS ? window.ICONS.tv : '';
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

    if (favs.length) appendSection(mount, (window.ICONS ? window.ICONS.star + ' ' : '') + lt('live.sections.favorites', 'My Teams'), favs, true);
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
      // Tier 1: real match-promo image from streamed.pk or ESX (loaded upfront).
      // Soft fade only at the bottom so the title stays readable on bright
      // posters — no heavy darkening over the artwork.
      card.style.backgroundImage =
        'linear-gradient(180deg,transparent 0%,transparent 55%,rgba(0,0,0,.35) 100%),url(' + m.poster + '),' + grad;
      card.style.backgroundSize = 'cover,cover,cover';
      card.style.backgroundPosition = 'center,center top,center';
    } else if (m.homeBadgeUrl && m.awayBadgeUrl) {
      // Tier 2: two team badges → composite (applied lazily on intersect so
      // streamed.pk's DDoS-guard doesn't 503 a hundred parallel badge requests).
      card.classList.add('match-card--vs-composite', 'match-card--pending-bg');
      card.style.backgroundImage = grad;
    } else {
      // Tier 3: gradient + big faded sport icon centered. Looks intentional
      // rather than empty for events like F1, UFC, golf, single-player tennis.
      card.classList.add('match-card--empty-bg');
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
      star.innerHTML = anyFav ? (window.ICONS ? window.ICONS.star : '★') : (window.ICONS ? window.ICONS.starOutline : '☆');
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
      scoreRow.dataset.scoreKey = normalizeTitle(m.title);
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
      scoreCenter.dataset.scoreKey = normalizeTitle(m.title);
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
    bot.appendChild(timeEl);

    // action buttons for upcoming matches
    var isUpcoming = !m.isLive && m.date && (m.date - Date.now()) > 0 && currentDate !== 'yesterday';
    if (isUpcoming) {
      var actGroup = document.createElement('span');
      actGroup.className = 'match-card__actions';

      // bell reminder button
      var matchKey = m.id || normalizeTitle(m.title);
      var hasReminder = !!(reminders[matchKey] || savedReminders[matchKey]);
      var bellBtn = document.createElement('button');
      bellBtn.className = 'match-card__act-btn match-card__bell' + (hasReminder ? ' match-card__bell--active' : '');
      bellBtn.innerHTML = hasReminder ? BELL_ACTIVE_SVG : BELL_SVG;
      bellBtn._matchKey = matchKey;
      bellBtn.setAttribute('aria-label', hasReminder ? lt('live.remind.cancel', 'Cancel reminder') : lt('live.remind.set', 'Remind me'));
      bellBtn.title = bellBtn.getAttribute('aria-label');
      bellBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleReminder(m, bellBtn); });
      actGroup.appendChild(bellBtn);

      // add-to-calendar button
      var calBtn = document.createElement('button');
      calBtn.className = 'match-card__act-btn';
      calBtn.innerHTML = CAL_SVG;
      calBtn.setAttribute('aria-label', lt('live.cal.add', 'Add to calendar'));
      calBtn.title = calBtn.getAttribute('aria-label');
      calBtn.addEventListener('click', function (e) { e.stopPropagation(); addToCalendar(m); });
      actGroup.appendChild(calBtn);

      bot.appendChild(actGroup);
    }

    // share button (all matches)
    var shareBtn = document.createElement('button');
    shareBtn.className = 'match-card__act-btn match-card__share';
    shareBtn.innerHTML = SHARE_SVG;
    shareBtn.setAttribute('aria-label', lt('live.share.share', 'Share'));
    shareBtn.title = shareBtn.getAttribute('aria-label');
    shareBtn.addEventListener('click', function (e) { e.stopPropagation(); shareMatch(m); });

    var srcCount = m.sources ? m.sources.length : (m.iframes ? m.iframes.length : 0);
    var hasHD = (m.sources || []).some(function (s) { return s.hd; }) || (m.iframes || []).some(function (s) { return s.hd; });

    var playEl = document.createElement('span');
    playEl.className = 'match-card__play';
    if (currentDate === 'yesterday' && !srcCount) {
      playEl.textContent = lt('live.streams.finished', 'Finished');
    } else {
      var streamTxt = srcCount > 1 ? srcCount + ' ' + lt('live.streams.streams', 'streams') : lt('live.streams.watch', 'Watch');
      playEl.innerHTML = (hasHD ? '<span class="match-card__hd">HD</span> ' : '') + '&#9654; ' + streamTxt;
    }

    var rightGroup = document.createElement('span');
    rightGroup.className = 'match-card__right';
    rightGroup.appendChild(shareBtn);
    rightGroup.appendChild(playEl);
    bot.appendChild(rightGroup);
    card.appendChild(bot);

    card.addEventListener('click', function () { openPlayer(m); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlayer(m); }
    });

    card.__match = m;
    _cardObserver.observe(card);
    return card;
  }

  // === CARD ACTION ICONS ===

  var BELL_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  var BELL_ACTIVE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
  var SHARE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
  var CAL_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  // === REMINDER ===

  function _fireReminderNotif(title) {
    var body = lt('live.remind.starting', 'Starting soon on eli6 Sports');
    var icon = '/img/favicon.svg';
    // Prefer service worker notification (survives tab close), fall back to plain Notification.
    if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then(function (reg) {
        try { reg.showNotification(title, { body: body, icon: icon, tag: 'live-reminder' }); }
        catch (e) { try { new Notification(title, { body: body, icon: icon }); } catch (_) {} }
      });
    } else {
      try { new Notification(title, { body: body, icon: icon }); } catch (e) {}
    }
  }

  function _scheduleReminderTimer(key, kickoffTs, title) {
    var delay = kickoffTs - Date.now() - 5 * 60000; // 5 min before kickoff
    if (delay < 0) delay = 0;
    if (reminders[key]) clearTimeout(reminders[key]);
    reminders[key] = setTimeout(function () {
      delete reminders[key];
      delete savedReminders[key];
      saveJSON('eli6.live.reminders', savedReminders);
      _fireReminderNotif(title || lt('live.remind.match', 'Match'));
      // Refresh UI if the card is still on screen
      try { renderMatches(); } catch (e) {}
    }, delay);
  }

  function restoreReminders() {
    var now = Date.now();
    Object.keys(savedReminders).forEach(function (key) {
      var r = savedReminders[key];
      if (!r || !r.ts) { delete savedReminders[key]; return; }
      // Drop reminders whose kickoff was more than 30 min ago
      if (r.ts < now - 30 * 60000) { delete savedReminders[key]; return; }
      _scheduleReminderTimer(key, r.ts, r.title);
    });
    saveJSON('eli6.live.reminders', savedReminders);
  }

  function toggleReminder(m, btn) {
    var key = m.id || normalizeTitle(m.title);
    var hasReminder = !!(reminders[key] || savedReminders[key]);
    if (hasReminder) {
      if (reminders[key]) clearTimeout(reminders[key]);
      delete reminders[key];
      delete savedReminders[key];
      saveJSON('eli6.live.reminders', savedReminders);
      btn.classList.remove('match-card__bell--active');
      btn.innerHTML = BELL_SVG;
      btn.setAttribute('aria-label', lt('live.remind.set', 'Remind me'));
      btn.title = btn.getAttribute('aria-label');
      if (window.showToast) window.showToast(lt('live.remind.cancelled', 'Reminder cancelled'));
      return;
    }
    var notifSupported = ('Notification' in window);
    function _commit() {
      savedReminders[key] = { ts: m.date, title: m.title || '' };
      saveJSON('eli6.live.reminders', savedReminders);
      _scheduleReminderTimer(key, m.date, m.title);
      btn._matchKey = key;
      btn.classList.add('match-card__bell--active');
      btn.innerHTML = BELL_ACTIVE_SVG;
      btn.setAttribute('aria-label', lt('live.remind.cancel', 'Cancel reminder'));
      btn.title = btn.getAttribute('aria-label');
      if (window.showToast) window.showToast(lt('live.remind.set', 'Reminder set!'));
    }
    if (notifSupported && Notification.permission === 'granted') {
      _commit();
    } else if (notifSupported && Notification.permission !== 'denied') {
      Notification.requestPermission().then(function (perm) {
        if (perm === 'granted') _commit();
        else if (window.showToast) window.showToast(lt('live.remind.denied', 'Enable notifications to use reminders'));
      });
    } else {
      if (window.showToast) window.showToast(lt('live.remind.denied', 'Enable notifications to use reminders'));
    }
  }

  // === ADD TO CALENDAR ===

  function addToCalendar(m) {
    var start = new Date(m.date);
    var end = new Date(m.date + 2 * 3600000);
    var fmt = function (d) { return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'; };
    var uid = (m.id || normalizeTitle(m.title) || String(Date.now())) + '@eli6.sports';
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//eli6//Sports//EN',
      'BEGIN:VEVENT',
      'UID:' + uid,
      'DTSTAMP:' + fmt(new Date()),
      'DTSTART:' + fmt(start),
      'DTEND:' + fmt(end),
      'SUMMARY:' + (m.title || '').replace(/[,;\\]/g, '\\$&'),
      'DESCRIPTION:Watch on eli6 Sports',
      (m.league ? 'LOCATION:' + m.league : ''),
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (m.title || 'match').replace(/[^a-z0-9]/gi, '_').slice(0, 60) + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }

  // === SHARE MATCH ===

  function shareMatch(m) {
    var text = (m.title || '') + (m.date ? '  ·  ' + fmtAbsTime(m.date) : '') + (m.league ? '  ·  ' + m.league : '');
    var url = window.location.href.split('?')[0];
    if (navigator.share) {
      navigator.share({ title: m.title || '', text: text, url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text + '\n' + url).then(function () {
        if (window.showToast) window.showToast(lt('live.share.copied', 'Copied to clipboard'));
      }).catch(function () {
        if (window.showToast) window.showToast(lt('live.share.copied', 'Copied to clipboard'));
      });
    }
  }

  // === SCORE TICKER (patches score numbers in-place every 60s) ===

  function patchCardScores() {
    document.querySelectorAll('.match-card__scorenum[data-score-key]').forEach(function (el) {
      var key = el.dataset.scoreKey;
      var s = liveScores[key];
      if (!s || s.home == null) return;
      var txt = String(s.home) + ' : ' + String(s.away);
      if (el.textContent !== txt) el.textContent = txt;
    });
  }

  function startScoreTicker() {
    if (_scoreTickInterval) return;
    _scoreTickInterval = setInterval(async function () {
      try {
        liveScores = await fetchLiveScoresForDate(currentDate);
        patchCardScores();
      } catch (e) {}
    }, 60000);
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
    function _modalKeydown(e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') closePlayer();
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleTheater(); }
      else if (e.key === 'ArrowRight') { switchSourceByOffset(1); }
      else if (e.key === 'ArrowLeft') { switchSourceByOffset(-1); }
    }
    document.addEventListener('keydown', _modalKeydown);
    modal._keydownHandler = _modalKeydown;

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
    if (!loading || !sourcesEl) return;

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
      link.innerHTML = (window.ICONS ? window.ICONS.play + ' ' : '') + lt('live.player.watchHighlights', 'Watch highlights on YouTube');
      loading.appendChild(msg);
      loading.appendChild(link);
      return;
    }

    // Helper: build extra source rows from augmented DaddyLive channels (if any)
    function _extraDaddySources(m) {
      var ch = m && m._daddyChannels;
      if (!Array.isArray(ch) || !ch.length) return [];
      return ch.map(function (c) {
        var nm = c.channel_name || ('Channel ' + c.channel_id);
        return { label: nm, url: c.url, hd: /\bhd\b/i.test(nm), language: '', viewers: 0, raw: nm };
      });
    }

    if (match.provider === 'streamed' && Array.isArray(match.sources) && match.sources.length) {
      var results = await Promise.all(
        match.sources.map(async function (src) {
          var streams = await getStreamEmbed(src.source, src.id);
          return streams.map(function (s) {
            var srcName = src.source.charAt(0).toUpperCase() + src.source.slice(1);
            var langStr = (s.language || '').trim();
            // Build label: prefer language, else source name + HD/SD
            var label = langStr || srcName;
            if (!langStr && streams.length > 1) label += ' ' + (s.hd ? 'HD' : 'SD');
            return { label: label, url: s.embedUrl, hd: !!s.hd, language: langStr, viewers: s.viewers || 0, raw: srcName };
          });
        })
      );
      if (seq !== _openPlayerSeq) return;
      var sources = results.flat().filter(function (s) { return s.url; }).concat(_extraDaddySources(match));
      renderSources(sourcesEl, loading, sources);
    } else if (match.provider === 'esx' && Array.isArray(match.iframes) && match.iframes.length) {
      if (seq !== _openPlayerSeq) return;
      var sources = match.iframes.map(function (f, i) {
        var srv = f.server || ('Stream ' + (i + 1));
        return { label: srv, url: f.url, hd: /fhd|hd/i.test(srv), language: '', viewers: 0, raw: srv };
      }).concat(_extraDaddySources(match));
      renderSources(sourcesEl, loading, sources);
    } else if (match.provider === 'daddy' && Array.isArray(match.channels) && match.channels.length) {
      if (seq !== _openPlayerSeq) return;
      var sources = match.channels.map(function (ch) {
        return { label: ch.channel_name || ('Channel ' + ch.channel_id), url: ch.url, hd: /\bhd\b/i.test(ch.channel_name || ''), language: '', viewers: 0, raw: ch.channel_name || '' };
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
    fr.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    fr.setAttribute('allowfullscreen', '');
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

    // Attach detected language to each source (from explicit field or label heuristic).
    sources.forEach(function (s) {
      s._lang = detectLang(s.language || s.label || s.raw);
    });

    // Build a language filter bar above the source buttons.
    var langs = {};
    sources.forEach(function (s) {
      if (!s._lang) return;
      var c = s._lang.code;
      if (!langs[c]) langs[c] = { code: c, flag: s._lang.flag, name: s._lang.name, count: 0 };
      langs[c].count++;
    });
    var langKeys = Object.keys(langs);

    // Pick initial language: persisted preference if it exists in this match's sources, else any
    var initialLang = (preferredLang && langs[preferredLang]) ? preferredLang : 'all';

    var filterBar = document.createElement('div');
    filterBar.className = 'live-src-langbar';
    var visibleSources;

    function renderFilteredSources() {
      // Remove existing source boxes (keep the filter bar)
      Array.prototype.slice.call(wrap.querySelectorAll('.live-src-box')).forEach(function (n) { n.remove(); });
      visibleSources = sortSourcesByVotes(initialLang === 'all'
        ? sources
        : sources.filter(function (s) { return s._lang && s._lang.code === initialLang; }));
      if (!visibleSources.length) {
        // No source for this language → fall back to all
        visibleSources = sortSourcesByVotes(sources);
      }
      loading.style.display = 'none';
      spawnIframe(visibleSources[0].url);
      visibleSources.forEach(function (src, i) {
        var box = document.createElement('div');
        box.className = 'live-src-box';

        var btn = document.createElement('button');
        btn.className = 'live-src-btn' + (i === 0 ? ' live-src-btn--active' : '') + (src.hd ? ' live-src-btn--hd' : '');
        function paint() {
          var score = voteScore(src.url);
          var scoreLabel = score !== 0 ? ' (' + (score > 0 ? '+' + score : score) + ')' : '';
          var flag = src._lang ? src._lang.flag + ' ' : '';
          btn.textContent = flag + src.label + scoreLabel;
        }
        paint();
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
        voteUp.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'up'); paint(); });

        var voteDown = document.createElement('button');
        voteDown.className = 'live-src-vote live-src-vote--down';
        voteDown.textContent = '👎';
        voteDown.title = lt('live.vote.down', 'This stream is broken');
        voteDown.setAttribute('aria-label', voteDown.title);
        voteDown.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'down'); paint(); });

        box.appendChild(btn);
        box.appendChild(voteUp);
        box.appendChild(voteDown);
        wrap.appendChild(box);
      });
    }

    // Render the language filter bar only if we have ≥2 detected languages
    if (langKeys.length >= 2) {
      var lbl = document.createElement('span');
      lbl.className = 'live-src-langbar__label';
      lbl.textContent = '🌐 ' + lt('live.lang.label', 'Language:');
      filterBar.appendChild(lbl);

      var allBtn = document.createElement('button');
      allBtn.className = 'live-src-langpill' + (initialLang === 'all' ? ' live-src-langpill--active' : '');
      allBtn.textContent = lt('live.lang.all', 'All') + ' (' + sources.length + ')';
      allBtn.addEventListener('click', function () {
        initialLang = 'all';
        try { localStorage.removeItem('eli6.live.preferredLang'); } catch (e) {}
        preferredLang = '';
        filterBar.querySelectorAll('.live-src-langpill').forEach(function (b) { b.classList.remove('live-src-langpill--active'); });
        allBtn.classList.add('live-src-langpill--active');
        renderFilteredSources();
      });
      filterBar.appendChild(allBtn);

      langKeys.forEach(function (code) {
        var L = langs[code];
        var btn = document.createElement('button');
        btn.className = 'live-src-langpill' + (initialLang === code ? ' live-src-langpill--active' : '');
        btn.textContent = L.flag + ' ' + L.name + ' (' + L.count + ')';
        btn.addEventListener('click', function () {
          initialLang = code;
          try { localStorage.setItem('eli6.live.preferredLang', code); } catch (e) {}
          preferredLang = code;
          filterBar.querySelectorAll('.live-src-langpill').forEach(function (b) { b.classList.remove('live-src-langpill--active'); });
          btn.classList.add('live-src-langpill--active');
          renderFilteredSources();
        });
        filterBar.appendChild(btn);
      });
      wrap.appendChild(filterBar);
    }

    renderFilteredSources();
  }

  function closePlayer() {
    var modal = document.getElementById('live-modal');
    if (modal) {
      modal.hidden = true;
      modal.classList.remove('live-modal--theater');
      if (modal._keydownHandler) {
        document.removeEventListener('keydown', modal._keydownHandler);
        delete modal._keydownHandler;
      }
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
    restoreReminders();

    await Promise.all([loadMatches(), refreshLiveScores()]);
    renderTabs();
    renderLeagueFilter();
    renderMatches();
    startRefreshCountdown();
    startScoreTicker();

    // re-render dynamic text when user switches language
    window.addEventListener('eli6.langChanged', function () {
      if (window.renderTopNav) renderTopNav('live');
      if (window.renderBottomNav) renderBottomNav('live');
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

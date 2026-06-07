/* sport-app.js — APK-only mobile sports page.
   Standalone copy of the sport.js data layer with a fresh mobile-first render layer.
   Source taps fire `eli6app://play?embed=<url>` which LiveScreen's WebViewClient
   intercepts to launch PlayerActivity fullscreen. */

(function () {
  'use strict';

  // === CONSTANTS ===
  var STREAMED = 'https://streamed.pk/api';
  var STREAMED_ORIGIN = 'https://streamed.pk';
  var ESX = 'https://api.embedsportex.site/api';
  var ESX_ORIGIN = 'https://api.embedsportex.site';
  var DADDY = 'https://daddylive.eu';

  // Defense-in-depth: only let these hosts through to PlayerActivity
  var HOST_ALLOW = [
    /(^|\.)streamed\.pk$/i,
    /(^|\.)embedsports\.top$/i,
    /(^|\.)embedsportex\.site$/i,
    /(^|\.)embedme\.top$/i,
    /(^|\.)embed\.su$/i,
    /(^|\.)embed\.st$/i,
    /(^|\.)daddylive\.(eu|nl)$/i,
    /(^|\.)daddylives\.sbs$/i,
    /(^|\.)dlhd\.(pk|link)$/i,
    /(^|\.)westream\.(su|top)$/i,
  ];
  function isAllowedStreamUrl(url) {
    try {
      var u = new URL(url, location.origin);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      return HOST_ALLOW.some(function (rx) { return rx.test(u.hostname); });
    } catch (e) { return false; }
  }

  var ESX_CAT = {
    'football': 'football', 'basketball': 'basketball', 'amfootball': 'american-football',
    'volleyball': 'volleyball', 'badminton': 'badminton', 'race': 'motorsports',
    'tennis': 'tennis', 'baseball': 'baseball', 'fight': 'fight', 'hockey': 'hockey',
    'rugby': 'rugby', 'cricket': 'cricket', 'other': 'other',
  };

  var CAT_LABEL = {
    'football': 'Football', 'basketball': 'Basketball',
    'american-football': 'NFL', 'volleyball': 'Volleyball',
    'badminton': 'Badminton', 'motorsports': 'Motor',
    'tennis': 'Tennis', 'baseball': 'Baseball', 'fight': 'UFC/Boxing',
    'hockey': 'Hockey', 'rugby': 'Rugby', 'cricket': 'Cricket',
    'golf': 'Golf', 'afl': 'AFL', 'darts': 'Darts', 'billiards': 'Billiards',
    'other': 'Other',
  };
  var CAT_ICON = {
    'football': '⚽', 'basketball': '🏀', 'american-football': '🏈',
    'volleyball': '🏐', 'badminton': '🏸', 'motorsports': '🏎',
    'tennis': '🎾', 'baseball': '⚾', 'fight': '🥊',
    'hockey': '🏒', 'rugby': '🏉', 'cricket': '🏏',
    'golf': '⛳', 'afl': '🏉', 'darts': '🎯', 'other': '📺',
  };

  var LEAGUE_COLORS = [
    { rx: /\b(premier ?league|epl)\b/i,                           color: '#3D195B' },
    { rx: /\b(la ?liga|laliga)\b/i,                               color: '#EE8707' },
    { rx: /\b(serie ?a)\b/i,                                      color: '#008FD7' },
    { rx: /\b(bundesliga)\b/i,                                    color: '#D20515' },
    { rx: /\b(ligue ?1)\b/i,                                      color: '#091C3E' },
    { rx: /\b(champions ?league|uefa cl|ucl)\b/i,                 color: '#0B1F47' },
    { rx: /\b(europa ?league|uel)\b/i,                            color: '#FF6900' },
    { rx: /\b(conference ?league|uecl)\b/i,                       color: '#00A859' },
    { rx: /\b(world ?cup|fifa)\b/i,                               color: '#1A237E' },
    { rx: /\b(mls)\b/i,                                           color: '#001A57' },
    { rx: /\b(eredivisie)\b/i,                                    color: '#FF6900' },
    { rx: /\b(primeira)\b/i,                                      color: '#006A4E' },
    { rx: /\b(saudi (?:pro|league)|spl)\b/i,                      color: '#006C35' },
    { rx: /\b(brasileir[ãa]o)\b/i,                                color: '#FFCB05' },
    { rx: /\b(nba)\b/i,                                           color: '#C9082A' },
    { rx: /\b(wnba)\b/i,                                          color: '#F57B20' },
    { rx: /\b(euroleague)\b/i,                                    color: '#FF7900' },
    { rx: /\b(ncaa)\b/i,                                          color: '#0033A0' },
    { rx: /\b(nfl)\b/i,                                           color: '#013369' },
    { rx: /\b(mlb)\b/i,                                           color: '#002D72' },
    { rx: /\b(nhl)\b/i,                                           color: '#1A1A1A' },
    { rx: /\b(formula ?1|f1|grand prix)\b/i,                      color: '#E10600' },
    { rx: /\b(motogp)\b/i,                                        color: '#CC0000' },
    { rx: /\b(nascar)\b/i,                                        color: '#FFD200' },
    { rx: /\b(ufc)\b/i,                                           color: '#D20A11' },
    { rx: /\b(bellator|pfl)\b/i,                                  color: '#1A1A1A' },
    { rx: /\b(boxing)\b/i,                                        color: '#B71C1C' },
    { rx: /\b(atp|wta|grand slam|wimbledon|us open|french open|roland|australian open)\b/i, color: '#0F4D2D' },
    { rx: /\b(pga|liv golf|the open|masters|ryder cup)\b/i,       color: '#006633' },
    { rx: /\b(ipl)\b/i,                                           color: '#004B8D' },
    { rx: /\b(six nations|super rugby|nrl)\b/i,                   color: '#1B5E20' },
  ];
  function leagueColor(text) {
    if (!text) return null;
    for (var i = 0; i < LEAGUE_COLORS.length; i++) {
      if (LEAGUE_COLORS[i].rx.test(text)) return LEAGUE_COLORS[i].color;
    }
    return null;
  }

  // Language detection — country suffixes first, then provider names
  var LANG_HINTS = [
    { rx: /\b(france|french|fr)\b/i, code: 'fr', flag: '🇫🇷', name: 'French' },
    { rx: /\b(germany|german|deutsch|de)\b/i, code: 'de', flag: '🇩🇪', name: 'German' },
    { rx: /\b(italy|italia|italian|it)\b/i, code: 'it', flag: '🇮🇹', name: 'Italian' },
    { rx: /\b(spain|spanish|espana|es)\b/i, code: 'es', flag: '🇪🇸', name: 'Spanish' },
    { rx: /\b(brazil|brasil|br|portugu[êe]s)\b/i, code: 'pt-br', flag: '🇧🇷', name: 'Portuguese (BR)' },
    { rx: /\b(portugal|pt)\b/i, code: 'pt', flag: '🇵🇹', name: 'Portuguese' },
    { rx: /\b(arabic|arab|al jazeera|al kass|saudi|abu dhabi|ssc)\b/i, code: 'ar', flag: '🇸🇦', name: 'Arabic' },
    { rx: /\b(russia|russian|ru)\b/i, code: 'ru', flag: '🇷🇺', name: 'Russian' },
    { rx: /\b(turkey|turkish|tr)\b/i, code: 'tr', flag: '🇹🇷', name: 'Turkish' },
    { rx: /\b(poland|polish|polski|pl)\b/i, code: 'pl', flag: '🇵🇱', name: 'Polish' },
    { rx: /\b(sweden|swedish|sv|svensk)\b/i, code: 'sv', flag: '🇸🇪', name: 'Swedish' },
    { rx: /\b(netherland|dutch|nederland|nl)\b/i, code: 'nl', flag: '🇳🇱', name: 'Dutch' },
    { rx: /\b(japan|japanese|jp|ja)\b/i, code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { rx: /\b(usa|united states|us|nfl network|nba tv|peacock|cbs|nbc|espn)\b/i, code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
    { rx: /\b(uk|britain|british|bbc|itv|bt ?sport|sky ?(?:sports?|go))\b/i, code: 'en-gb', flag: '🇬🇧', name: 'English (UK)' },
    { rx: /\b(tnt|abc|fox(?!ports)|usa network)\b/i, code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
    { rx: /\bbein\b/i, code: 'ar', flag: '🇸🇦', name: 'Arabic' },
    { rx: /\b(movistar|dazn)\b/i, code: 'es', flag: '🇪🇸', name: 'Spanish' },
    { rx: /\b(globo|sport ?tv|esporte|premiere|sportv)\b/i, code: 'pt-br', flag: '🇧🇷', name: 'Portuguese (BR)' },
    { rx: /\b(rai|mediaset)\b/i, code: 'it', flag: '🇮🇹', name: 'Italian' },
    { rx: /\b(canal\+|rmc|tf1|l ?equipe)\b/i, code: 'fr', flag: '🇫🇷', name: 'French' },
    { rx: /\b(match ?tv|nashe)\b/i, code: 'ru', flag: '🇷🇺', name: 'Russian' },
    { rx: /\beuro(?: ?sports?)?\b/i, code: 'multi', flag: '🇪🇺', name: 'Multi-EU' },
  ];
  function detectLang(label) {
    if (!label) return null;
    var plain = label.split(/[-–|()]/)[0].trim().toLowerCase();
    var exact = { english: 'en', spanish: 'es', italian: 'it', french: 'fr', german: 'de',
      portuguese: 'pt', arabic: 'ar', russian: 'ru', dutch: 'nl', polish: 'pl',
      japanese: 'ja', turkish: 'tr', swedish: 'sv' };
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
  var currentDate = 'today';
  var favOnly = false;
  var allMatches = [];
  var searchQuery = '';
  var view = 'list';
  var detailMatch = null;
  var _openSeq = 0;
  var _refreshTimer = null;
  var _refreshing = false;

  // === PERSISTENCE ===
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  var favorites    = loadJSON('eli6.live.favorites', []);
  var sourceVotes  = loadJSON('eli6.live.sourceVotes', {});
  var preferredLang = (function () { try { return localStorage.getItem('eli6.live.preferredLang') || ''; } catch (e) { return ''; } })();

  function isFavoriteTeam(name) {
    if (!name) return false;
    return favorites.indexOf(name.toLowerCase().trim()) !== -1;
  }
  function toggleFavoriteTeam(name) {
    var t = name.toLowerCase().trim();
    var i = favorites.indexOf(t);
    if (i === -1) favorites.push(t); else favorites.splice(i, 1);
    saveJSON('eli6.live.favorites', favorites);
  }
  function extractTeams(title) {
    if (!title) return [];
    var vs = title.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    return vs ? [vs[1].trim(), vs[2].trim()] : [title.trim()];
  }
  function matchHasFavorite(m) {
    if (!favorites.length) return false;
    return extractTeams(m.title).some(function (t) { return isFavoriteTeam(t); });
  }

  function voteScore(url) {
    var v = sourceVotes[url];
    if (!v) return 0;
    return (v.up || 0) - (v.down || 0);
  }
  function voteSource(url, dir) {
    var v = sourceVotes[url] || (sourceVotes[url] = { up: 0, down: 0, self: null });
    if (v.self === dir) return; // can't vote same direction twice
    if (v.self === 'up' && dir === 'down') { v.up = Math.max(0, v.up - 1); v.down++; }
    else if (v.self === 'down' && dir === 'up') { v.down = Math.max(0, v.down - 1); v.up++; }
    else { if (dir === 'up') v.up++; else v.down++; }
    v.self = dir;
    saveJSON('eli6.live.sourceVotes', sourceVotes);
  }
  function userVote(url) {
    return (sourceVotes[url] && sourceVotes[url].self) || null;
  }
  function sortSourcesByVotes(sources) {
    return sources.slice().sort(function (a, b) {
      var sa = voteScore(a.url), sb = voteScore(b.url);
      if (sa !== sb) return sb - sa;
      return (b.hd ? 1 : 0) - (a.hd ? 1 : 0);
    });
  }

  // === DATA FETCHING (ported from sport.js) ===

  function dateRangeFor(which) {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    if (which === 'yesterday') d.setDate(d.getDate() - 1);
    else if (which === 'tomorrow') d.setDate(d.getDate() + 1);
    var start = d.getTime();
    return { start: start, end: start + 86400000 };
  }

  async function fetchStreamed(targetDate) {
    try {
      var endpoints = targetDate === 'today'
        ? [STREAMED + '/matches/live', STREAMED + '/matches/all-today']
        : [STREAMED + '/matches/live', STREAMED + '/matches/all'];
      var resp = await Promise.all(endpoints.map(function (u) { return fetch(u); }));
      var live = resp[0].ok ? (await resp[0].json() || []) : [];
      var all = resp[1].ok ? (await resp[1].json() || []) : [];
      var liveIds = resp[0].ok ? new Set(live.map(function (m) { return m.id; })) : null;
      var CAT_NORMALIZE = { 'motor-sports': 'motorsports' };
      var mapped = (Array.isArray(all) ? all : []).map(function (m) {
        var cat = m.category || 'other';
        var poster = m.poster;
        if (poster && typeof poster === 'string' && poster.charAt(0) === '/') poster = STREAMED_ORIGIN + poster;
        var teams = m.teams || {};
        var hb = teams.home && teams.home.badge;
        var ab = teams.away && teams.away.badge;
        return Object.assign({}, m, {
          poster: poster,
          homeBadgeUrl: hb ? STREAMED_ORIGIN + '/api/images/badge/' + hb + '.webp' : null,
          awayBadgeUrl: ab ? STREAMED_ORIGIN + '/api/images/badge/' + ab + '.webp' : null,
          isLive: liveIds ? liveIds.has(m.id) : (m.isLive || false),
          provider: 'streamed',
          category: CAT_NORMALIZE[cat] || cat,
        });
      });
      if (targetDate !== 'today') {
        var range = dateRangeFor(targetDate);
        mapped = mapped.filter(function (m) { return m.date >= range.start && m.date < range.end; });
      }
      return mapped;
    } catch (e) { return []; }
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
      Object.keys(ESX_CAT).forEach(function (esxKey) {
        if (!Array.isArray(data[esxKey])) return;
        var cat = ESX_CAT[esxKey];
        data[esxKey].forEach(function (m) {
          var start = parseWIB(m.kickoff);
          var end = parseWIB(m.endTime) || (start + 3 * 3600000);
          var poster = m.poster || null;
          if (poster && poster.startsWith('/')) poster = ESX_ORIGIN + poster;
          out.push({
            id: 'esx-' + (m.slug || m.slugkey || Math.random()),
            title: m.tag || '', category: cat, league: m.league || '', poster: poster,
            date: start, isLive: now >= start && now <= end, provider: 'esx',
            iframes: Array.isArray(m.iframes) ? m.iframes : [],
          });
        });
      });
      return out;
    } catch (e) { return []; }
  }

  function normalizeTeamName(s) {
    return (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b|\bac\b|\bbk\b|\bii\b|\bcd\b|\bkc\b/g, '')
      .replace(/\bunited\b/g, 'utd')
      .replace(/\bcity\b/g, '')
      .replace(/\bu\d{1,2}\b/g, '')
      .replace(/\b(women|womens|w|fem)\b/g, '')
      .replace(/\b(reserves|reserve|res|youth|academy|ii|b|junior|jr)\b/g, '')
      .replace(/\b(t20|odi|test|t10)\b/g, '')
      .replace(/\s+/g, ' ').trim();
  }
  function normalizeTitle(title) {
    var s = (title || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\./g, ' ').replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    var m = s.match(/^(.+?)\s+(?:vs?|v)\s+(.+)$/);
    if (m) return [normalizeTeamName(m[1]), normalizeTeamName(m[2])].sort().join('|');
    return s;
  }

  var DADDY_SPORT_MAP = {
    'soccer': 'football', 'football': 'football', 'futsal': 'football',
    'basketball': 'basketball', 'nba': 'basketball',
    'tennis': 'tennis', 'atp': 'tennis', 'wta': 'tennis',
    'baseball': 'baseball', 'mlb': 'baseball',
    'ice hockey': 'hockey', 'nhl': 'hockey', 'hockey': 'hockey',
    'am. football': 'american-football', 'american football': 'american-football', 'nfl': 'american-football',
    'motorsport': 'motorsports', 'motor sports': 'motorsports', 'motorsports': 'motorsports',
    'f1': 'motorsports', 'formula 1': 'motorsports', 'motogp': 'motorsports',
    'rugby': 'rugby', 'cricket': 'cricket', 'volleyball': 'volleyball',
    'boxing': 'fight', 'mma': 'fight', 'ufc': 'fight', 'fight': 'fight', 'wrestling': 'fight',
    'golf': 'golf', 'darts': 'darts', 'badminton': 'badminton',
    'aussie rules': 'afl', 'afl': 'afl',
  };
  function daddyCatFromString(str) {
    var s = (str || '').toLowerCase();
    if (/\b(atp|wta|tennis|roland|french open|wimbledon|us open|australian open)\b/.test(s)) return 'tennis';
    var keys = Object.keys(DADDY_SPORT_MAP);
    for (var i = 0; i < keys.length; i++) if (s.indexOf(keys[i]) !== -1) return DADDY_SPORT_MAP[keys[i]];
    return 'other';
  }
  var DADDY_MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
  function parseDaddyTime(dayStr, timeStr) {
    if (!dayStr) return 0;
    var dm = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/.exec(dayStr || '');
    if (!dm) return 0;
    var day = parseInt(dm[1], 10);
    var mon = DADDY_MONTHS[dm[2].slice(0, 3).toLowerCase()];
    var yr = parseInt(dm[3], 10);
    if (mon == null) return 0;
    var h = 0, mi = 0;
    var tm = /(\d{1,2}):(\d{2})/.exec(timeStr || '');
    if (tm) { h = parseInt(tm[1], 10); mi = parseInt(tm[2], 10); }
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
      var STALE = 3 * 3600000;
      var FUTURE = 36 * 3600000;
      data.forEach(function (day) {
        var cats = day.categories || {};
        Object.keys(cats).forEach(function (catName) {
          var arr = cats[catName];
          if (!Array.isArray(arr)) return;
          var defaultCat = daddyCatFromString(catName);
          arr.forEach(function (ev) {
            var title = ev.event || '';
            if (!title) return;
            var clean = title.replace(/^[^:]+:\s*/, '').trim();
            var cat = defaultCat;
            if (cat === 'other') cat = daddyCatFromString(clean);
            var channels = Array.isArray(ev.channels) ? ev.channels.filter(function (c) {
              return c && c.url && /^https:\/\/(daddylive\.(eu|nl)|daddylives\.sbs|dlhd\.(pk|link))/.test(c.url);
            }) : [];
            if (!channels.length) return;
            var timeStr = (ev.time || '').trim();
            var explicitLive = /^live\b/i.test(timeStr);
            var kickoff = explicitLive ? now : parseDaddyTime(day.day, timeStr);
            if (!kickoff) return;
            if (kickoff < now - STALE) return;
            if (kickoff > now + FUTURE) return;
            var isLive = explicitLive || (kickoff <= now && kickoff > now - STALE);
            out.push({
              id: 'daddy-' + (ev.event || Math.random()).slice(0, 80),
              title: clean, category: cat, league: '', poster: null,
              date: kickoff, isLive: isLive, provider: 'daddy', channels: channels,
            });
          });
        });
      });
      return out;
    } catch (e) { return []; }
  }

  async function loadMatches() {
    var results = await Promise.all([
      fetchStreamed(currentDate),
      fetchESX(),
      currentDate === 'today' ? fetchDaddy() : Promise.resolve([]),
    ]);
    var streamedData = results[0], esxData = results[1], daddyData = results[2];
    var seen = new Set(streamedData.map(function (m) { return normalizeTitle(m.title); }));
    var esxNew = esxData.filter(function (m) {
      var n = normalizeTitle(m.title);
      if (seen.has(n)) return false;
      seen.add(n);
      return true;
    });
    var daddyNew = [];
    daddyData.forEach(function (d) {
      var n = normalizeTitle(d.title);
      var existing = streamedData.find(function (m) { return normalizeTitle(m.title) === n; }) ||
                     esxNew.find(function (m) { return normalizeTitle(m.title) === n; });
      if (existing) {
        existing._daddyChannels = (existing._daddyChannels || []).concat(d.channels);
      } else if (!seen.has(n)) {
        daddyNew.push(d);
        seen.add(n);
      }
    });
    allMatches = streamedData.concat(esxNew).concat(daddyNew);
    return allMatches;
  }

  async function getStreamEmbed(source, id) {
    try {
      var r = await fetch(STREAMED + '/stream/' + source + '/' + encodeURIComponent(id));
      if (!r.ok) return [];
      var streams = await r.json();
      if (!Array.isArray(streams)) return [];
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

  // === ROUTING ===
  function parseRoute() {
    var qs = new URLSearchParams(location.search);
    if (qs.get('match')) return { view: 'detail', matchId: qs.get('match') };
    return { view: 'list' };
  }
  function applyRoute() {
    var r = parseRoute();
    view = r.view;
    if (view === 'detail') {
      var mid = r.matchId;
      detailMatch = allMatches.find(function (m) {
        return (m.id && m.id === mid) || (normalizeTitle(m.title) === mid);
      }) || null;
      if (!detailMatch) {
        // matchId from URL refers to a match we haven't loaded yet — fall back to list
        view = 'list';
      }
    }
    render();
  }
  function goToMatch(m) {
    var mid = m.id || normalizeTitle(m.title) || 'unknown';
    detailMatch = m;
    history.pushState({}, '', '/app/sport?match=' + encodeURIComponent(mid));
    view = 'detail';
    render();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  function goBack() {
    if (history.length > 1) history.back();
    else { history.replaceState({}, '', '/app/sport'); view = 'list'; render(); }
  }
  window.addEventListener('popstate', function () { applyRoute(); });

  // === FORMAT HELPERS ===
  function fmtKickoff(ts, when) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = String(d.getHours()).padStart(2, '0');
    var m = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  }
  function teamInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function crestHtml(badgeUrl, name) {
    if (badgeUrl) {
      return '<span class="sa-team__crest"><img src="' + escapeHtml(badgeUrl) + '" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode(\'' + escapeHtml(teamInitials(name)) + '\'))" /></span>';
    }
    return '<span class="sa-team__crest">' + escapeHtml(teamInitials(name)) + '</span>';
  }

  // === RENDER: SHARED ===
  function filteredMatches() {
    var arr = allMatches.slice();
    if (currentSport !== 'all') arr = arr.filter(function (m) { return m.category === currentSport; });
    if (favOnly) arr = arr.filter(matchHasFavorite);
    if (searchQuery) {
      var q = searchQuery.toLowerCase();
      arr = arr.filter(function (m) {
        return (m.title || '').toLowerCase().indexOf(q) !== -1 ||
               (m.league || '').toLowerCase().indexOf(q) !== -1 ||
               (m.category || '').toLowerCase().indexOf(q) !== -1;
      });
    }
    // sort: live first, then by kickoff asc
    arr.sort(function (a, b) {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return (a.date || 0) - (b.date || 0);
    });
    return arr;
  }

  function sportCounts() {
    var counts = { all: 0 };
    var pool = favOnly ? allMatches.filter(matchHasFavorite) : allMatches;
    pool.forEach(function (m) {
      counts.all++;
      var k = m.category || 'other';
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }

  // === RENDER: LIST VIEW ===
  function renderSportChips() {
    var host = document.getElementById('sa-sports');
    if (!host) return;
    var counts = sportCounts();
    // sport order: all, then sports that appear (sorted by count desc, then label)
    var keys = Object.keys(counts).filter(function (k) { return k !== 'all'; });
    keys.sort(function (a, b) {
      var dc = counts[b] - counts[a];
      if (dc) return dc;
      return (CAT_LABEL[a] || a).localeCompare(CAT_LABEL[b] || b);
    });
    var order = ['all'].concat(keys);
    host.innerHTML = order.map(function (k) {
      var label = k === 'all' ? 'All' : (CAT_LABEL[k] || k);
      var icon = k === 'all' ? '✨' : (CAT_ICON[k] || CAT_ICON.other);
      return '<button class="sa-chip ' + (currentSport === k ? 'is-active' : '') + '" type="button" data-sport="' + escapeHtml(k) + '">' +
        '<span>' + icon + '</span>' +
        '<span>' + escapeHtml(label) + '</span>' +
        '<span class="sa-chip__count">' + (counts[k] || 0) + '</span>' +
        '</button>';
    }).join('');
  }

  function renderList() {
    var body = document.getElementById('sa-body');
    if (!body) return;
    var matches = filteredMatches();

    if (!matches.length) {
      body.innerHTML = '<div class="sa-empty">' +
        '<div class="sa-empty__title">No matches</div>' +
        '<div>Try a different sport or date.</div>' +
        '<button type="button" data-action="reset">Reset filters</button>' +
        '</div>';
      return;
    }

    // group by league (or fall back to category label)
    var groups = {};
    var groupOrder = [];
    matches.forEach(function (m) {
      var lg = (m.league && m.league.trim()) || CAT_LABEL[m.category] || 'Other';
      if (!groups[lg]) { groups[lg] = []; groupOrder.push(lg); }
      groups[lg].push(m);
    });

    var html = groupOrder.map(function (lg) {
      var rows = groups[lg].map(function (m) {
        var teams = extractTeams(m.title);
        var home = teams[0] || m.title || '—';
        var away = teams[1] || null;
        var live = m.isLive;
        var kickoff = fmtKickoff(m.date);
        var time = live ? '<span class="sa-match__live">LIVE</span>'
                        : kickoff ? '<span class="sa-match__time">' + escapeHtml(kickoff) + '</span>'
                                  : '<span class="sa-match__date">TBD</span>';
        var srcCount = (m.sources && m.sources.length) ||
                       (m.iframes && m.iframes.length) ||
                       (m.channels && m.channels.length) || 0;
        var daddyExtra = (m._daddyChannels && m._daddyChannels.length) || 0;
        var totalSrc = srcCount + daddyExtra;
        var hasHD = (m.sources || []).some(function (s) { return s.hd; });
        var isFav = matchHasFavorite(m);

        var teamRows;
        if (away) {
          teamRows =
            '<div class="sa-team' + (isFavoriteTeam(home) ? ' is-fav' : '') + '">' +
              crestHtml(m.homeBadgeUrl, home) +
              '<span class="sa-team__name">' + escapeHtml(home) + '</span>' +
            '</div>' +
            '<div class="sa-team' + (isFavoriteTeam(away) ? ' is-fav' : '') + '">' +
              crestHtml(m.awayBadgeUrl, away) +
              '<span class="sa-team__name">' + escapeHtml(away) + '</span>' +
            '</div>';
        } else {
          teamRows = '<div class="sa-team"><span class="sa-team__crest">' + (CAT_ICON[m.category] || '📺') + '</span><span class="sa-team__name">' + escapeHtml(home) + '</span></div>';
        }

        return '<div class="sa-match" data-match-id="' + escapeHtml(m.id || normalizeTitle(m.title)) + '">' +
          '<div class="sa-match__status">' + time + '</div>' +
          '<div class="sa-match__teams">' + teamRows + '</div>' +
          '<div class="sa-match__meta">' +
            (totalSrc ? '<span class="sa-match__src">' + totalSrc + ' src</span>' : '') +
            (hasHD ? '<span class="sa-match__hd">HD</span>' : '') +
            (isFav ? '<span class="sa-match__fav">★</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');

      var lc = leagueColor(lg);
      return '<section class="sa-league-section">' +
        '<header class="sa-league">' +
          '<span class="sa-league__dot"' + (lc ? ' style="background:' + lc + '"' : '') + '></span>' +
          '<span class="sa-league__name">' + escapeHtml(lg) + '</span>' +
          '<span class="sa-league__count">' + groups[lg].length + '</span>' +
        '</header>' +
        rows +
      '</section>';
    }).join('');

    body.innerHTML = html;

    // wire row taps
    body.querySelectorAll('.sa-match').forEach(function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-match-id');
        var m = allMatches.find(function (mm) { return (mm.id && mm.id === id) || normalizeTitle(mm.title) === id; });
        if (m) goToMatch(m);
      });
    });
    var resetBtn = body.querySelector('[data-action="reset"]');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      currentSport = 'all'; favOnly = false; searchQuery = '';
      var input = document.getElementById('sa-search-input');
      if (input) input.value = '';
      var btn = document.querySelector('[data-action="toggle-fav-only"]');
      if (btn) btn.setAttribute('aria-pressed', 'false');
      render();
    });
  }

  function renderDate() {
    document.querySelectorAll('.sa-date').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-date') === currentDate);
    });
  }

  // === RENDER: DETAIL VIEW ===
  function buildSources(match) {
    function extraDaddy(m) {
      var ch = m && m._daddyChannels;
      if (!Array.isArray(ch) || !ch.length) return [];
      return ch.map(function (c) {
        var nm = c.channel_name || ('Channel ' + c.channel_id);
        return { label: nm, url: c.url, hd: /\bhd\b/i.test(nm), language: '', raw: nm };
      });
    }

    if (match.provider === 'streamed' && Array.isArray(match.sources) && match.sources.length) {
      return Promise.all(match.sources.map(function (src) {
        return getStreamEmbed(src.source, src.id).then(function (streams) {
          return streams.map(function (s) {
            var srcName = src.source.charAt(0).toUpperCase() + src.source.slice(1);
            var langStr = (s.language || '').trim();
            var label = langStr || srcName;
            if (!langStr && streams.length > 1) label += ' ' + (s.hd ? 'HD' : 'SD');
            return { label: label, url: s.embedUrl, hd: !!s.hd, language: langStr, viewers: s.viewers || 0, raw: srcName };
          });
        });
      })).then(function (results) {
        return results.flat().filter(function (s) { return s.url; }).concat(extraDaddy(match));
      });
    }
    if (match.provider === 'esx' && Array.isArray(match.iframes) && match.iframes.length) {
      var arr = match.iframes.map(function (f, i) {
        var srv = f.server || ('Stream ' + (i + 1));
        return { label: srv, url: f.url, hd: /fhd|hd/i.test(srv), language: '', raw: srv };
      }).concat(extraDaddy(match));
      return Promise.resolve(arr);
    }
    if (match.provider === 'daddy' && Array.isArray(match.channels) && match.channels.length) {
      return Promise.resolve(match.channels.map(function (ch) {
        return { label: ch.channel_name || ('Channel ' + ch.channel_id), url: ch.url, hd: /\bhd\b/i.test(ch.channel_name || ''), language: '', raw: ch.channel_name || '' };
      }));
    }
    return Promise.resolve([]);
  }

  function playInPlayerActivity(url) {
    if (!isAllowedStreamUrl(url)) {
      alert('This stream URL is blocked.');
      return;
    }
    // LiveScreen.kt intercepts this scheme in shouldOverrideUrlLoading
    // and starts PlayerActivity with intent.data = url.
    var deepLink = 'eli6app://play?embed=' + encodeURIComponent(url);
    // Use location.href so the WebViewClient sees it as a top-frame navigation
    location.href = deepLink;
  }

  function renderDetail() {
    if (!detailMatch) return;
    var m = detailMatch;
    var teams = extractTeams(m.title);
    var home = teams[0] || m.title;
    var away = teams[1] || null;

    var titleEl = document.getElementById('sa-detail-title');
    if (titleEl) titleEl.textContent = m.title || home;

    var favBtn = document.querySelector('[data-action="toggle-fav-team"]');
    if (favBtn) favBtn.setAttribute('aria-pressed', String(matchHasFavorite(m)));

    var heroEl = document.getElementById('sa-detail-hero');
    if (heroEl) {
      var lc = leagueColor(m.league || m.title);
      heroEl.style.setProperty('--hero-color', lc ? (lc + '55') : 'rgba(200,255,58,0.18)');
      if (away) {
        heroEl.innerHTML =
          '<div class="sa-hero__team">' +
            '<div class="sa-hero__crest">' + (m.homeBadgeUrl
              ? '<img src="' + escapeHtml(m.homeBadgeUrl) + '" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode(\'' + escapeHtml(teamInitials(home)) + '\'))" />'
              : escapeHtml(teamInitials(home))) + '</div>' +
            '<div class="sa-hero__name">' + escapeHtml(home) + '</div>' +
          '</div>' +
          '<div class="sa-hero__vs">VS</div>' +
          '<div class="sa-hero__team">' +
            '<div class="sa-hero__crest">' + (m.awayBadgeUrl
              ? '<img src="' + escapeHtml(m.awayBadgeUrl) + '" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode(\'' + escapeHtml(teamInitials(away)) + '\'))" />'
              : escapeHtml(teamInitials(away))) + '</div>' +
            '<div class="sa-hero__name">' + escapeHtml(away) + '</div>' +
          '</div>';
      } else {
        heroEl.innerHTML = '<div class="sa-hero__solo">' + (CAT_ICON[m.category] || '🏆') + ' ' + escapeHtml(home) + '</div>';
      }
    }

    var metaEl = document.getElementById('sa-detail-meta');
    if (metaEl) {
      var bits = [];
      if (m.isLive) bits.push('<span class="sa-meta__pill is-live">● LIVE NOW</span>');
      else if (m.date) bits.push('<span class="sa-meta__pill">' + escapeHtml(new Date(m.date).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })) + '</span>');
      if (m.league) {
        var lc2 = leagueColor(m.league);
        var style = lc2 ? ' style="--league-bg:' + lc2 + ';--league-fg:#fff"' : '';
        bits.push('<span class="sa-meta__pill is-league"' + style + '>' + escapeHtml(m.league) + '</span>');
      }
      bits.push('<span class="sa-meta__pill">' + (CAT_ICON[m.category] || '📺') + ' ' + escapeHtml(CAT_LABEL[m.category] || m.category || 'Other') + '</span>');
      metaEl.innerHTML = bits.join('');
    }

    var sourcesEl = document.getElementById('sa-sources');
    var langEl = document.getElementById('sa-langbar');
    if (sourcesEl) sourcesEl.innerHTML = '<li style="padding:18px 14px;color:var(--fg-muted)">Loading streams…</li>';
    if (langEl) langEl.innerHTML = '';

    var seq = ++_openSeq;
    buildSources(m).then(function (sources) {
      if (seq !== _openSeq) return;
      sources.forEach(function (s) { s._lang = detectLang(s.language || s.label || s.raw); });
      renderSources(sources);
    });
  }

  function renderSources(sources) {
    var sourcesEl = document.getElementById('sa-sources');
    var langEl = document.getElementById('sa-langbar');
    if (!sourcesEl) return;
    if (!sources.length) {
      sourcesEl.innerHTML = '<li style="padding:20px 14px;color:var(--fg-muted)">No streams available right now.</li>';
      return;
    }

    var langs = {};
    sources.forEach(function (s) {
      if (!s._lang) return;
      var c = s._lang.code;
      if (!langs[c]) langs[c] = { code: c, flag: s._lang.flag, name: s._lang.name, count: 0 };
      langs[c].count++;
    });
    var langKeys = Object.keys(langs);
    var initialLang = (preferredLang && langs[preferredLang]) ? preferredLang : 'all';

    if (langEl) {
      if (langKeys.length >= 2) {
        var langHtml = '<button class="sa-langpill ' + (initialLang === 'all' ? 'is-active' : '') + '" type="button" data-lang="all">All <span class="sa-langpill__count">' + sources.length + '</span></button>';
        langKeys.sort(function (a, b) { return langs[b].count - langs[a].count; });
        langKeys.forEach(function (k) {
          langHtml += '<button class="sa-langpill ' + (initialLang === k ? 'is-active' : '') + '" type="button" data-lang="' + escapeHtml(k) + '">' + langs[k].flag + ' ' + escapeHtml(langs[k].name) + ' <span class="sa-langpill__count">' + langs[k].count + '</span></button>';
        });
        langEl.innerHTML = langHtml;
        langEl.querySelectorAll('.sa-langpill').forEach(function (pill) {
          pill.addEventListener('click', function () {
            var code = pill.getAttribute('data-lang');
            preferredLang = code === 'all' ? '' : code;
            try { localStorage.setItem('eli6.live.preferredLang', preferredLang); } catch (e) {}
            langEl.querySelectorAll('.sa-langpill').forEach(function (p) {
              p.classList.toggle('is-active', p.getAttribute('data-lang') === code);
            });
            paintSourceList(sources, code);
          });
        });
      } else {
        langEl.innerHTML = '';
      }
    }

    paintSourceList(sources, initialLang);
  }

  function paintSourceList(sources, langCode) {
    var sourcesEl = document.getElementById('sa-sources');
    if (!sourcesEl) return;
    var visible = sortSourcesByVotes(
      langCode && langCode !== 'all'
        ? sources.filter(function (s) { return s._lang && s._lang.code === langCode; })
        : sources
    );

    sourcesEl.innerHTML = visible.map(function (s, i) {
      var v = sourceVotes[s.url] || {};
      var score = (v.up || 0) - (v.down || 0);
      var self = v.self;
      var lang = s._lang
        ? '<span class="sa-source__lang">' + s._lang.flag + ' ' + escapeHtml(s._lang.name) + '</span>'
        : '';
      return '<li class="sa-source" data-url="' + escapeHtml(s.url) + '">' +
        '<span class="sa-source__num">' + (i + 1) + '</span>' +
        '<div class="sa-source__main">' +
          '<div class="sa-source__label">' + escapeHtml(s.label) + '</div>' +
          '<div class="sa-source__sub">' + lang + (s.hd ? '<span class="sa-source__hd">HD</span>' : '') + '</div>' +
        '</div>' +
        '<div class="sa-source__votes">' +
          '<button class="sa-vote is-up ' + (self === 'up' ? 'is-active' : '') + '" type="button" data-vote="up" aria-label="Upvote">▲</button>' +
          '<span class="sa-source__score">' + (score > 0 ? '+' : '') + score + '</span>' +
          '<button class="sa-vote is-down ' + (self === 'down' ? 'is-active' : '') + '" type="button" data-vote="down" aria-label="Downvote">▼</button>' +
        '</div>' +
        '<button class="sa-source__play" type="button" data-action="play" aria-label="Play">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l13 7L8 19V5z" fill="currentColor"/></svg>' +
        '</button>' +
      '</li>';
    }).join('');

    sourcesEl.querySelectorAll('.sa-source').forEach(function (li) {
      var url = li.getAttribute('data-url');
      li.querySelector('[data-action="play"]').addEventListener('click', function (e) {
        e.stopPropagation();
        playInPlayerActivity(url);
      });
      li.addEventListener('click', function (e) {
        if (e.target.closest('.sa-vote') || e.target.closest('[data-action="play"]')) return;
        playInPlayerActivity(url);
      });
      li.querySelectorAll('.sa-vote').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          voteSource(url, btn.getAttribute('data-vote'));
          paintSourceList(sources, langCode);
        });
      });
    });
  }

  // === MASTER RENDER ===
  function render() {
    var list = document.getElementById('view-list');
    var detail = document.getElementById('view-detail');
    if (view === 'list') {
      list.hidden = false; list.setAttribute('aria-hidden', 'false');
      detail.hidden = true; detail.setAttribute('aria-hidden', 'true');
      var skel = document.getElementById('sa-skeleton');
      if (skel) skel.style.display = 'none';
      renderSportChips();
      renderDate();
      renderList();
    } else {
      list.hidden = true; list.setAttribute('aria-hidden', 'true');
      detail.hidden = false; detail.setAttribute('aria-hidden', 'false');
      renderDetail();
    }
  }

  // === WIRING ===
  function wireGlobalActions() {
    document.body.addEventListener('click', function (e) {
      var t = e.target.closest('[data-action]');
      if (!t) return;
      var action = t.getAttribute('data-action');
      if (action === 'back') goBack();
      else if (action === 'toggle-search') {
        var sec = document.querySelector('.sa-search');
        if (!sec) return;
        var was = sec.hidden;
        sec.hidden = !was;
        if (was) {
          var i = document.getElementById('sa-search-input');
          if (i) setTimeout(function () { i.focus(); }, 50);
        }
      } else if (action === 'toggle-fav-only') {
        favOnly = !favOnly;
        t.setAttribute('aria-pressed', String(favOnly));
        render();
      } else if (action === 'toggle-fav-team') {
        if (!detailMatch) return;
        var teams = extractTeams(detailMatch.title);
        teams.forEach(toggleFavoriteTeam);
        t.setAttribute('aria-pressed', String(matchHasFavorite(detailMatch)));
      }
    });

    // sport chips
    document.getElementById('sa-sports').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-sport]');
      if (!chip) return;
      currentSport = chip.getAttribute('data-sport');
      renderSportChips();
      renderList();
    });

    // date strip
    document.querySelectorAll('.sa-date').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = btn.getAttribute('data-date');
        if (d === currentDate) return;
        currentDate = d;
        renderDate();
        refresh(true);
      });
    });

    // search input
    var input = document.getElementById('sa-search-input');
    if (input) {
      var deb = null;
      input.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () {
          searchQuery = input.value.trim();
          renderList();
        }, 180);
      });
    }
  }

  // === REFRESH ===
  async function refresh(showSkeleton) {
    if (_refreshing) return;
    _refreshing = true;
    if (showSkeleton) {
      var body = document.getElementById('sa-body');
      if (body) body.innerHTML = '<div class="sa-skeleton"><div class="sa-skeleton__row"></div><div class="sa-skeleton__row"></div><div class="sa-skeleton__row"></div><div class="sa-skeleton__row"></div></div>';
    }
    try { await loadMatches(); }
    catch (e) {}
    _refreshing = false;
    // If we're in detail view but the match wasn't in the dataset, applyRoute
    // will now find it after a refresh — re-resolve the route.
    if (view === 'detail' && !detailMatch) applyRoute();
    else render();
  }

  function startAutoRefresh() {
    if (_refreshTimer) clearInterval(_refreshTimer);
    _refreshTimer = setInterval(function () {
      if (document.hidden) return;
      if (currentDate !== 'today') return; // only auto-refresh for today
      refresh(false);
    }, 60000);
  }

  // === BOOT ===
  function boot() {
    wireGlobalActions();
    refresh(true).then(function () {
      applyRoute();
      startAutoRefresh();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

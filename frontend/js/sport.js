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

  // v3 redesign: poster fetching + IntersectionObserver removed. Cards are
  // minimal and use only the small team badges that streamed.pk and TSDB
  // already give us (no extra network round-trips to TheSportsDB fanart).
  var _cardObserver = { observe: function () {}, unobserve: function () {}, disconnect: function () {} };

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

  // === LEAGUE COLORS ===
  // Maps the most common leagues/competitions to their brand color. Falls
  // back to the sport color when nothing matches. Patterns are matched against
  // the lowercased league + title string (so "EPL", "Premier League", or
  // "Manchester United vs Liverpool — Premier League" all hit the same entry).
  var LEAGUE_COLORS = [
    // football / soccer
    { rx: /\b(premier ?league|epl|english premier)\b/i,                color: '#3D195B' },
    { rx: /\b(la ?liga|laliga|spanish (?:primera|la liga))\b/i,         color: '#EE8707' },
    { rx: /\b(serie ?a|italian (?:serie a|league))\b/i,                 color: '#008FD7' },
    { rx: /\b(bundesliga|german (?:bundesliga|league))\b/i,             color: '#D20515' },
    { rx: /\b(ligue ?1|french (?:ligue 1|league))\b/i,                  color: '#091C3E' },
    { rx: /\b(champions ?league|uefa cl|ucl|champ\.? league)\b/i,       color: '#0B1F47' },
    { rx: /\b(europa ?league|uel)\b/i,                                  color: '#FF6900' },
    { rx: /\b(conference ?league|uecl)\b/i,                             color: '#00A859' },
    { rx: /\b(world ?cup|fifa)\b/i,                                     color: '#1A237E' },
    { rx: /\b(mls|major league soccer)\b/i,                             color: '#001A57' },
    { rx: /\b(eredivisie|dutch (?:eredivisie|league))\b/i,              color: '#FF6900' },
    { rx: /\b(primeira ?liga|portuguese (?:primeira|league))\b/i,       color: '#006A4E' },
    { rx: /\b(saudi (?:pro|league)|spl)\b/i,                            color: '#006C35' },
    { rx: /\b(brasileir[ãa]o|brazilian (?:serie a|league))\b/i,         color: '#FFCB05' },
    { rx: /\b(argentin[ea]|liga profesional|primera division)\b/i,      color: '#74ACDF' },
    // basketball
    { rx: /\b(nba|national basketball)\b/i,                             color: '#C9082A' },
    { rx: /\b(wnba)\b/i,                                                color: '#F57B20' },
    { rx: /\b(euroleague|euro ?cup)\b/i,                                color: '#FF7900' },
    { rx: /\b(ncaa)\b/i,                                                color: '#0033A0' },
    // american football
    { rx: /\b(nfl|national football league)\b/i,                        color: '#013369' },
    { rx: /\b(cfl|canadian football)\b/i,                               color: '#A6192E' },
    // baseball
    { rx: /\b(mlb|major league baseball)\b/i,                           color: '#002D72' },
    { rx: /\b(npb|nippon professional)\b/i,                             color: '#C8102E' },
    // hockey
    { rx: /\b(nhl|national hockey)\b/i,                                 color: '#000000' },
    { rx: /\b(khl)\b/i,                                                 color: '#D52B1E' },
    // motorsports
    { rx: /\b(formula ?1|formula one|f1|grand prix)\b/i,                color: '#E10600' },
    { rx: /\b(motogp|moto2|moto3)\b/i,                                  color: '#CC0000' },
    { rx: /\b(nascar)\b/i,                                              color: '#FFD200' },
    { rx: /\b(indycar|indy 500)\b/i,                                    color: '#003DA5' },
    { rx: /\b(wec|world endurance|le mans)\b/i,                         color: '#00843D' },
    { rx: /\b(rally|wrc)\b/i,                                           color: '#0033A0' },
    // combat
    { rx: /\b(ufc|ultimate fighting)\b/i,                               color: '#D20A11' },
    { rx: /\b(bellator|pfl)\b/i,                                        color: '#1A1A1A' },
    { rx: /\b(boxing|wbc|wba|ibf|wbo|matchroom|top rank)\b/i,           color: '#B71C1C' },
    // tennis
    { rx: /\b(atp|wta|grand slam|wimbledon|us open|french open|roland|australian open)\b/i, color: '#0F4D2D' },
    // golf
    { rx: /\b(pga|liv golf|the open|masters|ryder cup)\b/i,             color: '#006633' },
    // cricket
    { rx: /\b(ipl|indian premier league)\b/i,                           color: '#004B8D' },
    { rx: /\b(t20|test (?:match|series)|odi)\b/i,                       color: '#1B5E20' },
    // rugby
    { rx: /\b(six nations|super rugby|nrl|super league|rugby world cup)\b/i, color: '#1B5E20' },
  ];
  function leagueColor(text) {
    if (!text) return null;
    for (var i = 0; i < LEAGUE_COLORS.length; i++) {
      if (LEAGUE_COLORS[i].rx.test(text)) return LEAGUE_COLORS[i].color;
    }
    return null;
  }

  // === LANGUAGE DETECTION (for stream source labels) ===
  // Heuristic: parse channel/server names → {flag, code, name}.
  // 'code' is ISO-639-1 (or 'multi' for European feeds). Used to group sources in the player modal.
  //
  // IMPORTANT: country-suffix matchers MUST run before the generic provider
  // ones. "beIN Sports 2 France" should be French, not Arabic — so we look
  // for "France"/"FR" before falling through to the generic "bein" rule.
  var LANG_HINTS = [
    // --- country-suffix matchers (run first so they beat provider-name fallbacks) ---
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
    { rx: /\b(china|chinese|zh|cn)\b/i, code: 'zh', flag: '🇨🇳', name: 'Chinese' },
    { rx: /\b(czech|cz|cesk)\b/i, code: 'cs', flag: '🇨🇿', name: 'Czech' },
    { rx: /\b(ireland|irish|ire|ie)\b/i, code: 'en-ie', flag: '🇮🇪', name: 'English (IE)' },
    { rx: /\b(australia|australian|au|aussie|kayo|stan ?sport)\b/i, code: 'en-au', flag: '🇦🇺', name: 'English (AU)' },
    { rx: /\b(canada|canadian|ca|tsn|sportsnet|cbc)\b/i, code: 'en-ca', flag: '🇨🇦', name: 'English (CA)' },
    { rx: /\b(usa|united states|us|nfl network|nba tv|cfl\+|peacock|cbs|nbc|espn)\b/i, code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
    { rx: /\b(uk|britain|british|bbc|itv|bt ?sport|sky ?(?:sports?|go))\b/i, code: 'en-gb', flag: '🇬🇧', name: 'English (UK)' },
    // --- generic provider names (fallback when no country marker was present) ---
    { rx: /\b(tnt|abc|fox(?!ports)|usa network)\b/i, code: 'en-us', flag: '🇺🇸', name: 'English (US)' },
    { rx: /\bbein\b/i, code: 'ar', flag: '🇸🇦', name: 'Arabic' },
    { rx: /\b(movistar|la ?liga|dazn)\b/i, code: 'es', flag: '🇪🇸', name: 'Spanish' },
    { rx: /\b(globo|sport ?tv|esporte|premiere|combate|cazetv|sportv)\b/i, code: 'pt-br', flag: '🇧🇷', name: 'Portuguese (BR)' },
    { rx: /\b(rai|mediaset)\b/i, code: 'it', flag: '🇮🇹', name: 'Italian' },
    { rx: /\b(canal\+|rmc|tf1|l ?equipe)\b/i, code: 'fr', flag: '🇫🇷', name: 'French' },
    { rx: /\b(match ?tv|nashe)\b/i, code: 'ru', flag: '🇷🇺', name: 'Russian' },
    { rx: /\b(tv4|viaplay|c ?more)\b/i, code: 'sv', flag: '🇸🇪', name: 'Swedish' },
    { rx: /\b(nos|ziggo|fox sports nl)\b/i, code: 'nl', flag: '🇳🇱', name: 'Dutch' },
    { rx: /\b(j ?sport|wowow|nhk|fuji ?tv|gaora)\b/i, code: 'ja', flag: '🇯🇵', name: 'Japanese' },
    { rx: /\b(cctv|migu|pp ?sport)\b/i, code: 'zh', flag: '🇨🇳', name: 'Chinese' },
    { rx: /\b(spor ?smart|tivibu|trt ?spor)\b/i, code: 'tr', flag: '🇹🇷', name: 'Turkish' },
    { rx: /\b(polsat ?sport|tvp ?sport)\b/i, code: 'pl', flag: '🇵🇱', name: 'Polish' },
    { rx: /\bnova ?sport\b/i, code: 'cs', flag: '🇨🇿', name: 'Czech' },
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

  // v3 view state: 'home' (sport-grouped), 'sport' (single grid), 'match' (detail)
  var view = 'home';
  var detailMatch = null;

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
      // strip accents/diacritics ("Côte" → "cote", "Bayern München" → "bayern munchen")
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\bfc\b|\bcf\b|\bsc\b|\bafc\b|\bac\b|\bbk\b|\bii\b|\bcd\b|\bkc\b/g, '')
      .replace(/\bunited\b/g, 'utd')
      .replace(/\bcity\b/g, '')
      .replace(/\bu\d{1,2}\b/g, '')
      .replace(/\b(women|womens|w|fem)\b/g, '')
      .replace(/\b(reserves|reserve|res|youth|academy|ii|b|junior|jr)\b/g, '')
      // cricket format suffixes: "Somerset t20" → "somerset"
      .replace(/\b(t20|odi|test|t10)\b/g, '')
      // common nation-name variants
      .replace(/\bcote d ivoire\b/g, 'ivory coast')
      .replace(/\b(n |northern )ireland\b/g, 'northern ireland')
      .replace(/\bgb\b|\bgreat britain\b/g, 'uk')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function normalizeTitle(title) {
    var s = (title || '').toLowerCase()
      .normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .replace(/\./g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    // Tolerate "vs", "vs.", "v" between teams
    var m = s.match(/^(.+?)\s+(?:vs?|v)\s+(.+)$/);
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
      } else if (currentSport === '__live') {
        if (!m.isLive) return false;
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

  // === ROUTING ===

  function parseRoute() {
    var qs = new URLSearchParams(location.search);
    if (qs.get('match')) return { view: 'match', matchId: qs.get('match') };
    if (qs.get('sport')) return { view: 'sport', sport: qs.get('sport') };
    return { view: 'home' };
  }

  function applyRoute(pushHist) {
    var r = parseRoute();
    view = r.view;
    if (view === 'sport') {
      currentSport = r.sport || 'all';
      currentLeague = 'all';
      detailMatch = null;
    } else if (view === 'home') {
      currentSport = 'all';
      detailMatch = null;
    } else if (view === 'match') {
      // detailMatch is populated by renderDetail() once we find it in allMatches
    }
    renderForView();
  }

  function goToHome() {
    history.pushState({}, '', 'sport.html');
    applyRoute(true);
  }
  function goToSport(sportId) {
    history.pushState({}, '', 'sport.html?sport=' + encodeURIComponent(sportId));
    applyRoute(true);
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  function goToMatch(m) {
    var mid = m.id || normalizeTitle(m.title) || 'unknown';
    detailMatch = m;
    history.pushState({}, '', 'sport.html?match=' + encodeURIComponent(mid));
    view = 'match';
    renderForView();
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }
  function goBack() {
    if (history.length > 1) history.back();
    else goToHome();
  }

  // Dispatcher — renders the right chrome + body for the current view
  function renderForView() {
    var stickybar = document.querySelector('.live-stickybar');
    if (view === 'match') {
      if (stickybar) stickybar.style.display = 'none';
      hideAuxBars(true);
      renderPageHead();
      renderDetailView();
    } else if (view === 'sport') {
      if (stickybar) stickybar.style.display = '';
      hideAuxBars(false);
      renderPageHead();
      renderTabs();
      renderLeagueFilter();
      renderMatches();
    } else {
      if (stickybar) stickybar.style.display = '';
      hideAuxBars(false);
      renderPageHead();
      renderTabs();
      renderLeagueFilter();
      renderMatches();
    }
  }

  function hideAuxBars(hide) {
    var ids = ['live-date-mount', 'live-league-mount', 'live-search-mount', 'live-refresh-mount'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.style.display = hide ? 'none' : '';
    });
  }

  // === PAGE HEAD (changes per view) ===
  function renderPageHead() {
    var mount = document.getElementById('live-page-head');
    if (!mount) return;
    mount.innerHTML = '';

    if (view === 'home') {
      var head = document.createElement('div');
      head.className = 'pagehead';
      head.innerHTML =
        '<div class="pagehead__eyebrow">' + lt('live.page.eyebrow', 'Live') + '</div>' +
        '<h1 class="pagehead__title">' + lt('live.page.title', 'Sports') + '</h1>' +
        '<p class="pagehead__sub">' + lt('live.page.subtitle', "Live matches and today's schedule — football, NBA, NFL, F1, and more.") + '</p>';
      mount.appendChild(head);
    } else if (view === 'sport') {
      var icon = currentSport === '__fav' ? '⭐' : currentSport === '__live' ? '' : catIcon(currentSport);
      var label = currentSport === '__fav' ? lt('live.tabs.favorites', 'My Teams')
                 : currentSport === '__live' ? lt('live.sections.liveNow', 'Live Now')
                 : catLabel(currentSport);
      var count = filtered().length;

      var head = document.createElement('div');
      head.className = 'live-sport-header';

      var eyebrow = document.createElement('div');
      eyebrow.className = 'live-sport-header__eyebrow';
      eyebrow.innerHTML = '<a href="#" class="live-detail__back" style="margin:0 0 8px;display:inline-flex">' + lt('live.back', 'Back to live') + '</a>';
      eyebrow.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); goToHome(); });
      head.appendChild(eyebrow);

      var title = document.createElement('h1');
      title.className = 'live-sport-header__title';
      if (icon) {
        var ico = document.createElement('span');
        ico.className = 'live-sport-header__title-icon';
        ico.textContent = icon;
        title.appendChild(ico);
      }
      title.appendChild(document.createTextNode(label));
      head.appendChild(title);

      var sub = document.createElement('div');
      sub.className = 'live-sport-header__sub';
      sub.textContent = count + ' ' + (count === 1 ? lt('live.sport.match', 'match') : lt('live.sport.matches', 'matches')) + ' ' + (currentDate === 'today' ? lt('live.date.today', 'today') : currentDate === 'tomorrow' ? lt('live.date.tomorrow', 'tomorrow') : lt('live.date.yesterday', 'yesterday'));
      head.appendChild(sub);
      mount.appendChild(head);
    }
    // 'match' view doesn't use a pagehead — its header lives in the detail view
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
        renderDatePicker();
        showSkeleton();
        Promise.all([loadMatches(), refreshLiveScores()]).then(function () {
          renderForView();
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
        currentLeague = 'all';
        if (tab.id === 'all') goToHome();
        else goToSport(tab.id);
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
        if (searchQuery && view === 'sport' && currentSport !== '__fav') {
          // jump back to home view (URL change) but keep the search applied
          history.replaceState({}, '', 'sport.html');
          view = 'home';
          currentSport = 'all';
          currentLeague = 'all';
          renderPageHead();
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
    var html = '';
    for (var k = 0; k < 2; k++) {
      html += '<div class="live-section"><div class="row__head" style="padding:0 var(--pad-x);margin-bottom:12px"><span class="skeleton" style="width:170px;height:24px"></span></div><div class="match-grid">';
      for (var i = 0; i < 4; i++) {
        html += '<div class="match-card"><div class="skeleton skeleton-line" style="width:50%;height:10px"></div><div class="skeleton skeleton-line" style="width:90%;height:14px"></div><div class="skeleton skeleton-line" style="width:70%;height:11px"></div><div class="skeleton skeleton-line" style="width:60%;height:11px"></div><div class="skeleton skeleton-line" style="width:40%;height:10px"></div></div>';
      }
      html += '</div></div>';
    }
    mount.innerHTML = html;
  }

  // === VIEW: HOME (sport-grouped) / SPORT (single grid) ===

  // small helper to render an empty-state block
  function renderEmpty(mount, kind) {
    var empty = document.createElement('div');
    empty.className = 'live-empty';
    var icon = document.createElement('span');
    icon.className = 'live-empty__icon';
    icon.textContent = kind === 'fav' ? '⭐'
                     : kind === 'search' ? '🔍'
                     : '📺';
    empty.appendChild(icon);
    var title = document.createElement('div');
    title.className = 'live-empty__title';
    title.textContent = kind === 'search' ? (lt('live.empty.noResults', 'No matches found for') + ' "' + searchQuery + '"')
                      : kind === 'fav' ? lt('live.empty.noFavorites', 'No matches for your favorite teams today.')
                      : lt('live.empty.noMatches', 'No matches scheduled right now.');
    empty.appendChild(title);
    var sub = document.createElement('div');
    sub.className = 'live-empty__sub';
    sub.textContent = kind === 'fav' ? lt('live.empty.favHint', 'Star a team on any card to track it here.')
                    : kind === 'search' ? lt('live.empty.searchHint', 'Try a different team, league, or sport.')
                    : lt('live.empty.checkBack', 'Check back later or pick a different date.');
    empty.appendChild(sub);
    mount.appendChild(empty);
  }

  function renderMatches() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;
    mount.innerHTML = '';

    var list = filtered();
    list.sort(function (a, b) {
      var aFav = matchHasFavorite(a) ? 1 : 0;
      var bFav = matchHasFavorite(b) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return (a.date || 0) - (b.date || 0);
    });

    if (!list.length) {
      var kind = searchQuery ? 'search' : currentSport === '__fav' ? 'fav' : 'none';
      renderEmpty(mount, kind);
      return;
    }

    // SPORT VIEW or SEARCH or FAVS — flat grid, no sport-grouping
    if (currentSport !== 'all' || searchQuery) {
      renderFlatSection(mount, list);
      return;
    }

    // HOME VIEW — Hero + Live rail + per-sport sections
    var favs = list.filter(matchHasFavorite);
    var rest = list.filter(function (m) { return !matchHasFavorite(m); });
    var liveMatches = rest.filter(function (m) { return m.isLive; });
    var upcoming   = rest.filter(function (m) { return !m.isLive; });

    // Pick a hero match: prefer a live match with a recognised league + sources,
    // else the soonest upcoming match with sources.
    var heroPool = liveMatches.concat(upcoming);
    var heroMatch = heroPool.find(function (m) {
      return leagueColor((m.league || '') + ' ' + (m.title || ''))
          && srcCountFor(m) > 0;
    }) || heroPool.find(function (m) { return srcCountFor(m) > 0; }) || heroPool[0];
    if (heroMatch && currentDate === 'today') {
      appendHero(mount, heroMatch);
      // Avoid duplicating the hero card lower on the page
      liveMatches = liveMatches.filter(function (m) { return m !== heroMatch; });
      upcoming    = upcoming.filter(function (m) { return m !== heroMatch; });
    }

    if (favs.length) {
      appendSection(mount, {
        title: lt('live.sections.favorites', 'My Teams'),
        icon: '⭐',
        kind: 'fav',
        items: favs,
        max: 8,
      });
    }
    if (liveMatches.length) {
      appendLiveRail(mount, liveMatches);
    }

    // group upcoming by sport, ordered by sport count desc
    var bySport = {};
    upcoming.forEach(function (m) {
      var c = m.category || 'other';
      if (!bySport[c]) bySport[c] = [];
      bySport[c].push(m);
    });
    var sportOrder = Object.keys(bySport).sort(function (a, b) { return bySport[b].length - bySport[a].length; });
    sportOrder.forEach(function (s) {
      appendSection(mount, {
        title: catLabel(s),
        icon: catIcon(s),
        kind: 'sport',
        items: bySport[s],
        max: 4,
        sportId: s,
      });
    });
  }

  function renderFlatSection(mount, items) {
    var grid = document.createElement('div');
    grid.className = 'match-grid';
    items.forEach(function (m) { grid.appendChild(makeCard(m)); });
    mount.appendChild(grid);
  }

  function appendSection(mount, opts) {
    var sec = document.createElement('div');
    sec.className = 'live-section' + (opts.kind === 'live' ? ' live-section--live' : '');

    var head = document.createElement('div');
    head.className = 'row__head';

    var titleEl = document.createElement('h2');
    titleEl.className = 'live-section__title';
    var iconEl = document.createElement('span');
    iconEl.className = 'live-section__icon';
    if (opts.kind === 'live') {
      // styled via CSS as a pulsing red dot
    } else if (opts.icon) {
      iconEl.textContent = opts.icon;
    }
    titleEl.appendChild(iconEl);
    titleEl.appendChild(document.createTextNode(' ' + opts.title + ' '));
    var cnt = document.createElement('span');
    cnt.className = 'live-section__count';
    cnt.textContent = opts.items.length;
    titleEl.appendChild(cnt);
    head.appendChild(titleEl);

    // "View all" link — only when there's more than `max` items, and we have a sport to link to
    if (opts.items.length > opts.max && (opts.sportId || opts.kind === 'fav' || opts.kind === 'live')) {
      var see = document.createElement('a');
      see.className = 'live-section__viewall';
      see.href = '#';
      see.textContent = lt('live.viewAll', 'View all');
      see.addEventListener('click', function (e) {
        e.preventDefault();
        if (opts.sportId) goToSport(opts.sportId);
        else if (opts.kind === 'fav') goToSport('__fav');
        else if (opts.kind === 'live') goToSport('__live');
      });
      head.appendChild(see);
    }
    sec.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'match-grid';
    opts.items.slice(0, opts.max).forEach(function (m) { grid.appendChild(makeCard(m)); });
    sec.appendChild(grid);
    mount.appendChild(sec);
  }

  function srcCountFor(m) {
    if (!m) return 0;
    if (m.sources && m.sources.length) return m.sources.length;
    if (m.iframes && m.iframes.length) return m.iframes.length;
    if (m.channels && m.channels.length) return m.channels.length;
    return 0;
  }

  // === HERO BANNER (home view, featured match) ===
  function appendHero(mount, m) {
    var hero = document.createElement('div');
    hero.className = 'live-hero';
    hero.setAttribute('role', 'button');
    hero.setAttribute('tabindex', '0');
    hero.setAttribute('aria-label', 'Featured: ' + (m.title || 'live match'));
    hero.dataset.sportGlyph = catIcon(m.category);

    var lc = leagueColor((m.league || '') + ' ' + (m.title || ''));
    if (lc) hero.style.setProperty('--league-color', lc);
    else {
      // fall back to the sport color from CSS
      var sportColors = {
        football: '#22c55e', basketball: '#f97316', 'american-football': '#ef4444',
        tennis: '#a3e635', baseball: '#f59e0b', hockey: '#3b82f6',
        motorsports: '#f87171', fight: '#ec4899', rugby: '#d97706',
        cricket: '#10b981', volleyball: '#8b5cf6', badminton: '#eab308',
        golf: '#4ade80', afl: '#c2410c', darts: '#f43f5e',
      };
      hero.style.setProperty('--league-color', sportColors[m.category] || '#94a3b8');
    }

    var inner = document.createElement('div');
    inner.className = 'live-hero__inner';

    // top chips: LIVE / sport / league
    var top = document.createElement('div');
    top.className = 'live-hero__top';

    if (m.isLive) {
      var liveChip = document.createElement('span');
      liveChip.className = 'live-hero__chip live-hero__chip--live';
      liveChip.innerHTML = '<span class="live-dot"></span> ' + lt('live.status.live', 'LIVE');
      top.appendChild(liveChip);
    } else if (m.date) {
      var diff = m.date - Date.now();
      if (diff > 0) {
        var startsIn = document.createElement('span');
        startsIn.className = 'live-hero__chip';
        startsIn.textContent = fmtStartsIn(diff) + ' · ' + fmtAbsTime(m.date);
        top.appendChild(startsIn);
      }
    }

    var sportChip = document.createElement('span');
    sportChip.className = 'live-hero__chip';
    sportChip.textContent = catIcon(m.category) + ' ' + catLabel(m.category);
    top.appendChild(sportChip);

    if ((m.league || '').trim()) {
      var leagueChip = document.createElement('span');
      leagueChip.className = 'live-hero__chip live-hero__chip--league';
      leagueChip.textContent = m.league;
      top.appendChild(leagueChip);
    }
    inner.appendChild(top);

    // title + teams
    var title = document.createElement('h2');
    title.className = 'live-hero__title';
    title.textContent = m.title || lt('live.player.fallbackTitle', 'Live Stream');
    inner.appendChild(title);

    var teams = extractTeams(m.title);
    var liveData = scoreFor(m);
    if (teams.length === 2) {
      var teamsRow = document.createElement('div');
      teamsRow.className = 'live-hero__teams';

      var hb = (liveData && liveData.badgeHome) || m.homeBadgeUrl;
      var ab = (liveData && liveData.badgeAway) || m.awayBadgeUrl;
      var hn = (liveData && liveData.homeName) || teams[0];
      var an = (liveData && liveData.awayName) || teams[1];

      teamsRow.appendChild(makeHeroTeam(hn, hb));
      if (liveData && (liveData.home != null || liveData.away != null)) {
        var score = document.createElement('span');
        score.className = 'live-hero__score';
        score.textContent = (liveData.home != null ? liveData.home : '–') + ' – ' + (liveData.away != null ? liveData.away : '–');
        teamsRow.appendChild(score);
      } else {
        var vs = document.createElement('span');
        vs.className = 'live-hero__vs';
        vs.textContent = 'VS';
        teamsRow.appendChild(vs);
      }
      teamsRow.appendChild(makeHeroTeam(an, ab));
      inner.appendChild(teamsRow);
    }

    // meta line
    var meta = document.createElement('div');
    meta.className = 'live-hero__meta';
    var src = srcCountFor(m);
    if (src > 0) {
      meta.innerHTML = '<strong>' + src + '</strong> ' + (src === 1
        ? lt('live.streams.sourceOne', 'source')
        : lt('live.streams.sources', 'sources'));
    }
    inner.appendChild(meta);

    // CTA
    var cta = document.createElement('span');
    cta.className = 'live-hero__cta';
    cta.innerHTML = '<span class="live-hero__cta-icon">▶</span> ' +
      (m.isLive ? lt('live.streams.watchLive', 'Watch live') : lt('live.streams.watch', 'Watch'));
    inner.appendChild(cta);

    hero.appendChild(inner);
    hero.addEventListener('click', function () { goToMatch(m); });
    hero.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToMatch(m); }
    });
    mount.appendChild(hero);
  }

  function makeHeroTeam(name, badgeUrl) {
    var t = document.createElement('span');
    t.className = 'live-hero__team';
    if (badgeUrl) {
      var img = document.createElement('img');
      img.src = badgeUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'live-hero__team-badge';
      img.onerror = function () {
        var ph = document.createElement('span');
        ph.className = 'live-hero__team-badge live-hero__team-badge--ph';
        ph.textContent = (name || '?').slice(0, 2).toUpperCase();
        img.replaceWith(ph);
      };
      t.appendChild(img);
    } else {
      var ph = document.createElement('span');
      ph.className = 'live-hero__team-badge live-hero__team-badge--ph';
      ph.textContent = (name || '?').slice(0, 2).toUpperCase();
      t.appendChild(ph);
    }
    var n = document.createElement('span');
    n.textContent = name || '';
    t.appendChild(n);
    return t;
  }

  function fmtStartsIn(ms) {
    var mins = Math.round(ms / 60000);
    if (mins < 60) return mins + 'm';
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    return h + 'h' + (m ? (' ' + m + 'm') : '');
  }

  // === LIVE NOW horizontal rail ===
  function appendLiveRail(mount, items) {
    var sec = document.createElement('div');
    sec.className = 'live-section live-section--live live-rail';

    var head = document.createElement('div');
    head.className = 'row__head';
    var titleEl = document.createElement('h2');
    titleEl.className = 'live-section__title';
    var iconEl = document.createElement('span');
    iconEl.className = 'live-section__icon';
    titleEl.appendChild(iconEl);
    titleEl.appendChild(document.createTextNode(' ' + lt('live.sections.liveNow', 'Live Now') + ' '));
    var cnt = document.createElement('span');
    cnt.className = 'live-section__count';
    cnt.textContent = items.length;
    titleEl.appendChild(cnt);
    head.appendChild(titleEl);

    if (items.length > 8) {
      var see = document.createElement('a');
      see.className = 'live-section__viewall';
      see.href = '#';
      see.textContent = lt('live.viewAll', 'View all');
      see.addEventListener('click', function (e) { e.preventDefault(); goToSport('__live'); });
      head.appendChild(see);
    }
    sec.appendChild(head);

    var scroller = document.createElement('div');
    scroller.className = 'live-rail__scroller';
    items.slice(0, 12).forEach(function (m) { scroller.appendChild(makeCard(m)); });
    sec.appendChild(scroller);
    mount.appendChild(sec);
  }

  // small umbrella rerender (used after favorite toggles)
  function rerenderAll() {
    renderTabs();
    if (view === 'home' || view === 'sport') renderMatches();
  }

  function makeCard(m) {
    var card = document.createElement('article');
    card.className = 'match-card' + (m.isLive ? ' match-card--live' : '');
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', (m.title || '') + (m.league ? ', ' + m.league : ''));
    card.dataset.sport = m.category || 'other';
    card.dataset.sportIcon = catIcon(m.category);
    card.__match = m;

    // league color tint (falls back to sport color via CSS var inheritance)
    var lc = leagueColor((m.league || '') + ' ' + (m.title || ''));
    if (lc) card.style.setProperty('--league-color', lc);

    var liveData = scoreFor(m);
    var teams = extractTeams(m.title);

    // --- TOP ROW: sport tag + status pill + (favorite star pushed to right) ---
    var top = document.createElement('div');
    top.className = 'match-card__top';

    var sportEl = document.createElement('span');
    sportEl.className = 'match-card__sport';
    var sportIco = document.createElement('span');
    sportIco.className = 'match-card__sport-ico';
    sportIco.textContent = catIcon(m.category);
    var sportText = document.createElement('span');
    sportText.className = 'match-card__sport-text';
    sportText.textContent = catLabel(m.category);
    sportEl.appendChild(sportIco);
    sportEl.appendChild(sportText);
    top.appendChild(sportEl);

    // status pill OR upcoming time
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
    } else if (m.date) {
      // upcoming: show absolute time in the pill slot
      var timePill = document.createElement('span');
      timePill.className = 'match-card__status';
      timePill.textContent = fmtAbsTime(m.date);
      if ((m.date - Date.now()) < 30 * 60000 && (m.date - Date.now()) > 0) {
        timePill.style.color = 'var(--accent)';
      }
      top.appendChild(timePill);
    }

    // favorite star (only when we have two-team title)
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
        rerenderAll();
      });
      top.appendChild(star);
    }
    card.appendChild(top);

    // --- TITLE ---
    var title = document.createElement('h3');
    title.className = 'match-card__title';
    title.textContent = m.title || lt('live.player.fallbackTitle', 'Live Stream');
    card.appendChild(title);

    // --- TEAM ROWS (only when we have two teams) ---
    if (teams.length === 2) {
      var teamsWrap = document.createElement('div');
      teamsWrap.className = 'match-card__teams';
      teamsWrap.dataset.scoreKey = normalizeTitle(m.title);

      var homeBadge = (liveData && liveData.badgeHome) || m.homeBadgeUrl;
      var awayBadge = (liveData && liveData.badgeAway) || m.awayBadgeUrl;
      var homeName = (liveData && liveData.homeName) || teams[0];
      var awayName = (liveData && liveData.awayName) || teams[1];

      var ico = catIcon(m.category);
      teamsWrap.appendChild(makeTeamRow(homeName, homeBadge, liveData ? liveData.home : null, ico));
      teamsWrap.appendChild(makeTeamRow(awayName, awayBadge, liveData ? liveData.away : null, ico));
      card.appendChild(teamsWrap);
    }

    // --- LEAGUE ---
    if ((m.league || '').trim()) {
      var league = document.createElement('div');
      league.className = 'match-card__league';
      league.textContent = m.league;
      card.appendChild(league);
    }

    // --- FOOTER: source count + Watch + small action icons ---
    var bot = document.createElement('div');
    bot.className = 'match-card__bot';

    var srcCount = m.sources ? m.sources.length : (m.iframes ? m.iframes.length : (m.channels ? m.channels.length : 0));
    var hasHD = (m.sources || []).some(function (s) { return s.hd; }) || (m.iframes || []).some(function (s) { return s.hd; });

    var srcEl = document.createElement('span');
    srcEl.className = 'match-card__src-count';
    if (currentDate === 'yesterday' && !srcCount) {
      srcEl.textContent = lt('live.streams.finished', 'Finished');
    } else if (srcCount > 0) {
      srcEl.innerHTML = '<strong>' + srcCount + '</strong> ' + (srcCount === 1
        ? lt('live.streams.sourceOne', 'source')
        : lt('live.streams.sources', 'sources'));
    } else {
      srcEl.textContent = '';
    }
    bot.appendChild(srcEl);

    var rightGroup = document.createElement('span');
    rightGroup.style.cssText = 'display:inline-flex;align-items:center;gap:8px';

    // tiny action icons (only when relevant)
    var isUpcoming = !m.isLive && m.date && (m.date - Date.now()) > 0 && currentDate !== 'yesterday';
    if (isUpcoming) {
      var actGroup = document.createElement('span');
      actGroup.className = 'match-card__actions';

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
      rightGroup.appendChild(actGroup);
    }

    // Watch CTA
    if (srcCount > 0 || currentDate !== 'yesterday') {
      var watch = document.createElement('span');
      watch.className = 'match-card__watch';
      var hdTag = hasHD ? '<span class="match-card__hd">HD</span> ' : '';
      watch.innerHTML = hdTag + '<span class="match-card__watch-icon">▶</span> ' + lt('live.streams.watch', 'Watch');
      rightGroup.appendChild(watch);
    }
    bot.appendChild(rightGroup);
    card.appendChild(bot);

    card.addEventListener('click', function () { goToMatch(m); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToMatch(m); }
    });

    return card;
  }

  // small helper for the two team rows on a card
  function makeTeamRow(name, badgeUrl, score, sportIcon) {
    var row = document.createElement('div');
    row.className = 'match-card__team';
    if (badgeUrl) {
      var img = document.createElement('img');
      img.src = badgeUrl;
      img.alt = '';
      img.loading = 'lazy';
      img.className = 'match-card__team-badge';
      img.onerror = function () { img.replaceWith(makePlaceholderBadge(sportIcon)); };
      row.appendChild(img);
    } else {
      row.appendChild(makePlaceholderBadge(sportIcon));
    }
    var n = document.createElement('span');
    n.className = 'match-card__team-name';
    n.textContent = name || '';
    row.appendChild(n);
    if (score != null) {
      var s = document.createElement('span');
      s.className = 'match-card__team-score';
      s.textContent = score;
      row.appendChild(s);
    }
    return row;
  }
  function makePlaceholderBadge(sportIcon) {
    var d = document.createElement('span');
    d.className = 'match-card__team-badge-placeholder';
    if (sportIcon) d.textContent = sportIcon;
    return d;
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
      renderForView();
    } finally {
      if (btn) { btn.textContent = lt('live.refresh.button', '↻ Refresh now'); btn.disabled = false; }
      _refreshInFlight = false;
      startRefreshCountdown();
    }
  }

  // === PLAYER (inline detail page — no modal in v3) ===

  // Switch active source via keyboard ←/→
  function switchSourceByOffset(offset) {
    var btns = document.querySelectorAll('#live-sources .live-src-btn');
    if (!btns.length) return;
    var idx = 0;
    btns.forEach(function (b, i) { if (b.classList.contains('live-src-btn--active')) idx = i; });
    var next = (idx + offset + btns.length) % btns.length;
    btns[next].click();
  }

  // Toggle theater mode (CSS class on the detail player frame)
  function toggleTheater() {
    var wrap = document.getElementById('live-player-wrap');
    if (wrap) wrap.parentElement.classList.toggle('live-detail--theater');
  }

  // Populates the player + source picker in the detail view. Requires the
  // detail DOM (built by renderDetailView) to already exist in the page.
  async function _populatePlayer(match) {
    var seq = ++_openPlayerSeq;
    var sportEl = document.getElementById('live-detail-sport');
    var titleEl = document.getElementById('live-detail-title');
    var leagueEl = document.getElementById('live-detail-league');
    if (sportEl) sportEl.textContent = catIcon(match.category) + ' ' + catLabel(match.category);
    if (titleEl) titleEl.textContent = match.title || lt('live.player.fallbackTitle', 'Live Stream');
    if (leagueEl) leagueEl.textContent = match.league || '';

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

    // Collapsible source picker: a single "current source" button that
    // expands a scrollable list. Replaces the wrap-of-pills row that ate
    // half the mobile screen.
    var currentUrl = null;
    var picker = null;
    var pickerCurrent = null;
    var pickerList = null;

    function buildSourceMeta(src) {
      // Build a styled label fragment (flag + HD chip + name + vote score).
      var frag = document.createDocumentFragment();
      if (src._lang && src._lang.flag) {
        var f = document.createElement('span');
        f.className = 'live-src-flag';
        f.textContent = src._lang.flag;
        frag.appendChild(f);
      }
      if (src.hd) {
        var hd = document.createElement('span');
        hd.className = 'live-src-hd';
        hd.textContent = 'HD';
        frag.appendChild(hd);
      }
      var name = document.createElement('span');
      name.className = 'live-src-name';
      name.textContent = src.label;
      frag.appendChild(name);
      var score = voteScore(src.url);
      if (score !== 0) {
        var s = document.createElement('span');
        s.className = 'live-src-score live-src-score--' + (score > 0 ? 'up' : 'down');
        s.textContent = score > 0 ? '+' + score : String(score);
        frag.appendChild(s);
      }
      return frag;
    }

    function setOpen(open) {
      if (!picker) return;
      picker.classList.toggle('live-src-picker--open', !!open);
      pickerCurrent.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function selectSource(src) {
      currentUrl = src.url;
      spawnIframe(src.url);
      paintCurrent(src);
      paintList();
      setOpen(false);
    }

    function paintCurrent(src) {
      pickerCurrent.innerHTML = '';
      var meta = document.createElement('span');
      meta.className = 'live-src-picker__meta';
      meta.appendChild(buildSourceMeta(src));
      pickerCurrent.appendChild(meta);
      var chev = document.createElement('span');
      chev.className = 'live-src-picker__chev';
      chev.setAttribute('aria-hidden', 'true');
      chev.textContent = '▾';
      pickerCurrent.appendChild(chev);
    }

    function paintList() {
      pickerList.innerHTML = '';
      visibleSources.forEach(function (src) {
        var row = document.createElement('div');
        row.className = 'live-src-row' + (src.url === currentUrl ? ' live-src-row--active' : '');
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', src.url === currentUrl ? 'true' : 'false');

        var pickBtn = document.createElement('button');
        pickBtn.type = 'button';
        pickBtn.className = 'live-src-row__pick';
        pickBtn.appendChild(buildSourceMeta(src));
        pickBtn.addEventListener('click', function () { selectSource(src); });

        var voteUp = document.createElement('button');
        voteUp.type = 'button';
        voteUp.className = 'live-src-vote live-src-vote--up';
        voteUp.textContent = '👍';
        voteUp.title = lt('live.vote.up', 'This stream works');
        voteUp.setAttribute('aria-label', voteUp.title);
        voteUp.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'up'); paintCurrent(visibleSources.find(function (x) { return x.url === currentUrl; }) || src); paintList(); });

        var voteDown = document.createElement('button');
        voteDown.type = 'button';
        voteDown.className = 'live-src-vote live-src-vote--down';
        voteDown.textContent = '👎';
        voteDown.title = lt('live.vote.down', 'This stream is broken');
        voteDown.setAttribute('aria-label', voteDown.title);
        voteDown.addEventListener('click', function (e) { e.stopPropagation(); voteSource(src.url, 'down'); paintCurrent(visibleSources.find(function (x) { return x.url === currentUrl; }) || src); paintList(); });

        row.appendChild(pickBtn);
        row.appendChild(voteUp);
        row.appendChild(voteDown);
        pickerList.appendChild(row);
      });
    }

    function renderFilteredSources() {
      // Remove existing picker (keep the language filter bar)
      var existing = wrap.querySelector('.live-src-picker');
      if (existing) existing.remove();

      visibleSources = sortSourcesByVotes(initialLang === 'all'
        ? sources
        : sources.filter(function (s) { return s._lang && s._lang.code === initialLang; }));
      if (!visibleSources.length) visibleSources = sortSourcesByVotes(sources);

      loading.style.display = 'none';

      // Pick first source; reuse current selection if it survived the filter
      var keep = currentUrl && visibleSources.find(function (s) { return s.url === currentUrl; });
      var initial = keep || visibleSources[0];
      currentUrl = initial.url;
      spawnIframe(initial.url);

      picker = document.createElement('div');
      picker.className = 'live-src-picker';
      pickerCurrent = document.createElement('button');
      pickerCurrent.type = 'button';
      pickerCurrent.className = 'live-src-picker__current';
      pickerCurrent.setAttribute('aria-haspopup', 'listbox');
      pickerCurrent.setAttribute('aria-expanded', 'false');
      pickerCurrent.setAttribute('aria-label', lt('live.player.sources', 'Sources'));
      pickerCurrent.addEventListener('click', function (e) {
        e.stopPropagation();
        setOpen(!picker.classList.contains('live-src-picker--open'));
      });
      pickerList = document.createElement('div');
      pickerList.className = 'live-src-picker__list';
      pickerList.setAttribute('role', 'listbox');

      picker.appendChild(pickerCurrent);
      picker.appendChild(pickerList);
      wrap.appendChild(picker);

      paintCurrent(initial);
      paintList();
    }

    // Close on outside click + Escape (set up once per render)
    if (!wrap.__pickerHandlers) {
      wrap.__pickerHandlers = true;
      document.addEventListener('click', function (e) {
        if (picker && !picker.contains(e.target)) setOpen(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && picker && picker.classList.contains('live-src-picker--open')) {
          setOpen(false);
          pickerCurrent.focus();
        }
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

  // === DETAIL VIEW (replaces matches-mount with the match page) ===

  // Look up a match in allMatches by stable ID (or normalized title fallback)
  function findMatchById(id) {
    if (!id) return null;
    for (var i = 0; i < allMatches.length; i++) {
      var m = allMatches[i];
      var mid = m.id || normalizeTitle(m.title);
      if (mid === id) return m;
    }
    return null;
  }

  function renderDetailView() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;

    var match = detailMatch;
    if (!match) {
      // Was loaded from a deep link — try to find by URL param now that matches are loaded
      var qs = new URLSearchParams(location.search);
      match = findMatchById(qs.get('match'));
      detailMatch = match;
    }

    if (!match) {
      // Still no match — show a "match not found" state
      mount.innerHTML = '';
      var notFound = document.createElement('div');
      notFound.className = 'live-detail';
      notFound.innerHTML =
        '<button class="live-detail__back" type="button">' + lt('live.back', 'Back to live') + '</button>' +
        '<div class="live-empty">' +
          '<span class="live-empty__icon">🔍</span>' +
          '<div class="live-empty__title">' + lt('live.detail.notFound', 'Match not found') + '</div>' +
          '<div class="live-empty__sub">' + lt('live.detail.notFoundSub', 'It may have ended or been removed.') + '</div>' +
        '</div>';
      notFound.querySelector('.live-detail__back').addEventListener('click', goToHome);
      mount.appendChild(notFound);
      return;
    }

    mount.innerHTML = '';
    var detail = document.createElement('div');
    detail.className = 'live-detail';

    // back button
    var back = document.createElement('button');
    back.className = 'live-detail__back';
    back.type = 'button';
    back.textContent = lt('live.back', 'Back to live');
    back.addEventListener('click', goBack);
    detail.appendChild(back);

    // sport tag
    var sportEl = document.createElement('div');
    sportEl.className = 'live-detail__sport';
    sportEl.id = 'live-detail-sport';
    sportEl.textContent = catIcon(match.category) + ' ' + catLabel(match.category);
    detail.appendChild(sportEl);

    // title
    var titleEl = document.createElement('h1');
    titleEl.className = 'live-detail__title';
    titleEl.id = 'live-detail-title';
    titleEl.textContent = match.title || lt('live.player.fallbackTitle', 'Live Stream');
    detail.appendChild(titleEl);

    // meta row: league / time / status
    var meta = document.createElement('div');
    meta.className = 'live-detail__meta';
    if (match.league) {
      var leaguePill = document.createElement('span');
      leaguePill.className = 'live-detail__meta-pill';
      leaguePill.id = 'live-detail-league';
      leaguePill.textContent = match.league;
      meta.appendChild(leaguePill);
    }
    var status = statusBadgeFor(match);
    if (status && status.key === 'live.status.live') {
      var livePill = document.createElement('span');
      livePill.className = 'live-detail__meta-pill live-detail__meta-pill--live';
      livePill.innerHTML = '<span class="live-dot"></span>' + status.label;
      meta.appendChild(livePill);
    } else if (match.date) {
      var timePill = document.createElement('span');
      timePill.className = 'live-detail__meta-pill';
      var diff = match.date - Date.now();
      var rel = fmtRelTime(match.date);
      // Don't say "Live now" in the meta pill when match isn't actually flagged live
      if (diff < 0) timePill.textContent = fmtAbsTime(match.date);
      else timePill.textContent = fmtAbsTime(match.date) + ' · ' + rel;
      meta.appendChild(timePill);
    }
    detail.appendChild(meta);

    // teams display
    var teams = extractTeams(match.title);
    if (teams.length === 2) {
      var liveData = scoreFor(match);
      var teamsRow = document.createElement('div');
      teamsRow.className = 'live-detail__teams';
      var homeBadge = (liveData && liveData.badgeHome) || match.homeBadgeUrl;
      var awayBadge = (liveData && liveData.badgeAway) || match.awayBadgeUrl;
      var homeName = (liveData && liveData.homeName) || teams[0];
      var awayName = (liveData && liveData.awayName) || teams[1];

      teamsRow.appendChild(makeDetailTeam(homeName, homeBadge, 'home', match.category));
      var center = document.createElement('div');
      if (liveData && (liveData.home != null || liveData.away != null)) {
        center.className = 'live-detail__score';
        center.textContent = (liveData.home == null ? '–' : liveData.home) + ' : ' + (liveData.away == null ? '–' : liveData.away);
      } else {
        center.className = 'live-detail__score live-detail__score--vs';
        center.textContent = 'VS';
      }
      teamsRow.appendChild(center);
      teamsRow.appendChild(makeDetailTeam(awayName, awayBadge, 'away', match.category));
      detail.appendChild(teamsRow);
    }

    // player frame
    var playerWrap = document.createElement('div');
    playerWrap.className = 'live-detail__player';
    playerWrap.id = 'live-player-wrap';
    var loading = document.createElement('div');
    loading.className = 'live-detail__player-loading';
    loading.id = 'live-player-loading';
    loading.textContent = lt('live.player.loading', 'Loading stream…');
    playerWrap.appendChild(loading);
    detail.appendChild(playerWrap);

    // source picker bar
    var srcBar = document.createElement('div');
    srcBar.className = 'live-detail__srcbar';
    var srcLabel = document.createElement('span');
    srcLabel.className = 'live-detail__src-label';
    srcLabel.textContent = lt('live.player.sources', 'Sources');
    var srcBtns = document.createElement('div');
    srcBtns.className = 'live-detail__sources';
    srcBtns.id = 'live-sources';
    srcBar.appendChild(srcLabel);
    srcBar.appendChild(srcBtns);
    detail.appendChild(srcBar);

    // action row: theater / share / calendar / remind
    var actions = document.createElement('div');
    actions.className = 'live-detail__actions';

    var theaterBtn = document.createElement('button');
    theaterBtn.className = 'live-detail__action';
    theaterBtn.type = 'button';
    theaterBtn.innerHTML = '⛶ ' + lt('live.player.theater', 'Theater');
    theaterBtn.title = lt('live.player.theaterHint', 'Theater mode (F)');
    theaterBtn.addEventListener('click', toggleTheater);
    actions.appendChild(theaterBtn);

    var shareBtn = document.createElement('button');
    shareBtn.className = 'live-detail__action';
    shareBtn.type = 'button';
    shareBtn.innerHTML = SHARE_SVG + ' ' + lt('live.share.share', 'Share');
    shareBtn.addEventListener('click', function () { shareMatch(match); });
    actions.appendChild(shareBtn);

    if (match.date && (match.date - Date.now()) > 0) {
      var calBtn = document.createElement('button');
      calBtn.className = 'live-detail__action';
      calBtn.type = 'button';
      calBtn.innerHTML = CAL_SVG + ' ' + lt('live.cal.add', 'Add to calendar');
      calBtn.addEventListener('click', function () { addToCalendar(match); });
      actions.appendChild(calBtn);

      var matchKey = match.id || normalizeTitle(match.title);
      var hasReminder = !!(reminders[matchKey] || savedReminders[matchKey]);
      var bellBtn = document.createElement('button');
      bellBtn.className = 'live-detail__action' + (hasReminder ? ' live-detail__action--active' : '');
      bellBtn.type = 'button';
      bellBtn.innerHTML = (hasReminder ? BELL_ACTIVE_SVG : BELL_SVG) + ' ' + (hasReminder ? lt('live.remind.cancel', 'Cancel reminder') : lt('live.remind.set', 'Remind me'));
      bellBtn.addEventListener('click', function () {
        toggleReminder(match, bellBtn);
        renderDetailView(); // redraw to update label
      });
      actions.appendChild(bellBtn);
    }
    detail.appendChild(actions);

    // related matches (same sport, excluding this one)
    var related = allMatches.filter(function (m) {
      return m.category === match.category && (m.id || normalizeTitle(m.title)) !== (match.id || normalizeTitle(match.title));
    }).slice(0, 8);
    if (related.length) {
      var relTitle = document.createElement('h2');
      relTitle.className = 'live-detail__related-title';
      relTitle.textContent = lt('live.detail.related', 'More in ') + catLabel(match.category);
      detail.appendChild(relTitle);

      var relGrid = document.createElement('div');
      relGrid.className = 'match-grid';
      relGrid.style.padding = '0';
      related.forEach(function (m) { relGrid.appendChild(makeCard(m)); });
      detail.appendChild(relGrid);
    }

    mount.appendChild(detail);

    // Now hand off to the existing source-fetching pipeline
    _populatePlayer(match);
  }

  function makeDetailTeam(name, badgeUrl, side, category) {
    var t = document.createElement('div');
    t.className = 'live-detail__team' + (side === 'away' ? ' live-detail__team--away' : '');
    if (badgeUrl) {
      var img = document.createElement('img');
      img.src = badgeUrl;
      img.alt = '';
      img.className = 'live-detail__team-badge';
      img.onerror = function () { img.replaceWith(makeDetailPlaceholder(category)); };
      t.appendChild(img);
    } else {
      t.appendChild(makeDetailPlaceholder(category));
    }
    var n = document.createElement('div');
    n.className = 'live-detail__team-name';
    n.textContent = name || '';
    t.appendChild(n);
    return t;
  }
  function makeDetailPlaceholder(category) {
    var p = document.createElement('div');
    p.className = 'live-detail__team-badge-placeholder';
    p.textContent = catIcon(category || 'other');
    return p;
  }

  // === INIT ===

  async function init() {
    // Wait for translations so the first render isn't full of English fallbacks
    if (window.i18n && window.i18n.ready) {
      try { await window.i18n.ready; } catch (e) { /* fall through with fallbacks */ }
    }

    if (window.renderTopNav) renderTopNav('live');
    if (window.renderBottomNav) renderBottomNav('live');
    if (window.renderFooter) renderFooter('footer-mount');

    renderDatePicker();
    renderSearch();
    renderRefreshBar();
    showSkeleton();
    restoreReminders();

    // Render the initial chrome based on URL before data lands so layout is stable
    var initialRoute = parseRoute();
    view = initialRoute.view;
    if (view === 'sport') {
      currentSport = initialRoute.sport || 'all';
    }
    renderPageHead();

    await Promise.all([loadMatches(), refreshLiveScores()]);

    applyRoute(false);
    startRefreshCountdown();
    startScoreTicker();

    // History navigation
    window.addEventListener('popstate', function () {
      // tear down any iframe before route changes
      var fr = document.querySelector('#live-player-wrap iframe');
      if (fr) fr.remove();
      detailMatch = null;
      applyRoute(false);
    });

    // Keyboard shortcuts on detail view
    document.addEventListener('keydown', function (e) {
      if (view !== 'match') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') goBack();
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleTheater(); }
      else if (e.key === 'ArrowRight') switchSourceByOffset(1);
      else if (e.key === 'ArrowLeft') switchSourceByOffset(-1);
    });

    // re-render dynamic text when user switches language
    window.addEventListener('eli6.langChanged', function () {
      if (window.renderTopNav) renderTopNav('live');
      if (window.renderBottomNav) renderBottomNav('live');
      renderDatePicker(); renderSearch(); renderRefreshBar();
      renderForView();
    });

    // PWA service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* swallow */ });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();

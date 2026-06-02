(function () {
  'use strict';

  var STREAMED = 'https://streamed.pk/api';
  var ESX = 'https://api.embedsportex.site/api';

  var SPORT_LABELS = {
    'football': 'Football',
    'basketball': 'Basketball',
    'american-football': 'NFL',
    'hockey': 'Hockey',
    'baseball': 'Baseball',
    'motorsports': 'F1 & Moto',
    'fight': 'UFC / Boxing',
    'tennis': 'Tennis',
    'cricket': 'Cricket',
    'rugby': 'Rugby',
    'golf': 'Golf',
    'afl': 'AFL',
    'darts': 'Darts',
    'billiards': 'Billiards',
  };

  var currentSport = 'all';
  var allMatches = [];

  // --- fetch ---

  async function fetchStreamed() {
    try {
      var [liveRes, todayRes] = await Promise.all([
        fetch(STREAMED + '/matches/live'),
        fetch(STREAMED + '/matches/all-today'),
      ]);
      var live = liveRes.ok ? (await liveRes.json() || []) : [];
      var today = todayRes.ok ? (await todayRes.json() || []) : [];
      var liveIds = new Set(live.map(function (m) { return m.id; }));
      return today.map(function (m) {
        return Object.assign({}, m, { isLive: liveIds.has(m.id), provider: 'streamed' });
      });
    } catch (e) {
      return [];
    }
  }

  function parseWIB(str) {
    if (!str) return 0;
    var parts = str.split(' ');
    var d = parts[0].split('-').map(Number);
    var t = (parts[1] || '00:00').split(':').map(Number);
    return Date.UTC(d[0], d[1] - 1, d[2], t[0] - 7, t[1]);
  }

  async function fetchESX() {
    try {
      var r = await fetch(ESX + '/streams');
      if (!r.ok) return [];
      var data = await r.json();
      var out = [];
      var now = Date.now();

      // Response may be array or object keyed by sport
      var items = Array.isArray(data) ? data : Object.values(data).flat();

      items.forEach(function (m) {
        var start = parseWIB(m.kickoff);
        var end = parseWIB(m.endTime) || (start + 3 * 3600000);
        out.push({
          id: 'esx-' + (m.slugkey || m.slug || Math.random()),
          title: m.tag || m.title || '',
          category: (m.sport || m.category || 'football').toLowerCase().replace(/\s+/g, '-'),
          league: m.league || '',
          date: start,
          isLive: now >= start && now <= end,
          provider: 'esx',
          iframes: m.iframes || [],
        });
      });
      return out;
    } catch (e) {
      return [];
    }
  }

  async function getStreamedEmbed(source, id) {
    try {
      var r = await fetch(STREAMED + '/stream/' + source + '/' + encodeURIComponent(id));
      if (!r.ok) return null;
      var streams = await r.json();
      if (!Array.isArray(streams) || !streams.length) return null;
      // sort HD first
      streams.sort(function (a, b) { return (b.hd ? 1 : 0) - (a.hd ? 1 : 0); });
      return streams[0].embedUrl || null;
    } catch (e) { return null; }
  }

  // --- render ---

  function fmtTime(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function sportLabel(cat) {
    return SPORT_LABELS[cat] || (cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, ' '));
  }

  function renderTabs(sports) {
    var mount = document.getElementById('sport-tabs-mount');
    if (!mount) return;
    var wrap = document.createElement('div');
    wrap.className = 'pills';

    var all = ['all'].concat(sports);
    all.forEach(function (s) {
      var btn = document.createElement('button');
      btn.className = 'pill' + (s === currentSport ? ' pill--active' : '');
      btn.textContent = s === 'all' ? 'All' : sportLabel(s);
      btn.addEventListener('click', function () {
        currentSport = s;
        wrap.querySelectorAll('.pill').forEach(function (b) { b.classList.remove('pill--active'); });
        btn.classList.add('pill--active');
        renderMatches();
      });
      wrap.appendChild(btn);
    });

    mount.innerHTML = '';
    mount.appendChild(wrap);
  }

  function renderMatches() {
    var mount = document.getElementById('matches-mount');
    if (!mount) return;

    var filtered = allMatches.filter(function (m) {
      return currentSport === 'all' || m.category === currentSport;
    });

    filtered.sort(function (a, b) {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      return (a.date || 0) - (b.date || 0);
    });

    mount.innerHTML = '';

    if (!filtered.length) {
      mount.innerHTML = '<p class="live-empty">No matches scheduled for today in this category.</p>';
      return;
    }

    var live = filtered.filter(function (m) { return m.isLive; });
    var upcoming = filtered.filter(function (m) { return !m.isLive; });

    if (live.length) {
      mount.appendChild(makeSection('Live Now', live));
    }
    if (upcoming.length) {
      mount.appendChild(makeSection("Today's Schedule", upcoming));
    }
  }

  function makeSection(label, matches) {
    var wrap = document.createElement('div');
    wrap.className = 'live-section';

    var head = document.createElement('div');
    head.className = 'row__head';
    var title = document.createElement('h2');
    title.className = 'row__title';
    title.textContent = label;
    head.appendChild(title);
    wrap.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'match-grid';
    matches.forEach(function (m) { grid.appendChild(makeCard(m)); });
    wrap.appendChild(grid);

    return wrap;
  }

  function makeCard(m) {
    var card = document.createElement('div');
    card.className = 'match-card' + (m.isLive ? ' match-card--live' : '');

    // top bar
    var top = document.createElement('div');
    top.className = 'match-card__top';

    if (m.isLive) {
      var dot = document.createElement('span');
      dot.className = 'live-dot';
      var lbl = document.createElement('span');
      lbl.className = 'live-label';
      lbl.textContent = 'LIVE';
      top.appendChild(dot);
      top.appendChild(lbl);
      var sep = document.createElement('span');
      sep.className = 'match-card__sep';
      sep.textContent = '·';
      top.appendChild(sep);
    }

    var cat = document.createElement('span');
    cat.className = 'match-card__cat';
    cat.textContent = sportLabel(m.category || '');
    top.appendChild(cat);

    // title
    var name = document.createElement('div');
    name.className = 'match-card__name';
    name.textContent = m.title || '';

    // league
    var league = document.createElement('div');
    league.className = 'match-card__league';
    league.textContent = m.league || '';

    // bottom
    var bot = document.createElement('div');
    bot.className = 'match-card__bot';

    var time = document.createElement('span');
    time.className = 'match-card__time';
    time.textContent = m.isLive ? 'Live now' : fmtTime(m.date);

    var srcCount = m.sources ? m.sources.length : (m.iframes ? m.iframes.length : 0);
    var play = document.createElement('span');
    play.className = 'match-card__play';
    play.innerHTML = '&#9654; ' + (srcCount > 1 ? srcCount + ' streams' : 'Watch');

    bot.appendChild(time);
    bot.appendChild(play);

    card.appendChild(top);
    card.appendChild(name);
    if ((m.league || '').trim()) card.appendChild(league);
    card.appendChild(bot);

    card.addEventListener('click', function () { openPlayer(m); });

    return card;
  }

  // --- player modal ---

  function ensureModal() {
    var modal = document.getElementById('live-modal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'live-modal';
    modal.className = 'live-modal';
    modal.hidden = true;

    var inner = document.createElement('div');
    inner.className = 'live-modal__inner';

    var hdr = document.createElement('div');
    hdr.className = 'live-modal__hdr';

    var titleEl = document.createElement('div');
    titleEl.className = 'live-modal__title';
    titleEl.id = 'live-modal-title';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'live-modal__close';
    closeBtn.innerHTML = '&#10005;';
    closeBtn.addEventListener('click', closePlayer);

    hdr.appendChild(titleEl);
    hdr.appendChild(closeBtn);

    var playerWrap = document.createElement('div');
    playerWrap.className = 'live-modal__player';

    var iframe = document.createElement('iframe');
    iframe.id = 'live-iframe';
    iframe.allowFullscreen = true;
    iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
    // no sandbox — sports embeds need unrestricted scripts
    playerWrap.appendChild(iframe);

    var sourcesEl = document.createElement('div');
    sourcesEl.className = 'live-modal__sources';
    sourcesEl.id = 'live-sources';

    inner.appendChild(hdr);
    inner.appendChild(playerWrap);
    inner.appendChild(sourcesEl);
    modal.appendChild(inner);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) closePlayer();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePlayer();
    });

    return modal;
  }

  async function openPlayer(match) {
    var modal = ensureModal();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    document.getElementById('live-modal-title').textContent = match.title || 'Live Stream';

    var sourcesEl = document.getElementById('live-sources');
    var iframe = document.getElementById('live-iframe');
    iframe.src = '';
    sourcesEl.innerHTML = '<span class="live-modal__loading">Loading streams…</span>';

    if (match.provider === 'streamed' && match.sources && match.sources.length) {
      var results = await Promise.all(
        match.sources.map(async function (src) {
          var url = await getStreamedEmbed(src.source, src.id);
          return { label: src.source.charAt(0).toUpperCase() + src.source.slice(1), url: url };
        })
      );
      var valid = results.filter(function (r) { return r.url; });
      renderSources(sourcesEl, iframe, valid);
      if (valid.length) iframe.src = valid[0].url;

    } else if (match.provider === 'esx' && match.iframes && match.iframes.length) {
      var sources = match.iframes.map(function (f, i) {
        return { label: f.server || ('Stream ' + (i + 1)), url: f.url };
      });
      renderSources(sourcesEl, iframe, sources);
      if (sources.length) iframe.src = sources[0].url;

    } else {
      sourcesEl.innerHTML = '<span class="live-modal__loading">No streams available for this match.</span>';
    }
  }

  function renderSources(wrap, iframe, sources) {
    wrap.innerHTML = '';
    if (!sources.length) {
      wrap.innerHTML = '<span class="live-modal__loading">No streams found.</span>';
      return;
    }
    sources.forEach(function (src, i) {
      var btn = document.createElement('button');
      btn.className = 'live-src-btn' + (i === 0 ? ' live-src-btn--active' : '');
      btn.textContent = src.label;
      btn.addEventListener('click', function () {
        wrap.querySelectorAll('.live-src-btn').forEach(function (b) { b.classList.remove('live-src-btn--active'); });
        btn.classList.add('live-src-btn--active');
        iframe.src = src.url;
      });
      wrap.appendChild(btn);
    });
  }

  function closePlayer() {
    var modal = document.getElementById('live-modal');
    if (modal) modal.hidden = true;
    var iframe = document.getElementById('live-iframe');
    if (iframe) iframe.src = '';
    document.body.style.overflow = '';
  }

  // --- init ---

  async function init() {
    if (window.renderTopNav) renderTopNav('live');
    if (window.renderBottomNav) renderBottomNav('live');
    if (window.renderFooter) renderFooter('footer-mount');

    var mount = document.getElementById('matches-mount');
    if (mount) mount.innerHTML = '<p class="live-empty">Loading matches…</p>';

    var [streamedMatches, esxMatches] = await Promise.all([fetchStreamed(), fetchESX()]);

    // merge — streamed.pk is primary, esx fills anything not already covered
    var seenTitles = new Set(streamedMatches.map(function (m) { return (m.title || '').toLowerCase().trim(); }));
    var esxNew = esxMatches.filter(function (m) { return !seenTitles.has((m.title || '').toLowerCase().trim()); });

    allMatches = streamedMatches.concat(esxNew);

    // collect unique sports in priority order
    var sportOrder = ['football', 'basketball', 'american-football', 'hockey', 'baseball', 'motorsports', 'fight', 'tennis', 'cricket', 'rugby'];
    var seen = new Set();
    var sports = [];
    // add in order first
    sportOrder.forEach(function (s) {
      if (allMatches.some(function (m) { return m.category === s; })) {
        seen.add(s);
        sports.push(s);
      }
    });
    // then anything else
    allMatches.forEach(function (m) {
      if (m.category && !seen.has(m.category)) {
        seen.add(m.category);
        sports.push(m.category);
      }
    });

    renderTabs(sports);
    renderMatches();
  }

  document.addEventListener('DOMContentLoaded', init);
})();

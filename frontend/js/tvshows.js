// ELI6 Movies — TV shows browse page

(function () {
  var TMDB_URL = window.TMDB_PROXY_URL || ((window.API_BASE_URL || '') + '/tmdb');

  function tr(key, fallback) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;
  }

  var GENRES = [
    { id: 10759, name: "Action & Adventure" },
    { id: 35,    name: "Comedy" },
    { id: 18,    name: "Drama" },
    { id: 10765, name: "Sci-Fi & Fantasy" },
    { id: 80,    name: "Crime" },
    { id: 9648,  name: "Mystery" },
    { id: 10762, name: "Kids" },
    { id: 10768, name: "War & Politics" },
    { id: 99,    name: "Documentary" },
  ];

  var TV_GENRE_KEYS = {
    10759: 'tvshows.sections.action',
    35:    'tvshows.sections.comedy',
    18:    'tvshows.sections.drama',
    10765: 'tvshows.sections.scifi',
    80:    'tvshows.sections.crime',
    9648:  'tvshows.sections.mystery',
    10762: 'tvshows.sections.kids',
    10768: 'tvshows.sections.warpolitics',
    99:    'tvshows.sections.documentary',
  };

  var activeGenre = null;

  async function fetchTV(endpoint, lang) {
    lang = lang || 'en-US';
    try {
      var r = await fetch(TMDB_URL + endpoint + (endpoint.includes('?') ? '&' : '?') + 'language=' + lang);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      return d.results || [];
    } catch (e) { return []; }
  }

  function normalise(item) {
    return Object.assign({}, item, {
      kind:   'tv',
      year:   (item.first_air_date || '').slice(0, 4),
      rating: item.vote_average ? item.vote_average.toFixed(1) : '',
      title:  item.name || item.title || '',
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
      pill.textContent = tr(TV_GENRE_KEYS[g.id] || '', g.name);
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

    if (activeGenre) {
      var items = await fetchTV('/discover/tv?with_genres=' + activeGenre + '&sort_by=popularity.desc', lang);
      mount.innerHTML = '';
      if (!items.length) {
        mount.innerHTML = '<div class="empty"><div class="empty__icon">◻</div><div class="empty__title">' + tr('common.noResults', 'No results') + '</div></div>';
        return;
      }
      var grid = document.createElement('div');
      grid.className = 'grid';
      grid.style.padding = '20px var(--pad-x) 0';
      items.forEach(function (item) {
        var poster = window.makePoster(normalise(item), { onClick: function () { window.openDetailModal(normalise(item)); } });
        grid.appendChild(poster);
      });
      mount.appendChild(grid);
    } else {
      var results = await Promise.all([
        fetchTV('/trending/tv/week', lang),
        fetchTV('/tv/popular', lang),
        fetchTV('/tv/top_rated', lang),
        fetchTV('/tv/on_the_air', lang),
      ]);
      mount.innerHTML = '';
      var rows = [
        { title: tr('tvshows.sections.trending',  'Trending TV'),    items: results[0] },
        { title: tr('tvshows.sections.popular',   'Popular Shows'),  items: results[1] },
        { title: tr('tvshows.sections.topRated',  'Top Rated'),      items: results[2], numbered: true },
        { title: tr('tvshows.sections.onTheAir',  'On the Air'),     items: results[3] },
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
    window.renderTopNav('tvshows');
    window.renderBottomNav('tvshows');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('tvshows');
      window.renderBottomNav('tvshows');
    });
    window.addEventListener('eli6.langChanged', function () {
      renderPage();
    });
  });
})();

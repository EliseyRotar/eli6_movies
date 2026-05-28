// ELI6 Movies — anime browse page

(function () {
  var TMDB_URL = window.TMDB_PROXY_URL || ((window.API_BASE_URL || '') + '/tmdb');

  async function fetchTMDBAnime(endpoint, lang) {
    lang = lang || 'en-US';
    try {
      var r = await fetch(TMDB_URL + endpoint + (endpoint.includes('?') ? '&' : '?') + 'language=' + lang);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var d = await r.json();
      return d.results || [];
    } catch (e) { return []; }
  }

  async function fetchAnimeAPI() {
    try {
      var r = await fetch('https://animeapi.skin/trending');
      if (!r.ok) throw new Error();
      var data = await r.json();
      return (data || []).map(function (a) {
        return {
          id:          a.slug,
          title:       a.title_en || a.title_jp || a.slug,
          poster_path: a.poster_url,
          overview:    a.description || '',
          vote_average: a.score,
          kind:        'anime',
          link_url:    a.link_url,
        };
      });
    } catch (e) { return []; }
  }

  function normaliseTMDB(item) {
    return Object.assign({}, item, {
      kind:   'tv',
      year:   (item.first_air_date || '').slice(0, 4),
      rating: item.vote_average ? item.vote_average.toFixed(1) : '',
      title:  item.name || item.title || '',
    });
  }

  async function renderPage() {
    var mount = document.getElementById('rows-mount');
    if (!mount) return;
    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Loading…</span></div>';

    var lang = (window.i18n && window.i18n.getTMDBLanguage) ? window.i18n.getTMDBLanguage() : 'en-US';

    var results = await Promise.all([
      fetchAnimeAPI(),
      fetchTMDBAnime('/discover/tv?with_genres=16&sort_by=popularity.desc', lang),
      fetchTMDBAnime('/discover/tv?with_genres=16&sort_by=vote_average.desc&vote_count.gte=200', lang),
    ]);

    mount.innerHTML = '';

    if (results[0].length) {
      var row = window.makeRow('Trending Anime', results[0], {
        onPick: function (item) { window.location.href = 'player.html?type=anime&id=' + item.id + (item.link_url ? '&link_url=' + encodeURIComponent(item.link_url) : ''); },
      });
      mount.appendChild(row);
    }

    if (results[1].length) {
      var row2 = window.makeRow('Popular on TMDB', results[1].map(normaliseTMDB), {
        onPick: function (item) { window.openDetailModal(item); },
      });
      mount.appendChild(row2);
    }

    if (results[2].length) {
      var row3 = window.makeRow('Top Rated', results[2].map(normaliseTMDB), {
        numbered: true,
        onPick: function (item) { window.openDetailModal(item); },
      });
      mount.appendChild(row3);
    }

    if (!results[0].length && !results[1].length) {
      mount.innerHTML = '<div class="empty"><div class="empty__icon">◻</div><div class="empty__title">No anime found</div><div class="empty__sub">Check back later.</div></div>';
    }

    window.renderFooter('footer-mount');
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('anime');
    window.renderBottomNav('anime');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('anime');
      window.renderBottomNav('anime');
    });
    window.addEventListener('eli6.langChanged', function () {
      renderPage();
    });
  });
})();

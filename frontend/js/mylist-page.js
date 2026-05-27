// ELI6 Movies — My List page

(function () {
  var API_URL  = window.API_BASE_URL  || '';
  var TMDB_URL = window.TMDB_PROXY_URL || (API_URL ? API_URL + '/tmdb' : '');

  async function fetchMyList() {
    var token = localStorage.getItem('token');
    if (token) {
      try {
        var r = await fetch(API_URL + '/user/profile', { headers: { Authorization: 'Bearer ' + token } });
        if (r.ok) {
          var d = await r.json();
          var list = d.myList || [];
          localStorage.setItem('myList', JSON.stringify(list));
          return list;
        }
      } catch (e) {}
    }
    return JSON.parse(localStorage.getItem('myList') || '[]');
  }

  async function enrichItem(item) {
    var type = item.type || item.kind || 'movie';
    var ep   = (type === 'movie' ? '/movie/' : '/tv/') + item.id;
    try {
      var r = await fetch(TMDB_URL + ep);
      if (!r.ok) throw new Error();
      var d = await r.json();
      return Object.assign({}, item, d, {
        kind:   type,
        year:   (d.release_date || d.first_air_date || '').slice(0, 4),
        rating: d.vote_average ? d.vote_average.toFixed(1) : '',
        title:  d.title || d.name || item.title || '',
      });
    } catch (e) {
      return Object.assign({}, item, {
        kind:   type,
        title:  item.title || item.name || '',
        rating: '',
      });
    }
  }

  async function removeItem(id, type) {
    var token = localStorage.getItem('token');
    if (token) {
      try {
        await fetch(API_URL + '/user/mylist/' + id + '/' + type, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + token },
        });
      } catch (e) {}
    }
    var list = JSON.parse(localStorage.getItem('myList') || '[]');
    list = list.filter(function (i) { return !(i.id === id && i.type === type); });
    localStorage.setItem('myList', JSON.stringify(list));
    renderPage();
  }

  async function renderPage() {
    var mount    = document.getElementById('grid-mount');
    var countEl  = document.getElementById('list-count');
    if (!mount) return;

    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Loading…</span></div>';

    var list = await fetchMyList();

    if (countEl) countEl.textContent = list.length ? list.length + ' saved title' + (list.length === 1 ? '' : 's') : 'Nothing saved yet.';

    if (!list.length) {
      mount.innerHTML = '<div class="empty"><div class="empty__icon">♥</div><div class="empty__title">Your list is empty</div><div class="empty__sub">Add movies and shows by pressing + My List.</div></div>';
      return;
    }

    mount.innerHTML = '<div class="e6-loading"><div class="e6-spinner"></div><span>Loading details…</span></div>';

    var enriched = await Promise.all(list.map(enrichItem));

    mount.innerHTML = '';
    var grid = document.createElement('div');
    grid.className = 'grid';
    grid.style.padding = '0 var(--pad-x)';

    enriched.forEach(function (item) {
      var wrapper = document.createElement('div');
      wrapper.style.position = 'relative';

      var poster = window.makePoster(item, {
        onClick: function () { window.openDetailModal(item); },
      });
      wrapper.appendChild(poster);

      // Remove button
      var rmBtn = document.createElement('button');
      rmBtn.style.cssText = 'position:absolute;top:8px;right:8px;width:26px;height:26px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:0;font-size:14px;cursor:pointer;display:grid;place-items:center;z-index:5';
      rmBtn.textContent = '×';
      rmBtn.title = 'Remove from list';
      rmBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        removeItem(item.id, item.kind || item.type || 'movie');
      });
      wrapper.appendChild(rmBtn);
      grid.appendChild(wrapper);
    });

    mount.appendChild(grid);
    window.renderFooter('footer-mount');
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('mylist');
    window.renderBottomNav('mylist');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('mylist');
      window.renderBottomNav('mylist');
    });
  });
})();

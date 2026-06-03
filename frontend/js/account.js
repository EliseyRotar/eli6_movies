// ELI6 Movies — account page
(function () {
  var API_URL  = window.API_BASE_URL || '';
  var TMDB_IMG = 'https://image.tmdb.org/t/p/';


  function tr(key, fallback) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function safeCssPath(path) {
    return String(path || '').replace(/[^a-zA-Z0-9/_.\-]/g, '');
  }
  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function div(cls) { return el('div', cls); }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); } catch (e) { return null; }
  }


  function resizeImageToBase64(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      if (!file.type.startsWith('image/')) { reject(new Error('Not an image')); return; }
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function (e) {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var w = img.width, h = img.height;
          var scale = Math.min(maxDim / w, maxDim / h, 1);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function applyProfilePicture(avatarEl, dataUrl) {
    if (dataUrl) {
      var existing = avatarEl.querySelector('.acc__avatar-photo');
      if (!existing) {
        var img = document.createElement('img');
        img.className = 'acc__avatar-photo';
        avatarEl.appendChild(img);
        existing = img;
      }
      existing.src = dataUrl;
      avatarEl.style.color = 'transparent';
    } else {
      var old = avatarEl.querySelector('.acc__avatar-photo');
      if (old) old.remove();
      avatarEl.style.color = '';
    }
  }

  function posterUrl(item, size) {
    var pp = item.poster_path || item.poster_url || '';
    if (!pp) return '';
    if (pp.startsWith('http')) return pp;
    return TMDB_IMG + (size || 'w92') + pp;
  }
  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    var days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    return Math.floor(days / 7) + 'w ago';
  }


  var DEFAULT_PREFS = {
    cookieAnalytics: true,
  };
  function loadPrefs() {
    try { return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem('eli6.acctPrefs') || '{}')); }
    catch (e) { return Object.assign({}, DEFAULT_PREFS); }
  }
  function savePrefs(p) { localStorage.setItem('eli6.acctPrefs', JSON.stringify(p)); }


  async function apiPost(path, body) {
    var r = await fetch(API_URL + path, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
    return d;
  }
  async function apiPut(path, body) {
    var r = await fetch(API_URL + path, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
    return d;
  }
  async function apiDelete(path, body) {
    var opts = { method: 'DELETE', credentials: 'include' };
    if (body) { opts.headers = { 'Content-Type': 'application/json' }; opts.body = JSON.stringify(body); }
    var r = await fetch(API_URL + path, opts);
    if (!r.ok) { var d = await r.json(); throw new Error(d.message || d.error || 'Failed'); }
    return true;
  }


  async function fetchHubData() {
    var keepWatching = [], watchHistory = [], myList = [], sessions = [], currentJti = null;
    try {
      var results = await Promise.all([
        fetch(API_URL + '/user/keep-watching', { credentials: 'include' }),
        fetch(API_URL + '/user/watched',       { credentials: 'include' }),
        fetch(API_URL + '/user/profile',       { credentials: 'include' }),
        fetch(API_URL + '/user/sessions',      { credentials: 'include' }),
      ]);
      if (results[0].ok) keepWatching = await results[0].json();
      if (results[1].ok) watchHistory = await results[1].json();
      if (results[2].ok) {
        var prof = await results[2].json();
        myList = prof.myList || [];
        localStorage.setItem('myList', JSON.stringify(myList));
        var u = getUser() || {};
        if (prof.createdAt) u.createdAt = prof.createdAt;
        u.emailVerified = prof.emailVerified;
        localStorage.setItem('user', JSON.stringify(u));
        if (!prof.emailVerified) {
          var banner = div();
          banner.style.cssText = 'background:rgba(253,203,110,.1);border:1px solid rgba(253,203,110,.3);color:#fdcb6e;padding:10px 16px;border-radius:8px;font-size:13px;margin:0 var(--pad-x,24px) 8px;display:flex;align-items:center;justify-content:space-between;gap:12px';
          banner.innerHTML = '<span>⚠ Please verify your email address to secure your account.</span>';
          var resendBtn = el('button');
          resendBtn.textContent = 'Resend email';
          resendBtn.style.cssText = 'background:rgba(253,203,110,.2);border:1px solid rgba(253,203,110,.4);color:#fdcb6e;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;white-space:nowrap';
          resendBtn.addEventListener('click', async function () {
            resendBtn.disabled = true; resendBtn.textContent = 'Sending…';
            try {
              await fetch(API_URL + '/auth/resend-verification', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ email: prof.email }) });
              resendBtn.textContent = 'Sent!';
            } catch (_) { resendBtn.textContent = 'Failed'; resendBtn.disabled = false; }
          });
          banner.appendChild(resendBtn);
          var mountEl = document.getElementById('account-mount');
          if (mountEl) mountEl.insertBefore(banner, mountEl.firstChild);
        }
      }
      if (results[3].ok) {
        var sessData = await results[3].json();
        sessions   = sessData.sessions   || [];
        currentJti = sessData.currentJti || null;
      }
    } catch (e) {
      var cached = getUser() || {};
      keepWatching = cached.keepWatching || [];
      watchHistory = cached.watchHistory || [];
      try { myList = JSON.parse(localStorage.getItem('myList') || '[]'); } catch (e2) {}
    }
    return { keepWatching, watchHistory, myList, sessions, currentJti };
  }


  function calcStreak(watchHistory) {
    if (!watchHistory || !watchHistory.length) return 0;
    var daySet = new Set(watchHistory.map(function (i) { return new Date(i.last_watched).toDateString(); }));
    var streak = 0;
    var d = new Date();
    while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    if (streak === 0) {
      d = new Date(); d.setDate(d.getDate() - 1);
      while (daySet.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
    }
    return streak;
  }
  function estimateHours(watchHistory) {
    if (!watchHistory || !watchHistory.length) return 0;
    var mins = 0;
    watchHistory.forEach(function (i) {
      var dur = i.type === 'movie' ? 105 : i.type === 'tv' ? 42 : 24;
      mins += dur * Math.max(0, Math.min(100, i.progress || 0)) / 100;
    });
    return Math.round(mins / 60);
  }
  function calcTypeBreakdown(watchHistory) {
    var total = watchHistory && watchHistory.length;
    if (!total) return [];
    var counts = {};
    watchHistory.forEach(function (i) { counts[i.type] = (counts[i.type] || 0) + 1; });
    return [
      { name: 'Movies',   pct: Math.round((counts.movie || 0) * 100 / total) },
      { name: 'TV Shows', pct: Math.round((counts.tv    || 0) * 100 / total) },
      { name: 'Anime',    pct: Math.round((counts.anime || 0) * 100 / total) },
    ].filter(function (b) { return b.pct > 0; });
  }
  function gradientForId(id) {
    var n = id || 0;
    return ['hsl(' + ((n * 137 + 11) % 360) + ',55%,14%)', 'hsl(' + ((n * 97 + 200) % 360) + ',45%,18%)', 'hsl(' + ((n * 53 + 300) % 360) + ',50%,16%)'];
  }
  function parseUA(ua) {
    if (!ua) return { name: 'Unknown device', meta: 'Unknown platform', icon: '▦' };
    var u = ua.toLowerCase();
    var browser = /edg\/|edge\//.test(u) ? 'Edge' : /firefox/.test(u) ? 'Firefox' : /chrome/.test(u) ? 'Chrome' : /safari/.test(u) ? 'Safari' : 'Browser';
    if (/iphone/.test(u))             return { name: 'iPhone',         meta: 'iOS · '     + browser, icon: '▢' };
    if (/ipad/.test(u))               return { name: 'iPad',           meta: 'iPadOS · '  + browser, icon: '▣' };
    if (/android.*mobile/.test(u))    return { name: 'Android phone',  meta: 'Android · ' + browser, icon: '▢' };
    if (/android/.test(u))            return { name: 'Android tablet', meta: 'Android · ' + browser, icon: '▣' };
    if (/tv|smarttv|crkey|webos|tizen/.test(u)) return { name: 'Smart TV', meta: 'TV browser', icon: '▥' };
    if (/macintosh|mac os x/.test(u)) return { name: 'Mac',            meta: 'macOS · '   + browser, icon: '▤' };
    if (/windows/.test(u))            return { name: 'Windows PC',     meta: 'Windows · ' + browser, icon: '▤' };
    if (/linux/.test(u))              return { name: 'Linux',          meta: 'Linux · '   + browser, icon: '▤' };
    return { name: 'Unknown device', meta: 'Unknown platform', icon: '▦' };
  }
  function formatMemberSince(createdAt) {
    if (!createdAt) return '—';
    try { return new Date(createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }); }
    catch (e) { return '—'; }
  }


  function openModal(opts) {
    // opts: { title, body (el), footer ([el...]), maxWidth, onClose }
    var backdrop = div('acm');
    var bd       = div('acm__bd');
    var dialog   = div('acm__dialog');
    if (opts.maxWidth) dialog.style.maxWidth = opts.maxWidth;

    var hd    = div('acm__hd');
    var title = div('acm__title'); title.textContent = opts.title;
    var closeBtn = el('button', 'acm__close'); closeBtn.textContent = '×';
    hd.appendChild(title); hd.appendChild(closeBtn);
    dialog.appendChild(hd);

    var body = div('acm__body');
    if (opts.body) body.appendChild(opts.body);
    dialog.appendChild(body);

    if (opts.footer && opts.footer.length) {
      var foot = div('acm__foot');
      opts.footer.forEach(function (b) { foot.appendChild(b); });
      dialog.appendChild(foot);
    }

    backdrop.appendChild(bd);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);
    document.body.style.overflow = 'hidden';

    function close() {
      dialog.style.animation = 'acm-out 180ms ease forwards';
      bd.style.transition     = 'opacity 180ms';
      bd.style.opacity        = '0';
      setTimeout(function () {
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        document.body.style.overflow = '';
      }, 185);
      if (opts.onClose) opts.onClose();
    }

    closeBtn.addEventListener('click', close);
    bd.addEventListener('click', close);
    var onKey = function (e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);

    return { close: close, body: body };
  }


  function openEditProfileModal(currentUser, nameEl, emailEl) {
    var bodyEl = div();

    var uWrap = div('acm__field');
    var uLbl  = el('label', 'acm__label'); uLbl.textContent = 'Username'; uLbl.htmlFor = 'ep-username';
    var uInput = el('input', 'acm__input');
    uInput.id = 'ep-username'; uInput.type = 'text'; uInput.value = currentUser.username || '';
    uInput.placeholder = 'Username';
    uWrap.appendChild(uLbl); uWrap.appendChild(uInput);

    var eWrap = div('acm__field');
    var eLbl  = el('label', 'acm__label'); eLbl.textContent = 'Email address'; eLbl.htmlFor = 'ep-email';
    var eInput = el('input', 'acm__input');
    eInput.id = 'ep-email'; eInput.type = 'email'; eInput.value = currentUser.email || '';
    eInput.placeholder = 'you@example.com';
    eWrap.appendChild(eLbl); eWrap.appendChild(eInput);

    var pWrap = div('acm__field');
    var pLbl  = el('label', 'acm__label'); pLbl.textContent = 'Current password (required to save)'; pLbl.htmlFor = 'ep-pwd';
    var pInput = el('input', 'acm__input');
    pInput.id = 'ep-pwd'; pInput.type = 'password'; pInput.placeholder = '••••••••';
    pWrap.appendChild(pLbl); pWrap.appendChild(pInput);

    bodyEl.appendChild(uWrap);
    bodyEl.appendChild(eWrap);
    bodyEl.appendChild(pWrap);

    var cancelBtn = el('button', 'btn btn--outline'); cancelBtn.textContent = 'Cancel';
    var saveBtn   = el('button', 'btn btn--primary');  saveBtn.textContent  = 'Save changes';

    var modal = openModal({ title: 'Edit profile', body: bodyEl, footer: [cancelBtn, saveBtn] });
    cancelBtn.addEventListener('click', modal.close);

    saveBtn.addEventListener('click', async function () {
      var newUsername = uInput.value.trim();
      var newEmail    = eInput.value.trim().toLowerCase();
      var pwd         = pInput.value;

      var changed = newUsername !== (currentUser.username || '') || newEmail !== (currentUser.email || '');
      if (!changed) { modal.close(); return; }
      if (!pwd) { showToast('Enter your current password to save changes', 'error'); return; }
      if (newUsername.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
      if (!newEmail.includes('@')) { showToast('Enter a valid email address', 'error'); return; }

      saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
      try {
        var payload = { currentPassword: pwd };
        if (newUsername !== currentUser.username) payload.username = newUsername;
        if (newEmail    !== currentUser.email)    payload.email    = newEmail;

        var d = await apiPut('/user/update', payload);
        var u = getUser() || {};
        if (d.user) { Object.assign(u, d.user); } else { if (payload.username) u.username = newUsername; if (payload.email) u.email = newEmail; }
        localStorage.setItem('user', JSON.stringify(u));

        if (nameEl)  nameEl.textContent  = u.username || newUsername;
        if (emailEl) emailEl.textContent = u.email    || newEmail;

        showToast('Profile updated!');
        window.renderTopNav('account');
        modal.close();
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_PASSWORD')  msg = 'Incorrect current password';
        if (msg === 'USERNAME_EXISTS')   msg = 'That username is already taken';
        if (msg === 'EMAIL_EXISTS')      msg = 'That email is already in use';
        showToast(msg || 'Failed to update profile', 'error');
        saveBtn.disabled = false; saveBtn.textContent = 'Save changes';
      }
    });
  }


  function openWatchHistoryModal(whData) {
    var list = whData ? whData.slice() : [];

    var bodyEl  = div();
    var listEl  = div();
    var clearBtnWrap = div();
    clearBtnWrap.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px;';
    var clearAllBtn = el('button', 'btn btn--outline');
    clearAllBtn.style.cssText = 'font-size:12px;padding:6px 14px;color:#ff6b6b;border-color:rgba(255,60,60,0.3);';
    clearAllBtn.textContent = 'Clear all history';
    clearBtnWrap.appendChild(clearAllBtn);

    function renderList() {
      listEl.innerHTML = '';
      if (!list.length) {
        var empty = div('acm__wh-empty');
        empty.textContent = 'No watch history yet.';
        listEl.appendChild(empty);
        clearAllBtn.style.display = 'none';
        return;
      }
      clearAllBtn.style.display = '';
      list.forEach(function (item, idx) {
        var row = div('acm__wh-item');
        var thumb = el('img', 'acm__wh-thumb');
        var url = posterUrl(item, 'w92');
        thumb.src = url || 'https://via.placeholder.com/38x56/1a1a22/7a7a90?text=';
        thumb.alt = esc(item.title || '');
        thumb.onerror = function () { this.src = 'https://via.placeholder.com/38x56/1a1a22/7a7a90?text='; };

        var info = div('acm__wh-info');
        var title = div('acm__wh-title'); title.textContent = item.title || 'Unknown';
        var metaStr = (item.type === 'movie' ? 'Movie' : item.type === 'tv' ? 'TV' : 'Anime');
        if (item.last_watched) metaStr += ' · ' + timeAgo(item.last_watched);
        var meta = div('acm__wh-meta'); meta.textContent = metaStr;
        var prog = div('acm__wh-prog');
        var progFill = div('acm__wh-prog-fill'); progFill.style.width = Math.min(100, item.progress || 0) + '%';
        prog.appendChild(progFill);
        info.appendChild(title); info.appendChild(meta); info.appendChild(prog);

        var rmBtn = el('button', 'acm__wh-rm');
        rmBtn.textContent = '×'; rmBtn.title = 'Remove from history';
        rmBtn.addEventListener('click', async function () {
          rmBtn.disabled = true;
          try {
            await apiDelete('/user/watch-history', { id: item.id, type: item.type });
            list.splice(idx, 1);
            renderList();
            showToast('Removed from history', 'info');
          } catch (e) {
            showToast('Failed to remove', 'error');
            rmBtn.disabled = false;
          }
        });

        row.appendChild(thumb); row.appendChild(info); row.appendChild(rmBtn);
        listEl.appendChild(row);
      });
    }

    renderList();

    clearAllBtn.addEventListener('click', async function () {
      if (!list.length) return;
      if (!confirm('Clear your entire watch history? This cannot be undone.')) return;
      clearAllBtn.disabled = true; clearAllBtn.textContent = 'Clearing…';
      try {
        await apiDelete('/user/watch-history/all');
        list.length = 0;
        renderList();
        showToast('Watch history cleared', 'info');
      } catch (e) {
        showToast('Failed to clear history', 'error');
        clearAllBtn.disabled = false; clearAllBtn.textContent = 'Clear all history';
      }
    });

    bodyEl.appendChild(clearBtnWrap);
    bodyEl.appendChild(listEl);

    openModal({ title: 'Watch history (' + list.length + ' titles)', body: bodyEl, maxWidth: '520px' });
  }


  async function downloadMyData() {
    showToast('Preparing your data…');
    try {
      var results = await Promise.all([
        fetch(API_URL + '/user/profile',       { credentials: 'include' }),
        fetch(API_URL + '/user/watched',        { credentials: 'include' }),
        fetch(API_URL + '/user/keep-watching',  { credentials: 'include' }),
      ]);
      var profile    = results[0].ok ? await results[0].json() : {};
      var history    = results[1].ok ? await results[1].json() : [];
      var keepWatch  = results[2].ok ? await results[2].json() : [];

      var data = {
        exportedAt:   new Date().toISOString(),
        profile: {
          username:      profile.username,
          email:         profile.email,
          memberSince:   profile.createdAt,
          emailVerified: profile.emailVerified,
        },
        myList:        profile.myList       || [],
        watchHistory:  history,
        keepWatching:  keepWatch,
      };

      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url  = URL.createObjectURL(blob);
      var a    = document.createElement('a');
      a.href   = url;
      a.download = 'eli6-movies-data-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Download started!');
    } catch (e) {
      showToast('Failed to export data', 'error');
    }
  }


  function openCookieSettingsModal(prefs) {
    var bodyEl = div();

    var rows = [
      {
        name: 'Essential cookies',
        desc: 'Required for login, sessions, and basic site functionality. Always active.',
        key: null,
        locked: true,
      },
      {
        name: 'Analytics & performance',
        desc: 'Help us understand how the site is used so we can improve it. No personal data is sold.',
        key: 'cookieAnalytics',
        locked: false,
      },
    ];

    rows.forEach(function (row) {
      var rowEl = div('acm__cookie-row');
      var info  = div('acm__cookie-info');
      var name  = div('acm__cookie-name'); name.textContent = row.name;
      var desc  = div('acm__cookie-desc'); desc.textContent = row.desc;
      info.appendChild(name); info.appendChild(desc);

      var toggle;
      if (row.locked) {
        toggle = makeToggle(true, function () {});
        toggle.disabled = true;
        toggle.style.opacity = '0.4';
        toggle.title = 'Always required';
      } else {
        toggle = makeToggle(prefs[row.key], function (v) {
          prefs[row.key] = v;
          savePrefs(prefs);
          showToast('Cookie preference saved');
        });
      }

      rowEl.appendChild(info); rowEl.appendChild(toggle);
      bodyEl.appendChild(rowEl);
    });

    var note = div('acm__hint');
    note.textContent = 'Changes take effect immediately. Preference is stored locally on this device.';
    bodyEl.appendChild(note);

    openModal({ title: 'Cookie & tracking settings', body: bodyEl });
  }


  function openDeleteAccountModal() {
    var bodyEl = div();

    var warn = div('acm__warn');
    warn.innerHTML = '<strong>This is permanent.</strong> Deleting your account removes your username, email, watch history, My List, and all other data. This cannot be undone.';
    bodyEl.appendChild(warn);

    var pWrap = div('acm__field');
    var pLbl  = el('label', 'acm__label'); pLbl.textContent = 'Enter your password to confirm'; pLbl.htmlFor = 'del-pwd';
    var pInput = el('input', 'acm__input');
    pInput.id = 'del-pwd'; pInput.type = 'password'; pInput.placeholder = '••••••••';
    pWrap.appendChild(pLbl); pWrap.appendChild(pInput);
    bodyEl.appendChild(pWrap);

    var cancelBtn = el('button', 'btn btn--outline'); cancelBtn.textContent = 'Cancel';
    var deleteBtn = el('button', 'btn btn--danger');  deleteBtn.textContent = 'Delete my account';

    var modal = openModal({ title: 'Delete account', body: bodyEl, footer: [cancelBtn, deleteBtn] });
    cancelBtn.addEventListener('click', modal.close);

    deleteBtn.addEventListener('click', async function () {
      var password = pInput.value;
      if (!password) { showToast('Enter your password to continue', 'error'); return; }
      deleteBtn.disabled = true; deleteBtn.textContent = 'Deleting…';
      try {
        await apiDelete('/user/delete', { password: password });
        ['user','token','myList','keepWatching','watchHistory','currentContent'].forEach(function (k) { localStorage.removeItem(k); });
        showToast(tr('account.accountDeleted', 'Account deleted'));
        modal.close();
        renderPage(); window.renderTopNav('account');
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_PASSWORD') msg = 'Incorrect password';
        showToast(msg || tr('account.failedDelete', 'Failed to delete account'), 'error');
        deleteBtn.disabled = false; deleteBtn.textContent = 'Delete my account';
      }
    });
  }


  function closePicker(backdrop) {
    if (!backdrop.parentNode) return;
    backdrop.style.animation = 'e6-fade-in 150ms ease reverse forwards';
    setTimeout(function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 150);
  }
  function openPicker(title, options, current, onSelect) {
    var backdrop = div('acc__picker-backdrop');
    var sheet    = div('acc__picker');
    var sheetTitle = div('acc__picker-title'); sheetTitle.textContent = title;
    sheet.appendChild(sheetTitle);
    var optList = div('acc__picker-options');
    options.forEach(function (opt) {
      var row = el('button', 'acc__picker-option' + (opt === current ? ' is-active' : ''));
      row.textContent = opt;
      row.addEventListener('click', function () { onSelect(opt); closePicker(backdrop); });
      optList.appendChild(row);
    });
    sheet.appendChild(optList);
    var cancel = el('button', 'acc__picker-cancel'); cancel.textContent = 'Cancel';
    cancel.addEventListener('click', function () { closePicker(backdrop); });
    sheet.appendChild(cancel);
    backdrop.appendChild(sheet);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closePicker(backdrop); });
    document.body.appendChild(backdrop);
  }


  function field(label, id, type, placeholder) {
    var wrap = div();
    wrap.style.marginBottom = '16px';
    var lbl = el('label');
    lbl.textContent = label; lbl.htmlFor = id;
    lbl.style.cssText = 'display:block;font-size:13px;font-weight:600;color:var(--fg-muted);margin-bottom:6px';
    var input = el('input');
    input.id = id; input.type = type; input.placeholder = placeholder;
    input.style.cssText = 'width:100%;padding:12px 14px;background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:var(--r-md);font-family:inherit;font-size:15px;outline:none;transition:border-color 150ms;box-sizing:border-box';
    input.addEventListener('focus', function () { input.style.borderColor = 'var(--accent)'; });
    input.addEventListener('blur',  function () { input.style.borderColor = 'var(--border)'; });
    wrap.appendChild(lbl); wrap.appendChild(input);
    return wrap;
  }

  function renderAuthForms(mount) {
    var wrap = div('acc__auth');
    var tabs = div();
    tabs.style.cssText = 'display:flex;gap:4px;margin-bottom:28px;background:var(--surface);border-radius:var(--r-pill);padding:4px;border:1px solid var(--border);width:fit-content';
    var tabLogin = el('button', 'settings__seg-btn is-active');
    tabLogin.id = 'tab-login'; tabLogin.textContent = tr('account.signIn', 'Sign in');
    var tabReg = el('button', 'settings__seg-btn');
    tabReg.id = 'tab-reg'; tabReg.textContent = tr('account.createAccountTab', 'Create account');
    tabs.appendChild(tabLogin); tabs.appendChild(tabReg);
    wrap.appendChild(tabs);

    function setTab(which) {
      tabLogin.classList.toggle('is-active', which === 'login');
      tabReg.classList.toggle('is-active', which === 'reg');
      loginForm.style.display = which === 'login' ? 'block' : 'none';
      regForm.style.display   = which === 'reg'   ? 'block' : 'none';
    }
    tabLogin.addEventListener('click', function () { setTab('login'); });
    tabReg.addEventListener('click',   function () { setTab('reg');   });

    var loginForm = el('form');
    loginForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.welcomeBack', 'Welcome back') + '</h2>';
    loginForm.appendChild(field(tr('account.email','Email'), 'login-email', 'email', 'you@example.com'));
    loginForm.appendChild(field(tr('account.password','Password'), 'login-pwd', 'password', '••••••••'));
    var loginBtn = el('button', 'btn btn--primary');
    loginBtn.type = 'submit'; loginBtn.textContent = tr('account.signIn','Sign in');
    loginBtn.style.cssText = 'width:100%;margin-top:8px';
    loginForm.appendChild(loginBtn);
    var forgotLink = el('a');
    forgotLink.href = 'forgot-password.html';
    forgotLink.textContent = 'Forgot password?';
    forgotLink.style.cssText = 'display:block;text-align:right;font-size:12px;color:var(--fg-muted);margin-top:10px;text-decoration:none';
    loginForm.appendChild(forgotLink);
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailVal = document.getElementById('login-email').value.trim();
      var pwdVal   = document.getElementById('login-pwd').value;
      if (!emailVal || !pwdVal) { showToast(tr('account.errorInvalidInput','Enter your email and password'), 'error'); return; }
      loginBtn.textContent = tr('account.signingIn','Signing in…'); loginBtn.disabled = true;
      try {
        var d = await apiPost('/login', { email: emailVal, password: pwdVal });
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.signedIn','Signed in!'));
        renderPage(); window.renderTopNav('account');
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_CREDENTIALS' || msg === 'INVALID_INPUT') msg = tr('account.errorInvalidCredentials','Incorrect email or password');
        showToast(msg || tr('account.signInFailed','Sign in failed'), 'error');
      } finally { loginBtn.textContent = tr('account.signIn','Sign in'); loginBtn.disabled = false; }
    });
    wrap.appendChild(loginForm);

    var regForm = el('form');
    regForm.style.display = 'none';
    regForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.createAccountTab','Create account') + '</h2>';
    regForm.appendChild(field(tr('account.username','Username'), 'reg-username', 'text', 'CoolViewer'));
    regForm.appendChild(field(tr('account.email','Email'), 'reg-email', 'email', 'you@example.com'));
    regForm.appendChild(field(tr('account.password','Password'), 'reg-pwd', 'password', tr('account.minChars','Min 8 characters')));
    var regBtn = el('button', 'btn btn--primary');
    regBtn.type = 'submit'; regBtn.textContent = tr('account.createAccountTab','Create account');
    regBtn.style.cssText = 'width:100%;margin-top:8px';
    regForm.appendChild(regBtn);
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var usernameVal = document.getElementById('reg-username').value.trim();
      var emailVal    = document.getElementById('reg-email').value.trim();
      var pwdVal      = document.getElementById('reg-pwd').value;
      if (usernameVal.length < 3) { showToast(tr('account.errorUsernameTooShort','Username must be at least 3 characters'), 'error'); return; }
      if (!emailVal.includes('@')) { showToast(tr('account.errorInvalidEmail','Enter a valid email address'), 'error'); return; }
      if (pwdVal.length < 8) { showToast(tr('account.minChars','Minimum 8 characters'), 'error'); return; }
      regBtn.textContent = tr('account.creating','Creating…'); regBtn.disabled = true;
      try {
        var d = await apiPost('/register', { username: usernameVal, email: emailVal, password: pwdVal });
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.accountCreated','Account created!'));
        renderPage(); window.renderTopNav('account');
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_INPUT') msg = tr('account.errorInvalidInput','Check: username (3+ chars), valid email, password (8+ chars)');
        else if (msg === 'REGISTRATION_FAILED' || msg === 'USER_EXISTS') msg = tr('account.errorUserExists','An account with this email already exists');
        showToast(msg || tr('account.registrationFailed','Registration failed'), 'error');
      } finally { regBtn.textContent = tr('account.createAccountTab','Create account'); regBtn.disabled = false; }
    });
    wrap.appendChild(regForm);
    mount.appendChild(wrap);
  }


  function makeToggle(on, onChange) {
    var btn = el('button', 'acc__toggle' + (on ? ' is-on' : ''));
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    btn.addEventListener('click', function () {
      var next = !btn.classList.contains('is-on');
      btn.classList.toggle('is-on', next);
      btn.setAttribute('aria-checked', next ? 'true' : 'false');
      onChange(next);
    });
    return btn;
  }
  function makeSectionHead(eyebrow, title, actionLabel, onAction) {
    var head = div('acc__section-head');
    var titlewrap = div('acc__section-titlewrap');
    if (eyebrow) { var ey = div('acc__section-eyebrow'); ey.textContent = eyebrow; titlewrap.appendChild(ey); }
    var h2 = el('h2', 'acc__section-title'); h2.textContent = title;
    titlewrap.appendChild(h2);
    head.appendChild(titlewrap);
    if (actionLabel && onAction) {
      var act = el('span', 'acc__section-action');
      act.textContent = actionLabel + ' →';
      act.addEventListener('click', onAction);
      head.appendChild(act);
    }
    return head;
  }
  function makePrefToggleRow(label, hint, on, onChange) {
    var row = div('acc__pref-row');
    var info = div('acc__pref-info');
    var lbl = div('acc__pref-label'); lbl.textContent = label;
    var h = div('acc__pref-hint'); h.textContent = hint;
    info.appendChild(lbl); info.appendChild(h);
    var ctrl = div('acc__pref-control');
    ctrl.appendChild(makeToggle(on, onChange));
    row.appendChild(info); row.appendChild(ctrl);
    return row;
  }
  function makePrefValueRow(label, hint, value, onClickFn) {
    var row = div('acc__pref-row acc__pref-row--clickable');
    var info = div('acc__pref-info');
    var lbl = div('acc__pref-label'); lbl.textContent = label;
    var h = div('acc__pref-hint'); h.textContent = hint;
    info.appendChild(lbl); info.appendChild(h);
    var ctrl = div('acc__pref-control');
    var val = el('span', 'acc__pref-value'); val.textContent = value;
    var arrow = el('span', 'acc__pref-arrow'); arrow.textContent = '›';
    ctrl.appendChild(val); ctrl.appendChild(arrow);
    row.appendChild(info); row.appendChild(ctrl);
    row.addEventListener('click', function () { onClickFn(val); });
    return row;
  }


  async function renderAccountHub(acc) {
    var user  = getUser() || {};
    var prefs = loadPrefs();

    var memberSince = formatMemberSince(user.createdAt);
    var cachedWH    = user.watchHistory || [];
    var streak      = calcStreak(cachedWH);

    var hero = div('acc__hero');
    hero.appendChild(div('acc__hero-bg'));
    var heroInner = div('acc__hero-inner');

    var avatarWrap = div('acc__avatar-wrap');
    avatarWrap.style.position = 'relative';
    var avatarEl = div('acc__avatar');
    avatarEl.textContent = (user.username || 'E')[0].toUpperCase();

    // Apply cached picture instantly, then sync from server below
    var cachedPic = localStorage.getItem('eli6.profilePicture') || '';
    if (cachedPic) applyProfilePicture(avatarEl, cachedPic);

    avatarWrap.appendChild(avatarEl);

    // Hidden file input for uploads
    var fileInput = document.createElement('input');
    fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.style.display = 'none';
    avatarWrap.appendChild(fileInput);

    var editBtn2 = el('button', 'acc__avatar-edit');
    editBtn2.title = 'Edit photo'; editBtn2.textContent = '✎';
    avatarWrap.appendChild(editBtn2);

    // Avatar photo menu
    var avatarMenuEl = null;
    function closeAvatarMenu() {
      if (avatarMenuEl && avatarMenuEl.parentNode) avatarMenuEl.parentNode.removeChild(avatarMenuEl);
      avatarMenuEl = null;
    }
    function openAvatarMenu() {
      if (avatarMenuEl) { closeAvatarMenu(); return; }
      var hasPic = !!localStorage.getItem('eli6.profilePicture');
      var menu = div('acc__avatar-menu');

      var uploadBtn = el('button', 'acc__avatar-menu-btn');
      uploadBtn.innerHTML = '📷 ' + (hasPic ? 'Change photo' : 'Upload photo');
      uploadBtn.addEventListener('click', function () {
        closeAvatarMenu();
        fileInput.value = '';
        fileInput.click();
      });

      var removeBtn = el('button', 'acc__avatar-menu-btn acc__avatar-menu-btn--danger');
      removeBtn.innerHTML = '🗑 Remove photo';
      removeBtn.disabled = !hasPic;
      removeBtn.addEventListener('click', async function () {
        closeAvatarMenu();
        removeBtn.disabled = true;
        try {
          await apiDelete('/user/profile-picture');
          localStorage.removeItem('eli6.profilePicture');
          applyProfilePicture(avatarEl, '');
          showToast('Profile picture removed');
        } catch (e) {
          showToast('Failed to remove picture', 'error');
        }
      });

      menu.appendChild(uploadBtn);
      menu.appendChild(removeBtn);
      avatarMenuEl = menu;
      avatarWrap.appendChild(menu);

      // Close on outside click
      setTimeout(function () {
        document.addEventListener('click', function _close(ev) {
          if (!avatarWrap.contains(ev.target)) { closeAvatarMenu(); document.removeEventListener('click', _close); }
        });
      }, 0);
    }

    editBtn2.addEventListener('click', function (e) { e.stopPropagation(); openAvatarMenu(); });

    fileInput.addEventListener('change', async function () {
      var file = fileInput.files[0];
      if (!file) return;
      editBtn2.textContent = '…'; editBtn2.disabled = true;
      try {
        var dataUrl = await resizeImageToBase64(file, 300, 0.85);
        var result = await apiPut('/user/profile-picture', { data: dataUrl });
        var url = (result && result.profilePicture) || dataUrl;
        localStorage.setItem('eli6.profilePicture', url);
        applyProfilePicture(avatarEl, url);
        showToast('Profile picture updated!');
      } catch (e) {
        var msg = e.message;
        if (msg === 'IMAGE_TOO_LARGE') msg = 'Image too large after compression';
        showToast(msg || 'Failed to upload picture', 'error');
      } finally {
        editBtn2.textContent = '✎'; editBtn2.disabled = false;
      }
    });

    heroInner.appendChild(avatarWrap);

    var heroText = div('acc__hero-text');
    var nameEl  = el('h2', 'acc__name');  nameEl.textContent  = user.username || 'User';
    var emailEl = div('acc__email');       emailEl.textContent = user.email    || '';
    var badges  = div('acc__badges');
    var b1 = el('span', 'acc__badge acc__badge--accent'); b1.textContent = '● Free · Forever';
    var b2 = el('span', 'acc__badge'); b2.textContent = 'Member since ' + memberSince;
    var b3 = el('span', 'acc__badge'); b3.textContent = streak + '-day streak';
    badges.appendChild(b1); badges.appendChild(b2); badges.appendChild(b3);
    heroText.appendChild(nameEl); heroText.appendChild(emailEl); heroText.appendChild(badges);
    heroInner.appendChild(heroText);

    var heroActions = div('acc__hero-actions');
    var editProfileBtn = el('button', 'btn btn--primary');
    editProfileBtn.textContent = tr('account.editProfile', 'Edit profile');
    editProfileBtn.addEventListener('click', function () {
      openEditProfileModal(getUser() || {}, nameEl, emailEl);
    });
    var appearBtn = el('button', 'btn btn--outline');
    appearBtn.textContent = '✦ ' + tr('account.appearance', 'Appearance');
    appearBtn.addEventListener('click', function () { window.location.href = 'settings.html'; });
    heroActions.appendChild(editProfileBtn); heroActions.appendChild(appearBtn);
    heroInner.appendChild(heroActions);
    hero.appendChild(heroInner);
    acc.appendChild(hero);

    var loadEl = div();
    loadEl.style.cssText = 'padding:60px var(--pad-x);text-align:center;color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.15em;text-transform:uppercase';
    loadEl.textContent = 'Loading…';
    acc.appendChild(loadEl);

    var data = await fetchHubData();
    if (!acc.isConnected) return;
    acc.removeChild(loadEl);

    var kw         = Array.isArray(data.keepWatching) ? data.keepWatching : [];
    var wh         = Array.isArray(data.watchHistory)  ? data.watchHistory  : [];
    var ml         = Array.isArray(data.myList)         ? data.myList         : [];
    var sessions   = Array.isArray(data.sessions)       ? data.sessions       : [];
    var currentJti = data.currentJti || null;

    var freshUser = getUser() || {};
    b3.textContent = calcStreak(wh) + '-day streak';
    if (freshUser.createdAt) b2.textContent = 'Member since ' + formatMemberSince(freshUser.createdAt);

    // Sync profile picture from server (runs in background, updates avatar if changed)
    fetch(API_URL + '/user/profile-picture', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        var pic = d.profilePicture || '';
        var cached = localStorage.getItem('eli6.profilePicture') || '';
        if (pic !== cached) {
          if (pic) localStorage.setItem('eli6.profilePicture', pic);
          else localStorage.removeItem('eli6.profilePicture');
          if (acc.isConnected) applyProfilePicture(avatarEl, pic);
        }
      })
      .catch(function () {});

    var hours = estimateHours(wh);
    var statGrid = div('acc__statgrid');
    [
      { k: 'Titles watched', v: String(wh.length), sub: wh.length + ' titles total' },
      { k: 'Hours streamed', v: String(hours),      sub: hours > 0 ? '≈ ' + Math.round(hours / 24 * 10) / 10 + ' days of viewing' : 'Start watching!' },
      { k: 'In your list',   v: String(ml.length),  sub: ml.length + ' titles saved' },
      { k: 'Current streak', v: String(calcStreak(wh)), sub: 'days in a row', trend: calcStreak(wh) >= 3 ? '🔥' : null },
    ].forEach(function (s) {
      var cell = div('acc__stat');
      var k = div('acc__stat-k'); k.textContent = s.k;
      var v = div('acc__stat-v'); v.textContent = s.v;
      var sub = div('acc__stat-sub'); sub.textContent = s.sub;
      cell.appendChild(k); cell.appendChild(v); cell.appendChild(sub);
      if (s.trend) { var tr2 = div('acc__stat-trend'); tr2.textContent = s.trend; cell.appendChild(tr2); }
      statGrid.appendChild(cell);
    });
    acc.appendChild(statGrid);

    var contSection = div('acc__section');
    contSection.appendChild(makeSectionHead('01', 'Keep watching', 'See all', function () { window.location.href = 'index.html'; }));
    if (kw.length === 0) {
      var emptyKw = div();
      emptyKw.style.cssText = 'padding:28px 0;color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em';
      emptyKw.textContent = 'Nothing in progress yet — start watching something!';
      contSection.appendChild(emptyKw);
    } else {
      var contStrip = div('acc__continue');
      kw.forEach(function (item) {
        var card = div('acc__cont-card');
        if (item.poster_path) {
          card.style.backgroundImage    = 'url(' + TMDB_IMG + 'w500' + safeCssPath(item.poster_path) + ')';
          card.style.backgroundSize     = 'cover';
          card.style.backgroundPosition = 'center';
        } else {
          var gc = gradientForId(item.id);
          card.style.background = 'linear-gradient(125deg,' + gc[0] + ',' + gc[1] + ' 60%,' + gc[2] + ')';
        }
        var meta = div('acc__cont-card-meta');
        if (item.type === 'tv' && item.season && item.episode) meta.textContent = 'S' + item.season + '·E' + item.episode;
        else if (item.type === 'anime' && item.episode) meta.textContent = 'EP ' + item.episode;
        else if (item.type === 'anime') meta.textContent = 'ANIME';
        else meta.textContent = 'FEATURE';
        var titleEl2 = div('acc__cont-card-title'); titleEl2.textContent = item.title || '';
        var barWrap  = div('acc__cont-card-bar');
        var barFill  = div(); barFill.style.width = Math.min(100, item.progress || 0) + '%';
        barWrap.appendChild(barFill);
        var playBtn = div('acc__cont-card-play'); playBtn.innerHTML = '<div>▶</div>';
        card.appendChild(meta); card.appendChild(titleEl2); card.appendChild(barWrap); card.appendChild(playBtn);
        card.addEventListener('click', function () {
          var url = 'player.html?type=' + (item.type || 'movie') + '&id=' + item.id;
          if (item.type === 'tv' && item.season && item.episode) url += '&season=' + item.season + '&episode=' + item.episode;
          window.location.href = url;
        });
        contStrip.appendChild(card);
      });
      contSection.appendChild(contStrip);
    }
    acc.appendChild(contSection);

    var tasteSection = div('acc__section');
    var breakdownBars = calcTypeBreakdown(wh);
    tasteSection.appendChild(makeSectionHead('02', 'Watch breakdown'));
    if (breakdownBars.length === 0) {
      var emptyTaste = div();
      emptyTaste.style.cssText = 'padding:28px 0;color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em';
      emptyTaste.textContent = 'Start watching to see your breakdown here.';
      tasteSection.appendChild(emptyTaste);
    } else {
      var taste = div('acc__taste');
      breakdownBars.forEach(function (g) {
        var row = div('acc__taste-row');
        var gname = div('acc__taste-name'); gname.textContent = g.name;
        var bar = div('acc__taste-bar');
        var fill = div('acc__taste-fill'); fill.style.width = '0%';
        bar.appendChild(fill);
        var pctEl = div('acc__taste-pct'); pctEl.textContent = g.pct + '%';
        row.appendChild(gname); row.appendChild(bar); row.appendChild(pctEl);
        taste.appendChild(row);
        requestAnimationFrame(function () { requestAnimationFrame(function () { fill.style.width = g.pct + '%'; }); });
      });
      tasteSection.appendChild(taste);
    }
    acc.appendChild(tasteSection);

    var quickSection = div('acc__section');
    quickSection.appendChild(makeSectionHead('03', 'Quick actions'));
    var quickGrid = div('acc__quick');
    [
      { icon: '✦', label: tr('account.appearance','Appearance'), sub: 'Theme, accent, layout',
        onClick: function () { window.location.href = 'settings.html'; } },
      { icon: '♥', label: tr('nav.mylist','My List'), sub: ml.length + ' items saved',
        onClick: function () { window.location.href = 'mylist.html'; } },
      { icon: '⏱', label: 'Watch history', sub: wh.length + ' titles watched',
        onClick: function () { openWatchHistoryModal(wh); } },
      { icon: '↗', label: 'Refer a friend', sub: "Share ELI6 — it's free",
        onClick: function () {
          if (navigator.share) { navigator.share({ title: 'ELI6 Movies', url: window.location.origin }); }
          else { if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin); showToast('Link copied!'); }
        }},
      { icon: '?', label: 'Help & support', sub: 'FAQs, contact',
        onClick: function () { window.open('mailto:eli6movies@proton.me?subject=ELI6%20Movies%20Support', '_blank'); } },
    ].forEach(function (q) {
      var tile = el('button', 'acc__quick-tile');
      var icon = div('acc__quick-icon'); icon.textContent = q.icon;
      var textWrap = div();
      var qlabel = div('acc__quick-label'); qlabel.textContent = q.label;
      var qsub   = div('acc__quick-sub');   qsub.textContent   = q.sub;
      textWrap.appendChild(qlabel); textWrap.appendChild(qsub);
      var arrow = el('span', 'acc__quick-arrow'); arrow.textContent = '→';
      tile.appendChild(icon); tile.appendChild(textWrap); tile.appendChild(arrow);
      tile.addEventListener('click', q.onClick);
      quickGrid.appendChild(tile);
    });
    quickSection.appendChild(quickGrid);
    acc.appendChild(quickSection);

    var secSection = div('acc__section');
    secSection.appendChild(makeSectionHead(null, tr('account.changePassword','Change password')));
    var secCard = div('acc__prefs');
    secCard.style.padding = '20px 24px';
    secCard.appendChild(field(tr('account.currentPassword','Current password'), 'curr-pwd', 'password', '••••••••'));
    secCard.appendChild(field(tr('account.newPassword','New password'), 'new-pwd', 'password', tr('account.minChars','Min 8 characters')));
    secCard.appendChild(field(tr('account.confirmNewPassword','Confirm new password'), 'confirm-pwd', 'password', '••••••••'));
    var pwBtn = el('button', 'btn btn--outline');
    pwBtn.textContent = tr('account.updatePassword','Update password');
    pwBtn.addEventListener('click', async function () {
      var curr = document.getElementById('curr-pwd').value;
      var nw   = document.getElementById('new-pwd').value;
      var conf = document.getElementById('confirm-pwd').value;
      if (nw !== conf) { showToast(tr('account.passwordsDoNotMatch','Passwords do not match'), 'error'); return; }
      if (nw.length < 8) { showToast(tr('account.minChars','Minimum 8 characters'), 'error'); return; }
      pwBtn.disabled = true; pwBtn.textContent = 'Updating…';
      try {
        await apiPut('/user/password', { currentPassword: curr, newPassword: nw });
        showToast(tr('account.passwordUpdated','Password updated!'));
        ['curr-pwd','new-pwd','confirm-pwd'].forEach(function (id) { document.getElementById(id).value = ''; });
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_CREDENTIALS' || msg === 'INVALID_PASSWORD') msg = 'Incorrect current password';
        showToast(msg || tr('account.failedUpdatePassword','Failed to update password'), 'error');
      } finally { pwBtn.disabled = false; pwBtn.textContent = tr('account.updatePassword','Update password'); }
    });
    secCard.appendChild(pwBtn);
    secSection.appendChild(secCard);
    acc.appendChild(secSection);

    // Trakt.tv integration
    var traktSection = div('acc__section');
    traktSection.appendChild(makeSectionHead('05b', 'Connected apps'));
    var traktCard = div('acc__prefs');
    traktCard.style.padding = '20px 24px';
    var traktRow = div(); traktRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px;';
    var traktInfo = div();
    var traktLabel = div('acc__pref-label'); traktLabel.textContent = 'Trakt.tv';
    var traktHint = div('acc__pref-hint'); traktHint.textContent = 'Auto-mark watched on Trakt when you finish something.';
    traktInfo.appendChild(traktLabel); traktInfo.appendChild(traktHint);
    var traktBtn = el('button', 'btn btn--outline');
    traktBtn.textContent = 'Connect';
    traktBtn.style.flexShrink = '0';
    traktRow.appendChild(traktInfo); traktRow.appendChild(traktBtn);
    traktCard.appendChild(traktRow);

    // Discord link row inside "Connected apps"
    var dcDivider = div(); dcDivider.style.cssText = 'height:1px;background:var(--border);margin:14px -24px;';
    var dcRow = div(); dcRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:16px;';
    var dcInfo = div();
    var dcLabel = div('acc__pref-label'); dcLabel.textContent = 'Discord';
    var dcHint  = div('acc__pref-hint');  dcHint.textContent  = 'Link your account to get the ⭐ VIP role when Trakt is connected.';
    dcInfo.appendChild(dcLabel); dcInfo.appendChild(dcHint);
    var dcBtn = el('button', 'btn btn--outline');
    dcBtn.textContent = 'Link'; dcBtn.style.flexShrink = '0';
    dcRow.appendChild(dcInfo); dcRow.appendChild(dcBtn);

    var dcCodeWrap = div(); dcCodeWrap.style.cssText = 'margin-top:14px;display:none;';
    var dcCodeLbl  = div('acm__label'); dcCodeLbl.textContent = 'Run !link in Discord, then enter the code:';
    var dcCodeInput = el('input', 'acm__input');
    dcCodeInput.placeholder = 'XXXXXX'; dcCodeInput.maxLength = 6;
    dcCodeInput.style.cssText = 'text-transform:uppercase;letter-spacing:4px;font-size:20px;font-weight:700;text-align:center;margin-top:6px;';
    var dcCodeConfirm = el('button', 'btn btn--primary');
    dcCodeConfirm.textContent = 'Link Discord'; dcCodeConfirm.style.cssText = 'margin-top:8px;width:100%;';
    dcCodeWrap.appendChild(dcCodeLbl); dcCodeWrap.appendChild(dcCodeInput); dcCodeWrap.appendChild(dcCodeConfirm);

    traktCard.appendChild(dcDivider);
    traktCard.appendChild(dcRow);
    traktCard.appendChild(dcCodeWrap);
    traktSection.appendChild(traktCard);
    acc.appendChild(traktSection);

    // Load Discord status
    fetch(API_URL + '/user/discord-status', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        if (d.linked) {
          dcBtn.textContent = 'Unlink'; dcBtn.className = 'btn btn--ghost';
          dcHint.textContent = 'Linked as @' + d.discordUsername + ' — VIP role active when Trakt is connected.';
          dcBtn.onclick = function () {
            dcBtn.disabled = true;
            fetch(API_URL + '/user/link-discord', { method: 'DELETE', credentials: 'include' })
              .then(function () {
                dcBtn.textContent = 'Link'; dcBtn.className = 'btn btn--outline'; dcBtn.disabled = false;
                dcHint.textContent = 'Link your account to get the ⭐ VIP role when Trakt is connected.';
                showToast('Discord unlinked');
              }).catch(function () { dcBtn.disabled = false; });
          };
        } else {
          dcBtn.onclick = function () {
            dcCodeWrap.style.display = dcCodeWrap.style.display === 'none' ? 'block' : 'none';
            if (dcCodeWrap.style.display === 'block') dcCodeInput.focus();
          };
          dcCodeConfirm.onclick = function () {
            var code = dcCodeInput.value.trim().toUpperCase();
            if (code.length !== 6) { showToast('Enter the 6-character code', 'error'); return; }
            dcCodeConfirm.disabled = true;
            fetch(API_URL + '/user/link-discord', {
              method: 'POST', credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: code }),
            }).then(function (r) { return r.json(); })
              .then(function (d) {
                if (d.linked) {
                  dcBtn.textContent = 'Unlink'; dcBtn.className = 'btn btn--ghost';
                  dcHint.textContent = 'Linked as @' + d.discordUsername + ' — VIP role active when Trakt is connected.';
                  dcCodeWrap.style.display = 'none'; dcCodeInput.value = '';
                  showToast('Discord linked!');
                  dcBtn.onclick = null;
                } else {
                  showToast(d.error === 'INVALID_OR_EXPIRED_CODE' ? 'Code expired — run !link again' : 'Could not link Discord', 'error');
                  dcCodeConfirm.disabled = false;
                }
              }).catch(function () { showToast('Could not reach server', 'error'); dcCodeConfirm.disabled = false; });
          };
        }
      }).catch(function () {});

    // Load Trakt status
    fetch(API_URL + '/trakt/status', { credentials: 'include' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (!d) return;
        if (d.connected) {
          traktBtn.textContent = 'Disconnect';
          traktBtn.className = 'btn btn--ghost';
          traktHint.textContent = 'Connected as @' + d.username + ' — scrobbling is active.';
          traktBtn.onclick = function () {
            traktBtn.disabled = true;
            fetch(API_URL + '/trakt/disconnect', { method: 'DELETE', credentials: 'include' })
              .then(function () {
                traktBtn.textContent = 'Connect'; traktBtn.className = 'btn btn--outline'; traktBtn.disabled = false;
                traktHint.textContent = 'Auto-mark watched on Trakt when you finish something.';
                showToast('Trakt disconnected');
              }).catch(function () { traktBtn.disabled = false; });
          };
        } else {
          traktBtn.onclick = function () {
            fetch(API_URL + '/trakt/auth-url', { credentials: 'include' })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (!d.url) { showToast('Trakt not configured on this server', 'error'); return; }
                var popup = window.open(d.url, 'trakt_oauth', 'width=520,height=640,menubar=no,toolbar=no');
                window.addEventListener('message', function handler(ev) {
                  if (ev.origin !== window.location.origin) return;
                  if (ev.data && ev.data.type === 'trakt_connected') {
                    window.removeEventListener('message', handler);
                    traktBtn.textContent = 'Disconnect'; traktBtn.className = 'btn btn--ghost';
                    traktHint.textContent = 'Connected as @' + ev.data.username + ' — scrobbling is active.';
                    showToast('Trakt connected!');
                    if (popup && !popup.closed) popup.close();
                  }
                });
              }).catch(function () { showToast('Could not reach server', 'error'); });
          };
        }
      }).catch(function () {});

    var devSection = div('acc__section');
    var devList = div('acc__devices');
    var otherCount = sessions.filter(function (s) { return s.jti !== currentJti; }).length;
    devSection.appendChild(makeSectionHead('06', 'Signed-in devices', otherCount > 0 ? 'Sign out all others' : null, function () {
      fetch(API_URL + '/user/sessions/others', { method: 'DELETE', credentials: 'include' })
        .then(function () {
          var others = devList.querySelectorAll('.acc__device:not(.acc__device--current)');
          others.forEach(function (row) { row.style.transition = 'opacity 250ms'; row.style.opacity = '0'; setTimeout(function () { row.remove(); }, 260); });
          if (others.length) showToast('Signed out of ' + others.length + ' other session' + (others.length > 1 ? 's' : ''));
        })
        .catch(function () { showToast('Could not sign out other sessions'); });
    }));
    if (!sessions.length) {
      var noSess = div('acc__device');
      var noSessInfo = div('acc__device-info');
      var noSessName = div('acc__device-name'); noSessName.textContent = 'This device';
      var noSessMeta = div('acc__device-meta'); noSessMeta.textContent = 'Current session';
      noSessInfo.appendChild(noSessName); noSessInfo.appendChild(noSessMeta);
      var noSessIcon = div('acc__device-icon'); noSessIcon.textContent = '▤';
      noSess.appendChild(noSessIcon); noSess.appendChild(noSessInfo);
      devList.appendChild(noSess);
    } else {
      var sorted = sessions.slice().sort(function (a, b) {
        if (a.jti === currentJti) return -1;
        if (b.jti === currentJti) return 1;
        return new Date(b.lastSeen) - new Date(a.lastSeen);
      });
      sorted.forEach(function (s) {
        var isCurrent = s.jti === currentJti;
        var parsed = parseUA(s.ua);
        var row = div('acc__device' + (isCurrent ? ' acc__device--current' : ''));
        var icon = div('acc__device-icon'); icon.textContent = parsed.icon;
        var info = div('acc__device-info');
        var nameWrap = div('acc__device-name'); nameWrap.textContent = parsed.name + ' ';
        if (isCurrent) { var pill = el('span', 'acc__device-pill'); pill.textContent = '● This device'; nameWrap.appendChild(pill); }
        var metaStr = parsed.meta + (s.lastSeen ? ' · ' + timeAgo(s.lastSeen) : '');
        var meta = div('acc__device-meta'); meta.textContent = metaStr;
        info.appendChild(nameWrap); info.appendChild(meta);
        row.appendChild(icon); row.appendChild(info);
        if (!isCurrent) {
          var soBtn = el('button', 'acc__device-action');
          soBtn.textContent = 'Sign out';
          soBtn.addEventListener('click', (function (jti, devName, rowEl) {
            return function () {
              fetch(API_URL + '/user/sessions/' + jti, { method: 'DELETE', credentials: 'include' })
                .then(function () {
                  rowEl.style.transition = 'opacity 250ms'; rowEl.style.opacity = '0';
                  setTimeout(function () { rowEl.remove(); }, 260);
                  showToast('Signed out of ' + devName);
                })
                .catch(function () { showToast('Could not sign out that session'); });
            };
          })(s.jti, parsed.name, row));
          row.appendChild(soBtn);
        }
        devList.appendChild(row);
      });
    }
    devSection.appendChild(devList);
    acc.appendChild(devSection);

    var privSection = div('acc__section');
    privSection.appendChild(makeSectionHead('07', 'Privacy & data'));
    var privList = div('acc__prefs');
    [
      { label: 'Download my data',
        hint: 'Get a copy of your watch history, list, and account info as a JSON file.',
        onClick: downloadMyData },
      { label: 'Watch history',
        hint: 'View or clear the titles you\'ve watched.',
        onClick: function () { openWatchHistoryModal(wh); } },
      { label: 'Cookie & tracking settings',
        hint: 'Control what we collect to improve recommendations.',
        onClick: function () { openCookieSettingsModal(prefs); } },
    ].forEach(function (r) {
      var row = div('acc__pref-row acc__pref-row--clickable');
      var info = div('acc__pref-info');
      var lbl2  = div('acc__pref-label'); lbl2.textContent = r.label;
      var hint2 = div('acc__pref-hint');  hint2.textContent = r.hint;
      info.appendChild(lbl2); info.appendChild(hint2);
      var ctrl  = div('acc__pref-control');
      var arrow = el('span', 'acc__pref-arrow'); arrow.textContent = '›';
      ctrl.appendChild(arrow);
      row.appendChild(info); row.appendChild(ctrl);
      row.addEventListener('click', r.onClick);
      privList.appendChild(row);
    });
    privSection.appendChild(privList);
    acc.appendChild(privSection);

    var danger = div('acc__danger');
    var dangerInfo = div();
    var dangerText = div('acc__danger-text'); dangerText.textContent = 'Sign out of ELI6';
    var dangerHint = div('acc__danger-hint'); dangerHint.textContent = "You'll need to sign in again to keep watching. Your list and history stay safe.";
    dangerInfo.appendChild(dangerText); dangerInfo.appendChild(dangerHint);
    var dangerActions = div('acc__danger-actions');
    var signOutBtn = el('button', 'btn btn--outline');
    signOutBtn.textContent = tr('account.signOut','Sign out');
    signOutBtn.addEventListener('click', function () {
      fetch(API_URL + '/logout', { method: 'POST', credentials: 'include' }).catch(function () {});
      ['user','token','myList','keepWatching','watchHistory','currentContent'].forEach(function (k) { localStorage.removeItem(k); });
      showToast(tr('account.signedOut','Signed out'));
      renderPage(); window.renderTopNav('account');
    });
    var deleteBtn = el('button', 'btn btn--danger');
    deleteBtn.textContent = tr('account.deleteAccount','Delete account');
    deleteBtn.addEventListener('click', function () { openDeleteAccountModal(); });
    dangerActions.appendChild(signOutBtn); dangerActions.appendChild(deleteBtn);
    danger.appendChild(dangerInfo); danger.appendChild(dangerActions);
    acc.appendChild(danger);
  }


  function renderPage() {
    var mount = document.getElementById('account-mount');
    if (!mount) return;
    mount.innerHTML = '';

    if (getUser()) {
      var acc = div('acc');
      var phWrap = div();
      phWrap.innerHTML = '<div class="pagehead"><div class="pagehead__eyebrow">' + tr('account.settings','Settings') + '</div><h1 class="pagehead__title">' + tr('account.title','Account') + '</h1><p class="pagehead__sub">Everything about you on ELI6 — what you\'ve watched, what\'s queued, and how the app looks and feels.</p></div>';
      acc.appendChild(phWrap.firstChild);
      mount.appendChild(acc);
      renderAccountHub(acc);
    } else {
      var phWrap2 = div();
      phWrap2.innerHTML = '<div class="pagehead"><div class="pagehead__eyebrow">' + tr('account.settings','Settings') + '</div><h1 class="pagehead__title">' + tr('account.title','Account') + '</h1></div>';
      mount.appendChild(phWrap2.firstChild);
      renderAuthForms(mount);
    }

    window.renderFooter('footer-mount');
  }


  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('account');
    window.renderBottomNav('account');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('account');
      window.renderBottomNav('account');
    });
    window.addEventListener('eli6.langChanged', function () { renderPage(); });
  });

})();

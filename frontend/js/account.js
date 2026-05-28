// ELI6 Movies — account page

(function () {
  var API_URL = window.API_BASE_URL || '';
  var TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

  // ─── helpers ────────────────────────────────────────────────────────────────

  function tr(key, fallback) {
    return (window.i18n && window.i18n.t) ? window.i18n.t(key, fallback) : fallback;
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
  function getToken() { return localStorage.getItem('token'); }

  // ─── Prefs ──────────────────────────────────────────────────────────────────

  var DEFAULT_PREFS = {
    autoplayNext: true,
    autoplayPreviews: false,
    wifiOnly: true,
    skipIntro: true,
    notifyReleases: true,
    notifyRecs: false,
    quality: 'Auto · up to 4K',
    language: 'English',
    subtitles: 'English (CC)',
    audio: 'Original',
  };
  function loadPrefs() {
    try { return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem('eli6.acctPrefs') || '{}')); }
    catch (e) { return Object.assign({}, DEFAULT_PREFS); }
  }
  function savePrefs(p) { localStorage.setItem('eli6.acctPrefs', JSON.stringify(p)); }

  // ─── API calls ──────────────────────────────────────────────────────────────

  async function apiPost(path, body) {
    var r = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
    return d;
  }
  async function apiPut(path, body) {
    var r = await fetch(API_URL + path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify(body),
    });
    var d = await r.json();
    if (!r.ok) throw new Error(d.message || d.error || 'Request failed');
    return d;
  }
  async function apiDelete(path) {
    var r = await fetch(API_URL + path, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer ' + getToken() },
    });
    if (!r.ok) { var d = await r.json(); throw new Error(d.message || 'Failed'); }
    return true;
  }

  // ─── Hub data fetching ──────────────────────────────────────────────────────

  async function fetchHubData() {
    var headers = { Authorization: 'Bearer ' + getToken() };
    var keepWatching = [], watchHistory = [], myList = [];
    try {
      var results = await Promise.all([
        fetch(API_URL + '/user/keep-watching', { headers }),
        fetch(API_URL + '/user/watched',       { headers }),
        fetch(API_URL + '/user/profile',       { headers }),
      ]);
      if (results[0].ok) keepWatching = await results[0].json();
      if (results[1].ok) watchHistory = await results[1].json();
      if (results[2].ok) {
        var prof = await results[2].json();
        myList = prof.myList || [];
        localStorage.setItem('myList', JSON.stringify(myList));
        if (prof.createdAt) {
          var u = getUser() || {};
          u.createdAt = prof.createdAt;
          localStorage.setItem('user', JSON.stringify(u));
        }
      }
    } catch (e) {
      var cached = getUser() || {};
      keepWatching = cached.keepWatching || [];
      watchHistory = cached.watchHistory || [];
      try { myList = JSON.parse(localStorage.getItem('myList') || '[]'); } catch (e2) {}
    }
    return { keepWatching: keepWatching, watchHistory: watchHistory, myList: myList };
  }

  // ─── Stats helpers ──────────────────────────────────────────────────────────

  function calcStreak(watchHistory) {
    if (!watchHistory || !watchHistory.length) return 0;
    var daySet = new Set(watchHistory.map(function (i) {
      return new Date(i.last_watched).toDateString();
    }));
    var streak = 0;
    var d = new Date();
    while (daySet.has(d.toDateString())) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    if (streak === 0) {
      d = new Date();
      d.setDate(d.getDate() - 1);
      while (daySet.has(d.toDateString())) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
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
      { name: 'Movies',   pct: Math.round((counts.movie  || 0) * 100 / total) },
      { name: 'TV Shows', pct: Math.round((counts.tv     || 0) * 100 / total) },
      { name: 'Anime',    pct: Math.round((counts.anime  || 0) * 100 / total) },
    ].filter(function (b) { return b.pct > 0; });
  }

  function gradientForId(id) {
    var n = id || 0;
    var h1 = (n * 137 + 11) % 360;
    var h2 = (n * 97  + 200) % 360;
    var h3 = (n * 53  + 300) % 360;
    return ['hsl(' + h1 + ',55%,14%)', 'hsl(' + h2 + ',45%,18%)', 'hsl(' + h3 + ',50%,16%)'];
  }

  function formatMemberSince(createdAt) {
    if (!createdAt) return '—';
    try { return new Date(createdAt).toLocaleString('default', { month: 'short', year: 'numeric' }); }
    catch (e) { return '—'; }
  }

  // ─── Picker modal ───────────────────────────────────────────────────────────

  function closePicker(backdrop) {
    if (!backdrop.parentNode) return;
    backdrop.style.animation = 'e6-fade-in 150ms ease reverse forwards';
    setTimeout(function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, 150);
  }

  function openPicker(title, options, current, onSelect) {
    var backdrop = div('acc__picker-backdrop');
    var sheet    = div('acc__picker');
    var sheetTitle = div('acc__picker-title');
    sheetTitle.textContent = title;
    sheet.appendChild(sheetTitle);
    var optList = div('acc__picker-options');
    options.forEach(function (opt) {
      var row = el('button', 'acc__picker-option' + (opt === current ? ' is-active' : ''));
      row.textContent = opt;
      row.addEventListener('click', function () { onSelect(opt); closePicker(backdrop); });
      optList.appendChild(row);
    });
    sheet.appendChild(optList);
    var cancel = el('button', 'acc__picker-cancel');
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', function () { closePicker(backdrop); });
    sheet.appendChild(cancel);
    backdrop.appendChild(sheet);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) closePicker(backdrop); });
    document.body.appendChild(backdrop);
  }

  // ─── Auth forms ─────────────────────────────────────────────────────────────

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
    tabs.style.cssText = 'display:flex;gap:4px;margin-bottom:28px;background:var(--surface);border-radius:var(--r-pill);padding:4px;border:1px solid var(--border)';
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
    tabReg.addEventListener('click',   function () { setTab('reg'); });

    var loginForm = el('form');
    loginForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.welcomeBack', 'Welcome back') + '</h2>';
    loginForm.appendChild(field(tr('account.email', 'Email'), 'login-email', 'email', 'you@example.com'));
    loginForm.appendChild(field(tr('account.password', 'Password'), 'login-pwd', 'password', '••••••••'));
    var loginBtn = el('button', 'btn btn--primary');
    loginBtn.type = 'submit'; loginBtn.textContent = tr('account.signIn', 'Sign in');
    loginBtn.style.cssText = 'width:100%;margin-top:8px';
    loginForm.appendChild(loginBtn);
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailVal = document.getElementById('login-email').value.trim();
      var pwdVal   = document.getElementById('login-pwd').value;
      if (!emailVal || !pwdVal) { showToast(tr('account.errorInvalidInput', 'Enter your email and password'), 'error'); return; }
      loginBtn.textContent = tr('account.signingIn', 'Signing in…'); loginBtn.disabled = true;
      try {
        var d = await apiPost('/login', { email: emailVal, password: pwdVal });
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.signedIn', 'Signed in!'));
        renderPage(); window.renderTopNav('account');
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_CREDENTIALS' || msg === 'INVALID_INPUT') msg = tr('account.errorInvalidCredentials', 'Incorrect email or password');
        showToast(msg || tr('account.signInFailed', 'Sign in failed'), 'error');
      } finally { loginBtn.textContent = tr('account.signIn', 'Sign in'); loginBtn.disabled = false; }
    });
    wrap.appendChild(loginForm);

    var regForm = el('form');
    regForm.style.display = 'none';
    regForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.createAccountTab', 'Create account') + '</h2>';
    regForm.appendChild(field(tr('account.username', 'Username'), 'reg-username', 'text', 'CoolViewer'));
    regForm.appendChild(field(tr('account.email', 'Email'), 'reg-email', 'email', 'you@example.com'));
    regForm.appendChild(field(tr('account.password', 'Password'), 'reg-pwd', 'password', tr('account.minChars', 'Min 8 characters')));
    var regBtn = el('button', 'btn btn--primary');
    regBtn.type = 'submit'; regBtn.textContent = tr('account.createAccountTab', 'Create account');
    regBtn.style.cssText = 'width:100%;margin-top:8px';
    regForm.appendChild(regBtn);
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      var usernameVal = document.getElementById('reg-username').value.trim();
      var emailVal    = document.getElementById('reg-email').value.trim();
      var pwdVal      = document.getElementById('reg-pwd').value;
      if (usernameVal.length < 3) { showToast(tr('account.errorUsernameTooShort', 'Username must be at least 3 characters'), 'error'); return; }
      if (!emailVal.includes('@')) { showToast(tr('account.errorInvalidEmail', 'Enter a valid email address'), 'error'); return; }
      if (pwdVal.length < 8) { showToast(tr('account.minChars', 'Minimum 8 characters'), 'error'); return; }
      regBtn.textContent = tr('account.creating', 'Creating…'); regBtn.disabled = true;
      try {
        var d = await apiPost('/register', { username: usernameVal, email: emailVal, password: pwdVal });
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.accountCreated', 'Account created!'));
        renderPage(); window.renderTopNav('account');
      } catch (err) {
        var msg = err.message;
        if (msg === 'INVALID_INPUT') msg = tr('account.errorInvalidInput', 'Check: username (3+ chars), valid email, password (8+ chars)');
        else if (msg === 'USER_EXISTS') msg = tr('account.errorUserExists', 'An account with this email already exists');
        showToast(msg || tr('account.registrationFailed', 'Registration failed'), 'error');
      } finally { regBtn.textContent = tr('account.createAccountTab', 'Create account'); regBtn.disabled = false; }
    });
    wrap.appendChild(regForm);
    mount.appendChild(wrap);
  }

  // ─── Hub section builders ────────────────────────────────────────────────────

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

  // ─── Account hub (async, real data) ─────────────────────────────────────────

  async function renderAccountHub(acc) {
    var user    = getUser() || {};
    var prefs   = loadPrefs();

    // ── HERO (render immediately from localStorage) ───────────────────────────
    var memberSince = formatMemberSince(user.createdAt);
    var cachedWH    = user.watchHistory || [];
    var streak      = calcStreak(cachedWH);

    var hero = div('acc__hero');
    hero.appendChild(div('acc__hero-bg'));
    var heroInner = div('acc__hero-inner');

    var avatarWrap = div('acc__avatar-wrap');
    var avatarEl   = div('acc__avatar');
    avatarEl.textContent = (user.username || 'E')[0].toUpperCase();
    avatarWrap.appendChild(avatarEl);
    var editBtn2 = el('button', 'acc__avatar-edit');
    editBtn2.title = 'Change picture'; editBtn2.textContent = '✎';
    avatarWrap.appendChild(editBtn2);
    heroInner.appendChild(avatarWrap);

    var heroText = div('acc__hero-text');
    var nameEl = el('h2', 'acc__name'); nameEl.textContent = user.username || 'User';
    var emailEl = div('acc__email'); emailEl.textContent = user.email || '';
    var badges = div('acc__badges');
    var b1 = el('span', 'acc__badge acc__badge--accent'); b1.textContent = '● Free · Forever';
    var b2 = el('span', 'acc__badge'); b2.textContent = 'Member since ' + memberSince;
    var b3 = el('span', 'acc__badge'); b3.textContent = streak + '-day streak';
    badges.appendChild(b1); badges.appendChild(b2); badges.appendChild(b3);
    heroText.appendChild(nameEl); heroText.appendChild(emailEl); heroText.appendChild(badges);
    heroInner.appendChild(heroText);

    var heroActions = div('acc__hero-actions');
    var editProfileBtn = el('button', 'btn btn--primary');
    editProfileBtn.textContent = tr('account.editProfile', 'Edit profile');
    editProfileBtn.addEventListener('click', function () { showToast('Profile editing coming soon'); });
    var appearBtn = el('button', 'btn btn--outline');
    appearBtn.textContent = '✦ ' + tr('account.appearance', 'Appearance');
    appearBtn.addEventListener('click', function () { window.location.href = 'settings.html'; });
    heroActions.appendChild(editProfileBtn); heroActions.appendChild(appearBtn);
    heroInner.appendChild(heroActions);
    hero.appendChild(heroInner);
    acc.appendChild(hero);

    // ── LOADING STATE for data sections ───────────────────────────────────────
    var loadEl = div();
    loadEl.style.cssText = 'padding:60px var(--pad-x);text-align:center;color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.15em;text-transform:uppercase';
    loadEl.textContent = 'Loading…';
    acc.appendChild(loadEl);

    // ── FETCH REAL DATA ───────────────────────────────────────────────────────
    var data = await fetchHubData();
    if (!acc.isConnected) return;
    acc.removeChild(loadEl);

    var kw  = Array.isArray(data.keepWatching) ? data.keepWatching : [];
    var wh  = Array.isArray(data.watchHistory)  ? data.watchHistory  : [];
    var ml  = Array.isArray(data.myList)         ? data.myList         : [];

    // Update hero badges with fresh data
    var freshStreak = calcStreak(wh);
    b3.textContent = freshStreak + '-day streak';
    var freshUser = getUser() || {};
    if (freshUser.createdAt) b2.textContent = 'Member since ' + formatMemberSince(freshUser.createdAt);

    // ── STATS ─────────────────────────────────────────────────────────────────
    var hours = estimateHours(wh);
    var statGrid = div('acc__statgrid');
    [
      { k: 'Titles watched', v: String(wh.length),
        sub: wh.length === 1 ? '1 title total' : wh.length + ' titles total', trend: null },
      { k: 'Hours streamed', v: String(hours),
        sub: hours > 0 ? '≈ ' + Math.round(hours / 24 * 10) / 10 + ' days of viewing' : 'start watching!', trend: null },
      { k: 'In your list',   v: String(ml.length),
        sub: ml.length === 1 ? '1 title saved' : ml.length + ' titles saved', trend: null },
      { k: 'Current streak', v: String(freshStreak),
        sub: freshStreak === 1 ? 'day in a row' : 'days in a row', trend: freshStreak >= 3 ? '🔥' : null },
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

    // ── KEEP WATCHING ─────────────────────────────────────────────────────────
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
          card.style.backgroundImage = 'url(' + TMDB_IMG + item.poster_path + ')';
          card.style.backgroundSize  = 'cover';
          card.style.backgroundPosition = 'center';
        } else {
          var gc = gradientForId(item.id);
          card.style.background = 'linear-gradient(125deg,' + gc[0] + ',' + gc[1] + ' 60%,' + gc[2] + ')';
        }
        var meta = div('acc__cont-card-meta');
        if (item.type === 'tv' && item.season && item.episode) {
          meta.textContent = 'S' + item.season + '·E' + item.episode;
        } else if (item.type === 'anime' && item.episode) {
          meta.textContent = 'EP ' + item.episode;
        } else if (item.type === 'anime') {
          meta.textContent = 'ANIME';
        } else {
          meta.textContent = 'FEATURE';
        }
        var titleEl2 = div('acc__cont-card-title'); titleEl2.textContent = item.title || '';
        var barWrap = div('acc__cont-card-bar');
        var barFill = div(); barFill.style.width = Math.min(100, item.progress || 0) + '%';
        barWrap.appendChild(barFill);
        var playBtn = div('acc__cont-card-play'); playBtn.innerHTML = '<div>▶</div>';
        card.appendChild(meta); card.appendChild(titleEl2); card.appendChild(barWrap); card.appendChild(playBtn);
        card.addEventListener('click', function () {
          var url = 'player.html?type=' + (item.type || 'movie') + '&id=' + item.id;
          if (item.type === 'tv' && item.season && item.episode) {
            url += '&season=' + item.season + '&episode=' + item.episode;
          }
          window.location.href = url;
        });
        contStrip.appendChild(card);
      });
      contSection.appendChild(contStrip);
    }
    acc.appendChild(contSection);

    // ── WATCH BREAKDOWN (real type distribution from watch history) ───────────
    var tasteSection = div('acc__section');
    var breakdownBars = calcTypeBreakdown(wh);

    if (breakdownBars.length === 0) {
      tasteSection.appendChild(makeSectionHead('02', 'Watch breakdown'));
      var emptyTaste = div();
      emptyTaste.style.cssText = 'padding:28px 0;color:var(--fg-muted);font-family:var(--font-mono);font-size:11px;letter-spacing:0.1em';
      emptyTaste.textContent = 'Start watching to see your breakdown here.';
      tasteSection.appendChild(emptyTaste);
    } else {
      tasteSection.appendChild(makeSectionHead('02', 'Watch breakdown'));
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
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { fill.style.width = g.pct + '%'; });
        });
      });
      tasteSection.appendChild(taste);
    }
    acc.appendChild(tasteSection);

    // ── QUICK ACTIONS ─────────────────────────────────────────────────────────
    var quickSection = div('acc__section');
    quickSection.appendChild(makeSectionHead('03', 'Quick actions'));
    var quickGrid = div('acc__quick');
    [
      { icon: '✦', label: tr('account.appearance', 'Appearance'), sub: 'Theme, accent, layout',
        onClick: function () { window.location.href = 'settings.html'; } },
      { icon: '♥', label: tr('nav.mylist', 'My List'), sub: ml.length + ' items saved',
        onClick: function () { window.location.href = 'mylist.html'; } },
      { icon: '⏱', label: 'Watch history', sub: wh.length + ' titles watched',
        onClick: function () { showToast('Watch history coming soon'); } },
      { icon: '↗', label: 'Refer a friend', sub: 'Share ELI6 — it\'s free',
        onClick: function () {
          if (navigator.share) { navigator.share({ title: 'ELI6 Movies', url: window.location.origin }); }
          else { if (navigator.clipboard) navigator.clipboard.writeText(window.location.origin); showToast('Link copied!'); }
        }},
      { icon: '?', label: 'Help & support', sub: 'FAQs, contact',
        onClick: function () { showToast('Help center coming soon'); } },
    ].forEach(function (q) {
      var tile = el('button', 'acc__quick-tile');
      var icon = div('acc__quick-icon'); icon.textContent = q.icon;
      var textWrap = div();
      var qlabel = div('acc__quick-label'); qlabel.textContent = q.label;
      var qsub = div('acc__quick-sub'); qsub.textContent = q.sub;
      textWrap.appendChild(qlabel); textWrap.appendChild(qsub);
      var arrow = el('span', 'acc__quick-arrow'); arrow.textContent = '→';
      tile.appendChild(icon); tile.appendChild(textWrap); tile.appendChild(arrow);
      tile.addEventListener('click', q.onClick);
      quickGrid.appendChild(tile);
    });
    quickSection.appendChild(quickGrid);
    acc.appendChild(quickSection);

    // ── PLAYBACK PREFERENCES ──────────────────────────────────────────────────
    var prefSection = div('acc__section');
    prefSection.appendChild(makeSectionHead('04', 'Playback preferences'));
    var prefList = div('acc__prefs');
    prefList.appendChild(makePrefValueRow('Streaming quality', 'Higher quality uses more data.', prefs.quality, function (valueEl) {
      openPicker('Streaming quality', ['Auto · up to 4K', '1080p', '720p', '480p'], prefs.quality, function (v) { prefs.quality = v; valueEl.textContent = v; savePrefs(prefs); });
    }));
    prefList.appendChild(makePrefToggleRow('Autoplay next episode', 'Roll straight into the next one.', prefs.autoplayNext, function (v) { prefs.autoplayNext = v; savePrefs(prefs); }));
    prefList.appendChild(makePrefToggleRow('Autoplay previews while browsing', 'Play short previews when you hover over titles.', prefs.autoplayPreviews, function (v) { prefs.autoplayPreviews = v; savePrefs(prefs); }));
    prefList.appendChild(makePrefToggleRow('Skip intros automatically', 'Jump past opening titles for shows.', prefs.skipIntro, function (v) { prefs.skipIntro = v; savePrefs(prefs); }));
    prefList.appendChild(makePrefToggleRow('Downloads over Wi-Fi only', "Don't use mobile data for downloads.", prefs.wifiOnly, function (v) { prefs.wifiOnly = v; savePrefs(prefs); }));
    prefList.appendChild(makePrefValueRow('App language', 'Interface text and menus.', prefs.language, function (valueEl) {
      openPicker('App language', ['English', 'Italiano', 'Русский'], prefs.language, function (v) {
        prefs.language = v; valueEl.textContent = v; savePrefs(prefs);
        var langMap = { 'English': 'en', 'Italiano': 'it', 'Русский': 'ru' };
        if (window.i18n && window.i18n.changeLanguage) window.i18n.changeLanguage(langMap[v] || 'en');
      });
    }));
    prefList.appendChild(makePrefValueRow('Subtitles', 'Default subtitle track when available.', prefs.subtitles, function (valueEl) {
      openPicker('Subtitles', ['Off', 'English (CC)', 'English', 'Italiano', 'Русский'], prefs.subtitles, function (v) { prefs.subtitles = v; valueEl.textContent = v; savePrefs(prefs); });
    }));
    prefList.appendChild(makePrefValueRow('Audio track', 'Original audio, dubbed, or descriptive.', prefs.audio, function (valueEl) {
      openPicker('Audio track', ['Original', 'English dubbed', 'Descriptive audio'], prefs.audio, function (v) { prefs.audio = v; valueEl.textContent = v; savePrefs(prefs); });
    }));
    prefSection.appendChild(prefList);
    acc.appendChild(prefSection);

    // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
    var notifSection = div('acc__section');
    notifSection.appendChild(makeSectionHead('05', 'Notifications'));
    var notifList = div('acc__prefs');
    notifList.appendChild(makePrefToggleRow('New episodes & releases', 'When something on your list drops.', prefs.notifyReleases, function (v) { prefs.notifyReleases = v; savePrefs(prefs); }));
    notifList.appendChild(makePrefToggleRow('Recommendations', 'Suggestions based on what you watch.', prefs.notifyRecs, function (v) { prefs.notifyRecs = v; savePrefs(prefs); }));
    notifSection.appendChild(notifList);
    acc.appendChild(notifSection);

    // ── CHANGE PASSWORD ───────────────────────────────────────────────────────
    var secSection = div('acc__section');
    secSection.appendChild(makeSectionHead(null, tr('account.changePassword', 'Change password')));
    var secCard = div('acc__prefs');
    secCard.style.padding = '20px 24px';
    secCard.appendChild(field(tr('account.currentPassword', 'Current password'), 'curr-pwd', 'password', '••••••••'));
    secCard.appendChild(field(tr('account.newPassword', 'New password'), 'new-pwd', 'password', tr('account.minChars', 'Min 8 characters')));
    secCard.appendChild(field(tr('account.confirmNewPassword', 'Confirm new password'), 'confirm-pwd', 'password', '••••••••'));
    var pwBtn = el('button', 'btn btn--outline');
    pwBtn.textContent = tr('account.updatePassword', 'Update password');
    pwBtn.addEventListener('click', async function () {
      var curr = document.getElementById('curr-pwd').value;
      var nw   = document.getElementById('new-pwd').value;
      var conf = document.getElementById('confirm-pwd').value;
      if (nw !== conf) { showToast(tr('account.passwordsDoNotMatch', 'Passwords do not match'), 'error'); return; }
      if (nw.length < 8) { showToast(tr('account.minChars', 'Minimum 8 characters'), 'error'); return; }
      try {
        await apiPut('/user/password', { currentPassword: curr, newPassword: nw });
        showToast(tr('account.passwordUpdated', 'Password updated!'));
        ['curr-pwd', 'new-pwd', 'confirm-pwd'].forEach(function (id) { document.getElementById(id).value = ''; });
      } catch (err) { showToast(err.message || tr('account.failedUpdatePassword', 'Failed to update password'), 'error'); }
    });
    secCard.appendChild(pwBtn);
    secSection.appendChild(secCard);
    acc.appendChild(secSection);

    // ── SIGNED-IN DEVICES ─────────────────────────────────────────────────────
    var devSection = div('acc__section');
    var devList = div('acc__devices');
    devSection.appendChild(makeSectionHead('06', 'Signed-in devices', 'Sign out all others', function () {
      var others = devList.querySelectorAll('.acc__device:not(.acc__device--current)');
      others.forEach(function (row) { row.style.transition = 'opacity 250ms'; row.style.opacity = '0'; setTimeout(function () { row.remove(); }, 260); });
      if (others.length) showToast('Signed out of ' + others.length + ' other device' + (others.length > 1 ? 's' : ''));
    }));
    [
      { icon: '▣', name: 'This device',     meta: 'Current session',   current: true  },
      { icon: '▢', name: 'iPhone 15 Pro',   meta: 'iOS app · 2 hours ago',  current: false },
      { icon: '▤', name: 'Living-room TV',  meta: 'Smart TV · Yesterday',   current: false },
      { icon: '▥', name: 'iPad Air',        meta: 'iPadOS app · Last week',  current: false },
    ].forEach(function (d) {
      var row = div('acc__device' + (d.current ? ' acc__device--current' : ''));
      var icon = div('acc__device-icon'); icon.textContent = d.icon;
      var info = div('acc__device-info');
      var nameWrap = div('acc__device-name'); nameWrap.textContent = d.name + ' ';
      if (d.current) { var pill = el('span', 'acc__device-pill'); pill.textContent = '● This device'; nameWrap.appendChild(pill); }
      var meta = div('acc__device-meta'); meta.textContent = d.meta;
      info.appendChild(nameWrap); info.appendChild(meta);
      row.appendChild(icon); row.appendChild(info);
      if (!d.current) {
        var soBtn = el('button', 'acc__device-action');
        soBtn.textContent = 'Sign out';
        soBtn.addEventListener('click', function () {
          row.style.transition = 'opacity 250ms'; row.style.opacity = '0';
          setTimeout(function () { row.remove(); }, 260);
          showToast('Signed out of ' + d.name);
        });
        row.appendChild(soBtn);
      }
      devList.appendChild(row);
    });
    devSection.appendChild(devList);
    acc.appendChild(devSection);

    // ── PRIVACY & DATA ────────────────────────────────────────────────────────
    var privSection = div('acc__section');
    privSection.appendChild(makeSectionHead('07', 'Privacy & data'));
    var privList = div('acc__prefs');
    [
      { label: 'Download my data',           hint: 'Get a copy of your watch history, list, and ratings.',
        onClick: function () { showToast('Data export requested. We\'ll email you a link.'); } },
      { label: 'Watch history',              hint: 'View or clear what you\'ve watched.',
        onClick: function () { showToast('Watch history coming soon'); } },
      { label: 'Cookie & tracking settings', hint: 'Control what we collect to improve recommendations.',
        onClick: function () { showToast('Cookie settings coming soon'); } },
    ].forEach(function (r) {
      var row = div('acc__pref-row acc__pref-row--clickable');
      var info = div('acc__pref-info');
      var lbl2 = div('acc__pref-label'); lbl2.textContent = r.label;
      var hint2 = div('acc__pref-hint'); hint2.textContent = r.hint;
      info.appendChild(lbl2); info.appendChild(hint2);
      var ctrl = div('acc__pref-control');
      var arrow = el('span', 'acc__pref-arrow'); arrow.textContent = '›';
      ctrl.appendChild(arrow);
      row.appendChild(info); row.appendChild(ctrl);
      row.addEventListener('click', r.onClick);
      privList.appendChild(row);
    });
    privSection.appendChild(privList);
    acc.appendChild(privSection);

    // ── DANGER ZONE ───────────────────────────────────────────────────────────
    var danger = div('acc__danger');
    var dangerInfo = div();
    var dangerText = div('acc__danger-text'); dangerText.textContent = 'Sign out of ELI6';
    var dangerHint = div('acc__danger-hint'); dangerHint.textContent = "You'll need to sign in again to keep watching. Your list and history stay safe.";
    dangerInfo.appendChild(dangerText); dangerInfo.appendChild(dangerHint);
    var dangerActions = div('acc__danger-actions');
    var signOutBtn = el('button', 'btn btn--outline');
    signOutBtn.textContent = tr('account.signOut', 'Sign out');
    signOutBtn.addEventListener('click', function () {
      fetch(API_URL + '/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + getToken() } }).catch(function () {});
      ['user', 'token', 'myList', 'keepWatching', 'watchHistory', 'currentContent'].forEach(function (k) { localStorage.removeItem(k); });
      showToast(tr('account.signedOut', 'Signed out'));
      renderPage(); window.renderTopNav('account');
    });
    var deleteBtn = el('button', 'btn btn--danger');
    deleteBtn.textContent = tr('account.deleteAccount', 'Delete account');
    deleteBtn.addEventListener('click', async function () {
      if (!confirm(tr('account.deleteConfirm', 'Delete your account? This cannot be undone.'))) return;
      try {
        await apiDelete('/user/delete');
        ['user', 'token', 'myList', 'keepWatching', 'watchHistory', 'currentContent'].forEach(function (k) { localStorage.removeItem(k); });
        showToast(tr('account.accountDeleted', 'Account deleted'));
        renderPage(); window.renderTopNav('account');
      } catch (err) { showToast(err.message || tr('account.failedDelete', 'Failed to delete account'), 'error'); }
    });
    dangerActions.appendChild(signOutBtn); dangerActions.appendChild(deleteBtn);
    danger.appendChild(dangerInfo); danger.appendChild(dangerActions);
    acc.appendChild(danger);
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  function renderPage() {
    var mount = document.getElementById('account-mount');
    if (!mount) return;
    mount.innerHTML = '';

    if (getToken() && getUser()) {
      var acc = div('acc');
      var phWrap = div();
      phWrap.innerHTML = '<div class="pagehead"><div class="pagehead__eyebrow">' + tr('account.settings', 'Settings') + '</div><h1 class="pagehead__title">' + tr('account.title', 'Account') + '</h1><p class="pagehead__sub">Everything about you on ELI6 — what you\'ve watched, what\'s queued, and how the app looks and feels.</p></div>';
      acc.appendChild(phWrap.firstChild);
      mount.appendChild(acc);
      renderAccountHub(acc);
    } else {
      var phWrap2 = div();
      phWrap2.innerHTML = '<div class="pagehead"><div class="pagehead__eyebrow">' + tr('account.settings', 'Settings') + '</div><h1 class="pagehead__title">' + tr('account.title', 'Account') + '</h1></div>';
      mount.appendChild(phWrap2.firstChild);
      renderAuthForms(mount);
    }

    window.renderFooter('footer-mount');
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', function () {
    window.renderTopNav('account');
    window.renderBottomNav('account');
    renderPage();
    document.addEventListener('eli6.themeChanged', function () {
      window.renderTopNav('account');
      window.renderBottomNav('account');
    });
    window.addEventListener('eli6.langChanged', function () {
      renderPage();
    });
  });

})();

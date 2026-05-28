// ELI6 Movies — account page

(function () {
  var API_URL = window.API_BASE_URL || '';

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

  // ─── Auth forms ─────────────────────────────────────────────────────────────

  function renderAuthForms(mount) {
    mount.innerHTML = '';
    var wrap = div();
    wrap.style.cssText = 'max-width:440px;margin:40px auto;padding:0 var(--pad-x)';

    // Tabs
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
      loginForm.style.display  = which === 'login' ? 'block' : 'none';
      regForm.style.display    = which === 'reg'   ? 'block' : 'none';
    }
    tabLogin.addEventListener('click', function () { setTab('login'); });
    tabReg.addEventListener('click',   function () { setTab('reg'); });

    // Login form
    var loginForm = el('form');
    loginForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.welcomeBack', 'Welcome back') + '</h2>';
    loginForm.appendChild(field(tr('account.email', 'Email'), 'login-email', 'email', 'you@example.com'));
    loginForm.appendChild(field(tr('account.password', 'Password'), 'login-pwd', 'password', '••••••••'));
    var loginBtn = el('button', 'btn btn--primary');
    loginBtn.type = 'submit'; loginBtn.textContent = tr('account.signIn', 'Sign in');
    loginBtn.style.width = '100%'; loginBtn.style.marginTop = '8px';
    loginForm.appendChild(loginBtn);
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      loginBtn.textContent = tr('account.signingIn', 'Signing in…'); loginBtn.disabled = true;
      try {
        var d = await apiPost('/auth/login', { email: document.getElementById('login-email').value, password: document.getElementById('login-pwd').value });
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.signedIn', 'Signed in!'));
        renderPage();
        window.renderTopNav('account');
      } catch (err) {
        showToast(err.message || tr('account.signInFailed', 'Sign in failed'), 'error');
      } finally { loginBtn.textContent = tr('account.signIn', 'Sign in'); loginBtn.disabled = false; }
    });
    wrap.appendChild(loginForm);

    // Register form
    var regForm = el('form');
    regForm.style.display = 'none';
    regForm.innerHTML = '<h2 style="font-family:var(--font-head);font-weight:var(--head-weight);font-size:24px;margin:0 0 24px;color:var(--fg)">' + tr('account.createAccountTab', 'Create account') + '</h2>';
    regForm.appendChild(field(tr('account.username', 'Username'), 'reg-username', 'text', 'CoolViewer'));
    regForm.appendChild(field(tr('account.email', 'Email'), 'reg-email', 'email', 'you@example.com'));
    regForm.appendChild(field(tr('account.password', 'Password'), 'reg-pwd', 'password', tr('account.minChars', 'Min 8 characters')));
    var regBtn = el('button', 'btn btn--primary');
    regBtn.type = 'submit'; regBtn.textContent = tr('account.createAccountTab', 'Create account');
    regBtn.style.width = '100%'; regBtn.style.marginTop = '8px';
    regForm.appendChild(regBtn);
    regForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      regBtn.textContent = tr('account.creating', 'Creating…'); regBtn.disabled = true;
      try {
        var d = await apiPost('/auth/register', { username: document.getElementById('reg-username').value, email: document.getElementById('reg-email').value, password: document.getElementById('reg-pwd').value });
        localStorage.setItem('token', d.token);
        localStorage.setItem('user', JSON.stringify(d.user));
        showToast(tr('account.accountCreated', 'Account created!'));
        renderPage();
        window.renderTopNav('account');
      } catch (err) {
        showToast(err.message || tr('account.registrationFailed', 'Registration failed'), 'error');
      } finally { regBtn.textContent = tr('account.createAccountTab', 'Create account'); regBtn.disabled = false; }
    });
    wrap.appendChild(regForm);

    mount.appendChild(wrap);
  }

  function field(label, id, type, placeholder) {
    var wrap = div();
    wrap.style.marginBottom = '16px';
    var lbl = el('label');
    lbl.textContent = label;
    lbl.htmlFor = id;
    lbl.style.cssText = 'display:block;font-size:13px;font-weight:600;color:var(--fg-muted);margin-bottom:6px';
    var input = el('input');
    input.id = id; input.type = type; input.placeholder = placeholder;
    input.style.cssText = 'width:100%;padding:12px 14px;background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:var(--r-md);font-family:inherit;font-size:15px;outline:none;transition:border-color 150ms';
    input.addEventListener('focus', function () { input.style.borderColor = 'var(--accent)'; });
    input.addEventListener('blur', function () { input.style.borderColor = 'var(--border)'; });
    wrap.appendChild(lbl); wrap.appendChild(input);
    return wrap;
  }

  // ─── Profile view ────────────────────────────────────────────────────────────

  function renderProfile(mount) {
    mount.innerHTML = '';
    var user = getUser() || {};
    var wrap = div();
    wrap.style.cssText = 'max-width:640px;margin:40px auto;padding:0 var(--pad-x)';

    // Profile card
    var card = div('account__card');
    var profileRow = div('account__profile');
    var avatar = div('account__avatar');
    avatar.textContent = (user.username || 'E')[0].toUpperCase();
    var info = div();
    var name = div('account__name'); name.textContent = user.username || 'User';
    var email = div('account__email'); email.textContent = user.email || '';
    info.appendChild(name); info.appendChild(email);
    profileRow.appendChild(avatar); profileRow.appendChild(info);
    card.appendChild(profileRow);

    // Rows
    var currentLangCode = (window.i18n && window.i18n.currentLanguage) || 'en';
    var currentLangName = tr('languages.' + currentLangCode, currentLangCode.toUpperCase());
    var rows = [
      { k: tr('account.appearance', 'Appearance & theme'), v: tr('account.customizeLink', 'Customize ›'), link: 'settings.html' },
      { k: tr('account.plan', 'Plan'),                     v: tr('account.planFree', 'Free · Forever'), link: null },
      { k: tr('settings.language', 'Language'),            v: currentLangName, link: null },
      { k: tr('account.playbackQuality', 'Playback quality'), v: tr('account.playbackAuto', 'Auto (up to 4K)'), link: null },
      { k: tr('account.autoplayNext', 'Autoplay next episode'), v: tr('account.on', 'On'), link: null },
      { k: tr('account.wifiOnly', 'Downloads over Wi-Fi only'), v: tr('account.on', 'On'), link: null },
      { k: tr('nav.mylist', 'My List'),                    v: '→', link: 'mylist.html' },
    ];
    rows.forEach(function (r) {
      var row = div('account__row' + (r.link ? ' account__row--link' : ''));
      var rk = div('account__row-k'); rk.textContent = r.k;
      var rv = div('account__row-v'); rv.textContent = r.v;
      row.appendChild(rk); row.appendChild(rv);
      if (r.link) row.addEventListener('click', function () { window.location.href = r.link; });
      card.appendChild(row);
    });

    wrap.appendChild(card);

    // Change password section
    var pwCard = div('account__card');
    pwCard.style.marginTop = '20px';
    var pwTitle = el('h3');
    pwTitle.style.cssText = 'font-family:var(--font-head);font-weight:var(--head-weight);font-size:18px;color:var(--fg);margin:0 0 20px';
    pwTitle.textContent = tr('account.changePassword', 'Change password');
    pwCard.appendChild(pwTitle);
    pwCard.appendChild(field(tr('account.currentPassword', 'Current password'), 'curr-pwd', 'password', '••••••••'));
    pwCard.appendChild(field(tr('account.newPassword', 'New password'), 'new-pwd', 'password', tr('account.minChars', 'Min 8 characters')));
    pwCard.appendChild(field(tr('account.confirmNewPassword', 'Confirm new password'), 'confirm-pwd', 'password', '••••••••'));
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
        document.getElementById('curr-pwd').value = '';
        document.getElementById('new-pwd').value = '';
        document.getElementById('confirm-pwd').value = '';
      } catch (err) { showToast(err.message || tr('account.failedUpdatePassword', 'Failed to update password'), 'error'); }
    });
    pwCard.appendChild(pwBtn);
    wrap.appendChild(pwCard);

    // Primary actions
    var actions = div('account__actions');
    var customizeBtn = el('button', 'btn btn--primary');
    customizeBtn.textContent = tr('account.customizeAppearance', 'Customize appearance');
    customizeBtn.addEventListener('click', function () { window.location.href = 'settings.html'; });
    var editBtn = el('button', 'btn btn--outline');
    editBtn.textContent = tr('account.editProfile', 'Edit profile');
    var logoutBtn = el('button', 'btn btn--outline');
    logoutBtn.textContent = tr('account.signOut', 'Sign out');
    logoutBtn.addEventListener('click', function () {
      ['user','token','myList','keepWatching','watchHistory','currentContent'].forEach(function (k) { localStorage.removeItem(k); });
      showToast(tr('account.signedOut', 'Signed out'));
      renderPage();
      window.renderTopNav('account');
    });
    actions.appendChild(customizeBtn);
    actions.appendChild(editBtn);
    actions.appendChild(logoutBtn);
    wrap.appendChild(actions);

    // Danger zone
    var dangerZone = div();
    dangerZone.style.cssText = 'padding:8px var(--pad-x) 4px;';
    var deleteBtn = el('button', 'btn btn--outline');
    deleteBtn.textContent = tr('account.deleteAccount', 'Delete account');
    deleteBtn.style.color = 'var(--fg-muted)';
    deleteBtn.addEventListener('click', async function () {
      if (!confirm(tr('account.deleteConfirm', 'Delete your account? This cannot be undone.'))) return;
      try {
        await apiDelete('/user/delete');
        ['user','token','myList','keepWatching','watchHistory','currentContent'].forEach(function (k) { localStorage.removeItem(k); });
        showToast(tr('account.accountDeleted', 'Account deleted'));
        renderPage();
      } catch (err) { showToast(err.message || tr('account.failedDelete', 'Failed to delete account'), 'error'); }
    });
    dangerZone.appendChild(deleteBtn);
    wrap.appendChild(dangerZone);

    mount.appendChild(wrap);
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  function renderPage() {
    var mount = document.getElementById('account-mount');
    if (!mount) return;
    var pagehd = div();
    pagehd.innerHTML = '<div class="pagehead"><div class="pagehead__eyebrow">' + tr('account.settings', 'Settings') + '</div><h1 class="pagehead__title">' + tr('account.title', 'Account') + '</h1></div>';
    mount.innerHTML = '';
    mount.appendChild(pagehd);

    if (getToken() && getUser()) {
      renderProfile(mount);
    } else {
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

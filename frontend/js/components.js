// ELI6 Movies — shared vanilla JS component renderers
// All components read CSS vars from the theme system (theme.js + theme.css + design.css)

(function (window) {
  "use strict";


  function safeCssPath(path) {
    return String(path || '').replace(/[^a-zA-Z0-9/_.\-]/g, '');
  }

  function el(tag, cls, attrs) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.assign(e, attrs);
    return e;
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || "pulse";
  }

  function activePage() {
    const p = window.location.pathname.split("/").pop().replace(".html", "") || "index";
    return p === "index" ? "home" : p;
  }

  function _isUnreleased(item) {
    const d = item.release_date || item.first_air_date;
    if (!d) return false;
    return d > new Date().toISOString().slice(0, 10);
  }

  function _fmtReleaseDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }


  var _LANG_OPTS = [
    { code: "en", label: "English",  flag: "🇺🇸" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "ru", label: "Русский",  flag: "🇷🇺" },
  ];

  var NAV_ICONS = {
    home:     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    film:     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="2" y1="17" x2="7" y2="17"/></svg>',
    search:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    bookmark: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    user:     '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    sliders:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
  };

  function _getCurrentLang() {
    if (window.i18n && window.i18n.currentLanguage) return window.i18n.currentLanguage;
    var m = document.cookie.match(/(?:^|;\s*)eli6_language=([a-z]+)/);
    return (m && m[1]) || "en";
  }

  function renderTopNav(active) {
    const mountId = "topnav-mount";
    const mount = document.getElementById(mountId);
    if (!mount) return;

    active = active || activePage();
    const theme = currentTheme();

    const links = [
      { k: "home",    label: "Home",     href: "index.html" },
      { k: "movies",  label: "Movies",   href: "movies.html" },
      { k: "tvshows", label: "TV Shows", href: "tvshows.html" },
      { k: "anime",   label: "Anime",    href: "anime.html" },
      { k: "live",    label: "Live",     href: "live.html" },
      { k: "mylist",  label: "My List",  href: "mylist.html" },
      { k: "contact", label: "Feedback", href: "contact.html" },
    ];

    const nav = el("nav", "topnav");

    // left
    const left = el("div", "topnav__left");
    const logo = el("a", "topnav__logo");
    logo.href = "index.html";
    if (theme === "marquee") {
      logo.innerHTML = "E·L·I·<span class=\"b\">6</span>";
    } else {
      logo.innerHTML = "ELI<span class=\"b\">6</span>.";
    }

    const navLinks = el("div", "topnav__links");
    links.forEach(function (l) {
      const a = el("a", "topnav__link" + (active === l.k ? " topnav__link--active" : ""));
      a.href = l.href;
      a.textContent = l.label;
      navLinks.appendChild(a);
    });

    left.appendChild(logo);
    left.appendChild(navLinks);

    // right
    const right = el("div", "topnav__right");

    const searchWide = el("button", "topnav__search-wide");
    searchWide.innerHTML = "<span>" + NAV_ICONS.search + "</span><span>Search films, shows, anime…</span>";
    searchWide.addEventListener("click", function () { window.location.href = "search.html"; });

    const searchMobile = el("button", "topnav__icon-btn topnav__icon-btn--mobile-search");
    searchMobile.innerHTML = NAV_ICONS.search;
    searchMobile.addEventListener("click", function () { window.location.href = "search.html"; });

    const tweaksBtn = el("button", "topnav__icon-btn");
    tweaksBtn.innerHTML = NAV_ICONS.sliders;
    tweaksBtn.title = "Settings";
    tweaksBtn.addEventListener("click", function () { window.location.href = "settings.html"; });

    const avatar = el("button", "topnav__avatar");
    const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch (e) { return null; } })();
    avatar.textContent = user && user.username ? user.username[0].toUpperCase() : "E";
    avatar.addEventListener("click", function () { window.location.href = "account.html"; });

    // Language switcher
    var curLang  = _getCurrentLang();
    var curData  = _LANG_OPTS.filter(function(l) { return l.code === curLang; })[0] || _LANG_OPTS[0];
    var langWrap = el("div", "topnav__lang");
    var langBtn  = el("button", "topnav__icon-btn topnav__lang-btn");
    langBtn.id   = "topnav-lang-btn";
    langBtn.title = "Language / Lingua / Язык";
    langBtn.innerHTML = curData.flag + '<span class="topnav__lang-code"> ' + curLang.toUpperCase() + "</span>";

    var langMenu = el("div", "topnav__lang-menu");
    langMenu.id  = "topnav-lang-menu";
    _LANG_OPTS.forEach(function(l) {
      var opt = el("button", "topnav__lang-opt" + (l.code === curLang ? " topnav__lang-opt--active" : ""));
      opt.setAttribute("data-lang", l.code);
      opt.innerHTML = '<span class="topnav__lang-flag">' + l.flag + '</span><span>' + l.label + '</span>';
      opt.addEventListener("click", function(e) {
        e.stopPropagation();
        langMenu.classList.remove("topnav__lang-menu--open");
        if (window.i18n) {
          window.i18n.changeLanguage(l.code);
        } else {
          document.cookie = "eli6_language=" + l.code + "; path=/; max-age=31536000";
          window.location.reload();
        }
      });
      langMenu.appendChild(opt);
    });

    langBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      var isOpen = langMenu.classList.contains("topnav__lang-menu--open");
      document.querySelectorAll(".topnav__lang-menu--open").forEach(function(m) { m.classList.remove("topnav__lang-menu--open"); });
      if (!isOpen) langMenu.classList.add("topnav__lang-menu--open");
    });

    langWrap.appendChild(langBtn);
    langWrap.appendChild(langMenu);

    right.appendChild(searchWide);
    right.appendChild(searchMobile);
    right.appendChild(tweaksBtn);
    right.appendChild(langWrap);
    right.appendChild(avatar);

    nav.appendChild(left);
    nav.appendChild(right);

    mount.innerHTML = "";
    mount.appendChild(nav);

    // Re-render on theme change so logo updates
    document.addEventListener("eli6.themeChanged", function () { renderTopNav(active); }, { once: true });
  }


  function renderBottomNav(active) {
    const mountId = "bottomnav-mount";
    const mount = document.getElementById(mountId);
    if (!mount) return;

    active = active || activePage();

    const items = [
      { k: "home",    i: NAV_ICONS.home,     l: "Home",    href: "index.html" },
      { k: "movies",  i: NAV_ICONS.film,     l: "Movies",  href: "movies.html" },
      { k: "search",  i: NAV_ICONS.search,   l: "Search",  href: "search.html" },
      { k: "mylist",  i: NAV_ICONS.bookmark, l: "List",    href: "mylist.html" },
      { k: "account", i: NAV_ICONS.user,     l: "Profile", href: "account.html" },
    ];

    const nav = el("nav", "bottomnav");

    items.forEach(function (it) {
      const isActive = active === it.k ||
        (active === "tvshows" && it.k === "movies") ||
        (active === "anime"   && it.k === "movies");

      const btn = el("a", "bottomnav__item" + (isActive ? " bottomnav__item--active" : ""));
      btn.href = it.href;

      const icon  = el("span");  icon.innerHTML = it.i;
      const label = el("span", "bottomnav__item-label"); label.textContent = it.l;
      btn.appendChild(icon);
      btn.appendChild(label);
      nav.appendChild(btn);
    });

    mount.innerHTML = "";
    mount.appendChild(nav);
  }

  // opts: { rank, badge, wide, progress, onClick, showMeta }

  function makePoster(item, opts) {
    opts = opts || {};
    const theme = currentTheme();

    const div = el("div", "poster" + (opts.wide ? " poster--wide" : ""));

    // art layer — image if available, otherwise gradient
    const art = el("div", "poster__art");
    if (item.poster_path) {
      const img = el("img", "poster__img");
      img.src = "https://image.tmdb.org/t/p/w342" + item.poster_path;
      img.alt = item.title || item.name || "";
      img.loading = "lazy";
      img.onerror = function () {
        img.remove();
        _applyGradArt(art, item, theme);
      };
      art.appendChild(img);
    } else {
      _applyGradArt(art, item, theme);
    }
    div.appendChild(art);

    // gradient overlay for readability
    const overlay = el("div", "poster__overlay");
    div.appendChild(overlay);

    // marquee: scanlines + kind label + centered title + bottom meta
    if (theme === "marquee") {
      const scanlines = el("div", "poster__scanlines");
      div.appendChild(scanlines);

      const kind = el("div", "poster__kind");
      kind.textContent = "● " + (item.kind || item.media_type || "film").toUpperCase();
      div.appendChild(kind);

      const title = el("div", "poster__title");
      title.textContent = item.title || item.name || "";
      div.appendChild(title);

      const meta = el("div", "poster__meta");
      const left = el("span");  left.textContent  = item.year || item.release_date?.slice(0, 4) || "";
      const right = el("span"); right.textContent = item.rating ? "★" + item.rating : (item.vote_average ? "★" + item.vote_average.toFixed(1) : "");
      meta.appendChild(left);
      meta.appendChild(right);
      div.appendChild(meta);
    } else {
      const title = el("div", "poster__title");
      title.textContent = item.title || item.name || "";
      div.appendChild(title);

      const _rv = item.rating || (item.vote_average != null ? Number(item.vote_average).toFixed(1) : null);
      if (_rv && Number(_rv) > 0) {
        const ratingSpan = el("span", "poster__rating");
        ratingSpan.textContent = "★ " + _rv;
        div.appendChild(ratingSpan);
      }

      if (opts.showMeta) {
        const meta = el("div", "poster__meta");
        meta.style.display = "flex";
        const left = el("span");  left.textContent  = item.year || item.release_date?.slice(0, 4) || "";
        const right = el("span"); right.textContent = item.genre || item.genre_ids?.[0] || "";
        meta.appendChild(left);
        meta.appendChild(right);
        div.appendChild(meta);
      }
    }

    if (opts.rank != null) {
      const rank = el("span", "poster__rank");
      rank.textContent = "#" + String(opts.rank + 1).padStart(2, "0");
      div.appendChild(rank);
    }

    if (opts.badge) {
      const badge = el("span", "poster__badge");
      badge.textContent = opts.badge;
      div.appendChild(badge);
    }

    if (_isUnreleased(item)) {
      const csBanner = el("div", "poster__coming-soon");
      csBanner.textContent = "COMING SOON";
      csBanner.title = _fmtReleaseDate(item.release_date || item.first_air_date);
      div.appendChild(csBanner);
    }

    // continue-watching progress bar
    if (opts.progress != null) {
      const wrap = el("div", "poster__progress-wrap");
      const bar  = el("div", "poster__progress-bar");
      bar.style.width = Math.min(100, Math.max(0, opts.progress)) + "%";
      wrap.appendChild(bar);
      div.appendChild(wrap);

      const playOverlay = el("div", "poster__play-overlay");
      const playBtn = el("button", "poster__play-btn");
      playBtn.textContent = "▶";
      playOverlay.appendChild(playBtn);
      div.appendChild(playOverlay);

      if (item.episodeLabel) {
        const epLabel = el("div", "poster__ep-label");
        epLabel.textContent = item.episodeLabel;
        div.appendChild(epLabel);
      }
    }

    if (opts.onRemove) {
      const removeBtn = el("button", "poster__remove");
      removeBtn.textContent = "×";
      removeBtn.title = "Remove";
      removeBtn.setAttribute("aria-label", "Remove");
      removeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        opts.onRemove();
      });
      div.appendChild(removeBtn);
    }

    if (opts.onClick) div.addEventListener("click", opts.onClick);

    return div;
  }

  function _applyGradArt(art, item, theme) {
    const g = item.grad || ["#1a1a2e", "#16213e", "#0f3460"];
    if (theme === "marquee") {
      art.style.background = "linear-gradient(160deg, " + g[0] + ", " + g[1] + " 70%, " + g[2] + ")";
      const lines = el("div");
      lines.style.cssText = "position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.05) 0,rgba(255,255,255,0.05) 1px,transparent 1px,transparent 3px)";
      art.appendChild(lines);
    } else {
      art.style.background = "linear-gradient(155deg, " + g[0] + ", " + g[1] + " 60%, " + g[2] + ")";
      const glow = el("div");
      glow.style.cssText = "position:absolute;inset:0;background:radial-gradient(circle at 80% 0%,color-mix(in srgb," + g[2] + " 60%,transparent),transparent 50%)";
      art.appendChild(glow);
    }
  }

  // opts: { seeAllHref, numbered, badge }

  function makeRow(title, items, opts) {
    opts = opts || {};

    const row = el("div", "row");

    const head = el("div", "row__head");
    const h2   = el("h2", "row__title"); h2.textContent = title;
    const see  = el("span", "row__see"); see.textContent = "See all →";
    if (opts.seeAllHref) {
      see.style.cursor = "pointer";
      see.addEventListener("click", function () { window.location.href = opts.seeAllHref; });
    }
    head.appendChild(h2);
    head.appendChild(see);
    row.appendChild(head);

    const scroll = el("div", "row__scroll");
    items.forEach(function (item, i) {
      const poster = makePoster(item, {
        rank:     opts.numbered ? i : null,
        badge:    opts.badge ? opts.badge(item) : null,
        progress: item.progress != null ? item.progress : null,
        onRemove: opts.onRemove ? function () { opts.onRemove(item); } : null,
        onClick: function () {
          if (opts.onPick) opts.onPick(item);
          else openDetailModal(item);
        },
      });
      scroll.appendChild(poster);
    });
    row.appendChild(scroll);

    return row;
  }


  function makeHeroSlider(items, container, opts) {
    opts = opts || {};
    if (!container || !items || !items.length) return;

    const TMDB_PROXY = window.TMDB_PROXY_URL || (window.API_BASE_URL ? window.API_BASE_URL + "/tmdb" : "");
    const canHover   = window.matchMedia && window.matchMedia("(hover: hover)").matches;

    let idx        = 0;
    let timer      = null;
    let hoverTimer = null;
    let generation = 0;   // incremented on each render; used to discard stale trailer loads
    let isHovering = false;

    function render(i) {
      generation++;
      const item = items[i];
      const g = item.grad || ["#0b1d3a", "#3a1e6b", "#c44a3a"];
      const theme = currentTheme();

      container.innerHTML = "";
      container.className = "hero";

      // art
      const art = el("div", "hero__art");
      art.style.animation = "e6-fade-in 600ms ease";

      if (item.backdrop_path) {
        const img = el("div", "hero__art-img");
        img.style.backgroundImage = "url(https://image.tmdb.org/t/p/original" + safeCssPath(item.backdrop_path) + ")";
        art.appendChild(img);
      } else {
        art.style.background = "linear-gradient(135deg, " + g[0] + ", " + g[1] + " 55%, " + g[2] + ")";
        const shine = el("div");
        shine.style.cssText = "position:absolute;inset:0;background:radial-gradient(circle at 70% 30%,rgba(255,255,255,0.15),transparent 50%)";
        art.appendChild(shine);
      }
      container.appendChild(art);

      const scrim = el("div", "hero__scrim");
      container.appendChild(scrim);

      const content = el("div", "hero__content");

      const eyebrow = el("div", "hero__eyebrow");
      eyebrow.textContent = theme === "marquee"
        ? "►► NOW PLAYING"
        : "FEATURED · #" + String(i + 1).padStart(2, "0");
      content.appendChild(eyebrow);

      const titleEl = el("h1", "hero__title");
      titleEl.textContent = item.title || item.name || "";
      content.appendChild(titleEl);

      const meta = el("div", "hero__meta");
      const star = el("span", "hero__meta-star");
      const rating = item.rating || (item.vote_average ? item.vote_average.toFixed(1) : null);
      if (rating) { star.textContent = "★ " + rating; meta.appendChild(star); }
      const year = item.year || (item.release_date || item.first_air_date || "").slice(0, 4);
      if (year) { const s = el("span"); s.textContent = year; meta.appendChild(s); }
      if (item.runtime) { const s = el("span"); s.textContent = item.runtime; meta.appendChild(s); }
      if (item.genre)   { const s = el("span"); s.textContent = item.genre;   meta.appendChild(s); }
      content.appendChild(meta);

      if (item.description || item.overview) {
        const desc = el("p", "hero__desc");
        desc.textContent = item.description || item.overview;
        content.appendChild(desc);
      }

      const cta = el("div", "hero__cta");
      const _heroRd = item.release_date || item.first_air_date;
      const _heroUnreleased = _heroRd ? (_heroRd > new Date().toISOString().slice(0, 10)) : false;
      const watchBtn = el("button", "btn btn--primary" + (_heroUnreleased ? " detail__watch-coming" : ""));
      if (_heroUnreleased) {
        watchBtn.textContent = "📅 Coming " + _fmtReleaseDate(_heroRd);
        watchBtn.disabled = true;
      } else {
        watchBtn.textContent = "▶ Watch now";
        watchBtn.addEventListener("click", function () {
          if (opts.onWatch) opts.onWatch(item);
          else openDetailModal(item);
        });
      }
      const listBtn = el("button", "btn btn--ghost");
      if (typeof window.updateMyListBtn === "function") window.updateMyListBtn(item, listBtn);
      else listBtn.textContent = "+ My List";
      listBtn.addEventListener("click", function () {
        if (typeof window.toggleMyList === "function") window.toggleMyList(item, listBtn);
        else showToast("Added to list");
      });
      const infoBtn = el("button", "btn btn--ghost btn--icon");
      infoBtn.textContent = "ⓘ";
      infoBtn.addEventListener("click", function () { openDetailModal(item); });
      cta.appendChild(watchBtn);
      cta.appendChild(listBtn);
      cta.appendChild(infoBtn);
      content.appendChild(cta);

      container.appendChild(content);

      // dots
      const dotsWrap = el("div", "hero__dots");
      items.forEach(function (_, j) {
        const dot = el("button", "hero__dot" + (j === i ? " hero__dot--active" : ""));
        dot.addEventListener("click", function () { go(j); });
        dotsWrap.appendChild(dot);
      });
      container.appendChild(dotsWrap);
    }

    function go(i) {
      idx = (i + items.length) % items.length;
      render(idx);
      if (!isHovering) resetTimer();
    }

    function resetTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () { go(idx + 1); }, 7000);
    }

    async function loadTrailer(item, gen) {
      // only TMDB items (numeric ids); anime uses string slugs
      const itemId = parseInt(item.id, 10);
      if (!itemId || !TMDB_PROXY) return;

      const kind = item.kind || (item.title ? "movie" : "tv");
      const ep   = (kind === "tv" ? "/tv/" : "/movie/") + itemId + "/videos";

      try {
        const r = await fetch(TMDB_PROXY + ep);
        if (!r.ok || gen !== generation) return;
        const data = await r.json();
        if (gen !== generation) return;

        const vids = data.results || [];
        const trailer = vids.find(function (v) { return v.site === "YouTube" && v.type === "Trailer"; })
                     || vids.find(function (v) { return v.site === "YouTube"; });
        if (!trailer) return;

        const art = container.querySelector(".hero__art");
        if (!art || gen !== generation) return;

        // fade out the static backdrop
        const img = art.querySelector(".hero__art-img");
        if (img) { img.style.transition = "opacity 600ms"; img.style.opacity = "0"; }

        // full-bleed iframe (pointer-events:none so parent keeps mouse events)
        const iframe = document.createElement("iframe");
        iframe.className = "hero__trailer";
        iframe.setAttribute("allow", "autoplay; encrypted-media");
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("frameborder", "0");
        iframe.setAttribute("tabindex", "-1");
        const key = trailer.key;
        iframe.src = "https://www.youtube-nocookie.com/embed/" + key
          + "?autoplay=1&mute=1&controls=0&loop=1&playlist=" + key
          + "&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3";
        art.appendChild(iframe);

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            if (gen === generation) iframe.style.opacity = "1";
          });
        });

        // mute / unmute button
        const muteBtn = document.createElement("button");
        muteBtn.className = "hero__trailer-mute";
        muteBtn.setAttribute("aria-label", "Unmute trailer");
        muteBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 2 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
        let muted = true;
        muteBtn.addEventListener("click", function (e) {
          e.stopPropagation();
          muted = !muted;
          iframe.src = muted
            ? iframe.src.replace("mute=0", "mute=1")
            : iframe.src.replace("mute=1", "mute=0");
          muteBtn.setAttribute("aria-label", muted ? "Unmute trailer" : "Mute trailer");
          muteBtn.innerHTML = muted
            ? '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06A8.99 8.99 0 0 0 17.73 18L19 19.27 20.27 18 5.27 2 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
        });
        art.appendChild(muteBtn);

      } catch (_) { /* no trailer available — stay on static image */ }
    }

    if (canHover) {
      container.addEventListener("mouseenter", function () {
        isHovering = true;
        if (timer) { clearInterval(timer); timer = null; }
        hoverTimer = setTimeout(function () {
          loadTrailer(items[idx], generation);
        }, 2000);
      });

      container.addEventListener("mouseleave", function () {
        isHovering = false;
        if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
        go(idx + 1);
      });
    }

    var _swipeStartX = 0;
    container.addEventListener("touchstart", function (e) {
      _swipeStartX = e.touches[0].clientX;
    }, { passive: true });
    container.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - _swipeStartX;
      if (Math.abs(dx) > 40) go(dx < 0 ? idx + 1 : idx - 1);
    }, { passive: true });

    render(0);
    resetTimer();

    return { go: go, stop: function () { clearInterval(timer); } };
  }


  function openDetailModal(item) {
    const TMDB_IMG   = "https://image.tmdb.org/t/p/";
    const TMDB_PROXY = window.TMDB_PROXY_URL || (window.API_BASE_URL ? window.API_BASE_URL + "/tmdb" : "");
    const theme       = currentTheme();
    const kind        = item.kind || item.media_type || "movie";
    const g           = item.grad || ["#1a1a2e", "#16213e", "#0f3460"];
    const _rd         = item.release_date || item.first_air_date || null;
    const _unreleased = _rd ? (_rd > new Date().toISOString().slice(0, 10)) : false;

    const backdrop = el("div", "detail-backdrop");
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });

    const modal = el("div", "detail");

    // Art
    const art = el("div", "detail__art");
    if (item.backdrop_path) {
      art.style.backgroundImage = "url(" + TMDB_IMG + "w780" + safeCssPath(item.backdrop_path) + ")";
      art.style.backgroundSize = "cover";
      art.style.backgroundPosition = "center";
    } else {
      art.style.background = "linear-gradient(135deg, " + g[0] + ", " + g[1] + " 55%, " + g[2] + ")";
    }

    const closeBtn = el("button", "detail__close");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", closeModal);
    art.appendChild(closeBtn);

    const artScrim = el("div");
    artScrim.style.cssText = "position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,var(--bg) 100%)";
    art.appendChild(artScrim);

    // Kind label + title overlaid at the bottom of the art
    const artInfo = el("div");
    artInfo.style.cssText = "position:absolute;bottom:0;left:0;right:0;padding:20px 24px 12px;z-index:2";
    const kindLabel = el("div", "detail__kind-label");
    kindLabel.textContent = kind.toUpperCase();
    artInfo.appendChild(kindLabel);
    const artTitle = el("div", "detail__title");
    artTitle.textContent = item.title || item.name || "";
    artInfo.appendChild(artTitle);
    art.appendChild(artInfo);

    modal.appendChild(art);

    // Body
    const body = el("div", "detail__body");

    const meta = el("div", "detail__meta");
    if (item.rating || item.vote_average) {
      const star = el("span", "detail__meta-star");
      star.textContent = "★ " + (item.rating || item.vote_average.toFixed(1));
      meta.appendChild(star);
    }
    const year = item.year || (item.release_date || item.first_air_date || "").slice(0, 4);
    if (year) { const s = el("span"); s.textContent = year; meta.appendChild(s); }
    if (item.runtime) { const s = el("span"); s.textContent = item.runtime; meta.appendChild(s); }
    if (item.genre)   { const s = el("span"); s.textContent = item.genre;   meta.appendChild(s); }
    if (_unreleased) {
      const csLabel = el("span", "detail__coming-badge"); csLabel.textContent = "COMING SOON"; meta.appendChild(csLabel);
    } else {
      const hd = el("span", "detail__hd"); hd.textContent = "HD"; meta.appendChild(hd);
    }
    body.appendChild(meta);

    if (item.description || item.overview) {
      const desc = el("p", "detail__desc");
      desc.textContent = item.description || item.overview;
      body.appendChild(desc);
    }

    const cta = el("div", "detail__cta");
    const watchBtn = el("button", "btn btn--primary" + (_unreleased ? " detail__watch-coming" : ""));
    if (_unreleased) {
      watchBtn.textContent = "📅 Coming " + _fmtReleaseDate(_rd);
      watchBtn.disabled = true;
    } else {
      watchBtn.textContent = "▶ Watch now";
      watchBtn.addEventListener("click", function () {
        window.location.href = "player.html?id=" + (item.tmdb_id || item.id) + "&type=" + kind;
      });
    }
    const listBtn = el("button", "btn btn--ghost");
    if (typeof window.updateMyListBtn === "function") window.updateMyListBtn(item, listBtn);
    else listBtn.textContent = "+ My List";
    listBtn.addEventListener("click", function () {
      if (typeof window.toggleMyList === "function") window.toggleMyList(item, listBtn);
      else showToast("Added to list");
    });
    const likeBtn = el("button", "btn btn--ghost btn--icon");
    likeBtn.textContent = "♥";
    likeBtn.title = "Like";
    const shareBtn = el("button", "btn btn--ghost btn--icon");
    shareBtn.textContent = "↗";
    shareBtn.title = "Share";
    shareBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const _base = (window.location.origin + window.location.pathname).replace(/[^/]*$/, "");
      const _shareUrl = _base + "player.html?id=" + (item.tmdb_id || item.id) + "&type=" + kind;
      if (navigator.share) {
        navigator.share({ title: item.title || item.name || "ELI6 Movies", url: _shareUrl }).catch(function () {});
      } else {
        navigator.clipboard.writeText(_shareUrl).then(function () {
          showToast("Link copied!");
        }).catch(function () { showToast("Couldn't copy link"); });
      }
    });
    cta.appendChild(watchBtn);
    cta.appendChild(listBtn);
    cta.appendChild(likeBtn);
    cta.appendChild(shareBtn);
    body.appendChild(cta);

    // About (fact grid) — real data fetched async below
    const facts = el("div", "detail__sect");
    const factsHead = el("h3"); factsHead.textContent = "About";
    facts.appendChild(factsHead);
    const factGrid = el("div", "detail__factgrid");
    factGrid.innerHTML = '<div style="color:var(--fg-muted);font-size:12px;padding:4px 0">Loading…</div>';
    facts.appendChild(factGrid);
    body.appendChild(facts);

    // Episodes section (TV only) — populated async below
    const epSect    = kind === "tv" ? el("div", "detail__sect")    : null;
    const epList    = kind === "tv" ? el("div", "detail__episodes") : null;
    const seasonSel = kind === "tv" ? el("select")                  : null;
    if (kind === "tv" && epSect && epList && seasonSel) {
      const epHead = el("h3"); epHead.textContent = "Episodes";
      epSect.appendChild(epHead);
      const seasonWrap = el("div");
      seasonWrap.style.cssText = "display:none;margin-bottom:12px";
      seasonSel.style.cssText = "background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer;outline:none";
      seasonWrap.appendChild(seasonSel);
      epSect.appendChild(seasonWrap);
      epList.innerHTML = '<div style="color:var(--fg-muted);font-size:13px;padding:8px 0">Loading…</div>';
      epSect.appendChild(epList);
      body.appendChild(epSect);
    }

    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // More like this (async — appends after modal is in DOM)
    if (TMDB_PROXY) {
      const moreSect = el("div", "detail__sect");
      const moreHead = el("h3"); moreHead.textContent = "More like this";
      moreSect.appendChild(moreHead);
      const moreGrid = el("div", "detail__more-grid");
      moreSect.appendChild(moreGrid);
      body.appendChild(moreSect);

      fetch(TMDB_PROXY + "/" + kind + "/" + (item.tmdb_id || item.id) + "/similar")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (!d || !d.results || !d.results.length) { moreSect.remove(); return; }
          d.results.slice(0, 6).forEach(function (sim) {
            sim.kind = kind;
            const p = makePoster(sim, { onClick: function () { closeModal(); openDetailModal(sim); } });
            moreGrid.appendChild(p);
          });
        })
        .catch(function () { moreSect.remove(); });
    }

    // Trap escape key
    function onKey(e) { if (e.key === "Escape") closeModal(); }
    document.addEventListener("keydown", onKey);

    const _closedRef = { v: false };
    const _detailId  = item.tmdb_id || item.id;

    function _renderFactRow(k, v) {
      if (!v) return;
      const cell = el("div");
      const key = el("div", "detail__fact-k"); key.textContent = k;
      const val = el("div", "detail__fact-v"); val.textContent = v;
      cell.appendChild(key); cell.appendChild(val); factGrid.appendChild(cell);
    }
    function _fillFallback() {
      factGrid.innerHTML = "";
      _renderFactRow("Genre",  item.genre || null);
      _renderFactRow("Year",   year);
      _renderFactRow("Rating", item.rating || (item.vote_average ? item.vote_average.toFixed(1) + " / 10" : null));
    }
    function _renderEps(eps, sNum) {
      if (!epList) return;
      epList.innerHTML = "";
      if (!eps.length) {
        epList.innerHTML = '<div style="color:var(--fg-muted);font-size:13px;padding:8px 0">No episodes found.</div>';
        return;
      }
      eps.slice(0, 20).forEach(function (ep) {
        const epNum  = ep.episode_number || ep;
        const epName = ep.name || ("Episode " + epNum);
        const epEl   = el("div", "detail__ep");
        epEl.addEventListener("click", function () {
          window.location.href = "player.html?id=" + _detailId + "&type=tv&season=" + sNum + "&episode=" + epNum;
        });
        const thumb = el("div", "detail__ep-thumb");
        if (ep.still_path) {
          thumb.style.backgroundImage = "url(https://image.tmdb.org/t/p/w300" + ep.still_path + ")";
          thumb.style.backgroundSize = "cover"; thumb.style.backgroundPosition = "center";
        } else {
          thumb.style.background = "linear-gradient(135deg," + g[0] + "," + g[1] + ")";
          thumb.textContent = "▶";
        }
        const epInfo = el("div"); epInfo.style.flex = "1";
        const epSub2 = el("div", "detail__ep-sub");
        epSub2.textContent = "S" + sNum + " · E" + epNum + (ep.runtime ? "  " + ep.runtime + "m" : "");
        const epT = el("div", "detail__ep-title"); epT.textContent = epName;
        epInfo.appendChild(epSub2); epInfo.appendChild(epT);
        if (ep.overview) {
          const epOv = el("div");
          epOv.style.cssText = "font-size:11px;color:var(--fg-muted);margin-top:2px;line-height:1.4;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical";
          epOv.textContent = ep.overview;
          epInfo.appendChild(epOv);
        }
        epEl.appendChild(thumb); epEl.appendChild(epInfo);
        epList.appendChild(epEl);
      });
    }
    function _loadSeason(sNum) {
      if (!epList || _closedRef.v) return;
      epList.innerHTML = '<div style="color:var(--fg-muted);font-size:13px;padding:8px 0">Loading…</div>';
      if (!TMDB_PROXY || isNaN(parseInt(_detailId, 10))) {
        _renderEps(Array.from({ length: 6 }, function (_, i) {
          return { episode_number: i + 1, name: "Episode " + (i + 1), still_path: null, overview: "" };
        }), sNum);
        return;
      }
      fetch(TMDB_PROXY + "/tv/" + _detailId + "/season/" + sNum)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (_closedRef.v || !epList) return;
          _renderEps((data && data.episodes) || [], sNum);
        })
        .catch(function () {
          if (!_closedRef.v && epList)
            epList.innerHTML = '<div style="color:var(--fg-muted);font-size:13px">Could not load episodes.</div>';
        });
    }

    if (TMDB_PROXY && _detailId && !isNaN(parseInt(_detailId, 10))) {
      fetch(TMDB_PROXY + "/" + kind + "/" + _detailId + "?append_to_response=credits")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (_closedRef.v) return;
          if (!data) { _fillFallback(); if (kind === "tv") _loadSeason(1); return; }
          const _rt = kind === "movie"
            ? (data.runtime ? data.runtime + " min" : null)
            : (data.episode_run_time && data.episode_run_time[0] ? data.episode_run_time[0] + " min/ep" : null);
          let _dir = null;
          if (kind === "movie" && data.credits && data.credits.crew) {
            const _d = data.credits.crew.find(function (c) { return c.job === "Director"; });
            if (_d) _dir = _d.name;
          } else if (kind === "tv" && data.created_by && data.created_by.length) {
            _dir = data.created_by.map(function (c) { return c.name; }).join(", ");
          }
          const _castStr = (data.credits && data.credits.cast && data.credits.cast.length)
            ? data.credits.cast.slice(0, 4).map(function (c) { return c.name; }).join(", ") : null;
          const _genreStr = (data.genres && data.genres.length)
            ? data.genres.slice(0, 3).map(function (gg) { return gg.name; }).join(", ") : (item.genre || null);
          factGrid.innerHTML = "";
          _renderFactRow(kind === "tv" ? "Created by" : "Director", _dir);
          _renderFactRow("Cast",    _castStr);
          _renderFactRow("Genre",   _genreStr);
          _renderFactRow("Year",    year);
          _renderFactRow("Runtime", _rt || item.runtime || null);
          _renderFactRow("Rating",  data.vote_average ? data.vote_average.toFixed(1) + " / 10" : (item.rating || null));
          if (kind === "tv" && seasonSel && data.number_of_seasons) {
            for (let s = 1; s <= data.number_of_seasons; s++) {
              const opt = document.createElement("option"); opt.value = s; opt.textContent = "Season " + s;
              seasonSel.appendChild(opt);
            }
            if (data.number_of_seasons > 1) {
              const sw = seasonSel.parentElement; if (sw) sw.style.display = "";
            }
            seasonSel.addEventListener("change", function () {
              if (!_closedRef.v) _loadSeason(parseInt(seasonSel.value, 10));
            });
          }
          if (kind === "tv") _loadSeason(1);
        })
        .catch(function () {
          if (!_closedRef.v) { _fillFallback(); if (kind === "tv") _loadSeason(1); }
        });
    } else {
      _fillFallback();
      if (kind === "tv") _loadSeason(1);
    }

    function closeModal() {
      _closedRef.v = true;
      document.removeEventListener("keydown", onKey);
      backdrop.style.opacity = "0";
      backdrop.style.transition = "opacity 150ms ease";
      setTimeout(function () { backdrop.remove(); }, 160);
    }
  }


  function renderFooter(mountId) {
    const mount = document.getElementById(mountId || "footer-mount");
    if (!mount) return;

    const footer = el("footer", "footer");

    const top = el("div", "footer__top");
    const copy = el("span");
    copy.textContent = "© 2026 ELI6 Movies";
    const disc = el("span");
    disc.textContent = "This site does not host any files. All content is provided by non-affiliated third parties.";
    top.appendChild(copy);
    top.appendChild(disc);

    const links = el("nav", "footer__links");
    const legalLinks = [
      { label: "Privacy Policy", href: "privacy.html" },
      { label: "Terms of Service", href: "terms.html" },
      { label: "Cookie Policy", href: "cookies.html" },
      { label: "DMCA", href: "dmca.html" },
      { label: "Contact", href: "contact.html" },
    ];
    legalLinks.forEach(function (l) {
      const a = el("a"); a.href = l.href; a.textContent = l.label;
      links.appendChild(a);
    });

    const bottom = el("div", "footer__bottom");
    bottom.textContent = "ELI6 Movies is an independent aggregator and does not produce, host, or distribute any media content. All trademarks belong to their respective owners.";

    footer.appendChild(top);
    footer.appendChild(links);
    footer.appendChild(bottom);

    mount.innerHTML = "";
    mount.appendChild(footer);
  }


  function renderCookieBanner() {
    if (localStorage.getItem("eli6.cookies.accepted")) return;

    const banner = el("div", "cookie-banner");

    const text = el("div", "cookie-banner__text");
    text.innerHTML = 'We use cookies and local storage to keep you signed in and save your preferences. ' +
      '<a href="cookies.html">Learn more</a>.';

    const actions = el("div", "cookie-banner__actions");
    const acceptBtn = el("button", "btn btn--primary");
    acceptBtn.textContent = "Accept";
    acceptBtn.style.cssText = "padding:8px 20px;font-size:13px";
    acceptBtn.addEventListener("click", function () {
      localStorage.setItem("eli6.cookies.accepted", "1");
      banner.style.transition = "opacity 200ms";
      banner.style.opacity = "0";
      setTimeout(function () { banner.remove(); }, 210);
    });
    const moreBtn = el("a", "btn btn--ghost");
    moreBtn.href = "cookies.html";
    moreBtn.textContent = "Cookie Policy";
    moreBtn.style.cssText = "padding:8px 16px;font-size:13px";
    actions.appendChild(acceptBtn);
    actions.appendChild(moreBtn);

    banner.appendChild(text);
    banner.appendChild(actions);
    document.body.appendChild(banner);
  }


  let _toastTimer = null;

  function showToast(message, type) {
    let toast = document.querySelector(".e6-toast");
    if (!toast) {
      toast = el("div", "e6-toast");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    if (type === "error") {
      toast.style.borderLeftColor = "var(--fg-muted)";
    } else {
      toast.style.borderLeftColor = "var(--accent)";
    }
    toast.classList.add("show");
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 3000);
  }


  function getAdBlockRec() {
    var ua = navigator.userAgent;
    var isIOS     = /iPhone|iPad|iPod/i.test(ua);
    var isAndroid = /Android/i.test(ua);
    var isFirefox = /Firefox|FxiOS/i.test(ua);
    var isEdge    = /Edg\//i.test(ua);
    var isSafari  = /Safari/i.test(ua) && !/Chrome/i.test(ua) && !isFirefox;

    if (isIOS) return {
      name: 'AdGuard',
      note: 'content blocker for iOS Safari',
      url:  'https://apps.apple.com/app/adguard-adblock-and-privacy/id1047223162',
    };
    if (isAndroid && isFirefox) return {
      name: 'uBlock Origin',
      note: 'Firefox for Android add-on',
      url:  'https://addons.mozilla.org/en-US/android/addon/ublock-origin/',
    };
    if (isAndroid) return {
      name: 'Brave',
      note: 'browser with built-in blocking',
      url:  'https://play.google.com/store/apps/details?id=com.brave.browser',
    };
    if (isFirefox) return {
      name: 'uBlock Origin',
      note: 'best Firefox extension',
      url:  'https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/',
    };
    if (isEdge) return {
      name: 'uBlock Origin',
      note: 'Edge extension',
      url:  'https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak',
    };
    if (isSafari) return {
      name: 'AdGuard for Safari',
      note: 'Safari extension',
      url:  'https://apps.apple.com/app/adguard-for-safari/id1440147259',
    };
    return {
      name: 'uBlock Origin',
      note: 'best Chrome extension',
      url:  'https://chrome.google.com/webstore/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
    };
  }

  function detectAdBlock() {
    return new Promise(function (resolve) {
      var bait = document.createElement('div');
      bait.className = 'ad adsbox ad-placement doubleclick adsbygoogle textad';
      bait.style.cssText = 'position:absolute;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;opacity:0;';
      document.body.appendChild(bait);
      setTimeout(function () {
        var blocked = false;
        try {
          var cs = window.getComputedStyle(bait);
          blocked = bait.offsetParent === null ||
                    bait.offsetHeight === 0 ||
                    bait.offsetWidth  === 0 ||
                    cs.display === 'none' ||
                    cs.visibility === 'hidden';
        } catch (e) {}
        if (bait.parentNode) bait.parentNode.removeChild(bait);
        resolve(blocked);
      }, 200);
    });
  }

  function renderAdBlockPrompt() {
    var KEY = 'eli6.adblock_seen';
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}

    detectAdBlock().then(function (hasBlock) {
      if (hasBlock) return;

      var rec = getAdBlockRec();
      var i18n = window.i18n && window.i18n.t ? window.i18n : null;
      function t(key, fallback) { return i18n ? i18n.t('common.adblocker.' + key, fallback) : fallback; }

      var overlay = el('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.65);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:16px;';

      var modal = el('div');
      modal.style.cssText = 'background:var(--bg);border:1px solid var(--border);border-radius:16px;padding:28px 24px;max-width:380px;width:100%;box-shadow:0 24px 64px rgba(0,0,0,0.6);';
      modal.innerHTML = [
        '<div style="font-size:38px;margin-bottom:14px;line-height:1">🛡️</div>',
        '<h2 style="margin:0 0 8px;font-size:19px;font-weight:700;color:var(--fg)">' + t('title', 'Better with an adblocker') + '</h2>',
        '<p style="margin:0 0 16px;font-size:14px;color:var(--fg-muted);line-height:1.6">' + t('description', "The video players are from third-party sources that can serve ads and redirects. The site itself has none — it's the player. An adblocker kills most of it.") + '</p>',
        '<p style="margin:0 0 20px;font-size:13px;color:var(--fg-muted)">' + t('best_for', 'Best option for your browser:') + ' <strong style="color:var(--fg)">' + rec.name + '</strong> — ' + rec.note + '</p>',
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">',
        '<a id="ab-install" href="' + rec.url + '" target="_blank" rel="noopener noreferrer" style="flex:1;min-width:120px;padding:11px 14px;background:var(--accent);color:#fff;border-radius:8px;text-align:center;font-size:14px;font-weight:700;text-decoration:none;display:block;">' + t('get', 'Get') + ' ' + rec.name + '</a>',
        '<button id="ab-skip" style="flex:1;min-width:80px;padding:11px 14px;background:var(--surface);color:var(--fg);border:1px solid var(--border);border-radius:8px;font-size:14px;cursor:pointer;font-family:inherit;">' + t('skip', 'Skip') + '</button>',
        '</div>',
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--fg-muted);user-select:none;">',
        '<input type="checkbox" id="ab-never" style="width:14px;height:14px;cursor:pointer;accent-color:var(--accent);flex-shrink:0;" />',
        t('dont_show', "Don't show this again"),
        '</label>',
      ].join('');

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      function dismiss() {
        try { if (document.getElementById('ab-never').checked) localStorage.setItem(KEY, '1'); } catch (e) {}
        overlay.style.transition = 'opacity 180ms ease';
        overlay.style.opacity = '0';
        setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 190);
      }

      document.getElementById('ab-skip').addEventListener('click', dismiss);
      document.getElementById('ab-install').addEventListener('click', function () {
        try { if (document.getElementById('ab-never').checked) localStorage.setItem(KEY, '1'); } catch (e) {}
      });
      overlay.addEventListener('click', function (e) { if (e.target === overlay) dismiss(); });
    });
  }

  Object.assign(window, {
    renderTopNav:        renderTopNav,
    renderBottomNav:     renderBottomNav,
    makePoster:          makePoster,
    makeRow:             makeRow,
    makeHeroSlider:      makeHeroSlider,
    openDetailModal:     openDetailModal,
    renderFooter:        renderFooter,
    showToast:           showToast,
    renderCookieBanner:  renderCookieBanner,
    renderAdBlockPrompt: renderAdBlockPrompt,
  });

  document.addEventListener("DOMContentLoaded", function () {
    renderCookieBanner();
    renderAdBlockPrompt();
    document.addEventListener("click", function() {
      document.querySelectorAll(".topnav__lang-menu--open").forEach(function(m) { m.classList.remove("topnav__lang-menu--open"); });
    });
  });

})(window);

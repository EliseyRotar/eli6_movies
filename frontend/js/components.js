// ELI6 Movies — shared vanilla JS component renderers
// All components read CSS vars from the theme system (theme.js + theme.css + design.css)

(function (window) {
  "use strict";

  // ─── helpers ────────────────────────────────────────────────────────────────

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

  // ─── Top Nav ────────────────────────────────────────────────────────────────

  var _LANG_OPTS = [
    { code: "en", label: "English",  flag: "🇺🇸" },
    { code: "it", label: "Italiano", flag: "🇮🇹" },
    { code: "ru", label: "Русский",  flag: "🇷🇺" },
  ];

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
      { k: "mylist",  label: "My List",  href: "mylist.html" },
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
    searchWide.innerHTML = "<span>⌕</span><span>Search films, shows, anime…</span>";
    searchWide.addEventListener("click", function () { window.location.href = "search.html"; });

    const searchMobile = el("button", "topnav__icon-btn topnav__icon-btn--mobile-search");
    searchMobile.textContent = "⌕";
    searchMobile.addEventListener("click", function () { window.location.href = "search.html"; });

    const tweaksBtn = el("button", "topnav__icon-btn");
    tweaksBtn.textContent = "✦";
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

  // ─── Bottom Nav ─────────────────────────────────────────────────────────────

  function renderBottomNav(active) {
    const mountId = "bottomnav-mount";
    const mount = document.getElementById(mountId);
    if (!mount) return;

    active = active || activePage();

    const items = [
      { k: "home",    i: "⌂", l: "Home",    href: "index.html" },
      { k: "movies",  i: "▶", l: "Movies",  href: "movies.html" },
      { k: "search",  i: "⌕", l: "Search",  href: "search.html" },
      { k: "mylist",  i: "♥", l: "List",    href: "mylist.html" },
      { k: "account", i: "◉", l: "Profile", href: "account.html" },
    ];

    const nav = el("nav", "bottomnav");

    items.forEach(function (it) {
      const isActive = active === it.k ||
        (active === "tvshows" && it.k === "movies") ||
        (active === "anime"   && it.k === "movies");

      const btn = el("a", "bottomnav__item" + (isActive ? " bottomnav__item--active" : ""));
      btn.href = it.href;

      const icon  = el("span");  icon.textContent = it.i;
      const label = el("span", "bottomnav__item-label"); label.textContent = it.l;
      btn.appendChild(icon);
      btn.appendChild(label);
      nav.appendChild(btn);
    });

    mount.innerHTML = "";
    mount.appendChild(nav);
  }

  // ─── Poster ─────────────────────────────────────────────────────────────────
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

  // ─── Row ────────────────────────────────────────────────────────────────────
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

  // ─── Hero Slider ────────────────────────────────────────────────────────────

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
      const watchBtn = el("button", "btn btn--primary");
      watchBtn.textContent = "▶ Watch now";
      watchBtn.addEventListener("click", function () {
        if (opts.onWatch) opts.onWatch(item);
        else openDetailModal(item);
      });
      const listBtn = el("button", "btn btn--ghost");
      listBtn.textContent = "+ My List";
      listBtn.addEventListener("click", function () {
        if (typeof window.toggleMyList === "function") window.toggleMyList(item);
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

    render(0);
    resetTimer();

    return { go: go, stop: function () { clearInterval(timer); } };
  }

  // ─── Detail Modal ───────────────────────────────────────────────────────────

  function openDetailModal(item) {
    const TMDB_IMG   = "https://image.tmdb.org/t/p/";
    const TMDB_PROXY = window.TMDB_PROXY_URL || (window.API_BASE_URL ? window.API_BASE_URL + "/tmdb" : "");
    const theme      = currentTheme();
    const kind       = item.kind || item.media_type || "movie";
    const g          = item.grad || ["#1a1a2e", "#16213e", "#0f3460"];

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
    const hd = el("span", "detail__hd"); hd.textContent = "HD"; meta.appendChild(hd);
    body.appendChild(meta);

    if (item.description || item.overview) {
      const desc = el("p", "detail__desc");
      desc.textContent = item.description || item.overview;
      body.appendChild(desc);
    }

    const cta = el("div", "detail__cta");
    const watchBtn = el("button", "btn btn--primary");
    watchBtn.textContent = "▶ Watch now";
    watchBtn.addEventListener("click", function () {
      window.location.href = "player.html?id=" + (item.tmdb_id || item.id) + "&type=" + kind;
    });
    const listBtn = el("button", "btn btn--ghost");
    listBtn.textContent = "+ My List";
    listBtn.addEventListener("click", function () {
      if (typeof window.toggleMyList === "function") window.toggleMyList(item);
      else showToast("Added to list");
    });
    const likeBtn = el("button", "btn btn--ghost btn--icon");
    likeBtn.textContent = "♥";
    likeBtn.title = "Like";
    const shareBtn = el("button", "btn btn--ghost btn--icon");
    shareBtn.textContent = "↗";
    shareBtn.title = "Share";
    cta.appendChild(watchBtn);
    cta.appendChild(listBtn);
    cta.appendChild(likeBtn);
    cta.appendChild(shareBtn);
    body.appendChild(cta);

    // About (fact grid)
    const facts = el("div", "detail__sect");
    const factsHead = el("h3"); factsHead.textContent = "About";
    facts.appendChild(factsHead);
    const factGrid = el("div", "detail__factgrid");
    const titleStr = item.title || item.name || "";
    const factData = [
      { k: "Director", v: "Various" },
      { k: "Cast",     v: titleStr.split(" ")[0] + " Cast, et al." },
      { k: "Genre",    v: item.genre },
      { k: "Year",     v: year },
      { k: "Runtime",  v: item.runtime },
      { k: "Rated",    v: "TV-MA" },
      { k: "Rating",   v: item.rating || (item.vote_average ? item.vote_average.toFixed(1) + " / 10" : null) },
    ];
    factData.forEach(function (f) {
      if (!f.v) return;
      const cell = el("div");
      const key = el("div", "detail__fact-k"); key.textContent = f.k;
      const val = el("div", "detail__fact-v"); val.textContent = f.v;
      cell.appendChild(key);
      cell.appendChild(val);
      factGrid.appendChild(cell);
    });
    facts.appendChild(factGrid);
    body.appendChild(facts);

    // Episodes section (TV only)
    if (kind === "tv") {
      const epSect = el("div", "detail__sect");
      const epHead = el("h3"); epHead.textContent = "Episodes";
      epSect.appendChild(epHead);
      const epList = el("div", "detail__episodes");
      for (let ep = 1; ep <= 6; ep++) {
        const epEl = el("div", "detail__ep");
        epEl.addEventListener("click", (function (n) {
          return function () {
            window.location.href = "player.html?id=" + (item.tmdb_id || item.id) + "&type=tv&season=1&episode=" + n;
          };
        })(ep));
        const thumb = el("div", "detail__ep-thumb");
        thumb.style.background = "linear-gradient(135deg," + g[0] + "," + g[1] + ")";
        thumb.textContent = "▶";
        const epInfo = el("div");
        epInfo.style.flex = "1";
        const epSub = el("div", "detail__ep-sub"); epSub.textContent = "S1 · E" + ep;
        const epTitle = el("div", "detail__ep-title"); epTitle.textContent = "Episode " + ep;
        epInfo.appendChild(epSub);
        epInfo.appendChild(epTitle);
        epEl.appendChild(thumb);
        epEl.appendChild(epInfo);
        epList.appendChild(epEl);
      }
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

    function closeModal() {
      document.removeEventListener("keydown", onKey);
      backdrop.style.opacity = "0";
      backdrop.style.transition = "opacity 150ms ease";
      setTimeout(function () { backdrop.remove(); }, 160);
    }
  }

  // ─── Footer ─────────────────────────────────────────────────────────────────

  function renderFooter(mountId) {
    const mount = document.getElementById(mountId || "footer-mount");
    if (!mount) return;

    const footer = el("footer", "footer");

    const top = el("div", "footer__top");
    const copy = el("span");
    copy.textContent = "© 2025 ELI6 Movies";
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

  // ─── Cookie Banner ──────────────────────────────────────────────────────────

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

  // ─── Toast ──────────────────────────────────────────────────────────────────

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

  // ─── exports ────────────────────────────────────────────────────────────────

  Object.assign(window, {
    renderTopNav:      renderTopNav,
    renderBottomNav:   renderBottomNav,
    makePoster:        makePoster,
    makeRow:           makeRow,
    makeHeroSlider:    makeHeroSlider,
    openDetailModal:   openDetailModal,
    renderFooter:      renderFooter,
    showToast:         showToast,
    renderCookieBanner: renderCookieBanner,
  });

  document.addEventListener("DOMContentLoaded", function () {
    renderCookieBanner();
    document.addEventListener("click", function() {
      document.querySelectorAll(".topnav__lang-menu--open").forEach(function(m) { m.classList.remove("topnav__lang-menu--open"); });
    });
  });

})(window);

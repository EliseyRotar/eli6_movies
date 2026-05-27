// ELI6 Movies — shared vanilla JS component renderers
// All components read CSS vars from the theme system (theme.js + theme.css + design.css)

(function (window) {
  "use strict";

  // ─── helpers ────────────────────────────────────────────────────────────────

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

    right.appendChild(searchWide);
    right.appendChild(searchMobile);
    right.appendChild(tweaksBtn);
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
        rank:    opts.numbered ? i : null,
        badge:   opts.badge ? opts.badge(item) : null,
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

    let idx = 0;
    let timer = null;

    function render(i) {
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
        img.style.backgroundImage = "url(https://image.tmdb.org/t/p/original" + item.backdrop_path + ")";
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
      resetTimer();
    }

    function resetTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(function () { go(idx + 1); }, 7000);
    }

    render(0);
    resetTimer();

    return { go: go, stop: function () { clearInterval(timer); } };
  }

  // ─── Detail Modal ───────────────────────────────────────────────────────────

  function openDetailModal(item) {
    const TMDB_IMG = "https://image.tmdb.org/t/p/";
    const theme    = currentTheme();

    const backdrop = el("div", "detail-backdrop");
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });

    const modal = el("div", "detail");

    // Art
    const art = el("div", "detail__art");
    const g = item.grad || ["#1a1a2e", "#16213e", "#0f3460"];
    if (item.backdrop_path) {
      art.style.backgroundImage = "url(" + TMDB_IMG + "w780" + item.backdrop_path + ")";
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

    modal.appendChild(art);

    // Body
    const body = el("div", "detail__body");

    const kindLabel = el("div", "detail__kind-label");
    const kind = item.kind || item.media_type || "movie";
    kindLabel.textContent = kind.toUpperCase();
    body.appendChild(kindLabel);

    const title = el("div", "detail__title");
    title.textContent = item.title || item.name || "";
    body.appendChild(title);

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
      const playerUrl = "player.html?id=" + (item.tmdb_id || item.id) + "&type=" + kind;
      window.location.href = playerUrl;
    });
    const listBtn = el("button", "btn btn--outline");
    listBtn.textContent = "+ My List";
    listBtn.addEventListener("click", function () {
      if (typeof window.toggleMyList === "function") window.toggleMyList(item);
      else showToast("Added to list");
    });
    cta.appendChild(watchBtn);
    cta.appendChild(listBtn);
    body.appendChild(cta);

    // Facts
    const facts = el("div", "detail__sect");
    const factsHead = el("h3"); factsHead.textContent = "Details";
    facts.appendChild(factsHead);
    const grid = el("div", "detail__factgrid");
    const factData = [
      { k: "Year",    v: year },
      { k: "Genre",   v: item.genre },
      { k: "Runtime", v: item.runtime },
      { k: "Rating",  v: item.rating || (item.vote_average ? item.vote_average.toFixed(1) + " / 10" : null) },
    ];
    factData.forEach(function (f) {
      if (!f.v) return;
      const cell = el("div");
      const key = el("div", "detail__fact-k"); key.textContent = f.k;
      const val = el("div", "detail__fact-v"); val.textContent = f.v;
      cell.appendChild(key);
      cell.appendChild(val);
      grid.appendChild(cell);
    });
    facts.appendChild(grid);
    body.appendChild(facts);

    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

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
    footer.innerHTML =
      "<span>© 2025 ELI6 Movies</span>" +
      "<span>This site does not host any files. All content is provided by non-affiliated third parties.</span>";

    mount.innerHTML = "";
    mount.appendChild(footer);
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
    renderTopNav:    renderTopNav,
    renderBottomNav: renderBottomNav,
    makePoster:      makePoster,
    makeRow:         makeRow,
    makeHeroSlider:  makeHeroSlider,
    openDetailModal: openDetailModal,
    renderFooter:    renderFooter,
    showToast:       showToast,
  });

})(window);

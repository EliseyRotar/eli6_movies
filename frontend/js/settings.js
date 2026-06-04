// ELI6 Movies — settings page logic
// Reads/writes window.getPrefs() / window.setPref() from theme.js

(function () {
  "use strict";

  var THEMES_META = {
    pulse: {
      desc: "Clean and modern. Space Grotesk typeface, electric lime accent, soft rounded corners.",
      swatches: ["#c8ff3a", "#5af0d8", "#ff6a55", "#a87cff"],
      tiles: ["#1a1a22", "#c8ff3a", "#22222c"],
    },
    marquee: {
      desc: "Retro terminal aesthetic. Major Mono Display, magenta neon, sharp edges, VHS scanlines.",
      swatches: ["#ff3aa0", "#d8ff3a", "#3ad8ff", "#ff8a3a"],
      tiles: ["#251c24", "#ff3aa0", "#2e2329"],
    },
  };


  function buildPage() {
    var main = document.getElementById("settings-main");
    if (!main) return;
    main.innerHTML = "";

    var prefs = window.getPrefs();

    var head = div("settings__head");
    var backBtn = el("button", "settings__back");
    backBtn.textContent = "← Account";
    backBtn.addEventListener("click", function () { history.back(); });
    head.appendChild(backBtn);

    var eyebrow = el("div", "pagehead__eyebrow");
    eyebrow.textContent = "CUSTOMIZE";
    eyebrow.style.marginBottom = "8px";
    head.appendChild(eyebrow);

    var pageTitle = el("h1");
    pageTitle.style.cssText = "font-family:var(--font-head);font-weight:var(--head-weight);font-size:clamp(28px,5vw,48px);letter-spacing:-0.03em;color:var(--fg);margin:0";
    pageTitle.textContent = "Settings";
    head.appendChild(pageTitle);

    var pageSub = el("p");
    pageSub.style.cssText = "color:var(--fg-muted);font-size:14px;margin-top:8px";
    pageSub.textContent = "Appearance, layout, and content preferences — all in one place.";
    head.appendChild(pageSub);
    main.appendChild(head);

    var themeSection = buildSection(
      "01 / LOOK",
      "Theme",
      "Switch between Pulse and Marquee — two completely different visual identities."
    );
    var themeCards = div("settings__themecards");

    Object.keys(window.THEMES).forEach(function (key) {
      var t = window.THEMES[key];
      var meta = THEMES_META[key] || {};
      var card = el("button", "settings__themecard" + (prefs.theme === key ? " is-active" : ""));
      card.type = "button";

      var preview = div("settings__themecard-preview");
      preview.dataset.themePreview = key;

      var bar = div("settings__themecard-bar");
      var logoSpan = div("settings__themecard-logo");
      if (key === "pulse") {
        logoSpan.innerHTML = "ELI<span>6</span>.";
      } else {
        logoSpan.textContent = "E·L·I·6";
      }
      var dots = div("settings__themecard-dots");
      dots.innerHTML = "<span></span><span></span><span></span>";
      bar.appendChild(logoSpan);
      bar.appendChild(dots);
      preview.appendChild(bar);

      var hero = div("settings__themecard-hero");
      var titleEl = div("settings__themecard-title");
      titleEl.textContent = key === "pulse" ? "The Last Horizon" : "LAST HORIZON";
      var metaEl = div("settings__themecard-meta");
      metaEl.textContent = key === "pulse" ? "8.4  ·  2024  ·  Sci-Fi" : "★ 8.4 · 2024 · SCI-FI";
      var btns = div("settings__themecard-btns");
      var wb = el("div", "settings__themecard-btn primary"); wb.textContent = key === "marquee" ? "WATCH" : "▶ Watch";
      var lb = el("div", "settings__themecard-btn"); lb.textContent = key === "marquee" ? "+ LIST" : "+ List";
      btns.appendChild(wb); btns.appendChild(lb);
      hero.appendChild(titleEl); hero.appendChild(metaEl); hero.appendChild(btns);
      preview.appendChild(hero);

      var tileRow = div("settings__themecard-row");
      (meta.tiles || ["#1a1a22", "#c8ff3a", "#22222c"]).forEach(function (c) {
        var tile = div("settings__themecard-tile");
        tile.style.background = c;
        tileRow.appendChild(tile);
      });
      preview.appendChild(tileRow);
      card.appendChild(preview);

      var info = div("settings__themecard-info");
      var nameLine = div("settings__themecard-name");
      nameLine.textContent = t.name;
      if (prefs.theme === key) {
        var activeChip = el("span", "settings__themecard-active");
        activeChip.textContent = "ACTIVE";
        nameLine.appendChild(activeChip);
      }
      var descEl = div("settings__themecard-desc");
      descEl.textContent = meta.desc || "";
      var swatchRow = div("settings__themecard-swatches");
      (meta.swatches || []).forEach(function (c) {
        var s = el("span"); s.style.background = c;
        swatchRow.appendChild(s);
      });
      info.appendChild(nameLine);
      info.appendChild(descEl);
      info.appendChild(swatchRow);
      card.appendChild(info);

      card.addEventListener("click", function () {
        window.setPref("theme", key);
        buildPage();
      });
      themeCards.appendChild(card);
    });

    themeSection.appendChild(themeCards);
    main.appendChild(themeSection);

    var modeSection = buildSection(
      "02 / BRIGHTNESS",
      "Dark or Light",
      "Choose between a dark environment for late-night watching, or a bright surface for daytime."
    );
    var modeCards = div("settings__modecards");

    [
      { k: "dark",  label: "Dark",  icon: "◑" },
      { k: "light", label: "Light", icon: "○" },
    ].forEach(function (m) {
      var card = el("button", "settings__modecard" + (prefs.mode === m.k ? " is-active" : ""));
      card.type = "button";

      var preview = div("settings__modecard-preview");
      preview.dataset.modePreview = m.k;
      var mBar = div("settings__modecard-bar");
      var mBody = div("settings__modecard-body");
      var l1 = div("settings__modecard-line wide"); var l2 = div("settings__modecard-line med"); var l3 = div("settings__modecard-line");
      mBody.appendChild(l1); mBody.appendChild(l2); mBody.appendChild(l3);
      var mIcon = div("settings__modecard-icon"); mIcon.textContent = m.icon;
      preview.appendChild(mBar); preview.appendChild(mBody); preview.appendChild(mIcon);
      card.appendChild(preview);

      var labelEl = div("settings__modecard-label"); labelEl.textContent = m.label;
      card.appendChild(labelEl);

      card.addEventListener("click", function () {
        window.setPref("mode", m.k);
        buildPage();
      });
      modeCards.appendChild(card);
    });

    modeSection.appendChild(modeCards);
    main.appendChild(modeSection);

    var accentSection = buildSection(
      "03 / COLOUR",
      "Accent",
      "The highlight colour used for active elements, buttons, and focus indicators."
    );
    var accentWrap = div("settings__accents");
    var currentThemeAccents = window.THEMES[prefs.theme] ? window.THEMES[prefs.theme].accents : window.THEMES.pulse.accents;

    currentThemeAccents.forEach(function (a, i) {
      var btn = el("button", "settings__accent" + (prefs.accentIdx === i ? " is-active" : ""));
      btn.type = "button";
      btn.style.setProperty("--swatch", a.value);
      var dot = div("settings__accent-dot");
      var label = div("settings__accent-label"); label.textContent = a.name;
      btn.appendChild(dot); btn.appendChild(label);
      btn.addEventListener("click", function () {
        window.setPref("accentIdx", i);
        buildPage();
      });
      accentWrap.appendChild(btn);
    });

    accentSection.appendChild(accentWrap);
    main.appendChild(accentSection);

    var layoutSection = buildSection(
      "04 / LAYOUT",
      "Density & Spacing",
      "Control how much information is shown at once."
    );

    layoutSection.appendChild(buildSegRow(
      "Density",
      "Affects spacing between rows, poster sizes, and padding.",
      ["Compact", "Comfy", "Spacious"],
      ["compact", "comfy", "spacious"],
      prefs.density,
      function (v) { window.setPref("density", v); }
    ));

    layoutSection.appendChild(buildSegRow(
      "Corner Style",
      "How rounded UI elements appear.",
      ["Sharp", "Default", "Round"],
      ["sharp", "default", "round"],
      prefs.radius,
      function (v) { window.setPref("radius", v); }
    ));

    layoutSection.appendChild(buildSegRow(
      "Font Size",
      "Scale all text up or down.",
      ["Small", "Normal", "Large"],
      ["small", "default", "large"],
      prefs.fontScale,
      function (v) { window.setPref("fontScale", v); }
    ));

    main.appendChild(layoutSection);

    var presetSection = buildSection(
      "05 / PRESETS",
      "Quick Presets",
      "Apply a curated combination of settings in one click."
    );
    var presetGrid = div("settings__presets");

    var PRESETS = [
      { name: "Midnight",   desc: "Pulse dark, lime, comfy",          bg: "#0d0d12",  prefs: { theme: "pulse",   mode: "dark",  accentIdx: 0, density: "comfy",    radius: "default", fontScale: "default" } },
      { name: "Daylight",   desc: "Pulse light, coral, spacious",     bg: "#f7f7fa",  prefs: { theme: "pulse",   mode: "light", accentIdx: 2, density: "spacious", radius: "round",   fontScale: "default" } },
      { name: "Retro VHS",  desc: "Marquee dark, magenta, compact",   bg: "#1a1218",  prefs: { theme: "marquee", mode: "dark",  accentIdx: 0, density: "compact",  radius: "sharp",   fontScale: "small"   } },
      { name: "Neon Arcade",desc: "Marquee dark, acid, comfy",        bg: "#1a1218",  prefs: { theme: "marquee", mode: "dark",  accentIdx: 1, density: "comfy",    radius: "sharp",   fontScale: "default" } },
    ];

    PRESETS.forEach(function (preset) {
      var btn = el("button", "settings__preset");
      btn.type = "button";
      var swatch = div("settings__preset-swatch"); swatch.style.background = preset.bg;
      var nameEl = el("span", "settings__preset-name"); nameEl.textContent = preset.name;
      var descEl = el("span", "settings__preset-desc"); descEl.textContent = preset.desc;
      var textWrap = div(); textWrap.appendChild(nameEl); textWrap.appendChild(descEl);
      btn.appendChild(swatch); btn.appendChild(textWrap);
      btn.addEventListener("click", function () {
        window.setPref(preset.prefs);
        buildPage();
        showToast('Preset "' + preset.name + '" applied');
      });
      presetGrid.appendChild(btn);
    });

    presetSection.appendChild(presetGrid);
    main.appendChild(presetSection);

    // --- Content Preferences section ---
    var contentPrefSection = buildSection(
      "06 / CONTENT",
      "Content Preferences",
      "Pick the genres you want to see highlighted. Unchecked genres are still available, just deprioritised."
    );
    var GENRES = [
      { id: 28,    name: "Action" },
      { id: 35,    name: "Comedy" },
      { id: 18,    name: "Drama" },
      { id: 27,    name: "Horror" },
      { id: 878,   name: "Sci-Fi" },
      { id: 10749, name: "Romance" },
      { id: 53,    name: "Thriller" },
      { id: 99,    name: "Documentary" },
      { id: 16,    name: "Animation" },
      { id: 14,    name: "Fantasy" },
      { id: 80,    name: "Crime" },
      { id: 12,    name: "Adventure" },
    ];
    var savedGenres = [];
    try { savedGenres = JSON.parse(localStorage.getItem('eli6.genres') || '[]'); } catch(e) {}
    var genreGrid = div("settings__genre-grid");
    genreGrid.style.cssText = "display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;";
    GENRES.forEach(function (g) {
      var active = savedGenres.includes(g.id);
      var chip = el("button", "settings__genre-chip" + (active ? " is-active" : ""));
      chip.type = "button";
      chip.textContent = g.name;
      chip.style.cssText = "padding:7px 16px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.18s;border:1.5px solid;";
      chip.style.background = active ? "var(--accent)" : "transparent";
      chip.style.color = active ? "var(--bg)" : "var(--fg-muted)";
      chip.style.borderColor = active ? "var(--accent)" : "rgba(128,128,128,0.35)";
      chip.addEventListener("click", function () {
        try { savedGenres = JSON.parse(localStorage.getItem('eli6.genres') || '[]'); } catch(e) { savedGenres = []; }
        var idx = savedGenres.indexOf(g.id);
        if (idx === -1) {
          savedGenres.push(g.id);
          chip.classList.add("is-active");
          chip.style.background = "var(--accent)"; chip.style.color = "var(--bg)"; chip.style.borderColor = "var(--accent)";
        } else {
          savedGenres.splice(idx, 1);
          chip.classList.remove("is-active");
          chip.style.background = "transparent"; chip.style.color = "var(--fg-muted)"; chip.style.borderColor = "rgba(128,128,128,0.35)";
        }
        localStorage.setItem('eli6.genres', JSON.stringify(savedGenres));
      });
      genreGrid.appendChild(chip);
    });
    contentPrefSection.appendChild(genreGrid);
    main.appendChild(contentPrefSection);

    var footerActions = div("settings__footer-actions");
    var doneBtn = el("button", "btn btn--primary");
    doneBtn.textContent = "Done — back to home";
    doneBtn.addEventListener("click", function () { window.location.href = "index.html"; });
    footerActions.appendChild(doneBtn);
    var resetBtn = el("button", "btn btn--outline");
    resetBtn.textContent = "Reset to defaults";
    resetBtn.addEventListener("click", function () {
      window.setPref({ theme: "pulse", mode: "dark", accentIdx: 0, density: "comfy", radius: "default", fontScale: "default" });
      buildPage();
      showToast("Settings reset to defaults");
    });
    footerActions.appendChild(resetBtn);
    main.appendChild(footerActions);
  }


  function buildSection(eyebrow, title, sub) {
    var sect = div("settings__sect");
    var sectHead = div("settings__sect-head");
    var ey = div("settings__sect-eyebrow"); ey.textContent = eyebrow;
    var t  = div("settings__sect-title"); t.textContent = title;
    sectHead.appendChild(ey); sectHead.appendChild(t);
    if (sub) { var s = div("settings__sect-sub"); s.textContent = sub; sectHead.appendChild(s); }
    sect.appendChild(sectHead);
    return sect;
  }

  function buildSegRow(label, hint, labels, values, current, onChange) {
    var row = div("settings__row");

    var textWrap = div();
    var l = div("settings__label"); l.textContent = label;
    var h = div("settings__hint"); h.textContent = hint;
    textWrap.appendChild(l); textWrap.appendChild(h);
    row.appendChild(textWrap);

    var seg = div("settings__seg");
    labels.forEach(function (lbl, i) {
      var btn = el("button", "settings__seg-btn" + (current === values[i] ? " is-active" : ""));
      btn.type = "button";
      btn.textContent = lbl;
      btn.addEventListener("click", function () { onChange(values[i]); });
      seg.appendChild(btn);
    });
    row.appendChild(seg);

    return row;
  }


  function el(tag, cls) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    return e;
  }
  function div(cls) { return el("div", cls); }


  document.addEventListener("DOMContentLoaded", function () {
    renderTopNav("settings");
    renderBottomNav("settings");
    buildPage();
    renderFooter("footer-mount");

    document.addEventListener("eli6.themeChanged", function () {
      renderTopNav("settings");
      renderBottomNav("settings");
    });
  });

})();

// ELI6 Movies — theme system
// Replaces old dark/light only system. Manages Pulse + Marquee themes.

window.THEMES = {
  pulse: {
    name: "Pulse",
    fonts: {
      head: "'Space Grotesk', sans-serif",
      body: "'Space Grotesk', sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    headWeight: 700,
    radius: { sm: 8, md: 14, lg: 22, pill: 999 },
    accents: [
      { name: "Lime",   value: "#c8ff3a", on: "#0d0d12" },
      { name: "Cyan",   value: "#5af0d8", on: "#0d0d12" },
      { name: "Coral",  value: "#ff6a55", on: "#0d0d12" },
      { name: "Violet", value: "#a87cff", on: "#0d0d12" },
    ],
    modes: {
      dark: {
        bg:        "#0d0d12",
        bgAlt:     "#15151c",
        surface:   "#1a1a22",
        surfaceHi: "#22222c",
        fg:        "#f0f0ff",
        fgMuted:   "#7a7a90",
        fgFaint:   "#4a4a5a",
        border:    "rgba(255,255,255,0.08)",
        scrim:     "rgba(13,13,18,0.85)",
        elevated:  "rgba(255,255,255,0.06)",
      },
      light: {
        bg:        "#f7f7fa",
        bgAlt:     "#ededf2",
        surface:   "#ffffff",
        surfaceHi: "#f2f2f6",
        fg:        "#0d0d12",
        fgMuted:   "#62627a",
        fgFaint:   "#a8a8b8",
        border:    "rgba(13,13,18,0.08)",
        scrim:     "rgba(247,247,250,0.85)",
        elevated:  "rgba(13,13,18,0.04)",
      },
    },
  },

  marquee: {
    name: "Marquee",
    fonts: {
      head: "'Major Mono Display', monospace",
      body: "'JetBrains Mono', monospace",
      mono: "'JetBrains Mono', monospace",
    },
    headWeight: 400,
    radius: { sm: 0, md: 0, lg: 0, pill: 999 },
    accents: [
      { name: "Magenta", value: "#ff3aa0", on: "#1a1218" },
      { name: "Acid",    value: "#d8ff3a", on: "#1a1218" },
      { name: "Sky",     value: "#3ad8ff", on: "#1a1218" },
      { name: "Tang",    value: "#ff8a3a", on: "#1a1218" },
    ],
    modes: {
      dark: {
        bg:        "#1a1218",
        bgAlt:     "#231820",
        surface:   "#251c24",
        surfaceHi: "#2e2329",
        fg:        "#f4ede0",
        fgMuted:   "#a89898",
        fgFaint:   "#6a5a5a",
        border:    "rgba(244,237,224,0.12)",
        scrim:     "rgba(26,18,24,0.9)",
        elevated:  "rgba(244,237,224,0.04)",
      },
      light: {
        bg:        "#f4ede0",
        bgAlt:     "#eae0d0",
        surface:   "#ffffff",
        surfaceHi: "#faf3e6",
        fg:        "#1a1218",
        fgMuted:   "#7a6868",
        fgFaint:   "#b8a8a8",
        border:    "rgba(26,18,24,0.12)",
        scrim:     "rgba(244,237,224,0.9)",
        elevated:  "rgba(26,18,24,0.05)",
      },
    },
  },
};

const PREFS_KEY = "eli6.prefs";

const DEFAULT_PREFS = {
  theme:     "pulse",
  mode:      "dark",
  accentIdx: 0,
  density:   "comfy",
  radius:    "default",
  fontScale: "default",
};

function loadPrefs() {
  try {
    return Object.assign({}, DEFAULT_PREFS, JSON.parse(localStorage.getItem(PREFS_KEY) || "{}"));
  } catch {
    return Object.assign({}, DEFAULT_PREFS);
  }
}

function savePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

window.applyTheme = function(themeKey, mode, accentIdx, density, radiusMode, fontScale) {
  const t = THEMES[themeKey] || THEMES.pulse;
  const m = t.modes[mode] || t.modes.dark;
  const a = t.accents[accentIdx] || t.accents[0];
  const r = document.documentElement;

  r.style.setProperty("--bg",         m.bg);
  r.style.setProperty("--bg-alt",     m.bgAlt);
  r.style.setProperty("--surface",    m.surface);
  r.style.setProperty("--surface-hi", m.surfaceHi);
  r.style.setProperty("--fg",         m.fg);
  r.style.setProperty("--fg-muted",   m.fgMuted);
  r.style.setProperty("--fg-faint",   m.fgFaint);
  r.style.setProperty("--border",     m.border);
  r.style.setProperty("--scrim",      m.scrim);
  r.style.setProperty("--elevated",   m.elevated);

  r.style.setProperty("--accent",    a.value);
  r.style.setProperty("--on-accent", a.on);

  r.style.setProperty("--font-head",   t.fonts.head);
  r.style.setProperty("--font-body",   t.fonts.body);
  r.style.setProperty("--font-mono",   t.fonts.mono);
  r.style.setProperty("--head-weight", t.headWeight);

  const radius =
    radiusMode === "sharp" ? { sm: 0,  md: 0,  lg: 0,  pill: 999 } :
    radiusMode === "round" ? { sm: 10, md: 18, lg: 26, pill: 999 } :
    t.radius;
  r.style.setProperty("--r-sm",   radius.sm   + "px");
  r.style.setProperty("--r-md",   radius.md   + "px");
  r.style.setProperty("--r-lg",   radius.lg   + "px");
  r.style.setProperty("--r-pill", radius.pill + "px");

  const dens =
    density === "compact"  ? { rowGap: 28, padX: 36, posterW: 160, posterH: 240, posterGap: 10 } :
    density === "spacious" ? { rowGap: 56, padX: 64, posterW: 200, posterH: 300, posterGap: 22 } :
                             { rowGap: 40, padX: 48, posterW: 180, posterH: 270, posterGap: 14 };
  r.style.setProperty("--row-gap",    dens.rowGap    + "px");
  r.style.setProperty("--pad-x",      dens.padX      + "px");
  r.style.setProperty("--poster-w",   dens.posterW   + "px");
  r.style.setProperty("--poster-h",   dens.posterH   + "px");
  r.style.setProperty("--poster-gap", dens.posterGap + "px");

  const scale = fontScale === "small" ? 0.92 : fontScale === "large" ? 1.1 : 1;
  r.style.setProperty("--font-scale", scale);

  r.dataset.theme = themeKey;
  r.dataset.mode  = mode;

  document.dispatchEvent(new CustomEvent("eli6.themeChanged", { detail: { themeKey, mode, accentIdx, density, radiusMode, fontScale } }));
};

window.getPrefs   = loadPrefs;
window.savePrefs  = savePrefs;

window.setPref = function(keyOrObj, value) {
  const prefs = loadPrefs();
  if (typeof keyOrObj === "object") {
    Object.assign(prefs, keyOrObj);
  } else {
    prefs[keyOrObj] = value;
  }
  savePrefs(prefs);
  applyTheme(prefs.theme, prefs.mode, prefs.accentIdx, prefs.density, prefs.radius, prefs.fontScale);
};

// Apply on load
(function() {
  const p = loadPrefs();
  applyTheme(p.theme, p.mode, p.accentIdx, p.density, p.radius, p.fontScale);
})();

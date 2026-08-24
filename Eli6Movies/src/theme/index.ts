export const colors = {
  bg: '#0B0B0E',           // slightly deeper than #141414 for richer black
  surface: '#161618',
  surface2: '#1E1E22',
  surface3: '#26262C',
  border: '#3A3A3F',
  accent: '#E50914',       // Netflix red
  accentDim: '#B20710',
  accentGlow: 'rgba(229,9,20,0.4)',
  accent2: '#00CEC9',
  accent3: '#FD79A8',
  green: '#46D369',        // Match %
  red: '#E17055',
  yellow: '#FDCB6E',
  textHi: '#FFFFFF',
  textMid: '#B3B3B3',
  textLo: '#808080',
  textDim: '#5A5A5A',
  transparent: 'transparent',
  black: '#000000',
  white: '#FFFFFF',
  // overlay gradients
  overlayBottom: 'rgba(11,11,14,0.95)',
  overlayTop: 'rgba(11,11,14,0.7)',
  // badge / pill borders
  badgeBorder: 'rgba(255,255,255,0.4)',
  badgeBg: 'rgba(11,11,14,0.7)',
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  huge: 64,
  giant: 96,
} as const;

export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 999,
} as const;

export const shadow = {
  // subtle elevation when card gets focus on TV
  focusLift: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 12,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
} as const;

export const durations = {
  focus: 180,
  press: 110,
  nav: 220,
  heroCrossfade: 420,
  screenFade: 320,
} as const;
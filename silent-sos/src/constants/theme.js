/**
 * Silent SOS — Design System Tokens & Dark Theme Constants
 *
 * Provides a unified color hierarchy, typography scale, spacing tokens,
 * radius standards, elevation shadows, and animation configs for
 * consistent, accessible dark-mode UI across the application.
 */

export const COLORS = {
  // Background layers (deep obsidian dark theme)
  bg0: '#0A0C10',
  bg1: '#10141C',
  bg2: '#161B26',
  bg3: '#1E2535',
  bg4: '#252D40',

  // Surfaces / Cards
  surface: '#1A2030',
  surfaceHover: '#202840',
  surfaceCard: '#151A24',
  surfaceElevated: '#1D2436',
  surfaceHighlight: '#222B3D',
  border: '#2A3448',
  borderLight: '#374059',
  borderSubtle: '#1F2738',
  borderFocus: '#4A90D9',

  // Primary accent — soft steel blue
  primary: '#4A90D9',
  primaryLight: '#6AABF0',
  primaryDark: '#3070B0',
  primaryGlow: 'rgba(74, 144, 217, 0.15)',

  // Safe / success — muted teal
  safe: '#38B2AC',
  safeLight: '#4ECDC4',
  safeDim: 'rgba(56, 178, 172, 0.12)',
  safeGlow: 'rgba(78, 205, 196, 0.2)',

  // Warning — amber (non-alarming)
  warning: '#D4A843',
  warningLight: '#F0C060',
  warningDim: 'rgba(212, 168, 67, 0.12)',

  // Danger — muted crimson (only for critical UX)
  danger: '#C0544A',
  dangerLight: '#E06A60',
  dangerDim: 'rgba(192, 84, 74, 0.12)',
  dangerGlow: 'rgba(224, 106, 96, 0.2)',

  // Password strength meter indicators
  strengthWeak: '#E06A60',
  strengthFair: '#F0C060',
  strengthGood: '#4A90D9',
  strengthStrong: '#4ECDC4',

  // Text hierarchy
  text: '#E8EAF0',
  textSecondary: '#8B95B0',
  textMuted: '#525E78',
  textDisabled: '#3A4258',

  // SOS button gradient stops
  sosStart: '#2E4A80',
  sosMid: '#1E3560',
  sosEnd: '#0F1E40',
  sosGlow: 'rgba(74, 130, 220, 0.35)',

  // Modal / backdrop overlay
  overlay: 'rgba(10, 12, 16, 0.75)',

  // White utilities
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'Courier',
  },
  size: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    xxxl: 38,
    display: 48,
  },
  weight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
  section: 64,
};

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  primary: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sos: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
};

export const ANIMATION = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    tension: 70,
    friction: 9,
  },
  bouncy: {
    tension: 100,
    friction: 6,
  },
};

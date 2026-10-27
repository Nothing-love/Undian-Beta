/* ============================================================
   DOORPRIZE — Token warna tema (bersama)
   Dipakai app.js (Dashboard/Pengaturan/adm1ndev) DAN halaman Login yang
   berjalan sebelum login (tanpa app.js) — satu sumber daftar tema.
   ============================================================ */

const THEME_PRESETS = {
  komando: {
    primary: '#DC2626', primaryLight: '#F04444', primaryDark: '#B01B1B', primaryRgb: '220, 38, 38',
    secondary: '#7F1D1D', secondaryLight: '#991B1B', secondaryRgb: '127, 29, 29',
    accent: '#F97316', accentLight: '#FB923C', accentRgb: '249, 115, 22',
    bg: '#0A0E15', bgSecondary: '#0F141D', surface: '#111826',
    text: '#E9EEF6', textSecondary: '#B3C1D1', textMuted: '#7F93A8',
    border: '#1F2A3A', borderLight: '#2A3749'
  },
  professional_blue: {
    primary: '#2563EB', primaryLight: '#3B82F6', primaryDark: '#1D4ED8', primaryRgb: '37, 99, 235',
    secondary: '#7C3AED', secondaryLight: '#8B5CF6', secondaryRgb: '124, 58, 237',
    accent: '#F59E0B', accentLight: '#FBBF24', accentRgb: '245, 158, 11',
    bg: '#F8FAFC', bgSecondary: '#F1F5F9', surface: '#FFFFFF',
    text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
    border: '#E2E8F0', borderLight: '#F1F5F9'
  },
  gala_gold: {
    primary: '#D97706', primaryLight: '#F59E0B', primaryDark: '#B45309', primaryRgb: '217, 119, 6',
    secondary: '#111827', secondaryLight: '#1F2937', secondaryRgb: '17, 24, 39',
    accent: '#FCD34D', accentLight: '#FDE68A', accentRgb: '252, 211, 77',
    bg: '#0F0F1A', bgSecondary: '#1A1A2E', surface: '#16162B',
    text: '#FCD34D', textSecondary: '#D97706', textMuted: '#9CA3AF',
    border: '#374151', borderLight: '#1F2937'
  },
  festive_red: {
    primary: '#DC2626', primaryLight: '#EF4444', primaryDark: '#B91C1C', primaryRgb: '220, 38, 38',
    secondary: '#991B1B', secondaryLight: '#B91C1C', secondaryRgb: '153, 27, 27',
    accent: '#FBBF24', accentLight: '#FDE047', accentRgb: '251, 191, 36',
    bg: '#FEF2F2', bgSecondary: '#FEE2E2', surface: '#FFFFFF',
    text: '#1F2937', textSecondary: '#6B7280', textMuted: '#9CA3AF',
    border: '#FECACA', borderLight: '#FEE2E2'
  },
  nature_green: {
    primary: '#059669', primaryLight: '#10B981', primaryDark: '#047857', primaryRgb: '5, 150, 105',
    secondary: '#047857', secondaryLight: '#059669', secondaryRgb: '4, 120, 87',
    accent: '#34D399', accentLight: '#6EE7B7', accentRgb: '52, 211, 153',
    bg: '#F0FDF4', bgSecondary: '#DCFCE7', surface: '#FFFFFF',
    text: '#14532D', textSecondary: '#166534', textMuted: '#6B7280',
    border: '#BBF7D0', borderLight: '#DCFCE7'
  },
  royal_purple: {
    primary: '#7C3AED', primaryLight: '#8B5CF6', primaryDark: '#6D28D9', primaryRgb: '124, 58, 237',
    secondary: '#4C1D95', secondaryLight: '#5B21B6', secondaryRgb: '76, 29, 149',
    accent: '#F472B6', accentLight: '#F472B6', accentRgb: '244, 114, 182',
    bg: '#F5F3FF', bgSecondary: '#EDE9FE', surface: '#FFFFFF',
    text: '#1E1B4B', textSecondary: '#4338CA', textMuted: '#7C72B8',
    border: '#C4B5FD', borderLight: '#EDE9FE'
  },
  sunset_orange: {
    primary: '#EA580C', primaryLight: '#F97316', primaryDark: '#C2410C', primaryRgb: '234, 88, 12',
    secondary: '#C2410C', secondaryLight: '#EA580C', secondaryRgb: '194, 65, 12',
    accent: '#FBBF24', accentLight: '#FDE047', accentRgb: '251, 191, 36',
    bg: '#FFF7ED', bgSecondary: '#FFEDD5', surface: '#FFFFFF',
    text: '#431407', textSecondary: '#7C2D12', textMuted: '#9A3412',
    border: '#FED7AA', borderLight: '#FFEDD5'
  },
  midnight_dark: {
    primary: '#38BDF8', primaryLight: '#7DD3FC', primaryDark: '#0284C7', primaryRgb: '56, 189, 248',
    secondary: '#818CF8', secondaryLight: '#A5B4FC', secondaryRgb: '129, 140, 248',
    accent: '#F472B6', accentLight: '#F472B6', accentRgb: '244, 114, 182',
    bg: '#0F172A', bgSecondary: '#1E293B', surface: '#1E293B',
    text: '#F8FAFC', textSecondary: '#94A3B8', textMuted: '#64748B',
    border: '#334155', borderLight: '#1E293B'
  }
};

const DEFAULT_CUSTOM_COLORS = { primary: '#2563EB', secondary: '#7C3AED', accent: '#F59E0B' };

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function themeColors(themeKey, customColors) {
  if (themeKey !== 'custom') return THEME_PRESETS[themeKey] || THEME_PRESETS.komando;
  const c = Object.assign({}, DEFAULT_CUSTOM_COLORS, customColors || {});
  return {
    primary: c.primary,
    primaryLight: lightenColor(c.primary, 15),
    primaryDark: darkenColor(c.primary, 15),
    primaryRgb: hexToRgb(c.primary),
    secondary: c.secondary,
    secondaryLight: lightenColor(c.secondary, 15),
    secondaryRgb: hexToRgb(c.secondary),
    accent: c.accent,
    accentLight: lightenColor(c.accent, 15),
    accentRgb: hexToRgb(c.accent),
    bg: '#F8FAFC', bgSecondary: '#F1F5F9', surface: '#FFFFFF',
    text: '#0F172A', textSecondary: '#475569', textMuted: '#94A3B8',
    border: '#E2E8F0', borderLight: '#F1F5F9'
  };
}

function applyThemeTokens(themeKey, customColors) {
  const root = document.documentElement;
  const colors = themeColors(themeKey, customColors);

  root.style.setProperty('--color-primary', colors.primary);
  root.style.setProperty('--color-primary-light', colors.primaryLight);
  root.style.setProperty('--color-primary-dark', colors.primaryDark);
  root.style.setProperty('--color-primary-rgb', colors.primaryRgb);
  root.style.setProperty('--color-secondary', colors.secondary);
  root.style.setProperty('--color-secondary-light', colors.secondaryLight);
  root.style.setProperty('--color-secondary-rgb', colors.secondaryRgb);
  root.style.setProperty('--color-accent', colors.accent);
  root.style.setProperty('--color-accent-light', colors.accentLight);
  root.style.setProperty('--color-accent-rgb', colors.accentRgb);
  root.style.setProperty('--color-bg', colors.bg);
  root.style.setProperty('--color-bg-secondary', colors.bgSecondary);
  root.style.setProperty('--color-surface', colors.surface);
  root.style.setProperty('--color-text', colors.text);
  root.style.setProperty('--color-text-secondary', colors.textSecondary);
  root.style.setProperty('--color-text-muted', colors.textMuted);
  root.style.setProperty('--color-border', colors.border);
  root.style.setProperty('--color-border-light', colors.borderLight);

  // Sinyal mode gelap/terang dari luminance latar tema → poles adaptif ([data-mode]).
  const bgHex = String(colors.bg || '#ffffff').replace('#', '');
  const r = parseInt(bgHex.substr(0, 2), 16), g = parseInt(bgHex.substr(2, 2), 16), b = parseInt(bgHex.substr(4, 2), 16);
  const isDark = ((0.2126 * (r || 255) + 0.7152 * (g || 255) + 0.0722 * (b || 255)) / 255) < 0.5;
  root.setAttribute('data-mode', isDark ? 'dark' : 'light');
}

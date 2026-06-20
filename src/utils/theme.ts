import { AccentTheme } from '../types';

export const ACCENT_THEMES: AccentTheme[] = [
  {
    id: 'emerald',
    name: 'Emerald Spark',
    colors: {
      50: '#f0fdf4',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
      950: '#022c22'
    }
  },
  {
    id: 'blue',
    name: 'Ocean Blue',
    colors: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554'
    }
  },
  {
    id: 'purple',
    name: 'Cosmic Purple',
    colors: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
      950: '#3b0764'
    }
  },
  {
    id: 'amber',
    name: 'Sunset Amber',
    colors: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
      950: '#451a03'
    }
  },
  {
    id: 'rose',
    name: 'Crimson Rose',
    colors: {
      50: '#fff1f2',
      100: '#ffe4e6',
      200: '#fecdd3',
      300: '#fda4af',
      400: '#fb7185',
      500: '#f43f5e',
      600: '#e11d48',
      700: '#be123c',
      800: '#9f1239',
      900: '#881337',
      950: '#4c0519'
    }
  },
  {
    id: 'slate',
    name: 'Carbon Gray',
    colors: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617'
    }
  }
];

export function getLoadedAccentThemeId(): string {
  if (typeof window === 'undefined') return 'blue';
  const saved = localStorage.getItem('expensetrack_accent_theme');
  return saved && ACCENT_THEMES.some(t => t.id === saved) ? saved : 'blue';
}

export function applyAccentTheme(themeId: string): void {
  if (typeof window === 'undefined') return;
  const theme = ACCENT_THEMES.find(t => t.id === themeId) || ACCENT_THEMES.find(t => t.id === 'blue') || ACCENT_THEMES[0];
  const root = document.documentElement;
  
  // Apply all color values as Tailwind-consumed variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--accent-${key}`, value);
  });
  
  localStorage.setItem('expensetrack_accent_theme', theme.id);
}

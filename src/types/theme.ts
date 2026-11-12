export type ThemeId = 'desert' | 'atlantis' | 'tundra' | 'galaxy' | 'jungle' | 'mountains';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  tagline: string;
  icon: string;
  previewGradient: string;
  // Styling properties
  bgGradient: string;
  isDark: boolean;
  headerBg: string;
  headerBorder: string;
  cardBg: string;
  cardBorder: string;
  questionCardBg: string;
  questionCardBorder: string;
  primaryButtonBg: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentColor: string;
  footerBg: string;
  footerBorder: string;
  footerText: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  desert: {
    id: 'desert',
    name: 'Oasis',
    tagline: 'Oasis Gurun & Kafilah Unta',
    icon: '🐪',
    previewGradient: 'from-amber-400 to-orange-500',
    bgGradient: 'from-sky-100 via-amber-50 to-amber-100',
    isDark: false,
    headerBg: 'bg-white/80 backdrop-blur-md',
    headerBorder: 'border-amber-200/80',
    cardBg: 'bg-white/95 backdrop-blur-md',
    cardBorder: 'border-amber-300',
    questionCardBg: 'bg-white/95 backdrop-blur-md',
    questionCardBorder: 'border-amber-300',
    primaryButtonBg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border-amber-700 text-slate-950',
    badgeBg: 'bg-amber-100/90',
    badgeBorder: 'border-amber-300',
    badgeText: 'text-amber-950',
    accentColor: '#d97706',
    footerBg: 'bg-white/70 backdrop-blur-sm',
    footerBorder: 'border-amber-200/60',
    footerText: 'text-amber-950/80',
  },
  atlantis: {
    id: 'atlantis',
    name: 'Atlantis',
    tagline: 'Kerajaan Bawah Laut & Karang Kuno',
    icon: '🔱',
    previewGradient: 'from-cyan-500 to-blue-700',
    bgGradient: 'from-cyan-950 via-teal-950 to-slate-950',
    isDark: true,
    headerBg: 'bg-slate-950/80 backdrop-blur-md',
    headerBorder: 'border-cyan-500/40',
    cardBg: 'bg-slate-900/95 backdrop-blur-md',
    cardBorder: 'border-cyan-400',
    questionCardBg: 'bg-slate-900/95 backdrop-blur-md',
    questionCardBorder: 'border-cyan-400',
    primaryButtonBg: 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 border-cyan-700 text-slate-950',
    badgeBg: 'bg-cyan-950/90',
    badgeBorder: 'border-cyan-400/60',
    badgeText: 'text-cyan-200',
    accentColor: '#06b6d4',
    footerBg: 'bg-slate-950/80 backdrop-blur-sm',
    footerBorder: 'border-cyan-500/30',
    footerText: 'text-cyan-300/80',
  },
  tundra: {
    id: 'tundra',
    name: 'Tundra',
    tagline: 'Gletser Es Abadi & Cahaya Aurora',
    icon: '❄️',
    previewGradient: 'from-sky-300 via-indigo-400 to-cyan-500',
    bgGradient: 'from-slate-950 via-indigo-950 to-sky-950',
    isDark: true,
    headerBg: 'bg-slate-950/80 backdrop-blur-md',
    headerBorder: 'border-sky-400/40',
    cardBg: 'bg-slate-900/95 backdrop-blur-md',
    cardBorder: 'border-sky-300',
    questionCardBg: 'bg-slate-900/95 backdrop-blur-md',
    questionCardBorder: 'border-sky-300',
    primaryButtonBg: 'bg-sky-400 hover:bg-sky-300 active:bg-sky-500 border-sky-600 text-slate-950',
    badgeBg: 'bg-sky-950/90',
    badgeBorder: 'border-sky-400/60',
    badgeText: 'text-sky-200',
    accentColor: '#38bdf8',
    footerBg: 'bg-slate-950/80 backdrop-blur-sm',
    footerBorder: 'border-sky-500/30',
    footerText: 'text-sky-300/80',
  },
  galaxy: {
    id: 'galaxy',
    name: 'Galaxy',
    tagline: 'Kosmis, Bintang & Nebula Ungu',
    icon: '🚀',
    previewGradient: 'from-purple-600 via-fuchsia-500 to-indigo-700',
    bgGradient: 'from-slate-950 via-purple-950 to-black',
    isDark: true,
    headerBg: 'bg-black/80 backdrop-blur-md',
    headerBorder: 'border-purple-500/40',
    cardBg: 'bg-slate-950/95 backdrop-blur-md',
    cardBorder: 'border-purple-400',
    questionCardBg: 'bg-slate-950/95 backdrop-blur-md',
    questionCardBorder: 'border-purple-400',
    primaryButtonBg: 'bg-fuchsia-500 hover:bg-fuchsia-400 active:bg-fuchsia-600 border-fuchsia-700 text-white',
    badgeBg: 'bg-purple-950/90',
    badgeBorder: 'border-purple-400/60',
    badgeText: 'text-purple-200',
    accentColor: '#c084fc',
    footerBg: 'bg-black/80 backdrop-blur-sm',
    footerBorder: 'border-purple-500/30',
    footerText: 'text-purple-300/80',
  },
  jungle: {
    id: 'jungle',
    name: 'Jungle',
    tagline: 'Hutan Hujan Tropis & Kunang-kunang',
    icon: '🌿',
    previewGradient: 'from-emerald-500 to-teal-700',
    bgGradient: 'from-stone-950 via-emerald-950 to-teal-950',
    isDark: true,
    headerBg: 'bg-stone-950/80 backdrop-blur-md',
    headerBorder: 'border-emerald-500/40',
    cardBg: 'bg-stone-900/95 backdrop-blur-md',
    cardBorder: 'border-emerald-400',
    questionCardBg: 'bg-stone-900/95 backdrop-blur-md',
    questionCardBorder: 'border-emerald-400',
    primaryButtonBg: 'bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 border-emerald-700 text-slate-950',
    badgeBg: 'bg-emerald-950/90',
    badgeBorder: 'border-emerald-400/60',
    badgeText: 'text-emerald-200',
    accentColor: '#10b981',
    footerBg: 'bg-stone-950/80 backdrop-blur-sm',
    footerBorder: 'border-emerald-500/30',
    footerText: 'text-emerald-300/80',
  },
  mountains: {
    id: 'mountains',
    name: 'Mountain',
    tagline: 'Siluet Puncak Gunung & Terasering Hijau',
    icon: '🌋',
    previewGradient: 'from-amber-600 via-emerald-600 to-stone-800',
    bgGradient: 'from-slate-950 via-amber-950/50 to-emerald-950',
    isDark: true,
    headerBg: 'bg-stone-950/80 backdrop-blur-md',
    headerBorder: 'border-amber-500/40',
    cardBg: 'bg-stone-900/95 backdrop-blur-md',
    cardBorder: 'border-amber-400',
    questionCardBg: 'bg-stone-900/95 backdrop-blur-md',
    questionCardBorder: 'border-amber-400',
    primaryButtonBg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 border-amber-700 text-slate-950',
    badgeBg: 'bg-amber-950/90',
    badgeBorder: 'border-amber-400/60',
    badgeText: 'text-amber-200',
    accentColor: '#f59e0b',
    footerBg: 'bg-stone-950/80 backdrop-blur-sm',
    footerBorder: 'border-amber-500/30',
    footerText: 'text-amber-300/80',
  },
};

export const THEME_IDS: ThemeId[] = ['desert', 'atlantis', 'tundra', 'galaxy', 'jungle', 'mountains'];

export function getRandomTheme(): ThemeId {
  const randomIndex = Math.floor(Math.random() * THEME_IDS.length);
  return THEME_IDS[randomIndex];
}

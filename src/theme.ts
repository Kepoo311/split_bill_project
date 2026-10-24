/**
 * Design tokens — satu sumber kebenaran untuk palet, spacing, dan radius.
 *
 * Arah desain (ui-ux-pro-max "Trust & Authority" + Minimalism/Swiss,
 * diambil 2026-10-24): navy slate yang tenang + aksen gold premium yang
 * berbicara "uang/kepercayaan", bukan neon. Tetap dark-mode penuh.
 * Warna semantik dipisah tegas: gold = interaksi/aksi, emerald = uang
 * masuk/positif, orange = utang/perlu dibayar, red = destruktif.
 */
export const colors = {
  /** latar utama — navy slate gelap */
  bg: '#0F172A',
  bgAlt: '#0B1120',
  /** kartu/permukaan */
  surface: '#1E293B',
  surfaceAlt: '#16213A',
  border: '#334155',
  line: '#8FA0BC',
  text: '#F8FAFC',
  textMuted: '#CBD5E1',
  textDim: '#94A3B8',
  textSubtle: '#8FA0BC',
  textFaint: '#A8B3C5',
  /** aksen utama — premium gold (interaksi & angka penting) */
  accent: '#D4A017',
  accentSoft: 'rgba(212, 160, 23, 0.14)',
  accentBorder: 'rgba(212, 160, 23, 0.45)',
  /** teks di atas tombol terang (gold/accent) */
  ink: '#10192E',
  info: '#7DD3FC',
  infoSoft: 'rgba(125, 211, 252, 0.14)',
  success: '#34D399',
  successSoft: 'rgba(52, 211, 153, 0.14)',
  successBorder: 'rgba(52, 211, 153, 0.45)',
  warning: '#FB923C',
  warningSoft: 'rgba(251, 146, 60, 0.15)',
  danger: '#F87171',
  dangerSoft: 'rgba(248, 113, 113, 0.14)',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

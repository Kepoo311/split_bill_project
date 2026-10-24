/**
 * Design tokens — satu sumber kebenaran untuk palet, spacing, dan radius.
 * Identitas cyber (gelap + cyan) dipertahankan; aturan penerapannya
 * (prinsip app-screen: warna di data & aksi utama, permukaan flat):
 * - colors.accent untuk aksi utama & angka penting, bukan setiap border
 * - shadow/elevation hanya untuk elemen yang benar-benar melayang (modal)
 */
export const colors = {
  bg: '#070A10',
  bgAlt: '#0A0A0F',
  surface: '#0E1422',
  surfaceAlt: '#0F172A',
  border: '#1E293B',
  line: '#334155',
  text: '#F9FAFB',
  textMuted: '#94A3B8',
  textDim: '#6B7280',
  textSubtle: '#64748B',
  textFaint: '#9CA3AF',
  accent: '#00F0FF',
  accentSoft: 'rgba(0, 240, 255, 0.1)',
  accentBorder: 'rgba(0, 240, 255, 0.3)',
  info: '#38BDF8',
  infoSoft: 'rgba(56, 189, 248, 0.15)',
  success: '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.4)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239, 68, 68, 0.15)',
  ink: '#0A0A0F',
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

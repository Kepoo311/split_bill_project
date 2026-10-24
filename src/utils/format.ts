/**
 * Formatter Intl dibuat sekali di level modul. Membuat objek Intl baru di
 * setiap render (pola `x.toLocaleString('id-ID')` inline) adalah sumber jank
 * umum di Android low-end — rule js-hoist-intl.
 */
const numberId = new Intl.NumberFormat('id-ID');
const dateShortTime = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateLong = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
const monthDay = new Intl.DateTimeFormat('id-ID', { month: 'short', day: 'numeric' });

export const formatNumber = (value: number): string => numberId.format(value);

export const formatRupiah = (value: number): string => `Rp ${numberId.format(value)}`;

export const formatDateShortTime = (iso: string | number | Date): string =>
  dateShortTime.format(new Date(iso));

export const formatDateLong = (iso: string | number | Date): string =>
  dateLong.format(new Date(iso));

export const formatMonthDay = (date: Date): string => monthDay.format(date);

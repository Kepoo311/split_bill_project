import { BillHistory } from '../types';

/**
 * Statistik lokal dari riwayat tagihan. Semua derivasi murni agar mudah
 * dites; Intl dibuat sekali di level modul (js-hoist-intl).
 */

const MONTH_LABELS = Array.from(
  { length: 12 },
  (_, i) => new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(2026, i, 1)),
);

export interface MonthlySpend {
  key: string;
  label: string;
  total: number;
  count: number;
}

export interface StatsSummary {
  thisMonth: number;
  lastMonth: number;
  allTime: number;
  billCount: number;
  avgPerBill: number;
  byCategory: { category: string; total: number; count: number }[];
  /** 6 bulan terakhir, termasuk bulan kosong, urut lama → baru */
  months: MonthlySpend[];
}

export interface DaySpend {
  key: string;
  /** label pendek untuk chart, mis. "21" (tanggal) */
  label: string;
  /** tanggal lokal (mulai hari) untuk display panjang */
  date: Date;
  total: number;
  count: number;
}

/** Kunci hari lokal dengan zero-padding — aman untuk perbandingan rentang. */
export const localDayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const dayKey = localDayKey;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const DAY_LABEL = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** Ember per hari untuk N hari terakhir (termasuk hari kosong), urut lama → baru. */
export const computeDailySpend = (history: BillHistory[], now: Date, days: number): DaySpend[] => {
  const buckets: DaySpend[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset));
    buckets.push({
      key: dayKey(date),
      label: String(date.getDate()),
      date,
      total: 0,
      count: 0,
    });
  }
  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  history.forEach((bill) => {
    const bucket = byKey.get(dayKey(new Date(bill.date)));
    if (bucket) {
      bucket.total += bill.grandTotal;
      bucket.count += 1;
    }
  });
  return buckets;
};

export const formatDayLabel = (date: Date) => DAY_LABEL.format(date);

/** Total setengah-terbuka [from, to) menurut tanggal lokal. */
export const sumRange = (history: BillHistory[], from: Date, to: Date) => {
  let total = 0;
  let count = 0;
  const fromKey = dayKey(from);
  const toKey = dayKey(to);
  const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
  history.forEach((bill) => {
    const key = dayKey(new Date(bill.date));
    if (order(key, fromKey) >= 0 && order(key, toKey) < 0) {
      total += bill.grandTotal;
      count += 1;
    }
  });
  return { total, count };
};

const monthKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;

export const computeStats = (history: BillHistory[], now: Date = new Date()): StatsSummary => {
  const allTime = history.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const billCount = history.length;

  const nowKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(lastMonthDate);

  const thisMonth = history
    .filter((bill) => monthKey(new Date(bill.date)) === nowKey)
    .reduce((sum, bill) => sum + bill.grandTotal, 0);
  const lastMonth = history
    .filter((bill) => monthKey(new Date(bill.date)) === lastKey)
    .reduce((sum, bill) => sum + bill.grandTotal, 0);

  const categories = new Map<string, { total: number; count: number }>();
  history.forEach((bill) => {
    const category = bill.category || 'Tanpa Kategori';
    const entry = categories.get(category) ?? { total: 0, count: 0 };
    entry.total += bill.grandTotal;
    entry.count += 1;
    categories.set(category, entry);
  });
  const byCategory = Array.from(categories.entries())
    .map(([category, entry]) => ({ category, ...entry }))
    .sort((a, b) => b.total - a.total);

  const months: MonthlySpend[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const key = monthKey(date);
    const inMonth = history.filter((bill) => monthKey(new Date(bill.date)) === key);
    months.push({
      key,
      label: MONTH_LABELS[date.getMonth()],
      total: inMonth.reduce((sum, bill) => sum + bill.grandTotal, 0),
      count: inMonth.length,
    });
  }

  return {
    thisMonth,
    lastMonth,
    allTime,
    billCount,
    avgPerBill: billCount > 0 ? Math.round(allTime / billCount) : 0,
    byCategory,
    months,
  };
};

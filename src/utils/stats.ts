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

const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;

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

/**
 * Test statistik lokal. Jalankan: npm test
 */
import { computeStats } from '../src/utils/stats';
import type { BillHistory } from '../src/types';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};

const bill = (id: string, iso: string, grandTotal: number, category?: string): BillHistory =>
  ({
    id,
    title: id,
    date: iso,
    grandTotal,
    items: [],
    members: [],
    results: [],
    tax: 0,
    service: 0,
    discount: 0,
    ...(category ? { category } : {}),
  }) as BillHistory;

const NOW = new Date(2026, 9, 24); // Okt 2026

console.log('\n[1] Ringkasan dasar + tren 6 bulan');
const history1 = [
  bill('a', '2026-10-02T10:00:00Z', 50000, 'Nongkrong'),
  bill('b', '2026-10-20T10:00:00Z', 30000, 'Nongkrong'),
  bill('c', '2026-09-15T10:00:00Z', 80000, 'Makanan'),
  bill('d', '2026-07-01T10:00:00Z', 20000),
  bill('e', '2025-12-31T10:00:00Z', 100000, 'Belanja'),
];
const s1 = computeStats(history1, NOW);
check('bulan ini (2 struk Okt)', s1.thisMonth, 80000);
check('bulan lalu (Sep)', s1.lastMonth, 80000);
check('all time', s1.allTime, 280000);
check('rata-rata per tagihan', s1.avgPerBill, 56000);
check('jumlah bulan tren = 6', s1.months.length, 6);
check('urutan label Mei→Okt', s1.months.map((m) => m.label), ['Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt']);
check('total Okt di bulan terakhir', s1.months[5].total, 80000);
check('bulan kosong (Jun) = 0', s1.months[1].total, 0);
check('jumlah item bulan Okt', s1.months[5].count, 2);

console.log('\n[2] Kategori terurut & default');
const s2 = computeStats(history1, NOW);
check('kategori terbesar duluan', s2.byCategory.map((c) => c.category), ['Belanja', 'Nongkrong', 'Makanan', 'Tanpa Kategori']);
check('total Nongkrong', s2.byCategory.find((c) => c.category === 'Nongkrong')?.total, 80000);
check('count Makanan', s2.byCategory.find((c) => c.category === 'Makanan')?.count, 1);

console.log('\n[3] Riwayat kosong aman');
const s3 = computeStats([], NOW);
check('semua nol', [s3.thisMonth, s3.allTime, s3.avgPerBill, s3.billCount], [0, 0, 0, 0]);
check('kategori kosong', s3.byCategory, []);
check('tren tetap 6 bulan kosong', s3.months.every((m) => m.total === 0), true);

console.log('\n[4] Tahun beda, bulan sama (Jul 2025 vs Jul 2026) tidak tercampur');
const history4 = [bill('x', '2025-07-10T10:00:00Z', 70000), bill('y', '2026-07-10T10:00:00Z', 10000)];
const s4 = computeStats(history4, NOW);
check('Jul 2026 hanya 10rb', s4.months[2].total, 10000);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test stats gagal`);

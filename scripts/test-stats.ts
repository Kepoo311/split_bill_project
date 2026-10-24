/**
 * Test statistik lokal. Jalankan: npm test
 */
import { computeStats, computeDailySpend, sumRange, formatDayLabel } from '../src/utils/stats';
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

console.log('\n[5] Ember per hari: 7 hari termasuk kosong + label tanggal');
const d5 = computeDailySpend(history1, NOW, 7);
check('jumlah ember 7', d5.length, 7);
check('label = tanggal', d5.map((d) => d.label), ['18', '19', '20', '21', '22', '23', '24']);
check('hari ini (2 struk Okt 2 & 20... cek ember tgl 20)', d5.find((d) => d.label === '20')?.total, 30000);
check('hari kosong = 0', d5.find((d) => d.label === '23')?.total, 0);
check('tgl 2 Okt di luar jendela 7 hari', d5.find((d) => d.label === '2'), undefined);
const d5b = computeDailySpend(history1, NOW, 30);
check('jendela 30 hari menangkap tgl 2', d5b.find((d) => d.label === '2')?.total, 50000);

console.log('\n[6] sumRange setengah-terbuka [from, to)');
const today = new Date(2026, 9, 24);
const weekAgo = new Date(2026, 9, 17);
const r6 = sumRange(history1, weekAgo, new Date(2026, 9, 25));
check('7 hari: hanya struk tgl 20 (30rb) — tgl 2 di luar jendela', r6, { total: 30000, count: 1 });
const r6b = sumRange(history1, today, new Date(2026, 9, 25));
check('hari ini (24 Okt) kosong — struk terakhir tgl 20', r6b, { total: 0, count: 0 });
check('rentang tgl 2 saja menangkap 50rb', sumRange(history1, new Date(2026, 9, 2), new Date(2026, 9, 3)), { total: 50000, count: 1 });
check('batas to eksklusif', sumRange(history1, new Date(2026, 9, 20), new Date(2026, 9, 21)), { total: 30000, count: 1 });

console.log('\n[7] formatDayLabel Indonesia');
check('label hari', formatDayLabel(new Date(2026, 9, 24)), 'Sab, 24 Okt');

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test stats gagal`);

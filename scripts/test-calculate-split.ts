/**
 * Test calculateSplit — logika pembagian uang (paling kritis di app).
 * Invariant utama: jumlah totalBayar semua orang PERSIS grandTotal.
 * Jalankan: npm test (atau npx tsx scripts/test-calculate-split.ts)
 */
import { calculateSplit } from '../src/utils/calculateSplit';
import type { BillItem, Member } from '../src/types';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};

const members: Member[] = [
  { id: 'a', name: 'Andi' },
  { id: 'b', name: 'Budi' },
  { id: 'c', name: 'Citra' },
];
const item = (id: string, nama_item: string, harga: number, assignedTo: string[] = []): BillItem => ({
  id,
  nama_item,
  harga,
  assignedTo,
});

console.log('\n[1] Pembagian dasar + pajak persen + service (jangkar manual)');
const r1 = calculateSplit(
  [
    item('1', 'Kopi', 30000, ['a']),
    item('2', 'Teh', 20000, ['b']),
    item('3', 'Gorengan', 10000), // tanpa pemilik → semua
  ],
  members,
  { type: 'percent', value: 10 },
  2000,
);
check('subtotal', r1.subtotal, 60000);
check('grandTotal', r1.grandTotal, 68000);
check('totalBayar per orang', r1.results.map((r) => r.totalBayar), [37778, 26444, 3778]);
check('jumlah totalBayar = grandTotal', r1.results.reduce((s, r) => s + r.totalBayar, 0), r1.grandTotal);
check('subtotal per orang (dibulatkan)', r1.results.map((r) => r.subtotal), [33333, 23333, 3333]);
check('pajak per orang', r1.results.map((r) => r.taxShare), [3333, 2333, 333]);

console.log('\n[2] Invariant pembulatan: jumlah = grandTotal di banyak kombinasi');
const cases: Array<[number[], string, number, number, number]> = [
  [[10000], 'nominal', 1111, 0, 0],
  [[33333], 'percent', 11, 1200, 500],
  [[7001, 7001, 7001], 'percent', 10, 0, 0],
  [[123456, 789, 10001], 'percent', 10, 3500, 12500],
  [[9999, 1], 'nominal', 999, 1, 5000],
  [[15000, 15000, 15000], 'percent', 10, 10, 7],
];
cases.forEach(([prices, taxType, taxVal, svc, disc], i) => {
  const r = calculateSplit(
    prices.map((p, j) => item(`${i}-${j}`, `I${j}`, p, [members[j % 3].id])),
    members,
    { type: taxType as 'percent' | 'nominal', value: taxVal },
    svc,
    disc,
  );
  check(
    `kasus ${i + 1}: jumlah = grandTotal (${r.grandTotal})`,
    r.results.reduce((s, x) => s + x.totalBayar, 0),
    r.grandTotal,
  );
  check(`kasus ${i + 1}: tidak ada yang negatif`, r.results.every((x) => x.totalBayar >= 0), true);
});

console.log('\n[3] Item di-share ke beberapa orang → dibagi rata ke pemiliknya');
const r3 = calculateSplit(
  [item('1', 'Pizza', 30000, ['a', 'b'])],
  members,
  { type: 'nominal', value: 0 },
  0,
);
check('subtotal per orang', r3.results.map((r) => r.subtotal), [15000, 15000, 0]);
check('Citra tidak bayar', r3.results[2].totalBayar, 0);

console.log('\n[4] assignedTo berisi ID anggota palsu → diabaikan, jatuh ke semua');
const r4 = calculateSplit(
  [item('1', 'Sate', 9000, ['hantu', 'a'])],
  members,
  { type: 'nominal', value: 0 },
  0,
);
// 'hantu' bukan anggota → owners efektif ['a'] → Andi sendirian
check('hanya Andi yang bayar', r4.results.map((r) => r.totalBayar), [9000, 0, 0]);

console.log('\n[5] Pajak nominal diproporsikan, bukan dibagi rata');
const r5 = calculateSplit(
  [item('1', 'A', 90000, ['a']), item('2', 'B', 10000, ['b'])],
  members,
  { type: 'nominal', value: 10000 },
  0,
);
check('pajak Andi 90%', r5.results[0].taxShare, 9000);
check('pajak Budi 10%', r5.results[1].taxShare, 1000);
check('grandTotal', r5.grandTotal, 110000);

console.log('\n[6] Diskon: sebagian & yang melebihi total tagihan');
const r6a = calculateSplit(
  [item('1', 'A', 50000, ['a']), item('2', 'B', 50000, ['b'])],
  members,
  { type: 'nominal', value: 0 },
  0,
  60000,
);
check('diskon 60rb dari 100rb: grandTotal 40rb', r6a.grandTotal, 40000);
check('diskon proporsional', r6a.results.map((r) => r.totalBayar), [20000, 20000, 0]);
const r6b = calculateSplit(
  [item('1', 'A', 50000, ['a']), item('2', 'B', 50000, ['b'])],
  members,
  { type: 'nominal', value: 0 },
  0,
  150000,
);
check('diskon 150rb: grandTotal di-clamp 0', r6b.grandTotal, 0);
check('semua orang 0', r6b.results.map((r) => r.totalBayar), [0, 0, 0]);

console.log('\n[7] Pembagian serakah: 10.000 untuk 3 orang');
const r7 = calculateSplit([item('1', 'Cilok', 10000)], members, { type: 'nominal', value: 0 }, 0);
check('jumlah = 10000', r7.results.reduce((s, r) => s + r.totalBayar, 0), 10000);
check('tidak ada yang 0 rupiah aneh', r7.results.every((r) => r.totalBayar >= 3332), true);

console.log('\n[8] Tanpa item & tanpa anggota — tidak crash');
const r8a = calculateSplit([], members, { type: 'percent', value: 10 }, 5000);
check('hasil 3 orang', r8a.results.length, 3);
check('grandTotal = service', r8a.grandTotal, 5000);
check('service dibagi rata + tutup', r8a.results.reduce((s, r) => s + r.totalBayar, 0), 5000);
const r8b = calculateSplit([item('1', 'X', 5000)], [], { type: 'nominal', value: 0 }, 0);
check('tanpa anggota: results kosong', r8b.results, []);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test calculateSplit gagal`);

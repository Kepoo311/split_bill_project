/**
 * Test saldo grup patungan. Invariant: jumlah semua saldo = 0 (selama semua
 * struk mencatat penalang). Jalankan: npm test
 */
import { computeGroupTotals, mergeGroupMembers, suggestSettlements } from '../src/utils/groupBalance';
import type { BillGroup, BillHistory, Member } from '../src/types';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};

const member = (id: string, name: string): Member => ({ id, name });
const sumBalances = (t: { balances: { balance: number }[] }) =>
  t.balances.reduce((s, b) => s + b.balance, 0);

const bill = (id: string, grandTotal: number, shares: Array<[string, number]>): BillHistory =>
  ({
    id,
    title: `Bill ${id}`,
    date: '2026-10-24T10:00:00Z',
    grandTotal,
    items: [],
    members: shares.map(([name], i) => member(`${id}-m${i}`, name)),
    results: shares.map(([name, amount], i) => ({
      memberId: `${id}-m${i}`,
      name,
      subtotal: amount,
      taxShare: 0,
      serviceShare: 0,
      discountShare: 0,
      totalBayar: amount,
    })),
    tax: 0,
    service: 0,
    discount: 0,
  }) as BillHistory;

console.log('\n[1] Satu struk: penalang dapat kredit, pemakan berutang');
const group1: BillGroup = {
  id: 'g1',
  name: 'Tim Futsal',
  createdAt: '2026-10-24T09:00:00Z',
  members: [member('a', 'Andi'), member('b', 'Budi'), member('c', 'Citra')],
  entries: [{ billId: 'b1', payerId: 'a', addedAt: '2026-10-24T10:00:00Z' }],
  settlements: {},
};
const bills1 = new Map<string, BillHistory>([
  ['b1', bill('b1', 100000, [['Andi', 40000], ['Budi', 35000], ['Citra', 25000]])],
]);
const t1 = computeGroupTotals(group1, bills1);
check('saldo Andi (nalangin 100rb, makan 40rb)', t1.balances.find((b) => b.name === 'Andi')?.balance, 60000);
check('saldo Budi', t1.balances.find((b) => b.name === 'Budi')?.balance, -35000);
check('saldo Citra', t1.balances.find((b) => b.name === 'Citra')?.balance, -25000);
check('jumlah semua saldo = 0', sumBalances(t1), 0);
check('total belanja grup', t1.totalSpent, 100000);
check('urutan: kredit terbesar duluan', t1.balances.map((b) => b.name), ['Andi', 'Citra', 'Budi']);

console.log('\n[2] Multi struk: saldo terakumulasi & tetap berjumlah 0');
const group2: BillGroup = {
  ...group1,
  entries: [
    { billId: 'b1', payerId: 'a', addedAt: '2026-10-24T10:00:00Z' },
    { billId: 'b2', payerId: 'b', addedAt: '2026-10-24T12:00:00Z' },
  ],
};
const bills2 = new Map(bills1);
bills2.set('b2', bill('b2', 60000, [['Budi', 20000], ['Citra', 40000]]));
const t2 = computeGroupTotals(group2, bills2);
check('Andi tetap +60rb', t2.balances.find((b) => b.name === 'Andi')?.balance, 60000);
check('Budi (nalangin 60, makan 55)', t2.balances.find((b) => b.name === 'Budi')?.balance, 5000);
check('Citra (65 total)', t2.balances.find((b) => b.name === 'Citra')?.balance, -65000);
check('jumlah = 0', sumBalances(t2), 0);
check('total 2 struk', t2.totalSpent, 160000);

console.log('\n[3] Merge anggota beda struk pakai NAMA (bukan id)');
const bill3 = bill('b3', 90000, [['andi', 30000], ['Dewi', 30000], ['citra', 30000]]);
const merged = mergeGroupMembers(group1.members, bill3.members);
check('nama sama beda kapital digabung', merged.some((m) => m.name === 'Andi') && !merged.some((m) => m.name === 'andi'), true);
check('anggota baru (Dewi) ditambahkan', merged.some((m) => m.name === 'Dewi'), true);
check('jumlah anggota', merged.length, 4);
const group3: BillGroup = {
  ...group1,
  members: merged,
  entries: [
    { billId: 'b1', payerId: 'a', addedAt: 'x' },
    { billId: 'b3', payerId: 'c', addedAt: 'x' },
  ],
};
const bills3 = new Map(bills1);
bills3.set('b3', bill3);
const t3 = computeGroupTotals(group3, bills3);
// Citra nalangin 90rb, makan 25rb + 30rb = 55rb → +35rb
check('Citra: 90 - 55', t3.balances.find((b) => b.name === 'Citra')?.balance, 35000);
check('"andi" kecil di-mapping ke anggota grup', t3.balances.find((b) => b.name === 'andi') === undefined, true);
check('jumlah = 0', sumBalances(t3), 0);

console.log('\n[4] Struk tanpa pencatat penalang tidak masuk netting, tapi tetap dihitung belanja');
const group4: BillGroup = { ...group1, entries: [{ billId: 'b1', payerId: null, addedAt: 'x' }] };
const t4 = computeGroupTotals(group4, bills1);
check('semua berutang sebagiannya', t4.balances.map((b) => b.balance).sort((a, b) => a - b), [-40000, -35000, -25000]);
check('penanda struk tanpa penalang', t4.unattributedCount, 1);
check('total tetap terhitung', t4.totalSpent, 100000);

console.log('\n[5] Struk terhapus dari riwayat → entri dilewati tanpa crash');
const t5 = computeGroupTotals(group1, new Map());
check('saldo netral semua', t5.balances.every((b) => b.balance === 0), true);
check('total 0', t5.totalSpent, 0);

console.log('\n[6] Netting: saran transfer minimum');
const mb = (id: string, name: string, balance: number) => ({ memberId: id, name, balance });
const s6 = suggestSettlements([mb('a', 'Andi', 60000), mb('b', 'Budi', -35000), mb('c', 'Citra', -25000)]);
check('2 transfer (n-1)', s6.length, 2);
check('Budi → Andi 35rb', s6.some((t) => t.fromName === 'Budi' && t.toName === 'Andi' && t.amount === 35000), true);
check('Citra → Andi 25rb', s6.some((t) => t.fromName === 'Citra' && t.toName === 'Andi' && t.amount === 25000), true);
check('jumlah transfer = total utang', s6.reduce((s, t) => s + t.amount, 0), 60000);

console.log('\n[7] Netting: debitur membayar ke >1 penerima (belah arah)');
const s7 = suggestSettlements([mb('a', 'A', 50000), mb('b', 'B', 10000), mb('c', 'C', -40000), mb('d', 'D', -20000)]);
check('jumlah transfer efisien (3 = n-1)', s7.length, 3);
check('C → A 40rb', s7.some((t) => t.fromName === 'C' && t.toName === 'A' && t.amount === 40000), true);
check('D → A 10rb', s7.some((t) => t.fromName === 'D' && t.toName === 'A' && t.amount === 10000), true);
check('D → B 10rb', s7.some((t) => t.fromName === 'D' && t.toName === 'B' && t.amount === 10000), true);
check('total 60rb', s7.reduce((s, t) => s + t.amount, 0), 60000);

console.log('\n[8] Netting: kasus user (Saya/Zaqi berutang ke Ripa)');
const s8 = suggestSettlements([mb('ripa', 'Ripa', 35000), mb('saya', 'Saya', -20000), mb('zaqi', 'Zaqi', -15000)]);
check('Saya bayar 20rb ke Ripa', s8.some((t) => t.fromName === 'Saya' && t.toName === 'Ripa' && t.amount === 20000), true);
check('Zaqi bayar 15rb ke Ripa', s8.some((t) => t.fromName === 'Zaqi' && t.toName === 'Ripa' && t.amount === 15000), true);

console.log('\n[9] Netting: semua impas / kosong → tanpa transfer');
check('semua 0', suggestSettlements([mb('a', 'A', 0), mb('b', 'B', 0)]), []);
check('array kosong', suggestSettlements([]), []);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test group balance gagal`);

/**
 * Test pencarian & filter riwayat. Jalankan: npm test
 */
import { filterHistory } from '../src/utils/historyFilter';
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

const bill = (id: string, title: string, category: string | undefined, items: string[], members: string[]): BillHistory =>
  ({
    id,
    title,
    date: '2026-10-24T10:00:00Z',
    grandTotal: 50000,
    items: items.map((nama_item, i) => ({ id: `${id}-i${i}`, nama_item, harga: 25000, assignedTo: [] })),
    members: members.map((name, i) => ({ id: `${id}-m${i}`, name })),
    results: [],
    tax: 0,
    service: 0,
    discount: 0,
    ...(category ? { category } : {}),
  }) as BillHistory;

const data = [
  bill('a', 'Makan Tim Futsal', 'Makanan', ['Nasi Goreng', 'Es Teh'], ['Saya', 'Ripa', 'Zaqi']),
  bill('b', 'Kopi Subuh', 'Nongkrong', ['ES KOPI LEMON'], ['Saya']),
  bill('c', 'Belanja Kosan', 'Belanja', ['Indomie Goreng'], ['Saya', 'Dewi']),
];

console.log('\n[1] Query kosong + kategori Semua = semua tampil');
check('kasus 1', filterHistory(data, '', 'Semua').map((b) => b.id), ['a', 'b', 'c']);

console.log('\n[2] Cari judul (case-insensitive)');
check('kasus 2', filterHistory(data, 'futsal', 'Semua').map((b) => b.id), ['a']);
check('kasus 3', filterHistory(data, 'KOPI SUBuh', 'Semua').map((b) => b.id), ['b']);

console.log('\n[3] Cari nama item (termasuk kapital aneh OCR)');
check('kasus 4', filterHistory(data, 'es kopi', 'Semua').map((b) => b.id), ['b']);
check('kasus 5', filterHistory(data, 'indomie', 'Semua').map((b) => b.id), ['c']);

console.log('\n[4] Cari nama anggota');
check('kasus 6', filterHistory(data, 'ripa', 'Semua').map((b) => b.id), ['a']);
check('kasus 7', filterHistory(data, 'dewi', 'Semua').map((b) => b.id), ['c']);
check('kasus 8', filterHistory(data, 'saya', 'Semua').map((b) => b.id), ['a', 'b', 'c']);

console.log('\n[5] Gabungan dengan filter kategori');
check('kasus 9', filterHistory(data, 'kopi', 'Nongkrong').map((b) => b.id), ['b']);
check('kasus 10', filterHistory(data, 'kopi', 'Belanja').map((b) => b.id), []);
check('kasus 11', filterHistory(data, '', 'Makanan').map((b) => b.id), ['a']);

console.log('\n[6] Kategori default saat bill tanpa kategori = Makanan');
const noCat = [bill('x', 'Struk Polos', undefined, ['Sate'], ['Saya'])];
check('kasus 12', filterHistory(noCat, '', 'Makanan').map((b) => b.id), ['x']);
check('kasus 13', filterHistory(noCat, '', 'Nongkrong').map((b) => b.id), []);

console.log('\n[7] Query kotor: spasi berlebih & tidak ada hasil');
check('kasus 14', filterHistory(data, '   futsal  ', 'Semua').map((b) => b.id), ['a']);
check('kasus 15', filterHistory(data, 'pizza', 'Semua'), []);
check('kasus 16', filterHistory([], 'apapun', 'Semua'), []);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test history filter gagal`);

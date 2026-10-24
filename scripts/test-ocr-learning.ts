/**
 * Test fitur belajar OCR (cache koreksi + memori merchant).
 * Jalankan: npm test
 */
import { buildLearningIndex, applyLearning } from '../src/utils/ocrLearning';
import { parseReceiptText } from '../src/utils/ocrParser';
import type { BillItem, LearningData } from '../src/types';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};

const entry = (rawOcrText: string, corrected: BillItem[], createdAt: string): LearningData => ({
  id: `e-${createdAt}`,
  rawOcrText,
  correctedItems: corrected,
  createdAt,
});
const item = (nama_item: string, harga: number): BillItem => ({
  id: `${nama_item}-${harga}`,
  nama_item,
  harga,
  assignedTo: [],
});
const names = (items: BillItem[]) => items.map((i) => i.nama_item);

// Struk FASTE untuk membentuk profil
const FASTE_LAMA = `
Faste Coffee Rajabasa
No : FCR01202610010033
Tanggal : 01-10-2026 13:23
Mode : DINE IN
Kasir : KASIR
MOCHACClNO REGULAR
1x @15.455 15.455
ES KOPI LEMON
1x @15.000 15.000
Subtotal : 30.455
Service Charge & : 3.046
TAX
Grand Total : 33.500
`;

const FASTE_BARU = `
Faste Coffee Rajabasa
No : FCR01202610220099
Tanggal : 22-10-2026 19:02
Mode : DINE IN
Kasir : KASIR
MOCHACClNO REGULAR
1x @15.455 15.455
ES KOP1 LEMON
1x @15.000 15.000
AMERICANO REGULAR
1x @17.273 17.273
Subtotal : 47.728
Grand Total : 52.500
`;

console.log('\n[1] Cache koreksi (L1): struk yang sama di-scan ulang');
const idx1 = buildLearningIndex([
  entry('CAREN\n1x 14.000 14.000\nTotal 14.000', [item('Kopi Caren', 14000)], '2026-10-01T10:00:00Z'),
]);
const out1 = applyLearning([], 'caren\n1x  14.000   14.000\nTOTAL 14.000', idx1);
check('cache hit', out1.cacheHit, true);
check('item dari koreksi', names(out1.items), ['Kopi Caren']);
check('id segar per scan', out1.items[0].id !== 'Kopi Caren-14000', true);

console.log('\n[2] Memori merchant (L2): rename + kamus fuzzy');
// Koreksi lama: user benerin "MOCHACClNO" (salah baca OCR) jadi "MOCHACCINO"
const idx2 = buildLearningIndex([
  entry(
    FASTE_LAMA,
    [item('MOCHACCINO Regular', 15455), item('ES Kopi Lemon', 15000)],
    '2026-10-01T10:00:00Z',
  ),
]);
const parsedBaru = parseReceiptText(FASTE_BARU);
check(
  'parser menghasilkan nama salah-baca',
  parsedBaru.some((i) => i.nama_item === 'MOCHACClNO Regular'),
  true,
);
const out2 = applyLearning(parsedBaru, FASTE_BARU, idx2);
check('rename diterapkan (MOCHACClNO → MOCHACCINO)', names(out2.items).includes('MOCHACCINO Regular'), true);
check('kamus fuzzy (ES KOP1 → ES Kopi Lemon)', names(out2.items).includes('ES Kopi Lemon'), true);
check('item tanpa koreksi tetap utuh', names(out2.items).includes('AMERICANO Regular'), true);
check('jumlah item tetap 3', out2.items.length, 3);
check('jumlah fix tercatat', out2.fixes, 2);
check('merchant terdeteksi', out2.merchant, 'Faste Coffee');

console.log('\n[3] Baris sampah: baru ditekan setelah kejadian ke-2');
const WARUNG_1 = 'WARUNG BU SARI\n15.000\nNasi Goreng 20.000\nTotal 35.000';
const WARUNG_2 = 'WARUNG BU SARI\n12.000\nMie Ayam 18.000\nTotal 30.000';
const WARUNG_3 = 'WARUNG BU SARI\n10.000\nEs Teh 5.000\nTotal 15.000';
const idx3a = buildLearningIndex([entry(WARUNG_1, [item('Nasi Goreng', 20000)], '2026-10-01T10:00:00Z')]);
const parsedW3 = parseReceiptText(WARUNG_3);
check('parser salah tangkap nama warung jadi item', names(parsedW3).includes('WARUNG BU SARI'), true);
const out3a = applyLearning(parsedW3, WARUNG_3, idx3a);
check('kejadian tunggal: belum ditekan', names(out3a.items).includes('WARUNG BU SARI'), true);
const idx3b = buildLearningIndex([
  entry(WARUNG_1, [item('Nasi Goreng', 20000)], '2026-10-01T10:00:00Z'),
  entry(WARUNG_2, [item('Mie Ayam', 18000)], '2026-10-05T10:00:00Z'),
]);
const out3b = applyLearning(parsedW3, WARUNG_3, idx3b);
check('kejadian ke-2: baris sampah ditekan', names(out3b.items).includes('WARUNG BU SARI'), false);
check('item asli tetap ada', names(out3b.items).includes('Es Teh'), true);

console.log('\n[4] Isolasi antar merchant: rename FASTE tidak bocor ke Indomaret');
const INDOMARET = `
Indomaret
S/ROTI KRIM KEJU 72G 4 4500 18.000
CIMORY MIX BERRY 22S 1 8500 8.500
Total 4 26.500
`;
const parsedInd = parseReceiptText(INDOMARET);
const idx4 = buildLearningIndex([
  entry(FASTE_LAMA, [item('MOCHACCINO Regular', 15455), item('ES Kopi Lemon', 15000)], '2026-10-01T10:00:00Z'),
]);
const out4 = applyLearning(parsedInd, INDOMARET, idx4);
check('merchant lain tidak tersentuh', out4.fixes, 0);
check('items tetap sama', out4.items, parsedInd);

console.log('\n[5] Tanpa data belajar: tembus apa adanya');
const idx5 = buildLearningIndex([]);
const out5 = applyLearning(parsedBaru, FASTE_BARU, idx5);
check('cacheHit false', out5.cacheHit, false);
check('passthrough', out5.items, parsedBaru);

console.log('\n[6] Item manual yang ditambahkan user tidak dianggap sinyal apa pun');
// User menambah item baru yang tidak ada di struk → bukan rename, bukan junk
const idx6 = buildLearningIndex([
  entry('CAREN\n1x 14.000 14.000\nTotal 14.000', [item('CAREN', 14000), item('Parkir', 3000)], '2026-10-01T10:00:00Z'),
]);
check('index dibangun tanpa crash', idx6.merchants.size >= 1, true);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test learning gagal`);

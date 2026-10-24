/**
 * Test parser OCR dengan data dummy.
 * Menjalankan parser dalam simulasi environment Hermes (React Native):
 * crypto.getRandomValues tersedia, crypto.randomUUID TIDAK tersedia.
 *
 * Jalankan: npx tsx scripts/test-ocr-parser.ts
 */
import { parseReceiptText, detectReceiptExtras } from '../src/utils/ocrParser';
import { processReceiptOCR } from '../src/utils/ocrProcessor';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};

const sum = (items: { harga: number }[]) => items.reduce((total, item) => total + item.harga, 0);
const names = (items: { nama_item: string; harga: number }[]) =>
  items.map((item) => `${item.nama_item}:${item.harga}`);

// ---------------------------------------------------------------------------
// Simulasi Hermes: hanya getRandomValues, tanpa randomUUID (seperti di RN 0.86).
// Kualitas random tidak penting di sini — yang dites adalah bentuk API-nya.
// ---------------------------------------------------------------------------
const hermesCrypto = {
  getRandomValues: (array: Uint8Array) => {
    for (let i = 0; i < array.length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};
Object.defineProperty(globalThis, 'crypto', {
  value: hermesCrypto,
  configurable: true,
  writable: true,
});

// ---------------------------------------------------------------------------
// Data dummy — meniru output processReceiptOCR (baris visual, kiri ke kanan)
// ---------------------------------------------------------------------------
const CAFE_NUMBERED = `
STOPONE CAFE UNILA RAJABASA
Jl. Prof. Dr. Sumantri Brojonegoro, Gedong Meneng
Bandar Lampung, 35145
FCR #00KASIR01
1/10/2026 19:22
Kasir: Andi
Dine In
1. Es Kopi Lemon 1x @ 15.000 15.000
2. Roti Bakar Cokelat 1x @ 18.000 18.000
3. Kentang Goreng 2x @ 20.000 40.000
Sub Total 73.000
Service 3.650
Pajak 7.300
Total 83.950
Tunai 100.000
Kembali 16.050
`;

const NUMBERED_SPLIT_ROWS = `
STRUK PESANAN
No. 0045
1. Nasi Goreng Spesial
2. Es Jeruk
3. Teh Tarik
1 X Rp 22.000 Rp 22.000
1 X Rp 12.000 Rp 12.000
2 X Rp 15.000 Rp 30.000
Sub Total 64.000
Tunai 70.000
Kembali 6.000
`;

const RETAIL_ROWS = `
SWALAYAN MAKMUR
Jl. Z.A. Pagar Alam No. 10
1/10/2026 20:15
Kasir: Rina
Indomie Goreng 2 3.500 7.000
Teh Pucuk 500ML 3 4.000 12.000
Chitato 68G 1 9.000 9.000
Total 4 28.000
Tunai 28.000
`;

const WARUNG_SIMPLE = `
WARUNG BU SARI
Nasi Goreng 15.000
Ayam Geprek 18.000
Es Teh 5.000
Kopi Susu 2 6.000 12.000
Total 50.000
`;

// Layout kolom POS yang menyatu: kedua qty, lalu kedua harga satuan, lalu kedua total
const RETAIL_MERGED_PAIR =
  'Roti Tawar 500G Roti Tawar 500G 2 1 15.000 15.000 30.000 15.000';

// ---------------------------------------------------------------------------
// 1. Bukti akar masalah: parser harus tetap jalan tanpa crypto.randomUUID
// ---------------------------------------------------------------------------
console.log('\n[1] Parser di bawah simulasi Hermes (tanpa crypto.randomUUID)');
try {
  const cafeItems = parseReceiptText(CAFE_NUMBERED);
  check('cafe: jumlah item', cafeItems.length, 4);
  check('cafe: item + harga', names(cafeItems), [
    'Es Kopi Lemon:15000',
    'Roti Bakar Cokelat:18000',
    'Kentang Goreng:20000',
    'Kentang Goreng:20000',
  ]);
  check('cafe: subtotal', sum(cafeItems), 73000);

  const extras = detectReceiptExtras(CAFE_NUMBERED, sum(cafeItems));
  check('cafe: pajak nominal', extras.taxNominal, 7300);
  check('cafe: service charge', extras.serviceCharge, 3650);
  check('cafe: diskon', extras.discount, 0);
} catch (error) {
  failures += 1;
  console.log(
    `FAIL  parser melempar error di Hermes: ${error instanceof Error ? error.message : String(error)}`,
  );
}

// ---------------------------------------------------------------------------
// 2. Format struk bernomor dengan baris harga terpisah
// ---------------------------------------------------------------------------
console.log('\n[2] Struk bernomor, nama dan harga di baris terpisah');
const splitItems = parseReceiptText(NUMBERED_SPLIT_ROWS);
check('split: jumlah item', splitItems.length, 4);
check('split: item + harga', names(splitItems), [
  'Nasi Goreng Spesial:22000',
  'Es Jeruk:12000',
  'Teh Tarik:15000',
  'Teh Tarik:15000',
]);

// ---------------------------------------------------------------------------
// 3. Struk retail: nama qty harga-satuan total
// ---------------------------------------------------------------------------
console.log('\n[3] Struk retail (kolom qty, harga satuan, total)');
const retailItems = parseReceiptText(RETAIL_ROWS);
check('retail: jumlah item', retailItems.length, 6);
check('retail: subtotal', sum(retailItems), 28000);
check(
  'retail: harga satuan Teh Pucuk',
  retailItems.filter((i) => i.nama_item.startsWith('Teh Pucuk')).map((i) => i.harga),
  [4000, 4000, 4000],
);

// ---------------------------------------------------------------------------
// 4. Struk warung sederhana
// ---------------------------------------------------------------------------
console.log('\n[4] Struk warung sederhana');
const warungItems = parseReceiptText(WARUNG_SIMPLE);
check('warung: jumlah item', warungItems.length, 5);
check('warung: subtotal', sum(warungItems), 50000);
check('warung: extras nol', detectReceiptExtras(WARUNG_SIMPLE, 50000), {
  taxMode: 'nominal',
  taxPercent: 0,
  taxNominal: 0,
  serviceCharge: 0,
  discount: 0,
});

// ---------------------------------------------------------------------------
// 5. Baris retail hasil gabungan dua produk (kolom ganda)
// ---------------------------------------------------------------------------
console.log('\n[5] Dua produk menyatu dalam satu baris OCR');
const mergedItems = parseReceiptText(RETAIL_MERGED_PAIR);
check('merged: jumlah item', mergedItems.length, 3);
check('merged: nama terpisah per produk', mergedItems.map((i) => i.nama_item), [
  'Roti Tawar 500G',
  'Roti Tawar 500G',
  'Roti Tawar 500G',
]);
check('merged: semua harga satuan', mergedItems.every((i) => i.harga === 15000), true);

// ---------------------------------------------------------------------------
// 6. Rekonstruksi baris visual dari blok ML Kit (kolom kiri/kanan)
// ---------------------------------------------------------------------------
console.log('\n[6] processReceiptOCR: gabung kolom kiri-kanan jadi satu baris');
const ocrResult = {
  text: 'Nasi Goreng 15.000 Es Teh 5.000',
  blocks: [
    {
      text: 'Nasi Goreng 15.000',
      lines: [
        { text: 'Nasi Goreng', frame: { left: 10, top: 100, width: 120, height: 14 } },
        { text: '15.000', frame: { left: 220, top: 100, width: 60, height: 14 } },
      ],
    },
    {
      text: 'Es Teh 5.000',
      lines: [
        { text: 'Es Teh', frame: { left: 10, top: 130, width: 80, height: 14 } },
        { text: '5.000', frame: { left: 220, top: 132, width: 60, height: 14 } },
      ],
    },
  ],
} as unknown as Parameters<typeof processReceiptOCR>[0];

const rows = processReceiptOCR(ocrResult);
check('ocr: baris tersusun', rows, ['Nasi Goreng 15.000', 'Es Teh 5.000']);
const ocrItems = parseReceiptText(rows.join('\n'));
check('ocr: item hasil rekonstruksi', names(ocrItems), ['Nasi Goreng:15000', 'Es Teh:5000']);

// ---------------------------------------------------------------------------
// Hasil akhir
// ---------------------------------------------------------------------------
console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test parser gagal`);

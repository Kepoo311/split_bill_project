/**
 * Test parser OCR dengan transkrip struk ASLI (8 foto WhatsApp, Okt 2026).
 * Transkrip diperoleh dari pembacaan visual foto — meniru output baris
 * processReceiptOCR. Jalankan: npx tsx scripts/test-real-receipts.ts
 */
import { parseReceiptText, detectReceiptExtras } from '../src/utils/ocrParser';

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures += 1;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}` +
      (pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`),
  );
};
const sum = (items: { harga: number }[]) => items.reduce((t, i) => t + i.harga, 0);
const names = (items: { nama_item: string }[]) => items.map((i) => i.nama_item);

// --- 1. Mie Ayam Jumbo Kemiling (24 Okt 2026) ---
const MIE_JUMBO = `
Mie Jumbo
Mie Ayam Jumbo Kemiling
Jl. Teuku Cik Ditiro No.23,
Beringin Raya, Kec. Kemiling,
Kota Bandar Lampung, Lampung
35155
085789274730
1 MIE AYAM 18.000
Subtotal 1 Produk 18.000
Total 18.000
Tunai 20.000
Total Bayar 20.000
Kembalian 2.000
Terbayar 23 Okt 26 12:28
dicetak: Kasir 1
`;

// --- 2. CAREN (QR payment) ---
const CAREN = `
CAREN
1x 14.000 14.000
Total Item 1
Total 14.000
Tender
QR Payment 14.000
Change 0
`;

// --- 3. Faste Coffee Rajabasa (24-09-2026) ---
const FASTE_2409 = `
Faste Coffee Rajabasa
No : FCR01202609240235
Tanggal : 24-09-2026 23:09
Jam Masuk : 24-09-2026 23:09
No Meja : Quick Service
Mode : DINE IN
Kasir : KASIR
FASTe REGULAR
1x @15.455 15.455
TOKYO BREW REGULAR
1x @17.273 17.273
Subtotal : 32.728
Service Charge & : 3.273
TAX
Grand Total : 36.000
B - EDC MANDIRI : 36.000
`;

// --- 4. Faste Coffee Rajabasa (01-10-2026) ---
const FASTE_0110 = `
Faste Coffee Rajabasa
No : FCR01202610010033
Tanggal : 01-10-2026 13:23
Jam Masuk : 01-10-2026 13:23
No Meja : Quick Service
Mode : DINE IN
Kasir : KASIR
HIBISCUS PUNCH STRAWBERRY REGULAR
1x @18.182 18.182
AMERICANO LYCHEE REGULAR
1x @17.273 17.273
2 item
Subtotal : 35.455
Service Charge & : 3.546
TAX
Grand Total : 39.000
B - EDC BCA : 39.000
`;

// --- 5. Faste Coffee Rajabasa (14-10-2026) ---
const FASTE_1410 = `
Faste Coffee Rajabasa
No : FCR01202610140035
Tanggal : 14-10-2026 13:13
Jam Masuk : 14-10-2026 13:13
No Meja : Quick Service
Mode : DINE IN
Kasir : KASIR
MOCHACCINO REGULAR
2x @15.455 30.910
FASTE REGULAR
1x @15.455 15.455
3 item
Subtotal : 46.365
Service Charge & : 4.637
TAX
Grand Total : 51.000
B - EDC MANDIRI : 51.000
`;

// --- 6. StopOne cafe ---
const STOPONE = `
Stopone cafe
Order Type : Normal
User : Stopone cafe
Cashier : Stopone Cafe
Air putih
1x 2.000 2.000
Latte
Regular
3x 15.000 45.000
Great Ocean
Regular
1x 18.000 18.000
Long black
Regular
1x 12.000 12.000
al Item 6
otal 77.000
Tender
QR BNI 77.000
Change 0
`;

// --- 7. Mont Blanc dkk (4 kopi) ---
const MONT_BLANC = `
MONT BLANC REGULAR
1x @18.182 18.182
COFFEE CHEESE REGULAR
1x @17.273 17.273
EXPERT REGULAR
1x @16.364 16.364
CHOCO BANANA REGULAR
1x @18.182 18.182
4 item
Subtotal : 70.001
Service Charge & : 7.000
TAX
Total : 77.000
Grand Total : 77.000
B - EDC MANDIRI
`;

// --- 8. SQUASH PRESSO ---
const SQUASH = `
SQUASH PRESSO
1x 17.000 17.000
Total Item 1
Total 17.000
Tender
Cash 20.000
Change 3.000
`;

console.log('\n[1] Mie Jumbo — qty di depan nama, header alamat panjang');
const mie = parseReceiptText(MIE_JUMBO);
check('jumlah item', mie.length, 1);
check('nama item', names(mie), ['MIE AYAM']);
check('harga', sum(mie), 18000);

console.log('\n[2] CAREN — nama terpisah dari baris harga, QR payment');
const caren = parseReceiptText(CAREN);
check('jumlah item', caren.length, 1);
check('nama item', names(caren), ['CAREN']);
check('harga', sum(caren), 14000);

console.log('\n[3] Faste Coffee 24-09 — @harga satuan, Service Charge & TAX gabungan');
const f1 = parseReceiptText(FASTE_2409);
check('jumlah item', f1.length, 2);
check('nama + harga', names(f1).map((n, i) => `${n}:${f1[i].harga}`), [
  'FASTe Regular:15455',
  'TOKYO BREW Regular:17273',
]);
const f1x = detectReceiptExtras(FASTE_2409, sum(f1));
check('subtotal', sum(f1), 32728);
check('biaya gabungan jadi pajak nominal', f1x.taxNominal, 3273);
check('service tidak dobel', f1x.serviceCharge, 0);

console.log('\n[4] Faste Coffee 01-10');
const f2 = parseReceiptText(FASTE_0110);
check('jumlah item', f2.length, 2);
check('harga', f2.map((i) => i.harga), [18182, 17273]);
check('subtotal', sum(f2), 35455);
check('pajak nominal', detectReceiptExtras(FASTE_0110, sum(f2)).taxNominal, 3546);

console.log('\n[5] Faste Coffee 14-10 — MOCHACCINO 2x');
const f3 = parseReceiptText(FASTE_1410);
check('jumlah item (2x + 1x)', f3.length, 3);
check('semanya harga satuan', f3.every((i) => i.harga === 15455), true);
check('subtotal', sum(f3), 46365);
check('pajak nominal', detectReceiptExtras(FASTE_1410, sum(f3)).taxNominal, 4637);

console.log('\n[6] StopOne cafe — nama & varian di baris terpisah, footer terpotong OCR');
const so = parseReceiptText(STOPONE);
check('jumlah item (1+3+1+1)', so.length, 6);
check('nama item', names(so), [
  'Air putih',
  'Latte Regular',
  'Latte Regular',
  'Latte Regular',
  'Great Ocean Regular',
  'Long black Regular',
]);
check('subtotal', sum(so), 77000);

console.log('\n[7] Mont Blanc — 4 kopi, svc&tax 7.000');
const mb = parseReceiptText(MONT_BLANC);
check('jumlah item', mb.length, 4);
check('harga', mb.map((i) => i.harga), [18182, 17273, 16364, 18182]);
check('subtotal', sum(mb), 70001);
const mbx = detectReceiptExtras(MONT_BLANC, sum(mb));
check('pajak nominal', mbx.taxNominal, 7000);
check('service tidak dobel', mbx.serviceCharge, 0);

console.log('\n[8] SQUASH PRESSO');
const sq = parseReceiptText(SQUASH);
check('jumlah item', sq.length, 1);
check('nama item', names(sq), ['SQUASH PRESSO']);
check('harga', sum(sq), 17000);

// --- 9. Indomaret Jatinangor (retail, uji di HP: item pertama hilang) ---
const INDOMARET = `
Indomaret
JATINANGOR KM.20 - SUMEDANG No. : 003/DP-IM/JTG/IV/2012Q
Jl. Raya Jatinangor Km.20 Sumedang, KAB-SUM
NPWP.02.123.157.5-446.021
14.09.16- 06:46 2.0.31 914115/ALIA MU/01
S/ROTI KRIM KEJU 72G 4 4500 18.000
CIMORY MIX BERRY 22S 1 8500 8.500
CAFELA ESPRESSO 200ML 1 3500 3.500
FF LOW FAT VAN 225 1 5200 5.200
PLASTIK SDG 1 1
DISKON : (1)
HARGA JUAL : 35.200
DISKON FRISIAN FLAG : (1.300)
TOTAL : 33.900
TUNAI : 40.000
KEMBALI : 6.100
ANDA HEMAT 1.300
`;

console.log('\n[9] Indomaret — 5 baris retail, header berantakan, diskon');
const ind = parseReceiptText(INDOMARET);
check('jumlah item (4+1+1+1, plastik skip)', ind.length, 7);
check('nama item pertama', names(ind)[0], 'S/ROTI KRIM KEJU 72G');
check('subtotal', sum(ind), 35200);
check('diskon', detectReceiptExtras(INDOMARET, sum(ind)).discount, 1300);

console.log('\n[10] Varian OCR: harga satuan kebaca sampah (45OO)');
const garbled = parseReceiptText('S/ROTI KRIM KEJU 72G 4 45OO 18.000');
check('jumlah item', garbled.length, 4);
check('harga satuan', garbled.every((i) => i.harga === 4500), true);
check('nama', names(garbled)[0], 'S/ROTI KRIM KEJU 72G');

console.log('\n[11] Varian OCR: kolom qty luput terbaca');
const noQty = parseReceiptText('S/ROTI KRIM KEJU 72G 4500 18.000');
check('jumlah item', noQty.length, 4);
check('harga satuan', noQty.every((i) => i.harga === 4500), true);

console.log('\n[12] Regresi: baris "1x harga total" tanpa nama tidak jadi item retail');
const oneX = parseReceiptText('Air putih\n1x 2.000 2.000');
check('jumlah item', oneX.length, 1);
check('nama', names(oneX), ['Air putih']);

console.log(`\n${failures === 0 ? 'SEMUA TEST LULUS' : `${failures} TEST GAGAL`}`);
if (failures > 0) throw new Error(`${failures} test struk asli gagal`);

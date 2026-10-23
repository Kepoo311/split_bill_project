export const CHANGELOG = [
  {
    version: '1.0.1',
    date: '2026-10-23',
    items: [
      'Perbaikan kritis: item tanpa pemilik kini dibagi rata ke semua anggota (uang tidak lagi hilang)',
      'Pembulatan per orang menggunakan largest-remainder: total bayar persis sama grand total',
      'Simpan riwayat sekarang gagal = error dilempar (bukan diam-diam hilang)',
      'ID pakai crypto.randomUUID() — tabrakan Date.now() tidak mungkin',
      'Validasi diskon melebihi tagihan: blokir + alert sebelum lanjut',
      'Cap riwayat 200 entri: storage tidak bocor',
      'EAS Update aktif: perbaikan JS otomatis ke semua user tanpa update Play Store/App Store',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-10-19',
    items: [
      'Rilis awal: scan struk OCR, bagi tagihan, riwayat, QRIS, pembelajaran AI',
    ],
  },
] as const;

export type ChangelogEntry = typeof CHANGELOG[number];
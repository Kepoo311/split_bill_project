export const CHANGELOG = [
  {
    version: '1.0.5',
    date: '2026-10-24',
    items: [
      'Perbaikan kritis: tagihan dengan diskon sebesar total tidak lagi memunculkan tagihan Rp 1 — total semua orang selalu persis sama dengan grand total',
      'Biaya layanan pada tagihan tanpa item kini dibagi rata ke semua anggota',
      'Lebih stabil: koreksi OCR tidak lagi tersimpan ganda & dibatasi jumlahnya; kegagalan penyimpanan selalu ditampilkan, bukan diam-diam',
    ],
  },
  {
    version: '1.0.4',
    date: '2026-10-24',
    items: [
      'Rebuild UI: tema terpusat (design tokens), header konsisten di semua halaman, tombol dengan efek tekan, kartu lebih bersih tanpa glow berlebihan',
      'Performa: format rupiah & tanggal di-cache, langganan store per-field, daftar item memoized',
      'Gambar kini memakai expo-image: cache bawaan + transisi halus',
      'Error boundary: app tidak lagi mati diam-diam saat tampilan error',
      'Ukuran aplikasi lebih ramping: modul share duplikat dihapus',
    ],
  },
  {
    version: '1.0.3',
    date: '2026-10-24',
    items: [
      'Banner pembaruan di Beranda: tombol Update/Restart muncul saat ada versi baru',
      'Setting baru: mode Update Otomatis / Manual + tombol Cek Pembaruan Sekarang',
    ],
  },
  {
    version: '1.0.2',
    date: '2026-10-24',
    items: [
      'Kritis: parser OCR kembali mendeteksi item dari struk (crypto.randomUUID tidak tersedia di mesin React Native, semua hasil scan jatuh ke input manual)',
      'ID item, anggota, dan riwayat kini punya fallback UUID v4 yang aman di semua platform',
    ],
  },
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
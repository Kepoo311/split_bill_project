export const CHANGELOG = [
  {
    version: '1.0.9',
    date: '2026-10-24',
    items: [
      'Kartu "CARA BERESIN TAGIHAN" di grup: daftar transfer minimum — mis. "Saya bayar Rp 20.000 ke Ripa" — terhitung otomatis biar semua impas',
      'Teks saldo anggota kini eksplisit: "Bayar Rp X ke Y" / "Menerima Rp X dari ..." — bukan lagi angka +/- polos',
      'Status lunas kini hanya untuk anggota yang berutang; yang menalangi tidak punya opsi lunas',
      'Tombol "Tagih 📨" per transfer: kirim pesan tagihan siap-jadi ke WhatsApp',
    ],
  },
  {
    version: '1.0.8',
    date: '2026-10-24',
    items: [
      'GRUP PATUNGAN: kumpulkan banyak struk jadi satu saldo berjalan — kosan, tim futsal, kantor',
      'Catat siapa yang menalangi tiap struk; saldo +diterima/−berutang tiap anggota terhitung otomatis dan selalu imbang',
      'Tandai anggota lunas — lampiran bukti transfer OPSIONAL (bisa dengan atau tanpa foto)',
      'Anggota antar struk digabung otomatis berdasarkan nama',
    ],
  },
  {
    version: '1.0.7',
    date: '2026-10-24',
    items: [
      'Aplikasi kini benar-benar belajar dari koreksimu: struk yang pernah kamu koreksi langsung tampil benar saat di-scan ulang',
      'Salah baca nama item (mis. "MlE AYAM") otomatis diperbaiki dari koreksi lamamu di merchant yang sama',
      'Peringatan hijau muncul di hasil scan saat koreksi lamamu diterapkan',
    ],
  },
  {
    version: '1.0.6',
    date: '2026-10-24',
    items: [
      'Ekspor & impor data: backup seluruh riwayat, metode pembayaran, dan koreksi OCR ke file .json — ada di Pengaturan › Data & Backup',
      'Data tersimpan lebih aman: ganti HP atau uninstall tidak lagi berarti kehilangan riwayat',
    ],
  },
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
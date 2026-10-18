<div align="center">
  <img src="assets/LOGO.png" alt="Logo Split Bill By KepoX" width="180" />

  <h1>Split Bill By KepoX</h1>
  <p>Aplikasi mobile local-first untuk memindai struk, membagi tagihan, dan mengelola riwayat patungan.</p>

  <p>
    <img alt="Status" src="https://img.shields.io/badge/status-development-orange" />
    <img alt="Platform" src="https://img.shields.io/badge/platform-Android%20%7C%20iOS-3DDC84" />
    <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.86-61DAFB" />
    <img alt="Expo" src="https://img.shields.io/badge/Expo-57-000020" />
  </p>
</div>

## Tentang aplikasi

**Split Bill By KepoX** membantu kelompok menghitung pembagian tagihan tanpa mengirim foto struk atau data tagihan ke layanan OCR berbasis cloud. OCR berjalan di perangkat menggunakan Google ML Kit, sedangkan riwayat dan pengaturan disimpan secara lokal.

Aplikasi masih dalam tahap pengembangan. Hasil OCR dan parsing perlu diperiksa sebelum tagihan disimpan atau dibagikan.

## Fitur

- Memindai struk dengan kamera atau memilih foto dari galeri.
- Mengenali teks struk secara lokal dengan Google ML Kit Text Recognition.
- Menyusun teks OCR berdasarkan tata letak baris dan mendeteksi kandidat item serta harga.
- Memeriksa dan mengedit item hasil OCR secara manual.
- Menambahkan anggota, lalu membagi item kepada satu atau beberapa orang.
- Membagi pajak, biaya layanan, dan diskon secara proporsional berdasarkan subtotal tiap orang.
- Menyimpan riwayat tagihan, status pembayaran, kategori, metode pembayaran, dan data koreksi OCR di penyimpanan lokal.
- Membagikan ringkasan tagihan dan detail pembayaran; gambar QRIS dapat disertakan jika tersedia.
- Antarmuka aplikasi menggunakan modal kustom.

## Teknologi

- React Native dan Expo
- TypeScript
- Google ML Kit melalui `@react-native-ml-kit/text-recognition`
- AsyncStorage untuk penyimpanan lokal
- Zustand untuk state management
- React Navigation
- Expo Image Picker dan `react-native-share`

## Alur penggunaan

1. Pilih **Pindai Struk Baru**, lalu gunakan kamera atau galeri.
2. Periksa dan koreksi item serta harga yang dikenali.
3. Tambahkan anggota, tetapkan item, lalu masukkan pajak, biaya layanan, atau diskon.
4. Tinjau total tiap orang dan simpan tagihan ke riwayat.
5. Bagikan ringkasan tagihan atau salin teksnya.

## Struktur proyek

```text
.
├── assets/                 # Logo dan aset aplikasi
├── src/
│   ├── components/         # Komponen UI bersama
│   ├── hooks/              # Hook aplikasi
│   ├── navigation/         # Konfigurasi navigasi
│   ├── screens/            # Layar aplikasi
│   ├── store/              # State dan penyimpanan lokal
│   ├── types/              # Tipe TypeScript
│   └── utils/              # OCR, parsing, dan perhitungan split
├── App.js
├── app.json
└── eas.json
```

## Menjalankan untuk pengembangan

### Persyaratan

- Node.js versi LTS dan npm
- Android Studio, Android SDK, dan perangkat/emulator Android untuk menjalankan Android
- Xcode untuk menjalankan iOS di macOS
- Custom development build untuk modul native seperti ML Kit

### Instalasi

```bash
npm install
```

Jalankan development server:

```bash
npx expo start --dev-client
```

Untuk menjalankan langsung di Android dengan Android SDK yang sudah dikonfigurasi:

```bash
npm run android
```

> **Catatan:** Google ML Kit menggunakan modul native sehingga aplikasi ini tidak dapat menjalankan fitur OCR di Expo Go standar. Gunakan custom development client atau native build.

## Build APK Android

Profil EAS `production` dikonfigurasi untuk menghasilkan APK. Pastikan sudah login ke akun Expo yang memiliki akses ke project ini, lalu jalankan:

```bash
npx eas-cli build --platform android --profile production
```

Build release Android mengaktifkan ProGuard/R8 dan resource shrinking melalui `expo-build-properties`. Build APK belum termasuk dalam repository; distribusikan melalui GitHub Releases jika sudah siap.

## Privasi dan batasan

- Pemrosesan OCR dilakukan di perangkat. Hasil OCR, koreksi, metode pembayaran, dan riwayat tagihan disimpan menggunakan penyimpanan lokal aplikasi.
- Berbagi tagihan menggunakan menu share perangkat dan aplikasi tujuan yang dipilih pengguna. Aplikasi tujuan mungkin memerlukan koneksi internet.
- OCR dan parser menggunakan pengenalan teks serta heuristik format struk; akurasi dapat berbeda antarstruk. Selalu periksa nama item, harga, pajak, biaya layanan, dan diskon.
- Menghapus atau memasang ulang aplikasi dapat menghapus data lokal. Belum ada sinkronisasi atau pencadangan cloud bawaan.

## Kontribusi dan pelaporan masalah

Proyek ini masih aktif dikembangkan. Untuk melaporkan masalah, sertakan:

- Langkah untuk mereproduksi masalah.
- Versi aplikasi, versi Android/iOS, dan jenis perangkat.
- Contoh teks OCR atau struk yang sudah disamarkan dari informasi pribadi.
- Pesan error atau screenshot yang relevan.

Repository: [Kepoo311/split\_bill\_project](https://github.com/Kepoo311/split_bill_project)

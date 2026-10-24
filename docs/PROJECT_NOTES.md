# Project Notes — Split Bill By KepoX

Pengetahuan operasional proyek ini (untuk manusia & agent). Terakhir diperbarui: **2026-10-24, v1.1.0**.

## Status snapshot

| Item | Nilai |
|---|---|
| Versi app | `1.1.0` (runtime policy `appVersion`) |
| Channel OTA | `preview` (Android) |
| Test | `npm test` — 175 check di 6 suite, semua harus hijau |
| Lint | `npx expo lint` — dipertahankan **0 masalah** |
| CI | GitHub Actions: `npm ci → tsc → lint → test` tiap push/PR |
| Distribusi | APK internal via EAS + GitHub Release (tag `Beta`, rolling) |

## 🔑 OTA vs Build Ulang — WAJIB PAHAM

OTA (`eas update`) hanya mengirim **bundle JS**. Perubahan native TIDAK PERNAH sampai lewat OTA.

**Cukup OTA:** semua perubahan `src/**` (screen, component, store, utils, hooks, tema, changelog), `App.js`, `scripts/**`, README, CI, dependency pure-JS.

**Wajib `eas build`:**
- Tambah/hapus/upgrade paket dengan kode native (apa pun `expo-*` ber-native, `react-native-*`)
- `app.json`: daftar `plugins`, `permissions`, `android.package`, `expo-build-properties`, ikon
- **Bump `expo.version`** — dengan policy `appVersion`, bump versi = runtime baru = APK lama TERPUTUS dari OTA sampai install build baru. Jangan bump kalau hanya kirim OTA.

```bash
# OTA (JS-only) — WAJIB --environment
npx eas-cli@latest update --branch preview --platform android --environment production --non-interactive

# Build native — JANGAN pakai --environment (ditolak)
npx eas-cli@latest build -p android --profile preview --non-interactive
```

⚠️ `eas update` ≠ `git push` — jalankan **keduanya**.
⚠️ **Policy `fingerprint` DILARANG dipakai di mesin Windows ini** — pernah gagal 2× (fingerprint meng-hash `package-lock.json` + `node_modules`; checkout CRLF ≠ server LF → "runtime version mismatch"). Syarat coba lagi: `.gitattributes` LF + `rm -rf node_modules && npm ci`. `cli.appVersionSource` harus `local` (remote bikin error fase Configure expo-updates).

## Rilis lengkap (native)

1. `eas build -p android --profile preview` (~10 menit, pantau `eas build:list`)
2. Ambil artifact URL → update **GitHub Release tag `Beta`** via REST API (gh CLI tidak terpasang; kredensial dari `git credential fill`): PATCH nama/notes → DELETE asset lama → POST APK baru ke `uploads.github.com` (host ini kadang gagal DNS — **retry dengan backoff**) → `git tag -f Beta HEAD && git push -f origin Beta`
3. Setelah itu OTA normal lagi menarget runtime baru

## Peta arsitektur

```
src/
├── utils/ocrParser.ts      # parser struk murni — 58+ test regression JANGAN rusakin invariant
├── utils/ocrLearning.ts    # fitur belajar: cache koreksi + kamus merchant (re-parse data lama)
├── utils/ocrProcessor.ts   # rekonstruksi baris visual dari blok ML Kit
├── utils/calculateSplit.ts # UANG — invariant: Σ totalBayar = grandTotal PERSIS
├── utils/groupBalance.ts   # saldo grup (Σ = 0) + netting transfer minimum (maks n-1)
├── utils/stats.ts          # statistik; dayKey WAJIB zero-pad (rentang string compare)
├── utils/format.ts         # formatter Intl di-cache — JANGAN `toLocaleString` inline di render
├── utils/ids.ts            # generateId() — Hermes TIDAK punya crypto.randomUUID
├── store/billStore.ts      # riwayat/pembayaran/learning; semua mutasi write-before-state + THROW
├── store/groupStore.ts     # grup patungan (settlement + bukti TF opsional)
├── store/updateStore.ts    # OTA + changelog + preferensi (autoUpdate, biometricLock)
├── theme.ts                # design tokens — JANGAN hardcode hex baru
scripts/test-*.ts           # 6 suite test (dijalankan npm test)
```

## Konvensi kode (yang sudah diterapkan — pertahankan)

- Warna via token `colors.*` dari `theme.ts`; formatter via `utils/format.ts`
- Zustand: **selector per-field** (`useBillStore((s) => s.x)`), bukan destructuring seluruh store
- Baris list: `React.memo` + callback `useCallback`; komponen baru pakai `Pressable` (JANGAN nest TouchableOpacity di dalam TouchableOpacity)
- Mutasi store: tulis storage DULU baru `set()`, throw saat gagal; UI wajib try/catch + alert (jangan `console.warn` diam)
- Efek yang memicu setState sinkron → bungkus `Promise.resolve().then(...)` (aturan lint set-state-in-effect)
- Aksesibilitas: `accessibilityRole`/`accessibilityLabel`, tap target ≥44pt
- `switch` ke policy data baru → pikirkan validasi/migrasi di loader (`isValidBill` pola)

## Pelajaran keras (jangan diulang)

| Kejadian | Pelajaran |
|---|---|
| `crypto.randomUUID()` crash di HP | Hermes cuma punya `getRandomValues` — selalu `generateId()` |
| Tombol Tagih buka Play Store | `Share.shareSingle` tak andal → deep-link `whatsapp://send` + `canOpenURL` + fallback share sheet |
| Share gagal tanpa QRIS | `urls: []` + `type image/*` bikin Android error → cabang teks-saja |
| Tombol Statistik menimpa tombol Grup | jangan nest touchable — jadikan sibling dalam baris |
| Modal "siapa nalangin" kosong di grup baru | data hasil merge store belum terjadi → hitung pratinjau merge sendiri di UI (`mergeGroupMembers`) |
| "+35.000" bikin bingung | tampilkan aksi eksplisit ("Bayar Rp X ke Y"), bukan angka +/- polos |
| Script clone nyasar di root project | Git Bash: `cd "$TMPDIR"` kosong = no-op diam-diam — selalu path eksplisit |
| Build error fingerprint | lihat larangan di bagian OTA di atas |

## Roadmap

8-batch roadmap (audit + fitur) — **7 selesai** (fondasi kualitas, export/backup+CI, belajar OCR, grup patungan, netting+tagih WA, statistik+bill manual, native batch 1.1.0). Tersisa #8 iOS (opsional, butuh Apple Developer account). Detail riwayat: lihat git log + changelog in-app.

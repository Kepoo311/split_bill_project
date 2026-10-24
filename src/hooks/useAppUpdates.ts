import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useUpdateStore } from '../store/updateStore';

const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4; // 4 jam saat app aktif
const FOREGROUND_RECHECK_INTERVAL = 1000 * 60 * 15; // minimal 15 menit antar cek

/**
 * Dipasang sekali di AppNavigator: cek changelog versi baru + jalankan siklus
 * cek/unduh OTA (menghormati mode manual). Semua state hidup di updateStore
 * sehingga Home banner, ikon header, dan Settings selalu sinkron.
 *
 * Cek berjalan saat: launch, tiap 4 jam, dan setiap app kembali ke foreground
 * (minimal 15 menit dari cek terakhir) — bukan hanya saat app dibuka ulang.
 */
export function useAppUpdates() {
  const showChangelog = useUpdateStore((s) => s.changelogEntry);
  const dismissChangelog = useUpdateStore((s) => s.dismissChangelog);

  useEffect(() => {
    useUpdateStore.getState().checkChangelog();
    const { loadPrefs, checkAndFetch } = useUpdateStore.getState();
    loadPrefs().then(() => {
      if (useUpdateStore.getState().autoUpdate) checkAndFetch();
    });
    const interval = setInterval(() => {
      if (useUpdateStore.getState().autoUpdate) checkAndFetch();
    }, UPDATE_CHECK_INTERVAL);

    // Kembali dari background / switch app → cek lagi jika sudah lewat throttle.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const s = useUpdateStore.getState();
      if (!s.autoUpdate || s.isChecking || s.isDownloading) return;
      if (s.lastCheckedAt && Date.now() - s.lastCheckedAt < FOREGROUND_RECHECK_INTERVAL) return;
      s.checkAndFetch();
    });

    return () => {
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  return {
    showChangelog,
    setShowChangelog: dismissChangelog,
  };
}

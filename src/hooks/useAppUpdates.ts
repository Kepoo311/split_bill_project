import { useEffect } from 'react';
import { useUpdateStore } from '../store/updateStore';

const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4; // 4 jam

/**
 * Dipasang sekali di AppNavigator: cek changelog versi baru + jalankan siklus
 * cek/unduh OTA (menghormati mode manual). Semua state hidup di updateStore
 * sehingga Home banner dan Settings selalu sinkron.
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
    return () => clearInterval(interval);
  }, []);

  return {
    showChangelog,
    setShowChangelog: dismissChangelog,
  };
}

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CHANGELOG, type ChangelogEntry } from '../constants/changelog';
import { useUpdateStore } from '../store/updateStore';

const LAST_SEEN_VERSION_KEY = '@split_bill_last_seen_version';
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4; // 4 jam

export function useAppUpdates() {
  const [showChangelog, setShowChangelog] = useState<ChangelogEntry | null>(null);

  // Cek versi changelog terakhir yang dilihat user
  const checkNewVersion = useCallback(async () => {
    const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
    const currentVersion = CHANGELOG[0].version;
    if (lastSeen !== currentVersion) {
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
      setShowChangelog(CHANGELOG[0]);
    }
  }, []);

  useEffect(() => {
    checkNewVersion();
    const { loadPrefs, checkAndFetch } = useUpdateStore.getState();
    loadPrefs().then(() => {
      if (useUpdateStore.getState().autoUpdate) checkAndFetch();
    });
    const interval = setInterval(() => {
      if (useUpdateStore.getState().autoUpdate) checkAndFetch();
    }, UPDATE_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkNewVersion]);

  return {
    showChangelog,
    setShowChangelog,
  };
}

import { useEffect, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { CHANGELOG, type ChangelogEntry } from '../constants/changelog';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_SEEN_VERSION_KEY = '@split_bill_last_seen_version';
const UPDATE_CHECK_INTERVAL = 1000 * 60 * 60 * 4; // 4 jam

export function useAppUpdates() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [showChangelog, setShowChangelog] = useState<ChangelogEntry | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Cek versi terakhir yang dilihat user
  const checkNewVersion = useCallback(async () => {
    const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
    const currentVersion = CHANGELOG[0].version;
    if (lastSeen !== currentVersion) {
      await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
      setShowChangelog(CHANGELOG[0]);
    }
  }, []);

  // Cek update OTA dari server
  const checkForUpdate = useCallback(async () => {
    if (!Updates.isEnabled) return;
    setIsChecking(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
        // Unduh di background
        await Updates.fetchUpdateAsync();
        setUpdateDownloaded(true);
        setUpdateAvailable(false);
      }
    } catch (e) {
      console.warn('Gagal cek update OTA:', e);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Terapkan update yang sudah diunduh
  const applyUpdate = useCallback(async () => {
    if (updateDownloaded) {
      await Updates.reloadAsync();
    }
  }, [updateDownloaded]);

  // Jalankan cek berkala
  useEffect(() => {
    checkNewVersion();
    checkForUpdate();
    const interval = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [checkNewVersion, checkForUpdate]);

  return {
    updateAvailable,
    updateDownloaded,
    showChangelog,
    setShowChangelog,
    isChecking,
    checkForUpdate,
    applyUpdate,
  };
}
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { CHANGELOG, type ChangelogEntry } from '../constants/changelog';

export type UpdateResult = 'uptodate' | 'ready' | 'error' | 'disabled';

const AUTO_UPDATE_KEY = '@split_bill_auto_update_v1';
const LAST_SEEN_VERSION_KEY = '@split_bill_last_seen_version';

interface UpdateState {
  autoUpdate: boolean;
  prefsLoaded: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  lastResult: UpdateResult | null;
  lastCheckedAt: number | null;
  changelogEntry: ChangelogEntry | null;
  loadPrefs: () => Promise<void>;
  setAutoUpdate: (value: boolean) => Promise<void>;
  checkAndFetch: () => Promise<UpdateResult>;
  applyUpdate: () => Promise<boolean>;
  checkChangelog: () => Promise<void>;
  dismissChangelog: () => void;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  autoUpdate: true,
  prefsLoaded: false,
  isChecking: false,
  isDownloading: false,
  updateAvailable: false,
  updateDownloaded: false,
  lastResult: null,
  lastCheckedAt: null,
  changelogEntry: null,

  checkChangelog: async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
      const currentVersion = CHANGELOG[0].version;
      if (lastSeen !== currentVersion) {
        await AsyncStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
        set({ changelogEntry: CHANGELOG[0] });
      }
    } catch {
      // Gagal baca preferensi changelog — abaikan, cek lagi di launch berikutnya.
    }
  },

  dismissChangelog: () => set({ changelogEntry: null }),

  loadPrefs: async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTO_UPDATE_KEY);
      set({ autoUpdate: raw !== 'false', prefsLoaded: true });
    } catch {
      set({ prefsLoaded: true });
    }
  },

  setAutoUpdate: async (value: boolean) => {
    set({ autoUpdate: value });
    try {
      await AsyncStorage.setItem(AUTO_UPDATE_KEY, value ? 'true' : 'false');
    } catch {
      // Preferensi gagal tersimpan — mode tetap berlaku untuk sesi ini.
    }
  },

  checkAndFetch: async () => {
    if (!Updates.isEnabled) {
      set({ lastResult: 'disabled' });
      return 'disabled';
    }
    if (get().isChecking || get().isDownloading) return get().lastResult ?? 'uptodate';

    set({ isChecking: true });
    try {
      const check = await Updates.checkForUpdateAsync();
      if (!check.isAvailable) {
        set({
          updateAvailable: false,
          lastResult: 'uptodate',
          lastCheckedAt: Date.now(),
        });
        return 'uptodate';
      }

      set({ updateAvailable: true, isDownloading: true });
      try {
        const fetched = await Updates.fetchUpdateAsync();
        const ready = fetched.isNew;
        set({
          isDownloading: false,
          updateDownloaded: ready,
          updateAvailable: !ready,
          lastResult: ready ? 'ready' : 'uptodate',
          lastCheckedAt: Date.now(),
        });
        return ready ? 'ready' : 'uptodate';
      } catch {
        set({ isDownloading: false, lastResult: 'error', lastCheckedAt: Date.now() });
        return 'error';
      }
    } catch {
      set({ lastResult: 'error', lastCheckedAt: Date.now() });
      return 'error';
    } finally {
      set({ isChecking: false });
    }
  },

  applyUpdate: async () => {
    if (!get().updateDownloaded) return false;
    try {
      await Updates.reloadAsync();
      return true;
    } catch {
      return false;
    }
  },
}));

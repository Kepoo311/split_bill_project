import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

export type UpdateResult = 'uptodate' | 'ready' | 'error' | 'disabled';

const AUTO_UPDATE_KEY = '@split_bill_auto_update_v1';

interface UpdateState {
  autoUpdate: boolean;
  prefsLoaded: boolean;
  isChecking: boolean;
  isDownloading: boolean;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  lastResult: UpdateResult | null;
  lastCheckedAt: number | null;
  loadPrefs: () => Promise<void>;
  setAutoUpdate: (value: boolean) => Promise<void>;
  checkAndFetch: () => Promise<UpdateResult>;
  applyUpdate: () => Promise<boolean>;
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

import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, AppState, StyleSheet } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { useUpdateStore } from '../store/updateStore';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';

/**
 * Gerbang kunci biometrik: menutup aplikasi di belakang overlay sampai
 * sidik jari/pola/PIN diverifikasi. Terkunci ulang setiap kali aplikasi
 * meninggalkan layar aktif. Perangkat tanpa biometrik terdaftar tidak
 * dikunci agar pengguna tidak terkunci keluar.
 */
export const LockGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const biometricLock = useUpdateStore((s) => s.biometricLock);
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);

  const tryUnlock = useCallback(async () => {
    setChecking(true);
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      // Biometrik tidak tersedia/terdaftar — kunci dimatikan implisit.
      setUnlocked(true);
      setChecking(false);
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Buka Split Bill',
      cancelLabel: 'Batal',
    });
    if (result.success) {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    useUpdateStore.getState().loadPrefs();
  }, []);

  useEffect(() => {
    // Dijalankan sebagai microtask — setState dijalankan di luar body effect
    // sinkron (react-hooks/set-state-in-effect).
    if (biometricLock && !unlocked) {
      Promise.resolve().then(() => tryUnlock());
    }
  }, [biometricLock, unlocked, tryUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!useUpdateStore.getState().biometricLock) return;
      if (state === 'background') {
        setUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, []);

  if (!biometricLock || unlocked) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed-outline" size={34} color={colors.accent} />
      <AppText style={styles.title}>Split Bill Terkunci</AppText>
      <AppText style={styles.message}>
        Verifikasi dengan sidik jari, wajah, atau PIN untuk melanjutkan.
      </AppText>
      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={tryUnlock}
        disabled={checking}
        accessibilityRole="button"
        accessibilityLabel="Buka dengan biometrik"
      >
        <AppText style={styles.buttonText}>{checking ? 'Memeriksa…' : 'Buka'}</AppText>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 44, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8 },
  message: {
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: { color: colors.ink, fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});

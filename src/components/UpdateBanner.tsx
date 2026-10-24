import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUpdateStore } from '../store/updateStore';
import { colors } from '../theme';
import { AppText } from './AppText';

/**
 * Banner di Beranda yang muncul saat ada pembaruan OTA. Menyala dari
 * updateStore sehingga hasil cek otomatis maupun manual dari ikon header /
 * Settings sama-sama memunculkannya di sini.
 */
export const UpdateBanner: React.FC = () => {
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const updateDownloaded = useUpdateStore((s) => s.updateDownloaded);
  const isDownloading = useUpdateStore((s) => s.isDownloading);

  const handlePress = async () => {
    const store = useUpdateStore.getState();
    if (store.updateDownloaded) {
      await store.applyUpdate();
      return;
    }
    await store.checkAndFetch();
    if (useUpdateStore.getState().updateDownloaded) {
      await useUpdateStore.getState().applyUpdate();
    }
  };

  if (!updateAvailable && !updateDownloaded) return null;

  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-download-outline" size={18} color={colors.info} />
      </View>
      <View style={styles.textWrap}>
        <AppText style={styles.title}>
          {updateDownloaded ? 'Pembaruan siap dipasang' : 'Pembaruan tersedia'}
        </AppText>
        <AppText style={styles.subtitle}>
          {isDownloading
            ? 'Mengunduh pembaruan…'
            : updateDownloaded
              ? 'App akan dimulai ulang untuk memasang versi baru.'
              : 'Unduh dan pasang versi terbaru sekarang.'}
        </AppText>
      </View>
      <TouchableOpacity
        style={[styles.button, isDownloading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isDownloading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={updateDownloaded ? 'Pasang pembaruan' : 'Unduh pembaruan'}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color={colors.ink} />
        ) : (
          <AppText style={styles.buttonText}>
            {updateDownloaded ? 'Pasang' : 'Perbarui'}
          </AppText>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: { flex: 1, marginLeft: 10, marginRight: 10 },
  title: { color: colors.text, fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  button: {
    backgroundColor: colors.info,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.ink, fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
});

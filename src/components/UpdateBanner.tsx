import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useUpdateStore } from '../store/updateStore';
import { colors } from '../theme';

/**
 * Banner di Beranda yang muncul saat ada pembaruan OTA. Menyala dari
 * updateStore sehingga hasil cek otomatis maupun manual dari Settings
 * sama-sama memunculkannya di sini.
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
        <Text style={styles.icon}>⬇</Text>
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>
          {updateDownloaded ? 'Pembaruan Siap Dipasang' : 'Pembaruan Tersedia'}
        </Text>
        <Text style={styles.subtitle}>
          {isDownloading
            ? 'Mengunduh pembaruan...'
            : updateDownloaded
              ? 'App akan dimulai ulang untuk memasang versi baru.'
              : 'Unduh dan pasang versi terbaru sekarang.'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, isDownloading && styles.buttonDisabled]}
        onPress={handlePress}
        disabled={isDownloading}
        activeOpacity={0.8}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#070A10" />
        ) : (
          <Text style={styles.buttonText}>
            {updateDownloaded ? 'Restart' : 'Update'}
          </Text>
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
    marginBottom: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(125, 211, 252, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16, color: colors.info },
  textWrap: { flex: 1, marginLeft: 10, marginRight: 10 },
  title: { color: '#F8FAFC', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 2, lineHeight: 15 },
  button: {
    backgroundColor: colors.info,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.bg, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});

import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Updates from 'expo-updates';
import * as Clipboard from 'expo-clipboard';
import * as LocalAuthentication from 'expo-local-authentication';
import { Image } from 'expo-image';
import Share from 'react-native-share';
import { useBillStore } from '../store/billStore';
import { useUpdateStore, type UpdateResult } from '../store/updateStore';
import { CHANGELOG } from '../constants/changelog';
import { PaymentMethod, RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CyberModal } from '../components/CyberModal';
import { TopBar } from '../components/TopBar';
import { colors } from '../theme';
import { AppText } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const paymentMethods = useBillStore((s) => s.paymentMethods);
  const loadPaymentMethods = useBillStore((s) => s.loadPaymentMethods);
  const savePaymentMethod = useBillStore((s) => s.savePaymentMethod);
  const deletePaymentMethod = useBillStore((s) => s.deletePaymentMethod);
  const [methodType, setMethodType] = useState<'bank' | 'ewallet' | 'qris'>('bank');
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [qrisImageUri, setQrisImageUri] = useState<string | undefined>(undefined);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');

  // State section Pembaruan Aplikasi
  const autoUpdate = useUpdateStore((s) => s.autoUpdate);
  const isChecking = useUpdateStore((s) => s.isChecking);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const updateDownloaded = useUpdateStore((s) => s.updateDownloaded);
  const biometricLock = useUpdateStore((s) => s.biometricLock);
  const [updateStatus, setUpdateStatus] = useState<string>('');
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && enrolled);
    })();
  }, []);

  useEffect(() => {
    useUpdateStore.getState().loadPrefs();
  }, []);

  const showCyberAlert = (title: string, message: string) => {
    setModalTitle(title);
    setModalMsg(message);
    setModalVisible(true);
  };

  useEffect(() => {
    loadPaymentMethods().catch(() => {
      showCyberAlert('Gagal Memuat', 'Metode pembayaran lokal tidak dapat dibaca.');
    });
  }, [loadPaymentMethods]);

  const persistQrisImage = async (uri: string) => {
    if (!FileSystem.documentDirectory) {
      throw new Error('Penyimpanan lokal aplikasi tidak tersedia.');
    }

    const sourcePath = uri.split(/[?#]/)[0];
    const extension = sourcePath.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
    const destination = `${FileSystem.documentDirectory}qris-${Date.now()}.${extension}`;
    await FileSystem.copyAsync({ from: uri, to: destination });
    return destination;
  };

  const handlePickQrisImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showCyberAlert('Izin Ditolak', 'Izinkan akses galeri untuk mengunggah gambar QRIS.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!res.canceled && res.assets && res.assets.length > 0) {
      setQrisImageUri(res.assets[0].uri);
    }
  };

  const handleAddPayment = async () => {
    if (!name.trim()) {
      showCyberAlert('Input Kurang', 'Masukkan nama bank/e-wallet/QRIS.');
      return;
    }

    if (methodType === 'qris' && !qrisImageUri) {
      showCyberAlert('QRIS Kosong', 'Pilih foto QRIS statis dari galeri Anda.');
      return;
    }

    if (methodType !== 'qris' && !accountNumber.trim()) {
      showCyberAlert('Nomor Kosong', 'Masukkan nomor rekening atau nomor HP e-wallet.');
      return;
    }

    try {
      const savedQrisUri = methodType === 'qris' && qrisImageUri
        ? await persistQrisImage(qrisImageUri)
        : undefined;
      const newPayment: Omit<PaymentMethod, 'id'> = {
        type: methodType,
        name: name.trim(),
        accountNumber: accountNumber.trim() || undefined,
        accountName: accountName.trim() || undefined,
        qrisImageUri: savedQrisUri,
      };

      await savePaymentMethod(newPayment);
      setName('');
      setAccountNumber('');
      setAccountName('');
      setQrisImageUri(undefined);
      showCyberAlert('Tersimpan', 'Metode pembayaran tersimpan secara lokal.');
    } catch {
      showCyberAlert('Gagal Menyimpan', 'Metode pembayaran atau gambar QRIS tidak dapat disimpan.');
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      await deletePaymentMethod(id);
    } catch {
      showCyberAlert('Gagal Menghapus', 'Metode pembayaran tidak dapat dihapus dari penyimpanan lokal.');
    }
  };

  const handleToggleAutoUpdate = async (value: boolean) => {
    await useUpdateStore.getState().setAutoUpdate(value);
  };

  const handleToggleBiometricLock = async (value: boolean) => {
    await useUpdateStore.getState().setBiometricLock(value);
  };

  const handleCheckUpdate = async () => {
    setUpdateStatus('');
    const result = await useUpdateStore.getState().checkAndFetch();
    const messages: Record<UpdateResult, string> = {
      uptodate: 'Kamu sudah memakai versi terbaru.',
      ready: 'Pembaruan terunduh — ketuk "Pasang" untuk memasang versi baru.',
      error: 'Gagal memeriksa pembaruan. Pastikan internet aktif lalu coba lagi.',
      disabled: 'Pembaruan OTA tidak aktif di build pengembangan.',
    };
    setUpdateStatus(messages[result]);
  };

  const handleExport = async () => {
    try {
      const json = useBillStore.getState().exportData();
      if (!FileSystem.cacheDirectory) {
        throw new Error('Penyimpanan sementara tidak tersedia.');
      }
      const fileName = `splitbill-backup-${new Date().toISOString().slice(0, 10)}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Share.open({
        url: fileUri,
        type: 'application/json',
        title: 'Backup Split Bill',
        failOnCancel: false,
      });
    } catch {
      showCyberAlert('Gagal Ekspor', 'Data tidak dapat diekspor. Coba lagi.');
    }
  };

  const handleImport = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        showCyberAlert(
          'Clipboard Kosong',
          'Buka file backup (.json), pilih seluruh isinya, salin, lalu kembali dan tap tombol ini.',
        );
        return;
      }
      const summary = await useBillStore.getState().importData(text);
      showCyberAlert(
        'Impor Selesai',
        `Riwayat +${summary.historyAdded} • Pembayaran +${summary.paymentsAdded} • Koreksi OCR +${summary.learningAdded}\n\nData yang sudah ada tidak diduplikasi.`,
      );
    } catch (e) {
      showCyberAlert('Impor Gagal', e instanceof Error ? e.message : 'Data tidak dapat diimpor.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Pengaturan"
        onBack={() => navigation.goBack()}
        right={<View style={{ width: 60 }} />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Form Tambah Pembayaran */}
        <View style={styles.card}>
          <AppText style={styles.sectionHeader}>Tambah Info Pembayaran</AppText>
          <AppText style={styles.subHint}>
            Informasi ini disimpan offline di HP dan akan otomatis dicantumkan saat menagih teman.
          </AppText>

          {/* Tab Selector Jenis */}
          <View style={styles.typeSelector}>
            {(['bank', 'ewallet', 'qris'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, methodType === t && styles.typeButtonActive]}
                onPress={() => setMethodType(t)}
              >
                <AppText style={[styles.typeText, methodType === t && styles.typeTextActive]}>
                  {t === 'bank' ? 'Bank' : t === 'ewallet' ? 'E-Wallet' : 'QRIS'}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText style={styles.fieldLabel}>Nama Penyedia / Label</AppText>
          <TextInput
            style={styles.input}
            placeholder={methodType === 'bank' ? 'Contoh: BCA / Mandiri / Jago' : methodType === 'ewallet' ? 'Contoh: GoPay / Dana / OVO' : 'Contoh: QRIS Toko / QRIS Pribadi'}
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

          {methodType !== 'qris' && (
            <>
              <AppText style={styles.fieldLabel}>Nomor Rekening / No. HP E-Wallet</AppText>
              <TextInput
                style={styles.input}
                placeholder="1234567890 / 08123456789"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <AppText style={styles.fieldLabel}>Atas Nama (A/N)</AppText>
              <TextInput
                style={styles.input}
                placeholder="Contoh: Niko Andrean"
                placeholderTextColor="#64748B"
                value={accountName}
                onChangeText={setAccountName}
              />
            </>
          )}

          {methodType === 'qris' && (
            <View style={styles.qrisUploadWrap}>
              <AppText style={styles.fieldLabel}>Gambar QRIS Statis</AppText>
              {qrisImageUri ? (
                <View style={styles.qrisPreviewWrap}>
                  <Image
                    source={{ uri: qrisImageUri }}
                    style={styles.qrisImagePreview}
                    contentFit="cover"
                    transition={200}
                  />
                  <TouchableOpacity style={styles.qrisChangeBtn} onPress={handlePickQrisImage}>
                    <AppText style={styles.qrisChangeText}>Ganti Foto QRIS</AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadPlaceholder} onPress={handlePickQrisImage}>
                  <Ionicons name="camera-outline" size={22} color={colors.accent} />
                  <AppText style={styles.uploadText}>Pilih Foto QRIS dari Galeri</AppText>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.btnSave} onPress={handleAddPayment}>
            <AppText style={styles.btnSaveText}>+ Simpan Rekening / QRIS</AppText>
          </TouchableOpacity>
        </View>

        {/* List Pembayaran Terdaftar */}
        <AppText style={styles.sectionTitle}>Rekening & QRIS Tersimpan</AppText>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyBox}>
            <AppText style={styles.emptyText}>Belum ada info rekening/QRIS tersimpan.</AppText>
          </View>
        ) : (
          paymentMethods.map((pm) => (
            <View key={pm.id} style={styles.paymentCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.paymentCardHeader}>
                  <AppText style={styles.paymentBadge}>
                    {pm.type === 'bank' ? 'BANK' : pm.type === 'ewallet' ? 'E-WALLET' : 'QRIS'}
                  </AppText>
                  <AppText style={styles.paymentName}>{pm.name}</AppText>
                </View>
                {pm.accountNumber && (
                  <AppText style={styles.paymentAccount}>{pm.accountNumber}</AppText>
                )}
                {pm.accountName && (
                  <AppText style={styles.paymentHolder}>a.n {pm.accountName}</AppText>
                )}
                {pm.type === 'qris' && pm.qrisImageUri && (
                  <Image
                    source={{ uri: pm.qrisImageUri }}
                    style={styles.qrisThumbSmall}
                    contentFit="cover"
                    transition={200}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePayment(pm.id)}
              >
                <AppText style={styles.deleteBtnText}>Hapus</AppText>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Section Pembaruan Aplikasi */}
        <AppText style={styles.sectionTitle}>Pembaruan Aplikasi</AppText>
        <View style={styles.card}>
          <View style={styles.updateRow}>
            <View style={styles.updateTextWrap}>
              <AppText style={styles.updateLabel}>Update Otomatis</AppText>
              <AppText style={styles.subHint}>
                Aktif: app mengecek & mengunduh pembaruan di background setiap dibuka. Mati:
                pembaruan hanya dicek lewat tombol di bawah.
              </AppText>
            </View>
            <Switch
              value={autoUpdate}
              onValueChange={handleToggleAutoUpdate}
              trackColor={{ true: colors.info, false: colors.border }}
              thumbColor="#F9FAFB"
            />
          </View>

          {updateDownloaded ? (
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={() => useUpdateStore.getState().applyUpdate()}
            >
              <AppText style={styles.restartBtnText}>↻ Mulai Ulang Sekarang</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.checkBtn, (isChecking || isDownloading) && styles.btnDisabled]}
              onPress={handleCheckUpdate}
              disabled={isChecking || isDownloading}
            >
              {isChecking || isDownloading ? (
                <View style={styles.checkBtnLoading}>
                  <ActivityIndicator size="small" color={colors.ink} />
                  <AppText style={styles.checkBtnText}>
                    {isChecking ? 'Memeriksa...' : 'Mengunduh...'}
                  </AppText>
                </View>
              ) : (
                <AppText style={styles.checkBtnText}>Cek Pembaruan Sekarang</AppText>
              )}
            </TouchableOpacity>
          )}

          {updateStatus ? <AppText style={styles.updateStatus}>{updateStatus}</AppText> : null}
          <AppText style={styles.versionInfo}>
            Versi {CHANGELOG[0].version} • Channel {Updates.channel ?? '-'}
          </AppText>
        </View>

        {/* Section Keamanan */}
        <AppText style={styles.sectionTitle}>Keamanan</AppText>
        <View style={styles.card}>
          <View style={styles.updateRow}>
            <View style={styles.updateTextWrap}>
              <AppText style={styles.updateLabel}>Kunci Biometrik</AppText>
              <AppText style={styles.subHint}>
                {biometricsAvailable
                  ? 'Verifikasi sidik jari/wajah/PIN setiap kali membuka aplikasi.'
                  : 'Perangkat belum mengatur sidik jari/wajah/PIN — atur dulu di Pengaturan HP untuk mengaktifkan ini.'}
              </AppText>
            </View>
            <Switch
              value={biometricLock && biometricsAvailable}
              onValueChange={handleToggleBiometricLock}
              disabled={!biometricsAvailable}
              trackColor={{ true: '#7DD3FC', false: '#1E293B' }}
              thumbColor="#F9FAFB"
            />
          </View>
        </View>

        {/* Section Data & Backup */}
        <AppText style={styles.sectionTitle}>Data &amp; Backup</AppText>
        <View style={styles.card}>
          <AppText style={styles.subHint}>
            Semua data tersimpan offline di HP ini. Ekspor rutin ke file backup
            menyelamatkan riwayatmu saat ganti HP atau uninstall. Impor dilakukan
            dengan menyalin isi file backup lalu tap tombol impor.
          </AppText>
          <TouchableOpacity style={styles.checkBtn} onPress={handleExport}>
            <AppText style={styles.checkBtnText}>Ekspor Data (.json)</AppText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.restartBtn} onPress={handleImport}>
            <AppText style={styles.restartBtnText}>Impor dari Clipboard</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CyberModal
        visible={modalVisible}
        title={modalTitle}
        message={modalMsg}
        buttons={[{ text: 'OK', onPress: () => setModalVisible(false) }]}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: colors.accent, letterSpacing: 0.3, marginBottom: 4 },
  subHint: { fontSize: 11, color: colors.textSubtle, lineHeight: 16, marginBottom: 14 },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  typeText: { fontSize: 12, fontWeight: '700', color: colors.textSubtle },
  typeTextActive: { color: colors.accent },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    fontFamily: 'IBMPlexSans_400Regular',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
  },
  qrisUploadWrap: { marginTop: 6 },
  uploadPlaceholder: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(212, 160, 23, 0.06)',
  },
  uploadIcon: { fontSize: 24, marginBottom: 6 },
  uploadText: { fontSize: 12, color: colors.accent, fontWeight: '700' },
  qrisPreviewWrap: { alignItems: 'center' },
  qrisImagePreview: { width: 140, height: 140, borderRadius: 8, borderWidth: 1, borderColor: colors.accent, backgroundColor: '#FFF' },
  qrisChangeBtn: { marginTop: 8, paddingVertical: 4 },
  qrisChangeText: { color: colors.info, fontSize: 11, fontWeight: '700' },
  btnSave: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  btnSaveText: { color: colors.bg, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 10, letterSpacing: 0.2 },
  emptyBox: {
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyText: { color: colors.textSubtle, fontSize: 12 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  paymentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  paymentBadge: {
    backgroundColor: colors.accentSoft,
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  paymentName: { fontSize: 14, fontWeight: '800', color: colors.text },
  paymentAccount: { fontSize: 14, fontWeight: '700', color: colors.info, letterSpacing: 0.2 },
  paymentHolder: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  qrisThumbSmall: { width: 60, height: 60, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: colors.line },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  updateTextWrap: { flex: 1 },
  updateLabel: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 4 },
  checkBtn: {
    backgroundColor: colors.info,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  checkBtnLoading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkBtnText: { color: colors.bg, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  restartBtn: {
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  restartBtnText: { color: colors.info, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  updateStatus: { color: colors.textMuted, fontSize: 11, marginTop: 10, lineHeight: 16 },
  versionInfo: { color: '#8FA0BC', fontSize: 10, marginTop: 10, letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.6 },
});

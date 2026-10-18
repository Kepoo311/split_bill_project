import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useBillStore } from '../store/billStore';
import { PaymentMethod, RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CyberModal } from '../components/CyberModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const { paymentMethods, loadPaymentMethods, savePaymentMethod, deletePaymentMethod } = useBillStore();
  const [methodType, setMethodType] = useState<'bank' | 'ewallet' | 'qris'>('bank');
  const [name, setName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [qrisImageUri, setQrisImageUri] = useState<string | undefined>(undefined);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMsg, setModalMsg] = useState('');

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Metode Pembayaran & QRIS</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Form Tambah Pembayaran */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Tambah Info Pembayaran</Text>
          <Text style={styles.subHint}>
            Informasi ini disimpan offline di HP dan akan otomatis dicantumkan saat menagih teman.
          </Text>

          {/* Tab Selector Jenis */}
          <View style={styles.typeSelector}>
            {(['bank', 'ewallet', 'qris'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeButton, methodType === t && styles.typeButtonActive]}
                onPress={() => setMethodType(t)}
              >
                <Text style={[styles.typeText, methodType === t && styles.typeTextActive]}>
                  {t === 'bank' ? '🏦 Bank' : t === 'ewallet' ? '📱 E-Wallet' : '⚡ QRIS'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Nama Penyedia / Label</Text>
          <TextInput
            style={styles.input}
            placeholder={methodType === 'bank' ? 'Contoh: BCA / Mandiri / Jago' : methodType === 'ewallet' ? 'Contoh: GoPay / Dana / OVO' : 'Contoh: QRIS Toko / QRIS Pribadi'}
            placeholderTextColor="#64748B"
            value={name}
            onChangeText={setName}
          />

          {methodType !== 'qris' && (
            <>
              <Text style={styles.fieldLabel}>Nomor Rekening / No. HP E-Wallet</Text>
              <TextInput
                style={styles.input}
                placeholder="1234567890 / 08123456789"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={accountNumber}
                onChangeText={setAccountNumber}
              />

              <Text style={styles.fieldLabel}>Atas Nama (A/N)</Text>
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
              <Text style={styles.fieldLabel}>Gambar QRIS Statis</Text>
              {qrisImageUri ? (
                <View style={styles.qrisPreviewWrap}>
                  <Image source={{ uri: qrisImageUri }} style={styles.qrisImagePreview} />
                  <TouchableOpacity style={styles.qrisChangeBtn} onPress={handlePickQrisImage}>
                    <Text style={styles.qrisChangeText}>Ganti Foto QRIS</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadPlaceholder} onPress={handlePickQrisImage}>
                  <Text style={styles.uploadIcon}>📷</Text>
                  <Text style={styles.uploadText}>Pilih Foto QRIS dari Galeri</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.btnSave} onPress={handleAddPayment}>
            <Text style={styles.btnSaveText}>+ Simpan Rekening / QRIS</Text>
          </TouchableOpacity>
        </View>

        {/* List Pembayaran Terdaftar */}
        <Text style={styles.sectionTitle}>Rekening & QRIS Tersimpan</Text>
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Belum ada info rekening/QRIS tersimpan.</Text>
          </View>
        ) : (
          paymentMethods.map((pm) => (
            <View key={pm.id} style={styles.paymentCard}>
              <View style={{ flex: 1 }}>
                <View style={styles.paymentCardHeader}>
                  <Text style={styles.paymentBadge}>
                    {pm.type === 'bank' ? 'BANK' : pm.type === 'ewallet' ? 'E-WALLET' : 'QRIS'}
                  </Text>
                  <Text style={styles.paymentName}>{pm.name}</Text>
                </View>
                {pm.accountNumber && (
                  <Text style={styles.paymentAccount}>{pm.accountNumber}</Text>
                )}
                {pm.accountName && (
                  <Text style={styles.paymentHolder}>a.n {pm.accountName}</Text>
                )}
                {pm.type === 'qris' && pm.qrisImageUri && (
                  <Image source={{ uri: pm.qrisImageUri }} style={styles.qrisThumbSmall} />
                )}
              </View>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeletePayment(pm.id)}
              >
                <Text style={styles.deleteBtnText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
  container: { flex: 1, backgroundColor: '#070A10' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0E1422',
  },
  backButton: { padding: 4 },
  backButtonText: { color: '#00F0FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  screenTitle: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', letterSpacing: 0.8 },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#0E1422',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 20,
  },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#00F0FF', letterSpacing: 0.8, marginBottom: 4 },
  subHint: { fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 14 },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#070A10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  typeText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  typeTextActive: { color: '#00F0FF' },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 10, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    backgroundColor: '#070A10',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#F9FAFB',
  },
  qrisUploadWrap: { marginTop: 6 },
  uploadPlaceholder: {
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  uploadIcon: { fontSize: 24, marginBottom: 6 },
  uploadText: { fontSize: 12, color: '#00F0FF', fontWeight: '700' },
  qrisPreviewWrap: { alignItems: 'center' },
  qrisImagePreview: { width: 140, height: 140, borderRadius: 8, borderWidth: 1, borderColor: '#00F0FF', backgroundColor: '#FFF' },
  qrisChangeBtn: { marginTop: 8, paddingVertical: 4 },
  qrisChangeText: { color: '#38BDF8', fontSize: 11, fontWeight: '700' },
  btnSave: {
    backgroundColor: '#00F0FF',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  btnSaveText: { color: '#070A10', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#F9FAFB', marginBottom: 10, letterSpacing: 0.5 },
  emptyBox: {
    padding: 20,
    backgroundColor: '#0E1422',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  emptyText: { color: '#64748B', fontSize: 12 },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1422',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
  },
  paymentCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  paymentBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    color: '#00F0FF',
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  paymentName: { fontSize: 14, fontWeight: '800', color: '#F9FAFB' },
  paymentAccount: { fontSize: 14, fontWeight: '700', color: '#38BDF8', letterSpacing: 0.5 },
  paymentHolder: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  qrisThumbSmall: { width: 60, height: 60, borderRadius: 6, marginTop: 6, borderWidth: 1, borderColor: '#334155' },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteBtnText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
});

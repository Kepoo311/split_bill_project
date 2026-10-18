import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBillStore } from '../store/billStore';
import { BillHistory, RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import Share from 'react-native-share';
import { CyberModal } from '../components/CyberModal';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareBill'>;

export const ShareBillScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bill } = route.params;
  const { paymentMethods, loadPaymentMethods } = useBillStore();
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

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

  useEffect(() => {
    setSelectedMethods(paymentMethods.map((payment) => payment.id));
  }, [paymentMethods]);

  const toggleMethod = (id: string) => {
    if (selectedMethods.includes(id)) {
      setSelectedMethods((prev) => prev.filter((m) => m !== id));
    } else {
      setSelectedMethods((prev) => [...prev, id]);
    }
  };

  const buildShareText = () => {
    let msg = `⚡ *TAGIHAN SPLIT BILL BY KEPOX - ${bill.title.toUpperCase()}*\n`;
    msg += `📅 Tanggal: ${new Date(bill.date).toLocaleString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}\n`;
    msg += `💰 Total Tagihan: Rp ${bill.grandTotal.toLocaleString('id-ID')}\n`;
    if (bill.tax > 0) msg += `• Pajak: Rp ${bill.tax.toLocaleString('id-ID')}\n`;
    if (bill.service > 0) msg += `• Biaya Layanan: Rp ${bill.service.toLocaleString('id-ID')}\n`;
    if (bill.discount > 0) msg += `• Diskon / Promo: -Rp ${bill.discount.toLocaleString('id-ID')}\n`;
    msg += `--------------------------------\n\n`;

    msg += `*RINCIAN TIAP ORANG:*\n`;
    bill.results.forEach((res, i) => {
      const isPaid = bill.paidMemberIds?.includes(res.memberId);
      const status = isPaid ? ' [LUNAS ✅]' : '';
      msg += `${i + 1}. *${res.name}*: Rp ${res.totalBayar.toLocaleString('id-ID')}${status}\n`;
      msg += `   (Menu: Rp ${res.subtotal.toLocaleString('id-ID')}`;
      if (res.taxShare + res.serviceShare > 0) {
        msg += ` + Pajak/Svc: Rp ${(res.taxShare + res.serviceShare).toLocaleString('id-ID')}`;
      }
      if (res.discountShare > 0) {
        msg += ` - Disc: Rp ${res.discountShare.toLocaleString('id-ID')}`;
      }
      msg += `)\n`;
    });

    const activePayments = paymentMethods.filter((p) => selectedMethods.includes(p.id));
    if (activePayments.length > 0) {
      msg += `\n--------------------------------\n`;
      msg += `*METODE PEMBAYARAN:*\n`;
      activePayments.forEach((p) => {
        if (p.type === 'bank') {
          msg += `🏦 ${p.name}: *${p.accountNumber}* (a.n ${p.accountName || '-'})\n`;
        } else if (p.type === 'ewallet') {
          msg += `📱 ${p.name}: *${p.accountNumber}* (a.n ${p.accountName || '-'})\n`;
        } else if (p.type === 'qris') {
          msg += `⚡ ${p.name}: QRIS terlampir pada pesan ini\n`;
        }
      });
    }

    msg += `\n_Dihitung otomatis via Split Bill By KepoX_`;
    return msg;
  };

  const handleShareSystem = async () => {
    try {
      const message = buildShareText();
      const attachments = await Promise.all(qrisMethods.map(async (method) => {
        if (!method.qrisImageUri) {
          throw new Error(`Gambar QRIS ${method.name} tidak tersedia.`);
        }
        const base64 = await FileSystem.readAsStringAsync(method.qrisImageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const extension = method.qrisImageUri
          .split(/[?#]/)[0]
          .match(/\.([a-zA-Z0-9]+)$/)?.[1]
          ?.toLowerCase();
        const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
        const filename = `${method.name.replace(/[^a-zA-Z0-9_-]/g, '_') || 'qris'}.${mimeType === 'image/png' ? 'png' : 'jpg'}`;
        return { data: `data:${mimeType};base64,${base64}`, filename };
      }));

      await Share.open({
        message,
        title: `Tagihan ${bill.title}`,
        urls: attachments.map((attachment) => attachment.data),
        filenames: attachments.map((attachment) => attachment.filename),
        type: 'image/*',
        useInternalStorage: true,
        failOnCancel: false,
      });
    } catch (e) {
      console.warn('Gagal membagikan tagihan:', e);
      showCyberAlert('Gagal', 'Tidak dapat menyiapkan teks atau gambar QRIS untuk dibagikan.');
    }
  };

  const handleCopyText = async () => {
    const message = buildShareText();
    await Clipboard.setStringAsync(message);
    showCyberAlert('Tersalin!', 'Teks format WhatsApp berhasil disalin ke clipboard.');
  };

  const qrisMethods = paymentMethods.filter(
    (p) => p.type === 'qris' && p.qrisImageUri && selectedMethods.includes(p.id)
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Bagikan Tagihan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Pilih Metode Pembayaran yang Disertakan */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionHeader}>Metode Pembayaran</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.linkText}>+ Kelola / Tambah</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subHint}>
            Pilih satu atau lebih rekening/QRIS untuk dicantumkan di teks WhatsApp:
          </Text>

          {paymentMethods.length === 0 ? (
            <TouchableOpacity
              style={styles.noPaymentNotice}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.noPaymentText}>
                ⚠️ Belum ada rekening/QRIS terdaftar. Klik di sini untuk tambah.
              </Text>
            </TouchableOpacity>
          ) : (
            paymentMethods.map((pm) => {
              const isChecked = selectedMethods.includes(pm.id);
              return (
                <TouchableOpacity
                  key={pm.id}
                  style={[styles.paymentSelectRow, isChecked && styles.paymentSelectRowActive]}
                  onPress={() => toggleMethod(pm.id)}
                >
                  <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                    {isChecked && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.paymentName}>{pm.name}</Text>
                    {pm.accountNumber && (
                      <Text style={styles.paymentDetail}>
                        {pm.accountNumber} {pm.accountName ? `(a.n ${pm.accountName})` : ''}
                      </Text>
                    )}
                    {pm.type === 'qris' && (
                      <Text style={styles.paymentDetail}>⚡ Gambar QRIS Statis</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Jika ada QRIS terpilih, tampilkan preview untuk memudahkan scan */}
        {qrisMethods.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Preview QRIS Statis</Text>
            <Text style={styles.subHint}>Teman bisa langsung scan QRIS ini di layar HP Anda:</Text>
            <View style={styles.qrisGallery}>
              {qrisMethods.map((qm) => (
                <View key={qm.id} style={styles.qrisBox}>
                  <Image source={{ uri: qm.qrisImageUri }} style={styles.qrisImage} />
                  <Text style={styles.qrisLabel}>{qm.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Preview Teks Ringkasan */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Preview Teks WhatsApp / Medsos</Text>
          <View style={styles.textPreviewBox}>
            <Text style={styles.previewTextContent}>{buildShareText()}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.shareBtnPrimary} onPress={handleShareSystem}>
          <Text style={styles.shareBtnText}>🚀 Bagikan ke WhatsApp / Medsos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.copyBtnSecondary} onPress={handleCopyText}>
          <Text style={styles.copyBtnText}>📋 Salin Teks ke Clipboard</Text>
        </TouchableOpacity>
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
    marginBottom: 16,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#00F0FF', letterSpacing: 0.8, marginBottom: 4 },
  linkText: { color: '#38BDF8', fontSize: 12, fontWeight: '700' },
  subHint: { fontSize: 11, color: '#64748B', lineHeight: 16, marginBottom: 12 },
  noPaymentNotice: {
    padding: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAB308',
  },
  noPaymentText: { color: '#FDE047', fontSize: 11, fontWeight: '600' },
  paymentSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#070A10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 8,
  },
  paymentSelectRowActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#00F0FF',
    borderColor: '#00F0FF',
  },
  checkMark: {
    color: '#070A10',
    fontSize: 12,
    fontWeight: '900',
  },
  paymentName: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  paymentDetail: { color: '#64748B', fontSize: 11, marginTop: 2 },
  qrisGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  qrisBox: { alignItems: 'center' },
  qrisImage: { width: 140, height: 140, borderRadius: 8, borderWidth: 1, borderColor: '#00F0FF', backgroundColor: '#FFF' },
  qrisLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 4 },
  textPreviewBox: {
    backgroundColor: '#070A10',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  previewTextContent: { color: '#CBD5E1', fontSize: 11, lineHeight: 17, fontFamily: 'monospace' },
  shareBtnPrimary: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  shareBtnText: { color: '#070A10', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  copyBtnSecondary: {
    backgroundColor: '#0E1422',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  copyBtnText: { color: '#00F0FF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});

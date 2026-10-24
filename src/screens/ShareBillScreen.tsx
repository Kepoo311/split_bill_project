import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBillStore } from '../store/billStore';
import { RootStackParamList } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import Share from 'react-native-share';
import { CyberModal } from '../components/CyberModal';
import { TopBar } from '../components/TopBar';
import { colors } from '../theme';
import { formatNumber } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'ShareBill'>;

export const ShareBillScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bill } = route.params;
  const paymentMethods = useBillStore((s) => s.paymentMethods);
  const loadPaymentMethods = useBillStore((s) => s.loadPaymentMethods);
  // Semua metode terpilih secara default; state hanya mencatat yang di-skip
  // user — menghindari efek sinkronisasi derived state dari store.
  const [deselected, setDeselected] = useState<ReadonlySet<string>>(new Set());

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

  const toggleMethod = (id: string) => {
    setDeselected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
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
    msg += `💰 Total Tagihan: Rp ${formatNumber(bill.grandTotal)}\n`;
    if (bill.tax > 0) msg += `• Pajak: Rp ${formatNumber(bill.tax)}\n`;
    if (bill.service > 0) msg += `• Biaya Layanan: Rp ${formatNumber(bill.service)}\n`;
    if (bill.discount > 0) msg += `• Diskon / Promo: -Rp ${formatNumber(bill.discount)}\n`;
    msg += `--------------------------------\n\n`;

    msg += `*RINCIAN TIAP ORANG:*\n`;
    bill.results.forEach((res, i) => {
      const isPaid = bill.paidMemberIds?.includes(res.memberId);
      const status = isPaid ? ' [LUNAS ✅]' : '';
      msg += `${i + 1}. *${res.name}*: Rp ${formatNumber(res.totalBayar)}${status}\n`;
      msg += `   (Menu: Rp ${formatNumber(res.subtotal)}`;
      if (res.taxShare + res.serviceShare > 0) {
        msg += ` + Pajak/Svc: Rp ${formatNumber((res.taxShare + res.serviceShare))}`;
      }
      if (res.discountShare > 0) {
        msg += ` - Disc: Rp ${formatNumber(res.discountShare)}`;
      }
      msg += `)\n`;
    });

    const activePayments = paymentMethods.filter((p) => !deselected.has(p.id));
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
      // QRIS yang file gambarnya hilang di-skip, bukan menggagalkan share;
      // tanpa QRIS sama sekali cukup share teks (urls kosong membuat share
      // Android gagal).
      const attachments = (
        await Promise.all(
          qrisMethods.map(async (method) => {
            if (!method.qrisImageUri) return null;
            try {
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
            } catch {
              return null;
            }
          }),
        )
      ).filter((a): a is { data: string; filename: string } => a !== null);

      if (attachments.length === 0) {
        await Share.open({
          message,
          title: `Tagihan ${bill.title}`,
          failOnCancel: false,
        });
        return;
      }

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
    (p) => p.type === 'qris' && p.qrisImageUri && !deselected.has(p.id)
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Bagikan Tagihan"
        onBack={() => navigation.goBack()}
        right={<View style={{ width: 60 }} />}
      />

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
              const isChecked = !deselected.has(pm.id);
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
                  <Image
                    source={{ uri: qm.qrisImageUri }}
                    style={styles.qrisImage}
                    contentFit="cover"
                    transition={200}
                  />
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
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: colors.accent, letterSpacing: 0.8, marginBottom: 4 },
  linkText: { color: colors.info, fontSize: 12, fontWeight: '700' },
  subHint: { fontSize: 11, color: colors.textSubtle, lineHeight: 16, marginBottom: 12 },
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
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  paymentSelectRowActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(0, 240, 255, 0.05)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.textSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkMark: {
    color: colors.bg,
    fontSize: 12,
    fontWeight: '900',
  },
  paymentName: { color: colors.text, fontSize: 13, fontWeight: '700' },
  paymentDetail: { color: colors.textSubtle, fontSize: 11, marginTop: 2 },
  qrisGallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  qrisBox: { alignItems: 'center' },
  qrisImage: { width: 140, height: 140, borderRadius: 8, borderWidth: 1, borderColor: colors.accent, backgroundColor: '#FFF' },
  qrisLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 4 },
  textPreviewBox: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewTextContent: { color: '#CBD5E1', fontSize: 11, lineHeight: 17, fontFamily: 'monospace' },
  shareBtnPrimary: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  shareBtnText: { color: colors.bg, fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  copyBtnSecondary: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  copyBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
});

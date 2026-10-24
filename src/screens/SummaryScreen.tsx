import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useBillStore } from '../store/billStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCyberAlert } from '../hooks/useCyberAlert';
import { TopBar } from '../components/TopBar';
import { colors } from '../theme';
import { formatMonthDay, formatRupiah } from '../utils/format';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

export const SummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { items, members, results, subtotal, tax, service, discount = 0, grandTotal } = route.params;
  const saveBill = useBillStore((s) => s.saveBill);
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  const handleSaveAndShare = async (autoShare: boolean = false) => {
    try {
      const savedBill = await saveBill({
        title: `Tagihan ${formatMonthDay(new Date())}`,
        items,
        members,
        results,
        tax,
        service,
        discount,
        grandTotal,
      });

      if (autoShare) {
        navigation.navigate('ShareBill', { bill: savedBill });
      } else {
        showCyberAlert('Sukses', 'Riwayat tagihan berhasil disimpan offline!', [
          { text: 'Lihat Riwayat', onPress: () => navigation.navigate('Home') },
          { text: 'Bagikan Sekarang', onPress: () => navigation.navigate('ShareBill', { bill: savedBill }) },
        ]);
      }
    } catch {
      showCyberAlert('Gagal', 'Gagal menyimpan ke penyimpanan lokal.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Ringkasan Pembagian"
        onBack={() => navigation.goBack()}
        backLabel="← Edit"
        right={<View style={{ width: 60 }} />}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Ringkasan Keseluruhan Struk */}
        <View style={styles.grandCard}>
          <Text style={styles.grandCardLabel}>Total Tagihan Struk</Text>
          <Text style={styles.grandTotalText}>
            {formatRupiah(grandTotal)}
          </Text>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Subtotal Item</Text>
            <Text style={styles.breakdownVal}>{formatRupiah(subtotal)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Pajak</Text>
            <Text style={styles.breakdownVal}>{formatRupiah(tax)}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Biaya Layanan</Text>
            <Text style={styles.breakdownVal}>{formatRupiah(service)}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.rowBetween}>
              <Text style={[styles.breakdownLabel, { color: colors.success }]}>Diskon / Promo</Text>
              <Text style={[styles.breakdownVal, { color: colors.success }]}>- {formatRupiah(discount)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>Rincian Tiap Orang</Text>

        {/* Daftar Beban Tiap Anggota */}
        {results.map((res) => (
          <View key={res.memberId} style={styles.personCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.personName}>👤 {res.name}</Text>
              <Text style={styles.personTotal}>
                {formatRupiah(res.totalBayar)}
              </Text>
            </View>

            <View style={styles.innerBreakdown}>
              <Text style={styles.innerDetailText}>
                Subtotal Menu: {formatRupiah(res.subtotal)}
              </Text>
              <Text style={styles.innerDetailText}>
                Pajak + Service: {formatRupiah((res.taxShare + res.serviceShare))}
              </Text>
              {res.discountShare > 0 && (
                <Text style={[styles.innerDetailText, { color: colors.success }]}>
                  Diskon: - {formatRupiah(res.discountShare)}
                </Text>
              )}
            </View>
          </View>
        ))}

        <Pressable
          style={({ pressed }) => [styles.shareButton, pressed && styles.buttonPressed]}
          onPress={() => handleSaveAndShare(true)}
          accessibilityRole="button"
        >
          <Text style={styles.shareButtonText}>⚡ Simpan & Bagikan Tagihan</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.saveButton, pressed && styles.buttonPressed]}
          onPress={() => handleSaveAndShare(false)}
          accessibilityRole="button"
        >
          <Text style={styles.saveButtonText}>💾 Simpan ke Riwayat Saja</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.homeButton, pressed && styles.buttonPressed]}
          onPress={() => navigation.navigate('Home')}
          accessibilityRole="button"
        >
          <Text style={styles.homeButtonText}>Kembali ke Halaman Utama</Text>
        </Pressable>
      </ScrollView>
      {cyberAlertModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: { padding: 4 },
  backButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  screenTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 1 },
  scroll: { padding: 16 },
  grandCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  grandCardLabel: { color: colors.textDim, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
  grandTotalText: { color: colors.accent, fontSize: 32, fontWeight: '900', marginTop: 6, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { color: colors.textFaint, fontSize: 13, marginBottom: 4 },
  breakdownVal: { color: colors.text, fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12, letterSpacing: 0.5 },
  personCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  personName: { fontSize: 15, fontWeight: '700', color: colors.text },
  personTotal: { fontSize: 15, fontWeight: '800', color: colors.success },
  innerBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  innerDetailText: { fontSize: 11, color: colors.textDim },
  shareButton: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  shareButtonText: { color: colors.ink, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  saveButton: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonPressed: { opacity: 0.75 },
  saveButtonText: { color: colors.ink, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  homeButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  homeButtonText: { color: colors.textDim, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
});

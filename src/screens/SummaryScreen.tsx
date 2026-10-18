import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RootStackParamList } from '../types';
import { useBillStore } from '../store/billStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCyberAlert } from '../hooks/useCyberAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'Summary'>;

export const SummaryScreen: React.FC<Props> = ({ navigation, route }) => {
  const { items, members, results, subtotal, tax, service, discount = 0, grandTotal } = route.params;
  const { saveBill } = useBillStore();
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  const handleSaveAndShare = async (autoShare: boolean = false) => {
    try {
      const savedBill = await saveBill({
        title: `Tagihan ${new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}`,
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
    } catch (e) {
      showCyberAlert('Gagal', 'Gagal menyimpan ke penyimpanan lokal.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Edit</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Ringkasan Pembagian</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Ringkasan Keseluruhan Struk */}
        <View style={styles.grandCard}>
          <Text style={styles.grandCardLabel}>Total Tagihan Struk</Text>
          <Text style={styles.grandTotalText}>
            Rp {grandTotal.toLocaleString('id-ID')}
          </Text>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Subtotal Item</Text>
            <Text style={styles.breakdownVal}>Rp {subtotal.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Pajak</Text>
            <Text style={styles.breakdownVal}>Rp {tax.toLocaleString('id-ID')}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.breakdownLabel}>Biaya Layanan</Text>
            <Text style={styles.breakdownVal}>Rp {service.toLocaleString('id-ID')}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.rowBetween}>
              <Text style={[styles.breakdownLabel, { color: '#10B981' }]}>Diskon / Promo</Text>
              <Text style={[styles.breakdownVal, { color: '#10B981' }]}>- Rp {discount.toLocaleString('id-ID')}</Text>
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
                Rp {res.totalBayar.toLocaleString('id-ID')}
              </Text>
            </View>

            <View style={styles.innerBreakdown}>
              <Text style={styles.innerDetailText}>
                Subtotal Menu: Rp {res.subtotal.toLocaleString('id-ID')}
              </Text>
              <Text style={styles.innerDetailText}>
                Pajak + Service: Rp {(res.taxShare + res.serviceShare).toLocaleString('id-ID')}
              </Text>
              {res.discountShare > 0 && (
                <Text style={[styles.innerDetailText, { color: '#10B981' }]}>
                  Diskon: - Rp {res.discountShare.toLocaleString('id-ID')}
                </Text>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.shareButton} onPress={() => handleSaveAndShare(true)}>
          <Text style={styles.shareButtonText}>⚡ Simpan & Bagikan Tagihan</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveButton} onPress={() => handleSaveAndShare(false)}>
          <Text style={styles.saveButtonText}>💾 Simpan ke Riwayat Saja</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.homeButtonText}>Kembali ke Halaman Utama</Text>
        </TouchableOpacity>
      </ScrollView>
      {cyberAlertModal}
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
  screenTitle: { fontSize: 16, fontWeight: '800', color: '#F9FAFB', letterSpacing: 1 },
  scroll: { padding: 16 },
  grandCard: {
    backgroundColor: '#0E1422',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  grandCardLabel: { color: '#6B7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '700' },
  grandTotalText: { color: '#00F0FF', fontSize: 32, fontWeight: '900', marginTop: 6, letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  breakdownVal: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB', marginBottom: 12, letterSpacing: 0.5 },
  personCard: {
    backgroundColor: '#0E1422',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  personName: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  personTotal: { fontSize: 15, fontWeight: '800', color: '#10B981' },
  innerBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  innerDetailText: { fontSize: 11, color: '#6B7280' },
  shareButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  shareButtonText: { color: '#0A0A0F', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  saveButton: {
    backgroundColor: '#00F0FF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  saveButtonText: { color: '#0A0A0F', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  homeButton: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  homeButtonText: { color: '#6B7280', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 },
});

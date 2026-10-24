import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useBillStore } from '../store/billStore';
import { useCyberAlert } from '../hooks/useCyberAlert';

type Props = NativeStackScreenProps<RootStackParamList, 'HistoryDetail'>;

export const HistoryDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bill: initialBill } = route.params;
  // Selector per-field: screen hanya re-render saat data yang dipakai berubah
  const history = useBillStore((s) => s.history);
  const toggleMemberPayment = useBillStore((s) => s.toggleMemberPayment);
  const deleteBill = useBillStore((s) => s.deleteBill);
  const updateBillCategory = useBillStore((s) => s.updateBillCategory);
  const updateBillTitle = useBillStore((s) => s.updateBillTitle);
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  // Ambil state terkini dari store jika ada update
  const currentBill = history.find((b) => b.id === initialBill.id) || initialBill;
  const paidIds = currentBill.paidMemberIds || [];

  const totalMembers = currentBill.results?.length || 0;
  const paidCount = currentBill.results?.filter((r) => paidIds.includes(r.memberId)).length || 0;
  const isAllPaid = totalMembers > 0 && paidCount === totalMembers;

  const categories = ['Makanan', 'Nongkrong', 'Belanja', 'Lainnya'];

  const handleStartEditTitle = () => {
    setTitleDraft(currentBill.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    const cleanTitle = titleDraft.trim();
    if (!cleanTitle) {
      showCyberAlert('Nama Kosong', 'Isi nama transaksinya, atau tap Batal untuk membatalkan.');
      return;
    }
    if (cleanTitle !== currentBill.title) {
      await updateBillTitle(currentBill.id, cleanTitle);
    }
    setIsEditingTitle(false);
  };

  const handleDelete = () => {
    showCyberAlert(
      'Hapus Riwayat',
      'Yakin ingin menghapus arsip tagihan ini dari database lokal?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            await deleteBill(currentBill.id);
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top HUD Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Detail Transaksi</Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteTopBtn}>
          <Text style={styles.deleteTopText}>Hapus</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Main Header Card */}
        <View style={styles.mainCard}>
          <View style={styles.tagRow}>
            <View style={styles.hudBadge}>
              <Text style={styles.hudBadgeText}>ID #{currentBill.id.slice(-6)}</Text>
            </View>
            <View style={[styles.statusBadge, isAllPaid ? styles.paidBadge : styles.unpaidBadge]}>
              <Text style={[styles.statusBadgeText, isAllPaid ? styles.paidBadgeText : styles.unpaidBadgeText]}>
                {isAllPaid ? '✓ SEMUA LUNAS' : `${paidCount}/${totalMembers} TERBAYAR`}
              </Text>
            </View>
          </View>

          {isEditingTitle ? (
            <View style={styles.titleEditRow}>
              <TextInput
                style={styles.titleInput}
                value={titleDraft}
                onChangeText={setTitleDraft}
                placeholder="Nama transaksi, mis. Makan Tim Futsal"
                placeholderTextColor="#6B7280"
                maxLength={60}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveTitle}
              />
              <Pressable style={styles.titleSaveBtn} onPress={handleSaveTitle}>
                <Text style={styles.titleSaveText}>Simpan</Text>
              </Pressable>
              <Pressable
                style={styles.titleCancelBtn}
                onPress={() => setIsEditingTitle(false)}
              >
                <Text style={styles.titleCancelText}>Batal</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <Text style={styles.billTitle} numberOfLines={2}>
                {currentBill.title}
              </Text>
              <Pressable style={styles.titleEditBtn} onPress={handleStartEditTitle} hitSlop={8}>
                <Text style={styles.titleEditIcon}>✏️</Text>
              </Pressable>
            </View>
          )}
          <Text style={styles.billDate}>
            {new Date(currentBill.date).toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>

          <View style={styles.grandDivider} />

          <Text style={styles.grandLabel}>TOTAL TRANSAKSI</Text>
          <Text style={styles.grandValue}>Rp {currentBill.grandTotal.toLocaleString('id-ID')}</Text>

          {/* Breakdown summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Pajak</Text>
              <Text style={styles.gridVal}>Rp {currentBill.tax.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Service</Text>
              <Text style={styles.gridVal}>Rp {currentBill.service.toLocaleString('id-ID')}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Diskon</Text>
              <Text style={styles.gridVal}>-Rp {(currentBill.discount || 0).toLocaleString('id-ID')}</Text>
            </View>
          </View>

          {/* Kategori Selector */}
          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Kategori:</Text>
            <View style={styles.categoryChips}>
              {categories.map((c) => {
                const isSelected = (currentBill.category || 'Makanan') === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    onPress={() => updateBillCategory(currentBill.id, c)}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tombol Bagikan Langsung */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={() => navigation.navigate('ShareBill', { bill: currentBill })}
          >
            <Text style={styles.shareBtnText}>⚡ BAGIKAN KE WHATSAPP / MEDSOS</Text>
          </TouchableOpacity>
        </View>

        {/* Member Payment Status Checklist */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>STATUS PEMBAYARAN ANGGOTA</Text>
          <Text style={styles.sectionSubtitle}>Tap kotak untuk checklist</Text>
        </View>

        {currentBill.results.map((res) => {
          const isPaid = paidIds.includes(res.memberId);
          return (
            <TouchableOpacity
              key={res.memberId}
              activeOpacity={0.7}
              onPress={() => toggleMemberPayment(currentBill.id, res.memberId)}
              style={[styles.memberCard, isPaid && styles.memberCardPaid]}
            >
              <View style={styles.memberLeft}>
                <View style={[styles.checkbox, isPaid && styles.checkboxActive]}>
                  {isPaid ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <View style={{ marginLeft: 12 }}>
                  <Text style={[styles.memberName, isPaid && styles.memberNamePaid]}>
                    {res.name}
                  </Text>
                  <Text style={styles.memberShareDetail}>
                    Menu: Rp {res.subtotal.toLocaleString('id-ID')} + Extra: Rp {(res.taxShare + res.serviceShare).toLocaleString('id-ID')}
                  </Text>
                </View>
              </View>

              <View style={styles.memberRight}>
                <Text style={[styles.memberAmount, isPaid && styles.memberAmountPaid]}>
                  Rp {res.totalBayar.toLocaleString('id-ID')}
                </Text>
                <Text style={[styles.payStatusText, isPaid ? styles.textPaid : styles.textPending]}>
                  {isPaid ? 'LUNAS' : 'BELUM BAYAR'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Daftar Menu / Item */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>RINCIAN MENU STRUK</Text>
        </View>

        <View style={styles.itemsCard}>
          {currentBill.items.map((item, idx) => {
            const assignedNames = currentBill.members
              .filter((m) => item.assignedTo?.includes(m.id))
              .map((m) => m.name)
              .join(', ');

            return (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  idx < currentBill.items.length - 1 && styles.itemRowBorder,
                ]}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemName}>{item.nama_item}</Text>
                  {assignedNames ? (
                    <Text style={styles.itemAssigned}>👥 {assignedNames}</Text>
                  ) : (
                    <Text style={styles.itemUnassigned}>⚠️ Belum ditugaskan</Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>Rp {item.harga.toLocaleString('id-ID')}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
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
  deleteTopBtn: { padding: 4 },
  deleteTopText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  scroll: { padding: 16 },
  mainCard: {
    backgroundColor: '#0E1422',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudBadge: {
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hudBadgeText: { color: '#00F0FF', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981' },
  unpaidBadge: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: '#F59E0B' },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  paidBadgeText: { color: '#10B981' },
  unpaidBadgeText: { color: '#F59E0B' },
  billTitle: { fontSize: 20, fontWeight: '900', color: '#F9FAFB', marginTop: 12, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleEditBtn: {
    padding: 6,
    marginTop: 10,
    marginLeft: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
  },
  titleEditIcon: { fontSize: 13 },
  titleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  titleInput: {
    flex: 1,
    backgroundColor: '#070A10',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  titleSaveBtn: {
    backgroundColor: '#00F0FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleSaveText: { color: '#070A10', fontSize: 12, fontWeight: '800' },
  titleCancelBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  titleCancelText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  billDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  grandDivider: { height: 1, backgroundColor: '#1E293B', marginVertical: 14 },
  grandLabel: { fontSize: 11, color: '#6B7280', fontWeight: '700', letterSpacing: 1.5 },
  grandValue: { fontSize: 28, fontWeight: '900', color: '#00F0FF', marginTop: 4, letterSpacing: 0.5 },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  gridItem: { alignItems: 'center' },
  gridLabel: { fontSize: 11, color: '#6B7280' },
  gridVal: { fontSize: 13, fontWeight: '700', color: '#F9FAFB', marginTop: 2 },
  categoryRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#070A10',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  catChipSelected: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  catChipText: { fontSize: 11, color: '#64748B', fontWeight: '700' },
  catChipTextSelected: { color: '#00F0FF' },
  shareBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: { color: '#070A10', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#00F0FF', letterSpacing: 1 },
  sectionSubtitle: { fontSize: 11, color: '#6B7280' },
  memberCard: {
    backgroundColor: '#0E1422',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCardPaid: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#334155',
    backgroundColor: '#070A10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#10B981',
    backgroundColor: '#10B981',
  },
  checkmark: { color: '#0A0A0F', fontSize: 16, fontWeight: '900' },
  memberName: { fontSize: 15, fontWeight: '800', color: '#F9FAFB' },
  memberNamePaid: { color: '#E2E8F0' },
  memberShareDetail: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  memberRight: { alignItems: 'flex-end', marginLeft: 8 },
  memberAmount: { fontSize: 15, fontWeight: '900', color: '#00F0FF' },
  memberAmountPaid: { color: '#10B981' },
  payStatusText: { fontSize: 10, fontWeight: '800', marginTop: 3, letterSpacing: 0.5 },
  textPaid: { color: '#10B981' },
  textPending: { color: '#F59E0B' },
  itemsCard: {
    backgroundColor: '#0E1422',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  itemName: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  itemAssigned: { fontSize: 11, color: '#00F0FF', marginTop: 2 },
  itemUnassigned: { fontSize: 11, color: '#F59E0B', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: '#F9FAFB' },
});

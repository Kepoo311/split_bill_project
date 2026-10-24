import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useBillStore } from '../store/billStore';
import { useGroupStore } from '../store/groupStore';
import { useCyberAlert } from '../hooks/useCyberAlert';
import { TopBar } from '../components/TopBar';
import { CyberModal } from '../components/CyberModal';
import { colors } from '../theme';
import { mergeGroupMembers } from '../utils/groupBalance';
import { formatRupiah, formatDateLong } from '../utils/format';
import { AppText } from '../components/AppText';

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

  // Alur tambah-ke-grup
  const groups = useGroupStore((s) => s.groups);
  const createGroup = useGroupStore((s) => s.createGroup);
  const addBillToGroup = useGroupStore((s) => s.addBillToGroup);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [payerGroupId, setPayerGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');

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
      try {
        await updateBillTitle(currentBill.id, cleanTitle);
      } catch {
        showCyberAlert('Gagal Menyimpan', 'Nama transaksi tidak tersimpan. Coba lagi.');
        return;
      }
    }
    setIsEditingTitle(false);
  };

  // Semua mutasi store bisa gagal saat persist — kalau dilepas begitu saja,
  // error-nya hilang diam-diam dan UI seolah berhasil.
  const handleSetCategory = async (category: string) => {
    try {
      await updateBillCategory(currentBill.id, category);
    } catch {
      showCyberAlert('Gagal Menyimpan', 'Kategori tidak tersimpan. Coba lagi.');
    }
  };

  const handleTogglePayment = async (memberId: string) => {
    try {
      await toggleMemberPayment(currentBill.id, memberId);
    } catch {
      showCyberAlert('Gagal Menyimpan', 'Status pembayaran tidak tersimpan. Coba lagi.');
    }
  };

  const payerGroup = groups.find((g) => g.id === payerGroupId) ?? null;
  // Grup baru belum punya anggota (penggabungan terjadi di addBillToGroup),
  // jadi kandidat penalang = anggota grup saat ini + anggota struk ini.
  const payerCandidates = payerGroup
    ? mergeGroupMembers(payerGroup.members, currentBill.members)
    : [];

  const handleCreateAndAdd = async () => {
    const name = newGroupName.trim();
    if (!name) {
      showCyberAlert('Nama Kosong', 'Isi nama grupnya dulu.');
      return;
    }
    try {
      const group = await createGroup(name);
      setNewGroupName('');
      setShowGroupPicker(false);
      setPayerGroupId(group.id);
    } catch {
      showCyberAlert('Gagal', 'Grup baru tidak dapat dibuat. Coba lagi.');
    }
  };

  const handleAddToGroup = async (payerId: string | null) => {
    if (!payerGroupId) return;
    try {
      await addBillToGroup(payerGroupId, currentBill, payerId);
      const groupName = groups.find((g) => g.id === payerGroupId)?.name ?? 'grup';
      setPayerGroupId(null);
      showCyberAlert('Masuk Grup', `"${currentBill.title}" tercatat di grup "${groupName}".`);
    } catch {
      showCyberAlert('Gagal', 'Struk tidak dapat ditambahkan ke grup. Coba lagi.');
    }
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
            try {
              await deleteBill(currentBill.id);
              navigation.goBack();
            } catch {
              showCyberAlert('Gagal Menghapus', 'Riwayat tidak dapat dihapus. Coba lagi.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top HUD Bar */}
      <TopBar
        title="Detail Transaksi"
        onBack={() => navigation.goBack()}
        right={
          <Pressable onPress={handleDelete} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hapus riwayat">
            <AppText style={styles.deleteTopText}>Hapus</AppText>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Main Header Card */}
        <View style={styles.mainCard}>
          <View style={styles.tagRow}>
            <View style={styles.hudBadge}>
              <AppText style={styles.hudBadgeText}>ID #{currentBill.id.slice(-6)}</AppText>
            </View>
            <View style={[styles.statusBadge, isAllPaid ? styles.paidBadge : styles.unpaidBadge]}>
              <AppText style={[styles.statusBadgeText, isAllPaid ? styles.paidBadgeText : styles.unpaidBadgeText]}>
                {isAllPaid ? '✓ SEMUA LUNAS' : `${paidCount}/${totalMembers} TERBAYAR`}
              </AppText>
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
                <AppText style={styles.titleSaveText}>Simpan</AppText>
              </Pressable>
              <Pressable
                style={styles.titleCancelBtn}
                onPress={() => setIsEditingTitle(false)}
              >
                <AppText style={styles.titleCancelText}>Batal</AppText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.titleRow}>
              <AppText style={styles.billTitle} numberOfLines={2}>
                {currentBill.title}
              </AppText>
              <Pressable style={styles.titleEditBtn} onPress={handleStartEditTitle} hitSlop={8}>
                <AppText style={styles.titleEditIcon}>✏️</AppText>
              </Pressable>
            </View>
          )}
          <AppText style={styles.billDate}>
            {formatDateLong(currentBill.date)}
          </AppText>

          <View style={styles.grandDivider} />

          <AppText style={styles.grandLabel}>Total Transaksi</AppText>
          <AppText style={styles.grandValue}>{formatRupiah(currentBill.grandTotal)}</AppText>

          {/* Breakdown summary */}
          <View style={styles.summaryGrid}>
            <View style={styles.gridItem}>
              <AppText style={styles.gridLabel}>Pajak</AppText>
              <AppText style={styles.gridVal}>{formatRupiah(currentBill.tax)}</AppText>
            </View>
            <View style={styles.gridItem}>
              <AppText style={styles.gridLabel}>Service</AppText>
              <AppText style={styles.gridVal}>{formatRupiah(currentBill.service)}</AppText>
            </View>
            <View style={styles.gridItem}>
              <AppText style={styles.gridLabel}>Diskon</AppText>
              <AppText style={styles.gridVal}>-{formatRupiah((currentBill.discount || 0))}</AppText>
            </View>
          </View>

          {/* Kategori Selector */}
          <View style={styles.categoryRow}>
            <AppText style={styles.categoryLabel}>Kategori:</AppText>
            <View style={styles.categoryChips}>
              {categories.map((c) => {
                const isSelected = (currentBill.category || 'Makanan') === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    onPress={() => handleSetCategory(c)}
                  >
                    <AppText style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {c}
                    </AppText>
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
            <AppText style={styles.shareBtnText}>Bagikan ke WhatsApp / Medsos</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addToGroupBtn}
            onPress={() => setShowGroupPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Tambahkan struk ini ke grup patungan"
          >
            <AppText style={styles.addToGroupBtnText}>Tambahkan ke Grup Patungan</AppText>
          </TouchableOpacity>
        </View>

        {/* Member Payment Status Checklist */}
        <View style={styles.sectionHeaderRow}>
          <AppText style={styles.sectionTitle}>Status Pembayaran Anggota</AppText>
          <AppText style={styles.sectionSubtitle}>Tap kotak untuk checklist</AppText>
        </View>

        {currentBill.results.map((res) => {
          const isPaid = paidIds.includes(res.memberId);
          return (
            <TouchableOpacity
              key={res.memberId}
              activeOpacity={0.7}
              onPress={() => handleTogglePayment(res.memberId)}
              style={[styles.memberCard, isPaid && styles.memberCardPaid]}
            >
              <View style={styles.memberLeft}>
                <View style={[styles.checkbox, isPaid && styles.checkboxActive]}>
                  {isPaid ? <AppText style={styles.checkmark}>✓</AppText> : null}
                </View>
                <View style={{ marginLeft: 12 }}>
                  <AppText style={[styles.memberName, isPaid && styles.memberNamePaid]}>
                    {res.name}
                  </AppText>
                  <AppText style={styles.memberShareDetail}>
                    Menu: {formatRupiah(res.subtotal)} + Extra: {formatRupiah((res.taxShare + res.serviceShare))}
                  </AppText>
                </View>
              </View>

              <View style={styles.memberRight}>
                <AppText style={[styles.memberAmount, isPaid && styles.memberAmountPaid]}>
                  {formatRupiah(res.totalBayar)}
                </AppText>
                <AppText style={[styles.payStatusText, isPaid ? styles.textPaid : styles.textPending]}>
                  {isPaid ? 'LUNAS' : 'BELUM BAYAR'}
                </AppText>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Daftar Menu / Item */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <AppText style={styles.sectionTitle}>Rincian Menu Struk</AppText>
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
                  <AppText style={styles.itemName}>{item.nama_item}</AppText>
                  {assignedNames ? (
                    <AppText style={styles.itemAssigned}>{assignedNames}</AppText>
                  ) : (
                    <AppText style={styles.itemUnassigned}>Belum ditugaskan</AppText>
                  )}
                </View>
                <AppText style={styles.itemPrice}>{formatRupiah(item.harga)}</AppText>
              </View>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      {/* Pilih grup tujuan */}
      <CyberModal
        visible={showGroupPicker}
        title="Tambah ke Grup"
        message="Struk ini ikut dihitung dalam saldo grup yang dipilih."
        onClose={() => setShowGroupPicker(false)}
        buttons={[{ text: 'Tutup', style: 'cancel' }]}
      >
        {groups.map((g) => (
          <TouchableOpacity
            key={g.id}
            style={styles.groupPickerRow}
            onPress={() => {
              setShowGroupPicker(false);
              setPayerGroupId(g.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Tambah ke grup ${g.name}`}
          >
            <AppText style={styles.groupPickerTitle} numberOfLines={1}>
              {g.name}
            </AppText>
            <AppText style={styles.groupPickerMeta}>
              {g.members.length} anggota • {g.entries.length} struk
            </AppText>
          </TouchableOpacity>
        ))}
        <TextInput
          style={styles.groupPickerInput}
          placeholder="atau buat grup baru, mis. Kosan"
          placeholderTextColor={colors.textDim}
          value={newGroupName}
          onChangeText={setNewGroupName}
          maxLength={40}
        />
        <TouchableOpacity style={styles.groupPickerCreate} onPress={handleCreateAndAdd}>
          <AppText style={styles.addToGroupBtnText}>＋ Buat Grup Baru</AppText>
        </TouchableOpacity>
      </CyberModal>

      {/* Pilih siapa yang nalangin struk ini */}
      <CyberModal
        visible={payerGroup !== null}
        title="SIAPA YANG NALANGIN?"
        message={`Untuk "${currentBill.title}" — menentukan siapa yang berhak menerima uang di grup ${payerGroup?.name ?? ''}.`}
        onClose={() => setPayerGroupId(null)}
        buttons={[{ text: 'Batal', style: 'cancel' }]}
      >
        {payerCandidates.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.groupPickerRow}
            onPress={() => handleAddToGroup(m.id)}
          >
            <AppText style={styles.groupPickerTitle}>{m.name}</AppText>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.groupPickerRow, { borderColor: colors.line, borderStyle: 'dashed' }]}
          onPress={() => handleAddToGroup(null)}
        >
          <AppText style={[styles.groupPickerTitle, { color: colors.textDim }]}>
            Tidak dicatat (bayar masing-masing)
          </AppText>
        </TouchableOpacity>
      </CyberModal>

      {cyberAlertModal}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  deleteTopText: { color: colors.danger, fontSize: 13, fontWeight: '700' },
  scroll: { padding: 16 },
  mainCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  tagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hudBadge: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hudBadgeText: { color: colors.accent, fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidBadge: { backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success },
  unpaidBadge: { backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning },
  statusBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },
  paidBadgeText: { color: colors.success },
  unpaidBadgeText: { color: colors.warning },
  billTitle: { fontSize: 20, fontWeight: '900', color: colors.text, marginTop: 12, flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleEditBtn: {
    padding: 6,
    marginTop: 10,
    marginLeft: 6,
    backgroundColor: 'rgba(212, 160, 23, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  titleEditIcon: { fontSize: 13 },
  titleEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  titleInput: {
    fontFamily: 'IBMPlexSans_700Bold',
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  titleSaveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  titleSaveText: { color: colors.bg, fontSize: 12, fontWeight: '800' },
  titleCancelBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  titleCancelText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  billDate: { fontSize: 12, color: colors.textDim, marginTop: 2 },
  grandDivider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  grandLabel: { fontSize: 11, color: colors.textDim, fontWeight: '700', letterSpacing: 0.4 },
  grandValue: { fontSize: 28, fontWeight: '900', color: colors.accent, marginTop: 4, letterSpacing: 0.2 },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  gridItem: { alignItems: 'center' },
  gridLabel: { fontSize: 11, color: colors.textDim },
  gridVal: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 2 },
  categoryRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryLabel: { fontSize: 11, fontWeight: '700', color: colors.textSubtle },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 },
  catChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  catChipText: { fontSize: 11, color: colors.textSubtle, fontWeight: '700' },
  catChipTextSelected: { color: colors.accent },
  shareBtn: {
    backgroundColor: colors.success,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnText: { color: colors.bg, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  addToGroupBtn: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  addToGroupBtnText: { color: colors.accent, fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
  groupPickerRow: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  groupPickerTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  groupPickerMeta: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  groupPickerInput: {
    fontFamily: 'IBMPlexSans_400Regular',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.text,
    marginBottom: 8,
  },
  groupPickerCreate: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.accent, letterSpacing: 0.3 },
  sectionSubtitle: { fontSize: 11, color: colors.textDim },
  memberCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberCardPaid: {
    borderColor: colors.successBorder,
    backgroundColor: 'rgba(52, 211, 153, 0.06)',
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  checkmark: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  memberName: { fontSize: 15, fontWeight: '800', color: colors.text },
  memberNamePaid: { color: '#CBD5E1' },
  memberShareDetail: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  memberRight: { alignItems: 'flex-end', marginLeft: 8 },
  memberAmount: { fontSize: 15, fontWeight: '900', color: colors.accent },
  memberAmountPaid: { color: colors.success },
  payStatusText: { fontSize: 10, fontWeight: '800', marginTop: 3, letterSpacing: 0.2 },
  textPaid: { color: colors.success },
  textPending: { color: colors.warning },
  itemsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemName: { fontSize: 13, fontWeight: '700', color: colors.text },
  itemAssigned: { fontSize: 11, color: colors.accent, marginTop: 2 },
  itemUnassigned: { fontSize: 11, color: colors.warning, marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '800', color: colors.text },
});

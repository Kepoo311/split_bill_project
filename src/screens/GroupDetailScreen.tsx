import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { RootStackParamList, BillHistory } from '../types';
import { TopBar } from '../components/TopBar';
import { CyberModal } from '../components/CyberModal';
import { useGroupStore } from '../store/groupStore';
import { useBillStore } from '../store/billStore';
import { computeGroupTotals, mergeGroupMembers } from '../utils/groupBalance';
import { formatRupiah, formatDateShortTime } from '../utils/format';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'GroupDetail'>;

const persistProofImage = async (uri: string): Promise<string> => {
  if (!FileSystem.documentDirectory) {
    throw new Error('Penyimpanan lokal tidak tersedia.');
  }
  const extension = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'jpg';
  const destination = `${FileSystem.documentDirectory}proof-${Date.now()}.${extension}`;
  await FileSystem.copyAsync({ from: uri, to: destination });
  return destination;
};

export const GroupDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const groups = useGroupStore((s) => s.groups);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const addBillToGroup = useGroupStore((s) => s.addBillToGroup);
  const removeEntry = useGroupStore((s) => s.removeEntry);
  const settleMember = useGroupStore((s) => s.settleMember);
  const unsettleMember = useGroupStore((s) => s.unsettleMember);
  const history = useBillStore((s) => s.history);
  const loadHistory = useBillStore((s) => s.loadHistory);

  const [activeMemberId, setActiveMemberId] = useState<string | null>(null);
  const [pickingBill, setPickingBill] = useState<BillHistory | null>(null);
  const [showBillPicker, setShowBillPicker] = useState(false);
  const [showProof, setShowProof] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadGroups();
    loadHistory();
  }, [loadGroups, loadHistory]);

  const group = groups.find((g) => g.id === groupId);
  const billsById = useMemo(
    () => new Map(history.map((b) => [b.id, b])),
    [history],
  );
  const totals = useMemo(
    () => (group ? computeGroupTotals(group, billsById) : null),
    [group, billsById],
  );

  const fail = useCallback((msg: string) => {
    setAlertMsg(msg);
    setShowAlert(true);
  }, []);

  if (!group || !totals) {
    return (
      <SafeAreaView style={styles.container}>
        <TopBar title="Grup" onBack={() => navigation.goBack()} />
        <View style={styles.missingBox}>
          <Text style={styles.missingText}>Grup tidak ditemukan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const activeMember = group.members.find((m) => m.id === activeMemberId) ?? null;
  // Grup kosong belum punya anggota (penggabungan terjadi di addBillToGroup),
  // jadi kandidat penalang = anggota grup + anggota struk yang dipilih.
  const payerCandidates = pickingBill
    ? mergeGroupMembers(group.members, pickingBill.members)
    : [];
  const activeSettlement = activeMemberId ? group.settlements[activeMemberId] : undefined;
  const candidateBills = history.filter(
    (b) => !group.entries.some((e) => e.billId === b.id),
  );

  const handleSettle = async (withProof: boolean) => {
    if (!activeMemberId) return;
    try {
      let proofUri: string | undefined;
      if (withProof) {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          fail('Izinkan akses galeri untuk melampirkan bukti transfer.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
        if (res.canceled || !res.assets?.length) return;
        proofUri = await persistProofImage(res.assets[0].uri);
      }
      await settleMember(groupId, activeMemberId, proofUri);
      setActiveMemberId(null);
    } catch {
      fail('Gagal menyimpan status lunas. Coba lagi.');
    }
  };

  const handleUnsettle = async () => {
    if (!activeMemberId) return;
    try {
      await unsettleMember(groupId, activeMemberId);
      setActiveMemberId(null);
    } catch {
      fail('Gagal membatalkan status lunas.');
    }
  };

  const handleAddBill = async (payerId: string | null) => {
    if (!pickingBill) return;
    try {
      await addBillToGroup(groupId, pickingBill, payerId);
      setPickingBill(null);
      setShowBillPicker(false);
    } catch {
      fail('Struk gagal ditambahkan ke grup. Coba lagi.');
    }
  };

  const handleRemoveEntry = async (billId: string) => {
    try {
      await removeEntry(groupId, billId);
    } catch {
      fail('Struk gagal dikeluarkan dari grup.');
    }
  };

  const payerName = (payerId: string | null) => {
    if (!payerId) return 'Tidak dicatat';
    const member = group.members.find((m) => m.id === payerId);
    return member ? member.name : 'Tidak dicatat';
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title={group.name} onBack={() => navigation.goBack()} />

      <FlatList
        data={totals.balances}
        keyExtractor={(b) => b.memberId}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>TOTAL BELANJA GRUP</Text>
              <Text style={styles.summaryValue}>{formatRupiah(totals.totalSpent)}</Text>
              <Text style={styles.summaryMeta}>
                {group.entries.length} struk • {group.members.length} anggota
              </Text>
              {totals.unattributedCount > 0 && (
                <Text style={styles.summaryWarn}>
                  ⚠️ {totals.unattributedCount} struk tanpa pencatat penalang —
                  tidak masuk perhitungan saling-nalangin.
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>SALDO ANGGOTA</Text>
            <Text style={styles.sectionHint}>
              + diterima • − berutang • tap anggota untuk tandai lunas (bukti TF opsional)
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const settlement = group.settlements[item.memberId];
          return (
            <Pressable
              style={({ pressed }) => [
                styles.memberCard,
                settlement && styles.memberCardSettled,
                pressed && styles.cardPressed,
              ]}
              onPress={() => setActiveMemberId(item.memberId)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, saldo ${formatRupiah(item.balance)}${settlement ? ', sudah lunas' : ''}`}
            >
              {settlement?.proofUri ? (
                <Image
                  source={{ uri: settlement.proofUri }}
                  style={styles.proofThumb}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.memberName}>{item.name}</Text>
                {settlement ? (
                  <Text style={styles.settledText}>✓ Lunas {settlement.proofUri ? '• ada bukti TF' : ''}</Text>
                ) : (
                  <Text
                    style={[
                      styles.balanceText,
                      item.balance > 0
                        ? styles.balancePositive
                        : item.balance < 0
                          ? styles.balanceNegative
                          : styles.balanceZero,
                    ]}
                  >
                    {item.balance > 0
                      ? `+${formatRupiah(item.balance)}`
                      : item.balance < 0
                        ? `−${formatRupiah(Math.abs(item.balance))}`
                        : 'Impas'}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View>
            <Text style={[styles.sectionTitle, { marginTop: 22 }]}>STRUK DI GRUP INI</Text>
            {group.entries.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Belum ada struk di grup ini</Text>
              </View>
            )}
            {group.entries.map((entry) => {
              const bill = billsById.get(entry.billId);
              if (!bill) {
                return (
                  <View key={entry.billId} style={styles.billRow}>
                    <Text style={styles.billTitle}>Struk sudah terhapus dari riwayat</Text>
                  </View>
                );
              }
              return (
                <View key={entry.billId} style={styles.billRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.billTitle} numberOfLines={1}>{bill.title}</Text>
                    <Text style={styles.billMeta}>
                      {formatDateShortTime(bill.date)} • Nalangin: {payerName(entry.payerId)}
                    </Text>
                    <Text style={styles.billAmount}>{formatRupiah(bill.grandTotal)}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveEntry(entry.billId)}
                    style={styles.removeBtn}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Keluarkan ${bill.title} dari grup`}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
            <TouchableOpacity
              style={styles.addBillBtn}
              onPress={() => setShowBillPicker(true)}
              accessibilityRole="button"
              accessibilityLabel="Tambahkan struk dari riwayat"
            >
              <Text style={styles.addBillBtnText}>＋ Tambahkan Struk dari Riwayat</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </View>
        }
      />

      {/* Aksi anggota: lunas + bukti opsional */}
      <CyberModal
        visible={activeMember !== null}
        title={activeMember?.name.toUpperCase() ?? ''}
        message={
          activeSettlement
            ? 'Sudah ditandai lunas. Bukti transfer bisa dilihat atau diganti, atau batalkan statusnya.'
            : 'Tandai lunas — lampirkan bukti transfer sifatnya OPSIONAL.'
        }
        onClose={() => setActiveMemberId(null)}
        buttons={[
          ...(activeSettlement
            ? [
                {
                  text: activeSettlement.proofUri ? 'Lihat Bukti' : 'Lampirkan Bukti',
                  onPress: () => {
                    if (activeSettlement.proofUri) {
                      setShowProof(activeSettlement.proofUri);
                    } else {
                      handleSettle(true);
                    }
                  },
                },
                { text: 'Batalkan Lunas', style: 'destructive' as const, onPress: handleUnsettle },
              ]
            : [
                { text: '✓ Lunas (tanpa bukti)', onPress: () => handleSettle(false) },
                { text: '📸 Lunas + Bukti TF', onPress: () => handleSettle(true) },
              ]),
          { text: 'Tutup', style: 'cancel' as const },
        ]}
      />

      {/* Pilih struk dari riwayat */}
      <CyberModal
        visible={showBillPicker}
        title="TAMBAH STRUK"
        message={candidateBills.length === 0 ? 'Semua struk riwayat sudah masuk grup ini.' : 'Pilih struk:'}
        onClose={() => setShowBillPicker(false)}
        buttons={[{ text: 'Tutup', style: 'cancel' }]}
      >
        {candidateBills.slice(0, 10).map((b) => (
          <TouchableOpacity
            key={b.id}
            style={styles.pickerRow}
            onPress={() => setPickingBill(b)}
            accessibilityRole="button"
            accessibilityLabel={`Pilih ${b.title}`}
          >
            <Text style={styles.pickerTitle} numberOfLines={1}>{b.title}</Text>
            <Text style={styles.pickerMeta}>
              {formatDateShortTime(b.date)} • {formatRupiah(b.grandTotal)}
            </Text>
          </TouchableOpacity>
        ))}
      </CyberModal>

      {/* Pilih siapa yang nalangin */}
      <CyberModal
        visible={pickingBill !== null}
        title="SIAPA YANG NALANGIN?"
        message={`Untuk "${pickingBill?.title ?? ''}" — menentukan siapa yang berhak menerima uang.`}
        onClose={() => setPickingBill(null)}
        buttons={[{ text: 'Batal', style: 'cancel' }]}
      >
        {payerCandidates.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.pickerRow}
            onPress={() => handleAddBill(m.id)}
            accessibilityRole="button"
            accessibilityLabel={`${m.name} yang menalangi`}
          >
            <Text style={styles.pickerTitle}>{m.name}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.pickerRow, styles.pickerRowGhost]}
          onPress={() => handleAddBill(null)}
          accessibilityRole="button"
          accessibilityLabel="Tidak dicatat siapa penalang"
        >
          <Text style={[styles.pickerTitle, { color: colors.textDim }]}>
            Tidak dicatat (bayar masing-masing)
          </Text>
        </TouchableOpacity>
      </CyberModal>

      {/* Penampil bukti transfer */}
      <Modal visible={showProof !== null} transparent onRequestClose={() => setShowProof(null)}>
        <Pressable style={styles.proofBackdrop} onPress={() => setShowProof(null)}>
          {showProof && (
            <Image
              source={{ uri: showProof }}
              style={styles.proofFull}
              contentFit="contain"
              transition={150}
            />
          )}
          <Text style={styles.proofHint}>Tap di mana saja untuk menutup</Text>
        </Pressable>
      </Modal>

      <CyberModal
        visible={showAlert}
        title="GAGAL"
        message={alertMsg}
        onClose={() => setShowAlert(false)}
        buttons={[{ text: 'OK' }]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 20 },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 18,
    marginBottom: 20,
  },
  summaryLabel: { fontSize: 10, color: colors.textDim, fontWeight: '700', letterSpacing: 1.5 },
  summaryValue: { fontSize: 26, fontWeight: '900', color: colors.accent, marginTop: 4 },
  summaryMeta: { fontSize: 11, color: colors.textDim, marginTop: 6 },
  summaryWarn: { fontSize: 10, color: colors.warning, marginTop: 8, lineHeight: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: colors.accent, letterSpacing: 1 },
  sectionHint: { fontSize: 10, color: colors.textDim, marginTop: 4, marginBottom: 10 },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    minHeight: 64,
  },
  memberCardSettled: { borderColor: colors.successBorder, backgroundColor: 'rgba(16, 185, 129, 0.05)' },
  cardPressed: { borderColor: colors.accentBorder },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '900', fontSize: 15 },
  proofThumb: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: colors.successBorder },
  memberName: { fontSize: 14, fontWeight: '800', color: colors.text },
  balanceText: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  balancePositive: { color: colors.success },
  balanceNegative: { color: colors.warning },
  balanceZero: { color: colors.textDim },
  settledText: { fontSize: 11, color: colors.success, fontWeight: '700', marginTop: 2 },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  billTitle: { fontSize: 13, fontWeight: '800', color: colors.text },
  billMeta: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  billAmount: { fontSize: 12, fontWeight: '800', color: colors.accent, marginTop: 4 },
  removeBtn: {
    padding: 8,
    backgroundColor: colors.dangerSoft,
    borderRadius: 8,
    marginLeft: 8,
  },
  removeBtnText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  addBillBtn: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  addBillBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  emptyBox: {
    padding: 18,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: { color: colors.textDim, fontSize: 12 },
  missingBox: { padding: 32, alignItems: 'center' },
  missingText: { color: colors.textDim, fontSize: 13 },
  pickerRow: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  pickerRowGhost: { borderColor: colors.line, borderStyle: 'dashed' },
  pickerTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  pickerMeta: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  proofBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 10, 16, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  proofFull: { width: '100%', height: '80%' },
  proofHint: { color: colors.textDim, fontSize: 11, marginTop: 16 },
});

import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BillItem, Member, RootStackParamList } from '../types';
import { calculateSplit } from '../utils/calculateSplit';
import { generateId } from '../utils/ids';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCyberAlert } from '../hooks/useCyberAlert';
import { colors } from '../theme';
import { formatRupiah } from '../utils/format';
import { AppText } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Split'>;

export const SplitScreen: React.FC<Props> = ({ navigation, route }) => {
  const initialItems: BillItem[] = route.params?.items || [];
  const initialTaxValue = route.params?.initialTax ?? 0;
  const initialTaxType = route.params?.initialTaxType ?? 'nominal';
  const initialService = route.params?.initialService ?? 0;
  const initialDiscount = route.params?.initialDiscount ?? 0;

  const [items, setItems] = useState<BillItem[]>(
    initialItems.map((it) => ({ ...it, assignedTo: it.assignedTo || [] }))
  );
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Saya' },
  ]);
  const [newMemberName, setNewMemberName] = useState('');
  const [taxMode, setTaxMode] = useState<'percent' | 'nominal'>(initialTaxType);
  const [taxValue, setTaxValue] = useState(`${initialTaxValue}`);
  const [serviceCharge, setServiceCharge] = useState(`${initialService}`);
  const [discountAmount, setDiscountAmount] = useState(`${initialDiscount}`);
  const { showCyberAlert, cyberAlertModal } = useCyberAlert();

  const addMember = () => {
    const trimmed = newMemberName.trim();
    if (!trimmed) return;
    if (members.some((m) => m.name.toLowerCase() === trimmed.toLowerCase())) {
      showCyberAlert('Nama Sudah Ada', 'Gunakan nama atau inisial lain.');
      return;
    }
    setMembers((prev) => [...prev, { id: generateId(), name: trimmed }]);
    setNewMemberName('');
  };

  const removeMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        assignedTo: it.assignedTo?.filter((id) => id !== memberId) || [],
      }))
    );
  };

  const toggleAssign = (itemId: string, memberId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const assigned = item.assignedTo || [];
        const exists = assigned.includes(memberId);
        return {
          ...item,
          assignedTo: exists
            ? assigned.filter((id) => id !== memberId)
            : [...assigned, memberId],
        };
      })
    );
  };

  const handleProceed = () => {
    if (members.length === 0) {
      showCyberAlert('Perhatian', 'Tambahkan minimal 1 anggota.');
      return;
    }

    const unassignedItems = items.filter((it) => !it.assignedTo || it.assignedTo.length === 0);
    if (unassignedItems.length > 0) {
      showCyberAlert(
        'Item Belum Ditugaskan',
        `Ada ${unassignedItems.length} menu belum dipilih siapa pun. Menu itu akan dibagi rata ke semua anggota. Lanjut?`,
        [
          { text: 'Batal', style: 'cancel' },
          { text: 'Lanjut', onPress: calculateAndNavigate },
        ]
      );
      return;
    }

    calculateAndNavigate();
  };

  const calculateAndNavigate = () => {
    // Mode nominal wajib dibersihkan dari pemisah ribuan: "12.000" bukan 12 rupiah.
    const parsedTaxValue =
      parseFloat(
        taxMode === 'percent' ? taxValue.replace(',', '.') : taxValue.replace(/[^0-9]/g, '')
      ) || 0;
    const parsedService = parseFloat(serviceCharge.replace(/[^0-9]/g, '')) || 0;
    const parsedDiscount = parseFloat(discountAmount.replace(/[^0-9]/g, '')) || 0;

        const subtotalCheck = items.reduce((acc, it) => acc + it.harga, 0);
        const nominalTax =
          taxMode === 'percent' ? (subtotalCheck * parsedTaxValue) / 100 : parsedTaxValue;
        if (parsedDiscount > subtotalCheck + nominalTax + parsedService) {
          showCyberAlert(
            'Diskon Terlalu Besar',
            'Nilai diskon melebihi total tagihan (subtotal + pajak + service).'
          );
          return;
        }

        const taxConfig = { type: taxMode, value: parsedTaxValue };

        const { results, subtotal, totalTax, totalService, totalDiscount, grandTotal } = calculateSplit(
      items,
      members,
      taxConfig,
      parsedService,
      parsedDiscount
    );

    navigation.navigate('Summary', {
      items,
      members,
      results,
      subtotal,
      tax: totalTax,
      service: totalService,
      discount: totalDiscount,
      grandTotal,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <AppText style={styles.backButtonText}>← Kembali</AppText>
        </TouchableOpacity>
        <AppText style={styles.screenTitle}>Bagi & Tugaskan</AppText>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tambah Anggota */}
        <View style={styles.card}>
          <AppText style={styles.sectionHeader}>Daftar Teman Patungan</AppText>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ketik nama teman..."
              placeholderTextColor="#6B7280"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />
            <TouchableOpacity style={styles.buttonAdd} onPress={addMember}>
              <AppText style={styles.buttonAddText}>Tambah</AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.chipWrapper}>
            {members.map((m) => (
              <View key={m.id} style={styles.chipMember}>
                <AppText style={styles.chipMemberText}>{m.name}</AppText>
                {members.length > 1 && (
                  <TouchableOpacity onPress={() => removeMember(m.id)}>
                    <Ionicons name="close" size={13} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Daftar Item */}
        <AppText style={styles.sectionHeaderTitle}>Tugaskan Menu ke Orang</AppText>
        <AppText style={styles.sectionSubhint}>Jika dipilih 2+ orang, harga otomatis dibagi rata.</AppText>

        {items.map((item) => {
          const shareCount = item.assignedTo?.length || 0;
          const sharePrice = shareCount > 0 ? Math.round(item.harga / shareCount) : item.harga;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <AppText style={styles.itemName}>{item.nama_item}</AppText>
                  {shareCount > 1 && (
                    <AppText style={styles.splitIndicator}>
                      Dibagi {shareCount} orang: @{formatRupiah(sharePrice)}
                    </AppText>
                  )}
                </View>
                <AppText style={styles.itemPrice}>
                  {formatRupiah(item.harga)}
                </AppText>
              </View>

              <View style={styles.chipWrapper}>
                {members.map((m) => {
                  const isSelected = item.assignedTo?.includes(m.id);
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => toggleAssign(item.id, m.id)}
                      style={[styles.chipSelectable, isSelected && styles.chipActive]}
                    >
                      <AppText
                        style={[
                          styles.chipTextSelectable,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {m.name}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Pajak dan Service Charge */}
        <View style={styles.card}>
          <AppText style={styles.sectionHeader}>Biaya Tambahan</AppText>
          <View style={styles.rowBetween}>
            <View>
              <AppText style={styles.labelTitle}>Pajak (Tax / PB1 / PPN)</AppText>
              <View style={styles.taxModeToggle}>
                <TouchableOpacity
                  style={[styles.taxModeBtn, taxMode === 'nominal' && styles.taxModeBtnActive]}
                  onPress={() => setTaxMode('nominal')}
                >
                  <AppText style={[styles.taxModeBtnText, taxMode === 'nominal' && styles.taxModeBtnTextActive]}>
                    Rp (Nominal)
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.taxModeBtn, taxMode === 'percent' && styles.taxModeBtnActive]}
                  onPress={() => setTaxMode('percent')}
                >
                  <AppText style={[styles.taxModeBtnText, taxMode === 'percent' && styles.taxModeBtnTextActive]}>
                    % (Persen)
                  </AppText>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.percentInputWrap}>
              {taxMode === 'nominal' && <AppText style={styles.inputUnit}>Rp</AppText>}
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={taxValue}
                onChangeText={setTaxValue}
                placeholder="0"
                placeholderTextColor="#6B7280"
              />
              {taxMode === 'percent' && <AppText style={styles.inputUnit}>%</AppText>}
            </View>
          </View>

          <View style={[styles.rowBetween, { marginTop: 14 }]}>
            <View>
              <AppText style={styles.labelTitle}>Biaya Layanan (Service)</AppText>
              <AppText style={styles.labelSub}>Nominal flat</AppText>
            </View>
            <View style={styles.percentInputWrap}>
              <AppText style={styles.inputUnit}>Rp</AppText>
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={serviceCharge}
                onChangeText={setServiceCharge}
                placeholder="0"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>

          <View style={[styles.rowBetween, { marginTop: 14 }]}>
            <View>
              <AppText style={styles.labelTitle}>Diskon / Promo / Voucher</AppText>
              <AppText style={styles.labelSub}>Potongan flat</AppText>
            </View>
            <View style={styles.percentInputWrap}>
              <AppText style={styles.inputUnit}>Rp</AppText>
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={discountAmount}
                onChangeText={setDiscountAmount}
                placeholder="0"
                placeholderTextColor="#6B7280"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleProceed}>
          <AppText style={styles.buttonPrimaryText}>Lihat Hasil Ringkasan →</AppText>
        </TouchableOpacity>
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
  backButtonText: { color: colors.accent, fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
  screenTitle: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.3 },
  scroll: { padding: 16 },
  card: { 
    backgroundColor: colors.surface, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: colors.accent, marginBottom: 12, letterSpacing: 0.2 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: 0.2 },
  sectionSubhint: { fontSize: 11, color: colors.textDim, marginBottom: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    fontFamily: 'IBMPlexSans_400Regular',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: colors.bg,
    color: colors.text,
  },
  buttonAdd: {
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonAddText: { color: colors.ink, fontWeight: '800', letterSpacing: 0.2 },
  chipWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chipMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipMemberText: { fontSize: 13, fontWeight: '700', color: colors.accent, marginRight: 6 },
  chipRemove: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  itemCard: { 
    backgroundColor: colors.surface, 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.text },
  splitIndicator: { fontSize: 11, color: colors.warning, marginTop: 2, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontWeight: '800', color: colors.accent },
  chipSelectable: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.bg,
  },
  chipActive: { 
    backgroundColor: colors.accent, 
    borderColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  chipTextSelectable: { fontSize: 12, color: colors.textFaint, fontWeight: '600' },
  chipTextActive: { color: colors.ink, fontWeight: '800' },
  labelTitle: { fontSize: 13, fontWeight: '700', color: colors.text },
  labelSub: { fontSize: 11, color: colors.textDim, marginTop: 2 },
  percentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bg,
  },
  numericInput: {
    fontFamily: 'IBMPlexSans_700Bold', 
    fontSize: 14, 
    fontWeight: '700', 
    minWidth: 60, 
    textAlign: 'right', 
    padding: 0,
    color: colors.accent,
  },
  inputUnit: { fontSize: 13, color: colors.textDim, marginHorizontal: 4, fontWeight: '600' },
  buttonPrimary: {
    backgroundColor: colors.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonPrimaryText: { color: colors.ink, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
  taxModeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    padding: 2,
    gap: 4,
  },
  taxModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  taxModeBtnActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
  },
  taxModeBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSubtle,
  },
  taxModeBtnTextActive: {
    color: colors.accent,
  },
});

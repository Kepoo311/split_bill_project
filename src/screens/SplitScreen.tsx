import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BillItem, Member, RootStackParamList } from '../types';
import { calculateSplit } from '../utils/calculateSplit';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCyberAlert } from '../hooks/useCyberAlert';

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
    setMembers((prev) => [...prev, { id: `${Date.now()}`, name: trimmed }]);
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
        `Ada ${unassignedItems.length} menu yang belum dipilih oleh siapa pun. Tetap lanjut?`,
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
      const parsedTaxValue = parseFloat(taxValue) || 0;
    const parsedService = parseFloat(serviceCharge.replace(/[^0-9]/g, '')) || 0;
    const parsedDiscount = parseFloat(discountAmount.replace(/[^0-9]/g, '')) || 0;

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
          <Text style={styles.backButtonText}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Bagi & Tugaskan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Tambah Anggota */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Daftar Teman Patungan</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ketik nama teman..."
              placeholderTextColor="#6B7280"
              value={newMemberName}
              onChangeText={setNewMemberName}
            />
            <TouchableOpacity style={styles.buttonAdd} onPress={addMember}>
              <Text style={styles.buttonAddText}>Tambah</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chipWrapper}>
            {members.map((m) => (
              <View key={m.id} style={styles.chipMember}>
                <Text style={styles.chipMemberText}>{m.name}</Text>
                {members.length > 1 && (
                  <TouchableOpacity onPress={() => removeMember(m.id)}>
                    <Text style={styles.chipRemove}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Daftar Item */}
        <Text style={styles.sectionHeaderTitle}>Tugaskan Menu ke Orang</Text>
        <Text style={styles.sectionSubhint}>Jika dipilih 2+ orang, harga otomatis dibagi rata.</Text>

        {items.map((item) => {
          const shareCount = item.assignedTo?.length || 0;
          const sharePrice = shareCount > 0 ? Math.round(item.harga / shareCount) : item.harga;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.itemName}>{item.nama_item}</Text>
                  {shareCount > 1 && (
                    <Text style={styles.splitIndicator}>
                      Dibagi {shareCount} orang: @Rp {sharePrice.toLocaleString('id-ID')}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemPrice}>
                  Rp {item.harga.toLocaleString('id-ID')}
                </Text>
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
                      <Text
                        style={[
                          styles.chipTextSelectable,
                          isSelected && styles.chipTextActive,
                        ]}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })}

        {/* Pajak dan Service Charge */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Biaya Tambahan</Text>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.labelTitle}>Pajak (Tax / PB1 / PPN)</Text>
              <View style={styles.taxModeToggle}>
                <TouchableOpacity
                  style={[styles.taxModeBtn, taxMode === 'nominal' && styles.taxModeBtnActive]}
                  onPress={() => setTaxMode('nominal')}
                >
                  <Text style={[styles.taxModeBtnText, taxMode === 'nominal' && styles.taxModeBtnTextActive]}>
                    Rp (Nominal)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.taxModeBtn, taxMode === 'percent' && styles.taxModeBtnActive]}
                  onPress={() => setTaxMode('percent')}
                >
                  <Text style={[styles.taxModeBtnText, taxMode === 'percent' && styles.taxModeBtnTextActive]}>
                    % (Persen)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.percentInputWrap}>
              {taxMode === 'nominal' && <Text style={styles.inputUnit}>Rp</Text>}
              <TextInput
                style={styles.numericInput}
                keyboardType="numeric"
                value={taxValue}
                onChangeText={setTaxValue}
                placeholder="0"
                placeholderTextColor="#6B7280"
              />
              {taxMode === 'percent' && <Text style={styles.inputUnit}>%</Text>}
            </View>
          </View>

          <View style={[styles.rowBetween, { marginTop: 14 }]}>
            <View>
              <Text style={styles.labelTitle}>Biaya Layanan (Service)</Text>
              <Text style={styles.labelSub}>Nominal flat</Text>
            </View>
            <View style={styles.percentInputWrap}>
              <Text style={styles.inputUnit}>Rp</Text>
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
              <Text style={styles.labelTitle}>Diskon / Promo / Voucher</Text>
              <Text style={styles.labelSub}>Potongan flat</Text>
            </View>
            <View style={styles.percentInputWrap}>
              <Text style={styles.inputUnit}>Rp</Text>
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
          <Text style={styles.buttonPrimaryText}>Lihat Hasil Ringkasan →</Text>
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
  card: { 
    backgroundColor: '#0E1422', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#00F0FF', marginBottom: 12, letterSpacing: 0.5 },
  sectionHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#F9FAFB', marginTop: 8, letterSpacing: 0.5 },
  sectionSubhint: { fontSize: 11, color: '#6B7280', marginBottom: 12, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: '#070A10',
    color: '#F9FAFB',
  },
  buttonAdd: {
    backgroundColor: '#00F0FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonAddText: { color: '#0A0A0F', fontWeight: '800', letterSpacing: 0.5 },
  chipWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chipMember: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipMemberText: { fontSize: 13, fontWeight: '700', color: '#00F0FF', marginRight: 6 },
  chipRemove: { color: '#EF4444', fontSize: 12, fontWeight: '800' },
  itemCard: { 
    backgroundColor: '#0E1422', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  itemName: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },
  splitIndicator: { fontSize: 11, color: '#F59E0B', marginTop: 2, fontWeight: '600' },
  itemPrice: { fontSize: 14, fontWeight: '800', color: '#00F0FF' },
  chipSelectable: {
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#070A10',
  },
  chipActive: { 
    backgroundColor: '#00F0FF', 
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  chipTextSelectable: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  chipTextActive: { color: '#0A0A0F', fontWeight: '800' },
  labelTitle: { fontSize: 13, fontWeight: '700', color: '#F9FAFB' },
  labelSub: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  percentInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#070A10',
  },
  numericInput: { 
    fontSize: 14, 
    fontWeight: '700', 
    minWidth: 60, 
    textAlign: 'right', 
    padding: 0,
    color: '#00F0FF',
  },
  inputUnit: { fontSize: 13, color: '#6B7280', marginHorizontal: 4, fontWeight: '600' },
  buttonPrimary: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonPrimaryText: { color: '#0A0A0F', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  taxModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#070A10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    color: '#64748B',
  },
  taxModeBtnTextActive: {
    color: '#00F0FF',
  },
});

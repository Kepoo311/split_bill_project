import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BillItem, RootStackParamList } from '../types';
import { TopBar } from '../components/TopBar';
import { generateId } from '../utils/ids';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ManualBill'>;

interface ManualRowProps {
  item: BillItem;
  onUpdate: (id: string, field: 'nama_item' | 'harga', value: string) => void;
  onDelete: (id: string) => void;
}

function ManualRowBase({ item, onUpdate, onDelete }: ManualRowProps) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.nameInput}
        value={item.nama_item}
        onChangeText={(value) => onUpdate(item.id, 'nama_item', value)}
        placeholder="Nama item, mis. Nasi Goreng"
        placeholderTextColor={colors.textDim}
      />
      <View style={styles.priceWrap}>
        <Text style={styles.currency}>Rp</Text>
        <TextInput
          style={styles.priceInput}
          value={item.harga > 0 ? String(item.harga) : ''}
          onChangeText={(value) => onUpdate(item.id, 'harga', value)}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={colors.textDim}
        />
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => onDelete(item.id)}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Hapus ${item.nama_item || 'item'}`}
      >
        <Text style={styles.deleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}
const ManualRow = React.memo(ManualRowBase);

export const ManualBillScreen: React.FC<Props> = ({ navigation }) => {
  const [items, setItems] = useState<BillItem[]>([
    { id: generateId(), nama_item: '', harga: 0, assignedTo: [] },
  ]);

  const handleUpdate = (id: string, field: 'nama_item' | 'harga', value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (field === 'harga') {
          const num = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
          return { ...item, harga: num };
        }
        return { ...item, nama_item: value };
      }),
    );
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAdd = () => {
    setItems((prev) => [...prev, { id: generateId(), nama_item: '', harga: 0, assignedTo: [] }]);
  };

  const validItems = items.filter((item) => item.nama_item.trim() && item.harga > 0);

  const handleProceed = () => {
    navigation.navigate('Split', { items: validItems });
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopBar
        title="Isi Manual"
        onBack={() => navigation.goBack()}
        backLabel="← Batal"
        right={
          <TouchableOpacity onPress={handleAdd} style={styles.addBtn} hitSlop={6} accessibilityRole="button" accessibilityLabel="Tambah baris item">
            <Text style={styles.addBtnText}>+ Item</Text>
          </TouchableOpacity>
        }
      />

      <Text style={styles.hint}>
        Buat tagihan tanpa struk — isi nama item dan harganya, lalu lanjut bagi ke anggota.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ManualRow item={item} onUpdate={handleUpdate} onDelete={handleDelete} />
        )}
        ListFooterComponent={<View style={{ height: 20 }} />}
      />

      <View style={styles.footer}>
        <Text style={styles.footerMeta}>
          {validItems.length} item siap dibagikan
        </Text>
        <TouchableOpacity
          style={[styles.proceedBtn, validItems.length === 0 && styles.proceedDisabled]}
          onPress={handleProceed}
          disabled={validItems.length === 0}
          accessibilityRole="button"
          accessibilityLabel="Lanjut ke bagi tagihan"
        >
          <Text style={styles.proceedText}>Lanjut ke Bagi Tagihan →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  hint: {
    fontSize: 11,
    color: colors.textDim,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    lineHeight: 16,
  },
  list: { padding: 16, paddingTop: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 60,
  },
  nameInput: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500', padding: 4 },
  priceWrap: { flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  currency: { fontSize: 12, color: colors.textDim, marginRight: 4, fontWeight: '600' },
  priceInput: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 70,
    textAlign: 'right',
    padding: 4,
  },
  deleteBtn: {
    marginLeft: 10,
    padding: 6,
    backgroundColor: colors.dangerSoft,
    borderRadius: 6,
  },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
  addBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  addBtnText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  footer: {
    padding: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerMeta: { fontSize: 11, color: colors.textDim, marginBottom: 10, textAlign: 'center' },
  proceedBtn: {
    backgroundColor: colors.accent,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
  },
  proceedDisabled: { backgroundColor: colors.line },
  proceedText: { color: colors.ink, fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});

import React, { useCallback, useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Pressable, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { TopBar } from '../components/TopBar';
import { CyberModal } from '../components/CyberModal';
import { useGroupStore } from '../store/groupStore';
import { colors } from '../theme';
import { AppText } from '../components/AppText';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<RootStackParamList, 'Groups'>;

interface GroupCardProps {
  name: string;
  memberCount: number;
  billCount: number;
  onPress: () => void;
  onDelete: () => void;
}

function GroupCardBase({ name, memberCount, billCount, onPress, onDelete }: GroupCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Buka grup ${name}, ${memberCount} anggota, ${billCount} struk`}
    >
      <View style={{ flex: 1 }}>
        <AppText style={styles.cardTitle} numberOfLines={1}>
          {name}
        </AppText>
        <AppText style={styles.cardMeta}>
          {memberCount} anggota • {billCount} struk
        </AppText>
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={onDelete}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Hapus grup ${name}`}
      >
        <AppText style={styles.deleteBtnText}>Hapus</AppText>
      </TouchableOpacity>
    </Pressable>
  );
}
const GroupCard = React.memo(GroupCardBase);

export const GroupsScreen: React.FC<Props> = ({ navigation }) => {
  const groups = useGroupStore((s) => s.groups);
  const loadGroups = useGroupStore((s) => s.loadGroups);
  const createGroup = useGroupStore((s) => s.createGroup);
  const deleteGroup = useGroupStore((s) => s.deleteGroup);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const openGroup = useCallback(
    (id: string) => navigation.navigate('GroupDetail', { groupId: id }),
    [navigation],
  );

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) {
      setAlertMsg('Kasih nama grupnya dulu, mis. "Kosan" atau "Tim Futsal".');
      setShowAlert(true);
      return;
    }
    const group = await createGroup(name);
    setNewName('');
    setShowCreate(false);
    openGroup(group.id);
  };

  const pendingGroup = groups.find((g) => g.id === pendingDelete);

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Grup Patungan" onBack={() => navigation.goBack()} />
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowCreate(true)}
            accessibilityRole="button"
            accessibilityLabel="Buat grup patungan baru"
          >
            <AppText style={styles.addBtnText}>＋ Buat Grup Patungan</AppText>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={26} color={colors.accent} />
            <AppText style={styles.emptyText}>Belum ada grup</AppText>
            <AppText style={styles.emptySubtext}>
              Grup patungan mengumpulkan banyak struk jadi satu saldo berjalan
              (mis. kosan atau tim futsal) — siapa nalangin, siapa berutang,
              terhitung otomatis.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <GroupCard
            name={item.name}
            memberCount={item.members.length}
            billCount={item.entries.length}
            onPress={() => openGroup(item.id)}
            onDelete={() => setPendingDelete(item.id)}
          />
        )}
      />

      <CyberModal
        visible={showCreate}
        title="Grup Baru"
        message="Nama grup patungan:"
        onClose={() => setShowCreate(false)}
        buttons={[
          { text: 'Batal', style: 'cancel' },
          { text: 'Buat', onPress: handleCreate },
        ]}
      >
        <TextInput
          style={styles.input}
          placeholder="mis. Kosan Bu Sri"
          placeholderTextColor={colors.textDim}
          value={newName}
          onChangeText={setNewName}
          maxLength={40}
        />
      </CyberModal>

      <CyberModal
        visible={pendingDelete !== null}
        title="Hapus Grup"
        message={`Yakin hapus grup "${pendingGroup?.name ?? ''}"? Struk di riwayat TIDAK ikut terhapus — hanya catatan grupnya yang hilang.`}
        onClose={() => setPendingDelete(null)}
        buttons={[
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus',
            style: 'destructive',
            onPress: async () => {
              if (pendingDelete) {
                try {
                  await deleteGroup(pendingDelete);
                } catch {
                  setAlertMsg('Grup gagal dihapus. Coba lagi.');
                  setShowAlert(true);
                }
              }
              setPendingDelete(null);
            },
          },
        ]}
      />

      <CyberModal
        visible={showAlert}
        title="INFO"
        message={alertMsg}
        onClose={() => setShowAlert(false)}
        buttons={[{ text: 'OK' }]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 16, paddingBottom: 40 },
  addBtn: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  addBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  card: {
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
  cardPressed: { borderColor: colors.accentBorder },
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 11, color: colors.textDim, marginTop: 4 },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colors.dangerSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteBtnText: { color: colors.danger, fontSize: 11, fontWeight: '700' },
  emptyBox: {
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyText: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  emptySubtext: { color: colors.textDim, fontSize: 11, textAlign: 'center', lineHeight: 17 },
  input: {
    fontFamily: 'IBMPlexSans_400Regular',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    marginBottom: 8,
  },
});

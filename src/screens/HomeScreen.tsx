import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useBillStore } from '../store/billStore';
import { useUpdateStore } from '../store/updateStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BillHistory, RootStackParamList } from '../types';
import { CyberModal } from '../components/CyberModal';
import { UpdateBanner } from '../components/UpdateBanner';
import { AppText } from '../components/AppText';
import { filterHistory } from '../utils/historyFilter';
import { colors } from '../theme';
import { formatRupiah, formatDateShortTime } from '../utils/format';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

interface HistoryCardProps {
  item: BillHistory;
  onPress: (bill: BillHistory) => void;
}

// Item list memoized + callback stabil: daftar panjang tidak me-render ulang
// semua kartu saat satu state lain di screen berubah.
function HistoryCardBase({ item, onPress }: HistoryCardProps) {
  const paidCount = item.results?.filter((r) => item.paidMemberIds?.includes(r.memberId)).length || 0;
  const totalCount = item.results?.length || 0;
  const isAllPaid = totalCount > 0 && paidCount === totalCount;

  return (
    <TouchableOpacity
      style={styles.historyCard}
      activeOpacity={0.8}
      onPress={() => onPress(item)}
    >
      <View style={styles.cardAccentLine} />
      <View style={styles.historyCardTop}>
        <AppText style={styles.historyCardTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </AppText>
        <View style={[styles.statusBadgeSmall, isAllPaid ? styles.paidBadgeSmall : styles.unpaidBadgeSmall]}>
          <AppText style={[styles.statusBadgeSmallText, isAllPaid ? styles.paidBadgeSmallText : styles.unpaidBadgeSmallText]}>
            {isAllPaid ? 'Lunas' : `${paidCount}/${totalCount} bayar`}
          </AppText>
        </View>
      </View>
      <AppText style={styles.historyCardDate}>
        {formatDateShortTime(item.date)}
      </AppText>
      <View style={styles.historyCardFooter}>
        <View style={styles.metaBadge}>
          <AppText style={styles.metaBadgeText}>
            {item.members.length} orang • {item.items.length} item
          </AppText>
        </View>
        <AppText style={styles.historyTotal}>
          {formatRupiah(item.grandTotal)}
        </AppText>
      </View>
    </TouchableOpacity>
  );
}

const HistoryCard = React.memo(HistoryCardBase);

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  // Selector per-field: hanya re-render saat history berubah, bukan tiap
  // bagian store lain diperbarui.
  const history = useBillStore((s) => s.history);
  const loadHistory = useBillStore((s) => s.loadHistory);
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [showSourceModal, setShowSourceModal] = useState(false);

  const isChecking = useUpdateStore((s) => s.isChecking);
  const isDownloading = useUpdateStore((s) => s.isDownloading);
  const updateAvailable = useUpdateStore((s) => s.updateAvailable);
  const updateDownloaded = useUpdateStore((s) => s.updateDownloaded);
  const [justCheckedOk, setJustCheckedOk] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const openDetail = useCallback(
    (bill: BillHistory) => {
      navigation.navigate('HistoryDetail', { bill: bill });
    },
    [navigation],
  );

  const categories = ['Semua', 'Makanan', 'Nongkrong', 'Belanja', 'Lainnya'];
  const filteredHistory = useMemo(
    () => filterHistory(history, searchQuery, filterCategory),
    [history, searchQuery, filterCategory],
  );

  // Cek manual dari ikon header: unduh lalu pasang, atau kasih tanda "sudah
  // versi terbaru" sebentar saat tidak ada pembaruan.
  const handleUpdatePress = useCallback(async () => {
    const s = useUpdateStore.getState();
    if (s.isChecking || s.isDownloading) return;
    if (s.updateDownloaded) {
      s.applyUpdate();
      return;
    }
    const result = await s.checkAndFetch();
    if (result === 'ready') {
      useUpdateStore.getState().applyUpdate();
      return;
    }
    if (result === 'uptodate') {
      setJustCheckedOk(true);
      setTimeout(() => setJustCheckedOk(false), 2000);
    }
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        navigation.navigate('Ocr', { imageUri });
      }
    } catch {
      // silent fail
    }
  };

  const showScanOptions = () => setShowSourceModal(true);

  const updateInProgress = isChecking || isDownloading;
  const hasUpdate = updateAvailable || updateDownloaded;

  const renderUpdateIcon = () => {
    if (updateInProgress) {
      return <ActivityIndicator size="small" color={colors.accent} />;
    }
    if (justCheckedOk) {
      return <Ionicons name="checkmark-outline" size={20} color={colors.success} />;
    }
    return (
      <Ionicons
        name="cloud-download-outline"
        size={20}
        color={hasUpdate ? colors.accent : colors.textDim}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <AppText style={styles.appTitle}>
              Split<AppText style={styles.accentText}>Bill</AppText>
            </AppText>
            <AppText style={styles.appByline}>by KepoX</AppText>
            <AppText style={styles.appSubtitle}>Bagi tagihan bareng jadi gampang</AppText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleUpdatePress}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={
                updateDownloaded
                  ? 'Pasang pembaruan yang sudah diunduh'
                  : hasUpdate
                    ? 'Pembaruan tersedia, ketuk untuk mengunduh'
                    : 'Cek pembaruan aplikasi'
              }
            >
              {renderUpdateIcon()}
              {hasUpdate && !updateInProgress && <View style={styles.updateBadgeDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Buka pengaturan"
            >
              <Ionicons name="settings-outline" size={20} color={colors.accent} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        activeOpacity={0.85}
        onPress={showScanOptions}
      >
        <View style={styles.scanContent}>
          <Ionicons name="scan-outline" size={26} color={colors.accent} />
          <View style={styles.scanTexts}>
            <AppText style={styles.scanButtonText}>Pindai Struk Baru</AppText>
            <AppText style={styles.scanButtonSubtext}>Kamera, galeri, atau isi manual</AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
        </View>
      </TouchableOpacity>

      <UpdateBanner />

      <View style={styles.quickActionsRow}>
        <TouchableOpacity
          style={styles.groupsButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Groups')}
          accessibilityRole="button"
          accessibilityLabel="Buka grup patungan"
        >
          <View style={styles.groupsButtonTop}>
            <Ionicons name="people-outline" size={18} color={colors.accent} />
            <AppText style={styles.groupsButtonText}>Grup Patungan</AppText>
          </View>
          <AppText style={styles.groupsButtonSubtext}>Saldo berjalan • multi struk</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statsButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Stats')}
          accessibilityRole="button"
          accessibilityLabel="Buka statistik pengeluaran"
        >
          <Ionicons name="bar-chart-outline" size={20} color={colors.textMuted} />
          <AppText style={styles.statsLabel}>Statistik</AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <AppText style={styles.historyTitle}>Riwayat Transaksi</AppText>
          <View style={styles.countBadge}>
            <AppText style={styles.countBadgeText}>{filteredHistory.length}</AppText>
          </View>
        </View>

        {/* Pencarian: judul, nama item, atau nama anggota */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.textDim} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Cari judul, item, atau anggota…"
            placeholderTextColor={colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            accessibilityLabel="Cari riwayat transaksi"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              style={styles.searchClear}
              onPress={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Hapus pencarian"
            >
              <Ionicons name="close" size={14} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Kategori Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollContainer}
          contentContainerStyle={styles.categoryScroll}
        >
          {categories.map((cat) => {
            const isActive = filterCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setFilterCategory(cat)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={`Filter kategori ${cat}`}
              >
                <AppText style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="receipt-outline" size={26} color={colors.accent} />
            </View>
            <AppText style={styles.emptyText}>Belum ada transaksi</AppText>
            <AppText style={styles.emptySubtext}>
              {filterCategory === 'Semua'
                ? searchQuery
                  ? `Tidak ada hasil untuk "${searchQuery.trim()}".`
                  : 'Struk yang diproses akan tersimpan aman di penyimpanan lokal perangkat.'
                : `Belum ada transaksi dengan kategori "${filterCategory}".`}
            </AppText>
          </View>
        ) : (
          <FlatList
            data={filteredHistory}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <HistoryCard item={item} onPress={openDetail} />
            )}
          />
        )}
      </View>

      {/* Modal Pilihan Input Struk */}
      <CyberModal
        visible={showSourceModal}
        title="Pindai Struk"
        message="Mau input struk lewat mana?"
        buttons={[
          {
            text: 'Kamera',
            style: 'default',
            onPress: () => {
              setShowSourceModal(false);
              navigation.navigate('CameraScanner');
            },
          },
          {
            text: 'Buka Galeri',
            style: 'default',
            onPress: () => {
              setShowSourceModal(false);
              handlePickImage();
            },
          },
          {
            text: 'Isi Manual (tanpa struk)',
            style: 'default',
            onPress: () => {
              setShowSourceModal(false);
              navigation.navigate('ManualBill');
            },
          },
          {
            text: 'Batal',
            style: 'cancel',
            onPress: () => setShowSourceModal(false),
          },
        ]}
        onClose={() => setShowSourceModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitles: {
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  updateBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBadgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.3,
  },
  accentText: {
    color: colors.accent,
  },
  appByline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  appSubtitle: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
    letterSpacing: 0.2,
  },
  scanButton: {
    marginHorizontal: 20,
    marginTop: 6,
    marginBottom: 20,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 3,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanTexts: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
  },
  scanButtonSubtext: {
    fontSize: 11.5,
    color: colors.textFaint,
    marginTop: 3,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'stretch',
  },
  groupsButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 68,
    justifyContent: 'center',
  },
  groupsButtonTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupsButtonText: { color: colors.accent, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.2 },
  groupsButtonSubtext: { color: colors.textDim, fontSize: 10.5, marginTop: 3 },
  statsButton: {
    width: 104,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  statsLabel: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600', letterSpacing: 0.2, marginTop: 5 },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textFaint,
    letterSpacing: 0.4,
  },
  countBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSubtle,
    letterSpacing: 0.2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    padding: 0,
    marginLeft: 8,
    fontFamily: 'IBMPlexSans_400Regular',
  },
  searchClear: {
    padding: 6,
    backgroundColor: colors.bg,
    borderRadius: 12,
    marginLeft: 6,
  },
  categoryScrollContainer: {
    flexGrow: 0,
    marginBottom: 14,
  },
  categoryScroll: {
    gap: 10,
    paddingRight: 4,
  },
  categoryChip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    backgroundColor: colors.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: colors.textSubtle,
    letterSpacing: 0.2,
  },
  categoryChipTextActive: {
    color: colors.accent,
  },
  listContent: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.accent,
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.2,
    flex: 1,
    marginRight: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeSmall: { backgroundColor: colors.successSoft, borderWidth: 1, borderColor: colors.success },
  unpaidBadgeSmall: { backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: colors.warning },
  statusBadgeSmallText: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  paidBadgeSmallText: { color: colors.success },
  unpaidBadgeSmallText: { color: colors.warning },
  historyCardDate: {
    fontSize: 11,
    color: colors.textDim,
    marginTop: 4,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textFaint,
    letterSpacing: 0.2,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textFaint,
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

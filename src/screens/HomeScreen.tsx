import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useBillStore } from '../store/billStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BillHistory, RootStackParamList } from '../types';
import { CyberModal } from '../components/CyberModal';
import { UpdateBanner } from '../components/UpdateBanner';
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
      <View style={styles.cardGlowLine} />
      <View style={styles.historyCardTop}>
        <Text style={styles.historyCardTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <View style={[styles.statusBadgeSmall, isAllPaid ? styles.paidBadgeSmall : styles.unpaidBadgeSmall]}>
          <Text style={[styles.statusBadgeSmallText, isAllPaid ? styles.paidBadgeSmallText : styles.unpaidBadgeSmallText]}>
            {isAllPaid ? '✓ LUNAS' : `${paidCount}/${totalCount} BAYAR`}
          </Text>
        </View>
      </View>
      <Text style={styles.historyCardDate}>
        {formatDateShortTime(item.date)}
      </Text>
      <View style={styles.historyCardFooter}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaBadgeText}>
            {item.members.length} ORANG • {item.items.length} ITEM
          </Text>
        </View>
        <Text style={styles.historyTotal}>
          {formatRupiah(item.grandTotal)}
        </Text>
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
  const [showSourceModal, setShowSourceModal] = useState(false);

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
  const filteredHistory = filterCategory === 'Semua'
    ? history
    : history.filter((h) => h.category === filterCategory);

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

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Tech Elements */}
      <View style={styles.cyberGrid} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.statusDot} />
              <Text style={styles.badgeText}>OFFLINE ENGINE READY</Text>
            </View>
            <Text style={styles.appTitle}>SPLIT<Text style={styles.accentText}>BILL</Text></Text>
            <Text style={styles.appByline}>By KepoX</Text>
            <Text style={styles.appSubtitle}>Neural Optical Receipt Analyzer</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        activeOpacity={0.85}
        onPress={showScanOptions}
      >
        <View style={styles.scanButtonGlow} />
        <View style={styles.scanContent}>
          <Text style={styles.scanButtonIcon}>⚡</Text>
          <View>
            <Text style={styles.scanButtonText}>PINDAI STRUK BARU</Text>
            <Text style={styles.scanButtonSubtext}>Ekstraksi OCR Otomatis • Kamera / Galeri</Text>
          </View>
        </View>
      </TouchableOpacity>

      <UpdateBanner />

      <TouchableOpacity
        style={styles.groupsButton}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Groups')}
        accessibilityRole="button"
        accessibilityLabel="Buka grup patungan"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.groupsButtonText}>👥 GRUP PATUNGAN</Text>
          <Text style={styles.groupsButtonSubtext}>Saldo berjalan kosan / tim — multi struk</Text>
        </View>
        <TouchableOpacity
          style={styles.statsBtn}
          onPress={() => navigation.navigate('Stats')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Buka statistik pengeluaran"
        >
          <Text style={styles.statsBtnText}>📊</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.historyTitle}>RIWAYAT TRANSAKSI</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredHistory.length}</Text>
          </View>
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
              >
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Text style={styles.emptyIcon}>◈</Text>
            </View>
            <Text style={styles.emptyText}>TIDAK ADA DATA</Text>
            <Text style={styles.emptySubtext}>
              {filterCategory === 'Semua'
                ? 'Struk yang diproses akan tersimpan aman di penyimpanan lokal perangkat.'
                : `Belum ada transaksi dengan kategori "${filterCategory}".`}
            </Text>
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

      {/* CyberModal Pilihan Scan Struk */}
      <CyberModal
        visible={showSourceModal}
        title="PINDAI STRUK"
        message="Pilih metode input visual struk transaksi:"
        buttons={[
          {
            text: '📷 Kamera Scanner HUD',
            style: 'default',
            onPress: () => {
              setShowSourceModal(false);
              navigation.navigate('CameraScanner');
            },
          },
          {
            text: '🖼️ Buka Galeri',
            style: 'default',
            onPress: () => {
              setShowSourceModal(false);
              handlePickImage();
            },
          },
          {
            text: '✏️ Isi Manual (tanpa struk)',
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
  groupsButton: {
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    minHeight: 56,
    justifyContent: 'center',
  },
  groupsButtonText: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 0.8 },
  groupsButtonSubtext: { color: colors.textDim, fontSize: 10, marginTop: 2 },
  statsBtn: {
    padding: 8,
    backgroundColor: colors.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsBtnText: { fontSize: 16 },
  cyberGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0, 240, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 240, 255, 0.08)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  settingsBtn: {
    padding: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  settingsBtnText: {
    fontSize: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 6,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1.5,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  accentText: {
    color: colors.accent,
  },
  appByline: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 1,
    marginTop: 2,
  },
  appSubtitle: {
    fontSize: 12,
    color: colors.textDim,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  scanButton: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 24,
    borderRadius: 16,
    backgroundColor: '#0E1626',
    borderWidth: 1.5,
    borderColor: colors.accent,
    padding: 20,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  scanButtonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.accent,
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonIcon: {
    fontSize: 30,
    marginRight: 16,
    color: colors.accent,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  scanButtonSubtext: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 4,
  },
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textFaint,
    letterSpacing: 1.5,
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
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.5,
  },
  categoryScrollContainer: {
      flexGrow: 0,
      maxHeight: 44,
      marginBottom: 12,
    },
    categoryScroll: {
      paddingBottom: 12,
      gap: 8,
    },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSubtle,
    letterSpacing: 0.5,
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
  cardGlowLine: {
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
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.5,
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
  statusBadgeSmallText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  paidBadgeSmallText: { color: colors.success },
  unpaidBadgeSmallText: { color: colors.warning },
  deleteText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
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
    borderTopColor: '#1A2333',
  },
  metaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textFaint,
    letterSpacing: 0.5,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: 0.5,
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
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 24,
    color: colors.accent,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textFaint,
    letterSpacing: 1,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

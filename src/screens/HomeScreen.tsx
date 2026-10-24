import React, { useEffect, useState } from 'react';
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
import { RootStackParamList } from '../types';
import { CyberModal } from '../components/CyberModal';
import { UpdateBanner } from '../components/UpdateBanner';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { history, loadHistory, deleteBill } = useBillStore();
  const [filterCategory, setFilterCategory] = useState<string>('Semua');
  const [showSourceModal, setShowSourceModal] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

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
    } catch (error) {
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
            renderItem={({ item }) => {
              const paidCount = item.results?.filter((r) => item.paidMemberIds?.includes(r.memberId)).length || 0;
              const totalCount = item.results?.length || 0;
              const isAllPaid = totalCount > 0 && paidCount === totalCount;

              return (
                <TouchableOpacity
                  style={styles.historyCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('HistoryDetail', { bill: item })}
                >
                  <View style={styles.cardGlowLine} />
                  <View style={styles.historyCardTop}>
                    <Text style={styles.historyCardTitle}>{item.title}</Text>
                    <View style={[styles.statusBadgeSmall, isAllPaid ? styles.paidBadgeSmall : styles.unpaidBadgeSmall]}>
                      <Text style={[styles.statusBadgeSmallText, isAllPaid ? styles.paidBadgeSmallText : styles.unpaidBadgeSmallText]}>
                        {isAllPaid ? '✓ LUNAS' : `${paidCount}/${totalCount} BAYAR`}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.historyCardDate}>
                    {new Date(item.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <View style={styles.historyCardFooter}>
                    <View style={styles.metaBadge}>
                      <Text style={styles.metaBadgeText}>
                        {item.members.length} ORANG • {item.items.length} ITEM
                      </Text>
                    </View>
                    <Text style={styles.historyTotal}>
                      Rp {item.grandTotal.toLocaleString('id-ID')}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
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
    backgroundColor: '#070A10',
  },
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
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.3)',
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
    backgroundColor: '#00F0FF',
    marginRight: 6,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00F0FF',
    letterSpacing: 1.5,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  accentText: {
    color: '#00F0FF',
  },
  appByline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D4FF',
    letterSpacing: 1,
    marginTop: 2,
  },
  appSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
    borderColor: '#00F0FF',
    padding: 20,
    shadowColor: '#00F0FF',
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
    backgroundColor: '#00F0FF',
  },
  scanContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanButtonIcon: {
    fontSize: 30,
    marginRight: 16,
    color: '#00F0FF',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  scanButtonSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    letterSpacing: 1.5,
  },
  countBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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
    backgroundColor: '#0E1422',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderColor: '#00F0FF',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  categoryChipTextActive: {
      color: '#00F0FF',
    },
    listContent: {
    paddingBottom: 24,
  },
  historyCard: {
    backgroundColor: '#0E1422',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlowLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: '#00F0FF',
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F9FAFB',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: 8,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidBadgeSmall: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10B981' },
  unpaidBadgeSmall: { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderWidth: 1, borderColor: '#F59E0B' },
  statusBadgeSmallText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  paidBadgeSmallText: { color: '#10B981' },
  unpaidBadgeSmallText: { color: '#F59E0B' },
  deleteText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  historyCardDate: {
    fontSize: 11,
    color: '#6B7280',
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
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00F0FF',
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
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 24,
    color: '#00F0FF',
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
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

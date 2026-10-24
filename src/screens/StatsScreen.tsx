import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { TopBar } from '../components/TopBar';
import { useBillStore } from '../store/billStore';
import { computeStats } from '../utils/stats';
import { formatRupiah } from '../utils/format';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const history = useBillStore((s) => s.history);
  const loadHistory = useBillStore((s) => s.loadHistory);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => computeStats(history), [history]);
  const maxMonth = Math.max(...stats.months.map((m) => m.total), 1);
  const trendDelta = stats.thisMonth - stats.lastMonth;

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Statistik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.row}>
          <View style={[styles.kpiCard, styles.kpiPrimary]}>
            <Text style={styles.kpiLabel}>BULAN INI</Text>
            <Text style={styles.kpiValue}>{formatRupiah(stats.thisMonth)}</Text>
            {stats.lastMonth > 0 && (
              <Text style={[styles.kpiDelta, trendDelta > 0 ? styles.deltaUp : styles.deltaDown]}>
                {trendDelta > 0 ? '▲' : '▼'} {formatRupiah(Math.abs(trendDelta))} vs bulan lalu
              </Text>
            )}
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>RATA-RATA / TAGIHAN</Text>
            <Text style={styles.kpiValueSmall}>{formatRupiah(stats.avgPerBill)}</Text>
            <Text style={styles.kpiMeta}>{stats.billCount} tagihan</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>TREN 6 BULAN TERAKHIR</Text>
          <View style={styles.chart}>
            {stats.months.map((month) => (
              <View key={month.key} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max((month.total / maxMonth) * 100, month.total > 0 ? 4 : 0)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{month.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>KATEGORI</Text>
          {stats.byCategory.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada data — scan struk pertamamu dulu!</Text>
          ) : (
            stats.byCategory.map((category) => (
              <View key={category.category} style={styles.categoryRow}>
                <Text style={styles.categoryName}>{category.category}</Text>
                <Text style={styles.categoryMeta}>{category.count} tagihan</Text>
                <Text style={styles.categoryTotal}>{formatRupiah(category.total)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>TOTAL SEJAK AWAL</Text>
          <Text style={styles.allTimeValue}>{formatRupiah(stats.allTime)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  kpiPrimary: { borderColor: colors.accentBorder },
  kpiLabel: { fontSize: 9, color: colors.textDim, fontWeight: '700', letterSpacing: 1.2 },
  kpiValue: { fontSize: 20, fontWeight: '900', color: colors.accent, marginTop: 6 },
  kpiValueSmall: { fontSize: 16, fontWeight: '900', color: colors.text, marginTop: 6 },
  kpiMeta: { fontSize: 10, color: colors.textDim, marginTop: 4 },
  kpiDelta: { fontSize: 10, fontWeight: '700', marginTop: 4 },
  deltaUp: { color: colors.warning },
  deltaDown: { color: colors.success },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 11, fontWeight: '800', color: colors.accent, letterSpacing: 1, marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { height: 92, width: 14, borderRadius: 7, backgroundColor: colors.bg, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 7, backgroundColor: colors.accent, minHeight: 3 },
  barLabel: { fontSize: 9, color: colors.textDim, marginTop: 6 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  categoryName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  categoryMeta: { fontSize: 10, color: colors.textDim, marginRight: 12 },
  categoryTotal: { fontSize: 13, fontWeight: '800', color: colors.accent },
  emptyText: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  allTimeValue: { fontSize: 24, fontWeight: '900', color: colors.text },
});

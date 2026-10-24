import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { TopBar } from '../components/TopBar';
import { useBillStore } from '../store/billStore';
import {
  computeStats,
  computeDailySpend,
  sumRange,
  formatDayLabel,
  localDayKey,
} from '../utils/stats';
import { formatRupiah, formatDateShortTime } from '../utils/format';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Stats'>;
type RangeFilter = 'today' | 'week' | 'month';

const FILTERS: { id: RangeFilter; label: string }[] = [
  { id: 'today', label: 'Hari Ini' },
  { id: 'week', label: '7 Hari' },
  { id: 'month', label: 'Bulan Ini' },
];

export const StatsScreen: React.FC<Props> = ({ navigation }) => {
  const history = useBillStore((s) => s.history);
  const loadHistory = useBillStore((s) => s.loadHistory);
  const [filter, setFilter] = useState<RangeFilter>('month');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = useMemo(() => computeStats(history), [history]);
  const daily = useMemo(() => computeDailySpend(history, new Date(), 7), [history]);

  const range = useMemo(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    if (filter === 'today') {
      return sumRange(history, now, tomorrow);
    }
    if (filter === 'week') {
      const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return sumRange(history, weekAgo, tomorrow);
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return sumRange(history, monthStart, tomorrow);
  }, [filter, history]);

  const showDailyChart = filter !== 'month';
  const dayBuckets = daily;
  const monthBuckets = stats.months;
  const activeKey = selectedKey ?? (showDailyChart ? daily[daily.length - 1]?.key ?? null : monthBuckets[monthBuckets.length - 1]?.key ?? null);

  const selectedDay = showDailyChart ? dayBuckets.find((d) => d.key === activeKey) : undefined;
  const selectedMonth = !showDailyChart ? monthBuckets.find((m) => m.key === activeKey) : undefined;

  const selectedBills = useMemo(() => {
    if (selectedDay) {
      const key = selectedDay.key;
      return history.filter((bill) => localDayKey(new Date(bill.date)) === key);
    }
    if (selectedMonth) {
      const [year, month] = selectedMonth.key.split('-').map(Number);
      return history.filter(
        (bill) =>
          new Date(bill.date).getFullYear() === year && new Date(bill.date).getMonth() === month,
      );
    }
    return [];
  }, [history, selectedDay, selectedMonth]);

  const maxDaily = Math.max(...dayBuckets.map((d) => d.total), 1);
  const maxMonth = Math.max(...monthBuckets.map((m) => m.total), 1);
  const todayKey = daily[daily.length - 1]?.key;

  const trendDelta = stats.thisMonth - stats.lastMonth;

  const renderBar = (
    key: string,
    label: string,
    total: number,
    ratio: number,
    isToday = false,
  ) => (
    <Pressable
      key={key}
      style={styles.barCol}
      onPress={() => setSelectedKey(key)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatRupiah(total)}`}
    >
      <View style={[styles.barTrack, activeKey === key && styles.barTrackActive]}>
        <View
          style={[
            styles.barFill,
            activeKey === key && styles.barFillActive,
            { height: `${Math.max(ratio * 100, total > 0 ? 5 : 0)}%` },
          ]}
        />
      </View>
      <Text style={[styles.barLabel, activeKey === key && styles.barLabelActive, isToday && styles.barLabelToday]}>
        {label}
        {isToday ? '•' : ''}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TopBar title="Statistik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.chipRow}>
          {FILTERS.map((option) => (
            <Pressable
              key={option.id}
              style={[styles.chip, filter === option.id && styles.chipActive]}
              onPress={() => {
                setFilter(option.id);
                setSelectedKey(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${option.label}`}
            >
              <Text style={[styles.chipText, filter === option.id && styles.chipTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.kpiLabel}>
            {filter === 'today' ? 'HARI INI' : filter === 'week' ? '7 HARI TERAKHIR' : 'BULAN INI'}
          </Text>
          <Text style={styles.kpiValue}>{formatRupiah(range.total)}</Text>
          <Text style={styles.kpiMeta}>{range.count} tagihan</Text>
          {filter === 'month' && stats.lastMonth > 0 && (
            <Text style={[styles.kpiDelta, trendDelta > 0 ? styles.deltaUp : styles.deltaDown]}>
              {trendDelta > 0 ? '▲' : '▼'} {formatRupiah(Math.abs(trendDelta))} vs bulan lalu
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {showDailyChart ? '7 HARI TERAKHIR — TAP BAR UNTUK DETAIL' : 'TREN 6 BULAN — TAP BAR UNTUK DETAIL'}
          </Text>
          <View style={styles.chart}>
            {showDailyChart
              ? dayBuckets.map((day) =>
                  renderBar(day.key, day.label, day.total, day.total / maxDaily, day.key === todayKey),
                )
              : monthBuckets.map((month) =>
                  renderBar(month.key, month.label, month.total, month.total / maxMonth),
                )}
          </View>

          {(selectedDay || selectedMonth) && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {selectedDay
                  ? `${formatDayLabel(selectedDay.date)} — ${formatRupiah(selectedDay.total)}`
                  : `${selectedMonth!.label} ${selectedMonth!.key.split('-')[0]} — ${formatRupiah(selectedMonth!.total)}`}
              </Text>
              {selectedBills.length === 0 ? (
                <Text style={styles.detailEmpty}>Tidak ada tagihan di periode ini</Text>
              ) : (
                selectedBills.slice(0, 5).map((bill) => (
                  <TouchableOpacity
                    key={bill.id}
                    style={styles.detailRow}
                    onPress={() => navigation.navigate('HistoryDetail', { bill })}
                    accessibilityRole="button"
                    accessibilityLabel={`Buka ${bill.title}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.detailBillTitle} numberOfLines={1}>
                        {bill.title}
                      </Text>
                      <Text style={styles.detailBillMeta}>
                        {selectedMonth ? formatDateShortTime(bill.date) : formatRupiah(bill.grandTotal)}
                      </Text>
                    </View>
                    {selectedDay && (
                      <Text style={styles.detailBillAmount}>{formatRupiah(bill.grandTotal)}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
              {selectedBills.length > 5 && (
                <Text style={styles.detailMore}>+{selectedBills.length - 5} tagihan lainnya</Text>
              )}
            </View>
          )}
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
          <Text style={styles.kpiMeta}>
            {stats.billCount} tagihan • rata-rata {formatRupiah(stats.avgPerBill)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 16, paddingBottom: 40 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  chipActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  chipText: { color: colors.textDim, fontSize: 12, fontWeight: '700' },
  chipTextActive: { color: colors.accent },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    padding: 16,
    marginBottom: 14,
  },
  kpiLabel: { fontSize: 10, color: colors.textDim, fontWeight: '700', letterSpacing: 1.2 },
  kpiValue: { fontSize: 24, fontWeight: '900', color: colors.accent, marginTop: 6 },
  kpiMeta: { fontSize: 11, color: colors.textDim, marginTop: 4 },
  kpiDelta: { fontSize: 11, fontWeight: '700', marginTop: 4 },
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
  cardTitle: { fontSize: 10, fontWeight: '800', color: colors.accent, letterSpacing: 1, marginBottom: 14 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', minHeight: 110 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { height: 84, width: 16, borderRadius: 8, backgroundColor: colors.bg, overflow: 'hidden', justifyContent: 'flex-end' },
  barTrackActive: { width: 20 },
  barFill: { width: '100%', borderRadius: 8, backgroundColor: colors.line, minHeight: 3 },
  barFillActive: { backgroundColor: colors.accent },
  barLabel: { fontSize: 9, color: colors.textDim, marginTop: 6 },
  barLabelActive: { color: colors.accent, fontWeight: '800' },
  barLabelToday: { color: colors.info },
  detailCard: {
    marginTop: 14,
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  detailTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  detailEmpty: { color: colors.textDim, fontSize: 11 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    minHeight: 44,
  },
  detailBillTitle: { fontSize: 12, fontWeight: '700', color: colors.text },
  detailBillMeta: { fontSize: 10, color: colors.textDim, marginTop: 2 },
  detailBillAmount: { fontSize: 12, fontWeight: '800', color: colors.accent, marginLeft: 8 },
  detailMore: { fontSize: 10, color: colors.textDim, marginTop: 8, textAlign: 'center' },
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
  allTimeValue: { fontSize: 22, fontWeight: '900', color: colors.text },
});

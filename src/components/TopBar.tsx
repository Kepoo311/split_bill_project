import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AppText } from './AppText';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  backLabel?: string;
  right?: React.ReactNode;
}

/**
 * Header standar untuk semua screen: tombol kembali Pressable dengan state
 * tekan + label aksesibilitas, judul satu baris, dan slot aksi kanan.
 */
export const TopBar: React.FC<TopBarProps> = ({
  title,
  onBack,
  backLabel = 'Kembali',
  right,
}) => (
  <View style={styles.topBar}>
    {onBack ? (
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={backLabel}
        style={({ pressed }) => [styles.backButton, pressed && styles.backPressed]}
      >
        <Ionicons name="chevron-back" size={20} color={colors.accent} />
        <AppText style={styles.backButtonText}>{backLabel}</AppText>
      </Pressable>
    ) : (
      <View style={styles.sideSpacer} />
    )}
    <AppText style={styles.screenTitle} numberOfLines={1}>
      {title}
    </AppText>
    {right ?? <View style={styles.sideSpacer} />}
  </View>
);

const styles = StyleSheet.create({
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 8,
    borderRadius: 6,
  },
  backPressed: { opacity: 0.6 },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginLeft: 2,
  },
  screenTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  sideSpacer: { width: 40 },
});

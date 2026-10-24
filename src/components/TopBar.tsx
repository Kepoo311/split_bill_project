import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';

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
  backLabel = '← Kembali',
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
        <Text style={styles.backButtonText}>{backLabel}</Text>
      </Pressable>
    ) : (
      <View style={styles.sideSpacer} />
    )}
    <Text style={styles.screenTitle} numberOfLines={1}>
      {title}
    </Text>
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
    paddingVertical: 4,
    paddingRight: 8,
    borderRadius: 6,
  },
  backPressed: { opacity: 0.6 },
  backButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  screenTitle: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 1,
  },
  sideSpacer: { width: 40 },
});

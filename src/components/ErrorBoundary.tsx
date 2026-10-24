import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { AppText } from './AppText';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Error boundary global: crash saat render ditangkap di sini, bukan
 * mematikan app diam-diam. "Coba Lagi" merender ulang subtree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('Error boundary menangkap crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={34} color={colors.warning} />
          <AppText style={styles.title}>Tampilan Gagal Dimuat</AppText>
          <AppText style={styles.message}>
            Terjadi error tak terduga. Data riwayatmu tetap aman di penyimpanan
            lokal — coba muat ulang tampilannya.
          </AppText>
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => this.setState({ hasError: false })}
            accessibilityRole="button"
          >
            <AppText style={styles.buttonText}>Coba Lagi</AppText>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  icon: { fontSize: 40, marginBottom: 16 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  buttonPressed: { opacity: 0.7 },
  buttonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});

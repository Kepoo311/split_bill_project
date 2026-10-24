import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ExpoSplashScreen from 'expo-splash-screen';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { colors } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [scaleAnim] = React.useState(new Animated.Value(0.8));
  const [textOpacity] = React.useState(new Animated.Value(0));
  const [slideAnim] = React.useState(new Animated.Value(50));

  useEffect(() => {
    // Keep splash screen visible until we hide it
    ExpoSplashScreen.preventAutoHideAsync().catch(() => {});

    // Animation sequence
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.delay(600),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to Home after animation
      setTimeout(async () => {
        try {
          await ExpoSplashScreen.hideAsync();
        } catch {}
        navigation.replace('Home');
      }, 2500);
    });
  }, [navigation, fadeAnim, scaleAnim, slideAnim, textOpacity]);

  const logoStyle = {
    opacity: fadeAnim,
    transform: [{ scale: scaleAnim }],
  };

  const textStyle = {
    opacity: textOpacity,
    transform: [{ translateY: slideAnim }],
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" translucent />
      
      <View style={styles.glowContainer}>
        <View style={styles.glow1} />
        <View style={styles.glow2} />
      </View>

      <Animated.View style={[styles.logoWrapper, logoStyle]}>
        <Image
          source={require('../../assets/LOGO.png')}
          style={styles.logo}
          contentFit="contain"
          transition={300}
        />
      </Animated.View>

      <Animated.View style={[styles.textContainer, textStyle]}>
        <Text style={styles.appName}>SPLIT BILL</Text>
        <Text style={styles.tagline}>Smart Bill Splitter</Text>
        <View style={styles.divider} />
        <Text style={styles.developer}>By KepoX</Text>
      </Animated.View>

      <View style={styles.loadingContainer}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingProgress,
              {
                transform: [{ scaleX: fadeAnim }],
              },
            ]}
          />
        </View>
        <Text style={styles.loadingText}>Memuat...</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  glow1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    top: '20%',
    left: '50%',
    marginLeft: -150,
  },
  glow2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(138, 43, 226, 0.12)',
    bottom: '25%',
    right: '10%',
  },
  logoWrapper: {
    zIndex: 1,
    marginBottom: 24,
  },
  logo: {
    width: 140,
    height: 140,
  },
  textContainer: {
    zIndex: 1,
    alignItems: 'center',
    marginBottom: 48,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 212, 255, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.accent,
    letterSpacing: 3,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  divider: {
    width: 60,
    height: 2,
    backgroundColor: colors.accent,
    marginVertical: 16,
    borderRadius: 1,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  developer: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
    letterSpacing: 1.5,
  },
  loadingContainer: {
    zIndex: 1,
    width: '70%',
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
    transformOrigin: 'left',
  },
  loadingText: {
    fontSize: 11,
    color: '#5A5A5E',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
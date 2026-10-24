import React from 'react';
import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';

/**
 * Text dengan IBM Plex Sans: fontWeight di style otomatis dipetakan ke file
 * font yang benar (Android tidak bisa mensintesis bold untuk custom family).
 * Nama family di bawah harus sama dengan key useFonts() di App.js.
 */

const FAMILY_REGULAR = 'IBMPlexSans_400Regular';
const FAMILY_MEDIUM = 'IBMPlexSans_500Medium';
const FAMILY_SEMIBOLD = 'IBMPlexSans_600SemiBold';
const FAMILY_BOLD = 'IBMPlexSans_700Bold';

const weightToFamily = (weight: TextStyle['fontWeight']): string => {
  switch (weight) {
    case '500':
      return FAMILY_MEDIUM;
    case '600':
      return FAMILY_SEMIBOLD;
    case '700':
    case 'bold':
    case '800':
    case '900':
      return FAMILY_BOLD;
    default:
      return FAMILY_REGULAR;
  }
};

export function AppText({ style, ...rest }: TextProps) {
  const flattened = StyleSheet.flatten(style) as TextStyle | undefined;
  const { fontWeight, ...styleWithoutWeight } = flattened ?? {};
  return <Text {...rest} style={[styleWithoutWeight, { fontFamily: weightToFamily(fontWeight) }]} />;
}

export const fontFamilies = {
  regular: FAMILY_REGULAR,
  medium: FAMILY_MEDIUM,
  semibold: FAMILY_SEMIBOLD,
  bold: FAMILY_BOLD,
} as const;

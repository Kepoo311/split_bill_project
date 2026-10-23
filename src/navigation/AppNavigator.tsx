import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import { HomeScreen } from '../screens/HomeScreen';
import { OcrScreen } from '../screens/OcrScreen';
import { SplitScreen } from '../screens/SplitScreen';
import { SummaryScreen } from '../screens/SummaryScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { HistoryDetailScreen } from '../screens/HistoryDetailScreen';
import { CameraScannerScreen } from '../screens/CameraScannerScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ShareBillScreen } from '../screens/ShareBillScreen';
import { ChangelogModal } from '../components/ChangelogModal';
import { useAppUpdates } from '../hooks/useAppUpdates';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { showChangelog, setShowChangelog } = useAppUpdates();

  return (
    <View style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            animation: 'fade',
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Ocr" component={OcrScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Split" component={SplitScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="Summary" component={SummaryScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="CameraScanner" component={CameraScannerScreen} options={{ animation: 'fade_from_bottom' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="ShareBill" component={ShareBillScreen} options={{ animation: 'slide_from_right' }} />
        </Stack.Navigator>
      </NavigationContainer>
      <ChangelogModal
        visible={!!showChangelog}
        entry={showChangelog}
        onClose={() => setShowChangelog(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

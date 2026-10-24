import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { LockGate } from './src/components/LockGate';

export default function App() {
  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <LockGate>
        <AppNavigator />
      </LockGate>
    </ErrorBoundary>
  );
}

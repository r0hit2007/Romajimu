import 'react-native-gesture-handler';
import React, { useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from './src/context/AppContext';
import { ShakeProvider } from './src/context/ShakeContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  // Shared navigation ref — passed to ShakeProvider so it can navigate
  // to the SOS screen from anywhere (even the Calculator Decoy).
  const navigationRef = useRef(null);

  return (
    <AppProvider>
      <ShakeProvider navigationRef={navigationRef}>
        <StatusBar style="light" />
        <RootNavigator navigationRef={navigationRef} />
      </ShakeProvider>
    </AppProvider>
  );
}

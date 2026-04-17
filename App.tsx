import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import { useAuth } from './src/hooks/useAuth';
import { useItems } from './src/hooks/useItems';
import { requestNotificationPermissions } from './src/services/notifications';
import { startLocationTracking, runForegroundCheck } from './src/services/locationTask';

export type RootStackParamList = {
  Home: undefined;
  AddItem: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { userId, ready } = useAuth();
  const { items, loading, add, remove } = useItems(userId);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Permissions + background tracking — runs once after auth is ready
  useEffect(() => {
    async function init() {
      const notifOk = await requestNotificationPermissions();
      if (!notifOk) {
        Alert.alert(
          'Notifications disabled',
          'Enable notifications in Settings to receive store reminders.'
        );
      }

      try {
        await startLocationTracking();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        Alert.alert('Location permission needed', msg);
      }
    }

    if (ready && userId) init();
  }, [ready, userId]);

  // Foreground fallback: run a location check whenever the app comes to the front.
  // This covers cases where the background task hasn't fired yet (e.g. the user
  // just opened the app while standing next to a store).
  useEffect(() => {
    if (!ready || !userId) return;

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (next === 'active' && wasBackground) {
        runForegroundCheck();
      }
    });

    return () => sub.remove();
  }, [ready, userId]);

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#f5f5f7' },
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '700', fontSize: 18 },
          contentStyle: { backgroundColor: '#f5f5f7' },
        }}
      >
        <Stack.Screen
          name="Home"
          options={{ title: 'RemindMe' }}
        >
          {() => <HomeScreen items={items} loading={loading || !ready} onDelete={remove} />}
        </Stack.Screen>

        <Stack.Screen
          name="AddItem"
          options={{
            title: 'Add Item',
            presentation: 'modal',
            headerStyle: { backgroundColor: '#fff' },
          }}
        >
          {() => <AddItemScreen onAdd={add} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

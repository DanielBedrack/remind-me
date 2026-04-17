import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus, TouchableOpacity, Text } from 'react-native';

import HomeScreen from './src/screens/HomeScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import AuthScreen from './src/screens/AuthScreen';
import { useAuth } from './src/hooks/useAuth';
import { useItems } from './src/hooks/useItems';
import { requestNotificationPermissions } from './src/services/notifications';
import { startLocationTracking, runForegroundCheck } from './src/services/locationTask';
import { signOut } from './src/services/firebase';
import { ShoppingItem } from './src/types';

export type RootStackParamList = {
  Auth: undefined;
  Home: undefined;
  AddItem: { editItem?: ShoppingItem };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { userId, ready } = useAuth();
  const { items, loading, add, update, remove } = useItems(userId);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    async function init() {
      const notifOk = await requestNotificationPermissions();
      if (!notifOk) {
        Alert.alert('Notifications disabled', 'Enable notifications in Settings to receive store reminders.');
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

  useEffect(() => {
    if (!ready || !userId) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (next === 'active' && wasBackground) runForegroundCheck();
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
        {ready && !userId ? (
          <Stack.Screen name="Auth" options={{ headerShown: false }}>
            {() => <AuthScreen />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen
              name="Home"
              options={{
                title: 'RemindMe',
                headerRight: () => (
                  <TouchableOpacity onPress={() => signOut()} style={{ paddingHorizontal: 4 }}>
                    <Text style={{ color: '#4A90E2', fontSize: 14 }}>Sign out</Text>
                  </TouchableOpacity>
                ),
              }}
            >
              {() => (
                <HomeScreen
                  items={items}
                  loading={loading || !ready}
                  onDelete={remove}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="AddItem"
              options={({ route }) => ({
                title: route.params?.editItem ? 'Edit Item' : 'Add Item',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#fff' },
              })}
            >
              {() => <AddItemScreen onAdd={add} onUpdate={update} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

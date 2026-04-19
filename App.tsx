import './src/i18n';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import ListScreen from './src/screens/ListScreen';
import MapScreen from './src/screens/MapScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import AuthScreen from './src/screens/AuthScreen';
import SetupScreen from './src/screens/SetupScreen';
import BottomTabBar from './src/components/BottomTabBar';
import { ItemsContext } from './src/context/ItemsContext';
import { useAuth } from './src/hooks/useAuth';
import { useItems } from './src/hooks/useItems';
import { requestNotificationPermissions } from './src/services/notifications';
import { startLocationTracking, runForegroundCheck } from './src/services/locationTask';
import { fetchProfile } from './src/services/userProfile';
import { C } from './src/theme';
import { LanguageProvider } from './src/context/LanguageContext';
import { LocationProvider } from './src/context/LocationContext';
import { ShoppingItem } from './src/types';

export type RootStackParamList = {
  Auth:    undefined;
  Setup:   undefined;
  Main:    undefined;
  AddItem: { editItem?: ShoppingItem };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab   = createBottomTabNavigator();

const NavTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: C.bg },
};

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: C.card },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '800', fontSize: 18, color: C.textPrimary },
        headerTintColor: C.accent,
      }}
    >
      <Tab.Screen name="Home"    component={DashboardScreen} options={{ title: 'RemindMe' }} />
      <Tab.Screen name="List"    component={ListScreen}      options={{ title: 'My List' }} />
      <Tab.Screen name="Add"     component={ListScreen}      options={{ title: '' }} />
      <Tab.Screen name="Map"     component={MapScreen}       options={{ title: 'Map' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}   options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { userId, user, ready } = useAuth();
  const { items, loading, add, update, updateQuantity, remove, collect } = useItems(userId);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // null = unknown, false = needs setup, true = done
  const [setupComplete, setSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) { setSetupComplete(null); return; }
    fetchProfile(userId).then((p) => setSetupComplete(p?.setupComplete ?? false));
  }, [userId]);

  useEffect(() => {
    async function init() {
      const notifOk = await requestNotificationPermissions();
      if (!notifOk && typeof window === 'undefined') {
        Alert.alert('Notifications disabled', 'Enable notifications in Settings to receive store reminders.');
      }
      try { await startLocationTracking(); } catch {}
    }
    if (ready && userId && setupComplete) init();
  }, [ready, userId, setupComplete]);

  useEffect(() => {
    if (!ready || !userId) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const wasBackground = appState.current === 'background' || appState.current === 'inactive';
      appState.current = next;
      if (next === 'active' && wasBackground) runForegroundCheck();
    });
    return () => sub.remove();
  }, [ready, userId]);

  const showSetup  = ready && !!userId && setupComplete === false;
  const showMain   = ready && !!userId && setupComplete === true;
  const showAuth   = ready && !userId;

  const ctxValue = useMemo(
    () => ({ items, loading, add, update, updateQuantity, remove, collect }),
    [items, loading, add, update, updateQuantity, remove, collect]
  );

  return (
    <LanguageProvider>
    <LocationProvider>
    <ItemsContext.Provider value={ctxValue}>
      <NavigationContainer theme={NavTheme}>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: C.card },
            headerShadowVisible: false,
            headerTitleStyle: { fontWeight: '800', fontSize: 18, color: C.textPrimary },
            headerTintColor: C.accent,
            contentStyle: { backgroundColor: C.bg },
          }}
        >
          {showAuth ? (
            <Stack.Screen name="Auth" options={{ headerShown: false }}>
              {() => <AuthScreen />}
            </Stack.Screen>
          ) : showSetup ? (
            <Stack.Screen name="Setup" options={{ headerShown: false }}>
              {() => (
                <SetupScreen
                  userId={userId!}
                  userEmail={user?.email ?? ''}
                  onComplete={() => setSetupComplete(true)}
                />
              )}
            </Stack.Screen>
          ) : showMain ? (
            <>
              <Stack.Screen name="Main" options={{ headerShown: false }}>
                {() => <MainTabs />}
              </Stack.Screen>
              <Stack.Screen
                name="AddItem"
                options={({ route }) => ({
                  title: route.params?.editItem ? 'Edit Item' : 'Add Item',
                  presentation: 'modal',
                  headerStyle: { backgroundColor: C.card },
                })}
              >
                {() => <AddItemScreen onAdd={add} onUpdate={update} />}
              </Stack.Screen>
            </>
          ) : (
            // userId set but profile still loading — blank screen (avoids flash back to Auth)
            <Stack.Screen name="Auth" options={{ headerShown: false }}>
              {() => (
                <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={C.accent} />
                </View>
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ItemsContext.Provider>
    </LocationProvider>
    </LanguageProvider>
  );
}

import './src/i18n'; // must be first — initializes i18next before any component renders
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Alert, AppState, AppStateStatus } from 'react-native';

import DashboardScreen from './src/screens/DashboardScreen';
import ListScreen from './src/screens/ListScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AddItemScreen from './src/screens/AddItemScreen';
import AuthScreen from './src/screens/AuthScreen';
import BottomTabBar from './src/components/BottomTabBar';
import { ItemsContext } from './src/context/ItemsContext';
import { useAuth } from './src/hooks/useAuth';
import { useItems } from './src/hooks/useItems';
import { requestNotificationPermissions } from './src/services/notifications';
import { startLocationTracking, runForegroundCheck } from './src/services/locationTask';
import { C } from './src/theme';
import { LanguageProvider } from './src/context/LanguageContext';
import { ShoppingItem } from './src/types';

export type RootStackParamList = {
  Auth:     undefined;
  Main:     undefined;
  AddItem:  { editItem?: ShoppingItem };
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
      <Tab.Screen name="History" component={HistoryScreen}   options={{ title: 'History' }} />
      <Tab.Screen name="Profile" component={ProfileScreen}   options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { userId, ready } = useAuth();
  const { items, loading, add, update, updateQuantity, remove, collect } = useItems(userId);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    async function init() {
      const notifOk = await requestNotificationPermissions();
      if (!notifOk && typeof window === 'undefined') {
        Alert.alert('Notifications disabled', 'Enable notifications in Settings to receive store reminders.');
      }
      try { await startLocationTracking(); } catch { /* web or permission denied — fine */ }
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
    <LanguageProvider>
    <ItemsContext.Provider value={{ items, loading, add, update, updateQuantity, remove, collect }}>
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
          {ready && !userId ? (
            <Stack.Screen name="Auth" options={{ headerShown: false }}>
              {() => <AuthScreen />}
            </Stack.Screen>
          ) : (
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
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </ItemsContext.Provider>
    </LanguageProvider>
  );
}

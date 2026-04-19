import React, { useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Platform } from 'react-native';

import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { C } from '../theme';

type IconName = 'home' | 'home-outline' | 'format-list-bulleted' | 'format-list-bulleted-square' | 'map-outline' | 'map' | 'account' | 'account-outline' | 'plus';

const TAB_CONFIG: Record<string, { icon: IconName; activeIcon: IconName; label: string }> = {
  Home:    { icon: 'home-outline',                   activeIcon: 'home',                       label: 'Home'    },
  List:    { icon: 'format-list-bulleted',            activeIcon: 'format-list-bulleted-square', label: 'List'    },
  Add:     { icon: 'plus',                            activeIcon: 'plus',                        label: ''        },
  Map:     { icon: 'map-outline',                     activeIcon: 'map',                         label: 'Map'     },
  Profile: { icon: 'account-outline',                 activeIcon: 'account',                     label: 'Profile' },
};

export default function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const fabScale = useRef(new Animated.Value(1)).current;

  function onFabPressIn() {
    Animated.spring(fabScale, { toValue: 0.88, useNativeDriver: Platform.OS !== 'web', speed: 50 }).start();
  }
  function onFabPressOut() {
    Animated.spring(fabScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 30 }).start();
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {/* Elevated FAB lives above bar — positioned absolutely */}
      <Animated.View style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          onPress={() => navigation.getParent()?.navigate('AddItem', {})}
          onPressIn={onFabPressIn}
          onPressOut={onFabPressOut}
          activeOpacity={1}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isActive = state.index === index;
          const cfg = TAB_CONFIG[route.name];
          if (!cfg) return null;

          if (route.name === 'Add') {
            // Spacer for the FAB slot
            return <View key={route.key} style={styles.fabSpacer} />;
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={(isActive ? cfg.activeIcon : cfg.icon) as any}
                size={24}
                color={isActive ? C.accent : C.textTertiary}
              />
              {cfg.label ? (
                <Text style={[styles.label, isActive && styles.labelActive]}>
                  {cfg.label}
                </Text>
              ) : null}
              {isActive && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.tabBar,
    borderTopWidth: 1,
    borderTopColor: C.tabBarBorder,
    ...Platform.select({
      web: { boxShadow: '0px -4px 24px rgba(0,0,0,0.4)' } as any,
      default: { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.4, shadowRadius: 12 },
    }),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: C.textTertiary,
  },
  labelActive: {
    color: C.accent,
    fontWeight: '700',
  },
  dot: {
    position: 'absolute',
    bottom: 0,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  fabSpacer: {
    flex: 1,
  },
  fabWrap: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    zIndex: 10,
    ...Platform.select({
      web: { filter: `drop-shadow(0px 4px 16px ${C.accent}60)` } as any,
      default: { shadowColor: C.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 12 },
    }),
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: C.tabBar,
  },
});

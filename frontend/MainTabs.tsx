import React, { useEffect } from 'react'
import { View, Text, Platform, Dimensions, StyleSheet, Animated } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { RouteProp } from '@react-navigation/native'

import BookingScreen            from './screens/BookingScreen'
import ProfileScreen            from './screens/ProfileScreen'
import AdminStoresScreen        from './screens/AdminStoresScreen'
import AdminUserProfileScreen   from './screens/AdminUserProfileScreen'   // ← new tab
import { RootStackParamList }   from './App'

type MainRouteProp = RouteProp<RootStackParamList, 'Main'>

/* Base tab list; extra keys added conditionally */
type TabParamList = {
  Booking:      { userId: string; email: string }
  Stores:       { userId: string; email: string }
  Profile:      { userId: string; email: string }
  AdminProfile: { userId: string }                // ← admin-only tab
}

const Tab = createBottomTabNavigator<TabParamList>()

/*  layout helpers  */
const { width: SCREEN_WIDTH } = Dimensions.get('window')
const COLORS = {
  primary:   '#5A67D8',
  inactive:  '#A0AEC0',
  background:'#FFFFFF',
  shadow:    '#000000',
}

/* animated icon */
const TabBarIcon = ({
  focused, icon, label,
}: { focused: boolean; icon: string; label: string }) => {
  const scale = React.useRef(new Animated.Value(1)).current
  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 200, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 100, useNativeDriver: true }),
      ]).start()
    }
  }, [focused])

  return (
    <View style={styles.tabIconContainer}>
      <Animated.Text style={[styles.tabIcon, { transform: [{ scale }] }]}>
        {icon}
      </Animated.Text>
      <Text style={[
        styles.tabLabel,
        { color: focused ? COLORS.primary : COLORS.inactive, fontWeight: focused ? '600' : '400' },
      ]}>
        {label}
      </Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  )
}

export default function MainTabs({ route }: { route: MainRouteProp }) {
  const { userId, email, isAdmin, screen } = route.params
  const insets  = useSafeAreaInsets()
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10)

  /* pick default tab */
  const initial = screen ?? (isAdmin ? 'Stores' : 'Booking')

  return (
    <Tab.Navigator
      initialRouteName={initial as any}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 60 + bottomPadding,
          paddingBottom: bottomPadding,
          backgroundColor: COLORS.background,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          paddingHorizontal: SCREEN_WIDTH * 0.05,
        },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
      }}
    >
      {/* ───── Normal-user tabs ───── */}
      {!isAdmin && (
        <>
          <Tab.Screen
            name="Booking"
            component={BookingScreen}
            initialParams={{ userId, email }}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabBarIcon focused={focused} icon="🍽️" label="Restaurants" />
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            initialParams={{ userId, email }}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabBarIcon focused={focused} icon="👤" label="Profile" />
              ),
            }}
          />
        </>
      )}

      {/* ───── Admin-only tabs ───── */}
      {isAdmin && (
        <>
          <Tab.Screen
            name="Stores"
            component={AdminStoresScreen}
            initialParams={{ userId, email }}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabBarIcon focused={focused} icon="🍱" label="Stores" />
              ),
            }}
          />
          <Tab.Screen
            name="AdminProfile"
            component={AdminUserProfileScreen}
            initialParams={{ userId }}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabBarIcon focused={focused} icon="👤" label="Profile" />
              ),
            }}
          />
        </>
      )}
    </Tab.Navigator>
  )
}

/* styles */
const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 10, width: SCREEN_WIDTH * 0.25, position: 'relative',
  },
  tabIcon: { fontSize: 24, marginBottom: 4 },
  tabLabel: { fontSize: 12, textAlign: 'center' },
  activeIndicator: {
    position: 'absolute', bottom: -12,
    width: 5, height: 5, borderRadius: 2.5, backgroundColor: COLORS.primary,
  },
})

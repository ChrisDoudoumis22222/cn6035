import React, { useEffect } from 'react';
import { View, Text, Platform, Dimensions, StyleSheet, Animated } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation } from '@react-navigation/native';
import BookingScreen from './screens/BookingScreen';
import ProfileScreen from './screens/ProfileScreen';
import { RootStackParamList } from './App';

type MainRouteProp = RouteProp<RootStackParamList, 'Main'>;

type TabParamList = {
  Booking: { userId: string; email: string };
  Profile: { userId: string; email: string };
};

const Tab = createBottomTabNavigator<TabParamList>();

// Get screen dimensions for responsive sizing
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Define theme colors
const COLORS = {
  primary: '#5A67D8',
  inactive: '#A0AEC0',
  background: '#FFFFFF',
  shadow: '#000000',
};

// Custom tab bar icon component with animation
const TabBarIcon = ({ 
  focused, 
  icon, 
  label 
}: { 
  focused: boolean; 
  icon: string; 
  label: string;
}) => {
  // Animation value for scaling effect
  const scaleValue = React.useRef(new Animated.Value(1)).current;
  
  // Run animation when tab focus changes
  useEffect(() => {
    if (focused) {
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, scaleValue]);

  return (
    <View style={styles.tabIconContainer}>
      <Animated.Text 
        style={[
          styles.tabIcon,
          { 
            opacity: focused ? 1 : 0.7,
            transform: [{ scale: scaleValue }],
          }
        ]}
      >
        {icon}
      </Animated.Text>
      <Text 
        style={[
          styles.tabLabel,
          { 
            color: focused ? COLORS.primary : COLORS.inactive,
            fontWeight: focused ? '600' : '400',
          }
        ]}
      >
        {label}
      </Text>
      {focused && <View style={styles.activeIndicator} />}
    </View>
  );
};

export default function MainTabs({ route }: { route: MainRouteProp }) {
  const { userId, email } = route.params;
  const insets = useSafeAreaInsets();
  
  // Calculate bottom padding based on safe area
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 20 : 10);

  return (
    <Tab.Navigator
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
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: SCREEN_WIDTH * 0.05, // 5% of screen width for padding
        },
        tabBarShowLabel: false,
        tabBarHideOnKeyboard: true,
        // Add smooth animation between tabs
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarAllowFontScaling: false, // Prevent font scaling for accessibility
      }}
    >
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        initialParams={{ userId, email }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon="🍽️" 
              label="Restaurants" 
            />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        initialParams={{ userId, email }}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabBarIcon 
              focused={focused} 
              icon="👤" 
              label="Profile" 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Styles extracted for better organization
const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    width: SCREEN_WIDTH * 0.25, // 25% of screen width for each tab
    position: 'relative',
  },
  tabIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -12,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.primary,
  },
});
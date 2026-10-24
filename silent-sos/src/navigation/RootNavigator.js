import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Auth screens
import LoginScreen from '../screens/Auth/LoginScreen';
import SignupScreen from '../screens/Auth/SignupScreen';
import ForgotPasswordScreen from '../screens/Auth/ForgotPasswordScreen';

// Onboarding
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';

// Main app screens
import HelpScreen from '../screens/Main/HelpScreen';
import ContactsScreen from '../screens/Main/ContactsScreen';
import SupportScreen from '../screens/Main/SupportScreen';
import SettingsScreen from '../screens/Main/SettingsScreen';
import CalculatorScreen from '../screens/Main/CalculatorScreen';

// Context
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY } from '../constants/theme';

const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// ─── Tab Icon Component ────────────────────────────────────

function TabIcon({ icon, label, focused }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text style={{
        fontSize: 10,
        color: focused ? COLORS.primaryLight : COLORS.textMuted,
        fontWeight: focused ? '600' : '400',
      }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Main Tab Navigator ────────────────────────────────────

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg1,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 84,
          paddingTop: 8,
          paddingBottom: 24,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Help"
        component={HelpScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🛡️" label="Safety" focused={focused} />,
          tabBarAccessibilityLabel: 'Safety screen',
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Contacts" focused={focused} />,
          tabBarAccessibilityLabel: 'Contacts screen',
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="💙" label="Support" focused={focused} />,
          tabBarAccessibilityLabel: 'Support resources screen',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" label="Settings" focused={focused} />,
          tabBarAccessibilityLabel: 'Settings screen',
        }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Navigator ────────────────────────────────────────
// navigationRef is passed in from App.js so ShakeProvider can
// navigate to the Help screen from anywhere in the app.

export default function RootNavigator({ navigationRef }) {
  const { settings, isLoading } = useApp();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🛡️</Text>
        <Text style={{ color: COLORS.textSecondary, fontSize: TYPOGRAPHY.size.base }}>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!settings.isAuthenticated ? (
          // Auth flow — shake does NOT navigate here (navigationRef guard)
          <RootStack.Group>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="Support" component={SupportScreen} />
          </RootStack.Group>
        ) : !settings.onboardingComplete ? (
          // Onboarding
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : settings.launchIntoDecoy && settings.calculatorDecoyEnabled ? (
          // Decoy-first mode: Calculator is the landing screen
          <RootStack.Group>
            <RootStack.Screen name="Calculator" component={CalculatorScreen} />
            <RootStack.Screen name="MainApp" component={MainTabs} />
          </RootStack.Group>
        ) : (
          // Normal mode
          <RootStack.Group>
            <RootStack.Screen name="MainApp" component={MainTabs} />
            <RootStack.Screen name="Calculator" component={CalculatorScreen} />
          </RootStack.Group>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

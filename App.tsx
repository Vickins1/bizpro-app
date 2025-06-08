import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, Image, Dimensions } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import InventoryScreen from './src/screens/InventoryScreen';
import SalesScreen from './src/screens/SalesScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { initDB } from './src/database/db';
import { enableScreens } from 'react-native-screens';
import { ThemeProvider, useAppTheme } from './src/context/ThemeContext';

enableScreens();

export type RootStackParamList = {
  Home: undefined;
  Inventory: undefined;
  Sales: undefined;
  Reports: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootStackParamList>();

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [appIsReady, setAppIsReady] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const { width, height } = Dimensions.get('window');
  const { theme } = useAppTheme();

  useEffect(() => {
    async function prepare() {
      try {
        await initDB();
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (e) {
        console.warn('Initialization error:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (appIsReady) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          SplashScreen.hideAsync();
        });
      });
    }
    return () => {
      fadeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [appIsReady, fadeAnim, scaleAnim]);

  if (!appIsReady) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: theme.colors.background }]}>
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          <Image
            source={require('./assets/logo.png')}
            style={[styles.logo, { width: width * 0.5, height: width * 0.5 }]}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  const tabBarIcon = ({ route, color, size, focused }: { route: keyof RootStackParamList; color: string; size: number; focused: boolean }) => {
    let iconName: 'home' | 'warehouse' | 'cash-register' | 'chart-bar' | 'cog';
    switch (route) {
      case 'Home': iconName = 'home'; break;
      case 'Inventory': iconName = 'warehouse'; break;
      case 'Sales': iconName = 'cash-register'; break;
      case 'Reports': iconName = 'chart-bar'; break;
      default: iconName = 'cog';
    }

    const scaleAnim = new Animated.Value(focused ? 1.1 : 1);
    const opacityAnim = new Animated.Value(focused ? 1 : 0.7);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.1 : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
        <MaterialCommunityIcons name={iconName} size={size} color={color} />
      </Animated.View>
    );
  };

  return (
    <PaperProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size, focused }) => tabBarIcon({ route: route.name as keyof RootStackParamList, color, size, focused }),
            tabBarLabelStyle: {
              fontSize: width * 0.03,
              fontWeight: '600',
              marginBottom: 8,
              letterSpacing: 0.5,
            },
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.secondary,
            tabBarStyle: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderTopWidth: 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: height * 0.1,
              paddingTop: 10,
              paddingBottom: height * 0.015,
              paddingHorizontal: 12,
              shadowColor: theme.colors.text,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: theme.elevation,
              position: 'absolute',
            },
            tabBarItemStyle: {
              borderRadius: 12,
              marginHorizontal: 6,
              paddingVertical: 6,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
            headerShown: false,
          })}
        >
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Inventory" component={InventoryScreen} />
          <Tab.Screen name="Sales" component={SalesScreen} />
          <Tab.Screen name="Reports" component={ReportsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    maxWidth: '80%',
    maxHeight: '80%',
  },
});
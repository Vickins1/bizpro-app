import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, View, Image } from 'react-native';
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

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];

  useEffect(() => {
    async function prepare() {
      try {
        await initDB();
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.warn(e);
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
          duration: 1000,
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
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          SplashScreen.hideAsync();
        });
      });
    }
  }, [appIsReady, fadeAnim, scaleAnim]);

  if (!appIsReady) {
    return (
      <View style={styles.splashContainer}>
        <Animated.View style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    );
  }

  const tabBarIcon = ({ route, color, size, focused }: { route: keyof RootStackParamList; color: string; size: number; focused: boolean }) => {
    let iconName: 'home' | 'warehouse' | 'cash-register' | 'chart-bar' | 'cog';
    if (route === 'Home') iconName = 'home';
    else if (route === 'Inventory') iconName = 'warehouse';
    else if (route === 'Sales') iconName = 'cash-register';
    else if (route === 'Reports') iconName = 'chart-bar';
    else iconName = 'cog';

    const scaleAnim = new Animated.Value(focused ? 1.2 : 1);
    const opacityAnim = new Animated.Value(focused ? 1 : 0.7);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.2 : 1,
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
              fontSize: 11,
              fontWeight: '600',
              marginBottom: 6,
              letterSpacing: 0.5,
            },
            tabBarActiveTintColor: '#FF6F61',
            tabBarInactiveTintColor: '#E0E0E0',
            tabBarStyle: {
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              borderTopWidth: 0,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              height: 80,
              paddingTop: 8,
              paddingBottom: 10,
              paddingHorizontal: 10,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.2,
              shadowRadius: 10,
              elevation: 12,
              position: 'absolute',
              overflow: 'hidden',
            },
            tabBarItemStyle: {
              borderRadius: 12,
              marginHorizontal: 4,
              paddingVertical: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
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

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6F61',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 200,
  },
});
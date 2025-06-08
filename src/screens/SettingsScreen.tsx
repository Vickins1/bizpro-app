import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, Switch, Alert, Modal, Animated, ActivityIndicator, ScrollView, ViewStyle } from 'react-native';
import { Text, Button, TextInput, FAB, Avatar, Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '../database/db';
import { Dimensions } from 'react-native';
import { globalStyles } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import GradientCard from '../components/GradientCard';

type Settings = {
  theme: 'light' | 'dark';
  notifications: {
    lowStock: boolean;
    dailySales: boolean;
  };
  currency: string;
  userName: string;
  language: string;
  lowStockThreshold: number;
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'none';
};

const { width, height } = Dimensions.get('window');

const SettingsScreen: React.FC = () => {
  const { theme, setThemeType } = useAppTheme();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currencyMenuVisible, setCurrencyMenuVisible] = useState(false);
  const [languageMenuVisible, setLanguageMenuVisible] = useState(false);
  const [backupMenuVisible, setBackupMenuVisible] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const cardAnims = useRef<Animated.Value[]>([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const currencies = ['KES', 'USD', 'EUR', 'GBP'] as const;
  const languages = ['english', 'french', 'spanish'] as const;
  const backupFrequencies: ('daily' | 'weekly' | 'monthly' | 'none')[] = ['daily', 'weekly', 'monthly', 'none'];

  const loadSettings = useCallback(async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('settings');
      const defaultSettings: Settings = {
        theme: 'dark',
        notifications: { lowStock: true, dailySales: false },
        currency: 'KES',
        userName: 'User',
        language: 'english',
        lowStockThreshold: 10,
        backupFrequency: 'none',
      };
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        const updatedSettings = { ...defaultSettings, ...parsedSettings };
        setSettings(updatedSettings);
        setNewUserName(parsedSettings.userName || 'User');
        setThemeType(updatedSettings.theme);
      } else {
        setSettings(defaultSettings);
        setNewUserName(defaultSettings.userName);
        setThemeType(defaultSettings.theme);
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        ...cardAnims.map((anim, index) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            delay: index * 100,
            useNativeDriver: true,
          })
        ),
      ]).start();
    } catch (err) {
      Alert.alert('Error', 'Failed to load settings', [
        { text: 'Retry', onPress: () => loadSettings() },
        { text: 'Cancel' },
      ]);
    }
  }, [cardAnims, fadeAnim, setThemeType]);

  useEffect(() => {
    loadSettings();
    return () => {
      cardAnims.forEach(anim => anim.stopAnimation());
      fadeAnim.stopAnimation();
      modalAnim.stopAnimation();
    };
  }, [loadSettings]);

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => modalAnim.setValue(0));
    }
  }, [modalVisible]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings', [
        { text: 'Retry', onPress: () => saveSettings() },
        { text: 'Cancel' },
      ]);
    }
  }, [settings]);

  useEffect(() => {
    saveSettings();
  }, [settings, saveSettings]);

  const exportDatabase = useCallback(() => {
    Alert.alert('Export', 'Database export is not yet implemented.');
  }, []);

  const backupDatabase = useCallback((type: string) => {
    Alert.alert('Backup', `Database ${type} backup is not yet implemented.`);
  }, []);

  const resetDatabase = useCallback(() => {
    Alert.alert(
      'Reset Database',
      'This will delete all inventory and sales data. Are you sure?',
      [
        { text: 'Cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM inventory');
              await db.runAsync('DELETE FROM sales');
              Alert.alert('Success', 'Database reset');
            } catch (err) {
              Alert.alert('Error', 'Failed to reset database', [
                { text: 'Retry', onPress: () => resetDatabase() },
                { text: 'Cancel' },
              ]);
            }
          },
        },
      ]
    );
  }, []);

  const updateUserName = useCallback(() => {
    if (!newUserName.trim()) {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }
    if (settings) {
      setSettings({ ...settings, userName: newUserName.trim() });
      setModalVisible(false);
    }
  }, [newUserName, settings]);

  const toggleTheme = useCallback(() => {
    if (!settings) return;
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings({ ...settings, theme: newTheme });
    setThemeType(newTheme);
  }, [settings, setThemeType]);

  const renderCard = (index: number, title: string, content: React.ReactNode) => (
    <Animated.View
      style={{
        opacity: cardAnims[index],
        transform: [{ translateY: cardAnims[index].interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
      }}
    >
      <GradientCard accessibilityLabel={`${title} settings card`} accessibilityRole="region">
        <Text
          variant="titleLarge"
          style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel={title}
          accessibilityRole="header"
        >
          {title}
        </Text>
        {content}
      </GradientCard>
    </Animated.View>
  );

  if (!settings) {
    return (
      <View style={[globalStyles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text
          style={[globalStyles.cardText, { color: theme.colors.text, marginTop: 8 }]}
          accessible={true}
          accessibilityLabel="Loading settings"
        >
          Loading Settings...
        </Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={false}
            accessibilityLabel="Settings content"
            accessibilityRole="scrollbar"
          >
            <Text
              variant="titleLarge"
              style={[globalStyles.title, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel="Settings Title"
              accessibilityRole="header"
            >
              Settings
            </Text>
            <View style={[styles.sectionContainer, { marginBottom: 80 }]}>
              {renderCard(0, 'User Profile', (
                <View style={styles.profileContainer}>
                  {false ? (
                    <Avatar.Image
                      size={40}
                      source={require('../../assets/user-profile.png')}
                      style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                      accessible={true}
                      accessibilityLabel="User avatar"
                    />
                  ) : (
                    <Avatar.Text
                      size={40}
                      label={settings.userName[0] || '?'}
                      style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
                      accessible={true}
                      accessibilityLabel="User avatar"
                    />
                  )}
                  <View style={styles.profileTextContainer}>
                    <Text
                      style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                      accessible={true}
                      accessibilityLabel={`User: ${settings.userName}`}
                    >
                      {settings.userName}
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => {
                        setNewUserName(settings.userName);
                        setModalVisible(true);
                      }}
                      textColor={theme.colors.accent}
                      accessible={true}
                      accessibilityLabel="Edit user name"
                      accessibilityRole="button"
                    >
                      Edit Name
                    </Button>
                  </View>
                </View>
              ))}
              {renderCard(1, 'Preferences', (
                <>
                  <View style={styles.settingsRow}>
                    <Text
                      style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                      accessible={true}
                      accessibilityLabel="Dark theme"
                    >
                      Dark Theme
                    </Text>
                    <Switch
                      value={settings.theme === 'dark'}
                      onValueChange={toggleTheme}
                      trackColor={{ true: theme.colors.primary, false: theme.colors.secondary }}
                      thumbColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Toggle dark theme"
                      accessibilityRole="switch"
                      accessibilityState={{ checked: settings.theme === 'dark' }}
                    />
                  </View>
                  <View style={styles.settingsRow}>
                    <Text
                      style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                      accessible={true}
                      accessibilityLabel="Low stock alerts"
                    >
                      Low Stock Alerts
                    </Text>
                    <Switch
                      value={settings.notifications.lowStock}
                      onValueChange={() =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            lowStock: !settings.notifications.lowStock,
                          },
                        })
                      }
                      trackColor={{ true: theme.colors.primary, false: theme.colors.secondary }}
                      thumbColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Toggle low stock alerts"
                      accessibilityRole="switch"
                      accessibilityState={{ checked: settings.notifications.lowStock }}
                    />
                  </View>
                  <View style={styles.settingsRow}>
                    <Text
                      style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                      accessible={true}
                      accessibilityLabel="Daily sales summaries"
                    >
                      Daily Sales Summaries
                    </Text>
                    <Switch
                      value={settings.notifications.dailySales}
                      onValueChange={() =>
                        setSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            dailySales: !settings.notifications.dailySales,
                          },
                        })
                      }
                      trackColor={{ true: theme.colors.primary, false: theme.colors.secondary }}
                      thumbColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Toggle daily sales summaries"
                      accessibilityRole="switch"
                      accessibilityState={{ checked: settings.notifications.dailySales }}
                    />
                  </View>
                  <View style={styles.settingsRow}>
                    <Text
                      style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                      accessible={true}
                      accessibilityLabel="Low stock threshold"
                    >
                      Low Stock Threshold
                    </Text>
                    <TextInput
                      value={settings.lowStockThreshold.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text);
                        if (!isNaN(value) && value >= 0) {
                          setSettings({ ...settings, lowStockThreshold: value });
                        } else if (text.trim() === '') {
                          setSettings({ ...settings, lowStockThreshold: 0 });
                        }
                      }}
                      keyboardType="numeric"
                      style={styles.input}
                      mode="outlined"
                      theme={{
                        roundness: theme.borderRadius.medium,
                        colors: {
                          text: theme.colors.text,
                          primary: theme.colors.primary,
                          background: theme.colors.background === '#1A1A1A' ? '#2A2A2A' : '#E0E0E0',
                          placeholder: theme.colors.secondary,
                          outline: theme.colors.primary,
                        },
                      }}
                      textColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Enter low stock threshold"
                    />
                  </View>
                </>
              ))}
              <View style={styles.menuContainer}>
                <Menu
                  visible={currencyMenuVisible}
                  onDismiss={() => setCurrencyMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setCurrencyMenuVisible(true)}
                      style={styles.menuButton}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Select currency"
                      accessibilityRole="button"
                      uppercase={false}
                    >
                      {settings.currency || 'Select currency'}
                    </Button>
                  }
                  contentStyle={[styles.menuContent, { backgroundColor: theme.colors.background }]}
                >
                  {currencies.map((currency) => (
                    <Menu.Item
                      key={currency}
                      title={currency}
                      onPress={() => {
                        setSettings({ ...settings, currency });
                        setCurrencyMenuVisible(false);
                      }}
                      accessibilityLabel={`Currency ${currency}`}
                    />
                  ))}
                </Menu>
                <Menu
                  visible={languageMenuVisible}
                  onDismiss={() => setLanguageMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setLanguageMenuVisible(true)}
                      style={styles.menuButton}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Select language"
                      accessibilityRole="button"
                      uppercase={false}
                    >
                      {settings.language.charAt(0).toUpperCase() + settings.language.slice(1) || 'Select language'}
                    </Button>
                  }
                  contentStyle={[styles.menuContent, { backgroundColor: theme.colors.background }]}
                >
                  {languages.map((lang) => (
                    <Menu.Item
                      key={lang}
                      title={lang.charAt(0).toUpperCase() + lang.slice(1)}
                      onPress={() => {
                        setSettings({ ...settings, language: lang });
                        setLanguageMenuVisible(false);
                      }}
                      accessibilityLabel={`Language ${lang}`}
                    />
                  ))}
                </Menu>
                <Menu
                  visible={backupMenuVisible}
                  onDismiss={() => setBackupMenuVisible(false)}
                  anchor={
                    <Button
                      mode="contained"
                      onPress={() => setBackupMenuVisible(true)}
                      style={styles.menuButton}
                      buttonColor={theme.colors.primary}
                      textColor={theme.colors.text}
                      accessible={true}
                      accessibilityLabel="Select backup frequency"
                      accessibilityRole="button"
                      uppercase={false}
                    >
                      {settings.backupFrequency.charAt(0).toUpperCase() + settings.backupFrequency.slice(1) || 'Select backup frequency'}
                    </Button>
                  }
                  contentStyle={[styles.menuContent, { backgroundColor: theme.colors.background }]}
                >
                  {backupFrequencies.map((frequency) => (
                    <Menu.Item
                      key={frequency}
                      title={frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                      onPress={() => {
                        setSettings({ ...settings, backupFrequency: frequency });
                        setBackupMenuVisible(false);
                      }}
                      accessibilityLabel={`Backup frequency ${frequency}`}
                    />
                  ))}
                </Menu>
              </View>
              {renderCard(2, 'Advanced Settings', (
                <>
                  <Button
                    mode="contained"
                    onPress={() => backupDatabase('manual')}
                    style={styles.button}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.text}
                    accessible={true}
                    accessibilityLabel="Backup database"
                    accessibilityRole="button"
                  >
                    Backup Database
                  </Button>
                  <Button
                    mode="contained"
                    onPress={resetDatabase}
                    style={styles.button}
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.text}
                    accessible={true}
                    accessibilityLabel="Reset database"
                    accessibilityRole="button"
                  >
                    Reset Database
                  </Button>
                  <Button
                    mode="contained"
                    onPress={exportDatabase}
                    style={styles.button}
                    buttonColor={theme.colors.accent}
                    textColor={theme.colors.text}
                    accessible={true}
                    accessibilityLabel="Export database"
                    accessibilityRole="button"
                  >
                    Export Database
                  </Button>
                </>
              ))}
            </View>
          </ScrollView>
          <FAB
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            icon="content-save"
            onPress={saveSettings}
            color={theme.colors.accent}
            customSize={56}
            accessible={true}
            accessibilityLabel="Save settings"
            accessibilityRole="button"
          />
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: modalAnim,
                  transform: [{ scale: modalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
                },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.background, theme.colors.gradientEnd]}
                style={[styles.modal, { maxWidth: width * 0.9 }]}
              >
                <Text
                  style={[globalStyles.cardTitle, { color: theme.colors.text, textAlign: 'center' }]}
                  accessible={true}
                  accessibilityLabel="Edit user name"
                  accessibilityRole="header"
                >
                  Edit User Name
                </Text>
                <TextInput
                  value={newUserName}
                  onChangeText={setNewUserName}
                  style={styles.input}
                  mode="outlined"
                  label="New name"
                  theme={{
                    roundness: theme.borderRadius.medium,
                    colors: {
                      text: theme.colors.text,
                      primary: theme.colors.primary,
                      background: theme.colors.background === '#1A1A1A' ? '#2A2A2A' : '#E0E0E0',
                      placeholder: theme.colors.secondary,
                      outline: theme.colors.primary,
                    },
                  }}
                  textColor={theme.colors.text}
                  accessible={true}
                  accessibilityLabel="Enter new user name"
                />
                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="text"
                    onPress={() => setModalVisible(false)}
                    textColor={theme.colors.error}
                    accessible={true}
                    accessibilityLabel="Cancel"
                    accessibilityRole="button"
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={updateUserName}
                    style={styles.modalButton}
                    buttonColor={theme.colors.primary}
                    textColor={theme.colors.text}
                    accessible={true}
                    accessibilityLabel="Save new name"
                    accessibilityRole="button"
                  >
                    Save
                  </Button>
                </View>
              </LinearGradient>
            </Animated.View>
          </Modal>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 16, // theme.spacing.md
    paddingTop: 32, // theme.spacing.xl
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16, // theme.spacing.md
  },
  title: {
    fontSize: 24, // theme.typography.title.fontSize
    fontWeight: 'bold',
    marginBottom: 16, // theme.spacing.md
  },
  sectionContainer: {
    flexGrow: 1,
    marginBottom: 80, // Space for navigation bar
  },
  card: {
    marginBottom: 16, // theme.spacing.md
  },
  cardTitle: {
    fontSize: 20, // theme.typography.title.fontSize
    fontWeight: 'bold',
    marginBottom: 8, // theme.spacing.sm
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8, // theme.spacing.sm
  },
  avatar: {
    marginRight: 16, // theme.spacing.md
  },
  profileTextContainer: {
    flex: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8, // theme.spacing.sm
  },
  input: {
    width: 80,
    marginLeft: 16, // theme.spacing.md
  },
  menuContainer: {
    marginVertical: 16, // theme.spacing.md
  },
  menuButton: {
    marginVertical: 8, // theme.spacing.sm
    borderRadius: 8, // theme.borderRadius.medium
  },
  menuContent: {
    borderRadius: 8, // theme.borderRadius.medium
  },
  button: {
    marginVertical: 8, // theme.spacing.sm
    borderRadius: 8, // theme.borderRadius.medium
  },
 fab: {
    position: 'absolute',
    bottom: height * 0.04,
    right: 17, // theme.spacing.md
    elevation: 5, // theme.elevation
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '80%',
    padding: 16, // theme.spacing.md
    borderRadius: 8, // theme.borderRadius.medium
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20, // theme.typography.title.fontSize
    fontWeight: 'bold',
    marginBottom: 16, // theme.spacing.md
    textAlign: 'center',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16, // theme.spacing.md
  },
  modalButton: {
    marginLeft: 8, // theme.spacing.sm
  },
});

export default SettingsScreen;
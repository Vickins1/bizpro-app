import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Switch, Alert, Modal, Animated, ScrollView } from 'react-native';
import { Text, Card, Button, TextInput, FAB, useTheme, Avatar, Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '../database/db';

type Settings = {
  theme: 'light' | 'dark';
  notifications: {
    lowStock: boolean;
    dailySales: boolean;
  };
  currency: string;
  userName: string;
};

const SettingsScreen: React.FC = () => {
  const theme = useTheme();
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    notifications: { lowStock: true, dailySales: false },
    currency: 'KES',
    userName: 'User',
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const cardAnims = useRef<Animated.Value[]>([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currencies = ['KES', 'USD', 'EUR', 'GBP'];

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load settings');
      }
    };
    loadSettings();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
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
  }, []);

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('settings', JSON.stringify(settings));
      Alert.alert('Success', 'Settings saved');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const exportDatabase = async () => {
    Alert.alert('Export', 'Database export would be implemented here (e.g., JSON file).');
  };

  const resetDatabase = () => {
    Alert.alert(
      'Reset Database',
      'This will delete all inventory and sales data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM inventory');
              await db.runAsync('DELETE FROM sales');
              Alert.alert('Success', 'Database reset');
            } catch (err) {
              Alert.alert('Error', 'Failed to reset database');
            }
          },
        },
      ]
    );
  };

  const updateUserName = (name: string) => {
    setSettings({ ...settings, userName: name });
    setModalVisible(false);
  };

  const renderCard = (index: number, content: React.ReactNode) => (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: cardAnims[index],
          transform: [
            {
              translateY: cardAnims[index].interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Card>
        <Card.Content>{content}</Card.Content>
      </Card>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1E1E1E', '#3A3A3A']} style={styles.gradient}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <Text variant="displaySmall" style={styles.title}>
            Settings
          </Text>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {renderCard(
              0,
              <View>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  User Profile
                </Text>
                <View style={styles.profileContainer}>
                  <Avatar.Text size={48} label={settings.userName[0]} style={styles.avatar} />
                  <View style={styles.profileText}>
                    <Text style={styles.cardText}>{settings.userName}</Text>
                    <Button
                      mode="text"
                      onPress={() => setModalVisible(true)}
                      textColor="#FF6F61"
                    >
                      Edit Name
                    </Button>
                  </View>
                </View>
              </View>
            )}
            {renderCard(
              1,
              <View>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Preferences
                </Text>
                <View style={styles.settingRow}>
                  <Text style={styles.cardText}>Dark Theme</Text>
                  <Switch
                    value={settings.theme === 'dark'}
                    onValueChange={() =>
                      setSettings({
                        ...settings,
                        theme: settings.theme === 'dark' ? 'light' : 'dark',
                      })
                    }
                    trackColor={{ true: '#FF6F61', false: '#E0E0E0' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.cardText}>Low Stock Alerts</Text>
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
                    trackColor={{ true: '#FF6F61', false: '#E0E0E0' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.cardText}>Daily Sales Summary</Text>
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
                    trackColor={{ true: '#FF6F61', false: '#E0E0E0' }}
                    thumbColor="#fff"
                  />
                </View>
                <View style={styles.settingRow}>
                  <Text style={styles.cardText}>Currency</Text>
                  <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                      <Button
                        mode="outlined"
                        onPress={() => setMenuVisible(true)}
                        style={styles.currencyButton}
                        textColor="#333"
                      >
                        {settings.currency}
                      </Button>
                    }
                    contentStyle={styles.menuContent}
                  >
                    {currencies.map((currency) => (
                      <Menu.Item
                        key={currency}
                        onPress={() => {
                          setSettings({ ...settings, currency });
                          setMenuVisible(false);
                        }}
                        title={currency}
                        style={styles.menuItem}
                        titleStyle={styles.menuItemText}
                      />
                    ))}
                  </Menu>
                </View>
              </View>
            )}
            {renderCard(
              2,
              <View>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Data Management
                </Text>
                <Button
                  mode="outlined"
                  onPress={exportDatabase}
                  style={styles.dataButton}
                  textColor="#FF6F61"
                  icon="export"
                >
                  Export Database
                </Button>
                <Button
                  mode="outlined"
                  onPress={resetDatabase}
                  style={styles.dataButton}
                  textColor="#FF6F61"
                  icon="delete"
                >
                  Reset Database
                </Button>
              </View>
            )}
          </ScrollView>
          <FAB
            style={styles.fab}
            icon="content-save"
            onPress={saveSettings}
            color="#fff"
          />
          <Modal
            animationType="fade"
            transparent
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['#FFFFFF', '#F5F5F5']}
                style={styles.modalContent}
              >
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Edit User Name
                </Text>
                <TextInput
                  label="Name"
                  value={settings.userName}
                  onChangeText={(text) => setSettings({ ...settings, userName: text })}
                  style={styles.input}
                  mode="outlined"
                  theme={{ roundness: 10 }}
                />
                <View style={styles.modalButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => setModalVisible(false)}
                    style={styles.modalButton}
                    textColor="#FF6F61"
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={() => updateUserName(settings.userName)}
                    style={styles.modalButton}
                    buttonColor="#FF6F61"
                  >
                    Save
                  </Button>
                </View>
              </LinearGradient>
            </View>
          </Modal>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
  },
  scrollContainer: {
    paddingTop: 40,
    paddingBottom: 100, // Adjusted for BottomTabNavigator height
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  card: {
    marginBottom: 15,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#555',
    marginVertical: 4,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#FF6F61',
    marginRight: 15,
  },
  profileText: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  currencyButton: {
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  menuItem: {
    paddingHorizontal: 15,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
  },
  dataButton: {
    marginVertical: 8,
    borderRadius: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF6F61',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 5,
  },
});

export default SettingsScreen;
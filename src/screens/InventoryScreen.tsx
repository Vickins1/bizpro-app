import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Animated,
  Modal,
  Alert,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Button, Text, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import db from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { globalStyles } from '../theme';
import GradientCard from '../components/GradientCard';
import { useAppTheme } from '../context/ThemeContext';

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type Settings = {
  currency: string;
};

const { width, height } = Dimensions.get('window');

const InventoryScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const [cardAnims, setCardAnims] = useState<Animated.Value[]>([]);
  const modalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setCurrency(parsedSettings.currency ?? 'KES');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load settings. Please try again.', [
          { text: 'Retry', onPress: () => loadSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };
    loadSettings();

    return () => {
      cardAnims.forEach(anim => anim.stopAnimation());
      modalAnim.stopAnimation();
    };
  }, [cardAnims, modalAnim]);

  const loadItems = useCallback(async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory ORDER BY id DESC');
      setItems(result ?? []);
      const anims = result?.map(() => new Animated.Value(0)) ?? [];
      setCardAnims(anims);
      anims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to load inventory. Please try again.', [
        { text: 'Retry', onPress: () => loadItems() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, []);

  const addItem = useCallback(async () => {
    if (!name.trim() || !quantity.trim() || !price.trim()) {
      setError('All fields are required');
      return;
    }
    const qty = parseInt(quantity);
    const pr = parseFloat(price);
    if (isNaN(qty) || qty < 0 || isNaN(pr) || pr <= 0) {
      setError('Quantity must be non-negative and price must be positive');
      return;
    }
    try {
      await db.runAsync(
        'INSERT INTO inventory (name, quantity, price) VALUES (?, ?, ?)',
        name.trim(),
        qty,
        pr
      );
      setName('');
      setQuantity('');
      setPrice('');
      setError('');
      setModalVisible(false);
      loadItems();
      Alert.alert('Success', 'Item added to inventory');
    } catch (err) {
      Alert.alert('Error', 'Failed to add item. Please try again.', [
        { text: 'Retry', onPress: () => addItem() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [name, quantity, price, loadItems]);

  const deleteItem = useCallback(async (id: number, name: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM inventory WHERE id = ?', id);
              loadItems();
              Alert.alert('Success', 'Item deleted from inventory');
            } catch (err) {
              Alert.alert('Error', 'Failed to delete item. Please try again.', [
                { text: 'Retry', onPress: () => deleteItem(id, name) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }
          },
        },
      ]
    );
  }, [loadItems]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
  }, [modalVisible, modalAnim]);

  const renderItem = ({ item, index }: { item: InventoryItem; index: number }) => (
    <Animated.View style={{ opacity: cardAnims[index], transform: [{ scale: cardAnims[index] }] }}>
      <GradientCard>
        <View style={styles.cardContent}>
          <View style={styles.cardTextContainer}>
            <Text
              variant="titleMedium"
              style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Item: ${item.name}`}
              accessibilityRole="text"
            >
              {item.name}
            </Text>
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Quantity: ${item.quantity}`}
            >
              Quantity: {item.quantity}
            </Text>
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Price: ${currency} ${item.price.toFixed(2)}`}
            >
              Price: {currency} {item.price.toFixed(2)}
            </Text>
          </View>
          <Button
            mode="text"
            onPress={() => deleteItem(item.id, item.name)}
            style={styles.deleteButton}
            accessible={true}
            accessibilityLabel={`Delete ${item.name}`}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={theme.typography.title.fontSize}
              color={theme.colors.error}
            />
          </Button>
        </View>
      </GradientCard>
    </Animated.View>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <Text
          variant="displaySmall"
          style={[globalStyles.title, { fontSize: theme.typography.display.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel="Inventory Management Title"
          accessibilityRole="header"
        >
          Inventory Management
        </Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text, textAlign: 'center' }]}
              accessible={true}
              accessibilityLabel="No items in inventory"
            >
              No items in inventory
            </Text>
          }
          contentContainerStyle={[styles.listContainer, { paddingBottom: height * 0.15 }]}
        />
        <Button
          mode="contained"
          onPress={() => setModalVisible(true)}
          style={styles.addButton}
          icon="plus"
          buttonColor={theme.colors.primary}
          textColor={theme.colors.accent}
          accessible={true}
          accessibilityLabel="Add new inventory item"
          accessibilityRole="button"
        >
          Add New Item
        </Button>
        <Modal
          animationType="none"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Animated.View
            style={[
              styles.modalOverlay,
              {
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.background, theme.colors.gradientEnd]}
              style={[styles.modalContent, { maxWidth: width * 0.9 }]}
            >
              <Text
                variant="titleLarge"
                style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text, textAlign: 'center' }]}
                accessible={true}
                accessibilityLabel="Add New Item"
                accessibilityRole="header"
              >
                Add New Item
              </Text>
              <TextInput
                label="Item Name"
                value={name}
                onChangeText={setName}
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
                accessibilityLabel="Item name input"
                accessibilityRole="text"
              />
              <TextInput
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
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
                accessibilityLabel="Quantity input"
                accessibilityRole="text"
              />
              <TextInput
                label={`Price (${currency})`}
                value={price}
                onChangeText={setPrice}
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
                accessibilityLabel={`Price input in ${currency}`}
                accessibilityRole="text"
              />
              {error ? (
                <Text
                  style={[styles.error, { fontSize: theme.typography.caption.fontSize, color: theme.colors.error }]}
                  accessible={true}
                  accessibilityLabel={`Error: ${error}`}
                >
                  {error}
                </Text>
              ) : null}
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                  textColor={theme.colors.error}
                  accessible={true}
                  accessibilityLabel="Cancel adding item"
                  accessibilityRole="button"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={addItem}
                  style={styles.modalButton}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.accent}
                  accessible={true}
                  accessibilityLabel="Add item to inventory"
                  accessibilityRole="button"
                >
                  Add Item
                </Button>
              </View>
            </LinearGradient>
          </Animated.View>
        </Modal>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingTop: 32, // Use raw value as theme.spacing is dynamic
    paddingHorizontal: 16,
  } as ViewStyle,
  listContainer: {
    paddingBottom: 24,
  } as ViewStyle,
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  } as ViewStyle,
  cardTextContainer: {
    flex: 1,
  } as ViewStyle,
  deleteButton: {
    marginLeft: 8,
  } as ViewStyle,
  addButton: {
    marginVertical: 16,
    marginHorizontal: 16,
    marginBottom: height * 0.15, // For navigation bar clearance
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Use raw value as theme.colors is dynamic
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  } as ViewStyle,
  modalContent: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    elevation: 5, // Use raw elevation as theme.elevation is dynamic
  } as ViewStyle,
  input: {
    marginBottom: 8,
  } as ViewStyle,
  error: {
    marginBottom: 8,
    textAlign: 'center',
  } as TextStyle,
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 4,
  } as ViewStyle,
});

export default InventoryScreen;
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Alert, FlatList, Animated, ScrollView } from 'react-native';
import { Button, Text, TextInput, Menu, Card, FAB, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import db from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type Sale = {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  amount: number;
  date: string;
};

const SalesScreen: React.FC = () => {
  const theme = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const formAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setCurrency(parsedSettings.currency || 'KES');
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    fetchItems();
    fetchRecentSales();
    Animated.timing(formAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const fetchItems = async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory WHERE quantity > 0');
      setItems(result);
    } catch (err) {
      Alert.alert('Error', 'Failed to load items');
    }
  };

  const fetchRecentSales = async () => {
    try {
      const result = await db.getAllAsync<Sale>(
        `SELECT s.id, s.itemId, i.name as itemName, s.quantity, s.amount, s.date 
         FROM sales s 
         JOIN inventory i ON s.itemId = i.id 
         ORDER BY s.date DESC 
         LIMIT 5`
      );
      setRecentSales(result);
      cardAnims.length = 0;
      cardAnims.push(...result.map(() => new Animated.Value(0)));
      result.forEach((_, index) => {
        Animated.timing(cardAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to load recent sales');
    }
  };

  const getSelectedItem = () => items.find((item) => item.id === selectedItemId);

  const validateQuantity = (text: string) => {
    const qty = parseInt(text);
    const item = getSelectedItem();
    if (item && (!isNaN(qty) && qty > item.quantity)) {
      setError(`Quantity exceeds available stock (${item.quantity})`);
    } else {
      setError('');
    }
    setQuantity(text);
  };

  const handleSubmit = async () => {
    const item = getSelectedItem();
    const qty = parseInt(quantity);

    if (!item || isNaN(qty) || qty <= 0) {
      setError('Please select an item and enter a valid quantity');
      return;
    }

    if (qty > item.quantity) {
      setError('Quantity exceeds available stock');
      return;
    }

    try {
      const amount = qty * item.price;
      const date = new Date().toISOString();

      await db.runAsync(
        'INSERT INTO sales (itemId, quantity, amount, date) VALUES (?, ?, ?, ?)',
        item.id,
        qty,
        amount,
        date
      );

      await db.runAsync(
        'UPDATE inventory SET quantity = quantity - ? WHERE id = ?',
        qty,
        item.id
      );

      Alert.alert('Success', `Sale saved! ${currency} ${amount.toFixed(2)} earned.`);
      setSelectedItemId(null);
      setQuantity('');
      setError('');
      fetchItems();
      fetchRecentSales();
    } catch (err) {
      Alert.alert('Error', 'Failed to save sale');
    }
  };

  const clearForm = () => {
    setSelectedItemId(null);
    setQuantity('');
    setError('');
    setMenuVisible(false);
  };

  const renderSale = ({ item, index }: { item: Sale; index: number }) => (
    <Animated.View
      style={[
        styles.saleCard,
        {
          opacity: cardAnims[index] || 0,
          transform: [
            {
              translateY: cardAnims[index]?.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0],
              }) || 0,
            },
          ],
        },
      ]}
    >
      <Card>
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {item.itemName}
          </Text>
          <Text style={styles.cardText}>Quantity: {item.quantity}</Text>
          <Text style={styles.cardText}>Amount: {currency} {item.amount.toFixed(2)}</Text>
          <Text style={styles.cardText}>
            Date: {new Date(item.date).toLocaleDateString()}
          </Text>
        </Card.Content>
      </Card>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1E1E1E', '#3A3A3A']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="displaySmall" style={styles.title}>
            Record Sale
          </Text>
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formAnim,
                transform: [
                  {
                    translateY: formAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setMenuVisible(true)}
                  style={styles.menuButton}
                  textColor="#333"
                  icon="menu-down"
                >
                  {selectedItemId
                    ? items.find((item) => item.id === selectedItemId)?.name || 'Select Item'
                    : 'Select Item'}
                </Button>
              }
              contentStyle={styles.menuContent}
            >
              {items.length > 0 ? (
                items.map((item) => (
                  <Menu.Item
                    key={item.id}
                    onPress={() => {
                      setSelectedItemId(item.id);
                      setMenuVisible(false);
                      setError('');
                    }}
                    title={`${item.name} - ${currency} ${item.price.toFixed(2)} (Qty: ${item.quantity})`}
                    style={styles.menuItem}
                    titleStyle={styles.menuItemText}
                  />
                ))
              ) : (
                <Menu.Item title="No items available" disabled />
              )}
            </Menu>
            <TextInput
              label="Quantity"
              value={quantity}
              onChangeText={validateQuantity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              theme={{ roundness: 10 }}
              error={!!error}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={clearForm}
                style={styles.formButton}
                textColor="#FF6F61"
              >
                Clear
              </Button>
              <FAB
                style={styles.fab}
                icon="check"
                onPress={handleSubmit}
                color="#fff"
                disabled={!selectedItemId || !quantity || !!error}
              />
            </View>
          </Animated.View>
          {recentSales.length > 0 && (
            <View style={styles.recentSalesContainer}>
              <Text variant="titleLarge" style={styles.recentSalesTitle}>
                Recent Sales
              </Text>
              <FlatList
                data={recentSales}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderSale}
                contentContainerStyle={styles.recentSalesList}
              />
            </View>
          )}
        </ScrollView>
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
  scrollContainer: {
    paddingTop: 40,
    paddingBottom: 100, // Increased to account for navbar
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
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    marginBottom: 15,
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
  input: {
    marginBottom: 15,
    backgroundColor: '#fff',
  },
  error: {
    color: '#FF6F61',
    marginBottom: 15,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formButton: {
    flex: 1,
    marginRight: 10,
    borderRadius: 10,
    paddingVertical: 5,
  },
  fab: {
    backgroundColor: '#FF6F61',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  recentSalesContainer: {
    marginTop: 20,
  },
  recentSalesTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 15,
  },
  recentSalesList: {
    paddingBottom: 20,
  },
  saleCard: {
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
    marginVertical: 2,
  },
});

export default SalesScreen;
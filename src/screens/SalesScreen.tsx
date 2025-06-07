import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, Animated } from 'react-native';
import { Button, Text, TextInput, Card, FAB, Menu, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import db from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';

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

const { width, height } = Dimensions.get('window');

const SalesScreen: React.FC = () => {
  const theme = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const [cardAnims, setCardAnims] = useState<Animated.Value[]>([]);
  const formAnim = useState(new Animated.Value(0))[0];

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
    return () => {
      cardAnims.forEach(anim => anim.setValue(0));
    };
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
      const anims = result.map(() => new Animated.Value(0));
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
          <Text variant="titleMedium" style={[styles.cardTitle, { fontSize: width * 0.045 }]}>
            {item.itemName}
          </Text>
          <Text style={[styles.cardText, { fontSize: width * 0.04 }]}>
            Quantity: {item.quantity}
          </Text>
          <Text style={[styles.cardText, { fontSize: width * 0.04 }]}>
            Amount: {currency} {item.amount.toFixed(2)}
          </Text>
          <Text style={[styles.cardText, { fontSize: width * 0.04 }]}>
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
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: height * 0.12 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="displaySmall" style={[styles.title, { fontSize: width * 0.08 }]}>
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
                    titleStyle={[styles.menuItemText, { fontSize: width * 0.035 }]}
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
            {error ? <Text style={[styles.error, { fontSize: width * 0.04 }]}>{error}</Text> : null}
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
              <Text variant="titleLarge" style={[styles.recentSalesTitle, { fontSize: width * 0.05 }]}>
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
    paddingHorizontal: '5%',
  },
  scrollContainer: {
    paddingTop: '10%',
    paddingBottom: '15%',
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: '5%',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    padding: '5%',
    marginBottom: '5%',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuButton: {
    marginBottom: '4%',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  menuItem: {
    paddingHorizontal: '4%',
  },
  menuItemText: {
    color: '#333',
  },
  input: {
    marginBottom: '4%',
    backgroundColor: '#fff',
  },
  error: {
    color: '#FF6F61',
    marginBottom: '4%',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formButton: {
    flex: 1,
    marginRight: '3%',
    borderRadius: 10,
    paddingVertical: '2%',
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
    marginTop: '5%',
  },
  recentSalesTitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: '4%',
  },
  recentSalesList: {
    paddingBottom: '5%',
  },
  saleCard: {
    marginBottom: '4%',
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
    marginBottom: '2%',
  },
  cardText: {
    color: '#555',
    marginVertical: '1%',
  },
});

export default SalesScreen;
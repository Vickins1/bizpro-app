import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Animated, Alert, ViewStyle, TextStyle } from 'react-native';
import { Button, Text, TextInput, FAB, Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { globalStyles } from '../theme';
import db from '../database/db';
import GradientCard from '../components/GradientCard';
import { useAppTheme } from '../context/ThemeContext';

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
  const { theme } = useAppTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [errorText, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [currency, setCurrency] = useState('KES');
  const [cardAnims, setCardAnims] = useState<Animated.Value[]>([]);
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('settings');
        if (saved) {
          const parsedSettings = JSON.parse(saved);
          setCurrency(parsedSettings.currency || 'KES');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load settings', [
          { text: 'Retry', onPress: () => loadSettings() },
          { text: 'Cancel' },
        ]);
      }
    };

    loadSettings();
    fetchItems();
    fetchRecentSales();

    Animated.timing(formAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      cardAnims.forEach(anim => anim.stopAnimation());
      formAnim.stopAnimation();
    };
  }, [cardAnims, formAnim]);

  const fetchItems = useCallback(async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory WHERE quantity > 0');
      setItems(result ?? []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load items', [
        { text: 'Retry', onPress: () => fetchItems() },
        { text: 'Cancel' },
      ]);
    }
  }, []);

  const fetchRecentSales = useCallback(async () => {
    try {
      const result = await db.getAllAsync<Sale>(
        `SELECT s.id, s.itemId, i.name as itemName, s.quantity, s.amount, s.date 
         FROM sales s 
         JOIN inventory i ON s.itemId = i.id 
         ORDER BY s.date DESC 
         LIMIT 5`
      );
      setRecentSales(result ?? []);
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
      Alert.alert('Error', 'Failed to load recent sales', [
        { text: 'Retry', onPress: () => fetchRecentSales() },
        { text: 'Cancel' },
      ]);
    }
  }, []);

  const getSelectedItem = useCallback(() => items.find((item) => item.id === selectedItemId), [items, selectedItemId]);

  const validateQuantity = useCallback(
    (text: string) => {
      if (!text.trim()) {
        setError('Quantity is required');
        setQuantity(text);
        return;
      }
      const qty = parseInt(text);
      const item = getSelectedItem();
      if (isNaN(qty) || qty <= 0) {
        setError('Enter a positive number');
      } else if (item && qty > item.quantity) {
        setError(`Quantity exceeds available stock (${item.quantity})`);
      } else {
        setError('');
      }
      setQuantity(text);
    },
    [getSelectedItem]
  );

  const handleSubmit = useCallback(async () => {
    const item = getSelectedItem();
    const qty = parseInt(quantity);

    if (!item || isNaN(qty) || qty <= 0) {
      setError('Select an item and enter a valid quantity');
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
      Alert.alert('Error', 'Failed to save sale', [
        { text: 'Retry', onPress: () => handleSubmit() },
        { text: 'Cancel' },
      ]);
    }
  }, [getSelectedItem, quantity, currency, fetchItems, fetchRecentSales]);

  const clearForm = useCallback(() => {
    setSelectedItemId(null);
    setQuantity('');
    setError('');
    setMenuVisible(false);
  }, []);

  const renderSale = ({ item, index }: { item: Sale; index: number }) => (
    <Animated.View
      style={{
        opacity: cardAnims[index] || 1,
        transform: [
          {
            translateY: cardAnims[index]?.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }) || 0,
          },
        ],
      }}
    >
      <GradientCard accessibilityLabel={`Recent sale: ${item.itemName}`} accessibilityRole="region">
        <Text
          variant="titleMedium"
          style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel={`Sale: ${item.itemName}`}
        >
          {item.itemName}
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
          accessibilityLabel={`Amount: ${currency} ${item.amount.toFixed(2)}`}
        >
          Amount: {currency} {item.amount.toFixed(2)}
        </Text>
        <Text
          style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel={`Date: ${new Date(item.date).toLocaleDateString()}`}
        >
          Date: {new Date(item.date).toLocaleDateString()}
        </Text>
      </GradientCard>
    </Animated.View>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContainer, { paddingBottom: height * 0.15 }]}
          showsVerticalScrollIndicator={false}
        >
          <Text
            variant="displaySmall"
            style={[globalStyles.title, { fontSize: theme.typography.display.fontSize, color: theme.colors.text }]}
            accessible={true}
            accessibilityLabel="Record Sale Title"
            accessibilityRole="header"
          >
            Record Sale
          </Text>
          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: formAnim,
                transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
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
                  textColor={theme.colors.text}
                  icon="menu-down"
                  accessible={true}
                  accessibilityLabel="Select inventory item"
                  accessibilityRole="button"
                >
                  {selectedItemId
                    ? items.find((item) => item.id === selectedItemId)?.name || 'Select Item'
                    : 'Select Item'}
                </Button>
              }
              contentStyle={[styles.menuContent, { backgroundColor: theme.colors.background }]}
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
                    titleStyle={[styles.menuItemText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                    accessibilityLabel={`Select ${item.name}`}
                  />
                ))
              ) : (
                <Menu.Item title="No items available" disabled accessibilityLabel="No items available" />
              )}
            </Menu>
            <TextInput
              label="Quantity"
              value={quantity}
              onChangeText={validateQuantity}
              keyboardType="numeric"
              mode="outlined"
              style={styles.input}
              theme={{
                roundness: 8, // theme.borderRadius.medium
                colors: {
                  text: theme.colors.text,
                  primary: theme.colors.primary,
                  background: theme.colors.background === '#1A1A1A' ? '#2A2A2A' : '#E0E0E0',
                  placeholder: theme.colors.secondary,
                  outline: theme.colors.primary,
                },
              }}
              textColor={theme.colors.text}
              error={!!errorText}
              accessible={true}
              accessibilityLabel="Quantity input"
              accessibilityRole="text"
            />
            {errorText ? (
              <Text
                style={[styles.error, { fontSize: theme.typography.caption.fontSize, color: theme.colors.error }]}
                accessible={true}
                accessibilityLabel={`Error: ${errorText}`}
              >
                {errorText}
              </Text>
            ) : null}
            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={clearForm}
                style={styles.formButton}
                textColor={theme.colors.error}
                accessible={true}
                accessibilityLabel="Clear form"
                accessibilityRole="button"
              >
                Clear
              </Button>
              <FAB
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                icon="check"
                onPress={handleSubmit}
                color={theme.colors.accent}
                disabled={!selectedItemId || !quantity || !!errorText}
                accessible={true}
                accessibilityLabel="Submit sale"
                accessibilityRole="button"
                accessibilityState={{ disabled: !selectedItemId || !quantity || !!errorText }}
              />
            </View>
          </Animated.View>
          {recentSales.length > 0 && (
            <View style={styles.recentSalesContainer}>
              <Text
                variant="titleLarge"
                style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel="Recent Sales Title"
                accessibilityRole="header"
              >
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
  gradient: {
    flex: 1,
    paddingHorizontal: 16, // theme.spacing.md
  } as ViewStyle,
  scrollContainer: {
    paddingTop: 32, // theme.spacing.xl
  } as ViewStyle,
  formContainer: {
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    borderRadius: 8, // theme.borderRadius.medium
    padding: 16, // theme.spacing.md
    marginBottom: 16, // theme.spacing.md
    elevation: 5, // Use raw value as theme.elevation is dynamic
  } as ViewStyle,
  menuButton: {
    marginBottom: 8, // theme.spacing.sm
    borderRadius: 8, // theme.borderRadius.medium
  } as ViewStyle,
  menuContent: {
    borderRadius: 8, // theme.borderRadius.medium
  } as ViewStyle,
  menuItem: {
    paddingHorizontal: 8, // theme.spacing.sm
  } as ViewStyle,
  menuItemText: {
    fontWeight: 'normal',
  } as TextStyle,
  input: {
    marginBottom: 8, // theme.spacing.sm
  } as ViewStyle,
  error: {
    marginBottom: 8, // theme.spacing.sm
    textAlign: 'center',
  } as TextStyle,
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,
  formButton: {
    flex: 1,
    marginRight: 8, // theme.spacing.sm
    borderRadius: 8, // theme.borderRadius.medium
    paddingVertical: 4, // theme.spacing.xs
  } as ViewStyle,
  fab: {
    elevation: 5, // Use raw value as theme.elevation is dynamic
  } as ViewStyle,
  recentSalesContainer: {
    marginTop: 16, // theme.spacing.md
  } as ViewStyle,
  recentSalesList: {
    paddingBottom: 16, // theme.spacing.md
  } as ViewStyle,
});

export default SalesScreen;
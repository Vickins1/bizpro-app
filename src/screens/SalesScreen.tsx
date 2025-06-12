import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Animated, Alert, RefreshControl } from 'react-native';
import { Button, Text, TextInput, FAB, Menu } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
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

const { width } = Dimensions.get('window');

const CACHE_KEY = 'sales_screen_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL
const MAX_RETRIES = 3;

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formAnim = useRef(new Animated.Value(0)).current;
  const retryCountRef = useRef(0);

  // Load cached data or settings
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load settings
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setCurrency(parsedSettings.currency || 'KES');
        }

        // Load cached data
        const cachedData = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { items, recentSales, timestamp } = JSON.parse(cachedData);
          if (Date.now() - timestamp < CACHE_TTL) {
            setItems(items);
            setRecentSales(recentSales);
            setCardAnims(recentSales.map(() => new Animated.Value(1))); // Pre-animated
          }
        }

        // Start form animation
        Animated.timing(formAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Fetch fresh data
        await fetchData();
      } catch (err) {
        console.warn('Initial load error:', err);
      }
    };

    loadInitialData();

    return () => {
      cardAnims.forEach(anim => anim.stopAnimation());
      formAnim.stopAnimation();
    };
  }, []);

  // Debounce function to limit rapid calls
  const debounce = <T extends (...args: any[]) => any>(func: T, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise(resolve => {
        clearTimeout(timeout);
        timeout = setTimeout(() => resolve(func(...args)), wait);
      });
    };
  };

  // Fetch both items and recent sales
  const fetchData = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const [itemsResult, salesResult] = await Promise.all([
        db.getAllAsync<InventoryItem>(
          'SELECT id, name, quantity, price FROM inventory WHERE quantity > 0'
        ),
        db.getAllAsync<Sale>(
          `SELECT s.id, s.itemId, i.name as itemName, s.quantity, s.amount, s.date 
           FROM sales s 
           JOIN inventory i ON s.itemId = i.id 
           ORDER BY s.date DESC 
           LIMIT 5`
        ),
      ]);

      setItems(itemsResult ?? []);
      setRecentSales(salesResult ?? []);

      // Update cache
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          items: itemsResult ?? [],
          recentSales: salesResult ?? [],
          timestamp: Date.now(),
        })
      );

      // Reset animations
      const anims = (salesResult ?? []).map(() => new Animated.Value(0));
      setCardAnims(anims);
      anims.forEach((anim, index) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });

      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      retryCountRef.current += 1;
      if (retryCountRef.current <= MAX_RETRIES) {
        Alert.alert('Error', 'Failed to load data. Retrying...', [
          { text: 'Retry Now', onPress: () => fetchData() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Error', 'Max retries reached. Using cached data or try again later.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isLoading]);

  // Debounced fetch for manual refresh
  const debouncedFetchData = useCallback(debounce(fetchData, 300), [fetchData]);

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    debouncedFetchData();
  }, [debouncedFetchData]);

  const getSelectedItem = useCallback(
    () => items.find(item => item.id === selectedItemId),
    [items, selectedItemId]
  );

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
      debouncedFetchData(); // Debounced fetch to update UI
    } catch (err) {
      Alert.alert('Error', 'Failed to save sale', [
        { text: 'Retry', onPress: () => handleSubmit() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  }, [getSelectedItem, quantity, currency, debouncedFetchData]);

  const clearForm = useCallback(() => {
    setSelectedItemId(null);
    setQuantity('');
    setError('');
    setMenuVisible(false);
  }, []);

  const renderSale = useCallback(
    ({ item, index }: { item: Sale; index: number }) => (
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
        <GradientCard accessibilityLabel={`Recent sale: ${item.itemName}`}>
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
    ),
    [cardAnims, theme, currency]
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles(theme).gradient}
      >
        <ScrollView
          contentContainerStyle={[styles(theme).scrollContainer, { paddingBottom: theme.spacing.xl }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
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
              styles(theme).formContainer,
              {
                backgroundColor: theme.colors.background,
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
                  style={styles(theme).menuButton}
                  textColor={theme.colors.text}
                  icon="menu-down"
                  accessible={true}
                  accessibilityLabel="Select inventory item"
                  accessibilityRole="button"
                >
                  {selectedItemId
                    ? items.find(item => item.id === selectedItemId)?.name || 'Select Item'
                    : 'Select Item'}
                </Button>
              }
              contentStyle={[styles(theme).menuContent, { backgroundColor: theme.colors.background }]}
            >
              {items.length > 0 ? (
                items.map(item => (
                  <Menu.Item
                    key={item.id}
                    onPress={() => {
                      setSelectedItemId(item.id);
                      setMenuVisible(false);
                      setError('');
                    }}
                    title={`${item.name} - ${currency} ${item.price.toFixed(2)} (Qty: ${item.quantity})`}
                    style={styles(theme).menuItem}
                    titleStyle={[styles(theme).menuItemText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
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
              style={styles(theme).input}
              theme={{
                roundness: theme.borderRadius.medium,
                colors: {
                  text: theme.colors.text,
                  primary: theme.colors.primary,
                  background: theme.colors.background,
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
                style={[styles(theme).error, { fontSize: theme.typography.caption.fontSize, color: theme.colors.error }]}
                accessible={true}
                accessibilityLabel={`Error: ${errorText}`}
              >
                {errorText}
              </Text>
            ) : null}
            <View style={styles(theme).buttonContainer}>
              <Button
                mode="outlined"
                onPress={clearForm}
                style={styles(theme).formButton}
                textColor={theme.colors.error}
                accessible={true}
                accessibilityLabel="Clear form"
                accessibilityRole="button"
              >
                Clear
              </Button>
              <FAB
                style={[styles(theme).fab, { backgroundColor: theme.colors.primary }]}
                icon="check"
                onPress={handleSubmit}
                color={theme.colors.text}
                disabled={!selectedItemId || !quantity || !!errorText || isLoading}
                accessible={true}
                accessibilityLabel="Submit sale"
                accessibilityRole="button"
                accessibilityState={{ disabled: !selectedItemId || !quantity || !!errorText || isLoading }}
              />
            </View>
          </Animated.View>
          {recentSales.length > 0 && (
            <View style={styles(theme).recentSalesContainer}>
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
                keyExtractor={item => item.id.toString()}
                renderItem={renderSale}
                contentContainerStyle={styles(theme).recentSalesList}
              />
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

// Define styles as a function to dynamically use the theme
const styles = (theme: typeof import('../theme').lightTheme) =>
  StyleSheet.create({
    gradient: {
      flex: 1,
      paddingHorizontal: theme.spacing.md,
    },
    scrollContainer: {
      paddingTop: theme.spacing.xl,
    },
    formContainer: {
      borderRadius: theme.borderRadius.medium,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      elevation: theme.elevation,
    },
    menuButton: {
      marginBottom: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
    },
    menuContent: {
      borderRadius: theme.borderRadius.medium,
    },
    menuItem: {
      paddingHorizontal: theme.spacing.sm,
    },
    menuItemText: {
      fontWeight: 'normal',
    },
    input: {
      marginBottom: theme.spacing.sm,
    },
    error: {
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    buttonContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    formButton: {
      flex: 1,
      marginRight: theme.spacing.sm,
      borderRadius: theme.borderRadius.medium,
      paddingVertical: theme.spacing.xs,
    },
    fab: {
      elevation: theme.elevation,
    },
    recentSalesContainer: {
      marginTop: theme.spacing.md,
    },
    recentSalesList: {
      paddingBottom: theme.spacing.md,
    },
  });

export default SalesScreen;
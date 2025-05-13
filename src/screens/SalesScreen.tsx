import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, Menu } from 'react-native-paper';
import db from '../database/db';

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

const SalesScreen: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory WHERE quantity > 0');
      setItems(result);
    } catch (err) {
      Alert.alert('Error', 'Failed to load items');
    }
  };

  const getSelectedItem = () => items.find((item) => item.id === selectedItemId);

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

      Alert.alert('Success', `Sale saved! KES ${amount.toFixed(2)} earned.`);
      setSelectedItemId(null);
      setQuantity('');
      setError('');
      fetchItems();
    } catch (err) {
      Alert.alert('Error', 'Failed to save sale');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Record Sale</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            style={styles.menuButton}
          >
            {selectedItemId
              ? items.find((item) => item.id === selectedItemId)?.name || 'Select Item'
              : 'Select Item'}
          </Button>
        }
      >
        {items.map((item) => (
          <Menu.Item
            key={item.id}
            onPress={() => {
              setSelectedItemId(item.id);
              setMenuVisible(false);
              setError('');
            }}
            title={`${item.name} - KES ${item.price.toFixed(2)} (Qty: ${item.quantity})`}
          />
        ))}
      </Menu>
      <TextInput
        label="Quantity"
        value={quantity}
        onChangeText={(text) => {
          setQuantity(text);
          setError('');
        }}
        keyboardType="numeric"
        mode="outlined"
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        mode="contained"
        onPress={handleSubmit}
        style={styles.button}
        disabled={!selectedItemId || !quantity}
      >
        Save Sale
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    marginBottom: 20,
  },
  menuButton: {
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    paddingVertical: 5,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
});

export default SalesScreen;
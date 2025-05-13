import React, { useEffect, useState } from 'react';
import { FlatList, View, StyleSheet, Alert } from 'react-native';
import { Button, Text, TextInput, Card } from 'react-native-paper';
import db from '../database/db';

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

const InventoryScreen: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  const loadItems = async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory ORDER BY id DESC');
      setItems(result);
    } catch (err) {
      Alert.alert('Error', 'Failed to load inventory');
    }
  };

  const addItem = async () => {
    if (!name || !quantity || !price) {
      setError('All fields are required');
      return;
    }
    const qty = parseInt(quantity);
    const pr = parseFloat(price);
    if (isNaN(qty) || qty < 0 || isNaN(pr) || pr <= 0) {
      setError('Invalid quantity or price');
      return;
    }
    try {
      await db.runAsync(
        'INSERT INTO inventory (name, quantity, price) VALUES (?, ?, ?)',
        name,
        qty,
        pr
      );
      setName('');
      setQuantity('');
      setPrice('');
      setError('');
      loadItems();
      Alert.alert('Success', 'Item added to inventory');
    } catch (err) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Manage Inventory</Text>
      <TextInput
        label="Item Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
        mode="outlined"
      />
      <TextInput
        label="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="numeric"
        style={styles.input}
        mode="outlined"
      />
      <TextInput
        label="Price (KES)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        style={styles.input}
        mode="outlined"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button mode="contained" onPress={addItem} style={styles.button}>
        Add Item
      </Button>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.name}</Text>
              <Text>Quantity: {item.quantity}</Text>
              <Text>Price: KES {item.price.toFixed(2)}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No items in inventory</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { marginBottom: 20 },
  input: { marginBottom: 10 },
  button: { marginBottom: 20, paddingVertical: 5 },
  card: { marginBottom: 10 },
  error: { color: 'red', marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 20 },
});

export default InventoryScreen;
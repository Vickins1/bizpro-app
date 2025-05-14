import React, { useEffect, useState, useRef } from 'react';
import { FlatList, View, StyleSheet, Animated, Modal, Alert } from 'react-native';
import { Button, Text, TextInput, Card, FAB, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import db from '../database/db';

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

const InventoryScreen: React.FC = () => {
  const theme = useTheme();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;

  const loadItems = async () => {
    try {
      const result = await db.getAllAsync<InventoryItem>('SELECT * FROM inventory ORDER BY id DESC');
      setItems(result);
      cardAnims.length = 0; // Clear previous animations
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
      setModalVisible(false);
      loadItems();
      Alert.alert('Success', 'Item added to inventory');
    } catch (err) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const deleteItem = async (id: number, name: string) => {
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
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: modalVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [modalVisible]);

  const renderItem = ({ item, index }: { item: InventoryItem; index: number }) => (
    <Animated.View
      style={[
        styles.card,
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
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTextContainer}>
            <Text variant="titleMedium" style={styles.cardTitle}>
              {item.name}
            </Text>
            <Text style={styles.cardText}>Quantity: {item.quantity}</Text>
            <Text style={styles.cardText}>Price: KES {item.price.toFixed(2)}</Text>
          </View>
          <Button
            mode="text"
            onPress={() => deleteItem(item.id, item.name)}
            style={styles.deleteButton}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF6F61" />
          </Button>
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
        <Text variant="displaySmall" style={styles.title}>
          Inventory Management
        </Text>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListEmptyComponent={<Text style={styles.empty}>No items in inventory</Text>}
          contentContainerStyle={styles.listContainer}
        />
        <FAB
          style={styles.fab}
          icon="plus"
          onPress={() => setModalVisible(true)}
          color="#fff"
        />
        <Modal
          animationType="none"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['#FFFFFF', '#F5F5F5']}
              style={styles.modalContent}
            >
              <Text variant="titleLarge" style={styles.modalTitle}>
                Add New Item
              </Text>
              <TextInput
                label="Item Name"
                value={name}
                onChangeText={setName}
                style={styles.input}
                mode="outlined"
                theme={{ roundness: 10 }}
              />
              <TextInput
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                theme={{ roundness: 10 }}
              />
              <TextInput
                label="Price (KES)"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
                style={styles.input}
                mode="outlined"
                theme={{ roundness: 10 }}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
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
                  onPress={addItem}
                  style={styles.modalButton}
                  buttonColor="#FF6F61"
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
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 20,
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
  listContainer: {
    paddingBottom: 80,
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
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTextContainer: {
    flex: 1,
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
  deleteButton: {
    marginLeft: 10,
  },
  empty: {
    textAlign: 'center',
    color: '#E0E0E0',
    fontSize: 16,
    marginTop: 20,
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
  error: {
    color: '#FF6F61',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 5,
  },
});

export default InventoryScreen;
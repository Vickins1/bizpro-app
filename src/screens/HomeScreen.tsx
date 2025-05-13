import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageBackground, Animated, Dimensions, ScrollView, Alert } from 'react-native';
import { Card, Text, TouchableRipple, useTheme, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import db from '../database/db';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type InventoryItem = {
  id: number;
  name: string;
  quantity: number;
  price: number;
};

type SalesSummary = {
  totalSales: number;
  totalRevenue: number;
};

const { width } = Dimensions.get('window');
const BUTTON_SIZE = (width - 80) / 3; // Smaller buttons for 3 in a row
const IMAGES = [
  require('../../assets/bg1.jpg'),
  require('../../assets/bg2.jpg'),
  require('../../assets/bg3.jpg'),
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const theme = useTheme();
  const [currentImage, setCurrentImage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({ totalSales: 0, totalRevenue: 0 });
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

  // Background slideshow and data fetching
  useEffect(() => {
    // Fetch sales summary and low stock items
    const fetchData = async () => {
      try {
        // Today's sales summary
        const summaryResult = await db.getFirstAsync<SalesSummary>(
          `SELECT 
             COUNT(*) as totalSales,
             SUM(amount) as totalRevenue
           FROM sales
           WHERE date >= date('now', 'start of day')`
        );
        setSalesSummary({
          totalSales: summaryResult?.totalSales || 0,
          totalRevenue: summaryResult?.totalRevenue || 0,
        });

        // Low stock items (quantity <= 5)
        const lowStockResult = await db.getAllAsync<InventoryItem>(
          `SELECT * FROM inventory WHERE quantity <= 5 ORDER BY quantity ASC`
        );
        setLowStockItems(lowStockResult);
      } catch (err) {
        Alert.alert('Error', 'Failed to load data');
      }
    };

    fetchData();

    // Slideshow animation
    const interval = setInterval(() => {
      const nextImage = (currentImage + 1) % IMAGES.length;
      Animated.timing(slideAnim, {
        toValue: -width * nextImage,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImage(nextImage);
        if (nextImage === 0) {
          slideAnim.setValue(0); // Reset to start for seamless loop
        }
      });
    }, 5000); // Change image every 5 seconds

    // Animate title and content entrance
    Animated.parallel([
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(interval);
  }, [currentImage, slideAnim, titleAnim, contentAnim]);

  const [scaleAnim] = useState({
    inventory: new Animated.Value(1),
    sales: new Animated.Value(1),
    reports: new Animated.Value(1),
  });

  const handlePressIn = (key: keyof typeof scaleAnim) => {
    Animated.spring(scaleAnim[key], {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (key: keyof typeof scaleAnim) => {
    Animated.spring(scaleAnim[key], {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const navigateTo = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={styles.background}>
      <Animated.View
        style={[
          styles.imageContainer,
          {
            transform: [{ translateX: slideAnim }],
            flexDirection: 'row',
          },
        ]}
      >
        {IMAGES.map((image, index) => (
          <ImageBackground
            key={index}
            source={image}
            style={[styles.image, { width }]}
            resizeMode="cover"
          />
        ))}
      </Animated.View>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View
            style={[
              styles.header,
              {
                transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
                opacity: titleAnim,
              },
            ]}
          >
            <Text variant="titleLarge" style={styles.title}>
              BizPro
            </Text>
            <Text variant="titleSmall" style={styles.subtitle}>
              Power Your Business
            </Text>
          </Animated.View>
          <Animated.View style={[styles.content, { opacity: contentAnim }]}>
            <Card style={styles.summaryCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Today's Summary
                </Text>
                <Text style={styles.summaryText}>Sales: {salesSummary.totalSales}</Text>
                <Text style={styles.summaryText}>
                  Revenue: KES {salesSummary.totalRevenue.toFixed(2)}
                </Text>
              </Card.Content>
            </Card>
            {lowStockItems.length > 0 && (
              <Card style={styles.lowStockCard}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.cardTitle}>
                    Low Stock Alerts
                  </Text>
                  <View style={styles.chipContainer}>
                    {lowStockItems.map((item) => (
                      <Chip
                        key={item.id}
                        style={styles.chip}
                        onPress={() => navigateTo('Inventory')}
                      >
                        {item.name}: {item.quantity}
                      </Chip>
                    ))}
                  </View>
                </Card.Content>
              </Card>
            )}
            <View style={styles.buttonContainer}>
              <TouchableRipple
                onPressIn={() => handlePressIn('inventory')}
                onPressOut={() => handlePressOut('inventory')}
                onPress={() => navigateTo('Inventory')}
                rippleColor="rgba(255, 255, 255, 0.3)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.inventory }] }]}>
                  <Card style={[styles.cardInner, { backgroundColor: '#FF6F61' }]}>
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="warehouse" size={24} color="#fff" />
                      <Text variant="labelLarge" style={styles.cardTitle}>
                        Inventory
                      </Text>
                    </Card.Content>
                  </Card>
                </Animated.View>
              </TouchableRipple>
              <TouchableRipple
                onPressIn={() => handlePressIn('sales')}
                onPressOut={() => handlePressOut('sales')}
                onPress={() => navigateTo('Sales')}
                rippleColor="rgba(255, 255, 255, 0.3)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.sales }] }]}>
                  <Card style={[styles.cardInner, { backgroundColor: '#4CAF50' }]}>
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="cash-register" size={24} color="#fff" />
                      <Text variant="labelLarge" style={styles.cardTitle}>
                        Sales
                      </Text>
                    </Card.Content>
                  </Card>
                </Animated.View>
              </TouchableRipple>
              <TouchableRipple
                onPressIn={() => handlePressIn('reports')}
                onPressOut={() => handlePressOut('reports')}
                onPress={() => navigateTo('Reports')}
                rippleColor="rgba(255, 255, 255, 0.3)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.reports }] }]}>
                  <Card style={[styles.cardInner, { backgroundColor: '#2196F3' }]}>
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="chart-bar" size={24} color="#fff" />
                      <Text variant="labelLarge" style={styles.cardTitle}>
                        Reports
                      </Text>
                    </Card.Content>
                  </Card>
                </Animated.View>
              </TouchableRipple>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    position: 'relative',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Darker overlay for contrast
  },
  scrollContainer: {
    padding: 15,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: '#fff',
    marginTop: 8,
    fontStyle: 'italic',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
  },
  lowStockCard: {
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
  },
  cardTitle: {
    marginBottom: 10,
    fontWeight: '600',
  },
  summaryText: {
    fontSize: 14,
    marginVertical: 2,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FF6F61',
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginVertical: 15,
  },
  ripple: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    marginHorizontal: 5,
  },
  card: {
    flex: 1,
    borderRadius: 10,
  },
  cardInner: {
    flex: 1,
    borderRadius: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
});

export default HomeScreen;
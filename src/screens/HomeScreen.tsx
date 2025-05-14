import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ImageBackground, Animated, Dimensions, ScrollView, Alert } from 'react-native';
import { Card, Text, TouchableRipple, useTheme, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const { width, height } = Dimensions.get('window');
const BUTTON_SIZE = (width - 80) / 3;
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
  const [activeTab, setActiveTab] = useState('Home');

  // Background slideshow and data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
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
        duration: 1200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImage(nextImage);
        if (nextImage === 0) {
          slideAnim.setValue(0);
        }
      });
    }, 6000);

    // Entrance animations
    Animated.parallel([
      Animated.spring(titleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(contentAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();

    return () => clearInterval(interval);
  }, [currentImage, slideAnim, titleAnim, contentAnim]);

  const [scaleAnim] = useState({
    inventory: new Animated.Value(1),
    sales: new Animated.Value(1),
    reports: new Animated.Value(1),
    homeNav: new Animated.Value(1),
    inventoryNav: new Animated.Value(1),
    salesNav: new Animated.Value(1),
    reportsNav: new Animated.Value(1),
  });

  const handlePressIn = (key: keyof typeof scaleAnim) => {
    Animated.spring(scaleAnim[key], {
      toValue: 0.95,
      speed: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (key: keyof typeof scaleAnim) => {
    Animated.spring(scaleAnim[key], {
      toValue: 1,
      speed: 20,
      useNativeDriver: true,
    }).start();
  };

  const navigateTo = (screen: keyof RootStackParamList) => {
    setActiveTab(screen);
    navigation.navigate(screen);
  };

  return (
    <View style={styles.background}>
      <Animated.View style={[styles.imageContainer, { transform: [{ translateX: slideAnim }] }]}>
        {IMAGES.map((image, index) => (
          <ImageBackground
            key={index}
            source={image}
            style={[styles.image, { width }]}
            resizeMode="cover"
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
              style={styles.gradient}
            />
          </ImageBackground>
        ))}
      </Animated.View>
      <LinearGradient
        colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Animated.View
            style={[
              styles.header,
              {
                transform: [
                  {
                    translateY: titleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
                opacity: titleAnim,
              },
            ]}
          >
            <Text variant="displaySmall" style={styles.title}>
              BizPro
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              Empower Your Business
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.content,
              {
                transform: [
                  {
                    translateY: contentAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [50, 0],
                    }),
                  },
                ],
                opacity: contentAnim,
              },
            ]}
          >
            <Card style={styles.summaryCard}>
              <Card.Content>
                <View style={styles.summaryHeader}>
                  <MaterialCommunityIcons name="chart-line" size={24} color={theme.colors.primary} />
                  <Text variant="titleLarge" style={styles.cardTitle}>
                    Today's Insights
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Sales</Text>
                  <Text style={styles.summaryValue}>{salesSummary.totalSales}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Revenue</Text>
                  <Text style={styles.summaryValue}>
                    KES {salesSummary.totalRevenue.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
            {lowStockItems.length > 0 && (
              <Card style={styles.lowStockCard}>
                <Card.Content>
                  <View style={styles.summaryHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={24} color="#FF6F61" />
                    <Text variant="titleLarge" style={styles.cardTitle}>
                      Low Stock Alerts
                    </Text>
                  </View>
                  <View style={styles.chipContainer}>
                    {lowStockItems.map((item) => (
                      <Chip
                        key={item.id}
                        style={styles.chip}
                        textStyle={styles.chipText}
                        onPress={() => navigateTo('Inventory')}
                        icon={() => (
                          <MaterialCommunityIcons name="package-variant" size={16} color="#fff" />
                        )}
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
                rippleColor="rgba(255, 255, 255, 0.2)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.inventory }] }]}>
                  <LinearGradient
                    colors={['#FF6F61', '#FF8A65']}
                    style={styles.cardInner}
                  >
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="warehouse" size={28} color="#fff" />
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        Inventory
                      </Text>
                    </Card.Content>
                  </LinearGradient>
                </Animated.View>
              </TouchableRipple>
              <TouchableRipple
                onPressIn={() => handlePressIn('sales')}
                onPressOut={() => handlePressOut('sales')}
                onPress={() => navigateTo('Sales')}
                rippleColor="rgba(255, 255, 255, 0.2)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.sales }] }]}>
                  <LinearGradient
                    colors={['#4CAF50', '#66BB6A']}
                    style={styles.cardInner}
                  >
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="cash-register" size={28} color="#fff" />
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        Sales
                      </Text>
                    </Card.Content>
                  </LinearGradient>
                </Animated.View>
              </TouchableRipple>
              <TouchableRipple
                onPressIn={() => handlePressIn('reports')}
                onPressOut={() => handlePressOut('reports')}
                onPress={() => navigateTo('Reports')}
                rippleColor="rgba(255, 255, 255, 0.2)"
                style={styles.ripple}
              >
                <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim.reports }] }]}>
                  <LinearGradient
                    colors={['#2196F3', '#42A5F5']}
                    style={styles.cardInner}
                  >
                    <Card.Content style={styles.cardContent}>
                      <MaterialCommunityIcons name="chart-bar" size={28} color="#fff" />
                      <Text variant="titleMedium" style={styles.cardTitle}>
                        Reports
                      </Text>
                    </Card.Content>
                  </LinearGradient>
                </Animated.View>
              </TouchableRipple>
            </View>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Powered by Vickins Technologies</Text>
            </View>
          </Animated.View>
        </ScrollView>
        <View style={styles.navbar}>
          <TouchableRipple
            onPressIn={() => handlePressIn('homeNav')}
            onPressOut={() => handlePressOut('homeNav')}
            onPress={() => navigateTo('Home')}
            rippleColor="rgba(255, 255, 255, 0.2)"
            style={styles.navItem}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim.homeNav }] }}>
              <MaterialCommunityIcons
                name="home"
                size={24}
                color={activeTab === 'Home' ? '#FF6F61' : '#E0E0E0'}
              />
              <Text style={[styles.navText, activeTab === 'Home' && styles.navTextActive]}>Home</Text>
            </Animated.View>
          </TouchableRipple>
          <TouchableRipple
            onPressIn={() => handlePressIn('inventoryNav')}
            onPressOut={() => handlePressOut('inventoryNav')}
            onPress={() => navigateTo('Inventory')}
            rippleColor="rgba(255, 255, 255, 0.2)"
            style={styles.navItem}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim.inventoryNav }] }}>
              <MaterialCommunityIcons
                name="warehouse"
                size={24}
                color={activeTab === 'Inventory' ? '#FF6F61' : '#E0E0E0'}
              />
              <Text style={[styles.navText, activeTab === 'Inventory' && styles.navTextActive]}>
                Inventory
              </Text>
            </Animated.View>
          </TouchableRipple>
          <TouchableRipple
            onPressIn={() => handlePressIn('salesNav')}
            onPressOut={() => handlePressOut('salesNav')}
            onPress={() => navigateTo('Sales')}
            rippleColor="rgba(255, 255, 255, 0.2)"
            style={styles.navItem}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim.salesNav }] }}>
              <MaterialCommunityIcons
                name="cash-register"
                size={24}
                color={activeTab === 'Sales' ? '#FF6F61' : '#E0E0E0'}
              />
              <Text style={[styles.navText, activeTab === 'Sales' && styles.navTextActive]}>Sales</Text>
            </Animated.View>
          </TouchableRipple>
          <TouchableRipple
            onPressIn={() => handlePressIn('reportsNav')}
            onPressOut={() => handlePressOut('reportsNav')}
            onPress={() => navigateTo('Reports')}
            rippleColor="rgba(255, 255, 255, 0.2)"
            style={styles.navItem}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnim.reportsNav }] }}>
              <MaterialCommunityIcons
                name="chart-bar"
                size= {24}
                color={activeTab === 'Reports' ? '#FF6F61' : '#E0E0E0'}
              />
              <Text style={[styles.navText, activeTab === 'Reports' && styles.navTextActive]}>
                Reports
              </Text>
            </Animated.View>
          </TouchableRipple>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  image: {
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 100, // Increased to accommodate navbar
    minHeight: height,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 8,
  },
  subtitle: {
    color: '#E0E0E0',
    marginTop: 10,
    fontWeight: '500',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 10,
  },
  lowStockCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    padding: 10,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#333',
    marginLeft: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  chip: {
    marginRight: 10,
    marginBottom: 10,
    backgroundColor: '#FF6F61',
    borderRadius: 20,
    paddingHorizontal: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  ripple: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderRadius: 16,
  },
  cardInner: {
    flex: 1,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: 12,
  },
  footer: {
    marginTop: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  footerText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  navbar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  navText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  navTextActive: {
    color: '#FF6F61',
    fontWeight: '700',
  },
});

export default HomeScreen;
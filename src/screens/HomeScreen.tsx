import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Animated,
  Dimensions,
  ScrollView,
  Alert,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from '../database/db';
import { globalStyles } from '../theme';
import GradientCard from '../components/GradientCard';
import { RootStackParamList } from '../../App';
import { useAppTheme } from '../context/ThemeContext';

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

type Settings = {
  currency: string;
  lowStockThreshold: number;
};

const { width, height } = Dimensions.get('window');
const IMAGES = [
  require('../../assets/bg1.jpg'),
  require('../../assets/bg2.jpg'),
  require('../../assets/bg3.jpg'),
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { theme } = useAppTheme();
  const [currentImage, setCurrentImage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({ totalSales: 0, totalRevenue: 0 });
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({ currency: 'KES', lowStockThreshold: 5 });

  useEffect(() => {
    const loadSettingsAndData = async () => {
      try {
        // Load settings
        const savedSettings = await AsyncStorage.getItem('settings');
        const defaultSettings: Settings = { currency: 'KES', lowStockThreshold: 5 };
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setSettings({ ...defaultSettings, ...parsedSettings });
        }

        // Fetch sales summary
        const summaryResult = await db.getFirstAsync<SalesSummary>(
          `SELECT 
             COUNT(*) as totalSales,
             SUM(amount) as totalRevenue
           FROM sales
           WHERE date >= date('now', 'start of day')`
        );
        setSalesSummary({
          totalSales: summaryResult?.totalSales ?? 0,
          totalRevenue: summaryResult?.totalRevenue ?? 0,
        });

        // Fetch low stock items using dynamic threshold
        const lowStockResult = await db.getAllAsync<InventoryItem>(
          `SELECT * FROM inventory WHERE quantity <= ? ORDER BY quantity ASC`,
          [settings.lowStockThreshold ?? 5]
        );
        setLowStockItems(lowStockResult ?? []);
      } catch (err) {
        Alert.alert('Error', 'Failed to load data. Please try again.', [
          { text: 'Retry', onPress: () => loadSettingsAndData() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };

    loadSettingsAndData();

    const interval = setInterval(() => {
      const nextImage = (currentImage + 1) % IMAGES.length;
      Animated.timing(slideAnim, {
        toValue: -width * nextImage,
        duration: 1000,
        useNativeDriver: true,
      }).start(() => {
        setCurrentImage(nextImage);
        if (nextImage === 0) {
          slideAnim.setValue(0);
        }
      });
    }, 5000);

    Animated.spring(titleAnim, {
      toValue: 1,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

    return () => {
      clearInterval(interval);
      slideAnim.stopAnimation();
      titleAnim.stopAnimation();
    };
  }, [currentImage, slideAnim, titleAnim, settings.lowStockThreshold]);

  const navigateTo = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.imageContainer, { transform: [{ translateX: slideAnim }] }]}>
        {IMAGES.map((image, index) => (
          <ImageBackground
            key={index}
            source={image}
            style={[styles.image, { width }]}
            resizeMode="cover"
            accessible={true}
            accessibilityLabel={`Background image ${index + 1}`}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', theme.colors.gradientEnd]}
              style={styles.gradient}
            />
          </ImageBackground>
        ))}
      </Animated.View>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={[styles.scrollContainer, { paddingBottom: height * 0.12 }]}>
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
            <Text
              variant="displaySmall"
              style={[globalStyles.title, { fontSize: theme.typography.display.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel="BizPro App Title"
              accessibilityRole="header"
            >
              BizPro
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.subtitle, { fontSize: theme.typography.body.fontSize, color: theme.colors.accent }]}
              accessible={true}
              accessibilityLabel="Empower Your Business"
            >
              Empower Your Business
            </Text>
          </Animated.View>
          <GradientCard>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons
                name="chart-line"
                size={theme.typography.title.fontSize}
                color={theme.colors.primary}
              />
              <Text
                variant="titleLarge"
                style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel="Today's Insights"
              >
                Today's Insights
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel={`Total Sales: ${salesSummary.totalSales}`}
              >
                Total Sales
              </Text>
              <Text
                style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel={`Total Sales Value: ${salesSummary.totalSales}`}
              >
                {salesSummary.totalSales}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel={`Revenue: ${settings.currency} ${salesSummary.totalRevenue.toFixed(2)}`}
              >
                Revenue
              </Text>
              <Text
                style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                accessible={true}
                accessibilityLabel={`Revenue Value: ${settings.currency} ${salesSummary.totalRevenue.toFixed(2)}`}
              >
                {settings.currency} {salesSummary.totalRevenue.toFixed(2)}
              </Text>
            </View>
          </GradientCard>
          {lowStockItems.length > 0 && (
            <GradientCard>
              <View style={styles.summaryHeader}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={theme.typography.title.fontSize}
                  color={theme.colors.error}
                />
                <Text
                  variant="titleLarge"
                  style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel="Low Stock Alerts"
                >
                  Low Stock Alerts
                </Text>
              </View>
              <View style={styles.chipContainer}>
                {lowStockItems.map((item) => (
                  <Chip
                    key={item.id}
                    style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                    textStyle={[styles.chipText, { fontSize: theme.typography.caption.fontSize, color: theme.colors.accent }]}
                    onPress={() => navigateTo('Inventory')}
                    icon={() => (
                      <MaterialCommunityIcons
                        name="package-variant"
                        size={theme.typography.caption.fontSize}
                        color={theme.colors.accent}
                      />
                    )}
                    accessible={true}
                    accessibilityLabel={`Low stock item: ${item.name}, quantity ${item.quantity}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: false }}
                  >
                    {item.name}: {item.quantity}
                  </Chip>
                ))}
              </View>
            </GradientCard>
          )}
          <View style={[styles.footer, { backgroundColor: 'rgba(255, 255, 255, 0.1)', elevation: theme.elevation }]}>
            <Text
              style={[styles.footerText, { fontSize: theme.typography.caption.fontSize, color: theme.colors.accent }]}
              accessible={true}
              accessibilityLabel="Powered by Vickins Technologies"
            >
              Powered by Vickins Technologies
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  } as ViewStyle,
  image: {
    height: '100%',
  } as ImageStyle,
  gradient: {
    flex: 1,
  } as ViewStyle,
  overlay: {
    flex: 1,
  } as ViewStyle,
  scrollContainer: {
    padding: 16, // Use raw value as theme.spacing is now dynamic
    minHeight: height,
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginTop: 32, // Use raw value as theme.spacing is dynamic
    marginBottom: 24,
  } as ViewStyle,
  subtitle: {
    marginTop: 8,
    fontWeight: 'normal',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  } as TextStyle,
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  } as ViewStyle,
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  } as ViewStyle,
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  } as ViewStyle,
  chip: {
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
  } as ViewStyle,
  chipText: {
    fontWeight: 'normal',
  } as TextStyle,
  footer: {
    marginTop: 32,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  } as ViewStyle,
  footerText: {
    fontWeight: 'normal',
    letterSpacing: 0.5,
  } as TextStyle,
});

export default HomeScreen;
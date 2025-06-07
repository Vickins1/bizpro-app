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
import { Card, Text, useTheme, Chip } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import db from '../database/db';
import { theme, globalStyles } from '../theme';
import GradientCard from '../components/GradientCard';
import { RootStackParamList } from '../../App';

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
const IMAGES = [
  require('../../assets/bg1.jpg'),
  require('../../assets/bg2.jpg'),
  require('../../assets/bg3.jpg'),
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const paperTheme = useTheme();
  const [currentImage, setCurrentImage] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({ totalSales: 0, totalRevenue: 0 });
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);

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
          totalSales: summaryResult?.totalSales ?? 0,
          totalRevenue: summaryResult?.totalRevenue ?? 0,
        });

        const lowStockResult = await db.getAllAsync<InventoryItem>(
          `SELECT * FROM inventory WHERE quantity <= 5 ORDER BY quantity ASC`
        );
        setLowStockItems(lowStockResult ?? []);
      } catch (err) {
        Alert.alert('Error', 'Failed to load data. Please try again.', [
          { text: 'Retry', onPress: () => fetchData() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };

    fetchData();

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

    return () => clearInterval(interval);
  }, [currentImage, slideAnim]);

  const navigateTo = (screen: keyof RootStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <View style={globalStyles.container}>
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
              style={[globalStyles.title, { fontSize: theme.typography.display.fontSize }]}
              accessible={true}
              accessibilityLabel="BizPro App Title"
            >
              BizPro
            </Text>
            <Text
              variant="titleMedium"
              style={[styles.subtitle, { fontSize: theme.typography.body.fontSize }]}
            >
              Empower Your Business
            </Text>
          </Animated.View>
          <GradientCard>
            <View style={styles.summaryHeader}>
              <MaterialCommunityIcons
                name="chart-line"
                size={theme.typography.title.fontSize}
                color={paperTheme.colors.primary}
              />
              <Text variant="titleLarge" style={globalStyles.cardTitle}>
                Today's Insights
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={globalStyles.cardText}>Total Sales</Text>
              <Text style={globalStyles.cardText}>{salesSummary.totalSales}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={globalStyles.cardText}>Revenue</Text>
              <Text style={globalStyles.cardText}>KES {salesSummary.totalRevenue.toFixed(2)}</Text>
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
                <Text variant="titleLarge" style={globalStyles.cardTitle}>
                  Low Stock Alerts
                </Text>
              </View>
              <View style={styles.chipContainer}>
                {lowStockItems.map((item) => (
                  <Chip
                    key={item.id}
                    style={styles.chip}
                    textStyle={[styles.chipText, { fontSize: theme.typography.caption.fontSize }]}
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
                  >
                    {item.name}: {item.quantity}
                  </Chip>
                ))}
              </View>
            </GradientCard>
          )}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { fontSize: theme.typography.caption.fontSize }]}>
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
    padding: theme.spacing.md,
    minHeight: height,
  } as ViewStyle,
  header: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  } as ViewStyle,
  subtitle: {
    color: theme.colors.accent,
    marginTop: theme.spacing.sm,
    fontWeight: theme.typography.body.fontWeight,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  } as TextStyle,
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  } as ViewStyle,
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: theme.spacing.xs,
  } as ViewStyle,
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  } as ViewStyle,
  chip: {
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.medium,
    padding: theme.spacing.xs,
  } as ViewStyle,
  chipText: {
    color: theme.colors.accent,
    fontWeight: theme.typography.caption.fontWeight,
  } as TextStyle,
  footer: {
    marginTop: theme.spacing.xl,
    paddingVertical: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: theme.borderRadius.medium,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
  footerText: {
    color: theme.colors.accent,
    fontWeight: theme.typography.caption.fontWeight,
    letterSpacing: 0.5,
  } as TextStyle,
});

export default HomeScreen;
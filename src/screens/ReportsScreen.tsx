import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Modal, Animated } from 'react-native';
import { Text, SegmentedButtons, Card, FAB, Button, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { globalStyles } from '../theme';
import { useAppTheme } from '../context/ThemeContext';
import db from '../database/db';

type SaleReport = {
  itemId: number;
  itemName: string;
  totalQuantity: number;
  totalAmount: number;
};

type Summary = {
  totalSales: number;
  totalRevenue: number;
  averageSale: number;
};

type Settings = {
  currency: string;
};

const { width } = Dimensions.get('window');

const ReportsScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [reports, setReports] = useState<SaleReport[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalSales: 0, totalRevenue: 0, averageSale: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('KES');
  const [cardAnims, setCardAnims] = useState<Animated.Value[]>([]);
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const modalAnim = useRef(new Animated.Value(0)).current;

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setCurrency(parsedSettings.currency ?? 'KES');
        }
      } catch (err) {
        Alert.alert('Error', 'Failed to load settings', [
          { text: 'Retry', onPress: () => loadSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    };
    loadSettings();

    return () => {
      cardAnims.forEach(anim => anim.stopAnimation());
      summaryAnim.stopAnimation();
      modalAnim.stopAnimation();
    };
  }, []); // Removed cardAnims from dependencies

  const fetchReports = useCallback(
    async (selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'custom', start?: string, end?: string) => {
      try {
        let dateFilter = '';
        let params: (string | number)[] = [];

        if (selectedPeriod === 'daily') {
          dateFilter = `date >= date('now', 'start of day')`;
        } else if (selectedPeriod === 'weekly') {
          dateFilter = `date >= date('now', '-6 days')`;
        } else if (selectedPeriod === 'monthly') {
          dateFilter = `date >= date('now', 'start of month')`;
        } else if (selectedPeriod === 'custom' && start && end) {
          dateFilter = `date BETWEEN ? AND ?`;
          params = [start, end];
        }

        const reportQuery = `
          SELECT 
            s.itemId,
            i.name as itemName,
            SUM(s.quantity) as totalQuantity,
            SUM(s.amount) as totalAmount
          FROM sales s
          JOIN inventory i ON s.itemId = i.id
          WHERE s.${dateFilter}
          GROUP BY s.itemId, i.name
          ORDER BY totalAmount DESC
        `;
        const summaryQuery = `
          SELECT 
            COUNT(*) as totalSales,
            SUM(amount) as totalRevenue
          FROM sales
          WHERE ${dateFilter}
        `;

        const result = await db.getAllAsync<SaleReport>(reportQuery, params);
        const summaryResult = await db.getFirstAsync<{ totalSales: number; totalRevenue: number }>(
          summaryQuery,
          params
        );

        setReports(result ?? []);
        setSummary({
          totalSales: summaryResult?.totalSales || 0,
          totalRevenue: summaryResult?.totalRevenue || 0,
          averageSale: summaryResult?.totalSales ? (summaryResult.totalRevenue / summaryResult.totalSales) : 0,
        });

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

        Animated.timing(summaryAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } catch (err) {
        Alert.alert('Error', 'Failed to load reports', [
          { text: 'Retry', onPress: () => fetchReports(selectedPeriod, start, end) },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    },
    [summaryAnim]
  );

  useEffect(() => {
    if (period !== 'custom') {
      fetchReports(period);
    } else {
      setModalVisible(true);
    }
  }, [period, fetchReports]);

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(modalAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => modalAnim.setValue(0));
    }
  }, [modalVisible, modalAnim]);

  const handleCustomDateSubmit = useCallback(() => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please enter both start and end dates');
      return;
    }
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      Alert.alert('Error', 'Dates must be in YYYY-MM-DD format');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      Alert.alert('Error', 'Invalid date format');
      return;
    }
    if (start > end) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    fetchReports('custom', startDate, endDate);
    setModalVisible(false);
    setStartDate('');
    setEndDate('');
  }, [startDate, endDate, fetchReports]);

  const handleExport = () => {
    Alert.alert('Export', 'Report export functionality would be implemented here (e.g., CSV download).');
  };

  const renderReport = ({ item, index }: { item: SaleReport; index: number }) => (
    <Animated.View
      style={[
        styles(theme).card,
        {
          opacity: cardAnims[index] || 1,
          transform: [
            {
              translateY: cardAnims[index]?.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }) || 0,
            },
          ],
        },
      ]}
    >
      <Card style={styles(theme).cardContainer} accessibilityRole="summary" accessibilityLabel={`Report: ${item.itemName}`}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.gradientEnd]}
          style={styles(theme).cardGradient}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Item: ${item.itemName}`}
            >
              {item.itemName}
            </Text>
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Quantity Sold: ${item.totalQuantity}`}
            >
              Quantity Sold: {item.totalQuantity}
            </Text>
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Revenue: ${currency} ${item.totalAmount.toFixed(2)}`}
            >
              Revenue: {currency} {item.totalAmount.toFixed(2)}
            </Text>
          </Card.Content>
        </LinearGradient>
      </Card>
    </Animated.View>
  );

  return (
    <View style={[globalStyles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={styles(theme).gradient}
      >
        <Text
          variant="displaySmall"
          style={[globalStyles.title, { fontSize: theme.typography.display.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel="Sales Reports Title"
          accessibilityRole="header"
        >
          Sales Reports
        </Text>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as 'daily' | 'weekly' | 'monthly' | 'custom')}
          buttons={[
            { value: 'daily', label: 'Daily', accessibilityLabel: 'Select daily report' },
            { value: 'weekly', label: 'Weekly', accessibilityLabel: 'Select weekly report' },
            { value: 'monthly', label: 'Monthly', accessibilityLabel: 'Select monthly report' },
            { value: 'custom', label: 'Custom', accessibilityLabel: 'Select custom date range' },
          ]}
          style={styles(theme).segmentedButtons}
          theme={{
            roundness: theme.borderRadius.medium,
            colors: { secondaryContainer: theme.colors.secondary },
          }}
        />
        <Animated.View
          style={[
            styles(theme).summaryCard,
            {
              opacity: summaryAnim,
              transform: [
                {
                  translateY: summaryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Card style={styles(theme).cardContainer} accessibilityRole="summary" accessibilityLabel="Summary">
            <LinearGradient
              colors={[theme.colors.background, theme.colors.gradientEnd]}
              style={styles(theme).cardGradient}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel="Summary"
                >
                  Summary
                </Text>
                <Text
                  style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel={`Total Sales: ${summary.totalSales}`}
                >
                  Total Sales: {summary.totalSales}
                </Text>
                <Text
                  style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel={`Total Revenue: ${currency} ${summary.totalRevenue.toFixed(2)}`}
                >
                  Total Revenue: {currency} {summary.totalRevenue.toFixed(2)}
                </Text>
                <Text
                  style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel={`Average Sale: ${currency} ${summary.averageSale.toFixed(2)}`}
                >
                  Average Sale: {currency} {summary.averageSale.toFixed(2)}
                </Text>
              </Card.Content>
            </LinearGradient>
          </Card>
        </Animated.View>
        <Text
          variant="titleLarge"
          style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
          accessible={true}
          accessibilityLabel="Detailed Report Title"
          accessibilityRole="header"
        >
          Detailed Report
        </Text>
        <FlatList
          data={reports}
          keyExtractor={(item) => item.itemId.toString()}
          renderItem={renderReport}
          ListEmptyComponent={
            <Text
              style={[globalStyles.cardText, { fontSize: theme.typography.body.fontSize, color: theme.colors.text, textAlign: 'center' }]}
              accessible={true}
              accessibilityLabel="No sales for this period"
            >
              No sales for this period
            </Text>
          }
          contentContainerStyle={[styles(theme).listContainer, { paddingBottom: theme.spacing.xl }]}
        />
        <FAB
          style={[styles(theme).fab, { backgroundColor: theme.colors.primary }]}
          icon="download"
          onPress={handleExport}
          color={theme.colors.text} // Changed from accent for better contrast
          customSize={56}
          accessible={true}
          accessibilityLabel="Export report"
          accessibilityRole="button"
        />
        <Modal
          animationType="none"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Animated.View
            style={[
              styles(theme).modalOverlay,
              {
                opacity: modalAnim,
                transform: [
                  {
                    scale: modalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.background, theme.colors.gradientEnd]}
              style={[styles(theme).modalContent, { maxWidth: width - theme.spacing.lg * 2 }]}
            >
              <Text
                variant="titleLarge"
                style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text, textAlign: 'center' }]}
                accessible={true}
                accessibilityLabel="Select Date Range"
                accessibilityRole="header"
              >
                Select Date Range
              </Text>
              <TextInput
                label="Start Date (YYYY-MM-DD)"
                value={startDate}
                onChangeText={setStartDate}
                style={styles(theme).input}
                mode="outlined"
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
                accessible={true}
                accessibilityLabel="Start date input"
                accessibilityRole="text"
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={endDate}
                onChangeText={setEndDate}
                style={styles(theme).input}
                mode="outlined"
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
                accessible={true}
                accessibilityLabel="End date input"
                accessibilityRole="text"
              />
              <View style={styles(theme).modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles(theme).modalButton}
                  textColor={theme.colors.error}
                  accessible={true}
                  accessibilityLabel="Cancel date selection"
                  accessibilityRole="button"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCustomDateSubmit}
                  style={styles(theme).modalButton}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.text} // Changed from accent for consistency
                  accessible={true}
                  accessibilityLabel="Apply date range"
                  accessibilityRole="button"
                >
                  Apply
                </Button>
              </View>
            </LinearGradient>
          </Animated.View>
        </Modal>
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
      paddingTop: theme.spacing.xl,
    },
    segmentedButtons: {
      marginVertical: theme.spacing.md,
    },
    summaryCard: {
      marginBottom: theme.spacing.md,
    },
    card: {
      marginBottom: theme.spacing.sm,
    },
    cardContainer: {
      borderRadius: theme.borderRadius.medium,
      overflow: 'hidden',
      elevation: theme.elevation,
    },
    cardGradient: {
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
    },
    listContainer: {
      paddingBottom: theme.spacing.md,
    },
    fab: {
      position: 'absolute',
      bottom: theme.spacing.xl,
      right: theme.spacing.md,
      elevation: theme.elevation,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.modalOverlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modalContent: {
      width: '100%',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.medium,
      elevation: theme.elevation,
    },
    input: {
      marginBottom: theme.spacing.sm,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    modalButton: {
      flex: 1,
      marginHorizontal: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.medium,
    },
  });

export default ReportsScreen;
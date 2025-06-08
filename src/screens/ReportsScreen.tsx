import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, Modal, Animated, ViewStyle, TextStyle } from 'react-native';
import { Text, SegmentedButtons, Card, FAB, Button, TextInput } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import db from '../database/db';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions } from 'react-native';
import { globalStyles } from '../theme';
import { useAppTheme } from '../context/ThemeContext';

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

const { width, height } = Dimensions.get('window');

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
  }, [cardAnims]);

  const fetchReports = useCallback(
    async (selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'custom', start?: string, end?: string) => {
      try {
        let dateFilter = '';
        if (selectedPeriod === 'daily') {
          dateFilter = `date >= date('now', 'start of day')`;
        } else if (selectedPeriod === 'weekly') {
          dateFilter = `date >= date('now', '-6 days')`;
        } else if (selectedPeriod === 'monthly') {
          dateFilter = `date >= date('now', 'start of month')`;
        } else if (selectedPeriod === 'custom' && start && end) {
          dateFilter = `date BETWEEN '${start}' AND '${end}'`;
        }

        const result = await db.getAllAsync<SaleReport>(
          `
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
          `
        );

        const summaryResult = await db.getFirstAsync<{ totalSales: number; totalRevenue: number }>(
          `
          SELECT 
            COUNT(*) as totalSales,
            SUM(amount) as totalRevenue
          FROM sales
          WHERE ${dateFilter}
          `
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
        styles.card,
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
      <Card style={styles.cardContainer}>
        <LinearGradient
          colors={[theme.colors.background, theme.colors.gradientEnd]}
          style={styles.cardGradient}
        >
          <Card.Content>
            <Text
              variant="titleMedium"
              style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
              accessible={true}
              accessibilityLabel={`Item: ${item.itemName}`}
              accessibilityRole="text"
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
        style={styles.gradient}
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
          style={styles.segmentedButtons}
          theme={{
            roundness: theme.borderRadius.medium,
            colors: { secondaryContainer: theme.colors.secondary },
          }}
        />
        <Animated.View
          style={[
            styles.summaryCard,
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
          <Card style={styles.cardContainer}>
            <LinearGradient
              colors={[theme.colors.background, theme.colors.gradientEnd]}
              style={styles.cardGradient}
            >
              <Card.Content>
                <Text
                  variant="titleLarge"
                  style={[globalStyles.cardTitle, { fontSize: theme.typography.title.fontSize, color: theme.colors.text }]}
                  accessible={true}
                  accessibilityLabel="Summary"
                  accessibilityRole="header"
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
          contentContainerStyle={[styles.listContainer, { paddingBottom: height * 0.15 }]}
        />
        <FAB
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          icon="download"
          onPress={handleExport}
          color={theme.colors.accent}
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
              styles.modalOverlay,
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
              style={[styles.modalContent, { maxWidth: width * 0.9 }]}
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
                style={styles.input}
                mode="outlined"
                theme={{
                  roundness: theme.borderRadius.medium,
                  colors: {
                    text: theme.colors.text,
                    primary: theme.colors.primary,
                    background: theme.colors.background === '#1A1A1A' ? '#2A2A2A' : '#E0E0E0',
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
                style={styles.input}
                mode="outlined"
                theme={{
                  roundness: theme.borderRadius.medium,
                  colors: {
                    text: theme.colors.text,
                    primary: theme.colors.primary,
                    background: theme.colors.background === '#1A1A1A' ? '#2A2A2A' : '#E0E0E0',
                    placeholder: theme.colors.secondary,
                    outline: theme.colors.primary,
                  },
                }}
                textColor={theme.colors.text}
                accessible={true}
                accessibilityLabel="End date input"
                accessibilityRole="text"
              />
              <View style={styles.modalButtons}>
                <Button
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
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
                  style={styles.modalButton}
                  buttonColor={theme.colors.primary}
                  textColor={theme.colors.accent}
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

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: 16, // Use raw value as theme.spacing is dynamic
    paddingTop: 32,
  } as ViewStyle,
  segmentedButtons: {
    marginVertical: 16,
  } as ViewStyle,
  summaryCard: {
    marginBottom: 16,
  } as ViewStyle,
  card: {
    marginBottom: 8,
  } as ViewStyle,
  cardContainer: {
    borderRadius: 8, // Use raw value as theme.borderRadius is dynamic
    overflow: 'hidden',
  } as ViewStyle,
  cardGradient: {
    padding: 16,
    borderRadius: 8,
  } as ViewStyle,
  listContainer: {
    paddingBottom: 24,
  } as ViewStyle,
  fab: {
    position: 'absolute',
    bottom: height * 0.12,
    right: 16,
  } as ViewStyle,
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Use raw value as theme.colors is dynamic
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  } as ViewStyle,
  modalContent: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    elevation: 5, // Use raw elevation as theme.elevation is dynamic
  } as ViewStyle,
  input: {
    marginBottom: 8,
  } as ViewStyle,
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  } as ViewStyle,
  modalButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 4,
  } as ViewStyle,
});

export default ReportsScreen;
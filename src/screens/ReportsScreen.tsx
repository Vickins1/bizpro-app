import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Alert, Modal, Animated } from 'react-native';
import { Text, SegmentedButtons, Card, FAB, Button, TextInput, useTheme } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

const ReportsScreen: React.FC = () => {
  const theme = useTheme();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [reports, setReports] = useState<SaleReport[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalSales: 0, totalRevenue: 0, averageSale: 0 });
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const summaryAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef<Animated.Value[]>([]).current;

  const fetchReports = async (selectedPeriod: 'daily' | 'weekly' | 'monthly' | 'custom', start?: string, end?: string) => {
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

      // Fetch detailed report
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

      // Fetch summary
      const summaryResult = await db.getFirstAsync<{ totalSales: number; totalRevenue: number }>(
        `
        SELECT 
          COUNT(*) as totalSales,
          SUM(amount) as totalRevenue
        FROM sales
        WHERE ${dateFilter}
        `
      );

      setReports(result);
      setSummary({
        totalSales: summaryResult?.totalSales || 0,
        totalRevenue: summaryResult?.totalRevenue || 0,
        averageSale: summaryResult?.totalSales ? (summaryResult.totalRevenue / summaryResult.totalSales) : 0,
      });

      cardAnims.length = 0;
      cardAnims.push(...result.map(() => new Animated.Value(0)));
      result.forEach((_, index) => {
        Animated.timing(cardAnims[index], {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });

      Animated.timing(summaryAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      Alert.alert('Error', 'Failed to load reports');
    }
  };

  useEffect(() => {
    if (period !== 'custom') {
      fetchReports(period);
    }
  }, [period]);

  const handleCustomDateSubmit = () => {
    if (!startDate || !endDate) {
      Alert.alert('Error', 'Please enter both start and end dates');
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      Alert.alert('Error', 'Start date must be before end date');
      return;
    }
    fetchReports('custom', startDate, endDate);
    setModalVisible(false);
  };

  const handleExport = () => {
    Alert.alert('Export', 'Report export functionality would be implemented here (e.g., CSV download).');
  };

  const renderReport = ({ item, index }: { item: SaleReport; index: number }) => (
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
        <Card.Content>
          <Text variant="titleMedium" style={styles.cardTitle}>
            {item.itemName}
          </Text>
          <Text style={styles.cardText}>Quantity Sold: {item.totalQuantity}</Text>
          <Text style={styles.cardText}>Revenue: KES {item.totalAmount.toFixed(2)}</Text>
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
          Sales Reports
        </Text>
        <SegmentedButtons
          value={period}
          onValueChange={(value) => setPeriod(value as 'daily' | 'weekly' | 'monthly' | 'custom')}
          buttons={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'custom', label: 'Custom' },
          ]}
          style={styles.segmentedButtons}
          theme={{ roundness: 10 }}
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
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Card>
            <Card.Content>
              <Text variant="titleLarge" style={styles.cardTitle}>
                Summary
              </Text>
              <Text style={styles.cardText}>Total Sales: {summary.totalSales}</Text>
              <Text style={styles.cardText}>Total Revenue: KES {summary.totalRevenue.toFixed(2)}</Text>
              <Text style={styles.cardText}>Average Sale: KES {summary.averageSale.toFixed(2)}</Text>
            </Card.Content>
          </Card>
        </Animated.View>
        <Text variant="titleLarge" style={styles.subtitle}>
          Detailed Report
        </Text>
        <FlatList
          data={reports}
          keyExtractor={(item) => item.itemId.toString()}
          renderItem={renderReport}
          ListEmptyComponent={<Text style={styles.empty}>No sales for this period</Text>}
          contentContainerStyle={styles.listContainer}
        />
        <FAB
          style={styles.fab}
          icon="download"
          onPress={handleExport}
          color="#fff"
        />
        <Modal
          animationType="fade"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['#FFFFFF', '#F5F5F5']}
              style={styles.modalContent}
            >
              <Text variant="titleLarge" style={styles.modalTitle}>
                Select Date Range
              </Text>
              <TextInput
                label="Start Date (YYYY-MM-DD)"
                value={startDate}
                onChangeText={setStartDate}
                style={styles.input}
                mode="outlined"
                theme={{ roundness: 10 }}
              />
              <TextInput
                label="End Date (YYYY-MM-DD)"
                value={endDate}
                onChangeText={setEndDate}
                style={styles.input}
                mode="outlined"
                theme={{ roundness: 10 }}
              />
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
                  onPress={handleCustomDateSubmit}
                  style={styles.modalButton}
                  buttonColor="#FF6F61"
                >
                  Apply
                </Button>
              </View>
            </LinearGradient>
          </View>
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
  segmentedButtons: {
       marginVertical: 20,
       backgroundColor: '#fff',
    marginBottom: 20,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
  subtitle: {
    color: '#fff',
    fontWeight: '700',
    marginBottom: 15,
  },
  empty: {
    textAlign: 'center',
    color: '#E0E0E0',
    fontSize: 16,
    marginTop: 20,
  },
  listContainer: {
    paddingBottom: 80,
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

export default ReportsScreen;
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, SegmentedButtons, Card } from 'react-native-paper';
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
};

const ReportsScreen: React.FC = () => {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [reports, setReports] = useState<SaleReport[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalSales: 0, totalRevenue: 0 });

  const fetchReports = async (selectedPeriod: 'daily' | 'weekly' | 'monthly') => {
    try {
      let dateFilter = '';
      if (selectedPeriod === 'daily') {
        dateFilter = `date >= date('now', 'start of day')`;
      } else if (selectedPeriod === 'weekly') {
        dateFilter = `date >= date('now', '-6 days')`;
      } else {
        dateFilter = `date >= date('now', 'start of month')`;
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
      });
    } catch (err) {
      Alert.alert('Error', 'Failed to load reports');
    }
  };

  useEffect(() => {
    fetchReports(period);
  }, [period]);

  return (
    <View style={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Sales Reports</Text>
      <SegmentedButtons
        value={period}
        onValueChange={(value) => setPeriod(value as 'daily' | 'weekly' | 'monthly')}
        buttons={[
          { value: 'daily', label: 'Daily' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'monthly', label: 'Monthly' },
        ]}
        style={styles.segmentedButtons}
      />
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium">Summary</Text>
          <Text>Total Sales: {summary.totalSales}</Text>
          <Text>Total Revenue: KES {summary.totalRevenue.toFixed(2)}</Text>
        </Card.Content>
      </Card>
      <Text variant="titleMedium" style={styles.subtitle}>Details</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.itemId.toString()}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium">{item.itemName}</Text>
              <Text>Quantity Sold: {item.totalQuantity}</Text>
              <Text>Revenue: KES {item.totalAmount.toFixed(2)}</Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No sales for this period</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: { marginBottom: 20 },
  subtitle: { marginTop: 20, marginBottom: 10 },
  segmentedButtons: { marginBottom: 20 },
  summaryCard: { marginBottom: 10 },
  card: { marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 20 },
});

export default ReportsScreen;
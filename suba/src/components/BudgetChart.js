// suba-frontend/src/components/BudgetChart.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProgressBar } from 'react-native-paper';

// Format currency with NGN support
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

export default function BudgetChart({ spent, budget, currency = 'NGN' }) {
  const progress = spent / budget;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>This Month's Spending</Text>
      <ProgressBar progress={progress} color="#4B5FFF" style={styles.progress} />
      <View style={styles.row}>
        <Text style={styles.amount}>{formatCurrency(spent, currency)} spent</Text>
        <Text style={styles.amount}>{formatCurrency(budget, currency)} budget</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginTop: 16 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  progress: { height: 8, borderRadius: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  amount: { fontSize: 14, color: '#666' },
});
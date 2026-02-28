import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const formatCurrency = (amount, currency = 'NGN') => {
  const n = Number(amount || 0);
  const formatted = n.toFixed(2);
  return currency === 'NGN' ? `₦${formatted}` : `$${formatted}`;
};

export default function BudgetCard({ total = 0, budget = 0, currency = 'NGN', onEdit }) {
  const safeTotal = Number(total) || 0;
  const safeBudget = Number(budget) || 0;

  const percent = safeBudget > 0 ? Math.min(safeTotal / safeBudget, 1) : 0;
  const remaining = safeBudget - safeTotal;
  const isOverBudget = safeBudget > 0 && safeTotal > safeBudget;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Ionicons name="wallet-outline" size={20} color="#4B5FFF" />
          <Text style={styles.leftText}>Monthly Budget</Text>
        </View>

        <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
          <Text style={styles.totalText}>{formatCurrency(safeTotal, currency)}/month</Text>
          {typeof onEdit === 'function' && (
            <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
              <Ionicons name="create-outline" size={16} color="#4B5FFF" />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.progressWrap}>
        <View style={styles.progressBarBg}>
          <LinearGradient
            colors={isOverBudget ? ['#FF6B6B', '#FF8E8E'] : ['#6D7BFF', '#A46BFF']}
            start={[0, 0]}
            end={[1, 0]}
            style={[styles.progressFill, { width: `${Math.min(percent * 100, 100)}%` }]}
          />
        </View>
        <View style={styles.progressFooter}>
          <Text style={styles.small}>{formatCurrency(0, currency)}</Text>

          {safeBudget > 0 ? (
            <Text style={[styles.remaining, isOverBudget && styles.overBudget]}>
              {isOverBudget
                ? `Over by ${formatCurrency(Math.abs(remaining), currency)}`
                : `${formatCurrency(remaining, currency)} left`}
            </Text>
          ) : (
            <Text style={styles.setBudgetHint}>Set your monthly budget</Text>
          )}

          <Text style={styles.small}>{formatCurrency(safeBudget, currency)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leftText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  totalText: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  editBtn: { flexDirection:'row', alignItems:'center', backgroundColor:'#EEF2FF', paddingHorizontal:10, paddingVertical:6, borderRadius:8 },
  editText: { color:'#4B5FFF', fontWeight:'700', marginLeft:4, fontSize:12 },
  progressWrap: { marginTop: 4 },
  progressBarBg: { height: 12, backgroundColor: '#F3F4F6', borderRadius: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 10 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
  small: { color: '#9CA3AF', fontSize: 12, fontWeight: '500' },
  remaining: { color: '#10B981', fontSize: 12, fontWeight: '600' },
  overBudget: { color: '#EF4444' },
  setBudgetHint: { color:'#6B7280', fontSize:12, fontWeight:'600' },
});
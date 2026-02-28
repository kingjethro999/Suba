import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBudgetReports, generateBudgetReport } from '../../services/budgetReportsService';
import { AuthContext } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function BudgetReportsScreen() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const { user } = useContext(AuthContext);

  const loadReports = async () => {
    try {
      const data = await getBudgetReports();
      setReports(data);
    } catch (error) {
      console.error('Error loading budget reports:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    try {
      await generateBudgetReport(selectedMonth);
      loadReports(); // Reload reports after generation
    } catch (error) {
      console.error('Error generating report:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  useEffect(() => {
    loadReports();
  }, []);

  const currentReport = reports.find(report => report.report_month === selectedMonth);
  const formatCurrency = (amount, currency = 'NGN') => {
    return currency === 'NGN' ? `₦${Number(amount).toFixed(2)}` : `$${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading budget reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4B5FFF', '#6D7BFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Budget Reports</Text>
        <Text style={styles.headerSubtitle}>Monthly spending analysis and insights</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Month Selector */}
        <View style={styles.monthSelector}>
          <Text style={styles.sectionTitle}>Select Month</Text>
          <View style={styles.monthButtons}>
            {['2024-09', '2024-08', '2024-07'].map(month => (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthButton,
                  selectedMonth === month && styles.monthButtonActive
                ]}
                onPress={() => setSelectedMonth(month)}
              >
                <Text style={[
                  styles.monthButtonText,
                  selectedMonth === month && styles.monthButtonTextActive
                ]}>
                  {new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {currentReport ? (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Ionicons name="cash-outline" size={24} color="#4B5FFF" />
                <Text style={styles.summaryValue}>{formatCurrency(currentReport.total_spent)}</Text>
                <Text style={styles.summaryLabel}>Total Spent</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="receipt-outline" size={24} color="#10B981" />
                <Text style={styles.summaryValue}>{currentReport.recurring_services}</Text>
                <Text style={styles.summaryLabel}>Active Subs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="add-circle-outline" size={24} color="#3B82F6" />
                <Text style={styles.summaryValue}>{currentReport.new_subscriptions || 0}</Text>
                <Text style={styles.summaryLabel}>New Subs</Text>
              </View>
              <View style={styles.summaryCard}>
                <Ionicons name="remove-circle-outline" size={24} color="#EF4444" />
                <Text style={styles.summaryValue}>{currentReport.canceled_subscriptions || 0}</Text>
                <Text style={styles.summaryLabel}>Canceled</Text>
              </View>
            </View>

            {/* Category Breakdown */}
            {currentReport.category_breakdown && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category Breakdown</Text>
                {Object.entries(JSON.parse(currentReport.category_breakdown)).map(([category, amount]) => (
                  <View key={category} style={styles.categoryItem}>
                    <Text style={styles.categoryName}>{category}</Text>
                    <Text style={styles.categoryAmount}>{formatCurrency(amount)}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Most Expensive Service */}
            {currentReport.most_expensive_service && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Most Expensive Service</Text>
                <View style={styles.expensiveService}>
                  <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
                  <Text style={styles.expensiveServiceName}>{currentReport.most_expensive_service}</Text>
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No report for {selectedMonth}</Text>
            <Text style={styles.emptyStateText}>
              Generate a budget report to see detailed analysis of your spending for this month.
            </Text>
            <TouchableOpacity style={styles.generateButton} onPress={handleGenerateReport}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>Generate Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Report History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report History</Text>
          {reports.slice(0, 3).map(report => (
            <TouchableOpacity
              key={report.id}
              style={styles.reportItem}
              onPress={() => setSelectedMonth(report.report_month)}
            >
              <View style={styles.reportInfo}>
                <Text style={styles.reportMonth}>
                  {new Date(report.report_month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <Text style={styles.reportAmount}>{formatCurrency(report.total_spent)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  content: { flex: 1 },
  monthSelector: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  monthButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
  monthButtonActive: { backgroundColor: '#4B5FFF' },
  monthButtonText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  monthButtonTextActive: { color: '#fff' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  summaryCard: { 
    flex: 1, 
    minWidth: width / 2 - 26, 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginVertical: 4 },
  summaryLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  section: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  categoryName: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  categoryAmount: { fontSize: 14, color: '#4B5FFF', fontWeight: '600' },
  expensiveService: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expensiveServiceName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, margin: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  generateButton: { backgroundColor: '#4B5FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  generateButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  reportItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  reportInfo: { flex: 1 },
  reportMonth: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  reportAmount: { fontSize: 16, fontWeight: '600', color: '#4B5FFF' },
});
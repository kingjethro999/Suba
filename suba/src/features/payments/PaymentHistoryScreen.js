import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getPaymentHistory } from '../../services/paymentsService';
import { AuthContext } from '../../contexts/AuthContext';

export default function PaymentHistoryScreen() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useContext(AuthContext);

  const loadPayments = async () => {
    try {
      const data = await getPaymentHistory();
      setPayments(data);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const formatCurrency = (amount, currency = 'NGN') => {
    return currency === 'NGN' ? `₦${Number(amount).toFixed(2)}` : `$${Number(amount).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'successful': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'successful': return 'checkmark-circle';
      case 'pending': return 'time-outline';
      case 'failed': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading payment history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4B5FFF', '#6D7BFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Payment History</Text>
        <Text style={styles.headerSubtitle}>Track your subscription payments</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {formatCurrency(payments.reduce((total, payment) => total + (payment.amount || 0), 0))}
            </Text>
            <Text style={styles.summaryLabel}>Total Spent</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {payments.filter(p => p.status === 'successful').length}
            </Text>
            <Text style={styles.summaryLabel}>Successful</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {payments.filter(p => p.status === 'pending').length}
            </Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
        </View>

        {/* Payment List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          
          {payments.length > 0 ? (
            payments.map(payment => (
              <View key={payment.id} style={styles.paymentCard}>
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentPlan}>{payment.plan}</Text>
                    <Text style={styles.paymentMethod}>{payment.method}</Text>
                  </View>
                  <Text style={styles.paymentAmount}>{formatCurrency(payment.amount, payment.currency)}</Text>
                </View>
                
                <View style={styles.paymentDetails}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(payment.status)}20` }]}>
                    <Ionicons name={getStatusIcon(payment.status)} size={14} color={getStatusColor(payment.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.paid_at).toLocaleDateString()}
                  </Text>
                </View>
                
                {payment.receipt_url && (
                  <TouchableOpacity style={styles.receiptButton}>
                    <Ionicons name="receipt-outline" size={16} color="#4B5FFF" />
                    <Text style={styles.receiptText}>View Receipt</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="card-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No payment history</Text>
              <Text style={styles.emptyStateText}>
                Your payment history will appear here once you make subscription payments
              </Text>
            </View>
          )}
        </View>

        {/* Payment Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Payment Tips</Text>
          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <Text style={styles.tipText}>Always verify payment receipts</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
            <Text style={styles.tipText}>Set up auto-pay for recurring subscriptions</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="notifications-outline" size={16} color="#F59E0B" />
            <Text style={styles.tipText}>Enable payment reminders 3 days before due date</Text>
          </View>
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
  summaryContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    margin: 16, 
    padding: 20, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#4B5FFF', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  section: { margin: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  paymentCard: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  paymentInfo: { flex: 1 },
  paymentPlan: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 2 },
  paymentMethod: { fontSize: 12, color: '#6B7280' },
  paymentAmount: { fontSize: 18, fontWeight: '700', color: '#4B5FFF' },
  paymentDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 4,
    gap: 4 
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  paymentDate: { fontSize: 12, color: '#9CA3AF' },
  receiptButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    alignSelf: 'flex-start',
    padding: 8,
    gap: 4 
  },
  receiptText: { fontSize: 12, color: '#4B5FFF', fontWeight: '500' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 12 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  tipsSection: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12 },
  tipsTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  tipItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  tipText: { fontSize: 14, color: '#6B7280', flex: 1 },
});
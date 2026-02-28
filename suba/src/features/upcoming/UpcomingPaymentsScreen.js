// suba-frontend/src/features/upcoming/UpcomingPaymentsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions } from '../subscriptions/subscriptionService';
import ReminderCard from '../../components/ReminderCard';
import SubscriptionCard from '../../components/SubscriptionCard';

// Format currency with NGN support
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Get subscriptions due in next 7 days
const getUpcomingSubscriptions = (subscriptions) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  return subscriptions.filter(sub => {
    if (!sub.next_billing_date) return false;
    
    const billingDate = new Date(sub.next_billing_date);
    billingDate.setHours(12, 0, 0, 0);
    
    return billingDate >= today && billingDate <= nextWeek;
  }).sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date));
};

// Calculate total upcoming amount
const calculateTotalUpcoming = (subscriptions) => {
  return subscriptions.reduce((total, sub) => total + (Number(sub.amount) || 0), 0);
};

export default function UpcomingPaymentsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [upcomingPayments, setUpcomingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubscriptions = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data || []);
      
      const upcoming = getUpcomingSubscriptions(data || []);
      setUpcomingPayments(upcoming);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      Alert.alert("Error", "Failed to load upcoming payments");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSubscriptions();
  }, [loadSubscriptions]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const totalUpcoming = calculateTotalUpcoming(upcomingPayments);
  const currency = upcomingPayments[0]?.currency || 'NGN';

  const handleSkipPayment = (subscriptionId) => {
    Alert.alert(
      "Skip Payment",
      "Are you sure you want to skip this payment reminder?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Skip", 
          onPress: () => {
            // Implement skip payment logic here
            Alert.alert("Skipped", "Payment reminder skipped for now");
          }
        }
      ]
    );
  };

  const handlePayNow = (subscription) => {
    Alert.alert(
      "Pay Now",
      `Pay ${formatCurrency(subscription.amount, subscription.currency)} for ${subscription.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Pay Now", 
          onPress: () => {
            // Implement payment logic here
            Alert.alert("Payment Successful", `Payment processed for ${subscription.name}`);
          }
        }
      ]
    );
  };

  const handleViewSubscription = (subscription) => {
    navigation.navigate('SubscriptionDetails', { subscription });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B5FFF" />
        <Text style={styles.loadingText}>Loading upcoming payments...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => navigation.goBack()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
      </TouchableOpacity>
      <Text style={styles.title}>Upcoming Payments</Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <LinearGradient
        colors={['#6D7BFF', '#A46BFF']}
        style={styles.statsCard}
        start={[0, 0]}
        end={[1, 0]}
      >
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{upcomingPayments.length}</Text>
          <Text style={styles.statLabel}>Due This Week</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(totalUpcoming, currency)}
          </Text>
          <Text style={styles.statLabel}>Total Due</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="calendar-outline" size={64} color="#E5E7EB" />
      <Text style={styles.emptyStateTitle}>No upcoming payments</Text>
      <Text style={styles.emptyStateText}>
        You don't have any subscriptions due in the next 7 days
      </Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('AddSubscription')}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.addButtonText}>Add Subscription</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubscriptionItem = ({ item }) => (
    <ReminderCard
      logo={item.logo}
      name={item.name}
      price={item.amount}
      dueDate={item.next_billing_date}
      currency={item.currency}
      onSkip={() => handleSkipPayment(item.id)}
      onPayNow={() => handlePayNow(item)}
      onPress={() => handleViewSubscription(item)}
    />
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      {upcomingPayments.length > 0 ? (
        <FlatList
          data={upcomingPayments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSubscriptionItem}
          ListHeaderComponent={
            <>
              {renderStats()}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Due This Week ({upcomingPayments.length})
                </Text>
                <Text style={styles.sectionDescription}>
                  Subscriptions due within the next 7 days
                </Text>
              </View>
            </>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {renderStats()}
          {renderEmptyState()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  statsContainer: {
    padding: 20,
    paddingBottom: 0,
  },
  statsCard: {
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sectionHeader: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  addButton: {
    backgroundColor: '#4B5FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
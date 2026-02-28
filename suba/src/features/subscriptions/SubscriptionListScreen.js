// suba-frontend/src/features/subscriptions/SubscriptionListScreen.js - UPDATED
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions } from './subscriptionService';
import SubscriptionCard from '../../components/SubscriptionCard';
import { NotificationService } from '../../services/notificationService';

// Format currency - handle NGN currency properly
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Calculate total monthly cost with proper currency conversion
const calculateTotalMonthly = (subscriptions) => {
  return subscriptions.reduce((total, sub) => {
    if (sub.status !== 'active') return total;
    
    let multiplier = 1;
    if (sub.billing_cycle === 'yearly') multiplier = 1/12;
    if (sub.billing_cycle === 'weekly') multiplier = 4.33;
    if (sub.billing_cycle === 'daily') multiplier = 30;
    
    return total + (Number(sub.amount) || 0) * multiplier;
  }, 0);
};

export default function SubscriptionListScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadSubscriptions = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      console.log('Loaded subscriptions:', data);
      setSubscriptions(data || []);
      
      // Schedule notifications for all active subscriptions
      const activeSubscriptions = data.filter(sub => sub.status === 'active');
      await NotificationService.scheduleAllReminders(activeSubscriptions || []);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      Alert.alert("Error", "Failed to load subscriptions");
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

  // Enhanced filtering logic
  const filteredSubscriptions = subscriptions.filter(sub => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (filter) {
      case 'active':
        return sub.status === 'active';
      
      case 'due_soon':
        if (sub.status !== 'active' || !sub.next_billing_date) return false;
        
        const billingDate = new Date(sub.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);
        
        const timeDiff = billingDate.getTime() - today.getTime();
        const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        const reminderDays = sub.reminder_days_before || 3;
        return daysUntilDue <= reminderDays && daysUntilDue >= 0;
      
      case 'overdue':
        if (sub.status !== 'active' || !sub.next_billing_date) return false;
        
        const overdueDate = new Date(sub.next_billing_date);
        overdueDate.setHours(0, 0, 0, 0);
        
        return overdueDate < today;
      
      case 'expensive':
        if (sub.status !== 'active') return false;
        
        const currency = sub.currency || 'NGN';
        const amount = Number(sub.amount) || 0;
        
        if (currency === 'NGN') {
          return amount > 5000;
        } else {
          return amount > 20;
        }
      
      case 'shared':
        return sub.is_shared === true;
      
      case 'cancelled':
        return sub.status === 'cancelled';
      
      default: // 'all'
        return true;
    }
  });

  // Calculate statistics
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active').length;
  const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'cancelled').length;
  
  const dueSoonSubscriptions = subscriptions.filter(sub => {
    if (sub.status !== 'active' || !sub.next_billing_date) return false;
    
    const today = new Date();
    const billingDate = new Date(sub.next_billing_date);
    const timeDiff = billingDate.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    const reminderDays = sub.reminder_days_before || 3;
    return daysUntilDue <= reminderDays && daysUntilDue >= 0;
  }).length;

  const overdueSubscriptions = subscriptions.filter(sub => {
    if (sub.status !== 'active' || !sub.next_billing_date) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billingDate = new Date(sub.next_billing_date);
    billingDate.setHours(0, 0, 0, 0);
    
    return billingDate < today;
  }).length;

  const expensiveSubscriptions = subscriptions.filter(sub => {
    if (sub.status !== 'active') return false;
    
    const currency = sub.currency || 'NGN';
    const amount = Number(sub.amount) || 0;
    
    if (currency === 'NGN') {
      return amount > 5000;
    } else {
      return amount > 20;
    }
  }).length;

  const sharedSubscriptions = subscriptions.filter(sub => sub.is_shared === true).length;

  const totalMonthly = calculateTotalMonthly(subscriptions);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B5FFF" />
        <Text style={styles.loadingText}>Loading subscriptions...</Text>
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
      <Text style={styles.title}>My Subscriptions</Text>
      <TouchableOpacity 
        onPress={() => navigation.navigate('AddSubscription', { refreshSubscriptions: loadSubscriptions })}
        style={styles.addButton}
      >
        <Ionicons name="add" size={24} color="#4B5FFF" />
      </TouchableOpacity>
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
          <Text style={styles.statValue}>{activeSubscriptions}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{dueSoonSubscriptions}</Text>
          <Text style={styles.statLabel}>Due Soon</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatCurrency(totalMonthly, subscriptions[0]?.currency || 'NGN')}
          </Text>
          <Text style={styles.statLabel}>Monthly</Text>
        </View>
      </LinearGradient>
    </View>
  );

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
    >
      <TouchableOpacity
        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
        onPress={() => setFilter('all')}
      >
        <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
          All ({subscriptions.length})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'active' && styles.filterButtonActive]}
        onPress={() => setFilter('active')}
      >
        <Ionicons 
          name="play-circle" 
          size={16} 
          color={filter === 'active' ? '#fff' : '#10B981'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
          Active ({activeSubscriptions})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'due_soon' && styles.filterButtonActive]}
        onPress={() => setFilter('due_soon')}
      >
        <Ionicons 
          name="alarm-outline" 
          size={16} 
          color={filter === 'due_soon' ? '#fff' : '#F59E0B'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'due_soon' && styles.filterTextActive]}>
          Due Soon ({dueSoonSubscriptions})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'overdue' && styles.filterButtonActive]}
        onPress={() => setFilter('overdue')}
      >
        <Ionicons 
          name="warning-outline" 
          size={16} 
          color={filter === 'overdue' ? '#fff' : '#EF4444'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'overdue' && styles.filterTextActive]}>
          Overdue ({overdueSubscriptions})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'expensive' && styles.filterButtonActive]}
        onPress={() => setFilter('expensive')}
      >
        <Ionicons 
          name="trending-up-outline" 
          size={16} 
          color={filter === 'expensive' ? '#fff' : '#8B5CF6'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'expensive' && styles.filterTextActive]}>
          Expensive ({expensiveSubscriptions})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'shared' && styles.filterButtonActive]}
        onPress={() => setFilter('shared')}
      >
        <Ionicons 
          name="people-outline" 
          size={16} 
          color={filter === 'shared' ? '#fff' : '#4B5FFF'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'shared' && styles.filterTextActive]}>
          Shared ({sharedSubscriptions})
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.filterButton, filter === 'cancelled' && styles.filterButtonActive]}
        onPress={() => setFilter('cancelled')}
      >
        <Ionicons 
          name="close-circle-outline" 
          size={16} 
          color={filter === 'cancelled' ? '#fff' : '#6B7280'} 
          style={styles.filterIcon}
        />
        <Text style={[styles.filterText, filter === 'cancelled' && styles.filterTextActive]}>
          Cancelled ({cancelledSubscriptions})
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const getFilterDescription = () => {
    switch (filter) {
      case 'active':
        return 'Currently active subscriptions';
      case 'due_soon':
        return 'Subscriptions due within reminder period';
      case 'overdue':
        return 'Subscriptions with missed payments';
      case 'expensive':
        return 'Subscriptions over ₦5,000 or $20';
      case 'shared':
        return 'Subscriptions shared with others';
      case 'cancelled':
        return 'Cancelled subscriptions';
      default:
        return 'All your subscriptions';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={filter === 'active' ? 'play-circle-outline' : 
               filter === 'due_soon' ? 'alarm-outline' : 
               filter === 'overdue' ? 'warning-outline' :
               filter === 'expensive' ? 'trending-up-outline' :
               filter === 'shared' ? 'people-outline' :
               filter === 'cancelled' ? 'close-circle-outline' : 'receipt-outline'} 
        size={64} 
        color="#E5E7EB" 
      />
      <Text style={styles.emptyStateTitle}>
        {filter === 'active' ? 'No active subscriptions' :
         filter === 'due_soon' ? 'No subscriptions due soon' :
         filter === 'overdue' ? 'No overdue subscriptions' :
         filter === 'expensive' ? 'No expensive subscriptions' :
         filter === 'shared' ? 'No shared subscriptions' :
         filter === 'cancelled' ? 'No cancelled subscriptions' :
         'No subscriptions yet'}
      </Text>
      <Text style={styles.emptyStateText}>
        {filter !== 'all' ? 
          `You don't have any subscriptions that match the "${filter.replace('_', ' ')}" filter` : 
          'Add your first subscription to get started with subscription management'}
      </Text>
      {filter !== 'all' ? (
        <TouchableOpacity 
          style={styles.clearFilterButton}
          onPress={() => setFilter('all')}
        >
          <Text style={styles.clearFilterText}>Show All Subscriptions</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.addFirstButton}
          onPress={() => navigation.navigate('AddSubscription', { refreshSubscriptions: loadSubscriptions })}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addFirstText}>Add Your First Subscription</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderSubscriptionCard = ({ item }) => (
    <SubscriptionCard 
      subscription={item} 
      onPress={() => navigation.navigate('SubscriptionDetails', { subscription: item })}
    />
  );

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <FlatList
        data={filteredSubscriptions}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderSubscriptionCard}
        ListHeaderComponent={
          <>
            {renderStats()}
            {renderFilterButtons()}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {filter === 'all' ? 'All Subscriptions' :
                 filter === 'active' ? 'Active Subscriptions' :
                 filter === 'due_soon' ? 'Due Soon' :
                 filter === 'overdue' ? 'Overdue Subscriptions' :
                 filter === 'expensive' ? 'Expensive Subscriptions' :
                 filter === 'shared' ? 'Shared Subscriptions' :
                 'Cancelled Subscriptions'}
                {' '}({filteredSubscriptions.length})
              </Text>
              <Text style={styles.sectionDescription}>
                {getFilterDescription()}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={renderEmptyState()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  addButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
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
  filterContainer: {
    padding: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  filterButtonActive: {
    backgroundColor: '#4B5FFF',
  },
  filterIcon: {
    marginRight: 6,
  },
  filterText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  filterTextActive: {
    color: '#fff',
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
    lineHeight: 20,
  },
  clearFilterButton: {
    backgroundColor: '#4B5FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFilterText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addFirstButton: {
    backgroundColor: '#4B5FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addFirstText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
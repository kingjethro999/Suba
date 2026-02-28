// suba-frontend/src/features/insights/InsightsScreen.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions } from '../subscriptions/subscriptionService';
import { getAIInsights, markInsightAsResolved, refreshAIInsights } from '../../services/aiInsightsService';
import SmartAssistantCard from '../../components/SmartAssistantCard';
import { AuthContext } from '../../contexts/AuthContext';

// Currency
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Metrics helpers
const getMonthlyAmount = (subscription) => {
  let amount = Number(subscription.amount) || 0;
  if (subscription.billing_cycle === 'yearly') amount /= 12;
  if (subscription.billing_cycle === 'weekly') amount *= 4.33;
  if (subscription.billing_cycle === 'daily') amount *= 30;
  return amount;
};

const calculateSubscriptionMetrics = (subscriptions) => {
  const currency = subscriptions[0]?.currency || 'NGN';
  const expensiveThreshold = currency === 'NGN' ? 5000 : 20;
  let totalMonthly = 0;
  const categorySpending = {};
  let mostExpensive = null;

  subscriptions.forEach(sub => {
    const monthlyAmount = getMonthlyAmount(sub);
    totalMonthly += monthlyAmount;
    const category = sub.category || 'Uncategorized';
    categorySpending[category] = (categorySpending[category] || 0) + monthlyAmount;
    if (!mostExpensive || Number(sub.amount) > Number(mostExpensive.amount)) {
      mostExpensive = sub;
    }
  });

  const expensiveSubscriptions = subscriptions.filter(sub => Number(sub.amount) > expensiveThreshold);
  const topCategory = Object.keys(categorySpending).reduce((a, b) =>
    categorySpending[a] > categorySpending[b] ? a : b, 'Uncategorized');

  return { totalMonthly, categorySpending, topCategory, mostExpensive, expensiveSubscriptions };
};

const getUpcomingRenewals = (subscriptions) => {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  return subscriptions.filter(sub => {
    if (!sub.next_billing_date) return false;
    const billingDate = new Date(sub.next_billing_date);
    return billingDate >= today && billingDate <= nextWeek;
  });
};

// Local (basic) insights
const generateLocalInsights = (subscriptions) => {
  const insights = [];
  const currency = subscriptions[0]?.currency || 'NGN';

  if (subscriptions.length === 0) {
    return [{
      id: 'welcome',
      type: 'suggestion',
      title: '👋 Welcome to Suba!',
      message: 'Add your first subscription to start getting personalized insights and savings recommendations',
      icon: 'rocket-outline',
      priority: 'medium',
      source: 'local'
    }];
  }

  const metrics = calculateSubscriptionMetrics(subscriptions);

  let spendingContext = '';
  if (metrics.totalMonthly > (currency === 'NGN' ? 20000 : 100)) {
    spendingContext = ' - Consider reviewing your high-value subscriptions';
  } else if (metrics.totalMonthly < (currency === 'NGN' ? 5000 : 25)) {
    spendingContext = ' - Great job managing your subscription costs!';
  }

  insights.push({
    id: 'local-spending',
    type: 'overview',
    title: '💰 Monthly Spending',
    message: `You're spending ${formatCurrency(metrics.totalMonthly, currency)} monthly${spendingContext}`,
    icon: 'analytics-outline',
    priority: 'high',
    source: 'local'
  });

  if (metrics.mostExpensive) {
    const expensiveRatio = metrics.totalMonthly ? Number(metrics.mostExpensive.amount) / metrics.totalMonthly : 0;
    let expensiveTip = '';
    if (expensiveRatio > 0.5) expensiveTip = 'This is over 50% of your total spending - consider alternatives';
    else if (expensiveRatio > 0.3) expensiveTip = 'This is a significant portion of your budget';

    insights.push({
      id: 'local-expensive',
      type: 'expensive',
      title: '🏆 Top Subscription',
      message: `${metrics.mostExpensive.name} costs ${formatCurrency(metrics.mostExpensive.amount, currency)}${expensiveTip ? ` - ${expensiveTip}` : ''}`,
      icon: 'trending-up-outline',
      priority: 'high',
      source: 'local'
    });
  }

  if (metrics.topCategory && metrics.categorySpending[metrics.topCategory] > metrics.totalMonthly * 0.4) {
    const categoryPercent = Math.round((metrics.categorySpending[metrics.topCategory] / metrics.totalMonthly) * 100);
    insights.push({
      id: 'local-category',
      type: 'category',
      title: '🎯 Spending Focus',
      message: `${categoryPercent}% of your budget goes to ${metrics.topCategory} services. Look for bundle deals or family plans.`,
      icon: 'pricetags-outline',
      priority: 'medium',
      source: 'local'
    });
  }

  const upcomingRenewals = getUpcomingRenewals(subscriptions);
  if (upcomingRenewals.length > 0) {
    insights.push({
      id: 'local-renewals',
      type: 'alert',
      title: '⏰ Renewals Due',
      message: `${upcomingRenewals.length} subscription${upcomingRenewals.length > 1 ? 's' : ''} renewing this week. Review before auto-renewal.`,
      icon: 'calendar-outline',
      priority: 'high',
      source: 'local'
    });
  }

  if (metrics.expensiveSubscriptions.length > 1) {
    const potentialMonthlySavings = metrics.expensiveSubscriptions.reduce((sum, sub) => {
      const monthlyAmount = getMonthlyAmount(sub);
      return sum + (monthlyAmount * 0.2);
    }, 0);

    insights.push({
      id: 'local-savings',
      type: 'savings',
      title: '💡 Savings Opportunity',
      message: `You could save ~${formatCurrency(potentialMonthlySavings, currency)}/month by optimizing your ${metrics.expensiveSubscriptions.length} premium subscriptions`,
      icon: 'cash-outline',
      priority: 'medium',
      source: 'local'
    });
  }

  const freeTrials = subscriptions.filter(sub =>
    sub.name.toLowerCase().includes('trial') ||
    Number(sub.amount) === 0 ||
    (sub.name.toLowerCase().includes('free') && Number(sub.amount) < (currency === 'NGN' ? 100 : 1))
  );

  if (freeTrials.length > 0) {
    insights.push({
      id: 'local-trials',
      type: 'trial',
      title: '🎁 Active Trials',
      message: `You have ${freeTrials.length} free trial${freeTrials.length > 1 ? 's' : ''}. Set reminders to cancel before conversion.`,
      icon: 'gift-outline',
      priority: 'high',
      source: 'local'
    });
  }

  let countContext = '';
  if (subscriptions.length > 8) countContext = ' - Consider consolidating or removing unused services';
  else if (subscriptions.length < 3) countContext = ' - You have room to add services you need';

  insights.push({
    id: 'local-count',
    type: 'count',
    title: '📊 Subscription Count',
    message: `You have ${subscriptions.length} active subscriptions${countContext}`,
    icon: 'list-outline',
    priority: 'low',
    source: 'local'
  });

  return insights.sort((a, b) => {
    const priorityOrder = { high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

// Safe converter
const convertAIInsights = (aiInsights) => {
  const list = Array.isArray(aiInsights) ? aiInsights : [];
  return list.map(insight => ({
    id: `ai-${insight.id}`,
    type: insight.type,
    title: getAITitle(insight.type),
    message: insight.message,
    icon: getAIIcon(insight.type),
    priority: getAIPriority(insight.type),
    source: 'ai',
    aiData: insight
  }));
};

const getAITitle = (type) => {
  switch (type) {
    case 'cost_saving_tip': return '💡 Cost Saving Tip';
    case 'overlap_detected': return '⚠️ Overlap Detected';
    case 'alert': return '🚨 Important Alert';
    case 'suggestion': return '💭 Smart Suggestion';
    default: return '🤖 AI Insight';
  }
};

const getAIIcon = (type) => {
  switch (type) {
    case 'cost_saving_tip': return 'cash-outline';
    case 'overlap_detected': return 'warning-outline';
    case 'alert': return 'alert-circle-outline';
    case 'suggestion': return 'bulb-outline';
    default: return 'analytics-outline';
  }
};

const getAIPriority = (type) => {
  switch (type) {
    case 'cost_saving_tip': return 'high';
    case 'alert': return 'high';
    case 'overlap_detected': return 'medium';
    case 'suggestion': return 'medium';
    default: return 'low';
  }
};

export default function InsightsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [localInsights, setLocalInsights] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useContext(AuthContext);

  const loadData = useCallback(async () => {
    try {
      const data = await getSubscriptions();
      setSubscriptions(data || []);

      const basic = generateLocalInsights(data || []);
      setLocalInsights(basic);

      // Force fresh fetch from backend (bypass cache)
      const aiData = await getAIInsights({ forceRefresh: true });
      console.log('AI DEBUG => insights length:', Array.isArray(aiData) ? aiData.length : 0);
      const converted = convertAIInsights(aiData);
      setAiInsights(converted);
    } catch (error) {
      console.error("Error loading insights:", error);
      Alert.alert("Error", "Failed to load insights");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await refreshAIInsights(); // clear cache + fetch fresh once next call
      await loadData();
    } catch (e) {
      setRefreshing(false);
    }
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInsightAction = (insight) => {
    if (insight.source === 'ai') {
      switch (insight.type) {
        case 'cost_saving_tip':
        case 'suggestion':
          Alert.alert(insight.title, insight.message, [
            { text: 'OK' },
            { text: 'Mark as Resolved', onPress: () => handleResolveAIInsight(insight) }
          ]);
          break;
        case 'overlap_detected':
          navigation.navigate('Subscriptions', { filter: 'similar' });
          break;
        default:
          Alert.alert(insight.title, insight.message);
      }
    } else {
      switch (insight.type) {
        case 'savings':
          navigation.navigate('Subscriptions', { filter: 'expensive' });
          break;
        case 'expensive': {
          const mostExpensive = subscriptions.reduce((max, sub) =>
            Number(sub.amount) > Number(max.amount) ? sub : max
          , subscriptions[0]);
          if (mostExpensive) {
            navigation.navigate('SubscriptionDetails', { subscription: mostExpensive });
          }
          break;
        }
        case 'renewals':
          navigation.navigate('Subscriptions', { filter: 'due_soon' });
          break;
        case 'trials': {
          const trials = subscriptions.filter(sub =>
            sub.name.toLowerCase().includes('trial') || Number(sub.amount) === 0
          );
          if (trials.length > 0) {
            navigation.navigate('SubscriptionDetails', { subscription: trials[0] });
          }
          break;
        }
        default:
          Alert.alert(insight.title, insight.message);
      }
    }
  };

  const handleResolveAIInsight = async (insight) => {
    try {
      const originalId = String(insight.id).replace('ai-', '');
      await markInsightAsResolved(originalId);
      setAiInsights(prev => prev.filter(i => i.id !== insight.id));
      Alert.alert("Resolved", "AI insight marked as resolved");
    } catch (error) {
      console.error('Error resolving AI insight:', error);
      Alert.alert("Error", "Failed to resolve insight");
    }
  };

  const filteredInsights = () => {
    switch (activeTab) {
      case 'ai':
        return aiInsights;
      case 'local':
        return localInsights;
      default:
        return [...aiInsights, ...localInsights].sort((a, b) => {
          const order = { high: 1, medium: 2, low: 3 };
          return order[a.priority] - order[b.priority];
        });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B5FFF" />
        <Text style={styles.loadingText}>Analyzing your subscriptions...</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
      </TouchableOpacity>
      <Text style={styles.title}>Smart Insights</Text>
      <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
        <Ionicons name="refresh" size={24} color="#4B5FFF" />
      </TouchableOpacity>
    </View>
  );

  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        onPress={() => setActiveTab('all')}
      >
        <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
          All Insights ({aiInsights.length + localInsights.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
        onPress={() => setActiveTab('ai')}
      >
        <Ionicons name="sparkles" size={16} color={activeTab === 'ai' ? '#4B5FFF' : '#6B7280'} />
        <Text style={[styles.tabText, activeTab === 'ai' && styles.activeTabText]}>
          AI ({aiInsights.length})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'local' && styles.activeTab]}
        onPress={() => setActiveTab('local')}
      >
        <Text style={[styles.tabText, activeTab === 'local' && styles.activeTabText]}>
          Basic ({localInsights.length})
        </Text>
      </TouchableOpacity>
    </View>
  );

  const metrics = calculateSubscriptionMetrics(subscriptions);
  const currency = subscriptions[0]?.currency || 'NGN';
  const totalYearly = metrics.totalMonthly * 12;

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <LinearGradient colors={['#6D7BFF', '#A46BFF']} style={styles.statsCard} start={[0, 0]} end={[1, 0]}>
        <View style={styles.statItem}>
          <Ionicons name="stats-chart" size={20} color="#fff" />
          <Text style={styles.statValue}>{subscriptions.length}</Text>
          <Text style={styles.statLabel}>Subscriptions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="wallet" size={20} color="#fff" />
          <Text style={styles.statValue}>{formatCurrency(metrics.totalMonthly, currency)}</Text>
          <Text style={styles.statLabel}>Monthly</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="analytics" size={20} color="#fff" />
          <Text style={styles.statValue}>{formatCurrency(totalYearly, currency)}</Text>
          <Text style={styles.statLabel}>Yearly</Text>
        </View>
      </LinearGradient>

      <View style={styles.insightsSummary}>
        <View style={styles.summaryItem}>
          <Ionicons name="flash" size={16} color="#EF4444" />
          <Text style={styles.summaryText}>
            {localInsights.filter(i => i.priority === 'high').length} High Priority
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="sparkles" size={16} color="#4B5FFF" />
          <Text style={styles.summaryText}>{aiInsights.length} AI Insights</Text>
        </View>
      </View>
    </View>
  );

  const renderInsightItem = ({ item }) => (
    <SmartAssistantCard
      title={item.title}
      message={item.message}
      icon={item.icon}
      onDetails={() => handleInsightAction(item)}
      onDismiss={() => {
        if (String(item.id).startsWith('ai-')) {
          handleResolveAIInsight(item);
        } else {
          setLocalInsights(prev => prev.filter(x => x.id !== item.id));
          Alert.alert('Dismissed', 'Insight will be hidden');
        }
      }}
      isAI={item.source === 'ai'}
      confidence={item.aiData?.confidence_score}
      priority={item.priority}
    />
  );

  const currentInsights = filteredInsights();

  return (
    <View style={styles.container}>
      {renderHeader()}
      {currentInsights.length > 0 || (activeTab === 'all' && localInsights.length > 0) ? (
        <FlatList
          data={currentInsights}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderInsightItem}
          ListHeaderComponent={
            <>
              {renderStats()}
              {renderTabBar()}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {activeTab === 'ai' ? 'AI-Powered Insights' :
                   activeTab === 'local' ? 'Basic Insights' : 'All Insights'}
                  {' '}({currentInsights.length})
                </Text>
                <Text style={styles.sectionDescription}>
                  {activeTab === 'ai' ? 'Advanced analysis using AI technology' :
                   activeTab === 'local' ? 'Smart analytics based on your subscription patterns' :
                   'Complete insights combining AI and smart analytics'}
                </Text>
              </View>
            </>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {renderStats()}
          {renderTabBar()}
          <View style={styles.emptyState}>
            <Ionicons name={activeTab === 'ai' ? 'sparkles' : 'bulb-outline'} size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateTitle}>
              {activeTab === 'ai' ? 'No AI insights yet' :
               subscriptions.length === 0 ? 'No subscriptions yet' : 'No insights yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'ai'
                ? 'AI insights will appear after generation succeeds.'
                : subscriptions.length === 0
                ? 'Add your first subscription to get personalized insights'
                : 'Keep using the app to unlock more insights'}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// styles unchanged from your file…
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, color: '#6B7280', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: '#EEF2FF' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  refreshButton: { padding: 8, borderRadius: 12, backgroundColor: '#EEF2FF' },
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  activeTab: { backgroundColor: '#4B5FFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#fff' },
  statsContainer: { padding: 20, paddingBottom: 0 },
  statsCard: { borderRadius: 20, padding: 20, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4, marginBottom: 16 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#fff', marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '600', textAlign: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255, 255, 255, 0.3)' },
  insightsSummary: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', padding: 12, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  sectionHeader: { padding: 20, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  sectionDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  listContent: { paddingBottom: 20 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#fff', margin: 20, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
});
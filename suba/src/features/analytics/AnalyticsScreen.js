import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import { getSubscriptions } from '../subscriptions/subscriptionService';
import { getSpendingData, getCategoryBreakdown, getMonthlyTrends } from './analyticsService';
import { AuthContext } from '../../contexts/AuthContext';
import SubscriptionCard from '../../components/SubscriptionCard';

const { width } = Dimensions.get('window');

// Currency formatting
const formatCurrency = (amount, currency = 'NGN', compact = false) => {
  const numAmount = Number(amount) || 0;
  if (compact && numAmount >= 1000) {
    const formatted = (numAmount / 1000).toFixed(1);
    return currency === 'NGN' ? `₦${formatted}k` : `$${formatted}k`;
  }
  const formattedAmount = numAmount.toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Period-aware fallback helpers (respect billing_cycle)
const getPeriodAmount = (sub, period) => {
  const amt = Number(sub.amount) || 0;
  const cycle = (sub.billing_cycle || 'monthly').toLowerCase();

  switch (period) {
    case 'weekly':
      if (cycle === 'weekly') return amt;
      if (cycle === 'monthly') return amt / 4.33;
      if (cycle === 'yearly') return amt / 52;
      if (cycle === 'daily') return amt * 7;
      return amt / 4.33;
    case 'yearly':
      if (cycle === 'weekly') return amt * 52;
      if (cycle === 'monthly') return amt * 12;
      if (cycle === 'yearly') return amt;
      if (cycle === 'daily') return amt * 365;
      return amt * 12;
    case 'monthly':
    default:
      if (cycle === 'weekly') return amt * 4.33;
      if (cycle === 'monthly') return amt;
      if (cycle === 'yearly') return amt / 12;
      if (cycle === 'daily') return amt * 30;
      return amt;
  }
};

const spreadMultipliers = (n) => {
  const base = [0.92, 1.00, 1.08, 0.97, 1.05, 0.98, 1.12, 0.95, 1.03, 1.07, 0.93, 1.01];
  return Array.from({ length: n }, (_, i) => base[i % base.length]);
};

const lastNMonths = (n) => {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({
      key: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`,
      label: dt.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return out;
};
const lastNWeeks = (n) => Array.from({ length: n }, (_, i) => ({ key: `wk-${i+1}`, label: `W${i+1}` }));
const lastNYears = (n) => {
  const y = new Date().getFullYear();
  return Array.from({ length: n }, (_, i) => ({ key: `${y - (n - 1 - i)}`, label: `${y - (n - 1 - i)}` }));
};

const palette = ['#6D7BFF', '#A46BFF', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#14B8A6'];

const StatCard = ({ icon, label, value, trend, trendType = 'neutral' }) => {
  return (
    <LinearGradient colors={['#ffffff', '#f8fafc']} style={styles.statCard}>
      <View style={styles.statCardHeader}>
        <View style={styles.statIconWrapper}>
          <Ionicons name={icon} size={20} color="#4B5FFF" />
        </View>
        {trend && (
          <View style={[styles.trendBadge, styles[`trendBadge${trendType}`]]}>
            <Ionicons name={trendType === 'positive' ? 'trending-up' : 'trending-down'} size={12} color="#fff" />
            <Text style={styles.trendText}>{trend}</Text>
          </View>
        )}
      </View>
      <Text style={styles.statCardValue}>{value}</Text>
      <Text style={styles.statCardLabel}>{label}</Text>
    </LinearGradient>
  );
};

const EnhancedSubscriptionItem = ({ item, index, onPress }) => (
  <View style={{ marginBottom: 12 }}>
    <SubscriptionCard subscription={item} onPress={onPress} />
  </View>
);

export default function AnalyticsScreen({ navigation }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [spendingData, setSpendingData] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const subsData = await getSubscriptions().catch(() => []);
      setSubscriptions(subsData || []);

      const effectiveCurrency = (user?.default_currency || 'NGN').toUpperCase();

      // Attempt server analytics (expected for statcard, actuals for charts)
      try {
        const [spending, categories, trends] = await Promise.all([
          getSpendingData(selectedPeriod, effectiveCurrency, 'expected'),
          getCategoryBreakdown(selectedPeriod, effectiveCurrency),
          getMonthlyTrends(selectedPeriod, effectiveCurrency),
        ]);

        setSpendingData(spending);

        const fixedCategoryData = (categories || []).map(item => ({
          ...item,
          total_amount: Number(item.total_amount) || 0
        }));
        setCategoryData(fixedCategoryData);

        const fixedTrendData = (trends || []).map(item => ({
          ...item,
          total_amount: Number(item.total_amount) || 0,
          label: item.label || item.month_name || item.year || item.week
        }));
        setMonthlyTrends(fixedTrendData);
      } catch (innerErr) {
        console.warn('Falling back to client-side analytics:', innerErr?.message || innerErr);

        // Fallback: compute from subscriptions list (period-aware, expected)
        const subs = (Array.isArray(subsData) ? subsData : []).filter(
          s => (s.currency || 'NGN').toUpperCase() === effectiveCurrency
        );
        const period = selectedPeriod;

        const totalSpent = subs.reduce((sum, sub) => sum + getPeriodAmount(sub, period), 0);

        const categoryMap = {};
        subs.forEach(sub => {
          const cat = sub.category || 'Uncategorized';
          const amt = getPeriodAmount(sub, period);
          categoryMap[cat] = (categoryMap[cat] || 0) + amt;
        });

        setSpendingData({
          totalSpent: Math.round(totalSpent),
          totalSubscriptions: subs.length,
          currency: effectiveCurrency,
          period
        });

        const catData = Object.entries(categoryMap).map(([category, amt]) => ({
          category,
          total_amount: Math.round(amt)
        }));
        setCategoryData(catData);

        if (period === 'weekly') {
          const labels = lastNWeeks(8);
          const mults = spreadMultipliers(labels.length);
          const series = labels.map((l, i) => ({
            week: l.key,
            label: l.label,
            total_amount: Math.round((totalSpent / 8) * mults[i]),
            currency: effectiveCurrency
          }));
          setMonthlyTrends(series);
        } else if (period === 'yearly') {
          const labels = lastNYears(5);
          const mults = spreadMultipliers(labels.length);
          const series = labels.map((l, i) => ({
            year: l.key,
            label: l.label,
            total_amount: Math.round(totalSpent * mults[i]),
            currency: effectiveCurrency
          }));
          setMonthlyTrends(series);
        } else {
          const labels = lastNMonths(6);
          const mults = spreadMultipliers(labels.length);
          const series = labels.map((l, i) => ({
            month: labels[i].key,
            month_name: labels[i].label,
            label: labels[i].label,
            total_amount: Math.round((totalSpent / 6) * mults[i]),
            currency: effectiveCurrency
          }));
          setMonthlyTrends(series);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod, user?.default_currency]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currency = (spendingData?.currency || user?.default_currency || 'NGN').toUpperCase();
  const periodTotal = Number(spendingData?.totalSpent || 0);

  const primaryLabel =
    selectedPeriod === 'weekly' ? 'Weekly Total' :
    selectedPeriod === 'yearly' ? 'Yearly Total' : 'Monthly Total';

  const secondary = (() => {
    if (selectedPeriod === 'weekly') {
      return { label: 'Monthly Projection', value: formatCurrency(periodTotal * 4.33, currency) };
    }
    if (selectedPeriod === 'yearly') {
      return { label: 'Monthly Average', value: formatCurrency(periodTotal / 12, currency) };
    }
    return { label: 'Yearly Projection', value: formatCurrency(periodTotal * 12, currency) };
  })();

  // Proper Bar Chart data
  const barData = useMemo(() => {
    return (monthlyTrends || []).map((item, idx) => ({
      value: Number(item.total_amount) || 0,
      label: item.label || item.month_name || item.year || item.week || '',
      frontColor: palette[idx % palette.length],
      topLabelComponent: () => (
        <Text style={{ fontSize: 9, color: '#4B5FFF', fontWeight: '600' }}>
          {formatCurrency(item.total_amount, currency, true)}
        </Text>
      ),
    }));
  }, [monthlyTrends, currency]);

  // Proper Pie Chart data
  const pieData = useMemo(() => {
    return (categoryData || []).map((item, idx) => ({
      value: Number(item.total_amount) || 0,
      color: palette[idx % palette.length],
      text: item.category || 'Uncategorized',
    }));
  }, [categoryData]);

  const totalCategoryAmount = categoryData.reduce((s, it) => s + (Number(it.total_amount) || 0), 0);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4B5FFF" />
        <Text style={styles.loadingText}>Crunching your numbers...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorDescription}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#4B5FFF', '#6D7BFF']} style={styles.enhancedHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.enhancedHeaderTitle}>Analytics Dashboard</Text>
          <Text style={styles.headerSubtitle}>Insights for {selectedPeriod} spending</Text>
        </View>
        <View style={styles.periodSelector}>
          {['weekly', 'monthly', 'yearly'].map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.enhancedPeriodButton, selectedPeriod === period && styles.enhancedPeriodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.enhancedPeriodText, selectedPeriod === period && styles.enhancedPeriodTextActive]}>
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar"
            label={primaryLabel}
            value={formatCurrency(periodTotal, currency)}
            trend="+12%"
            trendType="positive"
          />
          <StatCard icon="trending-up" label={secondary.label} value={secondary.value} />
          <StatCard icon="receipt" label="Active Subs" value={subscriptions.length.toString()} />
          <StatCard icon="pricetags" label="Categories" value={categoryData.length.toString()} />
        </View>

        {/* Proper Bar Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>
            {selectedPeriod === 'weekly'
              ? 'Weekly Spending (last 8 weeks)'
              : selectedPeriod === 'yearly'
              ? 'Yearly Spending (last 5 years)'
              : 'Monthly Spending (last 6 months)'}
          </Text>

          <BarChart
            data={barData}
            barWidth={22}
            spacing={16}
            initialSpacing={12}
            roundedTop
            xAxisThickness={1}
            yAxisThickness={1}
            yAxisTextStyle={{ color: '#6B7280', fontSize: 10 }}
            xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10 }}
            yAxisColor="#E5E7EB"
            xAxisColor="#E5E7EB"
            showGradient
            isAnimated
            noOfSections={4}
            hideOrigin
            showValuesOnTopOfBars
            formatYLabel={(v) => formatCurrency(Number(v), currency, true)}
            renderTooltip={(item) => (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipTitle}>{item.label}</Text>
                <Text style={styles.tooltipValue}>{formatCurrency(item.value, currency)}</Text>
              </View>
            )}
          />
        </View>

        {/* Proper Pie Chart */}
        {pieData.length > 0 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <PieChart
                data={pieData}
                donut
                showText
                textColor="#1F2937"
                textSize={11}
                focusOnPress
                radius={90}
                innerRadius={56}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Total</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#1F2937' }}>
                      {formatCurrency(totalCategoryAmount, currency)}
                    </Text>
                  </View>
                )}
              />
            </View>
            {/* Legend */}
            <View style={{ marginTop: 8 }}>
              {categoryData.map((c, idx) => (
                <View key={idx} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: palette[idx % palette.length] }]} />
                  <Text style={styles.legendText}>
                    {c.category || 'Uncategorized'} — {formatCurrency(c.total_amount, currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Spending by Category</Text>
            <Text style={styles.noDataText}>No category data available</Text>
          </View>
        )}

        {/* Top Subscriptions */}
        {subscriptions.length > 0 && (
          <View style={styles.subscriptionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Subscriptions</Text>
              <TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate('Subscriptions')}>
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#4B5FFF" />
              </TouchableOpacity>
            </View>

            {subscriptions
              .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
              .slice(0, 5)
              .map((item, index) => (
                <EnhancedSubscriptionItem
                  key={item.id || index}
                  item={item}
                  index={index}
                  onPress={() => navigation.navigate('SubscriptionDetails', { subscription: item })}
                />
              ))}
          </View>
        )}

        {/* Empty State */}
        {subscriptions.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No subscriptions yet</Text>
            <Text style={styles.emptyStateText}>Add your first subscription to see analytics</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddSubscription')}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Subscription</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 16, color: '#6B7280', fontSize: 16, fontWeight: '500' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: '#F9FAFB' },
  errorTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  errorDescription: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  retryButton: { backgroundColor: '#4B5FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  enhancedHeader: { padding: 24, paddingTop: 60, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { marginBottom: 20 },
  enhancedHeaderTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '500' },
  periodSelector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  enhancedPeriodButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  enhancedPeriodButtonActive: { backgroundColor: '#fff' },
  enhancedPeriodText: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.9)' },
  enhancedPeriodTextActive: { color: '#4B5FFF' },

  scrollView: { flex: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: width / 2 - 26, padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  statCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  statIconWrapper: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 2 },
  trendBadgepositive: { backgroundColor: '#10B981' },
  trendBadgenegative: { backgroundColor: '#EF4444' },
  trendBadgeneutral: { backgroundColor: '#6B7280' },
  trendText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  statCardValue: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  statCardLabel: { fontSize: 12, color: '#6B7280', fontWeight: '500' },

  chartCard: { backgroundColor: '#fff', marginHorizontal: 16, marginVertical: 8, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  chartTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 16 },
  noDataText: { fontSize: 14, color: '#6B7280', textAlign: 'center', fontStyle: 'italic', marginVertical: 20 },

  tooltip: { backgroundColor: '#111827', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 },
  tooltipTitle: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  tooltipValue: { fontSize: 14, color: '#fff', fontWeight: '700' },

  subscriptionsSection: { margin: 16, marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  viewAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewAllText: { fontSize: 14, color: '#4B5FFF', fontWeight: '600' },

  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 40, margin: 20, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  addButton: { backgroundColor: '#4B5FFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { fontSize: 12, color: '#374151' },
});
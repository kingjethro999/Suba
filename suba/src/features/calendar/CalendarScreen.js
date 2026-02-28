// suba-frontend/src/features/calendar/CalendarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getSubscriptions } from '../subscriptions/subscriptionService';

const { width } = Dimensions.get('window');

// Custom Calendar Component
const CustomCalendar = ({ selectedDate, onDateSelect, markedDates }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      
      days.push({
        date: i,
        dateStr,
        hasSubscription: markedDates[dateStr]?.marked || false,
        subscriptionCount: markedDates[dateStr]?.subscriptionCount || 0,
        categoryColors: markedDates[dateStr]?.categoryColors || []
      });
    }

    return days;
  };

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const days = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.calendarContainer}>
      {/* Calendar Header */}
      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={() => navigateMonth(-1)} style={styles.navButton}>
          <Ionicons name="chevron-back" size={20} color="#4B5FFF" />
        </TouchableOpacity>
        
        <Text style={styles.monthName}>{monthName}</Text>
        
        <TouchableOpacity onPress={() => navigateMonth(1)} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={20} color="#4B5FFF" />
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={styles.weekDaysContainer}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {days.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCell,
              day?.dateStr === selectedDate && styles.selectedDay,
              !day && styles.emptyDay
            ]}
            onPress={() => day && onDateSelect(day.dateStr)}
            disabled={!day}
          >
            {day && (
              <>
                <Text style={[
                  styles.dayText,
                  day.dateStr === selectedDate && styles.selectedDayText
                ]}>
                  {day.date}
                </Text>
                {day.hasSubscription && (
                  <View style={styles.subscriptionIndicator}>
                    {day.categoryColors.slice(0, 3).map((color, colorIndex) => (
                      <View 
                        key={colorIndex} 
                        style={[styles.categoryDot, { backgroundColor: color }]}
                      />
                    ))}
                    {day.subscriptionCount > 3 && (
                      <Text style={styles.moreCount}>+{day.subscriptionCount - 3}</Text>
                    )}
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

export default function CalendarScreen({ navigation }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [viewMode, setViewMode] = useState('month');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const subs = await getSubscriptions();
      setSubscriptions(subs || []);
      prepareMarkedDates(subs || []);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Entertainment': '#FF6B6B',
      'TV': '#4ECDC4',
      'Music': '#45B7D1',
      'Software': '#96CEB4',
      'Gaming': '#FFEAA7',
      'Utilities': '#DDA0DD',
      'default': '#4B5FFF'
    };
    return colors[category] || colors.default;
  };

  const prepareMarkedDates = (subs) => {
    const marks = {};
    
    subs.forEach(sub => {
      if (sub.next_billing_date) {
        const dateStr = sub.next_billing_date.split('T')[0];
        if (!marks[dateStr]) {
          marks[dateStr] = {
            marked: true,
            subscriptionCount: 0,
            categoryColors: []
          };
        }
        marks[dateStr].subscriptionCount++;
        marks[dateStr].categoryColors.push(getCategoryColor(sub.category));
      }
    });
    
    setMarkedDates(marks);
  };

  const getSubscriptionsForDate = (date) => {
    return subscriptions.filter(sub => {
      const subDate = sub.next_billing_date?.split('T')[0];
      return subDate === date;
    });
  };

  const getUpcomingRenewals = () => {
    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);
    
    return subscriptions
      .filter(sub => {
        if (!sub.next_billing_date) return false;
        const subDate = new Date(sub.next_billing_date);
        return subDate >= today && subDate <= next30Days;
      })
      .sort((a, b) => new Date(a.next_billing_date) - new Date(b.next_billing_date));
  };

  const formatCurrency = (amount, currency = 'NGN') => {
    return currency === 'NGN' ? `₦${Number(amount).toFixed(2)}` : `$${Number(amount).toFixed(2)}`;
  };

  const selectedDateSubs = getSubscriptionsForDate(selectedDate);
  const upcomingRenewals = getUpcomingRenewals();

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#4B5FFF', '#6D7BFF']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Subscription Calendar</Text>
        <Text style={styles.headerSubtitle}>Track upcoming payments</Text>
        
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'month' && styles.toggleButtonActive]}
            onPress={() => setViewMode('month')}
          >
            <Text style={[styles.toggleText, viewMode === 'month' && styles.toggleTextActive]}>
              Calendar View
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
              Upcoming List
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {viewMode === 'month' ? (
          <>
            {/* Custom Calendar */}
            <CustomCalendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              markedDates={markedDates}
            />

            {/* Selected Date Subscriptions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Subscriptions due on {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              
              {selectedDateSubs.length > 0 ? (
                selectedDateSubs.map((sub, index) => (
                  <TouchableOpacity 
                    key={sub.id || index}
                    style={styles.subscriptionCard}
                    onPress={() => navigation.navigate('SubscriptionDetails', { subscription: sub })}
                  >
                    <View style={[styles.colorDot, { backgroundColor: getCategoryColor(sub.category) }]} />
                    <View style={styles.subscriptionInfo}>
                      <Text style={styles.subscriptionName}>{sub.name}</Text>
                      <Text style={styles.subscriptionAmount}>
                        {formatCurrency(sub.amount, sub.currency)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateText}>No subscriptions due on this date</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          /* List View */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming in Next 30 Days</Text>
            
            {upcomingRenewals.length > 0 ? (
              upcomingRenewals.map((sub, index) => (
                <TouchableOpacity 
                  key={sub.id || index}
                  style={styles.upcomingCard}
                  onPress={() => navigation.navigate('SubscriptionDetails', { subscription: sub })}
                >
                  <View style={[styles.colorDot, { backgroundColor: getCategoryColor(sub.category) }]} />
                  <View style={styles.upcomingInfo}>
                    <Text style={styles.upcomingName}>{sub.name}</Text>
                    <Text style={styles.upcomingDate}>
                      {new Date(sub.next_billing_date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  <Text style={styles.upcomingAmount}>
                    {formatCurrency(sub.amount, sub.currency)}
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyStateText}>No upcoming renewals in the next 30 days</Text>
              </View>
            )}
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{subscriptions.length}</Text>
            <Text style={styles.statLabel}>Total Subs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{upcomingRenewals.length}</Text>
            <Text style={styles.statLabel}>Due Soon</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(
                upcomingRenewals.reduce((total, sub) => total + (Number(sub.amount) || 0), 0)
              )}
            </Text>
            <Text style={styles.statLabel}>Upcoming Total</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  toggleTextActive: {
    color: '#4B5FFF',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    width: 32,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 8,
    margin: 1,
  },
  selectedDay: {
    backgroundColor: '#4B5FFF',
    borderColor: '#4B5FFF',
  },
  emptyDay: {
    backgroundColor: 'transparent',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },
  subscriptionIndicator: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreCount: {
    fontSize: 8,
    color: '#6B7280',
    marginLeft: 2,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  subscriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  subscriptionAmount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  upcomingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  upcomingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  upcomingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5FFF',
    marginRight: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4B5FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
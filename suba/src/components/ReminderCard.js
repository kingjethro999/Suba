import React, { useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PaymentService } from '../services/paymentService';

// Format currency with NGN support
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Format date to show "Due in X days" or "Due today"
const formatDueText = (dateStr) => {
  if (!dateStr) return "Due date unknown";
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0); // Normalize to start of day
  
  const timeDiff = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return "Overdue";
  if (diffDays <= 3) return "Due soon";
  return `Due in ${diffDays} days`;
};

// Get urgency level for styling
const getUrgencyLevel = (dateStr) => {
  if (!dateStr) return 'normal';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dueDate = new Date(dateStr);
  dueDate.setHours(0, 0, 0, 0);
  
  const timeDiff = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'normal';
};

// Normalize image sources (remote URL, {uri}, or local require)
const normalizeImageSource = (src) => {
  if (!src) return null;
  if (typeof src === 'number') return src; // local require(...)
  if (typeof src === 'string') {
    return src.length > 0 ? { uri: src } : null;
  }
  if (typeof src === 'object' && src.uri && typeof src.uri === 'string' && src.uri.length > 0) {
    return { uri: src.uri };
  }
  return null;
};

export default function ReminderCard({
  logo,
  logo_url, // added support for logo_url
  name,
  price,
  dueDate,
  currency = 'NGN',
  onSkip,
  onPayNow,
  subscriptionId,
  billingCycle,
  category,
  navigation,
  onStatusUpdate,
}) {
  const [isSkipped, setIsSkipped] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  const dueText = formatDueText(dueDate);
  const urgencyLevel = getUrgencyLevel(dueDate);
  const isOverdue = urgencyLevel === 'overdue';
  const isDueToday = urgencyLevel === 'today';
  const isDueSoon = urgencyLevel === 'soon';

  // Prefer logo_url (new schema), fallback to legacy logo
  const imageSource = useMemo(() => normalizeImageSource(logo_url || logo), [logo_url, logo]);

  // Handle skip with API call
  const handleSkip = async () => {
    Alert.alert(
      "Remind Later",
      `Skip reminder for ${name}? You'll be reminded again tomorrow.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Skip", 
          onPress: async () => {
            setIsLoading(true);
            try {
              const result = await PaymentService.skipReminder(subscriptionId);
              
              if (result.success) {
                setIsSkipped(true);
                if (onSkip) onSkip();
                
                // Auto-reset after 2 seconds
                setTimeout(() => {
                  setIsSkipped(false);
                  if (onStatusUpdate) onStatusUpdate(); // Refresh parent
                }, 2000);
              } else {
                Alert.alert("Error", result.error);
              }
            } catch (error) {
              Alert.alert("Error", "Failed to skip reminder");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle payment with navigation to payment options
  const handlePayNow = () => {
    if (navigation) {
      // Navigate to payment options screen with subscription data
      PaymentService.openPaymentPage(name, navigation, {
        subscriptionId,
        amount: price,
        currency,
        billingCycle
      });
    } else {
      // Fallback to API call if no navigation
      Alert.alert(
        "Mark as Paid",
        `Mark ${name} as paid for ${formatCurrency(price, currency)}?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Mark Paid", 
            onPress: async () => {
              setIsLoading(true);
              try {
                const result = await PaymentService.markAsPaid(subscriptionId, {
                  amount: price,
                  method: 'manual'
                });
                
                if (result.success) {
                  setIsPaid(true);
                  if (onPayNow) onPayNow();
                  
                  setTimeout(() => {
                    setIsPaid(false);
                    if (onStatusUpdate) onStatusUpdate(); // Refresh parent
                  }, 2000);
                } else {
                  Alert.alert("Error", result.error);
                }
              } catch (error) {
                Alert.alert("Error", "Failed to mark as paid");
              } finally {
                setIsLoading(false);
              }
            }
          }
        ]
      );
    }
  };

  // Get urgency colors
  const getUrgencyColors = () => {
    switch (urgencyLevel) {
      case 'overdue':
        return ['#EF4444', '#DC2626'];
      case 'today':
        return ['#F59E0B', '#D97706'];
      case 'soon':
        return ['#8B5CF6', '#7C3AED'];
      default:
        return ['#6D7BFF', '#A46BFF'];
    }
  };

  // Get urgency icon
  const getUrgencyIcon = () => {
    switch (urgencyLevel) {
      case 'overdue':
        return { name: "warning", color: "#EF4444" };
      case 'today':
        return { name: "alert-circle", color: "#F59E0B" };
      case 'soon':
        return { name: "time", color: "#8B5CF6" };
      default:
        return { name: "calendar", color: "#6B7280" };
    }
  };

  // Get card border color
  const getCardBorderColor = () => {
    switch (urgencyLevel) {
      case 'overdue':
        return '#FECACA';
      case 'today':
        return '#FDE68A';
      case 'soon':
        return '#E9D5FF';
      default:
        return '#E5E7EB';
    }
  };

  if (isSkipped) {
    return (
      <View style={[styles.card, styles.skippedCard]}>
        <View style={styles.skippedContent}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <Text style={styles.skippedText}>Reminder skipped for {name}</Text>
        </View>
      </View>
    );
  }

  if (isPaid) {
    return (
      <View style={[styles.card, styles.paidCard]}>
        <View style={styles.paidContent}>
          <Ionicons name="checkmark-done-circle" size={24} color="#10B981" />
          <Text style={styles.paidText}>{name} marked as paid</Text>
        </View>
      </View>
    );
  }

  const urgencyIcon = getUrgencyIcon();
  const gradientColors = getUrgencyColors();
  const cardBorderColor = getCardBorderColor();

  return (
    <View style={[styles.card, { borderLeftColor: cardBorderColor }]}>
      {/* Header with urgency indicator */}
      <View style={styles.header}>
        <View style={styles.urgencyIndicator}>
          <Ionicons name={urgencyIcon.name} size={12} color={urgencyIcon.color} />
          <Text style={[styles.urgencyText, { color: urgencyIcon.color }]}>
            {urgencyLevel.toUpperCase()}
          </Text>
        </View>
        {billingCycle && (
          <Text style={styles.billingCycle}>
            {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
          </Text>
        )}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo and Basic Info */}
        <View style={styles.leftSection}>
          {imageSource && !imgError ? (
            <Image
              source={imageSource}
              style={styles.logo}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Text style={styles.logoPlaceholderText}>
                {name?.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.info}>
            <Text style={styles.name}>{name}</Text>
            <View style={styles.detailsRow}>
              {category && (
                <View style={styles.categoryTag}>
                  <Ionicons name="pricetag" size={10} color="#6B7280" />
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              )}
              <View style={styles.dueRow}>
                <Ionicons name={urgencyIcon.name} size={12} color={urgencyIcon.color} />
                <Text style={[
                  styles.due, 
                  isOverdue && styles.overdue,
                  isDueToday && styles.dueToday,
                  isDueSoon && styles.dueSoon
                ]}>
                  {dueText}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Price Section */}
        <View style={styles.priceSection}>
          <Text style={styles.price}>{formatCurrency(price, currency)}</Text>
          <Text style={styles.billingText}>per {billingCycle || 'month'}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.skipBtn, isLoading && styles.disabledBtn]} 
          onPress={handleSkip}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications-off" size={16} color="#6B7280" />
          <Text style={styles.skipText}>
            {isLoading ? 'Processing...' : 'Remind later'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.payBtn} 
          onPress={handlePayNow}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={gradientColors}
            start={[0, 0]}
            end={[1, 0]}
            style={[styles.payGradient, isLoading && styles.disabledGradient]}
          >
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.payText}>
              {isLoading ? 'Processing...' : (isOverdue ? 'Pay now' : 'Mark paid')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Quick Actions Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerAction}>
          <Ionicons name="calendar" size={14} color="#6B7280" />
          <Text style={styles.footerText}>Reschedule</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.footerAction}>
          <Ionicons name="card" size={14} color="#6B7280" />
          <Text style={styles.footerText}>Payment method</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.footerAction}>
          <Ionicons name="information-circle" size={14} color="#6B7280" />
          <Text style={styles.footerText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  urgencyIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  billingCycle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    resizeMode: 'cover',
    marginRight: 12,
  },
  logoPlaceholder: {
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5FFF',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  due: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  overdue: {
    color: '#EF4444',
    fontWeight: '600',
  },
  dueToday: {
    color: '#F59E0B',
    fontWeight: '600',
  },
  dueSoon: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  billingText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  skipBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  skipText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  payBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  payGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    borderRadius: 12,
  },
  payText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  skippedCard: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
  },
  skippedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  skippedText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 14,
  },
  paidCard: {
    backgroundColor: '#F0FDF4',
    borderLeftColor: '#10B981',
  },
  paidContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  paidText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  disabledGradient: {
    opacity: 0.8,
  },
});
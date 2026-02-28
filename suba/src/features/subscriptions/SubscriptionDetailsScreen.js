// suba-frontend/src/features/subscriptions/SubscriptionDetailsScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Share,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LogoService from '../../services/LogoService';
import { 
  markSubscriptionAsPaid, 
  cancelSubscription, 
  getSubscriptionPayments, 
  skipSubscriptionReminder,
  deleteSubscription // ← added
} from './subscriptionService';
import { PaymentService } from '../../services/paymentService';

export default function SubscriptionDetailsScreen({ route, navigation }) {
  const { subscription } = route.params || {};
  const [serviceLogo, setServiceLogo] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [deleting, setDeleting] = useState(false); // ← added

  // Load service logo and payment history
  React.useEffect(() => {
    if (subscription?.id) {
      loadServiceLogo();
      loadPaymentHistory();
    }
  }, [subscription]);

  const loadServiceLogo = async () => {
    try {
      const logo = await LogoService.getLogoForSubscription(subscription.name);
      setServiceLogo(logo);
    } catch (error) {
      console.error('Error loading service logo:', error);
    }
  };

  const loadPaymentHistory = async () => {
    try {
      setLoadingPayments(true);
      const payments = await getSubscriptionPayments(subscription.id);
      setPaymentHistory(payments);
    } catch (error) {
      console.error('Error loading payment history:', error);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'NGN') => {
    if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
    const formattedAmount = Number(amount).toFixed(2);
    return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format short date
  const formatShortDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days until next billing
  const getDaysUntilBilling = () => {
    if (!subscription?.next_billing_date || subscription.status !== 'active') return null;
    
    const today = new Date();
    const nextBilling = new Date(subscription.next_billing_date);
    const timeDiff = nextBilling.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    return daysUntilDue;
  };

  // Get billing cycle display text
  const getBillingCycleText = (cycle) => {
    switch (cycle) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'Monthly';
    }
  };

  // Get status display
  const getStatusDisplay = (status) => {
    switch (status) {
      case 'active': return { text: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
      case 'cancelled': return { text: 'Cancelled', color: '#EF4444', bgColor: '#FEE2E2' };
      case 'paused': return { text: 'Paused', color: '#F59E0B', bgColor: '#FEF3C7' };
      default: return { text: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
    }
  };

  // Get urgency color based on days until billing
  const getUrgencyColor = (days) => {
    if (days < 0) return '#EF4444'; // Red for overdue
    if (days <= 3) return '#F59E0B'; // Amber for warning
    return '#10B981'; // Green for safe
  };

  // Handle mark as paid with payment options
  const handleMarkAsPaid = () => {
    if (navigation) {
      PaymentService.openPaymentPage(subscription.name, navigation, {
        subscriptionId: subscription.id,
        amount: subscription.amount,
        currency: subscription.currency,
        billingCycle: subscription.billing_cycle
      });
    } else {
      Alert.alert(
        'Mark as Paid',
        `Mark ${subscription.name} as paid for ${formatCurrency(subscription.amount, subscription.currency)}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Mark Paid', 
            onPress: async () => {
              try {
                await markSubscriptionAsPaid(subscription.id, {
                  amount: subscription.amount,
                  method: 'manual'
                });
                Alert.alert('Success', 'Payment recorded successfully!');
                loadPaymentHistory();
              } catch (error) {
                Alert.alert('Error', 'Failed to mark as paid. Please try again.');
              }
            }
          }
        ]
      );
    }
  };

  // Handle skip reminder
  const handleSkipReminder = () => {
    Alert.alert(
      'Skip Reminder',
      'How long would you like to skip the reminder for?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: '1 Day', 
          onPress: async () => {
            try {
              await skipSubscriptionReminder(subscription.id, '1 day');
              Alert.alert('Success', 'Reminder skipped for 1 day');
            } catch (error) {
              Alert.alert('Error', 'Failed to skip reminder. Please try again.');
            }
          }
        },
        { 
          text: '3 Days', 
          onPress: async () => {
            try {
              await skipSubscriptionReminder(subscription.id, '3 days');
              Alert.alert('Success', 'Reminder skipped for 3 days');
            } catch (error) {
              Alert.alert('Error', 'Failed to skip reminder. Please try again.');
            }
          }
        },
        { 
          text: '1 Week', 
          onPress: async () => {
            try {
              await skipSubscriptionReminder(subscription.id, '1 week');
              Alert.alert('Success', 'Reminder skipped for 1 week');
            } catch (error) {
              Alert.alert('Error', 'Failed to skip reminder. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Handle cancel subscription
  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your ${subscription.name} subscription?`,
      [
        { text: 'Keep Subscription', style: 'cancel' },
        { 
          text: 'Cancel Subscription', 
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription(subscription.id);
              Alert.alert('Cancelled', 'Subscription has been cancelled');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Share subscription details
  const handleShare = async () => {
    try {
      const message = `💳 ${subscription.name} Subscription\n` +
        `Amount: ${formatCurrency(subscription.amount, subscription.currency)}\n` +
        `Billing: ${getBillingCycleText(subscription.billing_cycle)}\n` +
        `Status: ${getStatusDisplay(subscription.status).text}\n` +
        `Next Payment: ${formatDate(subscription.next_billing_date)}\n` +
        `Category: ${subscription.category || 'General'}`;
      
      await Share.share({
        message,
        title: `${subscription.name} Subscription Details`
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Handle edit subscription
  const handleEdit = () => {
    navigation.navigate('EditSubscriptionScreen', { 
      subscription,
      refreshSubscriptions: () => {} // You can pass a refresh function if needed
    });
  };

  // Handle delete subscription (calls API)
  const handleDelete = () => {
    Alert.alert(
      'Delete Subscription',
      `Are you sure you want to permanently delete your ${subscription.name} subscription? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteSubscription(subscription.id);

              // If parent/list passed a refresh callback, call it
              const onDeleted = route.params?.onDeleted || route.params?.refreshSubscriptions;
              if (onDeleted) {
                try {
                  onDeleted(subscription.id);
                } catch (e) {
                  console.warn('onDeleted callback threw an error:', e);
                }
              }

              Alert.alert('Deleted', 'Subscription has been deleted');
              navigation.goBack();
            } catch (error) {
              console.error('Delete failed:', error);
              Alert.alert('Error', error.message || 'Failed to delete subscription. Please try again.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  if (!subscription) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Subscription Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#6B7280" />
          <Text style={styles.errorTitle}>No Subscription Data</Text>
          <Text style={styles.errorText}>
            The subscription details could not be loaded. Please try again.
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysUntilBilling = getDaysUntilBilling();
  const urgencyColor = daysUntilBilling !== null ? getUrgencyColor(daysUntilBilling) : '#6B7280';
  const statusDisplay = getStatusDisplay(subscription.status);
  const isOverdue = daysUntilBilling !== null && daysUntilBilling < 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Details</Text>
        <TouchableOpacity 
          onPress={handleShare}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color="#4B5FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card */}
        <LinearGradient
          colors={['#6D7BFF', '#A46BFF']}
          style={styles.heroCard}
          start={[0, 0]}
          end={[1, 0]}
        >
          <View style={styles.heroContent}>
            <View style={styles.serviceHeader}>
              {serviceLogo ? (
                <View style={styles.logoContainer}>
                  <Image source={serviceLogo} style={styles.logo} />
                </View>
              ) : (
                <View style={[styles.logoContainer, styles.logoPlaceholder]}>
                  <Ionicons name="business" size={32} color="#fff" />
                </View>
              )}
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{subscription.name}</Text>
                <Text style={styles.serviceCategory}>
                  {subscription.service_provider || subscription.category || 'Subscription Service'}
                </Text>
              </View>
            </View>
            
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>
                {formatCurrency(subscription.amount, subscription.currency)}
              </Text>
              <Text style={styles.billingCycle}>
                per {getBillingCycleText(subscription.billing_cycle).toLowerCase()}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bgColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusDisplay.color }]} />
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.text}
          </Text>
          {subscription.is_shared && (
            <View style={styles.sharedIndicator}>
              <Ionicons name="people" size={12} color="#4B5FFF" />
              <Text style={styles.sharedText}>Shared</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        {subscription.status === 'active' && (
          <View style={styles.quickActions}>
            <TouchableOpacity 
              style={[styles.quickAction, styles.payAction]}
              onPress={handleMarkAsPaid}
            >
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.quickActionText}>Mark Paid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAction, styles.skipAction]}
              onPress={handleSkipReminder}
            >
              <Ionicons name="notifications-off" size={20} color="#F59E0B" />
              <Text style={styles.quickActionText}>Skip Reminder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.quickAction, styles.cancelAction]}
              onPress={handleCancelSubscription}
            >
              <Ionicons name="close-circle" size={20} color="#EF4444" />
              <Text style={styles.quickActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Next Billing Card */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={20} color="#4B5FFF" />
            <Text style={styles.cardTitle}>Next Billing</Text>
          </View>
          
          <View style={styles.billingInfo}>
            <Text style={styles.billingDate}>
              {formatDate(subscription.next_billing_date)}
            </Text>
            
            {daysUntilBilling !== null && subscription.status === 'active' && (
              <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor }]}>
                <Ionicons 
                  name={isOverdue ? "warning" : daysUntilBilling <= 3 ? "alarm" : "time"} 
                  size={14} 
                  color="#fff" 
                />
                <Text style={styles.urgencyText}>
                  {isOverdue ? 'Overdue' : 
                   daysUntilBilling === 0 ? 'Today' : 
                   daysUntilBilling === 1 ? 'Tomorrow' : 
                   `${daysUntilBilling} days`}
                </Text>
              </View>
            )}
          </View>

          {/* Last Payment Date */}
          {subscription.last_payment_date && (
            <View style={styles.lastPayment}>
              <Text style={styles.lastPaymentLabel}>Last paid on:</Text>
              <Text style={styles.lastPaymentDate}>
                {formatShortDate(subscription.last_payment_date)}
              </Text>
            </View>
          )}

          {/* Reminder Settings */}
          <View style={styles.reminderSettings}>
            <Text style={styles.reminderLabel}>Reminder:</Text>
            <Text style={styles.reminderValue}>
              {subscription.reminder_days_before || 3} days before due date
            </Text>
          </View>
        </View>

        {/* Subscription Details */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color="#4B5FFF" />
            <Text style={styles.cardTitle}>Subscription Details</Text>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Service Provider</Text>
              <Text style={styles.detailValue}>
                {subscription.service_provider || subscription.name}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Billing Cycle</Text>
              <Text style={styles.detailValue}>
                {getBillingCycleText(subscription.billing_cycle)}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Currency</Text>
              <Text style={styles.detailValue}>
                {subscription.currency === 'NGN' ? 'Naira (₦)' : 'US Dollar ($)'}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Auto Renew</Text>
              <Text style={styles.detailValue}>
                {subscription.auto_renew ? 'Yes' : 'No'}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {subscription.category || 'General'}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Shared Plan</Text>
              <Text style={styles.detailValue}>
                {subscription.is_shared ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>

          {/* Payment Statistics */}
          {(subscription.payment_count > 0 || subscription.total_payments > 0) && (
            <View style={styles.paymentStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Payments</Text>
                <Text style={styles.statValue}>{subscription.payment_count}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Amount Paid</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(subscription.total_payments, subscription.currency)}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes Section */}
        {subscription.notes && (
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={20} color="#4B5FFF" />
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{subscription.notes}</Text>
          </View>
        )}

        {/* Payment History Section */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="receipt-outline" size={20} color="#4B5FFF" />
            <Text style={styles.cardTitle}>Payment History</Text>
          </View>
          
          {loadingPayments ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#4B5FFF" />
              <Text style={styles.loadingText}>Loading payments...</Text>
            </View>
          ) : paymentHistory.length > 0 ? (
            <>
              <View style={styles.paymentList}>
                {paymentHistory.slice(0, 5).map((payment, index) => (
                  <View key={payment.id || index} style={styles.paymentItem}>
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentAmount}>
                        {formatCurrency(payment.amount, payment.currency)}
                      </Text>
                      <Text style={styles.paymentDate}>
                        {formatShortDate(payment.paid_at)}
                      </Text>
                    </View>
                    <View style={styles.paymentMethod}>
                      <Ionicons 
                        name={PaymentService.getPaymentMethodIcon(payment.payment_method)} 
                        size={14} 
                        color="#6B7280" 
                      />
                      <Text style={styles.paymentMethodText}>
                        {PaymentService.getPaymentMethodDisplayName(payment.payment_method)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {paymentHistory.length > 5 && (
                <TouchableOpacity style={styles.viewAllButton}>
                  <Text style={styles.viewAllText}>View All Payments</Text>
                  <Ionicons name="chevron-forward" size={16} color="#4B5FFF" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.emptyPayments}>
              <Ionicons name="receipt-outline" size={48} color="#E5E7EB" />
              <Text style={styles.emptyPaymentsTitle}>No Payment History</Text>
              <Text style={styles.emptyPaymentsText}>
                No payments recorded yet. Mark this subscription as paid to see payment history.
              </Text>
              <TouchableOpacity 
                style={styles.recordPaymentButton}
                onPress={handleMarkAsPaid}
              >
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
                <Text style={styles.recordPaymentText}>Record First Payment</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Monthly Equivalent */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="calculator" size={20} color="#4B5FFF" />
            <Text style={styles.cardTitle}>Monthly Equivalent</Text>
          </View>
          
          <View style={styles.monthlyEquivalent}>
            <Text style={styles.monthlyAmount}>
              {(() => {
                let multiplier = 1;
                if (subscription.billing_cycle === 'yearly') multiplier = 1/12;
                if (subscription.billing_cycle === 'weekly') multiplier = 4.33;
                if (subscription.billing_cycle === 'daily') multiplier = 30;
                
                const monthlyAmount = (Number(subscription.amount) || 0) * multiplier;
                return formatCurrency(monthlyAmount, subscription.currency);
              })()}
            </Text>
            <Text style={styles.monthlyLabel}>
              Estimated monthly cost
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.editButton]}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={20} color="#4B5FFF" />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>
                Edit Subscription
              </Text>
            </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton, deleting && { opacity: 0.6 }]} // ← disabled style
            onPress={handleDelete}
            disabled={deleting} // ← disable while deleting
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Subscription Insights</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Ionicons name="trending-up" size={24} color="#4B5FFF" />
              <Text style={styles.statValue}>
                {formatCurrency(
                  (Number(subscription.amount) || 0) * 
                  (subscription.billing_cycle === 'yearly' ? 1 : 
                   subscription.billing_cycle === 'monthly' ? 12 :
                   subscription.billing_cycle === 'weekly' ? 52 : 365),
                  subscription.currency
                )}
              </Text>
              <Text style={styles.statLabel}>Yearly Cost</Text>
            </View>
            
            <View style={styles.statItem}>
              <Ionicons name="calendar-clear" size={24} color="#10B981" />
              <Text style={styles.statValue}>
                {subscription.billing_cycle === 'daily' ? 'Every day' :
                 subscription.billing_cycle === 'weekly' ? 'Every week' :
                 subscription.billing_cycle === 'monthly' ? 'Every month' : 'Every year'}
              </Text>
              <Text style={styles.statLabel}>Renewal Frequency</Text>
            </View>
          </View>
        </View>

        {/* Created/Updated Info */}
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            Created: {formatShortDate(subscription.created_at)}
          </Text>
          {subscription.updated_at !== subscription.created_at && (
            <Text style={styles.metaText}>
              Updated: {formatShortDate(subscription.updated_at)}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  shareButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroContent: {
    alignItems: 'center',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoPlaceholder: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  logo: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  serviceCategory: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  amountContainer: {
    alignItems: 'center',
  },
  amount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  billingCycle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  sharedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  sharedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5FFF',
  },
  quickActions: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  payAction: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  skipAction: {
    backgroundColor: '#FFFBEB',
    borderColor: '#F59E0B',
  },
  cancelAction: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
  },
  billingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  billingDate: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 12,
  },
  urgencyText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 4,
  },
  lastPayment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  lastPaymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  lastPaymentDate: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  reminderSettings: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
  },
  reminderLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  reminderValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  detailItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  paymentStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5FFF',
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  paymentList: {
    marginTop: 8,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4B5FFF',
    fontWeight: '600',
    marginRight: 4,
  },
  monthlyEquivalent: {
    alignItems: 'center',
  },
  monthlyAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4B5FFF',
    marginBottom: 4,
  },
  monthlyLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  editButton: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4B5FFF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButtonText: {
    color: '#4B5FFF',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  metaInfo: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#4B5FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 14,
  },
  emptyPayments: {
    alignItems: 'center',
    padding: 20,
  },
  emptyPaymentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  recordPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4B5FFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  recordPaymentText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
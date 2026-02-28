// suba-frontend/src/components/SubscriptionCard.js - UPDATED
import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

// Format date nicely
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (d.toDateString() === today.toDateString()) {
    return "Today";
  } else if (d.toDateString() === tomorrow.toDateString()) {
    return "Tomorrow";
  } else {
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
};

// Format amount to currency with NGN support
const formatCurrency = (amount, currency = 'NGN') => {
  if (!amount) return currency === 'NGN' ? '₦0.00' : '$0.00';
  const formattedAmount = Number(amount).toFixed(2);
  return currency === 'NGN' ? `₦${formattedAmount}` : `$${formattedAmount}`;
};

// Get status badge
const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return { text: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
    case 'cancelled':
      return { text: 'Cancelled', color: '#EF4444', bgColor: '#FEE2E2' };
    case 'paused':
      return { text: 'Paused', color: '#F59E0B', bgColor: '#FEF3C7' };
    default:
      return { text: 'Active', color: '#10B981', bgColor: '#D1FAE5' };
  }
};

export default function SubscriptionCard({ subscription, onPress }) {
  console.log('SubscriptionCard received:', subscription);
  
  const { 
    name, 
    service_provider,
    category, 
    amount, 
    next_billing_date, 
    logo_url,
    logo,
    currency = 'NGN',
    billing_cycle,
    status = 'active',
    last_payment_date,
    is_shared
  } = subscription;

  // Use logo_url from new schema, fallback to legacy logo
  const logoSource = logo_url || logo;

  // Handle different logo formats
  const getImageSource = () => {
    if (!logoSource) return null;
    
    // If logo is already a proper source object
    if (typeof logoSource === 'object' && (logoSource.uri || logoSource.uri === null)) {
      return logoSource;
    }
    
    // If logo is a string URI
    if (typeof logoSource === 'string') {
      return { uri: logoSource };
    }
    
    // If logo is a local require object
    return logoSource;
  };

  const imageSource = getImageSource();
  const statusBadge = getStatusBadge(status);

  // Check if payment is due soon (within reminder_days_before days)
  const isDueSoon = () => {
    if (!next_billing_date || status !== 'active') return false;
    
    const reminderDays = subscription.reminder_days_before || 3;
    const billingDate = new Date(next_billing_date);
    const today = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(today.getDate() + reminderDays);
    
    return billingDate <= reminderDate && billingDate >= today;
  };

  // Check if overdue
  const isOverdue = () => {
    if (!next_billing_date || status !== 'active') return false;
    
    const billingDate = new Date(next_billing_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    billingDate.setHours(0, 0, 0, 0);
    
    return billingDate < today;
  };

  // Get display name (use service_provider if available, otherwise name)
  const displayName = service_provider || name;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {/* Logo */}
      {imageSource ? (
        <Image source={imageSource} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.logoPlaceholder]}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#4B5FFF" }}>
            {displayName?.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          
          {/* Status and urgency badges */}
          <View style={styles.badgeContainer}>
            {status !== 'active' && (
              <View style={[styles.badge, { backgroundColor: statusBadge.bgColor }]}>
                <Text style={[styles.badgeText, { color: statusBadge.color }]}>
                  {statusBadge.text}
                </Text>
              </View>
            )}
            
            {status === 'active' && isOverdue() && (
              <View style={[styles.badge, styles.overdueBadge]}>
                <Ionicons name="warning" size={10} color="#fff" />
                <Text style={[styles.badgeText, styles.overdueBadgeText]}>Overdue</Text>
              </View>
            )}
            
            {status === 'active' && isDueSoon() && (
              <View style={[styles.badge, styles.dueSoonBadge]}>
                <Ionicons name="alarm" size={10} color="#fff" />
                <Text style={[styles.badgeText, styles.dueSoonBadgeText]}>Due soon</Text>
              </View>
            )}
            
            {is_shared && (
              <View style={[styles.badge, styles.sharedBadge]}>
                <Ionicons name="people" size={10} color="#fff" />
                <Text style={[styles.badgeText, styles.sharedBadgeText]}>Shared</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Show category and billing cycle */}
        <View style={styles.detailsRow}>
          {category && (
            <Text style={styles.category}>{category}</Text>
          )}
          {billing_cycle && (
            <Text style={styles.billingCycle}>
              • {billing_cycle.charAt(0).toUpperCase() + billing_cycle.slice(1)}
            </Text>
          )}
        </View>
        
        {/* Next billing and last payment info */}
        <View style={styles.dateRow}>
          {next_billing_date && status === 'active' && (
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text style={styles.nextBilling}>
                {isOverdue() ? 'Overdue since ' : 'Renews '}
                {formatDate(next_billing_date)}
              </Text>
            </View>
          )}
          
          {last_payment_date && (
            <View style={styles.dateItem}>
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text style={styles.lastPayment}>
                Paid {formatDate(last_payment_date)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Price and arrow */}
      <View style={styles.rightSection}>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>{formatCurrency(amount, currency)}</Text>
          {!subscription.auto_renew && (
            <Ionicons name="pause-circle" size={14} color="#F59E0B" />
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    resizeMode: "cover",
  },
  logoPlaceholder: {
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
    gap: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
  },
  overdueBadgeText: {
    color: '#DC2626',
  },
  dueSoonBadge: {
    backgroundColor: '#FEF3C7',
  },
  dueSoonBadgeText: {
    color: '#D97706',
  },
  sharedBadge: {
    backgroundColor: '#E0E7FF',
  },
  sharedBadgeText: {
    color: '#4F46E5',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  category: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: '500',
  },
  billingCycle: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  dateRow: {
    flexDirection: 'column',
    gap: 2,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nextBilling: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  lastPayment: {
    fontSize: 12,
    color: "#10B981",
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5FFF",
  },
});
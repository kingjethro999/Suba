// suba-frontend/src/features/subscriptions/subscriptionService.js - FIXED PAYMENTS
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import LogoService from '../../services/LogoService';
import { NotificationService } from '../../services/notificationService';

// Enhanced normalizer
const normalizeSubscription = async (sub) => {
  const normalized = {
    id: sub.id,
    name: sub.name,
    service_provider: sub.service_provider,
    amount: sub.amount,
    category: sub.category,
    currency: sub.currency || 'NGN',
    billing_cycle: sub.billing_cycle,
    next_billing_date: sub.next_billing_date,
    last_payment_date: sub.last_payment_date,
    auto_renew: sub.auto_renew !== undefined ? sub.auto_renew : true,
    status: sub.status || 'active',
    reminder_days_before: sub.reminder_days_before || 3,
    is_shared: sub.is_shared || false,
    notes: sub.notes,
    cancellation_link: sub.cancellation_link,
    logo_url: sub.logo_url,
    skipped_at: sub.skipped_at,
    next_reminder_date: sub.next_reminder_date,
    total_payments: sub.total_payments || 0.00,
    payment_count: sub.payment_count || 0,
    created_at: sub.created_at,
    updated_at: sub.updated_at,
    
    // Legacy/compatibility fields
    logo: sub.logo_url || sub.logo,
    is_active: sub.status !== 'cancelled',
  };

  // If no logo exists, try to get one from LogoService
  if (!normalized.logo && !normalized.logo_url) {
    try {
      const logo = await LogoService.getLogoForSubscription(sub.name);
      if (logo) {
        normalized.logo = logo;
        normalized.logo_url = typeof logo === 'string' ? logo : logo.uri;
      }
    } catch (error) {
      console.error('Error getting logo for subscription:', error);
    }
  }

  return normalized;
};

// Enhanced get payment history with better error handling
export const getSubscriptionPayments = async (subscriptionId, options = {}) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const { limit = 20, offset = 0 } = options;
    
    const res = await fetch(
      `${API_URL}/payments/subscriptions/${subscriptionId}/payments?limit=${limit}&offset=${offset}`, 
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      // If 404, return empty array instead of throwing error
      if (res.status === 404) {
        console.log('No payment history found for subscription:', subscriptionId);
        return [];
      }
      
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    return result.payments || [];
  } catch (error) {
    console.error("❌ Error fetching subscription payments:", error.message);
    
    // Return empty array instead of throwing error for 404s
    if (error.message.includes('404')) {
      return [];
    }
    
    throw error;
  }
};

// Enhanced mark as paid with better error handling
export const markSubscriptionAsPaid = async (subscriptionId, paymentData = {}) => {
  try {
    const token = await AsyncStorage.getItem("token");
    
    const res = await fetch(`${API_URL}/payments/subscriptions/${subscriptionId}/mark-paid`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_method: paymentData.method || 'manual',
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: paymentData.amount,
        currency: paymentData.currency,
        ...paymentData
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error("❌ Error marking subscription as paid:", error.message);
    throw error;
  }
};

// Enhanced skip reminder
export const skipSubscriptionReminder = async (subscriptionId, skipDuration = '1 day') => {
  try {
    const token = await AsyncStorage.getItem("token");
    
    const res = await fetch(`${API_URL}/payments/subscriptions/${subscriptionId}/skip`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        skip_duration: skipDuration
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error("❌ Error skipping subscription reminder:", error.message);
    throw error;
  }
};

// Rest of the functions remain the same...
export const getSubscriptions = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}/subscriptions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    
    // Normalize all subscriptions with new schema
    const normalizedSubscriptions = await Promise.all(
      data.map(sub => normalizeSubscription(sub))
    );
    
    return normalizedSubscriptions;
  } catch (error) {
    console.error("❌ Error fetching subscriptions:", error.message);
    
    if (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    if (error.message.includes('401') || error.message.includes('token')) {
      throw new Error('Authentication failed. Please log in again.');
    }
    
    throw new Error('Failed to load subscriptions. Please try again.');
  }
};

export const addSubscription = async (subscription) => {
  try {
    const token = await AsyncStorage.getItem("token");

    const enhancedSubscription = {
      name: subscription.name,
      service_provider: subscription.service_provider || subscription.name,
      category: subscription.category || LogoService.getCategoryForSubscription(subscription.name),
      amount: subscription.amount,
      currency: subscription.currency || 'NGN',
      billing_cycle: subscription.billing_cycle,
      next_billing_date: subscription.next_billing_date,
      auto_renew: subscription.auto_renew !== undefined ? subscription.auto_renew : true,
      reminder_days_before: subscription.reminder_days_before || 3,
      is_shared: subscription.is_shared || false,
      notes: subscription.notes || '',
      cancellation_link: subscription.cancellation_link || '',
      logo_url: subscription.logo_url || '',
      status: 'active'
    };

    const res = await fetch(`${API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(enhancedSubscription),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const newSub = await res.json();
    const normalizedSub = await normalizeSubscription(newSub);
    
    await NotificationService.schedulePaymentReminder(normalizedSub);
    
    return normalizedSub;
  } catch (error) {
    console.error("❌ Error adding subscription:", error.message);
    throw error;
  }
};

export const updateSubscription = async (id, updates) => {
  try {
    const token = await AsyncStorage.getItem("token");

    const dbUpdates = {
      name: updates.name,
      service_provider: updates.service_provider,
      category: updates.category,
      amount: updates.amount,
      currency: updates.currency,
      billing_cycle: updates.billing_cycle,
      next_billing_date: updates.next_billing_date,
      last_payment_date: updates.last_payment_date,
      auto_renew: updates.auto_renew,
      reminder_days_before: updates.reminder_days_before,
      is_shared: updates.is_shared,
      notes: updates.notes,
      cancellation_link: updates.cancellation_link,
      logo_url: updates.logo_url,
      status: updates.status,
      skipped_at: updates.skipped_at,
      next_reminder_date: updates.next_reminder_date
    };

    // Remove undefined fields
    Object.keys(dbUpdates).forEach(key => {
      if (dbUpdates[key] === undefined) {
        delete dbUpdates[key];
      }
    });

    const res = await fetch(`${API_URL}/subscriptions/${id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dbUpdates),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const updated = await res.json();
    const normalizedSub = await normalizeSubscription(updated);
    
    await NotificationService.schedulePaymentReminder(normalizedSub);
    
    return normalizedSub;
  } catch (error) {
    console.error("❌ Error updating subscription:", error.message);
    throw error;
  }
};

export const cancelSubscription = async (subscriptionId, cancellationData = {}) => {
  try {
    const token = await AsyncStorage.getItem("token");
    
    const res = await fetch(`${API_URL}/subscriptions/${subscriptionId}/cancel`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: 'cancelled',
        notes: cancellationData.notes || `Cancelled on ${new Date().toLocaleDateString()}`,
        ...cancellationData
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const result = await res.json();
    return result;
  } catch (error) {
    console.error("❌ Error cancelling subscription:", error.message);
    throw error;
  }
};

export const deleteSubscription = async (id) => {
  try {
    const token = await AsyncStorage.getItem("token");

    const res = await fetch(`${API_URL}/subscriptions/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error("❌ Error deleting subscription:", error.message);
    throw error;
  }
};

export const getSubscriptionById = async (id) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}/subscriptions/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return normalizeSubscription(data);
  } catch (error) {
    console.error("❌ Error fetching subscription:", error.message);
    throw error;
  }
};

export const getSubscriptionStats = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}/payments/users/current/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error fetching subscription stats:", error.message);
    throw error;
  }
};
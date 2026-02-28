// suba-frontend/src/services/paymentService.js - UPDATED
import api from '../api/config';

// Enhanced service payment URL mappings
const SERVICE_PAYMENT_URLS = {
  // Streaming Services
  'netflix': 'https://www.netflix.com/YourAccount',
  'spotify': 'https://www.spotify.com/account/subscription/',
  'youtube premium': 'https://www.youtube.com/paid_memberships',
  'apple music': 'https://apps.apple.com/account/subscriptions',
  'amazon prime': 'https://www.amazon.com/gp/primecentral',
  'hulu': 'https://www.hulu.com/account',
  'disney+': 'https://www.disneyplus.com/account',
  'showmax': 'https://www.showmax.com/account',
  
  // Nigerian Services
  'dstv': 'https://my.dstv.com/',
  'gotv': 'https://my.dstv.com/',
  'startimes': 'https://www.startimes.com/ng/',
  'mtn': 'https://www.mtn.ng/',
  'airtel': 'https://www.airtel.ng/',
  'glo': 'https://www.gloworld.com/ng/',
  '9mobile': 'https://www.9mobile.com.ng/',
  
  // Software & Productivity
  'microsoft 365': 'https://account.microsoft.com/services/',
  'adobe creative cloud': 'https://account.adobe.com/plans',
  'notion': 'https://www.notion.so/pricing',
  'figma': 'https://www.figma.com/pricing/',
  'slack': 'https://slack.com/pricing',
  'zoom': 'https://zoom.us/pricing',
  
  // Cloud Services
  'google one': 'https://one.google.com/about',
  'dropbox': 'https://www.dropbox.com/account/billing',
  'icloud': 'https://www.icloud.com/settings/',
  
  // Food & Delivery
  'bolt food': 'https://bolt.eu/en/ng/',
  'uber eats': 'https://www.ubereats.com/',
  'jiji': 'https://jiji.ng/',
};

// Enhanced alternative payment methods
const ALTERNATIVE_PAYMENT_METHODS = {
  'mtn': ['USSD: *556#', 'MyMTN App', 'MTN Website', 'Bank Transfer'],
  'airtel': ['USSD: *123#', 'Airtel Money App', 'Airtel Website', 'Bank Transfer'],
  'glo': ['USSD: *123#', 'Glo Website', 'Bank App', 'Quickteller'],
  '9mobile': ['USSD: *242#', '9mobile Website', 'Bank Transfer', 'Quickteller'],
  'dstv': ['MyDStv App', 'DStv Website', 'Bank USSD', 'Quickteller'],
  'gotv': ['MyDStv App', 'DStv Website', 'Bank USSD', 'Quickteller'],
  'startimes': ['USSD: *818#', 'Startimes App', 'Bank Transfer'],
};

// Payment validation utility
const validatePaymentData = (paymentData) => {
  const errors = [];
  
  if (!paymentData.amount || paymentData.amount <= 0) {
    errors.push('Invalid payment amount');
  }
  
  if (!paymentData.method) {
    errors.push('Payment method is required');
  }
  
  if (paymentData.amount > 1000000) { // Reasonable upper limit
    errors.push('Payment amount seems too high');
  }
  
  return errors;
};

// String similarity for better service matching
const calculateSimilarity = (str1, str2) => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  return (longer.length - editDistance(longer, shorter)) / parseFloat(longer.length);
};

const editDistance = (str1, str2) => {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
};

export class PaymentService {
  // Enhanced payment URL lookup with fuzzy matching
  static getPaymentUrl(serviceName) {
    if (!serviceName) return null;
    
    const serviceKey = serviceName.toLowerCase().trim();
    
    // Exact match
    if (SERVICE_PAYMENT_URLS[serviceKey]) {
      return SERVICE_PAYMENT_URLS[serviceKey];
    }
    
    // Partial match with similarity scoring
    let bestMatch = { url: null, score: 0 };
    
    for (const [key, url] of Object.entries(SERVICE_PAYMENT_URLS)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedService = serviceKey.replace(/[^a-z0-9]/g, '');
      
      let score = 0;
      
      // Direct inclusion
      if (normalizedService.includes(normalizedKey) || normalizedKey.includes(normalizedService)) {
        score = 0.9;
      } else {
        // Similarity calculation
        score = calculateSimilarity(normalizedService, normalizedKey);
      }
      
      if (score > bestMatch.score && score > 0.6) {
        bestMatch = { url, score };
      }
    }
    
    return bestMatch.url;
  }

  // Get alternative payment methods with enhanced matching
  static getAlternativePaymentMethods(serviceName) {
    if (!serviceName) return [];
    
    const serviceKey = serviceName.toLowerCase().trim();
    
    // Exact match
    if (ALTERNATIVE_PAYMENT_METHODS[serviceKey]) {
      return ALTERNATIVE_PAYMENT_METHODS[serviceKey];
    }
    
    // Partial match with similarity
    let bestMethods = [];
    let bestScore = 0;
    
    for (const [key, methods] of Object.entries(ALTERNATIVE_PAYMENT_METHODS)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedService = serviceKey.replace(/[^a-z0-9]/g, '');
      
      let score = calculateSimilarity(normalizedService, normalizedKey);
      
      if (score > bestScore && score > 0.6) {
        bestScore = score;
        bestMethods = methods;
      }
    }     return bestMethods;
  }

  // Enhanced payment info check
  static hasPaymentInfo(serviceName) {
    const hasUrl = this.getPaymentUrl(serviceName) !== null;
    const hasMethods = this.getAlternativePaymentMethods(serviceName).length > 0;
    
    return hasUrl || hasMethods;
  }

  // Get payment confidence score (0-1)
  static getPaymentConfidence(serviceName) {
    const url = this.getPaymentUrl(serviceName);
    const methods = this.getAlternativePaymentMethods(serviceName);
    
    let score = 0;
    
    if (url) score += 0.6;
    if (methods.length > 0) score += 0.4;
    
    // Bonus for multiple methods
    if (methods.length > 2) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  // Enhanced payment page navigation
  static async openPaymentPage(serviceName, navigation, subscriptionData = {}) {
    const paymentUrl = this.getPaymentUrl(serviceName);
    const alternativeMethods = this.getAlternativePaymentMethods(serviceName);
    const confidence = this.getPaymentConfidence(serviceName);
    
    const params = {
      serviceName,
      paymentUrl,
      alternativeMethods,
      confidenceScore: confidence,
      ...subscriptionData
    };
    
    if (paymentUrl || alternativeMethods.length > 0) {
      navigation.navigate('PaymentOptions', params);
    } else {
      navigation.navigate('PaymentHelp', params);
    }
  }

  // Enhanced mark subscription as paid with validation
  static async markAsPaid(subscriptionId, paymentData = {}) {
    try {
      // Validate payment data
      const validationErrors = validatePaymentData(paymentData);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join(', '),
          validationErrors: validationErrors
        };
      }

      const payload = {
        payment_method: paymentData.method || 'manual',
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        amount: paymentData.amount,
        currency: paymentData.currency,
        transaction_id: paymentData.transactionId,
        receipt_url: paymentData.receiptUrl,
        ...paymentData
      };

      const response = await api.put(`/payments/subscriptions/${subscriptionId}/mark-paid`, payload);

      // Log successful payment for analytics
      console.log(`Payment successfully recorded for subscription ${subscriptionId}`, {
        method: paymentData.method,
        amount: paymentData.amount,
        transactionId: paymentData.transactionId
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Payment recorded successfully'
      };
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      
      // Enhanced error handling with specific messages
      let errorMessage = 'Failed to update payment status';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (error.response) {
        const serverError = error.response.data;
        errorMessage = serverError.error || serverError.message || `Server error: ${error.response.status}`;
        errorCode = serverError.code || `HTTP_${error.response.status}`;
        
        // Handle specific error cases
        if (error.response.status === 409) {
          errorMessage = 'A payment was already recorded recently. Please wait before recording another payment.';
          errorCode = 'DUPLICATE_PAYMENT';
        } else if (error.response.status === 404) {
          errorMessage = 'Subscription not found. Please refresh and try again.';
          errorCode = 'SUBSCRIPTION_NOT_FOUND';
        }
      } else if (error.request) {
        errorMessage = 'Network error: Could not connect to server. Please check your internet connection.';
        errorCode = 'NETWORK_ERROR';
      }
      
      return {
        success: false,
        error: errorMessage,
        errorCode: errorCode,
        details: error.response?.data?.details
      };
    }
  }

  // Enhanced skip reminder with duration options
  static async skipReminder(subscriptionId, skipDuration = '1 day') {
    try {
      const response = await api.put(`/payments/subscriptions/${subscriptionId}/skip`, {
        skip_duration: skipDuration
      });

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Reminder skipped successfully'
      };
    } catch (error) {
      console.error('Error skipping reminder:', error);
      
      let errorMessage = 'Failed to skip reminder';
      
      if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'Network error: Could not connect to server';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get payment history for a subscription
  static async getPaymentHistory(subscriptionId, options = {}) {
    try {
      const { limit = 20, offset = 0 } = options;
      
      const response = await api.get(`/payments/subscriptions/${subscriptionId}/payments`, {
        params: { limit, offset }
      });

      return {
        success: true,
        data: response.data,
        payments: response.data.payments,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Error fetching payment history:', error);
      
      let errorMessage = 'Failed to fetch payment history';
      
      if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Get user payment statistics
  static async getUserPaymentStats(userId) {
    try {
      const response = await api.get(`/payments/users/${userId}/payment-stats`);

      return {
        success: true,
        data: response.data,
        stats: response.data.stats,
        recentPayments: response.data.recent_payments
      };
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      
      let errorMessage = 'Failed to fetch payment statistics';
      
      if (error.response) {
        errorMessage = error.response.data?.error || `Server error: ${error.response.status}`;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Generate payment receipt data
  static generateReceiptData(paymentRecord, subscription) {
    return {
      receiptId: `RCPT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString(),
      subscriptionName: subscription?.name,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      paymentMethod: paymentRecord.payment_method,
      transactionId: paymentRecord.transaction_id,
      nextBillingDate: subscription?.next_billing_date
    };
  }

  // Validate payment method
  static validatePaymentMethod(method) {
    const validMethods = [
      'manual', 'website', 'ussd', 'bank_transfer', 
      'mobile_app', 'card', 'bank_ussd', 'quickteller'
    ];
    
    return validMethods.includes(method.toLowerCase());
  }

  // Get payment method display name
  static getPaymentMethodDisplayName(method) {
    const displayNames = {
      'manual': 'Manual Entry',
      'website': 'Official Website',
      'ussd': 'USSD Code',
      'bank_transfer': 'Bank Transfer',
      'mobile_app': 'Mobile App',
      'card': 'Card Payment',
      'bank_ussd': 'Bank USSD',
      'quickteller': 'Quickteller'
    };
    
    return displayNames[method.toLowerCase()] || method;
  }

  // Get payment method icon
  static getPaymentMethodIcon(method) {
    const icons = {
      'manual': 'checkmark-circle',
      'website': 'globe',
      'ussd': 'phone-portrait',
      'bank_transfer': 'business',
      'mobile_app': 'phone-portrait',
      'card': 'card',
      'bank_ussd': 'phone-portrait',
      'quickteller': 'flash'
    };
    
    return icons[method.toLowerCase()] || 'help-circle';
  }

  // Check if service supports specific payment method
  static supportsPaymentMethod(serviceName, method) {
    const serviceKey = serviceName.toLowerCase().trim();
    const alternativeMethods = this.getAlternativePaymentMethods(serviceName);
    
    const methodMap = {
      'ussd': ['USSD:', '*556#', '*123#', '*242#', '*818#'],
      'mobile_app': ['App', 'Mobile App'],
      'website': ['Website'],
      'bank_transfer': ['Bank Transfer', 'Bank App'],
      'bank_ussd': ['Bank USSD'],
      'quickteller': ['Quickteller']
    };
    
    const methodKeywords = methodMap[method] || [];
    
    return alternativeMethods.some(altMethod => 
      methodKeywords.some(keyword => 
        altMethod.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }
}

// Export utility functions for testing
export const PaymentUtils = {
  calculateSimilarity,
  editDistance,
  validatePaymentData
};

export default PaymentService;
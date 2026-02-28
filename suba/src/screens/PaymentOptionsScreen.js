// suba-frontend/src/screens/PaymentOptionsScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PaymentService } from '../services/paymentService';

export default function PaymentOptionsScreen({ route, navigation }) {
  const { 
    serviceName, 
    paymentUrl, 
    alternativeMethods,
    subscriptionId,
    amount,
    currency 
  } = route.params;

  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenPaymentUrl = async () => {
    if (paymentUrl) {
      try {
        const canOpen = await Linking.canOpenURL(paymentUrl);
        if (canOpen) {
          await Linking.openURL(paymentUrl);
          // Show option to mark as paid after returning
          setTimeout(() => {
            Alert.alert(
              'Payment Completed?',
              'Did you complete the payment on the website?',
              [
                { text: 'Not Yet', style: 'cancel' },
                { 
                  text: 'Yes, Mark as Paid', 
                  onPress: () => handleMarkAsPaid('website')
                }
              ]
            );
          }, 1000);
        } else {
          Alert.alert('Error', 'Cannot open payment page. Please visit the website manually.');
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to open payment page. Please try again.');
      }
    }
  };

  const handleMarkAsPaid = async (paymentMethod = 'manual') => {
    if (!subscriptionId) {
      Alert.alert('Error', 'Subscription ID missing. Cannot mark as paid.');
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await PaymentService.markAsPaid(subscriptionId, {
        method: paymentMethod,
        amount: amount
      });

      if (result.success) {
        Alert.alert(
          "Payment Recorded!",
          `${serviceName} has been marked as paid.`,
          [
            { 
              text: "Great!", 
              onPress: () => {
                // Navigate back and refresh the home screen
                navigation.navigate('Home', { refresh: true });
              }
            }
          ]
        );
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to update payment status. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAlternativeMethod = (method) => {
    Alert.alert(
      `Pay with ${method}`,
      `Have you completed payment using ${method}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Mark as Paid", 
          onPress: () => handleMarkAsPaid(method.toLowerCase())
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Payment Options</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content}>
        {/* Service Info */}
        <View style={styles.serviceCard}>
          <Text style={styles.serviceName}>{serviceName}</Text>
          {amount && (
            <Text style={styles.amount}>
              {currency === 'NGN' ? '₦' : '$'}{amount}
            </Text>
          )}
          <Text style={styles.paymentPrompt}>
            Choose how you'd like to make your payment
          </Text>
        </View>

        {/* Direct Payment Link */}
        {paymentUrl && (
          <TouchableOpacity 
            style={styles.paymentOption}
            onPress={handleOpenPaymentUrl}
            disabled={isProcessing}
          >
            <LinearGradient
              colors={['#6D7BFF', '#A46BFF']}
              style={styles.optionGradient}
            >
              <View style={styles.optionContent}>
                <Ionicons name="globe" size={24} color="#fff" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Official Website</Text>
                  <Text style={styles.optionDescription}>
                    Pay directly on {serviceName}'s website
                  </Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Alternative Payment Methods */}
        {alternativeMethods && alternativeMethods.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Alternative Methods</Text>
            {alternativeMethods.map((method, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.alternativeMethod}
                onPress={() => handleAlternativeMethod(method)}
                disabled={isProcessing}
              >
                <Ionicons name="phone-portrait" size={20} color="#4B5FFF" />
                <Text style={styles.methodText}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Manual Payment Marking */}
        <TouchableOpacity 
          style={[styles.manualOption, isProcessing && styles.disabledOption]}
          onPress={() => handleMarkAsPaid('manual')}
          disabled={isProcessing}
        >
          <View style={styles.optionContent}>
            {isProcessing ? (
              <ActivityIndicator size="small" color="#10B981" />
            ) : (
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            )}
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>
                {isProcessing ? 'Processing...' : 'Mark as Paid'}
              </Text>
              <Text style={styles.optionDescription}>
                I've already made this payment
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            If you're having trouble making payments, contact {serviceName} support directly or try their mobile app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  content: {
    flex: 1,
    padding: 20,
  },
  serviceCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4B5FFF',
    marginBottom: 8,
  },
  paymentPrompt: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  paymentOption: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  optionGradient: {
    padding: 20,
  },
  manualOption: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  alternativeMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  methodText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  helpSection: {
    backgroundColor: '#F0F4FF',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4B5FFF',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
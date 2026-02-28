import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../contexts/AuthContext';
import { useAuth } from '../auth/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { NotificationService } from '../../services/notificationService';

const SETTINGS_KEYS = {
  NOTIFICATIONS: 'settings_notifications',
  CURRENCY: 'settings_currency',
  REMINDER_DAYS: 'settings_reminder_days',
};

export default function SettingsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const { logout } = useAuth();

  const [notifications, setNotifications] = useState(true);
  const [currency, setCurrency] = useState('NGN');
  const [reminderDays, setReminderDays] = useState(3);
  const [appVersion] = useState('1.0.0');

  const userEmail = user?.email || '';
  const defaultCurrency = user?.default_currency || 'NGN';

  // Init currency from user
  useEffect(() => {
    setCurrency(defaultCurrency);
  }, [defaultCurrency]);

  // Load saved settings
  useEffect(() => {
    (async () => {
      try {
        const [savedNotifications, savedCurrency, savedReminderDays] = await Promise.all([
          AsyncStorage.getItem(SETTINGS_KEYS.NOTIFICATIONS),
          AsyncStorage.getItem(SETTINGS_KEYS.CURRENCY),
          AsyncStorage.getItem(SETTINGS_KEYS.REMINDER_DAYS),
        ]);

        if (savedNotifications !== null) setNotifications(JSON.parse(savedNotifications));
        if (savedCurrency !== null) setCurrency(savedCurrency);
        if (savedReminderDays !== null) setReminderDays(JSON.parse(savedReminderDays));
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    })();
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          AsyncStorage.setItem(SETTINGS_KEYS.NOTIFICATIONS, JSON.stringify(notifications)),
          AsyncStorage.setItem(SETTINGS_KEYS.CURRENCY, currency),
          AsyncStorage.setItem(SETTINGS_KEYS.REMINDER_DAYS, JSON.stringify(reminderDays)),
        ]);
      } catch (error) {
        console.error('Error saving settings:', error);
      }
    })();
  }, [notifications, currency, reminderDays]);

  // Notification toggle
  const handleNotificationsToggle = useCallback(async (value) => {
    try {
      setNotifications(value);
      if (value) {
        const granted = await NotificationService.requestPermissions();
        if (!granted) {
          setNotifications(false);
          return Alert.alert(
            'Notifications Disabled',
            'Please enable notifications in your device settings to receive payment reminders.'
          );
        }
        // Reschedule reminders if enabled
        try {
          const { getSubscriptions } = require('../subscriptions/subscriptionService');
          const subs = await getSubscriptions();
          await NotificationService.scheduleAllReminders(subs);
          Alert.alert('Notifications Enabled', "You'll receive payment reminders and insights.");
        } catch (e) {
          console.error('Error scheduling notifications:', e);
        }
      } else {
        await NotificationService.cancelAllNotifications();
        Alert.alert('Notifications Disabled', "You won't receive payment reminders.");
      }
    } catch (e) {
      console.error('Notification toggle error:', e);
    }
  }, []);

  // Reminder days change
  const handleReminderDaysChange = useCallback(async (days) => {
    try {
      setReminderDays(days);
      if (notifications) {
        const { getSubscriptions } = require('../subscriptions/subscriptionService');
        const subs = await getSubscriptions();
        await NotificationService.scheduleAllReminders(subs);
      }
    } catch (e) {
      console.error('Error rescheduling notifications:', e);
    }
  }, [notifications]);

  // Currency change (persist locally)
  const handleCurrencyChange = useCallback(async (newCurrency) => {
    try {
      setCurrency(newCurrency);
      // Persist into local user object to reflect in-app defaults
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        const u = JSON.parse(userJson);
        u.default_currency = newCurrency;
        await AsyncStorage.setItem('user', JSON.stringify(u));
      }
      console.log('Currency changed to:', newCurrency);
    } catch (e) {
      console.error('Error updating currency:', e);
    }
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', onPress: () => logout(), style: 'destructive' }
    ]);
  }, [logout]);

  // External links
  const openPrivacyPolicy = () => Linking.openURL('https://suba-app.com/privacy');
  const openTermsOfService = () => Linking.openURL('https://suba-app.com/terms');
  const openSupport = () => Linking.openURL('mailto:support@suba.com?subject=Support Request');

  // Export data (CSV)
  const exportData = async () => {
    try {
      const { getSubscriptions } = require('../subscriptions/subscriptionService');
      const subscriptions = await getSubscriptions();

      const header = 'Name,Amount,Currency,Billing Cycle,Next Billing Date\n';
      const rows = (subscriptions || []).map(sub =>
        `"${(sub.name || '').replace(/"/g, '""')}",${Number(sub.amount || 0)},${sub.currency || ''},${sub.billing_cycle || ''},"${sub.next_billing_date || ''}"`
      ).join('\n');

      const fullCsv = header + rows;
      const fileUri = FileSystem.documentDirectory + 'suba_export.csv';
      await FileSystem.writeAsStringAsync(fileUri, fullCsv, { encoding: FileSystem.EncodingType.UTF8 });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Your Subscriptions',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  // Clear cache (keep auth and settings)
  const clearCache = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(key =>
        !key.startsWith('settings_') && key !== 'token' && key !== 'user'
      );
      await AsyncStorage.multiRemove(keysToRemove);
      Alert.alert('Success', 'Cache cleared successfully!');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache.');
    }
  };

  // // Dev-only test notification
  // const testNotification = async () => {
  //   try {
  //     await NotificationService.schedulePaymentReminder({
  //       id: 'test',
  //       name: 'Test Subscription',
  //       amount: 1000,
  //       next_billing_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  //       currency: 'NGN'
  //     });
  //     Alert.alert('Test Notification', 'A test notification has been scheduled for tomorrow!');
  //   } catch (error) {
  //     console.error('Error testing notification:', error);
  //     Alert.alert('Error', 'Failed to schedule test notification.');
  //   }
  // };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  const SettingItem = ({ icon, title, subtitle, rightComponent, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color="#4B5FFF" style={styles.settingIcon} />
        <View>
          <Text style={styles.settingTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="settings-outline" size={28} color="#4B5FFF" />
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Account */}
        <Section title="Account">
          <SettingItem
            icon="person-outline"
            title="Profile"
            subtitle={userEmail}
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={() => navigation.navigate('Profile')}
          />
        </Section>

        {/* Preferences */}
        <Section title="Preferences">
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Payment reminders & insights"
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#E5E7EB', true: '#4B5FFF' }}
                thumbColor={notifications ? '#fff' : '#f4f3f4'}
              />
            }
          />

          <SettingItem
            icon="cash-outline"
            title="Default Currency"
            subtitle={currency === 'NGN' ? 'Naira (₦)' : 'US Dollar ($)'}
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={() => {
              Alert.alert('Select Currency', 'Choose your default currency', [
                { text: 'Naira (₦)', onPress: () => handleCurrencyChange('NGN') },
                { text: 'US Dollar ($)', onPress: () => handleCurrencyChange('USD') },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          />

          <SettingItem
            icon="alarm-outline"
            title="Reminder Timing"
            subtitle={`${reminderDays} day(s) before payment`}
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={() => {
              Alert.alert('Reminder Timing', 'How many days before payment should we remind you?', [
                { text: '1 day', onPress: () => handleReminderDaysChange(1) },
                { text: '3 days', onPress: () => handleReminderDaysChange(3) },
                { text: '7 days', onPress: () => handleReminderDaysChange(7) },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }}
          />

          {/* {__DEV__ && (
            <SettingItem
              icon="notifications"
              title="Test Notification"
              subtitle="Schedule a test notification"
              rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
              onPress={testNotification}
            />
          )} */}
        </Section>

        {/* Data & Privacy */}
        <Section title="Data & Privacy">
          <SettingItem
            icon="download-outline"
            title="Export Data"
            subtitle="Download your subscription data"
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={exportData}
          />
          <SettingItem
            icon="trash-outline"
            title="Clear Cache"
            subtitle="Free up storage space"
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={() => {
              Alert.alert(
                'Clear Cache',
                'This will remove temporary data but keep your subscriptions safe.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', onPress: clearCache, style: 'destructive' }
                ]
              );
            }}
          />
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            rightComponent={<Ionicons name="open-outline" size={20} color="#9CA3AF" />}
            onPress={openPrivacyPolicy}
          />
          <SettingItem
            icon="document-lock-outline"
            title="Terms of Service"
            rightComponent={<Ionicons name="open-outline" size={20} color="#9CA3AF" />}
            onPress={openTermsOfService}
          />
        </Section>

        {/* Support */}
        <Section title="Support">
          <SettingItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help with the app"
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={openSupport}
          />
          <SettingItem
            icon="information-circle-outline"
            title="About"
            subtitle={`Version ${appVersion}`}
            rightComponent={<Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
            onPress={() => {
              Alert.alert(
                'About Suba',
                `Version: ${appVersion}\n\nA smart subscription management app that helps you track and optimize your recurring payments.`,
                [{ text: 'OK' }]
              );
            }}
          />
        </Section>

        {/* Account Actions */}
        <Section title="Account Actions">
          <TouchableOpacity style={[styles.settingItem, styles.logoutButton]} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={[styles.settingTitle, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>
        </Section>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Suba • Subscription Manager</Text>
          <Text style={styles.footerSubtext}>© 2024 Suba App. All rights reserved.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: Platform.OS === 'ios' ? 8 : 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 24, padding: 16,
    backgroundColor: '#fff', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginLeft: 12 },
  section: {
    marginBottom: 24, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 16,
    paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  settingItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: 12, width: 24 },
  settingTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  settingSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  logoutButton: { borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 8 },
  logoutText: { color: '#EF4444', marginLeft: 12 },
  footer: { alignItems: 'center', padding: 24, marginBottom: 24 },
  footerText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  footerSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});
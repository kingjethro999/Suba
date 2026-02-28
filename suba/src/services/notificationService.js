// suba-frontend/src/services/notificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Check if running in Expo Go (which has limitations)
const isExpoGo = Constants.appOwnership === 'expo';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async requestPermissions() {
    // Skip push notifications in Expo Go on Android due to limitations
    if (isExpoGo && Platform.OS === 'android') {
      console.log('⚠️ Push notifications not supported in Expo Go on Android. Use a development build for full functionality.');
      return false;
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      return true;
    } else {
      console.log('Must use physical device for Push Notifications');
      return false;
    }
  }

  static async schedulePaymentReminder(subscription) {
    try {
      // Skip push notifications in Expo Go on Android
      if (isExpoGo && Platform.OS === 'android') {
        console.log('⚠️ Skipping push notification scheduling in Expo Go on Android');
        return null;
      }

      const reminderDays = await AsyncStorage.getItem('settings_reminder_days') || 3;
      const daysBefore = parseInt(reminderDays);
      
      const nextBillingDate = new Date(subscription.next_billing_date);
      const reminderDate = new Date(nextBillingDate);
      reminderDate.setDate(reminderDate.getDate() - daysBefore);
      
      // Don't schedule if reminder date is in the past
      if (reminderDate <= new Date()) {
        console.log('Reminder date is in the past, skipping notification');
        return;
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Payment Reminder',
          body: `Your ${subscription.name} subscription (₦${subscription.amount}) is due in ${daysBefore} days`,
          data: { subscriptionId: subscription.id, type: 'payment_reminder' },
          sound: 'default',
          badge: 1,
        },
        trigger: {
          date: reminderDate,
        },
      });

      console.log(`Scheduled notification for ${subscription.name}:`, notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  static async cancelNotification(notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Cancelled notification:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  static async scheduleAllReminders(subscriptions) {
    try {
      // Cancel all existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Schedule new notifications for active subscriptions
      const activeSubscriptions = subscriptions.filter(sub => sub.is_active !== false);
      
      for (const subscription of activeSubscriptions) {
        await this.schedulePaymentReminder(subscription);
      }
      
      console.log(`Scheduled ${activeSubscriptions.length} payment reminders`);
    } catch (error) {
      console.error('Error scheduling all reminders:', error);
    }
  }

  static async scheduleWeeklyInsight() {
    try {
      // Skip push notifications in Expo Go on Android
      if (isExpoGo && Platform.OS === 'android') {
        console.log('⚠️ Skipping weekly insight notification scheduling in Expo Go on Android');
        return null;
      }

      // Schedule for every Monday at 9 AM
      const trigger = {
        repeats: true,
        weekday: 1, // Monday
        hour: 9,
        minute: 0,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📊 Weekly Subscription Insight',
          body: 'Check your weekly subscription spending and get insights',
          data: { type: 'weekly_insight' },
        },
        trigger,
      });
    } catch (error) {
      console.error('Error scheduling weekly insight:', error);
    }
  }

  static async scheduleMonthlyReport() {
    try {
      // Skip push notifications in Expo Go on Android
      if (isExpoGo && Platform.OS === 'android') {
        console.log('⚠️ Skipping monthly report notification scheduling in Expo Go on Android');
        return null;
      }

      // Schedule for 1st of every month at 10 AM
      const trigger = {
        repeats: true,
        day: 1,
        hour: 10,
        minute: 0,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📈 Monthly Subscription Report',
          body: 'Your monthly subscription report is ready!',
          data: { type: 'monthly_report' },
        },
        trigger,
      });
    } catch (error) {
      console.error('Error scheduling monthly report:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  // Cancel all notifications
  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
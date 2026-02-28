// suba-frontend/App.js
import React, { useContext, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import MainNavigator from './src/navigation/MainNavigator';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NotificationService } from './src/services/notificationService';

function AppNavigator() {
  const { user, loading } = useContext(AuthContext);
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Request notification permissions when app starts
    NotificationService.requestPermissions();
    
    // Schedule recurring notifications
    NotificationService.scheduleWeeklyInsight();
    NotificationService.scheduleMonthlyReport();

    // Listen for incoming notifications while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification taps here
      const { subscriptionId, type } = response.notification.request.content.data;
      
      if (type === 'payment_reminder' && subscriptionId) {
        // Navigate to subscription details
        // You would need navigation ref here to navigate from outside components
      }
    });

    return () => {
      // Clean up listeners
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4B5FFF" />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AIInsightsScreen from '../features/insights/InsightsScreen';
import BudgetReportsScreen from '../features/budget/BudgetReportsScreen';
import NotificationsScreen from '../features/notifications/NotificationsScreen';
import SubscriptionListScreen from "../features/subscriptions/SubscriptionListScreen";

const Stack = createNativeStackNavigator();

export default function InsightsNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen
        name="AIInsights"
        component={AIInsightsScreen}
        options={{ title: 'AI Insights' }}
      />
      <Stack.Screen
        name="BudgetReports"
        component={BudgetReportsScreen}
        options={{ title: 'Budget Reports' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
       name="Subscriptions"
      component={SubscriptionListScreen}
      options={{ title: 'subscriptions'}} />

    </Stack.Navigator>
  );
}
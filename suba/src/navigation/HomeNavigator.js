// suba-frontend/src/navigation/HomeNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import AddSubscriptionScreen from "../features/subscriptions/AddSubscriptionScreen";
import SubscriptionListScreen from "../features/subscriptions/SubscriptionListScreen";
import UpcomingPaymentsScreen from "../features/upcoming/UpcomingPaymentsScreen";
import InsightsScreen from "../features/insights/InsightsScreen";
import SubscriptionDetailsScreen from "../features/subscriptions/SubscriptionDetailsScreen";
import ProfileScreen from "../features/profile/ProfileScreen";
import PaymentHistoryScreen from "../features/payments/PaymentHistoryScreen";
import BudgetReportsScreen from "../features/budget/BudgetReportsScreen";
import PaymentOptionsScreen from '../screens/PaymentOptionsScreen';

// ADD THIS
import EditSubscriptionScreen from "../features/subscriptions/EditSubscriptionScreen";

const Stack = createNativeStackNavigator();

export default function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="AddSubscription" component={AddSubscriptionScreen} />
      <Stack.Screen name="Subscriptions" component={SubscriptionListScreen} />
      <Stack.Screen name="UpcomingPayments" component={UpcomingPaymentsScreen} />
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PaymentHistory" component={PaymentHistoryScreen} />
      <Stack.Screen name="BudgetReports" component={BudgetReportsScreen} />
      <Stack.Screen name="PaymentOptions" component={PaymentOptionsScreen} />

      {/* NEW: Edit screen route */}
      <Stack.Screen
        name="EditSubscriptionScreen"
        component={EditSubscriptionScreen}
        options={{ title: "Edit Subscription", headerShown: false }}
      />
    </Stack.Navigator>
  );
}
// suba-frontend/src/navigation/AnalyticsNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AnalyticsScreen from "../features/analytics/AnalyticsScreen";
import SubscriptionListScreen from "../features/subscriptions/SubscriptionListScreen";
import SubscriptionDetailsScreen from "../features/subscriptions/SubscriptionDetailsScreen";

const Stack = createNativeStackNavigator();

export default function AnalyticsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AnalyticsMain"
        component={AnalyticsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscriptions"
        component={SubscriptionListScreen}
        options={{ title: "All Subscriptions" }}
      />
      <Stack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />
      
    </Stack.Navigator>
  );
}
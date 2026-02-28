// suba-frontend/src/navigation/CalendarNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CalendarScreen from "../features/calendar/CalendarScreen";
import SubscriptionDetailsScreen from "../features/subscriptions/SubscriptionDetailsScreen";


const Stack = createNativeStackNavigator();

export default function CalendarNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="CalendarMain"
        component={CalendarScreen}
        options={{ headerShown: false }}
      />
            <Stack.Screen name="SubscriptionDetails" component={SubscriptionDetailsScreen} />

    </Stack.Navigator>
  );
}
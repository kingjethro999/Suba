// suba-frontend/src/navigation/SettingsNavigator.js
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SettingsScreen from "../features/settings/SettingsScreen";
import ProfileScreen from "../features/profile/ProfileScreen";
import SecurityScreen from "../features/security/SecurityScreen";

const Stack = createNativeStackNavigator();

function SettingsNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          headerStyle: { backgroundColor: '#F9FAFB' },
        }}
      />
      <Stack.Screen
        name="Security"
        component={SecurityScreen}
        options={{
          title: "Security",
          headerStyle: { backgroundColor: '#F9FAFB' },
        }}
      />
    </Stack.Navigator>
  );
}

export default SettingsNavigator;
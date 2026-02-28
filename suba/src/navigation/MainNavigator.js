// suba-frontend/src/navigation/MainNavigator.js
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import HomeNavigator from "./HomeNavigator";
import SettingsNavigator from "./SettingsNavigator";
import CalendarNavigator from "./CalendarNavigator";
import AnalyticsNavigator from "./AnalyticsNavigator";
import InsightsNavigator from "./InsightsNavigator"; // New
import SharedPlansNavigator from "./SharedPlansNavigator"; // New

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = "home-outline";
          } else if (route.name === "Analytics") {
            iconName = "stats-chart-outline";
          } else if (route.name === "Calendar") {
            iconName = "calendar-outline";
          } else if (route.name === "Insights") {
            iconName = "bulb-outline";
          } else if (route.name === "Shared") {
            iconName = "people-outline";
          } else if (route.name === "Settings") {
            iconName = "settings-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#4B5FFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Analytics" component={AnalyticsNavigator} />
      <Tab.Screen name="Calendar" component={CalendarNavigator} />
      <Tab.Screen name="Insights" component={InsightsNavigator} />
      <Tab.Screen name="Shared" component={SharedPlansNavigator} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
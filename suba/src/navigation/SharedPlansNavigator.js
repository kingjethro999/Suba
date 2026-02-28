import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SharedPlansScreen from '../features/shared/SharedPlansScreen';
import CreateSharedPlanScreen from '../features/shared/CreateSharedPlanScreen';
import SharedPlanDetailsScreen from '../features/shared/SharedPlanDetailsScreen';

const Stack = createNativeStackNavigator();

export default function SharedPlansNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen 
        name="SharedPlans" 
        component={SharedPlansScreen}
        options={{ title: 'Shared Plans' }}
      />
      <Stack.Screen 
        name="CreateSharedPlan" 
        component={CreateSharedPlanScreen}
        options={{ title: 'Create Shared Plan' }}
      />
      <Stack.Screen 
        name="SharedPlanDetails" 
        component={SharedPlanDetailsScreen}
        options={{ title: 'Plan Details' }}
      />
    </Stack.Navigator>
  );
}
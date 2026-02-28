// suba-frontend/src/navigation/AppNavigator.js
import React, { useContext } from 'react';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { AuthContext } from '../contexts/AuthContext';
import { ActivityIndicator, View } from 'react-native';

export default function AppNavigator() {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}

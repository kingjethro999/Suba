// suba-frontend/src/components/FloatingAddButton.js
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

export default function FloatingAddButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.wrapper} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={['#6D7BFF', '#A46BFF']} style={styles.button}>
        <Ionicons name="add" size={28} color="#fff" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'absolute', bottom: 28, alignSelf: 'center', zIndex: 10 },
  button: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, elevation: 6 },
});
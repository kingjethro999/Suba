// suba-frontend/src/components/SectionHeader.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {actionLabel && (
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={onAction}
          activeOpacity={0.7}
        >
          <Text style={styles.action}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={16} color="#4B5FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 28,
    marginBottom: 8,
  },
  title: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#1F2937' 
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  action: { 
    color: '#4B5FFF', 
    fontWeight: '600',
    fontSize: 14,
  },
});
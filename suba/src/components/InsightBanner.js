// suba-frontend/src/components/InsightBanner.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function InsightBanner({ title = 'Subscription Insight', message, onDetails, onDismiss }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles-outline" size={20} color="#5A4BFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          <Text numberOfLines={2} style={styles.message}>
            {message || 'You could save $5.99/month by switching from Netflix Premium to Netflix Standard.'}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.detailBtn} onPress={onDetails}>
          <Text style={styles.detailText}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss}>
          <Text style={styles.dismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F2F0FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  title: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  message: { color: '#666', fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: 12, gap: 12 },
  detailBtn: { backgroundColor: '#EEF1FF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  detailText: { color: '#4B5FFF', fontWeight: '600' },
  dismissBtn: { backgroundColor: '#F4F4F6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  dismissText: { color: '#333' },
});
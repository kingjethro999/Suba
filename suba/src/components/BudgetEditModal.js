import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BudgetEditModal({ visible, onClose, onSave, initialBudget = 0, currency = 'NGN' }) {
  const [value, setValue] = useState(String(initialBudget || 0));

  useEffect(() => {
    setValue(String(initialBudget || 0));
  }, [initialBudget, visible]);

  const handleSave = () => {
    const n = Number(value);
    if (Number.isNaN(n) || n < 0) return;
    onSave(Number(n.toFixed(2)));
  };

  const symbol = currency === 'NGN' ? '₦' : '$';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Set Monthly Budget</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.symbol}>{symbol}</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="numeric"
              placeholder="0.00"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex:1, backgroundColor:'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center' },
  card: { width:'88%', backgroundColor:'#fff', borderRadius:14, padding:16 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  title: { fontSize:16, fontWeight:'700', color:'#111827' },
  inputRow: { flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#E5E7EB', borderRadius:10, paddingHorizontal:12, paddingVertical:10 },
  symbol: { fontSize:18, fontWeight:'700', color:'#4B5FFF', marginRight:6 },
  input: { flex:1, fontSize:18, fontWeight:'700', color:'#111827' },
  saveBtn: { marginTop:14, backgroundColor:'#4B5FFF', paddingVertical:12, borderRadius:10, alignItems:'center' },
  saveText: { color:'#fff', fontWeight:'700' },
});
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import LogoService from '../../services/LogoService';
import { updateSubscription, getSubscriptionById } from './subscriptionService';

const toDateOnly = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function EditSubscriptionScreen({ route, navigation }) {
  const initialSub = route.params?.subscription || null;
  const subscriptionId = route.params?.subscriptionId || initialSub?.id;

  const [loading, setLoading] = useState(!initialSub);
  const [saving, setSaving] = useState(false);

  const [serviceLogo, setServiceLogo] = useState(null);
  const [suggestedCategories, setSuggestedCategories] = useState([]);
  const [serviceSuggestions, setServiceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showBillingCyclePicker, setShowBillingCyclePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showNextBillingPicker, setShowNextBillingPicker] = useState(false);
  const [showLastPaymentPicker, setShowLastPaymentPicker] = useState(false);

  const [form, setForm] = useState(() => ({
    name: initialSub?.name || '',
    service_provider: initialSub?.service_provider || initialSub?.name || '',
    amount: initialSub?.amount ? String(initialSub.amount) : '',
    currency: initialSub?.currency || 'NGN',
    billing_cycle: initialSub?.billing_cycle || 'monthly',
    next_billing_date: initialSub?.next_billing_date ? new Date(initialSub.next_billing_date) : new Date(),
    last_payment_date: initialSub?.last_payment_date ? new Date(initialSub.last_payment_date) : null,
    category: initialSub?.category || '',
    auto_renew: initialSub?.auto_renew ?? true,
    reminder_days_before: initialSub?.reminder_days_before ?? 3,
    is_shared: initialSub?.is_shared ?? false,
    notes: initialSub?.notes || '',
    cancellation_link: initialSub?.cancellation_link || '',
    logo_url: initialSub?.logo_url || '',
    status: initialSub?.status || 'active', // active | paused | cancelled
  }));

  // Load subscription if only ID was provided
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      if (initialSub) {
        try {
          if (initialSub?.name) {
            const logo = await LogoService.getLogoForSubscription(initialSub.name);
            if (mounted) setServiceLogo(logo);
          }
          const cats = LogoService.getSuggestedCategories(initialSub?.name || '');
          if (mounted) setSuggestedCategories(cats);
        } catch (e) {}
        setLoading(false);
        return;
      }

      // Fetch by ID if we don't have the full object
      if (!subscriptionId) {
        Alert.alert('Error', 'No subscription to edit');
        navigation.goBack();
        return;
      }

      try {
        const sub = await getSubscriptionById(subscriptionId);
        if (!mounted) return;

        setForm({
          name: sub.name || '',
          service_provider: sub.service_provider || sub.name || '',
          amount: sub.amount ? String(sub.amount) : '',
          currency: sub.currency || 'NGN',
          billing_cycle: sub.billing_cycle || 'monthly',
          next_billing_date: sub.next_billing_date ? new Date(sub.next_billing_date) : new Date(),
          last_payment_date: sub.last_payment_date ? new Date(sub.last_payment_date) : null,
          category: sub.category || '',
          auto_renew: sub.auto_renew ?? true,
          reminder_days_before: sub.reminder_days_before ?? 3,
          is_shared: sub.is_shared ?? false,
          notes: sub.notes || '',
          cancellation_link: sub.cancellation_link || '',
          logo_url: sub.logo_url || '',
          status: sub.status || 'active',
        });

        const logo = await LogoService.getLogoForSubscription(sub.name);
        if (mounted) setServiceLogo(logo);
        const cats = LogoService.getSuggestedCategories(sub.name || '');
        if (mounted) setSuggestedCategories(cats);
      } catch (err) {
        console.error('Failed to load subscription:', err);
        Alert.alert('Error', 'Failed to load subscription');
        navigation.goBack();
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [subscriptionId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    // Enhance: update suggestions/logo when name changes
    if (field === 'name') {
      const val = (value || '').trim();
      showServiceSuggestions(val);
      if (val) {
        // categories
        const cats = LogoService.getSuggestedCategories(val);
        setSuggestedCategories(cats);
        if (!form.category && cats.length > 0) {
          setForm((p) => ({ ...p, category: cats[0] }));
        }
        // logo
        LogoService.getLogoForSubscription(val)
          .then(setServiceLogo)
          .catch(() => {});
      } else {
        setServiceLogo(null);
        setSuggestedCategories([]);
      }
    }
  };

  const showServiceSuggestions = (input) => {
    const inputLower = (input || '').toLowerCase().trim();
    if (inputLower.length < 2) {
      setServiceSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const suggestions = Object.keys(LogoService.serviceMap)
      .filter(svc => svc.toLowerCase().includes(inputLower) || inputLower.includes(svc.toLowerCase()))
      .slice(0, 5);
    setServiceSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const selectSuggestion = (suggestion) => {
    handleChange('name', suggestion);
    if (!form.service_provider) handleChange('service_provider', suggestion);
    setShowSuggestions(false);
  };

  const handleAmountChange = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount <= 1) handleChange('amount', cleaned);
  };

  const getCurrencySymbol = () => (form.currency === 'NGN' ? '₦' : '$');
  const getBillingCycleText = useMemo(() => {
    switch (form.billing_cycle) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'Monthly';
    }
  }, [form.billing_cycle]);

  const PickerModal = ({ visible, onClose, title, selectedValue, onValueChange, items }) => (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#4B5FFF" />
            </TouchableOpacity>
          </View>
          <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.modalPicker}>
            {items.map((item) => (
              <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
            ))}
          </Picker>
          <TouchableOpacity onPress={onClose} style={styles.modalDoneButton}>
            <Text style={styles.modalDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const handleSave = async () => {
    if (!subscriptionId) {
      Alert.alert('Error', 'Invalid subscription');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter a service name');
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        service_provider: form.service_provider?.trim() || form.name.trim(),
        category: form.category || LogoService.getCategoryForSubscription(form.name),
        amount: Number(form.amount),
        currency: form.currency,
        billing_cycle: form.billing_cycle, // daily | weekly | monthly | yearly
        next_billing_date: toDateOnly(form.next_billing_date),
        last_payment_date: form.last_payment_date ? toDateOnly(form.last_payment_date) : null,
        auto_renew: !!form.auto_renew,
        reminder_days_before: Number(form.reminder_days_before) || 3,
        is_shared: !!form.is_shared,
        notes: form.notes?.trim() || '',
        cancellation_link: form.cancellation_link?.trim() || '',
        logo_url: form.logo_url?.trim() || '',
        status: form.status || 'active',
      };

      const result = await updateSubscription(subscriptionId, payload);
      if (result?.id || result?.subscription?.id) {
        Alert.alert('Updated', 'Subscription updated successfully ✅', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', 'Failed to update subscription');
      }
    } catch (err) {
      console.error('Update error:', err);
      Alert.alert('Error', err.message || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4B5FFF" />
        <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading subscription...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss(); setShowSuggestions(false); }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Edit Subscription</Text>
            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.formContainer}>
            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Name *</Text>
              <View style={styles.serviceNameContainer}>
                {serviceLogo && (
                  <View style={styles.logoPreview}>
                    <Image source={serviceLogo} style={styles.logoImage} />
                  </View>
                )}
                <View style={[styles.inputContainer, serviceLogo && styles.inputWithLogo]}>
                  <Ionicons name="business-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    placeholder="e.g., Netflix, Spotify, DSTV"
                    placeholderTextColor="#9CA3AF"
                    value={form.name}
                    onChangeText={(val) => handleChange('name', val)}
                    onFocus={() => form.name.length >= 2 && setShowSuggestions(true)}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                </View>
              </View>
              {showSuggestions && serviceSuggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {serviceSuggestions.map((s, idx) => (
                    <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => selectSuggestion(s)}>
                      <Ionicons name="search" size={16} color="#6B7280" />
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Service Provider */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Service Provider</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="storefront-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="Optional (defaults to service name)"
                  placeholderTextColor="#9CA3AF"
                  value={form.service_provider}
                  onChangeText={(val) => handleChange('service_provider', val)}
                  style={styles.input}
                />
              </View>
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Category {form.category && (
                  <Text style={styles.autoDetectedText}>
                    • Suggested: {LogoService.getCategoryForSubscription(form.name)}
                  </Text>
                )}
              </Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCategoryPicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="pricetags-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>{form.category || 'Select / Auto-detected'}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>
            </View>

            {/* Currency */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowCurrencyPicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="cash-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>{form.currency === 'NGN' ? 'Naira (₦)' : 'US Dollar ($)'}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>
            </View>

            {/* Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="card-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={form.amount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <Text style={styles.currencySymbol}>{getCurrencySymbol()}</Text>
              </View>
            </View>

            {/* Billing Cycle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Billing Cycle *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBillingCyclePicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="repeat-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>{getBillingCycleText}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>
            </View>

            {/* Next Billing Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next Billing Date *</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowNextBillingPicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>
                    {form.next_billing_date
                      ? form.next_billing_date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : 'Select date'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>
              {showNextBillingPicker && (
                <DateTimePicker
                  value={form.next_billing_date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date(2000, 0, 1)}
                  onChange={(e, d) => {
                    setShowNextBillingPicker(false);
                    if (d) handleChange('next_billing_date', d);
                  }}
                />
              )}
            </View>

            {/* Last Payment Date (optional) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Payment Date</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowLastPaymentPicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="calendar-number-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>
                    {form.last_payment_date
                      ? form.last_payment_date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                      : 'Not set'}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>
              {showLastPaymentPicker && (
                <DateTimePicker
                  value={form.last_payment_date || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(e, d) => {
                    setShowLastPaymentPicker(false);
                    handleChange('last_payment_date', d || null);
                  }}
                />
              )}
            </View>

            {/* Reminder, Auto-renew, Shared */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reminder & Options</Text>

              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowReminderPicker(true)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="alarm-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>
                    Remind me {form.reminder_days_before} day(s) before
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Ionicons name="refresh-outline" size={20} color="#6B7280" style={styles.toggleIcon} />
                  <Text style={styles.toggleLabel}>Auto Renew</Text>
                </View>
                <Switch
                  value={form.auto_renew}
                  onValueChange={(val) => handleChange('auto_renew', val)}
                  trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                  thumbColor={form.auto_renew ? '#10B981' : '#9CA3AF'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleLabelWrap}>
                  <Ionicons name="people-outline" size={20} color="#6B7280" style={styles.toggleIcon} />
                  <Text style={styles.toggleLabel}>Shared Plan</Text>
                </View>
                <Switch
                  value={form.is_shared}
                  onValueChange={(val) => handleChange('is_shared', val)}
                  trackColor={{ false: '#D1D5DB', true: '#DBEAFE' }}
                  thumbColor={form.is_shared ? '#3B82F6' : '#9CA3AF'}
                />
              </View>
            </View>

            {/* Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Status</Text>
              <TouchableOpacity style={styles.pickerButton} onPress={() => setShowBillingCyclePicker(false)} activeOpacity={0.8}>
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="toggle-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>
                    {form.status === 'active' ? 'Active' : form.status === 'paused' ? 'Paused' : 'Cancelled'}
                  </Text>
                </View>
              </TouchableOpacity>
              {/* Quick status choices */}
              <View style={{ flexDirection: 'row', marginTop: 8, gap: 8 }}>
                {['active', 'paused', 'cancelled'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => handleChange('status', st)}
                    style={[
                      styles.chip,
                      form.status === st && { backgroundColor: '#EEF2FF', borderColor: '#4B5FFF' }
                    ]}
                  >
                    <Text style={{ color: form.status === st ? '#4B5FFF' : '#6B7280', fontWeight: '600' }}>
                      {st[0].toUpperCase() + st.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <View style={[styles.inputContainer, styles.textArea]}>
                <Ionicons name="document-text-outline" size={20} color="#6B7280" style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: 10 }]} />
                <TextInput
                  placeholder="Optional notes (e.g., account email, plan details)"
                  placeholderTextColor="#9CA3AF"
                  value={form.notes}
                  onChangeText={(val) => handleChange('notes', val)}
                  style={[styles.input, { height: 100 }]}
                  multiline
                />
              </View>
            </View>

            {/* Cancellation link */}
            {/* <View style={styles.inputGroup}>
              <Text style={styles.label}>Cancellation Link</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="link-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="https://..."
                  placeholderTextColor="#9CA3AF"
                  value={form.cancellation_link}
                  onChangeText={(val) => handleChange('cancellation_link', val)}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View> */}

            {/* Logo URL */}
            {/* <View style={styles.inputGroup}>
              <Text style={styles.label}>Logo URL</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="image-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="https://... (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={form.logo_url}
                  onChangeText={(val) => handleChange('logo_url', val)}
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View> */}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.9}
          >
            <LinearGradient colors={['#6D7BFF', '#A46BFF']} start={[0, 0]} end={[1, 0]} style={styles.gradient}>
              <Ionicons name={saving ? 'refresh' : 'save-outline'} size={20} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>

      {/* Category Picker */}
      <PickerModal
        visible={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        title="Select Category"
        selectedValue={form.category}
        onValueChange={(value) => handleChange('category', value)}
        items={[
          { label: 'Auto-detected', value: '' },
          ...suggestedCategories.map((cat) => ({ label: cat, value: cat })),
        ]}
      />

      {/* Currency Picker */}
      <PickerModal
        visible={showCurrencyPicker}
        onClose={() => setShowCurrencyPicker(false)}
        title="Select Currency"
        selectedValue={form.currency}
        onValueChange={(value) => handleChange('currency', value)}
        items={[
          { label: 'Naira (₦)', value: 'NGN' },
          { label: 'US Dollar ($)', value: 'USD' },
        ]}
      />

      {/* Billing Cycle Picker */}
      <PickerModal
        visible={showBillingCyclePicker}
        onClose={() => setShowBillingCyclePicker(false)}
        title="Select Billing Cycle"
        selectedValue={form.billing_cycle}
        onValueChange={(value) => handleChange('billing_cycle', value)}
        items={[
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Monthly', value: 'monthly' },
          { label: 'Yearly', value: 'yearly' },
        ]}
      />

      {/* Reminder Days Picker */}
      <PickerModal
        visible={showReminderPicker}
        onClose={() => setShowReminderPicker(false)}
        title="Remind me before"
        selectedValue={form.reminder_days_before}
        onValueChange={(value) => handleChange('reminder_days_before', value)}
        items={[
          { label: '1 day', value: 1 },
          { label: '3 days', value: 3 },
          { label: '5 days', value: 5 },
          { label: '7 days', value: 7 },
          { label: '14 days', value: 14 },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, paddingHorizontal: 5, marginTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: '#F1F5F9' },
  title: { fontSize: 24, fontWeight: '700', color: '#1E293B', textAlign: 'center' },
  headerSpacer: { width: 40 },
  formContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, marginTop: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  autoDetectedText: { fontSize: 14, fontWeight: '400', color: '#6B7280', fontStyle: 'italic' },
  serviceNameContainer: { flexDirection: 'row', alignItems: 'center' },
  logoPreview: {
    width: 50, height: 50, borderRadius: 12, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#E5E7EB',
  },
  logoImage: { width: 30, height: 30, resizeMode: 'contain' },
  inputContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16, minHeight: 56,
  },
  textArea: { alignItems: 'flex-start' },
  inputWithLogo: { flex: 1 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1E293B', paddingVertical: 8 },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#4B5FFF', marginLeft: 8 },
  pickerButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 56,
  },
  pickerButtonContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pickerIcon: { marginRight: 12 },
  pickerButtonText: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginTop: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  suggestionItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  suggestionText: { fontSize: 14, color: '#374151', marginLeft: 8, fontWeight: '500' },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB',
    paddingHorizontal: 16, height: 56, marginTop: 12,
  },
  toggleLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  toggleIcon: { marginRight: 12 },
  toggleLabel: { fontSize: 16, color: '#1E293B', fontWeight: '500' },
  chip: {
    borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, backgroundColor: '#fff',
  },
  button: {
    marginTop: 32, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#6D7BFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  gradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 24 },
  buttonIcon: { marginRight: 8 },
  buttonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: '50%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
  modalCloseButton: { padding: 4 },
  modalPicker: { marginVertical: 20 },
  modalDoneButton: { backgroundColor: '#4B5FFF', marginHorizontal: 24, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  modalDoneText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
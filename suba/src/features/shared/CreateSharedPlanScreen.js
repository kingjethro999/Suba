import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createSharedPlan } from '../../services/sharedPlansService';

export default function CreateSharedPlanScreen({ navigation, route }) {
  const [form, setForm] = useState({
    plan_name: '',
    total_amount: '',
    split_type: 'equal',
    max_participants: '4',
    participant_emails: [''],
  });
  const [loading, setLoading] = useState(false);
  const [showSplitTypePicker, setShowSplitTypePicker] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleParticipantEmailChange = (index, value) => {
    const updatedEmails = [...form.participant_emails];
    updatedEmails[index] = value;
    setForm(prev => ({ ...prev, participant_emails: updatedEmails }));
  };

  const addParticipantField = () => {
    if (form.participant_emails.length < parseInt(form.max_participants) - 1) {
      setForm(prev => ({
        ...prev,
        participant_emails: [...prev.participant_emails, '']
      }));
    }
  };

  const removeParticipantField = (index) => {
    if (form.participant_emails.length > 1) {
      const updatedEmails = form.participant_emails.filter((_, i) => i !== index);
      setForm(prev => ({ ...prev, participant_emails: updatedEmails }));
    }
  };

  const calculateSplitAmount = () => {
    if (!form.total_amount) return '0.00';
    const totalParticipants = form.participant_emails.filter(email => email.trim()).length + 1; // +1 for owner
    const amountPerPerson = parseFloat(form.total_amount) / totalParticipants;
    return amountPerPerson.toFixed(2);
  };

  const handleCreatePlan = async () => {
    // Validate form
    if (!form.plan_name.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (!form.total_amount || parseFloat(form.total_amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid total amount');
      return;
    }

    // Filter out empty emails
    const validEmails = form.participant_emails.filter(email => email.trim());

    // Validate email format for non-empty emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of validEmails) {
      if (!emailRegex.test(email)) {
        Alert.alert('Error', `Please enter a valid email address: ${email}`);
        return;
      }
    }

    setLoading(true);
    try {
      const planData = {
        plan_name: form.plan_name.trim(),
        total_amount: parseFloat(form.total_amount),
        split_type: form.split_type,
        max_participants: parseInt(form.max_participants),
        participant_emails: validEmails,
      };

      console.log('Creating shared plan:', planData);
      const result = await createSharedPlan(planData);
      
      Alert.alert(
        'Success!',
        'Shared plan created successfully! Invitations have been sent to participants.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (route.params?.refreshSharedPlans) {
                route.params.refreshSharedPlans();
              }
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error creating shared plan:', error);
      Alert.alert('Error', 'Failed to create shared plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSplitTypeText = () => {
    return form.split_type === 'equal' ? 'Equal Split' : 'Custom Split';
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Create Shared Plan</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {/* Plan Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Plan Name *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="e.g., Family Netflix, Office Spotify"
                  placeholderTextColor="#9CA3AF"
                  value={form.plan_name}
                  onChangeText={(value) => handleChange('plan_name', value)}
                  style={styles.input}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Total Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Amount *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  value={form.total_amount}
                  onChangeText={(value) => handleChange('total_amount', value.replace(/[^0-9.]/g, ''))}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
                <Text style={styles.currencySymbol}>₦</Text>
              </View>
            </View>

            {/* Split Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Split Type *</Text>
              <TouchableOpacity 
                style={styles.pickerButton}
                onPress={() => setShowSplitTypePicker(!showSplitTypePicker)}
              >
                <View style={styles.pickerButtonContent}>
                  <Ionicons name="pie-chart-outline" size={20} color="#6B7280" style={styles.pickerIcon} />
                  <Text style={styles.pickerButtonText}>{getSplitTypeText()}</Text>
                </View>
                <Ionicons name="chevron-down" size={20} color="#4B5FFF" />
              </TouchableOpacity>

              {showSplitTypePicker && (
                <View style={styles.splitTypeOptions}>
                  <TouchableOpacity 
                    style={[styles.splitOption, form.split_type === 'equal' && styles.splitOptionActive]}
                    onPress={() => {
                      handleChange('split_type', 'equal');
                      setShowSplitTypePicker(false);
                    }}
                  >
                    <Ionicons 
                      name={form.split_type === 'equal' ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={form.split_type === 'equal' ? '#4B5FFF' : '#6B7280'} 
                    />
                    <View style={styles.splitOptionText}>
                      <Text style={styles.splitOptionTitle}>Equal Split</Text>
                      <Text style={styles.splitOptionDescription}>
                        Amount divided equally among all participants
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.splitOption, form.split_type === 'custom' && styles.splitOptionActive]}
                    onPress={() => {
                      handleChange('split_type', 'custom');
                      setShowSplitTypePicker(false);
                    }}
                  >
                    <Ionicons 
                      name={form.split_type === 'custom' ? "radio-button-on" : "radio-button-off"} 
                      size={20} 
                      color={form.split_type === 'custom' ? '#4B5FFF' : '#6B7280'} 
                    />
                    <View style={styles.splitOptionText}>
                      <Text style={styles.splitOptionTitle}>Custom Split</Text>
                      <Text style={styles.splitOptionDescription}>
                        Set custom amounts for each participant
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Max Participants */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Maximum Participants *</Text>
              <View style={styles.participantSelector}>
                {[2, 3, 4, 5, 6].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.participantOption,
                      parseInt(form.max_participants) === num && styles.participantOptionActive
                    ]}
                    onPress={() => handleChange('max_participants', num.toString())}
                  >
                    <Text style={[
                      styles.participantOptionText,
                      parseInt(form.max_participants) === num && styles.participantOptionTextActive
                    ]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Participant Emails */}
            <View style={styles.inputGroup}>
              <View style={styles.participantHeader}>
                <Text style={styles.label}>Invite Participants</Text>
                <Text style={styles.participantSubtitle}>
                  {form.participant_emails.filter(email => email.trim()).length} of {parseInt(form.max_participants) - 1} added
                </Text>
              </View>

              {form.participant_emails.map((email, index) => (
                <View key={index} style={styles.participantInputRow}>
                  <View style={[styles.inputContainer, styles.participantInput]}>
                    <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
                    <TextInput
                      placeholder="participant@email.com"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={(value) => handleParticipantEmailChange(index, value)}
                      style={styles.input}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                  {form.participant_emails.length > 1 && (
                    <TouchableOpacity 
                      style={styles.removeButton}
                      onPress={() => removeParticipantField(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {form.participant_emails.length < parseInt(form.max_participants) - 1 && (
                <TouchableOpacity 
                  style={styles.addButton}
                  onPress={addParticipantField}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#4B5FFF" />
                  <Text style={styles.addButtonText}>Add Participant</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Cost Preview */}
            {form.total_amount && (
              <View style={styles.costPreview}>
                <Text style={styles.costPreviewTitle}>Cost Preview</Text>
                <View style={styles.costBreakdown}>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>Total Amount</Text>
                    <Text style={styles.costValue}>₦{parseFloat(form.total_amount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>Your Share</Text>
                    <Text style={styles.costValue}>₦{calculateSplitAmount()}</Text>
                  </View>
                  <View style={styles.costItem}>
                    <Text style={styles.costLabel}>Each Participant</Text>
                    <Text style={styles.costValue}>₦{calculateSplitAmount()}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Create Button */}
          <TouchableOpacity 
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            onPress={handleCreatePlan}
            disabled={loading}
          >
            <LinearGradient
              colors={['#6D7BFF', '#A46BFF']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.gradient}
            >
              {loading ? (
                <Ionicons name="refresh" size={20} color="#fff" style={styles.buttonIcon} />
              ) : (
                <Ionicons name="people" size={20} color="#fff" style={styles.buttonIcon} />
              )}
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Shared Plan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips for Shared Plans</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>
                Participants will receive email invitations to join
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>
                You can track payments and send reminders
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.tipText}>
                All participants must accept the invitation to join
              </Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 5,
    marginTop: Platform.OS === 'ios' ? 50 : 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1E293B',
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5FFF',
    marginLeft: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    height: 56,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerIcon: {
    marginRight: 12,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  splitTypeOptions: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  splitOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  splitOptionActive: {
    backgroundColor: '#EEF2FF',
  },
  splitOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  splitOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  splitOptionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 18,
  },
  participantSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  participantOption: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantOptionActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4B5FFF',
  },
  participantOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  participantOptionTextActive: {
    color: '#4B5FFF',
  },
  participantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  participantSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  participantInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginTop: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5FFF',
    marginLeft: 8,
  },
  costPreview: {
    backgroundColor: '#F0F4FF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4B5FFF',
  },
  costPreviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  costBreakdown: {
    gap: 8,
  },
  costItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  costValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  createButton: {
    marginTop: 32,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6D7BFF',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsContainer: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    padding: 20,
    marginTop: 32,
    borderLeftWidth: 4,
    borderLeftColor: '#4B5FFF',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});
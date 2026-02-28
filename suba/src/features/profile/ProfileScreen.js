import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { updateUserProfile, uploadUserAvatar, deleteUserAccount } from '../../services/userService';
import { API_URL } from '../../config/api';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useContext(AuthContext);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Store avatar as a string path/url only
  const [avatar, setAvatar] = useState('');

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    country: user?.country || '',
  });

  // Normalize any avatar value to a plain string
  const normalizeAvatar = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object' && val.uri) return String(val.uri);
    return '';
  };

  // Build absolute URL for server paths (/uploads/...)
  const buildAvatarUri = (val) => {
    const s = normalizeAvatar(val);
    if (!s) return '';

    // If already absolute http(s), return as is
    if (/^https?:\/\//i.test(s)) return s;

    // If API_URL includes /api, strip it for static files served from /uploads
    const baseHost = (API_URL || '').replace(/\/api\/?$/, '');
    const normalized = s.startsWith('/') ? s : `/${s}`;
    return `${baseHost}${normalized}`;
  };

  // Sync from context on mount/user change
  useEffect(() => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      country: user?.country || '',
    });
    setAvatar(normalizeAvatar(user?.avatar_url || ''));
  }, [user]);

  // Pick from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission required', 'Allow photo library access to change your profile picture.');
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        await handleAvatarUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Take photo
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        return Alert.alert('Permission required', 'Allow camera access to take a profile picture.');
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled) {
        await handleAvatarUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleAvatarUpload = async (localUri) => {
    setAvatarLoading(true);
    try {
      // uploadUserAvatar returns a string: '/uploads/avatars/...'
      const serverPath = await uploadUserAvatar(localUri);

      // Store normalized string path in state/context
      setAvatar(serverPath);
      updateUser({ ...user, avatar_url: serverPath });

      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setAvatarLoading(false);
    }
  };

  const sanitizePayload = (data) => ({
    full_name: String(data.full_name || '').trim(),
    phone_number: String(data.phone_number || '').trim(),
    country: String(data.country || '').trim(),
  });

  const handleSave = async () => {
    const payload = sanitizePayload(formData);
    if (!payload.full_name) {
      return Alert.alert('Validation', 'Full name is required.');
    }

    setIsLoading(true);
    try {
      const result = await updateUserProfile(payload);
      const updated = result?.user ? result.user : result;
      updateUser({ ...user, ...updated });
      Alert.alert('Success', 'Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await deleteUserAccount();
      Alert.alert('Account deleted', 'Your account has been deleted successfully.');
      logout();
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', error.message || 'Failed to delete account');
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleLogout = useCallback(() => {
    setShowLogoutModal(false);
    logout();
  }, [logout]);

  const handleCancel = () => {
    setFormData({
      full_name: user?.full_name || '',
      email: user?.email || '',
      phone_number: user?.phone_number || '',
      country: user?.country || '',
    });
    // Keep avatar as-is (user didn’t change it)
    setIsEditing(false);
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'Not set';
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return cleaned.replace(/(\d{1})(\d{3})(\d{3})(\d{4})/, '+$1 ($2) $3-$4');
    }
    return String(phone);
  };

  const avatarUri = buildAvatarUri(avatar); // a plain string or ''

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#4B5FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        {isEditing ? (
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#4B5FFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {avatarLoading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator size="large" color="#4B5FFF" />
              </View>
            ) : avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#4B5FFF" />
              </View>
            )}
            {isEditing && !avatarLoading && (
              <TouchableOpacity style={styles.cameraButton} onPress={pickImage}>
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>

          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={16} color="#4B5FFF" />
              <Text style={styles.changePhotoText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.full_name}
                onChangeText={(text) => setFormData({ ...formData, full_name: text })}
                placeholder="Enter your full name"
              />
            ) : (
              <Text style={styles.value}>{user?.full_name || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'Not set'}</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.phone_number}
                onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                maxLength={20}
              />
            ) : (
              <Text style={styles.value}>{formatPhoneNumber(user?.phone_number)}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Country</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={formData.country}
                onChangeText={(text) => setFormData({ ...formData, country: text })}
                placeholder="Enter your country"
              />
            ) : (
              <Text style={styles.value}>{user?.country || 'Not set'}</Text>
            )}
          </View>
        </View>

        {/* Preferences (view only) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Default Currency</Text>
            <Text style={styles.value}>
              {user?.default_currency === 'USD' ? 'US Dollar ($)' : 'Naira (₦)'}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>
              To change your default currency, go to Settings → Preferences.
            </Text>
          </View>
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowLogoutModal(true)}
          >
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Ionicons name="trash-bin-outline" size={22} color="#EF4444" />
            <Text style={[styles.actionText, styles.deleteText]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Suba App v1.0.0</Text>
          <Text style={styles.versionSubtext}>© 2024 Suba</Text>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonTextConfirm}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This action cannot be undone. All your data (including subscriptions) will be permanently deleted.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleDeleteAccount}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... same styles as you posted, unchanged
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
      android: { elevation: 3 },
    }),
  },
  backButton: { padding: 8, borderRadius: 12, backgroundColor: '#EEF2FF' },
  title: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  editButton: { padding: 8, borderRadius: 12, backgroundColor: '#EEF2FF' },
  cancelButton: { padding: 8 },
  cancelText: { color: '#6B7280', fontWeight: '600', fontSize: 16 },
  content: { flex: 1, padding: 20 },
  avatarSection: {
    alignItems: 'center', marginBottom: 30, backgroundColor: '#fff', borderRadius: 20, padding: 24,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#E5E7EB',
  },
  cameraButton: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4B5FFF', width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff',
  },
  userName: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
  userEmail: { fontSize: 16, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
  changePhotoButton: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#EEF2FF', borderRadius: 12, gap: 8 },
  changePhotoText: { color: '#4B5FFF', fontWeight: '600', fontSize: 14 },
  section: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }, android: { elevation: 2 } }),
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#F9FAFB' },
  value: { fontSize: 16, color: '#1F2937', padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4B5FFF', padding: 18,
    borderRadius: 16, gap: 12, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#4B5FFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 4 } }),
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  actionText: { fontSize: 16, fontWeight: '600', marginLeft: 12 },
  logoutText: { color: '#EF4444' },
  deleteText: { color: '#EF4444' },
  versionContainer: { alignItems: 'center', padding: 20, marginBottom: 20 },
  versionText: { fontSize: 14, color: '#6B7280', fontWeight: '600' },
  versionSubtext: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  modalButtonCancel: { backgroundColor: '#F3F4F6' },
  modalButtonConfirm: { backgroundColor: '#EF4444' },
  modalButtonTextCancel: { color: '#374151', fontWeight: '600', fontSize: 16 },
  modalButtonTextConfirm: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
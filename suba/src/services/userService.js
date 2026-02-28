// suba-frontend/src/services/userService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api';

// Upload avatar with better error handling
export const uploadUserAvatar = async (avatarUri) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error('No authentication token found');

    const formData = new FormData();
    formData.append('avatar', { uri: avatarUri, type: 'image/jpeg', name: 'avatar.jpg' });

    const res = await fetch(`${API_URL}/user/avatar`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const responseText = await res.text();
    const data = JSON.parse(responseText);

    if (!res.ok || !data.success) {
      throw new Error(data.message || `Server error: ${res.status}`);
    }

    const avatarUrl = data.avatarUrl || data.avatar_url || data.url;
    if (typeof avatarUrl !== 'string') throw new Error('Invalid avatar URL format received from server');

    return avatarUrl; // return string only
  } catch (error) {
    console.error("❌ Error uploading avatar:", error.message);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}/user/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(profileData),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to update profile");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error updating profile:", error.message);
    throw error;
  }
};

// Delete account
export const deleteUserAccount = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_URL}/user/account`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to delete account");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("❌ Error deleting account:", error.message);
    throw error;
  }
};
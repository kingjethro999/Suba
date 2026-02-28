// suba-frontend/src/services/authService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config/api'; 

// Login
export const loginService = async (email, password) => {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("🔑 Login response:", data);

    if (!res.ok) {
      return { message: data.message || "Login failed" };
    }

    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("user", JSON.stringify(data.user));

    return { token: data.token, user: data.user, message: data.message };
  } catch (err) {
    console.error("❌ Login error:", err.message);
    return { message: "Network error" };
  }
};

// Register
export const registerService = async (formData) => {
  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await res.json();
    console.log("📝 Register response:", data);

    if (!res.ok) {
      return { message: data.message || "Registration failed" };
    }

    // Save token + user just like login
    if (data.token) {
      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
  } catch (err) {
    console.error("❌ Register error:", err.message);
    return { message: "Network error" };
  }
};

// Logout
export const logoutService = async () => {
  await AsyncStorage.removeItem("token");
  await AsyncStorage.removeItem("user");
};

// Get stored user
export const getStoredUser = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    const userString = await AsyncStorage.getItem("user");
    if (!userString) return { token: null, user: null };

    const user = JSON.parse(userString);
    return { token, user };
  } catch (error) {
    console.error('Error getting stored user:', error);
    return { token: null, user: null };
  }
};

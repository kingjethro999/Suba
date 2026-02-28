import axios from 'axios';
import { API_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Ensure base has a single /api suffix
const base = API_URL?.endsWith('/api') ? API_URL : `${API_URL}/api`;

const api = axios.create({
  baseURL: base,
  timeout: 30000, // more time for transactional endpoints
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
      }
    } catch (e) {
      console.error('Error getting auth token:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.config?.url, response.status);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    console.error(
      'API Error:',
      error.config?.url,
      status,
      error.message,
      error.response?.data || ''
    );

    // No 404 coercion here — let callers see real errors.
    if (status === 401) {
      console.log('Unauthorized, redirecting to login...');
      // Optionally trigger logout/navigation here.
    }
    return Promise.reject(error);
  }
);

export default api;
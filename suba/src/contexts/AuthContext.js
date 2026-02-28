// suba-frontend/src/contexts/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import { loginService, registerService, getStoredUser, logoutService } from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const { user: storedUser } = await getStoredUser();
      
      // Ensure user data is properly formatted
      if (storedUser && typeof storedUser === 'object') {
        // If it's an avatar object with uri, ignore it
        if (storedUser.uri && Object.keys(storedUser).length === 1) {
          console.warn('Found avatar object in stored user, ignoring');
          setUser(null);
        } else {
          // Extract only the user properties we expect
          const safeUser = {
            id: storedUser.id || null,
            full_name: storedUser.full_name || '',
            email: storedUser.email || '',
            avatar_url: typeof storedUser.avatar_url === 'string' ? storedUser.avatar_url : null,
            phone_number: storedUser.phone_number || null,
            country: storedUser.country || null,
            default_currency: storedUser.default_currency || 'NGN',
            prefers_dark_mode: storedUser.prefers_dark_mode || false
          };
          setUser(safeUser);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error loading stored user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

const login = async (email, password) => {
  try {
    const result = await loginService(email, password);
    
    if (result.token) {
      // Load the updated user data from storage
      const { user: storedUser } = await getStoredUser();
      if (storedUser) {
        const safeUser = {
          id: storedUser.id || null,
          full_name: storedUser.full_name || '',
          email: storedUser.email || '',
          avatar_url: typeof storedUser.avatar_url === 'string' ? storedUser.avatar_url : null,
          phone_number: storedUser.phone_number || null,
          country: storedUser.country || null,
          default_currency: storedUser.default_currency || 'NGN',
          prefers_dark_mode: storedUser.prefers_dark_mode || false
        };
        setUser(safeUser);
      }
      return result;
    } else {
      return { message: result.message || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { message: 'Login failed. Please try again.' };
  }
};

const register = async (formData) => {
  try {
    const result = await registerService(formData);
    return result;
  } catch (error) {
    console.error('Register error:', error);
    return { message: 'Registration failed. Please try again.' };
  }
};

  const updateUser = (userData) => {
    // Ensure we don't store avatar objects in user context
    if (userData && typeof userData === 'object') {
      // If it's an avatar object with uri, don't update the user
      if (userData.uri && Object.keys(userData).length === 1) {
        console.warn('Attempted to set avatar object as user, ignoring');
        return;
      }
      
      // Extract only the user properties we expect
      const safeUser = {
        id: userData.id || user?.id || null,
        full_name: userData.full_name || user?.full_name || '',
        email: userData.email || user?.email || '',
        avatar_url: typeof userData.avatar_url === 'string' ? userData.avatar_url : user?.avatar_url || null,
        phone_number: userData.phone_number || user?.phone_number || null,
        country: userData.country || user?.country || null,
        default_currency: userData.default_currency || user?.default_currency || 'NGN',
        prefers_dark_mode: userData.prefers_dark_mode || user?.prefers_dark_mode || false
      };
      setUser(safeUser);
    } else {
      setUser(userData);
    }
  };

  const logout = async () => {
    try {
      await logoutService();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      updateUser, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
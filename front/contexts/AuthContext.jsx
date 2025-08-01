// contexts/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { userApi, storageService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(() => 
    storageService.getItem(storageService.keys.USER)
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userInfo) {
      storageService.setItem(storageService.keys.USER, userInfo);
    } else {
      storageService.removeItem(storageService.keys.USER);
    }
  }, [userInfo]);

  const login = async (phone_number) => {
    try {
      setLoading(true);
      setError(null);
      const userData = await userApi.login(phone_number);
      setUserInfo(userData);
      return userData;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      const updatedUser = await userApi.updateProfile(userData);
      setUserInfo(updatedUser);
      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUserInfo(null);
    storageService.clearAll();
  };

  const value = {
    userInfo,
    loading,
    error,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!userInfo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
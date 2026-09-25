import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('bloom_admin_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdminToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await apiRequest('/auth/me');
        if (response.success) {
          setAdmin(response.data);
        } else {
          logout();
        }
      } catch (err) {
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyAdminToken();
  }, [token]);

  const login = async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response.success) {
      const { token: jwtToken, admin: adminData } = response.data;
      localStorage.setItem('bloom_admin_token', jwtToken);
      setToken(jwtToken);
      setAdmin(adminData);
      return response.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('bloom_admin_token');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!admin,
        loading,
        login,
        logout
      }}
    >
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

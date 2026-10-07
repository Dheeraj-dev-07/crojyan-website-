import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'bloom_admin_token';
const REVERIFY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Lightweight JWT payload decoder (no secret required)
 * Decodes the base64-encoded payload portion of JWT string
 */
const decodeJwtPayload = (jwtToken) => {
  if (!jwtToken || typeof jwtToken !== 'string') return null;
  try {
    const parts = jwtToken.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [admin, setAdmin] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [tokenExpiresAt, setTokenExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const expiryTimerRef = useRef(null);
  const intervalRef = useRef(null);

  // Manual or automatic logout
  const logout = () => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    localStorage.removeItem(STORAGE_KEY);
    setAdminToken(null);
    setAdmin(null);
    setIsAdminAuthenticated(false);
    setTokenExpiresAt(null);
  };

  // Confirm token validity with backend GET /api/v1/auth/me
  const verifyTokenWithBackend = async () => {
    try {
      const response = await apiRequest('/auth/me');
      if (response && response.success) {
        setAdmin(response.data);
      } else {
        logout();
      }
    } catch (err) {
      // If 401 or invalid session, immediately purge token & flip auth state
      logout();
    }
  };

  useEffect(() => {
    // Clear any active timers/intervals on token change
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (!adminToken) {
      setAdmin(null);
      setIsAdminAuthenticated(false);
      setTokenExpiresAt(null);
      setLoading(false);
      return;
    }

    const payload = decodeJwtPayload(adminToken);
    if (!payload || !payload.exp) {
      logout();
      setLoading(false);
      return;
    }

    const expiresAtMs = payload.exp * 1000;
    const now = Date.now();

    if (expiresAtMs <= now) {
      // Token is already expired
      logout();
      setLoading(false);
      return;
    }

    // Token is unexpired locally
    setTokenExpiresAt(expiresAtMs);
    setIsAdminAuthenticated(true);

    // 1. Set auto-expiry timer for exact remaining time until token dies
    const remainingMs = expiresAtMs - now;
    expiryTimerRef.current = setTimeout(() => {
      logout();
    }, remainingMs);

    // 2. Immediate backend verification call
    verifyTokenWithBackend().finally(() => {
      setLoading(false);
    });

    // 3. Periodic backend verification every 5 minutes while session is active
    intervalRef.current = setInterval(() => {
      verifyTokenWithBackend();
    }, REVERIFY_INTERVAL_MS);

    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [adminToken]);

  const login = async (email, password) => {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (response && response.success) {
      const { token: jwtToken, admin: adminData } = response.data;
      localStorage.setItem(STORAGE_KEY, jwtToken);
      setAdminToken(jwtToken);
      setAdmin(adminData);
      setIsAdminAuthenticated(true);
      return response.data;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        adminToken,
        token: adminToken,
        isAdminAuthenticated,
        isAuthenticated: isAdminAuthenticated,
        tokenExpiresAt,
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

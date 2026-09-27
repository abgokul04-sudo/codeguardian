import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('codeguardian_token');
    if (!token) {
      setUser(null);
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      const res = await getCurrentUser();
      if (res && res.user) {
        setUser(res.user);
        setStats(res.stats || null);
      } else {
        localStorage.removeItem('codeguardian_token');
        setUser(null);
      }
    } catch (err) {
      console.error('Auth verification failed:', err);
      localStorage.removeItem('codeguardian_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('codeguardian_token', token);
    setUser(userData);
    fetchProfile();
  };

  const logout = () => {
    localStorage.removeItem('codeguardian_token');
    setUser(null);
    setStats(null);
  };

  return (
    <AuthContext.Provider value={{ user, stats, loading, login, logout, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

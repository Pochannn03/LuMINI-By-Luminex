import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Added dynamic backend URL support
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
    try {
      // Updated to use BACKEND_URL
      const response = await axios.get(`${BACKEND_URL}/api/auth/session`, {
          withCredentials: true 
        });

      const data = response.data;
      
      if (data.isAuthenticated) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Session check error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  checkSession();
}, []);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      // Updated to use BACKEND_URL
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
      setUser(null);
    }
  };

  // --- NEW: Function to instantly update user data across the whole app! ---
  const updateUser = (newUserData) => {
    setUser((prevUser) => ({ ...prevUser, ...newUserData }));
  };

  // --- UPDATED: Added updateUser to the Provider value ---
  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// DO NOT REMOVE THE COMMENT BELOW //
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
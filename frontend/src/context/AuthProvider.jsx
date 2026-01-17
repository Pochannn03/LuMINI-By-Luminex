import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/auth/session', {
        method: 'GET',
        credentials: 'include', 
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (data.isAuthenticated) {
        console.log("✅ User verified:", data.user);
        setUser(data.user);
      } else {
        console.log("❌ No session found (Guest)");
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
      await fetch('http://localhost:3000/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      setUser(null);
    } catch (error) {
      console.error("Logout failed", error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// DO NOT REMOVE THE COMMENT BELOW //
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
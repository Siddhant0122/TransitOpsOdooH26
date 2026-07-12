import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";
import { deriveEncryptionKey } from "../services/cryptoService";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  encryptionKey: CryptoKey | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("transitops_token"));
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount or reload
  useEffect(() => {
    async function restoreSession() {
      const savedToken = localStorage.getItem("transitops_token");
      const savedPassphrase = sessionStorage.getItem("transitops_passphrase");
      const savedEmail = sessionStorage.getItem("transitops_email");
      
      if (savedToken) {
        try {
          const userData = await api.getMe();
          setUser(userData);
          
          if (savedPassphrase && savedEmail) {
            const key = await deriveEncryptionKey(savedPassphrase, savedEmail);
            setEncryptionKey(key);
          }
        } catch (error) {
          console.error("Session restoration failed", error);
          logout();
        }
      }
      setLoading(false);
    }
    restoreSession();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await api.login({ email, password });
      localStorage.setItem("transitops_token", data.access_token);
      
      // Derive encryption key client-side and store inputs transiently in sessionStorage
      const key = await deriveEncryptionKey(password, email);
      setEncryptionKey(key);
      sessionStorage.setItem("transitops_passphrase", password);
      sessionStorage.setItem("transitops_email", email);

      setToken(data.access_token);
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("transitops_token");
    sessionStorage.removeItem("transitops_passphrase");
    sessionStorage.removeItem("transitops_email");
    setUser(null);
    setToken(null);
    setEncryptionKey(null);
    setLoading(false);
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, encryptionKey, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

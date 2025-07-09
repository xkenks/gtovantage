'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminUser {
  username: string;
  role: string;
}

interface AdminContextType {
  isAdmin: boolean;
  user: AdminUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // トークンの検証
  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('/api/admin/auth', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(true);
        setUser(data.user);
        setToken(tokenToVerify);
        return true;
      } else {
        // トークンが無効な場合はクリア
        localStorage.removeItem('admin-token');
        setIsAdmin(false);
        setUser(null);
        setToken(null);
        return false;
      }
    } catch (error) {
      console.error('トークン検証エラー:', error);
      localStorage.removeItem('admin-token');
      setIsAdmin(false);
      setUser(null);
      setToken(null);
      return false;
    }
  };

  // 初期化時のトークンチェック
  useEffect(() => {
    const checkStoredToken = async () => {
      const storedToken = localStorage.getItem('admin-token');
      if (storedToken) {
        await verifyToken(storedToken);
      }
      setLoading(false);
    };

    checkStoredToken();
  }, []);

  // ログイン関数
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(true);
        setUser(data.user);
        setToken(data.token);
        localStorage.setItem('admin-token', data.token);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      return false;
    }
  };

  // ログアウト関数
  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem('admin-token');
  };

  return (
    <AdminContext.Provider value={{
      isAdmin,
      user,
      token,
      login,
      logout,
      loading
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 
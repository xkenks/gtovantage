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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    try {
      const response = await fetch('/api/admin/auth', {
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(true);
        setUser(data.user);
        setToken(tokenToVerify);
        return true;
      } else {
        // トークンが無効な場合はクリア
        if (typeof window !== 'undefined') {
          localStorage.removeItem('admin-token');
        }
        setIsAdmin(false);
        setUser(null);
        setToken(null);
        return false;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('トークン検証エラー:', error);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin-token');
      }
      setIsAdmin(false);
      setUser(null);
      setToken(null);
      return false;
    }
  };

  // 初期化時のトークンチェック
  useEffect(() => {
    const checkStoredToken = async () => {
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('admin-token');
        if (storedToken) {
          await verifyToken(storedToken);
        }
      }
      setLoading(false);
    };

    checkStoredToken();
  }, []);

  // ログイン関数
  const login = async (username: string, password: string): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15秒タイムアウト

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ username, password }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(true);
        setUser(data.user);
        setToken(data.token);
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('admin-token', data.token);
        }
        
        return true;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.warn('管理者ログイン失敗:', response.status, errorData);
        return false;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('管理者ログインタイムアウト');
      } else {
        console.error('管理者ログインエラー:', error);
      }
      return false;
    }
  };

  // ログアウト関数
  const logout = () => {
    setIsAdmin(false);
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin-token');
    }
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
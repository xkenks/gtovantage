'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  isMasterUser: boolean;
  subscriptionStatus: 'free' | 'light' | 'premium' | 'master';
  practiceCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isMasterUser: boolean;
  hasActiveSubscription: boolean;
  canPractice: boolean;
  practiceCount: number;
  maxPracticeCount: number;
  incrementPracticeCount: () => void;
  canUseStackSize: (stackSize: string) => boolean;
  getAllowedStackSizes: () => string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ダミーユーザー（常にログイン済み状態）
const dummyUser: User = {
  id: 'dummy',
  email: 'admin@gtovantage.com',
  name: 'Admin',
  createdAt: new Date().toISOString(),
  emailVerified: true,
  isMasterUser: true,
  subscriptionStatus: 'master',
  practiceCount: 0
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // 初期状態をtrueに設定

  // クライアントサイドでのみローカルストレージからログイン状態を復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLoginState = localStorage.getItem('isLoggedIn');
      const sessionLoginState = sessionStorage.getItem('isLoggedIn');
      
      // ローカルストレージまたはセッションストレージにログイン状態がある場合は復元
      if (savedLoginState === 'true' || sessionLoginState === 'true') {
        setIsLoggedIn(true);
        // 両方のストレージに保存
        localStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isLoggedIn', 'true');
      } else if (savedLoginState === null && sessionLoginState === null) {
        // どちらにも値がない場合は、ログイン済み状態を保存
        localStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('isLoggedIn', 'true');
        setIsLoggedIn(true);
      } else {
        setIsLoggedIn(false);
      }
    }
  }, []);

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    return true;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoggedIn(true);
    // ローカルストレージにログイン状態を保存
    if (typeof window !== 'undefined') {
      localStorage.setItem('isLoggedIn', 'true');
      // セッションストレージにも保存（ブラウザを閉じても維持）
      sessionStorage.setItem('isLoggedIn', 'true');
    }
    return true;
  };

  const logout = () => {
    setIsLoggedIn(false);
    // ローカルストレージとセッションストレージからログイン状態を削除
    if (typeof window !== 'undefined') {
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('isLoggedIn');
    }
  };

  const incrementPracticeCount = () => {
    // 何もしない
  };

  const value: AuthContextType = {
    user: isLoggedIn ? dummyUser : null,
    isLoading: false,
    register,
    login,
    logout,
    isAuthenticated: isLoggedIn,
    isEmailVerified: isLoggedIn,
    isMasterUser: isLoggedIn,
    hasActiveSubscription: isLoggedIn,
    canPractice: isLoggedIn,
    practiceCount: 0,
    maxPracticeCount: Infinity,
    incrementPracticeCount,
    canUseStackSize: () => true,
    getAllowedStackSizes: () => ['10BB', '15BB', '20BB', '30BB', '40BB', '50BB', '75BB']
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
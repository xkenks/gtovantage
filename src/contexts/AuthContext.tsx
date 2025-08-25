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

// マスターユーザーのメールアドレス（認証されたユーザーのみアクセス可能）
const MASTER_USER_EMAILS = [
  'admin@gtovantage.com',
  'master@gtovantage.com'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceCount, setPracticeCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('gto-vantage-user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
        } catch (error) {
          console.error('ユーザーデータの読み込みエラー:', error);
          localStorage.removeItem('gto-vantage-user');
        }
      }

      // 今日の練習回数を復元
      const today = new Date().toDateString();
      const savedDate = localStorage.getItem('practiceDate');
      const savedCount = localStorage.getItem('practiceCount');
      
      if (savedDate === today && savedCount) {
        setPracticeCount(parseInt(savedCount, 10));
      } else {
        // 日付が変わった場合は練習回数をリセット
        setPracticeCount(0);
        localStorage.setItem('practiceDate', today);
        localStorage.setItem('practiceCount', '0');
      }

      setIsLoading(false);
    }
  }, []);

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;

      // 既存ユーザーをチェック
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const existingUser = users.find((u: any) => u.email === email);
      
      if (existingUser) {
        throw new Error('このメールアドレスは既に登録されています');
      }

      // 新しいユーザーを作成
      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        isMasterUser: MASTER_USER_EMAILS.includes(email),
        subscriptionStatus: MASTER_USER_EMAILS.includes(email) ? 'master' : 'free',
        practiceCount: 0
      };

      // パスワードハッシュ化（簡易版）
      const hashedPassword = btoa(password + email); // 本番環境では適切なハッシュ化を使用
      
      users.push({ ...newUser, password: hashedPassword });
      localStorage.setItem('gto-vantage-users', JSON.stringify(users));

      // ユーザー情報をセット
      setUser(newUser);
      localStorage.setItem('gto-vantage-user', JSON.stringify(newUser));

      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      if (typeof window === 'undefined') return false;

      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const hashedPassword = btoa(password + email);
      const user = users.find((u: any) => u.email === email && u.password === hashedPassword);

      if (!user) {
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      // ユーザー情報をセット（パスワードは除外）
      const userWithoutPassword = { ...user };
      delete (userWithoutPassword as any).password;
      setUser(userWithoutPassword);
      localStorage.setItem('gto-vantage-user', JSON.stringify(userWithoutPassword));

      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gto-vantage-user');
    }
  };

  const incrementPracticeCount = () => {
    const newCount = practiceCount + 1;
    setPracticeCount(newCount);
    if (typeof window !== 'undefined') {
      localStorage.setItem('practiceCount', newCount.toString());
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    register,
    login,
    logout,
    isAuthenticated: !!user,
    isEmailVerified: user?.emailVerified || false,
    isMasterUser: user?.isMasterUser || false,
    hasActiveSubscription: user?.subscriptionStatus !== 'free' || false,
    canPractice: !!user,
    practiceCount: practiceCount,
    maxPracticeCount: user?.subscriptionStatus === 'master' ? Infinity : 50,
    incrementPracticeCount,
    canUseStackSize: (stackSize: string) => {
      if (!user) return false;
      if (user.subscriptionStatus === 'master') return true;
      if (user.subscriptionStatus === 'premium') return true;
      if (user.subscriptionStatus === 'light') return ['10BB', '15BB', '20BB'].includes(stackSize);
      return stackSize === '20BB'; // free users
    },
    getAllowedStackSizes: () => {
      if (!user) return ['20BB'];
      if (user.subscriptionStatus === 'master' || user.subscriptionStatus === 'premium') {
        return ['10BB', '15BB', '20BB', '30BB', '40BB', '50BB', '75BB'];
      }
      if (user.subscriptionStatus === 'light') {
        return ['10BB', '15BB', '20BB'];
      }
      return ['20BB']; // free users
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
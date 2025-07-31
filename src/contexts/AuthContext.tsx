'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  emailVerified: boolean;
  verificationToken?: string;
  isMasterUser: boolean;
  subscriptionStatus: 'free' | 'light' | 'premium' | 'master';
  subscriptionExpiresAt?: string;
  practiceCount?: number;
  lastPracticeDate?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  verifyEmail: (token: string) => Promise<boolean>;
  resendVerificationEmail: (email: string) => Promise<boolean>;
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

// マスターユーザーのメールアドレスリスト
const MASTER_USER_EMAILS = [
  'admin@gtovantage.com',
  'master@gtovantage.com'
];

// メール確認トークンを生成する関数
const generateVerificationToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初期化時にローカルストレージからユーザー情報を読み込み
  useEffect(() => {
    // マスターアカウントの初期化
    const initializeMasterAccounts = () => {
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      let updated = false;
      
      MASTER_USER_EMAILS.forEach(email => {
        const existingUser = users.find((u: any) => u.email === email);
        if (!existingUser) {
          // マスターアカウントが存在しない場合は作成
          const masterUser = {
            id: `master-${Date.now()}`,
            email,
            name: email === 'admin@gtovantage.com' ? 'Admin' : 'Master',
            password: 'Acs@ef3UR', // マスターアカウントパスワード
            createdAt: new Date().toISOString(),
            emailVerified: true,
            isMasterUser: true,
            subscriptionStatus: 'master',
            subscriptionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString(),
            practiceCount: 0,
            lastPracticeDate: new Date().toISOString()
          };
          users.push(masterUser);
          updated = true;
          console.log(`✅ マスターアカウント初期化: ${email}`);
        }
      });
      
      if (updated) {
        localStorage.setItem('gto-vantage-users', JSON.stringify(users));
        console.log('✅ マスターアカウントの初期化が完了しました');
      } else {
        console.log('ℹ️ マスターアカウントは既に存在しています');
      }
      console.log('📋 現在のユーザーリスト:', users.map((u: any) => ({ email: u.email, isMaster: MASTER_USER_EMAILS.includes(u.email) })));
    };

    // マスターアカウントを初期化
    initializeMasterAccounts();
    
    // マスターアカウントの確認と修正
    const ensureMasterAccounts = () => {
      try {
        const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
        let updated = false;
        let newUsers = [...users];
        
        MASTER_USER_EMAILS.forEach(email => {
          const existingUser = newUsers.find((u: any) => u.email === email);
          if (!existingUser || existingUser.password !== 'Acs@ef3UR') {
            // マスターアカウントが存在しないか、パスワードが間違っている場合は作成/更新
            newUsers = newUsers.filter((u: any) => u.email !== email);
            const masterUser = {
              id: `master-${Date.now()}`,
              email,
              name: email === 'admin@gtovantage.com' ? 'Admin' : 'Master',
              password: 'Acs@ef3UR',
              createdAt: new Date().toISOString(),
              emailVerified: true,
              isMasterUser: true,
              subscriptionStatus: 'master',
              subscriptionExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString(),
              practiceCount: 0,
              lastPracticeDate: new Date().toISOString()
            };
            newUsers.push(masterUser);
            updated = true;
            console.log(`✅ マスターアカウント確保: ${email}`);
          }
        });
        
        if (updated) {
          localStorage.setItem('gto-vantage-users', JSON.stringify(newUsers));
          console.log('✅ マスターアカウントの確保が完了しました');
        }
      } catch (error) {
        console.error('マスターアカウント確保エラー:', error);
      }
    };
    
    // マスターアカウントを確保
    ensureMasterAccounts();

    const savedUser = localStorage.getItem('gto-vantage-user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // 古いユーザーデータの場合は新しい形式に変換
        const updatedUser: User = {
          ...parsedUser,
          emailVerified: parsedUser.emailVerified ?? false,
          isMasterUser: parsedUser.isMasterUser ?? MASTER_USER_EMAILS.includes(parsedUser.email),
          subscriptionStatus: parsedUser.subscriptionStatus ?? 'free',
          subscriptionExpiresAt: parsedUser.subscriptionExpiresAt
        };
        setUser(updatedUser);
        localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('gto-vantage-user');
      }
    }
    setIsLoading(false);
  }, []);

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      // 既存ユーザーのチェック
      const existingUsers = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const existingUser = existingUsers.find((u: any) => u.email === email);
      
      if (existingUser) {
        throw new Error('このメールアドレスは既に登録されています');
      }

      // マスターユーザーかどうかをチェック
      const isMasterUser = MASTER_USER_EMAILS.includes(email);
      const verificationToken = generateVerificationToken();

      // 新しいユーザーを作成
      const newUser: User = {
        id: Date.now().toString(),
        email,
        name,
        createdAt: new Date().toISOString(),
        emailVerified: false,
        verificationToken,
        isMasterUser,
        subscriptionStatus: isMasterUser ? 'master' : 'free',
        subscriptionExpiresAt: isMasterUser ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString() : undefined // マスターユーザーは10年間有効
      };

      // ユーザーリストに追加
      const updatedUsers = [...existingUsers, { ...newUser, password }];
      localStorage.setItem('gto-vantage-users', JSON.stringify(updatedUsers));

      // 現在のユーザーとして設定（メール確認前でもログイン可能）
      setUser(newUser);
      localStorage.setItem('gto-vantage-user', JSON.stringify(newUser));

      // メール確認メールを送信
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            token: verificationToken,
            name
          }),
        });

        if (!response.ok) {
          console.error('Failed to send verification email');
        } else {
          console.log('Verification email sent successfully to:', email);
        }
      } catch (error) {
        console.error('Error sending verification email:', error);
      }

      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log('🔐 ログイン試行:', { email, password: '***' });
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      console.log('📋 登録済みユーザー:', users.map((u: any) => ({ email: u.email, isMaster: MASTER_USER_EMAILS.includes(u.email) })));
      
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (!user) {
        console.log('❌ ユーザーが見つかりません');
        throw new Error('メールアドレスまたはパスワードが正しくありません');
      }

      const { password: _, ...userWithoutPassword } = user;
      
      // マスターユーザーの場合は自動的にメール確認済みにする
      if (MASTER_USER_EMAILS.includes(email) && !userWithoutPassword.emailVerified) {
        userWithoutPassword.emailVerified = true;
        userWithoutPassword.isMasterUser = true;
        userWithoutPassword.subscriptionStatus = 'master';
        userWithoutPassword.subscriptionExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10).toISOString();
        
        // ユーザーリストを更新
        const updatedUsers = users.map((u: any) => 
          u.email === email ? { ...u, ...userWithoutPassword } : u
        );
        localStorage.setItem('gto-vantage-users', JSON.stringify(updatedUsers));
      }

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
    localStorage.removeItem('gto-vantage-user');
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
    try {
      if (!user) return false;

      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === user.email);
      
      if (userIndex === -1) return false;

      const currentUser = users[userIndex];
      if (currentUser.verificationToken !== token) return false;

      // メール確認を完了
      const updatedUser: User = {
        ...user,
        emailVerified: true,
        verificationToken: undefined
      };

      // ユーザーリストを更新
      users[userIndex] = { ...currentUser, emailVerified: true, verificationToken: undefined };
      localStorage.setItem('gto-vantage-users', JSON.stringify(users));

      // 現在のユーザーを更新
      setUser(updatedUser);
      localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));

      return true;
    } catch (error) {
      console.error('Email verification failed:', error);
      return false;
    }
  };

  const resendVerificationEmail = async (email: string): Promise<boolean> => {
    try {
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === email);
      
      if (userIndex === -1) return false;

      const newToken = generateVerificationToken();
      users[userIndex].verificationToken = newToken;
      localStorage.setItem('gto-vantage-users', JSON.stringify(users));

      // 現在のユーザーも更新
      if (user && user.email === email) {
        const updatedUser = { ...user, verificationToken: newToken };
        setUser(updatedUser);
        localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
      }

      // メール確認メールを再送信
      try {
        const response = await fetch('/api/auth/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            token: newToken,
            name: users[userIndex].name
          }),
        });

        if (!response.ok) {
          console.error('Failed to resend verification email');
          return false;
        } else {
          console.log('Verification email resent successfully to:', email);
          return true;
        }
      } catch (error) {
        console.error('Error resending verification email:', error);
        return false;
      }
    } catch (error) {
      console.error('Resend verification email failed:', error);
      return false;
    }
  };

  // 練習回数管理
  const getMaxPracticeCount = (subscriptionStatus: string): number => {
    switch (subscriptionStatus) {
      case 'free': return 5;
      case 'light': return 50;
      case 'premium':
      case 'master': return Infinity;
      default: return 5;
    }
  };

  const resetPracticeCountIfNewDay = () => {
    if (!user) return;
    
    const today = new Date().toDateString();
    const lastPracticeDate = user.lastPracticeDate ? new Date(user.lastPracticeDate).toDateString() : null;
    
    if (lastPracticeDate !== today) {
      const updatedUser = { ...user, practiceCount: 0, lastPracticeDate: new Date().toISOString() };
      setUser(updatedUser);
      localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
      
      // ユーザーリストも更新
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const userIndex = users.findIndex((u: any) => u.email === user.email);
      if (userIndex !== -1) {
        users[userIndex] = updatedUser;
        localStorage.setItem('gto-vantage-users', JSON.stringify(users));
      }
    }
  };

  const incrementPracticeCount = () => {
    if (!user) return;
    
    resetPracticeCountIfNewDay();
    
    const currentCount = user.practiceCount || 0;
    const updatedUser = { ...user, practiceCount: currentCount + 1 };
    setUser(updatedUser);
    localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
    
    // ユーザーリストも更新
    const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === user.email);
    if (userIndex !== -1) {
      users[userIndex] = updatedUser;
      localStorage.setItem('gto-vantage-users', JSON.stringify(users));
    }
  };

  const isAuthenticated = !!user;
  const isEmailVerified = Boolean(user?.emailVerified);
  const isMasterUser = Boolean(user?.isMasterUser);
  const hasActiveSubscription = user?.subscriptionStatus === 'premium' || 
                               user?.subscriptionStatus === 'master' || 
                               Boolean(user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());

  // 練習制限チェック
  resetPracticeCountIfNewDay();
  const maxPracticeCount = getMaxPracticeCount(user?.subscriptionStatus || 'free');
  const practiceCount = user?.practiceCount || 0;
  const canPractice = user?.subscriptionStatus === 'premium' || 
                     user?.subscriptionStatus === 'master' || 
                     practiceCount < maxPracticeCount;

  // スタックサイズ制限機能
  const canUseStackSize = (stackSize: string): boolean => {
    const subscriptionStatus = user?.subscriptionStatus || 'free';
    if (subscriptionStatus === 'premium' || subscriptionStatus === 'master') {
      return true; // プレミアム・マスターは全スタックサイズ使用可能
    }
    if (subscriptionStatus === 'light') {
      return true; // ライトプランも全スタックサイズ使用可能
    }
    // 無料プランは30BBのみ
    return stackSize === '30BB';
  };

  const getAllowedStackSizes = (): string[] => {
    const subscriptionStatus = user?.subscriptionStatus || 'free';
    if (subscriptionStatus === 'premium' || subscriptionStatus === 'master' || subscriptionStatus === 'light') {
      return ['10BB', '15BB', '20BB', '30BB', '40BB', '50BB', '75BB']; // 全スタックサイズ
    }
    return ['30BB']; // 無料プランは30BBのみ
  };

  const value: AuthContextType = {
    user,
    isLoading,
    register,
    login,
    logout,
    isAuthenticated,
    verifyEmail,
    resendVerificationEmail,
    isEmailVerified,
    isMasterUser,
    hasActiveSubscription,
    canPractice,
    practiceCount,
    maxPracticeCount,
    incrementPracticeCount,
    canUseStackSize,
    getAllowedStackSizes
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 
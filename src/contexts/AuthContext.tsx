'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { gtoEvents } from '@/lib/analytics';

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
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  sendVerificationEmail: (email?: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
  upgradeSubscription: (planType: 'light' | 'premium', paymentMethod: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
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

// プレミアムユーザーアカウント
const PREMIUM_ACCOUNTS = [
  {
    email: 'premium@gtovantage.com',
    password: 'RsiKD76',
    name: 'Premium User',
    subscriptionStatus: 'premium' as const
  }
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [practiceCount, setPracticeCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // マスターアカウントとプレミアムアカウントの確保
      const ensureSpecialAccounts = () => {
        try {
          const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
          let updated = false;
          
          // マスターアカウントの確保
          MASTER_USER_EMAILS.forEach(email => {
            const existingUser = users.find((u: any) => u.email === email);
            if (!existingUser) {
              // マスターアカウントが存在しない場合は作成
              const masterUser = {
                id: `master-${Date.now()}`,
                email,
                name: email === 'admin@gtovantage.com' ? 'Admin' : 'Master',
                password: btoa('GTO2024Admin!' + email), // ハッシュ化された形式で保存
                createdAt: new Date().toISOString(),
                emailVerified: true,
                isMasterUser: true,
                subscriptionStatus: 'master',
                practiceCount: 0
              };
              users.push(masterUser);
              updated = true;
              console.log(`✅ マスターアカウント作成: ${email}`);
            } else {
              // 既存のマスターアカウントのパスワードが古い形式の場合、新しい形式に更新
              const oldPasswords = ['Acs@ef3UR', 'admin123', 'GTO2024Admin!'];
              const newHashedPassword = btoa('GTO2024Admin!' + email);
              
              if (oldPasswords.includes(existingUser.password) || existingUser.password !== newHashedPassword) {
                existingUser.password = newHashedPassword;
                existingUser.isMasterUser = true;
                existingUser.subscriptionStatus = 'master';
                existingUser.emailVerified = true;
                updated = true;
                console.log(`🔄 マスターアカウントパスワード更新: ${email}`);
              }
            }
          });

          // プレミアムアカウントの確保
          PREMIUM_ACCOUNTS.forEach(({ email, password, name, subscriptionStatus }) => {
            const existingUser = users.find((u: any) => u.email === email);
            if (!existingUser) {
              // プレミアムアカウントが存在しない場合は作成
              const premiumUser = {
                id: `premium-${Date.now()}`,
                email,
                name,
                password: btoa(password + email), // ハッシュ化された形式で保存
                createdAt: new Date().toISOString(),
                emailVerified: true,
                isMasterUser: false,
                subscriptionStatus,
                practiceCount: 0
              };
              users.push(premiumUser);
              updated = true;
              console.log(`✅ プレミアムアカウント作成: ${email}`);
            } else {
              // 既存のプレミアムアカウントを更新
              const newHashedPassword = btoa(password + email);
              if (existingUser.password !== newHashedPassword || existingUser.subscriptionStatus !== subscriptionStatus) {
                existingUser.password = newHashedPassword;
                existingUser.subscriptionStatus = subscriptionStatus;
                existingUser.emailVerified = true;
                existingUser.name = name;
                updated = true;
                console.log(`🔄 プレミアムアカウント更新: ${email}`);
              }
            }
          });
          
          if (updated) {
            localStorage.setItem('gto-vantage-users', JSON.stringify(users));
            console.log('✅ 特別アカウントの確保が完了しました');
          }
        } catch (error) {
          console.error('特別アカウント確保エラー:', error);
        }
      };

      // 特別アカウントを確保
      ensureSpecialAccounts();

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

      // アナリティクス: 新規登録を追跡
      gtoEvents.register();

      // メール認証がまだの場合は認証メールを送信
      if (!newUser.emailVerified && !MASTER_USER_EMAILS.includes(email)) {
        try {
          await sendVerificationEmail(email);
          console.log('認証メールを送信しました');
        } catch (error) {
          console.error('認証メール送信に失敗しました:', error);
          // 登録は成功したが、メール送信のみ失敗した場合は継続
        }
      }

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

      // アナリティクス: ログインを追跡
      const userType = userWithoutPassword.isMasterUser ? 'master' : 'user';
      gtoEvents.login(userType);

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

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !user) return false;

      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const currentHashedPassword = btoa(currentPassword + user.email);
      const userIndex = users.findIndex((u: any) => u.email === user.email && u.password === currentHashedPassword);

      if (userIndex === -1) {
        throw new Error('現在のパスワードが正しくありません');
      }

      // 新しいパスワードをハッシュ化
      const newHashedPassword = btoa(newPassword + user.email);
      users[userIndex].password = newHashedPassword;
      
      // ローカルストレージを更新
      localStorage.setItem('gto-vantage-users', JSON.stringify(users));

      console.log('パスワードが正常に変更されました');
      return true;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error; // エラーを再スローして呼び出し元で処理
    }
  };

  const sendVerificationEmail = async (email?: string): Promise<boolean> => {
    try {
      const targetEmail = email || user?.email;
      const targetName = user?.name;
      
      if (!targetEmail) {
        throw new Error('メールアドレスが見つかりません');
      }

      const response = await fetch('/api/auth/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メール送信に失敗しました');
      }

      console.log('認証メール送信成功:', data.message);
      
      // 開発環境では認証URLをアラートで表示
      if (process.env.NODE_ENV === 'development' && data.verificationUrl) {
        const copyToClipboard = () => {
          navigator.clipboard.writeText(data.verificationUrl).then(() => {
            alert(`開発環境用: 認証URLをクリップボードにコピーしました\n\n${data.verificationUrl}\n\n新しいタブで開いてください。`);
          }).catch(() => {
            alert(`開発環境用: 以下のURLをコピーして新しいタブで開いてください\n\n${data.verificationUrl}`);
          });
        };
        copyToClipboard();
      }
      
      return true;
    } catch (error) {
      console.error('メール送信失敗:', error);
      throw error;
    }
  };

  const verifyEmail = async (token: string): Promise<boolean> => {
    try {
      // APIエンドポイントでトークンを検証
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'メール認証に失敗しました');
      }

      // ユーザーのメール認証状態を更新
      if (typeof window !== 'undefined') {
        const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === data.email);

        if (userIndex !== -1) {
          users[userIndex].emailVerified = true;
          localStorage.setItem('gto-vantage-users', JSON.stringify(users));

          // 現在のユーザーのメール認証状態を更新
          if (user && user.email === data.email) {
            const updatedUser = { ...user, emailVerified: true };
            setUser(updatedUser);
            localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
          }
        }
      }

      console.log('メール認証が正常に完了しました');
      return true;
    } catch (error) {
      console.error('メール認証失敗:', error);
      throw error;
    }
  };

  const upgradeSubscription = async (planType: 'light' | 'premium', paymentMethod: string): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email,
          planType,
          paymentMethod,
          billingInfo: {
            name: user.name,
            email: user.email
          }
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'サブスクリプションのアップグレードに失敗しました');
      }

      // ローカルでユーザーのサブスクリプション状態を更新
      if (typeof window !== 'undefined') {
        const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === user.email);

        if (userIndex !== -1) {
          users[userIndex].subscriptionStatus = planType;
          localStorage.setItem('gto-vantage-users', JSON.stringify(users));

          // 現在のユーザー情報を更新
          const updatedUser = { ...user, subscriptionStatus: planType };
          setUser(updatedUser);
          localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
        }
      }

      console.log('サブスクリプションアップグレード成功:', data.message);
      return true;
    } catch (error) {
      console.error('サブスクリプションアップグレード失敗:', error);
      throw error;
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    try {
      if (!user) {
        throw new Error('ユーザーがログインしていません');
      }

      const response = await fetch('/api/subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'サブスクリプションのキャンセルに失敗しました');
      }

      // ローカルでユーザーのサブスクリプション状態を更新
      if (typeof window !== 'undefined') {
        const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
        const userIndex = users.findIndex((u: any) => u.email === user.email);

        if (userIndex !== -1) {
          users[userIndex].subscriptionStatus = 'free';
          localStorage.setItem('gto-vantage-users', JSON.stringify(users));

          // 現在のユーザー情報を更新
          const updatedUser = { ...user, subscriptionStatus: 'free' as const };
          setUser(updatedUser);
          localStorage.setItem('gto-vantage-user', JSON.stringify(updatedUser));
        }
      }

      console.log('サブスクリプションキャンセル成功:', data.message);
      return true;
    } catch (error) {
      console.error('サブスクリプションキャンセル失敗:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    register,
    login,
    logout,
    changePassword,
    sendVerificationEmail,
    verifyEmail,
    upgradeSubscription,
    cancelSubscription,
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
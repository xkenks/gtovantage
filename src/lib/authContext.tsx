'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User, 
  UserCredential, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// ユーザータイプの定義
interface User {
  id: string;
  name: string;
  email: string;
  preferences?: {
    difficulty?: 'easy' | 'medium' | 'hard' | 'intermediate';
    theme?: 'light' | 'dark';
  };
  stats?: {
    totalSpots: number;
    correctSpots: number;
    averageEvLoss: number;
    points: number;
  };
}

// ユーザープロファイルの型定義
export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  // プロファイル特有のフィールド
  bio?: string;
  skill_level?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  saved_scenarios?: any[];
  favorite_trainings?: string[];
  completed_lessons?: string[];
  stats?: {
    total_trainings: number;
    correct_answers: number;
    accuracy: number;
    streak: number;
    last_training: Timestamp;
  };
  settings?: {
    dark_mode: boolean;
    notifications: boolean;
    language: string;
  };
};

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

// デフォルト値で認証コンテキストを作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {},
  updateUser: async () => {}
});

// 認証コンテキストのカスタムフック
export const useAuth = () => useContext(AuthContext);

// 認証プロバイダーコンポーネント
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ローカルストレージからユーザー情報を取得
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  // サインイン関数
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      // 実際のアプリケーションでは、ここでAPIリクエストを行います
      // モックデータを使用
      const mockUser: User = {
        id: '1',
        name: 'ユーザー',
        email,
        preferences: {
          difficulty: 'intermediate',
          theme: 'light'
        },
        stats: {
          totalSpots: 100,
          correctSpots: 75,
          averageEvLoss: 1.2,
          points: 850
        }
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('サインインエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // サインアウト関数
  const signOut = async () => {
    try {
      setLoading(true);
      // 実際のアプリケーションでは、ここでAPIリクエストを行います
      setUser(null);
      localStorage.removeItem('user');
    } catch (error) {
      console.error('サインアウトエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // サインアップ関数
  const signUp = async (name: string, email: string, password: string) => {
    try {
      setLoading(true);
      // 実際のアプリケーションでは、ここでAPIリクエストを行います
      // モックデータを使用
      const mockUser: User = {
        id: Date.now().toString(),
        name,
        email,
        preferences: {
          difficulty: 'easy',
          theme: 'light'
        },
        stats: {
          totalSpots: 0,
          correctSpots: 0,
          averageEvLoss: 0,
          points: 0
        }
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('サインアップエラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ユーザー情報更新関数
  const updateUser = async (data: Partial<User>) => {
    try {
      setLoading(true);
      // 実際のアプリケーションでは、ここでAPIリクエストを行います
      if (user) {
        const updatedUser = { ...user, ...data };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('ユーザー更新エラー:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, signUp, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}; 
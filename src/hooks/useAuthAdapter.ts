'use client';

import { useAuth as useLocalAuth } from '@/contexts/AuthContext';
import { useFirebaseAuth } from '@/contexts/FirebaseAuthContext';

// 環境変数でFirebase使用を判定
const useFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE === 'true';

/**
 * 統一されたAuthフック
 * 環境変数に応じて適切なAuthContextを使用
 */
export function useAuth() {
  const localAuth = useLocalAuth();
  const firebaseAuth = useFirebaseAuth();

  // 開発中はlocalAuthを優先、Firebase設定後はfirebaseAuthを使用
  if (useFirebase) {
    try {
      return firebaseAuth;
    } catch (error) {
      console.warn('Firebase Auth使用中にエラー、Local Authにフォールバック:', error);
      return localAuth;
    }
  }

  return localAuth;
}

// 型の統一
export type AuthContextType = ReturnType<typeof useAuth>;

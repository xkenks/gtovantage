// Firebase 設定
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定（開発環境用）
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA954HZC6QOxGCCA3rRPe5C5agZaxYT9Zk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gtovantage-e180c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gtovantage-e180c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "gtovantage-e180c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "405732583730",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:405732583730:web:60a048c6e681e873fc8f2b"
};

// 本番環境ではデバッグログを無効化
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Firebase設定確認:', {
    apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
}

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase サービスのエクスポート
export const auth = getAuth(app);

// Firestoreは一時的に無効化（開発環境での接続エラー回避）
let db: any = null;
try {
  if (process.env.NODE_ENV === 'production') {
    db = getFirestore(app);
  } else {
    console.log('🔄 開発環境: Firestore接続をスキップ');
    // モックオブジェクトを作成
    db = {
      collection: () => ({ doc: () => ({ get: () => Promise.resolve({ exists: () => false }) }) })
    };
  }
} catch (error) {
  console.warn('⚠️ Firestore初期化エラー（認証のみ使用）:', error);
  db = null;
}

export { db };


export default app;

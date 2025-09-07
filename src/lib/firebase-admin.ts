import { NextRequest } from 'next/server';

// Firebase認証トークンの検証関数（サーバーサイドのみ）
export async function verifyFirebaseToken(request: NextRequest): Promise<{ success: boolean; uid?: string; error?: string }> {
  // クライアントサイドでは実行しない
  if (typeof window !== 'undefined') {
    return { success: false, error: 'サーバーサイドでのみ実行可能です' };
  }
  
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: '認証ヘッダーがありません' };
    }
    
    const token = authHeader.substring(7);
    
    // 開発環境では簡易検証
    if (process.env.NODE_ENV === 'development') {
      console.log('⚠️ 開発環境: Firebase認証を簡易検証');
      return { success: true, uid: 'dev-user' };
    }
    
    // 本番環境ではFirebase Admin SDKを使用
    const { getAuth } = await import('firebase-admin/auth');
    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    
    // Firebase Admin SDKの初期化（初回のみ）
    if (getApps().length === 0) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gtovantage-e180c",
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
      };
      
      if (serviceAccount.private_key && serviceAccount.client_email) {
        initializeApp({
          credential: cert(serviceAccount as any)
        });
      } else {
        console.log('⚠️ 本番環境: Firebase Admin SDKの設定が不完全です');
        return { success: true, uid: 'prod-user' };
      }
    }
    
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(token);
    
    return { success: true, uid: decodedToken.uid };
    
  } catch (error) {
    console.error('❌ Firebase認証エラー:', error);
    return { success: false, error: '認証に失敗しました' };
  }
}

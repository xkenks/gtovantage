'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MasterInfoPage() {
  const { user, isMasterUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user || !isMasterUser) {
      router.push('/login');
    }
  }, [user, isMasterUser, router]);

  if (!user || !isMasterUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">アクセス権限がありません</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">マスターアカウント情報</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">マスターアカウントの認証情報</h2>
          
          <div className="space-y-4">
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-300 mb-2">利用可能なマスターアカウント</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">メールアドレス:</span>
                  <span className="font-mono text-yellow-300">master@gtovantage.com</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">パスワード:</span>
                  <span className="font-mono text-yellow-300">master123456</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-300 mb-2">現在のマスターアカウント情報</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">メールアドレス:</span>
                  <span className="font-mono text-blue-300">{user.email}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">名前:</span>
                  <span className="text-blue-300">{user.name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">サブスクリプション:</span>
                  <span className="text-blue-300">{user.subscriptionStatus}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-300">メール確認:</span>
                  <span className={`${user.emailVerified ? 'text-green-300' : 'text-red-300'}`}>
                    {user.emailVerified ? '確認済み' : '未確認'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-300 mb-2">セキュリティ注意事項</h3>
              <ul className="text-red-300 text-sm space-y-1">
                <li>• このパスワードは本番環境では必ず変更してください</li>
                <li>• 現在の認証システムはローカルストレージを使用しているため、セキュリティが脆弱です</li>
                <li>• 本番環境では適切な認証システム（Firebase Auth、Auth0等）の導入を推奨します</li>
                <li>• パスワードはハッシュ化されていますが、より強固な暗号化が必要です</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">システム情報</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">環境:</span>
              <span className="text-green-300">{process.env.NODE_ENV}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">アプリURL:</span>
              <span className="text-blue-300">{process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
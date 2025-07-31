'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState } from 'react';

export default function MyPage() {
  const { user, isEmailVerified, isMasterUser, hasActiveSubscription, practiceCount, maxPracticeCount } = useAuth();
  const [showIconSelector, setShowIconSelector] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState(user?.name?.charAt(0).toUpperCase() || 'U');

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow text-center">
        <p>ログインが必要です。</p>
        <Link href="/login" className="text-blue-600 underline">ログインページへ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダーセクション */}
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">マイページ</h1>
              <p className="text-gray-300 mt-1">アカウント情報と設定を管理</p>
            </div>
            <div className="hidden sm:block relative">
              <div 
                className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
                onClick={() => setShowIconSelector(!showIconSelector)}
              >
                <span className="text-white text-xl font-bold">{selectedIcon}</span>
              </div>
              
              {/* アイコン選択モーダル */}
              {showIconSelector && (
                <div className="absolute right-0 top-20 bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-4 z-10 min-w-[200px]">
                  <h3 className="text-white font-semibold mb-3">アイコンを選択</h3>
                  <div className="grid grid-cols-6 gap-2 mb-3">
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].map((letter) => (
                      <button
                        key={letter}
                        onClick={() => {
                          setSelectedIcon(letter);
                          setShowIconSelector(false);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                          selectedIcon === letter 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between">
                    <button
                      onClick={() => setShowIconSelector(false)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => {
                        setSelectedIcon(user?.name?.charAt(0).toUpperCase() || 'U');
                        setShowIconSelector(false);
                      }}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      リセット
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインコンテンツ */}
          <div className="lg:col-span-2 space-y-6">
            {/* アカウント情報 */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-white mb-4">アカウント情報</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <span className="text-gray-300">ユーザー名</span>
                  <span className="font-medium text-white">{user.name}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <span className="text-gray-300">メールアドレス</span>
                  <span className="font-medium text-white">{user.email}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <span className="text-gray-300">登録日</span>
                  <span className="font-medium text-white">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP') : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <span className="text-gray-300">メール認証</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isEmailVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isEmailVerified ? '認証済み' : '未認証'}
                  </span>
                </div>
              </div>
            </div>

            {/* サブスクリプション情報 */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-white mb-4">サブスクリプション</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-700">
                  <span className="text-gray-300">現在のプラン</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.subscriptionStatus === 'master' 
                      ? 'bg-purple-100 text-purple-800'
                      : user.subscriptionStatus === 'premium'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.subscriptionStatus === 'master' ? 'マスター' : 
                     user.subscriptionStatus === 'premium' ? 'プレミアム' : 'フリー'}
                  </span>
                </div>
                {user.subscriptionExpiresAt && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-700">
                    <span className="text-gray-300">有効期限</span>
                    <span className="font-medium text-white">
                      {new Date(user.subscriptionExpiresAt).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                )}
                <div className="pt-4">
                  <Link 
                    href="/subscription" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    サブスクリプション管理
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-white mb-4">統計情報</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-900 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400">{practiceCount}</div>
                  <div className="text-sm text-gray-300">今日の練習回数</div>
                </div>
                <div className="text-center p-4 bg-green-900 rounded-lg">
                  <div className="text-2xl font-bold text-green-400">{maxPracticeCount === Infinity ? '∞' : maxPracticeCount}</div>
                  <div className="text-sm text-gray-300">1日の上限</div>
                </div>
                <div className="text-center p-4 bg-purple-900 rounded-lg">
                  <div className="text-2xl font-bold text-purple-400">{user?.subscriptionStatus === 'free' ? '無料' : user?.subscriptionStatus === 'light' ? 'ライト' : user?.subscriptionStatus === 'premium' ? 'プレミアム' : 'マスター'}</div>
                  <div className="text-sm text-gray-300">プラン</div>
                </div>
              </div>
            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            {/* クイックアクション */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4">クイックアクション</h3>
              <div className="space-y-3">
                <Link 
                  href="/trainer/mtt" 
                  className="flex items-center w-full p-3 text-left bg-blue-900 hover:bg-blue-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-blue-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  トレーニング開始
                </Link>
                <Link 
                  href="/subscription" 
                  className="flex items-center w-full p-3 text-left bg-green-900 hover:bg-green-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  プラン変更
                </Link>
                <button 
                  onClick={() => window.open('/contact', '_blank')}
                  className="flex items-center w-full p-3 text-left bg-yellow-900 hover:bg-yellow-800 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-yellow-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  お問い合わせ
                </button>
              </div>
            </div>

            {/* アカウント設定 */}
            <div className="bg-gray-800 rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-white mb-4">アカウント設定</h3>
              <div className="space-y-3">
                <button 
                  className="flex items-center w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                  onClick={() => setShowIconSelector(true)}
                >
                  <svg className="w-5 h-5 text-gray-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  アイコン変更
                </button>
                <button className="flex items-center w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  パスワード変更
                </button>
                <button className="flex items-center w-full p-3 text-left bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-300 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  通知設定
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
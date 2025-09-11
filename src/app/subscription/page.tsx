'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import { AuthGuard } from '@/components/AuthGuard';
import { FaArrowLeft, FaCrown, FaCheck, FaTimes, FaCreditCard, FaHistory } from 'react-icons/fa';

export default function SubscriptionPage() {
  const { user, isMasterUser, hasActiveSubscription } = useAuth();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    // 実際の支払い処理はここに実装
    setTimeout(() => {
      alert('支払い処理は実装予定です。現在はデモモードです。');
      setIsUpgrading(false);
    }, 2000);
  };

  const getSubscriptionStatusText = () => {
    if (isMasterUser) return 'マスターユーザー';
    if (user?.subscriptionStatus === 'premium') return 'プレミアム';
    if (user?.subscriptionStatus === 'light') return 'ライト';
    return '無料プラン';
  };

  const getSubscriptionStatusColor = () => {
    if (isMasterUser) return 'text-purple-400';
    if (user?.subscriptionStatus === 'premium') return 'text-yellow-400';
    if (user?.subscriptionStatus === 'light') return 'text-blue-400';
    return 'text-gray-400';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8 md:py-12">
          {/* Header */}
          <div className="mb-8 md:mb-12">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
            >
              <FaArrowLeft className="text-sm" />
              トップページに戻る
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
              サブスクリプション管理
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              現在のプランとサブスクリプション状況を確認できます
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            {/* Current Plan */}
            <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
                現在のプラン
              </h2>
              
              <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {getSubscriptionStatusText()}
                    </h3>
                    <p className={`text-sm ${getSubscriptionStatusColor()}`}>
                      {isMasterUser ? '管理者権限付き' : hasActiveSubscription ? 'プレミアム機能利用可能' : '基本機能のみ'}
                    </p>
                  </div>
                  {isMasterUser && <FaCrown className="text-purple-400 text-2xl" />}
                </div>
                
                {/* 有効期限の表示は現在のダミー実装では非表示 */}
              </div>
            </div>

            {/* Plan Comparison */}
            <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">
                プラン比較
              </h2>
              
              <div className={`grid grid-cols-1 ${isMasterUser ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 md:gap-6`}>
                {/* Free Plan */}
                <div className="bg-gray-700 rounded-lg p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-white mb-2">無料プラン</h3>
                  <p className="text-3xl font-bold text-gray-300 mb-4">¥0<span className="text-sm">/月</span></p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      1日5ハンドまで練習
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      MTTシナリオ（20BB限定）
                    </li>
                  </ul>
                  <div className="text-center">
                    {!hasActiveSubscription && !isMasterUser ? (
                      <span className="text-sm text-gray-400">現在のプラン</span>
                    ) : (
                      <button
                        onClick={() => alert('無料プランへの変更処理を実装予定です')}
                        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300"
                      >
                        始める
                      </button>
                    )}
                  </div>
                </div>

                {/* Light Plan */}
                <div className={`${user?.subscriptionStatus === 'light' ? 'bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-blue-600/50' : (user?.subscriptionStatus === 'premium' || isMasterUser) ? 'bg-gray-700/50 border-gray-600/30' : 'bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border-blue-600/50'} border rounded-lg p-4 md:p-6 relative`}>
                  {user?.subscriptionStatus === 'light' && (
                    <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      アクティブ
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold ${(user?.subscriptionStatus === 'premium' || isMasterUser) && user?.subscriptionStatus !== 'light' ? 'text-gray-400' : 'text-white'} mb-2`}>ライト</h3>
                  <p className={`text-3xl font-bold ${(user?.subscriptionStatus === 'premium' || isMasterUser) && user?.subscriptionStatus !== 'light' ? 'text-gray-500' : 'text-blue-400'} mb-4`}>¥980<span className="text-sm">/月</span></p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      1日50ハンドまで練習
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      すべてのGTOトレーニング
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      無制限のMTTシナリオ
                    </li>
                  </ul>
                  <div className="text-center">
                    {user?.subscriptionStatus === 'light' ? (
                      <span className="text-sm text-blue-400">現在のプラン</span>
                    ) : (
                      <button
                        onClick={() => alert('ライトプランへの変更処理を実装予定です')}
                        disabled={isUpgrading}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300"
                      >
                        {isUpgrading ? '処理中...' : '始める'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Premium Plan */}
                <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border border-yellow-600/50 rounded-lg p-4 md:p-6 relative">
                  {(user?.subscriptionStatus === 'premium' || isMasterUser) && (
                    <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      アクティブ
                    </div>
                  )}
                  <h3 className="text-lg font-semibold text-white mb-2">プレミアム</h3>
                  <p className="text-3xl font-bold text-yellow-400 mb-4">¥1,980<span className="text-sm">/月</span></p>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      1日無制限練習
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      すべてのGTOトレーニング
                    </li>
                    <li className="flex items-center text-sm text-gray-300">
                      <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                      無制限のMTTシナリオ
                    </li>
                  </ul>
                  <div className="text-center">
                    {user?.subscriptionStatus === 'premium' || isMasterUser ? (
                      <span className="text-sm text-yellow-400">現在のプラン</span>
                    ) : (
                      <button
                        onClick={() => alert('プレミアムプランへの変更処理を実装予定です')}
                        disabled={isUpgrading}
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-300"
                      >
                        {isUpgrading ? '処理中...' : '始める'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Master Plan - マスターユーザーのみ表示 */}
                {isMasterUser && (
                  <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-600/50 rounded-lg p-4 md:p-6 relative">
                    <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      マスター
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">マスターユーザー</h3>
                    <p className="text-3xl font-bold text-purple-400 mb-4">管理者専用</p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-300">
                        <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                        すべてのプレミアム機能
                      </li>
                      <li className="flex items-center text-sm text-gray-300">
                        <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                        管理者権限
                      </li>
                      <li className="flex items-center text-sm text-gray-300">
                        <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                        システムレンジ管理
                      </li>
                      <li className="flex items-center text-sm text-gray-300">
                        <FaCheck className="text-green-400 mr-2 flex-shrink-0" />
                        データベース管理
                      </li>
                    </ul>
                    <div className="text-center">
                      <span className="text-sm text-purple-400">現在のプラン</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
                支払い履歴
              </h2>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FaHistory className="text-gray-400 text-4xl mx-auto mb-4" />
                    <p className="text-gray-400">支払い履歴はありません</p>
                    <p className="text-sm text-gray-500 mt-2">
                      プレミアムプランにアップグレードすると、支払い履歴が表示されます
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">
                アカウント情報
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">お名前</label>
                  <p className="text-white">{user?.displayName || 'ユーザー'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">メールアドレス</label>
                  <p className="text-white">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">アカウント作成日</label>
                  <p className="text-white">{user?.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ja-JP') : '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">メール確認状況</label>
                  <p className={`${user?.emailVerified ? 'text-green-400' : 'text-red-400'}`}>
                    {user?.emailVerified ? '確認済み' : '未確認'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 
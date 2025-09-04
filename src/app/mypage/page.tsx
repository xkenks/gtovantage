'use client';

import { useAuth } from '@/contexts/FirebaseAuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PasswordChangeModal from '@/components/PasswordChangeModal';

// 統計データの型定義
interface TrainingStats {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  accuracyRate: number;
  monthlyStats: {
    practiceDays: number;
    totalPractice: number;
    averageAccuracy: number;
    consecutiveCorrect: number;
  };
  monthlyAccuracy: {
    month: string;
    rate: number;
    color: string;
  }[];
}

export default function MyPage() {
  const { user, isEmailVerified, isMasterUser, hasActiveSubscription, practiceCount, maxPracticeCount, subscriptionStatus } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [stats, setStats] = useState<TrainingStats>({
    totalQuestions: 0,
    correctAnswers: 0,
    incorrectAnswers: 0,
    accuracyRate: 0,
    monthlyStats: {
      practiceDays: 0,
      totalPractice: 0,
      averageAccuracy: 0,
      consecutiveCorrect: 0
    },
    monthlyAccuracy: [
      { month: '1月', rate: 0, color: 'bg-gray-500' },
      { month: '2月', rate: 0, color: 'bg-gray-500' },
      { month: '3月', rate: 0, color: 'bg-gray-500' },
      { month: '4月', rate: 0, color: 'bg-gray-500' },
      { month: '5月', rate: 0, color: 'bg-gray-500' },
      { month: '6月', rate: 0, color: 'bg-gray-500' },
      { month: '7月', rate: 0, color: 'bg-gray-500' },
      { month: '8月', rate: 0, color: 'bg-gray-500' }
    ]
  });
  const router = useRouter();

  // 統計データを取得する関数
  const loadTrainingStats = () => {
    if (typeof window !== 'undefined') {
      try {
        // ローカルストレージから統計データを取得
        const savedStats = localStorage.getItem('trainingStats');
        if (savedStats) {
          const parsedStats = JSON.parse(savedStats);
          setStats(parsedStats);
        }
      } catch (error) {
        console.error('統計データの読み込みに失敗しました:', error);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/');
    } else {
      // ユーザーがログインしている場合、統計データを読み込む
      loadTrainingStats();
    }
  }, [user, router]);

  // 統計データを更新する関数（他のコンポーネントから呼び出し可能）
  const updateStats = (newStats: Partial<TrainingStats>) => {
    const updatedStats = { ...stats, ...newStats };
    setStats(updatedStats);
    
    // ローカルストレージに保存
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('trainingStats', JSON.stringify(updatedStats));
      } catch (error) {
        console.error('統計データの保存に失敗しました:', error);
      }
    }
  };

  if (!user) {
    return null;
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
            <div className="hidden sm:block">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-bold">{user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* アカウント情報 */}
          <div className="bg-gray-800 rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-white mb-4">アカウント情報</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">ユーザー名</span>
                <span className="font-medium text-white">{user.displayName || user.email}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">メールアドレス</span>
                <span className="font-medium text-white">{user.email}</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">登録日</span>
                <span className="font-medium text-white">
                  {user.metadata?.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('ja-JP') : '-'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-700">
                <span className="text-gray-300">メール認証</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isEmailVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {isEmailVerified ? '認証済み' : '未認証'}
                  </span>
                  {!isEmailVerified && (
                    <Link 
                      href="/verify-email"
                      className="inline-flex items-center px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      認証する
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-gray-300">パスワード</span>
                <button 
                  onClick={() => setShowPasswordModal(true)}
                  className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  変更
                </button>
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
                  subscriptionStatus === 'master' 
                    ? 'bg-purple-100 text-purple-800'
                    : subscriptionStatus === 'premium'
                    ? 'bg-blue-100 text-blue-800'
                    : subscriptionStatus === 'light'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {subscriptionStatus === 'master' ? 'マスター' : 
                   subscriptionStatus === 'premium' ? 'プレミアム' : 
                   subscriptionStatus === 'light' ? 'ライト' : 'フリー'}
                </span>
              </div>
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
            
            {/* 詳細統計 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">正解統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">総問題数</span>
                    <span className="text-white font-semibold">{stats.totalQuestions > 0 ? stats.totalQuestions : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">正解数</span>
                    <span className="text-green-400 font-semibold">{stats.correctAnswers > 0 ? stats.correctAnswers : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">不正解数</span>
                    <span className="text-red-400 font-semibold">{stats.incorrectAnswers > 0 ? stats.incorrectAnswers : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">正解率</span>
                    <span className="text-blue-400 font-semibold">{stats.accuracyRate > 0 ? `${stats.accuracyRate}%` : '--'}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">今月の統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">練習日数</span>
                    <span className="text-white font-semibold">{stats.monthlyStats.practiceDays > 0 ? stats.monthlyStats.practiceDays : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">総練習回数</span>
                    <span className="text-green-400 font-semibold">{stats.monthlyStats.totalPractice > 0 ? stats.monthlyStats.totalPractice : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">平均正解率</span>
                    <span className="text-blue-400 font-semibold">{stats.monthlyStats.averageAccuracy > 0 ? `${stats.monthlyStats.averageAccuracy}%` : '--'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">連続正解</span>
                    <span className="text-purple-400 font-semibold">{stats.monthlyStats.consecutiveCorrect > 0 ? stats.monthlyStats.consecutiveCorrect : '--'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 月別正解率グラフ */}
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">月別正解率推移</h3>
              <div className="space-y-3">
                {stats.monthlyAccuracy.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <span className="text-gray-300 w-8 text-sm">{item.month}</span>
                    <div className="flex-1 bg-gray-600 rounded-full h-3">
                      <div 
                        className={`${item.color} h-3 rounded-full transition-all duration-300`}
                        style={{ width: `${item.rate}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-semibold w-12 text-sm">{item.rate}%</span>
                  </div>
                ))}
              </div>
              {stats.monthlyAccuracy.every(item => item.rate === 0) && (
                <div className="mt-4 text-center">
                  <p className="text-gray-400 text-sm">データがありません。トレーニングを開始してデータを蓄積しましょう。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* パスワード変更モーダル */}
      <PasswordChangeModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
} 
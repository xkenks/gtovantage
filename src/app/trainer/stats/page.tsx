'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { FaChartBar, FaCheckCircle, FaTimesCircle, FaClock, FaTrophy, FaArrowUp, FaArrowDown } from 'react-icons/fa';

// サンプルのトレーニング統計データ
interface TrainingStats {
  total_trainings: number;
  correct_answers: number;
  accuracy_rate: number;
  streak: number;
  favorite_spots: string[];
  time_spent: number; // 分単位
  last_training_date: string; // ISO形式の日付文字列
  level_progress: number; // 0-100のパーセンテージ
  weak_areas: {
    name: string;
    accuracy: number;
  }[];
  strong_areas: {
    name: string;
    accuracy: number;
  }[];
  recent_trainings: {
    date: string;
    spot_name: string;
    correct: boolean;
  }[];
}

// サンプルデータ
const sampleUserStats: TrainingStats = {
  total_trainings: 157,
  correct_answers: 103,
  accuracy_rate: 65.6,
  streak: 7,
  favorite_spots: ['SB vs BB 3-Bet Pot', 'CO vs BTN Single Raised Pot', 'UTG vs BB Defense'],
  time_spent: 780, // 13時間
  last_training_date: '2023-04-15T18:30:00Z',
  level_progress: 68,
  weak_areas: [
    { name: '3-ベットポット', accuracy: 42 },
    { name: 'マルチウェイポット', accuracy: 48 },
    { name: 'ショートスタックプレイ', accuracy: 55 }
  ],
  strong_areas: [
    { name: 'シングルレイズポット', accuracy: 82 },
    { name: 'ヘッズアップポット', accuracy: 76 },
    { name: 'ポジションプレイ', accuracy: 74 }
  ],
  recent_trainings: [
    { date: '2023-04-15T18:30:00Z', spot_name: 'SB vs BB 3-Bet Pot', correct: true },
    { date: '2023-04-15T18:25:00Z', spot_name: 'CO vs BTN Single Raised Pot', correct: true },
    { date: '2023-04-15T18:20:00Z', spot_name: 'UTG vs BB Defense', correct: false },
    { date: '2023-04-15T18:15:00Z', spot_name: 'BTN vs BB 3-Bet Pot', correct: true },
    { date: '2023-04-15T18:10:00Z', spot_name: 'CO vs SB 3-Bet Pot', correct: true }
  ]
};

export default function TrainerStatsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // 状態管理
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [timeFrame, setTimeFrame] = useState<'all' | 'month' | 'week'>('all');
  
  // 初期化処理
  useEffect(() => {
    if (!loading && !user) {
      // ログインしていない場合はログインページへリダイレクト
      router.push('/auth');
    } else if (!loading && user) {
      // ここで実際にはFirebaseからデータを取得するが、サンプルデータを使用
      setStats(sampleUserStats);
    }
  }, [loading, user, router]);
  
  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 時間をフォーマット（分→時間と分）
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}時間${mins}分`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  if (!stats) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300">統計情報を読み込めませんでした。</p>
          <button 
            onClick={() => router.push('/trainer')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            トレーニングに戻る
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">トレーニング統計</h1>
            
            <div className="mt-3 sm:mt-0 flex space-x-2">
              <button 
                onClick={() => setTimeFrame('all')}
                className={`px-3 py-1 rounded ${
                  timeFrame === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                全期間
              </button>
              <button 
                onClick={() => setTimeFrame('month')}
                className={`px-3 py-1 rounded ${
                  timeFrame === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                月間
              </button>
              <button 
                onClick={() => setTimeFrame('week')}
                className={`px-3 py-1 rounded ${
                  timeFrame === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                週間
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 総トレーニング数 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                  <FaChartBar className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">総トレーニング数</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_trainings}</p>
                </div>
              </div>
            </div>
            
            {/* 正解率 */}
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-300">
                  <FaCheckCircle className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">正解率</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.accuracy_rate}%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {stats.correct_answers} / {stats.total_trainings}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 学習時間 */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-300">
                  <FaClock className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">学習時間</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatTime(stats.time_spent)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    最終学習: {formatDate(stats.last_training_date)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* 現在の連続正解数 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300">
                  <FaTrophy className="text-xl" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">連続正解</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.streak}回</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    レベル進捗: {stats.level_progress}%
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* 弱点エリア */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-red-600 dark:text-red-400 flex items-center">
                  <FaArrowDown className="mr-2" /> 弱点エリア
                </h3>
              </div>
              <div className="p-4">
                <ul className="space-y-3">
                  {stats.weak_areas.map((area, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{area.name}</span>
                      <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded text-xs">
                        正解率 {area.accuracy}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* 得意エリア */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-green-600 dark:text-green-400 flex items-center">
                  <FaArrowUp className="mr-2" /> 得意エリア
                </h3>
              </div>
              <div className="p-4">
                <ul className="space-y-3">
                  {stats.strong_areas.map((area, index) => (
                    <li key={index} className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">{area.name}</span>
                      <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                        正解率 {area.accuracy}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* 最近のトレーニング */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
              <h3 className="font-medium text-gray-700 dark:text-gray-300">最近のトレーニング</h3>
            </div>
            <div className="p-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        日時
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        スポット
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        結果
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {stats.recent_trainings.map((training, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {formatDate(training.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                          {training.spot_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {training.correct ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 flex items-center w-16">
                              <FaCheckCircle className="mr-1" /> 正解
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 flex items-center w-16">
                              <FaTimesCircle className="mr-1" /> 不正解
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => router.push('/trainer')}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              トレーニングに戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
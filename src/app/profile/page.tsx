'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { FaEdit, FaSave, FaTimes, FaChartLine, FaHeart, FaBookmark, FaCog } from 'react-icons/fa';

export default function ProfilePage() {
  const router = useRouter();
  const { user, userProfile, updateUserProfile, loading } = useAuth();
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    skill_level: '',
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // ユーザー情報が読み込まれたらフォームに設定
  useEffect(() => {
    if (!loading && !user) {
      // 未ログイン時はログインページへリダイレクト
      router.push('/auth');
    }
    
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        skill_level: userProfile.skill_level || 'beginner',
      });
    }
  }, [loading, user, userProfile, router]);
  
  // プロフィール更新処理
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateLoading(true);
    
    try {
      await updateUserProfile({
        displayName: formData.displayName,
        bio: formData.bio,
        skill_level: formData.skill_level as any,
      });
      
      setEditMode(false);
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
    } finally {
      setUpdateLoading(false);
    }
  };
  
  // フォーム入力処理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  // キャンセル処理
  const handleCancel = () => {
    // 編集前の値に戻す
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        bio: userProfile.bio || '',
        skill_level: userProfile.skill_level || 'beginner',
      });
    }
    setEditMode(false);
  };
  
  // ローディング中
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
  
  // ユーザープロファイルがない場合
  if (!userProfile) {
    return null; // リダイレクト処理中は何も表示しない
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* プロフィールヘッダー */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-8">
          <div className="bg-blue-600 h-32 relative"></div>
          <div className="px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center -mt-12 relative">
            <div className="w-24 h-24 rounded-full bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-700 overflow-hidden flex justify-center items-center text-2xl text-blue-500 font-bold">
              {userProfile.photoURL ? (
                <img src={userProfile.photoURL} alt={userProfile.displayName || ''} className="w-full h-full object-cover" />
              ) : (
                <span>{userProfile.displayName?.charAt(0).toUpperCase() || '?'}</span>
              )}
            </div>
            
            <div className="ml-0 sm:ml-4 mt-4 sm:mt-0 flex-grow">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                {userProfile.displayName}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {userProfile.email}
              </p>
              {userProfile.skill_level && (
                <span className="inline-block mt-1 px-2 py-1 text-xs rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {userProfile.skill_level === 'beginner' && '初心者'}
                  {userProfile.skill_level === 'intermediate' && '中級者'}
                  {userProfile.skill_level === 'advanced' && '上級者'}
                  {userProfile.skill_level === 'professional' && 'プロフェッショナル'}
                </span>
              )}
            </div>
            
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="absolute top-20 right-6 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600"
              >
                <FaEdit />
              </button>
            )}
          </div>
          
          {/* プロフィール情報 */}
          {!editMode ? (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">自己紹介</h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                {userProfile.bio || 'まだ自己紹介は設定されていません。'}
              </p>
            </div>
          ) : (
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
              <form onSubmit={handleUpdateProfile}>
                <div className="mb-4">
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ユーザー名
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="input"
                    required
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    自己紹介
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="input"
                    placeholder="あなた自身について教えてください"
                  />
                </div>
                
                <div className="mb-4">
                  <label htmlFor="skill_level" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    スキルレベル
                  </label>
                  <select
                    id="skill_level"
                    name="skill_level"
                    value={formData.skill_level}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="beginner">初心者</option>
                    <option value="intermediate">中級者</option>
                    <option value="advanced">上級者</option>
                    <option value="professional">プロフェッショナル</option>
                  </select>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none"
                  >
                    <FaTimes className="inline mr-1" />
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                  >
                    {updateLoading ? (
                      <span>保存中...</span>
                    ) : (
                      <>
                        <FaSave className="inline mr-1" />
                        保存
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        
        {/* 追加セクション */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 統計情報 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaChartLine className="text-blue-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">トレーニング統計</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">トレーニング回数</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userProfile.stats?.total_trainings || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">正解率</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userProfile.stats?.accuracy || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">最高連続正解</span>
                <span className="font-semibold text-gray-900 dark:text-white">{userProfile.stats?.streak || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">最終トレーニング</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {userProfile.stats?.last_training ? new Date(userProfile.stats.last_training.toDate()).toLocaleDateString('ja-JP') : 'なし'}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={() => router.push('/trainer')}
                className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                トレーニングを始める
              </button>
            </div>
          </div>
          
          {/* お気に入りトレーニング */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaHeart className="text-blue-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">お気に入りトレーニング</h2>
            </div>
            
            {userProfile.favorite_trainings && userProfile.favorite_trainings.length > 0 ? (
              <ul className="space-y-2">
                {userProfile.favorite_trainings.map((training, index) => (
                  <li key={index} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 py-2">
                    <a href={`/trainer/${training}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                      {training}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                お気に入りのトレーニングはまだありません。トレーニングページからお気に入り登録できます。
              </p>
            )}
          </div>
          
          {/* カスタムスポット */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaBookmark className="text-blue-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">保存したカスタムスポット</h2>
            </div>
            
            {userProfile.saved_scenarios && userProfile.saved_scenarios.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">名前</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ポジション</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">アクション</th>
                      <th className="text-left py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">作成日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProfile.saved_scenarios.map((scenario, index) => (
                      <tr 
                        key={index} 
                        className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={() => router.push(`/custom-spots?id=${scenario.id}`)}
                      >
                        <td className="py-2 text-sm text-gray-900 dark:text-white">{scenario.name}</td>
                        <td className="py-2 text-sm text-gray-600 dark:text-gray-300">{scenario.position}</td>
                        <td className="py-2 text-sm text-gray-600 dark:text-gray-300">{scenario.action}</td>
                        <td className="py-2 text-sm text-gray-600 dark:text-gray-300">
                          {scenario.createdAt ? new Date(scenario.createdAt.toDate()).toLocaleDateString('ja-JP') : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">
                保存したカスタムスポットはまだありません。カスタムスポットページで作成できます。
              </p>
            )}
            
            <div className="mt-6 text-center">
              <a 
                href="/custom-spots"
                className="inline-block px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
              >
                カスタムスポットを作成
              </a>
            </div>
          </div>
          
          {/* 設定 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <FaCog className="text-blue-500 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">アカウント設定</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">メール通知</span>
                <button className={`w-12 h-6 rounded-full ${userProfile.settings?.notifications ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'} transition-colors duration-200 flex items-center ${userProfile.settings?.notifications ? 'justify-end' : 'justify-start'} p-0.5`}>
                  <span className="bg-white h-5 w-5 rounded-full shadow-md"></span>
                </button>
              </div>
              
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm">
                  パスワードを変更
                </button>
              </div>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <button className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm">
                  アカウントを削除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
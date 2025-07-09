'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FaEdit, FaTrash, FaSearch, FaSort, FaEye, FaArrowLeft } from 'react-icons/fa';

// カスタムパラメータの型
type CustomParameter = {
  name: string;
  value: string | number;
};

// シナリオの型
type CustomScenario = {
  id: string;
  name: string;
  position: string;
  action: string;
  stack: number;
  pot: number;
  customParameters: CustomParameter[];
  handEvaluation?: any;
  createdAt: Timestamp;
};

export default function SavedCustomSpotsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  
  // 状態管理
  const [scenarios, setScenarios] = useState<CustomScenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof CustomScenario>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<CustomScenario | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // ユーザー認証とシナリオの読み込み
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
        return;
      }
      
      loadScenarios();
    }
  }, [loading, user, router]);
  
  // シナリオ読み込み
  const loadScenarios = async () => {
    if (!user) return;
    
    setLoadingScenarios(true);
    setError(null);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const savedScenarios = userData.saved_scenarios || [];
        setScenarios(savedScenarios);
      } else {
        setScenarios([]);
      }
    } catch (err) {
      console.error('シナリオ読み込みエラー:', err);
      setError('保存されたシナリオの読み込み中にエラーが発生しました。');
    } finally {
      setLoadingScenarios(false);
    }
  };
  
  // 削除確認ダイアログの表示
  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };
  
  // シナリオ削除
  const deleteScenario = async (id: string) => {
    if (!user) return;
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const updatedScenarios = (userData.saved_scenarios || []).filter(
          (s: any) => s.id !== id
        );
        
        await updateDoc(userDocRef, {
          saved_scenarios: updatedScenarios
        });
        
        // 状態を更新
        setScenarios(updatedScenarios);
        setShowDeleteConfirm(false);
        setDeletingId(null);
      }
    } catch (err) {
      console.error('シナリオ削除エラー:', err);
      setError('シナリオの削除中にエラーが発生しました。');
    }
  };
  
  // シナリオ詳細表示
  const viewScenarioDetails = (scenario: CustomScenario) => {
    setSelectedScenario(scenario);
    setShowDetails(true);
  };
  
  // シナリオ編集
  const editScenario = (id: string) => {
    router.push(`/custom-spots?id=${id}`);
  };
  
  // ソート処理
  const handleSort = (field: keyof CustomScenario) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };
  
  // フィルタリングとソート
  const filteredAndSortedScenarios = scenarios
    .filter(scenario => 
      scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scenario.action.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // 特別なケース：createdAtの場合、Timestampとして扱う
      if (sortField === 'createdAt') {
        const timeA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return sortAsc ? timeA - timeB : timeB - timeA;
      }
      
      // 通常のケース
      if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
      return 0;
    });
  
  // ローディング表示
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
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/custom-spots')}
                className="mr-4 hover:bg-blue-700 p-2 rounded-full"
              >
                <FaArrowLeft />
              </button>
              <h1 className="text-xl font-bold">保存したカスタムスポット</h1>
            </div>
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-blue-700 text-white rounded-md border border-blue-500 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white"
              />
            </div>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-6 p-4 rounded-md bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
            
            {loadingScenarios ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-4 text-gray-700 dark:text-gray-300">シナリオを読み込み中...</p>
              </div>
            ) : filteredAndSortedScenarios.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center">
                          シナリオ名
                          {sortField === 'name' && (
                            <FaSort className="ml-1 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('position')}
                      >
                        <div className="flex items-center">
                          ポジション
                          {sortField === 'position' && (
                            <FaSort className="ml-1 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('action')}
                      >
                        <div className="flex items-center">
                          アクション
                          {sortField === 'action' && (
                            <FaSort className="ml-1 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th 
                        scope="col" 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center">
                          作成日
                          {sortField === 'createdAt' && (
                            <FaSort className="ml-1 text-gray-400" />
                          )}
                        </div>
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        アクション
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedScenarios.map((scenario) => (
                      <tr key={scenario.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {scenario.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {scenario.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {scenario.action}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {scenario.createdAt ? new Date(scenario.createdAt.toDate()).toLocaleDateString('ja-JP') : '不明'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => viewScenarioDetails(scenario)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                            title="詳細を表示"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => editScenario(scenario.id)}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-3"
                            title="編集"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => confirmDelete(scenario.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                            title="削除"
                          >
                            <FaTrash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  保存されたカスタムスポットはまだありません。
                </p>
                <button
                  onClick={() => router.push('/custom-spots')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  新しいカスタムスポットを作成
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">シナリオを削除しますか？</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              この操作は元に戻せません。本当にこのカスタムスポットを削除しますか？
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                キャンセル
              </button>
              <button
                onClick={() => deletingId && deleteScenario(deletingId)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 詳細表示モーダル */}
      {showDetails && selectedScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                {selectedScenario.name}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                <FaTrash className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ポジション</p>
                <p className="text-gray-900 dark:text-white">{selectedScenario.position}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">アクション</p>
                <p className="text-gray-900 dark:text-white">{selectedScenario.action}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">スタック (BB)</p>
                <p className="text-gray-900 dark:text-white">{selectedScenario.stack}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ポットサイズ (BB)</p>
                <p className="text-gray-900 dark:text-white">{selectedScenario.pot}</p>
              </div>
            </div>
            
            {selectedScenario.customParameters && selectedScenario.customParameters.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">カスタムパラメータ</p>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  {selectedScenario.customParameters.map((param, index) => (
                    <div key={index} className="flex justify-between mb-2 last:mb-0">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{param.name}:</span>
                      <span className="text-gray-600 dark:text-gray-400">{param.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">作成日</p>
              <p className="text-gray-900 dark:text-white">
                {selectedScenario.createdAt ? new Date(selectedScenario.createdAt.toDate()).toLocaleString('ja-JP') : '不明'}
              </p>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDetails(false);
                  editScenario(selectedScenario.id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                編集
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
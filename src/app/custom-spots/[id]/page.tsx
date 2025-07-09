'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { FaChevronLeft, FaEdit, FaTrash, FaPlay } from 'react-icons/fa';
import { PokerCardList } from '@/components/PokerCard';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// スポットのタイプ定義
interface CustomParameter {
  name: string;
  value: string;
}

interface CustomSpot {
  id: string;
  name: string;
  position: string;
  action: string;
  stack: number;
  pot: number;
  customParameters: CustomParameter[];
  notes?: string;
  created: string;
  updated?: string;
  board?: string[];
  ranges?: {
    [key: string]: string[];
  };
}

export default function SpotDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [spot, setSpot] = useState<CustomSpot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'ranges'>('details');
  const [activeRange, setActiveRange] = useState<string | null>(null);

  // スポットの読み込み
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
      return;
    }

    if (!loading && user && params.id) {
      loadSpot();
    }
  }, [loading, user, params.id, router]);

  // スポットをFirestoreから読み込み
  const loadSpot = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 実際のFirebase Firestoreからデータを取得する代わりに、サンプルデータを使用
      // const spotRef = doc(collection(db, 'users', user!.uid, 'customSpots'), params.id);
      // const spotSnapshot = await getDoc(spotRef);
      
      // if (spotSnapshot.exists()) {
      //   setSpot({ id: spotSnapshot.id, ...spotSnapshot.data() } as CustomSpot);
      // } else {
      //   setError('スポットが見つかりませんでした');
      // }

      // サンプルデータ
      const sampleSpot: CustomSpot = {
        id: params.id,
        name: 'BTN vs BB 3-Bet Pot',
        position: 'BTN',
        action: 'Call 3-bet',
        stack: 100,
        pot: 21.5,
        customParameters: [
          { name: '相手ポジション', value: 'BB' },
          { name: '3ベットサイズ', value: '10BB' },
          { name: 'フロップ', value: 'A♠ K♦ 2♣' }
        ],
        notes: 'BBからの3ベットに対してBTNがコールした場合の戦略。Aハイフロップでのプレイに注意が必要。',
        created: new Date(2023, 3, 10).toISOString(),
        updated: new Date(2023, 3, 15).toISOString(),
        board: ['As', 'Kd', '2c'],
        ranges: {
          'BTN Call Range': ['AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A5s', 'A4s', 'A3s', 'A2s', 'KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'T9s', '98s', '87s', '76s', '65s', '54s', 'AKo', 'AQo', 'KQo'],
          'BB 3-Bet Range': ['AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'QJs', 'JTs', 'AKo', 'AQo', 'AJo', 'KQo'],
          'BTN Check Range': ['A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'K9s', 'K8s', 'K7s', 'KQo', 'KJo', 'QJo'],
          'BTN Bet Range': ['AKs', 'AQs', 'AJs', 'ATs', 'KQs', 'KJs', 'KTs', 'AKo', 'AQo', 'AJo', 'ATo']
        }
      };
      
      setSpot(sampleSpot);
    } catch (err) {
      console.error('Error loading spot:', err);
      setError('スポットの読み込み中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // スポットの削除
  const handleDelete = async () => {
    if (!confirm('このスポットを削除してもよろしいですか？')) {
      return;
    }

    try {
      // 実装する場合はFirebaseからデータを削除
      // await deleteDoc(doc(collection(db, 'users', user!.uid, 'customSpots'), params.id));
      router.push('/custom-spots/saved');
    } catch (err) {
      console.error('Error deleting spot:', err);
      alert('スポットの削除中にエラーが発生しました');
    }
  };

  // 日付のフォーマット
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

  // ハンドをグリッド表示するための関数
  const renderHandGrid = (hands: string[]) => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const grid = ranks.map(r1 => 
      ranks.map(r2 => {
        const isPair = r1 === r2;
        const isSuited = !isPair && ranks.indexOf(r1) < ranks.indexOf(r2);
        const hand = isPair ? `${r1}${r2}` : isSuited ? `${r1}${r2}s` : `${r2}${r1}o`;
        const isInRange = hands.includes(hand);
        
        return {
          hand,
          isInRange,
          type: isPair ? 'pair' : isSuited ? 'suited' : 'offsuit'
        };
      })
    );

    return (
      <div className="grid grid-cols-13 gap-1 mt-4">
        {ranks.map((rank, i) => (
          <div key={`header-${i}`} className="h-8 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
            {rank}
          </div>
        ))}
        
        {grid.map((row, rowIndex) => (
          <>
            <div key={`row-header-${rowIndex}`} className="h-8 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300">
              {ranks[rowIndex]}
            </div>
            {row.map((cell, colIndex) => (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                className={`h-8 w-8 flex items-center justify-center text-xs font-bold rounded ${
                  cell.isInRange 
                    ? cell.type === 'pair' 
                      ? 'bg-red-500 text-white' 
                      : cell.type === 'suited' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {cell.hand.replace('s', '').replace('o', '')}
              </div>
            ))}
          </>
        ))}
      </div>
    );
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !spot) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400">{error || 'スポットの読み込みに失敗しました'}</p>
          <button 
            onClick={() => router.push('/custom-spots/saved')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            スポット一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6 flex justify-between items-center">
          <button 
            onClick={() => router.push('/custom-spots/saved')}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:underline"
          >
            <FaChevronLeft className="mr-1" /> スポット一覧に戻る
          </button>
          
          <div className="flex space-x-3">
            <button 
              onClick={() => router.push(`/custom-spots/edit/${spot.id}`)}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <FaEdit className="mr-1" /> 編集
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FaTrash className="mr-1" /> 削除
            </button>
            <button 
              onClick={() => router.push(`/trainer?spot=${spot.id}`)}
              className="flex items-center px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700"
            >
              <FaPlay className="mr-1" /> トレーニング
            </button>
          </div>
        </div>
        
        {/* メインコンテンツ */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          {/* スポット名 */}
          <div className="bg-blue-600 p-4 text-white">
            <h1 className="text-xl font-semibold">{spot.name}</h1>
            <p className="text-sm text-blue-100 mt-1">
              作成日: {formatDate(spot.created)}
              {spot.updated && ` (更新日: ${formatDate(spot.updated)})`}
            </p>
          </div>
          
          {/* タブナビゲーション */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 px-6 ${
                  activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                詳細情報
              </button>
              <button
                onClick={() => setActiveTab('ranges')}
                className={`py-3 px-6 ${
                  activeTab === 'ranges'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                レンジ分析
              </button>
            </div>
          </div>
          
          {/* 詳細情報タブ */}
          {activeTab === 'details' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">基本情報</h2>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ポジション:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{spot.position}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">アクション:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{spot.action}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">スタック:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{spot.stack} BB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">ポットサイズ:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{spot.pot} BB</span>
                    </div>
                  </div>
                  
                  {spot.board && spot.board.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">ボード</h3>
                      <div className="flex justify-center">
                        <PokerCardList cards={spot.board} size="md" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">カスタムパラメータ</h2>
                  
                  {spot.customParameters.length > 0 ? (
                    <div className="space-y-3">
                      {spot.customParameters.map((param, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">{param.name}:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{param.value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">カスタムパラメータはありません。</p>
                  )}
                </div>
              </div>
              
              {spot.notes && (
                <div className="mt-8">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">メモ</h2>
                  <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md">
                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line">{spot.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* レンジ分析タブ */}
          {activeTab === 'ranges' && (
            <div className="p-6">
              {spot.ranges && Object.keys(spot.ranges).length > 0 ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-2">レンジ選択</h2>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(spot.ranges).map(rangeName => (
                        <button
                          key={rangeName}
                          onClick={() => setActiveRange(rangeName)}
                          className={`px-3 py-1.5 rounded-full text-sm ${
                            activeRange === rangeName
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {rangeName}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {activeRange && (
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">{activeRange}</h2>
                      <p className="text-gray-700 dark:text-gray-300 mb-2">
                        ハンド数: {spot.ranges[activeRange].length} ({(spot.ranges[activeRange].length / 169 * 100).toFixed(1)}%)
                      </p>
                      
                      <div className="overflow-x-auto">
                        {renderHandGrid(spot.ranges[activeRange])}
                      </div>
                      
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 bg-red-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">ペア</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 bg-blue-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">スーテッド</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 mr-2 bg-green-500 rounded"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">オフスート</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 dark:text-gray-400">このスポットにはレンジ情報がありません。</p>
                  <button 
                    onClick={() => router.push(`/custom-spots/edit/${spot.id}`)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    編集してレンジを追加
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
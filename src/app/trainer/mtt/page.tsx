'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const SimpleHandRangeSelector: React.FC<{
  onSelectHands: (selectedHands: string[]) => void;
  initialSelectedHands?: string[];
  title?: string;
  onClose: () => void;
}> = ({ onSelectHands, initialSelectedHands = [], title = "ハンドを選択", onClose }) => {
  const [selectedHands, setSelectedHands] = useState<string[]>(initialSelectedHands);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{row: number, col: number} | null>(null);
  const [dragMode, setDragMode] = useState<'select' | 'deselect'>('select');
  const [baseSelection, setBaseSelection] = useState<string[]>([]);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  
  const generateAllHands = () => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const hands = [];
    
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        let hand = '';
        if (i === j) {
          hand = ranks[i] + ranks[j];
        } else if (i < j) {
          hand = ranks[i] + ranks[j] + 's';
        } else {
          hand = ranks[j] + ranks[i] + 'o';
        }
        hands.push({ hand, row: i, col: j });
      }
    }
    return hands;
  };

  const allHands = generateAllHands();

  const getHandsInRange = (start: {row: number, col: number}, end: {row: number, col: number}) => {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    
    const handsInRange = [];
    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const handData = allHands.find(h => h.row === row && h.col === col);
        if (handData) {
          handsInRange.push(handData.hand);
        }
      }
    }
    return handsInRange;
  };

  const handleMouseDown = (hand: string, row: number, col: number, event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({ row, col });
    setBaseSelection([...selectedHands]);
    setHasMovedDuringDrag(false);
    
    const isSelected = selectedHands.includes(hand);
    setDragMode(isSelected ? 'deselect' : 'select');
  };

  const handleMouseEnter = (hand: string, row: number, col: number) => {
    if (isDragging && dragStart) {
      setHasMovedDuringDrag(true);
      const rangeHands = getHandsInRange(dragStart, { row, col });
      
      setSelectedHands(() => {
        if (dragMode === 'select') {
          const newHands = rangeHands.filter(h => !baseSelection.includes(h));
          return [...baseSelection, ...newHands];
        } else {
          return baseSelection.filter(h => !rangeHands.includes(h));
        }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setBaseSelection([]);
    setTimeout(() => setHasMovedDuringDrag(false), 10);
  };

  const handleHandClick = (hand: string) => {
    if (!hasMovedDuringDrag) {
      setSelectedHands(prev => {
        const newSelected = prev.includes(hand) 
          ? prev.filter(h => h !== hand)
          : [...prev, hand];
        return newSelected;
      });
    }
  };

  const handleConfirm = () => {
    onSelectHands(selectedHands);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-all duration-200">✕</button>
        </div>
        
        <div className="mb-4 bg-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-white">
              選択されたハンド: <span className="text-purple-400">{selectedHands.length}</span>個
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedHands(allHands.map(h => h.hand))}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-all duration-200"
              >
                全選択
              </button>
              <button
                onClick={() => setSelectedHands([])}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-all duration-200"
              >
                全解除
              </button>
            </div>
          </div>

        </div>
        
        <div 
          className="mb-4 select-none"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '4px' }}
          onMouseLeave={() => handleMouseUp()}
        >
          {allHands.map(({ hand, row, col }) => (
            <div
              key={`${row}-${col}`}
              className={`${selectedHands.includes(hand) ? 'bg-purple-600 border-purple-500' : 'bg-gray-800 hover:bg-gray-700 border-gray-600'} text-white text-xs font-bold py-2 px-1 text-center cursor-pointer rounded transition-all duration-200 border-2 hover:shadow-md min-h-[2.5rem] flex items-center justify-center`}
              onMouseDown={(e) => handleMouseDown(hand, row, col, e)}
              onMouseEnter={() => handleMouseEnter(hand, row, col)}
              onMouseUp={() => handleMouseUp()}
              onClick={() => handleHandClick(hand)}
              title={hand}
            >
              {hand}
            </div>
          ))}
        </div>

        <div className="mb-4">
          <button
            onClick={handleConfirm}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
                          選択完了 ({selectedHands.length}ハンド)
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3 text-xs text-white bg-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded"></div>
            <span>未選択</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-purple-600 border-2 border-purple-500 rounded"></div>
            <span>選択済み</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MTTTrainerPage() {
  const router = useRouter();
  
  const [stackSize, setStackSize] = useState('100BB');
  const [position, setPosition] = useState('BTN');
  const [actionType, setActionType] = useState('openraise');
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [showHandSelector, setShowHandSelector] = useState(false);
  
  // 設定をlocalStorageに保存する関数
  const saveSettings = (newStackSize?: string, newPosition?: string, newActionType?: string, newSelectedHands?: string[]) => {
    const settings = {
      stackSize: newStackSize || stackSize,
      position: newPosition || position,
      actionType: newActionType || actionType,
      selectedHands: newSelectedHands || selectedHands
    };
    
    try {
      localStorage.setItem('mtt-trainer-settings', JSON.stringify(settings));
      console.log('🔄 MTTトレーナー設定を保存しました:', settings);
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  };
  
  // 設定をlocalStorageから復元する関数
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem('mtt-trainer-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('📂 MTTトレーナー設定を復元しました:', settings);
        
        if (settings.stackSize) setStackSize(settings.stackSize);
        if (settings.position) setPosition(settings.position);
        if (settings.actionType) setActionType(settings.actionType);
        if (settings.selectedHands && Array.isArray(settings.selectedHands)) {
          setSelectedHands(settings.selectedHands);
        }
      }
    } catch (error) {
      console.error('設定の復元に失敗しました:', error);
    }
  };
  
  // コンポーネント初期化時に設定を復元
  useEffect(() => {
    loadSettings();
  }, []);
  
  const stackSizes = ['100BB', '50BB', '30BB', '20BB', '15BB', '10BB'];
  const positions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const actionTypes = [
    { id: 'openraise', label: 'オープンレイズ' },
    { id: 'vsopen', label: 'vs オープン' },
    { id: 'vs3bet', label: 'vs 3ベット' },
    { id: 'vs4bet', label: 'vs 4ベット' },
    { id: 'random', label: 'ランダム' },
  ];

  const handleHandSelectionChange = (hands: string[]) => {
    setSelectedHands(hands);
    setShowHandSelector(false);
    saveSettings(undefined, undefined, undefined, hands);
  };

  const openHandSelector = () => {
    setShowHandSelector(true);
  };
  
  const handleStartTraining = () => {
    let url = `/trainer/mtt/training?stack=${stackSize}&position=${position}&action=${actionType}`;
    if (selectedHands.length > 0) {
      url += `&hands=${encodeURIComponent(selectedHands.join(','))}`;
    }
    router.push(url);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">MTT GTO トレーニング</h1>
        <p className="text-center text-gray-300 mb-8">
          トーナメントに特化した意思決定トレーニングで、MTTでの最適な戦略を学びましょう。
        </p>
        
        {/* 設定復元の表示 */}
        {(stackSize !== '100BB' || position !== 'BTN' || actionType !== 'openraise' || selectedHands.length > 0) && (
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-300 font-medium text-sm">前回の設定を復元しました</span>
            </div>
            <div className="text-xs text-gray-400">
              設定は自動保存されます。変更すると即座に保存されます。
            </div>
          </div>
        )}
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">シナリオ設定</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">エフェクティブスタック</h3>
            <div className="flex flex-wrap gap-2">
              {stackSizes.map(stack => (
                <button 
                  key={stack}
                  className={`px-3 py-2 rounded-lg ${stackSize === stack ? 'bg-yellow-600' : 'bg-gray-700'} transition-colors hover:bg-yellow-500`}
                  onClick={() => {
                    setStackSize(stack);
                    saveSettings(stack);
                  }}
                >
                  {stack}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">あなたのポジション</h3>
            <div className="flex flex-wrap gap-2">
              {positions.map(pos => (
                <button 
                  key={pos}
                  className={`px-3 py-2 rounded-lg ${position === pos ? 'bg-green-600' : 'bg-gray-700'} transition-colors hover:bg-green-500`}
                  onClick={() => {
                    setPosition(pos);
                    saveSettings(undefined, pos);
                  }}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">アクションタイプ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {actionTypes.map(action => (
                <button 
                  key={action.id}
                  className={`px-3 py-2 rounded-lg ${actionType === action.id ? 'bg-red-600' : 'bg-gray-700'} transition-colors text-left hover:bg-red-500`}
                  onClick={() => {
                    setActionType(action.id);
                    saveSettings(undefined, undefined, action.id);
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-8 bg-gray-700 bg-opacity-50 rounded-lg p-5">
            <h3 className="text-lg font-medium mb-4">ハンド範囲選択</h3>
            

            
            <button 
              onClick={openHandSelector}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-lg transition-colors shadow-lg flex items-center justify-center"
            >
              ハンドを選択
            </button>
            
            {selectedHands.length > 0 ? (
              <div className="mt-4">
                <div className="text-sm text-purple-300 mb-2">{selectedHands.length}種類のハンドを選択中</div>
                <div className="bg-gray-800 rounded-lg p-3 max-h-32 overflow-auto border border-gray-700">
                  <div className="flex flex-wrap gap-2">
                    {selectedHands.map(hand => (
                      <span key={hand} className="inline-block px-2 py-1 bg-purple-700 rounded text-xs font-medium">
                        {hand}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-300 text-center">
                ハンドを選択しない場合、すべてのハンドからランダムに出題されます
              </div>
            )}
          </div>
          
          <button 
            onClick={handleStartTraining}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold text-lg transition-colors shadow-lg flex items-center justify-center"
          >
            トレーニングスタート
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-3">MTT GTO戦略とは？</h2>
          <p className="mb-4 text-gray-300">
            MTT（マルチテーブルトーナメント）でのGTO戦略はキャッシュゲームとは異なります。
            スタックサイズに応じて戦略を変える必要があります。
          </p>
        </div>
        
        {showHandSelector && (
          <SimpleHandRangeSelector
            onSelectHands={handleHandSelectionChange}
            initialSelectedHands={selectedHands}
            title="MTT トレーニング用ハンド範囲選択"
            onClose={() => setShowHandSelector(false)}
          />
        )}
      </div>
    </div>
  );
} 
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
  
  const [stackSize, setStackSize] = useState('75BB');
  const [position, setPosition] = useState('BTN');
  const [actionType, setActionType] = useState('openraise');
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [hasLocalStorage, setHasLocalStorage] = useState(false);
  
  const stackSizes = ['75BB', '50BB', '40BB', '30BB', '20BB', '15BB', '10BB'];
  const positions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  const actionTypes = [
    { id: 'openraise', label: 'オープンレイズ' },
    { id: 'vsopen', label: 'vs オープン' },
    { id: 'vs3bet', label: 'vs 3ベット' },
    { id: 'vs4bet', label: 'vs 4ベット' },
    { id: 'random', label: 'ランダム' },
  ];

  // 設定をlocalStorageから読み込み
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('mtt-trainer-settings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        console.log('💾 保存された設定を読み込み:', settings);
        
        if (settings.stackSize && stackSizes.includes(settings.stackSize)) {
          setStackSize(settings.stackSize);
        }
        if (settings.position && positions.includes(settings.position)) {
          setPosition(settings.position);
        }
        if (settings.actionType && actionTypes.some(a => a.id === settings.actionType)) {
          setActionType(settings.actionType);
        }
        if (settings.selectedHands && Array.isArray(settings.selectedHands)) {
          setSelectedHands(settings.selectedHands);
        }
        
        console.log('✅ 設定の読み込み完了');
      } else {
        console.log('💡 保存された設定がありません。デフォルト値を使用します。');
      }
    } catch (error) {
      console.error('❌ 設定の読み込みに失敗:', error);
    } finally {
      // 初期読み込み完了をマーク
      setIsInitialLoad(false);
      // LocalStorageの状態を確認
      setHasLocalStorage(!!localStorage.getItem('mtt-trainer-settings'));
    }
  }, []);

  // 設定をlocalStorageに保存
  const saveSettings = () => {
    try {
      const settings = {
        stackSize,
        position,
        actionType,
        selectedHands,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('mtt-trainer-settings', JSON.stringify(settings));
      console.log('💾 自動保存完了:', settings);
      setSaveStatus('saved');
      setHasLocalStorage(true);
      
      // 2秒後にステータスをクリア
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error('❌ 自動保存に失敗:', error);
      setSaveStatus(null);
    }
  };

  // 設定変更時に自動保存（初回読み込み時は除外）
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    if (!isInitialLoad) {
      // 設定変更を検知したら即座に保存ステータスを表示
      setSaveStatus('saving');
      
      const saveTimer = setTimeout(() => {
        saveSettings();
      }, 500); // 500msでより確実な保存
      
      return () => clearTimeout(saveTimer);
    }
  }, [stackSize, position, actionType, selectedHands]);

  const handleHandSelectionChange = (hands: string[]) => {
    setSelectedHands(hands);
    setShowHandSelector(false);
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

  // 設定をリセットする関数
  const resetSettings = () => {
    if (confirm('🔄 すべての設定をリセットしますか？\n\n現在の設定：\n・スタック: ' + stackSize + '\n・ポジション: ' + position + '\n・アクション: ' + actionTypes.find(a => a.id === actionType)?.label + '\n・選択ハンド: ' + selectedHands.length + '個')) {
      setStackSize('75BB');
      setPosition('BTN');
      setActionType('openraise');
      setSelectedHands([]);
      
      try {
        localStorage.removeItem('mtt-trainer-settings');
        console.log('🔄 設定をリセットしました（自動保存により設定クリア）');
        setHasLocalStorage(false);
      } catch (error) {
        console.error('❌ 設定のリセットに失敗:', error);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-center">MTT GTO トレーニング</h1>
        </div>
        <p className="text-center text-gray-300 mb-8">
          トーナメントに特化した意思決定トレーニングで、MTTでの最適な戦略を学びましょう。
        </p>
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">シナリオ設定</h2>
            <div className="flex items-center gap-2">
              {(saveStatus === 'saving' || saveStatus === 'saved') && (
                <div className={`text-xs px-3 py-1 rounded-lg transition-all duration-300 ${
                  saveStatus === 'saving' ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-600/50' :
                  'text-green-400 bg-green-900/30 border border-green-600/50'
                }`}>
                  {saveStatus === 'saving' ? '🔄 自動保存中...' : '✅ 自動保存完了'}
                </div>
              )}
              <button
                onClick={resetSettings}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-colors"
                title="設定をリセット"
              >
                🔄 リセット
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">エフェクティブスタック</h3>
            <div className="flex flex-wrap gap-2">
              {stackSizes.map(stack => (
                <button 
                  key={stack}
                  className={`px-3 py-2 rounded-lg ${stackSize === stack ? 'bg-yellow-600' : 'bg-gray-700'} transition-colors hover:bg-yellow-500`}
                  onClick={() => setStackSize(stack)}
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
                  onClick={() => setPosition(pos)}
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
                  onClick={() => setActionType(action.id)}
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
        
        <div className="bg-gray-800 rounded-xl p-6 shadow-lg mb-8">
          <h2 className="text-xl font-semibold mb-3">MTT GTO戦略とは？</h2>
          <p className="mb-4 text-gray-300">
            MTT（マルチテーブルトーナメント）でのGTO戦略はキャッシュゲームとは異なります。
            スタックサイズに応じて戦略を変える必要があります。
          </p>
        </div>

        {/* デバッグ用設定表示 */}
        <div className="bg-gray-800/50 rounded-xl p-4 shadow-lg">
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-gray-400 hover:text-white transition-colors">
              🔧 設定詳細 (デバッグ情報)
            </summary>
            <div className="mt-3 text-xs space-y-2 text-gray-300 bg-gray-900/50 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>スタックサイズ:</strong> {stackSize}</div>
                <div><strong>ポジション:</strong> {position}</div>
                <div><strong>アクションタイプ:</strong> {actionTypes.find(a => a.id === actionType)?.label} ({actionType})</div>
                <div><strong>選択ハンド数:</strong> {selectedHands.length}個</div>
              </div>
              <div className="pt-2 border-t border-gray-700">
                <div><strong>自動保存ステータス:</strong> {
                  saveStatus === 'saving' ? '🔄 保存中' :
                  saveStatus === 'saved' ? '✅ 完了' :
                  '💾 有効'
                }</div>
                <div><strong>初期読み込み:</strong> {isInitialLoad ? '読み込み中' : '✅ 完了'}</div>
                <div><strong>LocalStorage確認:</strong> 
                  {hasLocalStorage ? '✅ 設定保存済み' : '❌ 未保存'}
                </div>
              </div>
              {selectedHands.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <strong>選択ハンド:</strong>
                  <div className="mt-1 max-h-20 overflow-y-auto">
                    {selectedHands.slice(0, 20).join(', ')}
                    {selectedHands.length > 20 && ` ...他${selectedHands.length - 20}個`}
                  </div>
                </div>
              )}
            </div>
          </details>
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
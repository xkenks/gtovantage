'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { AuthGuard } from '@/components/AuthGuard';
import { HAND_TEMPLATES } from '@/components/HandRange';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaPlay } from 'react-icons/fa';

interface HandData {
  hand: string;
  row: number;
  col: number;
}

const SimpleHandRangeSelector: React.FC<{
  onSelectHands: (selectedHands: string[]) => void;
  onClose: () => void;
  title?: string;
  initialSelectedHands?: string[];
}> = ({ onSelectHands, onClose, title = "プレイするハンドを選択", initialSelectedHands = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartHand, setDragStartHand] = useState<string>('');
  const [dragStartRow, setDragStartRow] = useState<number>(-1);
  const [dragStartCol, setDragStartCol] = useState<number>(-1);
  const [dragStartSelected, setDragStartSelected] = useState<boolean>(false);
  const [dragDistance, setDragDistance] = useState<number>(0);
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  
  // レベルで選択されたハンドを取得する関数
  const getLevelHands = (level: number): string[] => {
    if (level === 0) return [];
    
    const levelHands = {
      1: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'AKo', 'AQo', 'AJo', 'KQs', 'KJs', 'KTs', 'KQo', 'QJs', 'QTs'],
      2: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'QJo', 'JTs', 'J9s', 'T9s'],
      3: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'QJo', 'QTo', 'JTs', 'J9s', 'J8s', 'JTo', 'T9s', 'T8s', 'T9o', '98s', '87s'],
      4: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'QJo', 'QTo', 'JTs', 'J9s', 'J8s', 'J7s', 'JTo', 'T9s', 'T8s', 'T7s', 'T9o', '98s', '97s', '87s', '86s'],
      5: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'QJo', 'QTo', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'JTo', 'T9s', 'T8s', 'T7s', 'T9o', 'T8o', '98s', '97s', '98o', '87s', '86s'],
      6: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s', 'QJo', 'QTo', 'Q9o', 'Q8o', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s', 'JTo', 'J9o', 'J8o', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s', 'T9o', 'T8o', '98s', '97s', '96s', '95s', '94s', '93s', '92s', '98o', '97o', '87s', '86s', '85s', '84s', '83s', '82s', '87o', '86o', '76s', '75s', '74s', '73s', '72s', '76o', '75o', '65s', '64s', '63s', '62s', '65o', '64o', '54s', '53s', '52s', '54o', '53o', '43s', '42s', '43o', '42o', '32s', '32o']
    };
    
    const selectedLevelHands: string[] = [];
    for (let i = 1; i <= level; i++) {
      if (levelHands[i as keyof typeof levelHands]) {
        selectedLevelHands.push(...levelHands[i as keyof typeof levelHands]);
      }
    }
    
    return Array.from(new Set(selectedLevelHands));
  };

  // 初期化時にinitialSelectedHandsがある場合はそれを設定
  useEffect(() => {
    if (initialSelectedHands.length > 0) {
      setSelectedHands(initialSelectedHands);
    }
  }, [initialSelectedHands]);

  // 全てのハンドを生成
  const allHands: HandData[] = [];
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  for (let i = 0; i < ranks.length; i++) {
    for (let j = 0; j < ranks.length; j++) {
      let hand = '';
      if (i === j) {
        hand = ranks[i] + ranks[j]; // ペア
      } else if (i < j) {
        hand = ranks[i] + ranks[j] + 's'; // スーテッド
      } else {
        hand = ranks[j] + ranks[i] + 'o'; // オフスーツ
      }
      allHands.push({ hand, row: i, col: j });
    }
  }

  const handleMouseDown = (hand: string, row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStartHand(hand);
    setDragStartRow(row);
    setDragStartCol(col);
    setDragDistance(0);
    
    const isCurrentlySelected = selectedHands.includes(hand);
    setDragStartSelected(isCurrentlySelected);
  };

  const handleMouseEnter = (hand: string, row: number, col: number) => {
    if (isDragging) {
      const distance = Math.abs(row - dragStartRow) + Math.abs(col - dragStartCol);
      setDragDistance(distance);
      
      const isCurrentlySelected = selectedHands.includes(hand);
      
      if (isCurrentlySelected !== dragStartSelected) {
        if (dragStartSelected) {
          setSelectedHands(prev => prev.filter(h => h !== hand));
        } else {
          setSelectedHands(prev => [...prev, hand]);
        }
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartHand('');
    setDragStartRow(-1);
    setDragStartCol(-1);
    setDragDistance(0);
  };

  const handleHandClick = (hand: string) => {
    setSelectedHands(prev => {
      if (prev.includes(hand)) {
        return prev.filter(h => h !== hand);
      } else {
        return [...prev, hand];
      }
    });
  };

  const handleConfirm = () => {
    onSelectHands(selectedHands);
    onClose();
  };

  const handleTemplateSelect = (templateName: string) => {
    const template = HAND_TEMPLATES[templateName as keyof typeof HAND_TEMPLATES];
    if (template) {
      setSelectedHands(template);
    }
  };

  const handleLevelChange = (level: number) => {
    const levelHands = getLevelHands(level);
    setSelectedHands(levelHands);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg sm:text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          </div>
          
          {/* テンプレート選択 */}
          <div className="mb-4">
            <h3 className="text-sm sm:text-base font-medium text-gray-300 mb-2">クイック選択</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleLevelChange(1)}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded transition-colors"
              >
                レベル1
              </button>
              <button
                onClick={() => handleLevelChange(2)}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded transition-colors"
              >
                レベル2
              </button>
              <button
                onClick={() => handleLevelChange(3)}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm rounded transition-colors"
              >
                レベル3
              </button>
              <button
                onClick={() => handleTemplateSelect('UTG')}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded transition-colors"
              >
                UTG
              </button>
              <button
                onClick={() => handleTemplateSelect('BTN')}
                className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded transition-colors"
              >
                BTN
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-auto max-h-[60vh] p-4 sm:p-6">
          <div className="grid grid-cols-13 gap-1 max-w-fit mx-auto">
            {allHands.map(({ hand, row, col }) => (
              <button
                key={hand}
                className={`w-8 h-8 sm:w-10 sm:h-10 text-xs sm:text-sm font-bold rounded transition-all ${
                  selectedHands.includes(hand)
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                } ${row === col ? 'border-2 border-yellow-400' : ''}`}
                onMouseDown={(e) => handleMouseDown(hand, row, col, e)}
                onMouseEnter={() => handleMouseEnter(hand, row, col)}
                onMouseUp={handleMouseUp}
                onClick={() => handleHandClick(hand)}
              >
                {hand}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 sm:p-6 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-sm sm:text-base text-gray-300">
              選択済み: {selectedHands.length}個
            </span>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 sm:px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors text-sm sm:text-base"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors text-sm sm:text-base"
              >
                確定
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MTTTrainerPage() {
  const router = useRouter();
  const { isAdmin } = useAdmin();
  const { user } = useAuth();
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [settings, setSettings] = useState({
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    stackSize: 'medium' as 'short' | 'medium' | 'deep',
    position: 'random' as 'UTG' | 'MP' | 'CO' | 'BTN' | 'SB' | 'BB' | 'random',
    tournamentStage: 'mid' as 'early' | 'mid' | 'late' | 'bubble' | 'final' | 'random',
    icmPressure: 'medium' as 'low' | 'medium' | 'high',
    handRangeLevel: 3
  });

  const [isLoading, setIsLoading] = useState(false);

  // 設定の状態管理
  const [stackSize, setStackSize] = useState('75BB');
  const [position, setPosition] = useState('BTN');
  const [actionType, setActionType] = useState('openraise');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasLocalStorage, setHasLocalStorage] = useState(false);

  // スタックサイズの選択肢
  const allStackSizes = ['10BB', '15BB', '20BB', '30BB', '40BB', '50BB', '75BB'];
  const positions = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];
  const actionTypes = [
    { id: 'openraise', label: 'オープンレイズ' },
    { id: 'vsopen', label: 'vs オープン' },
    { id: 'vs3bet', label: 'vs 3bet' },
    { id: 'vs4bet', label: 'vs 4bet' },
    { id: 'vs5bet', label: 'vs 5bet' },
    { id: 'random', label: 'ランダム' }
  ];

  // スタックサイズの使用可否をチェック
  const canUseStackSize = (stack: string) => {
    if (!user) return false;
    if (user.subscriptionStatus === 'master' || user.subscriptionStatus === 'premium') return true;
    return stack === '30BB'; // 無料プランは30BBのみ
  };

  // 利用可能なスタックサイズを取得
  const stackSizes = allStackSizes.filter(canUseStackSize);

  // 設定を保存する関数
  const saveSettings = () => {
    setSaveStatus('saving');
    try {
      const settingsData = {
        stackSize,
        position,
        actionType,
        selectedHands,
        timestamp: Date.now()
      };
      localStorage.setItem('mtt-trainer-settings', JSON.stringify(settingsData));
      setHasLocalStorage(true);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      setSaveStatus('idle');
    }
  };

  // 設定を読み込む関数
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('mtt-trainer-settings');
      if (saved) {
        const settingsData = JSON.parse(saved);
        if (settingsData.stackSize && canUseStackSize(settingsData.stackSize)) {
          setStackSize(settingsData.stackSize);
        }
        if (settingsData.position) {
          setPosition(settingsData.position);
        }
        if (settingsData.actionType) {
          setActionType(settingsData.actionType);
        }
        if (settingsData.selectedHands && Array.isArray(settingsData.selectedHands)) {
          setSelectedHands(settingsData.selectedHands);
        }
        setHasLocalStorage(true);
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    } finally {
      setIsInitialLoad(false);
    }
  };

  // 設定変更時に自動保存
  useEffect(() => {
    if (!isInitialLoad) {
      saveSettings();
    }
  }, [stackSize, position, actionType, selectedHands]);

  // 初期読み込み
  useEffect(() => {
    loadSettings();
  }, []);

  const handleHandSelectionChange = (hands: string[]) => {
    setSelectedHands(hands);
  };

  const openHandSelector = () => {
    setShowHandSelector(true);
  };

  const handleStartTraining = () => {
    setIsLoading(true);
    // トレーニングページに遷移
    router.push(`/trainer/mtt/training?stack=${stackSize}&position=${position}&action=${actionType}&hands=${selectedHands.join(',')}`);
  };

  // 設定をリセットする関数
  const resetSettings = () => {
    if (confirm('🔄 すべての設定をリセットしますか？')) {
      setStackSize('75BB');
      setPosition('BTN');
      setActionType('openraise');
      setSelectedHands([]);
      
      try {
        localStorage.removeItem('mtt-trainer-settings');
        setHasLocalStorage(false);
      } catch (error) {
        console.error('❌ 設定のリセットに失敗:', error);
      }
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* ヘッダー */}
        <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/trainer')}
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                <FaArrowLeft className="text-sm" />
                <span className="hidden sm:inline">戻る</span>
              </button>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">MTT プリフロップトレーニング</h1>
              <div className="w-8"></div> {/* スペーサー */}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-8">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-gray-300 mb-4 sm:mb-6 md:mb-8 text-sm sm:text-base leading-relaxed">
              トーナメントでのプリフロップ意思決定トレーニングで、MTTでの最適な戦略を学びましょう。
            </p>
            
            <div className="bg-gray-800 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg mb-4 sm:mb-6 md:mb-8">
              <div className="flex justify-between items-center mb-3 sm:mb-4">
                <h2 className="text-lg sm:text-xl font-semibold">シナリオ設定</h2>
                <div className="flex items-center gap-1 sm:gap-2">
                  {(saveStatus === 'saving' || saveStatus === 'saved') && (
                    <div className={`text-xs px-2 sm:px-3 py-1 rounded-lg transition-all duration-300 ${
                      saveStatus === 'saving' ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-600/50' :
                      'text-green-400 bg-green-900/30 border border-green-600/50'
                    }`}>
                      {saveStatus === 'saving' ? '🔄 保存中' : '✅ 完了'}
                    </div>
                  )}
                  <button
                    onClick={resetSettings}
                    className="px-2 sm:px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs sm:text-sm rounded-lg transition-colors"
                    title="設定をリセット"
                  >
                    🔄 リセット
                  </button>
                </div>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium mb-2">エフェクティブスタック</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {allStackSizes.map(stack => (
                    <button 
                      key={stack}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base transition-colors min-h-[44px] touch-manipulation ${
                        stackSize === stack 
                          ? canUseStackSize(stack) ? 'bg-yellow-600' : 'bg-red-600' 
                          : canUseStackSize(stack) ? 'bg-gray-700 hover:bg-yellow-500' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      }`}
                      onClick={() => canUseStackSize(stack) && setStackSize(stack)}
                      disabled={!canUseStackSize(stack)}
                      title={!canUseStackSize(stack) ? '無料プランでは30BBのみ利用可能です' : ''}
                    >
                      {stack}
                      {!canUseStackSize(stack) && <span className="ml-1 text-xs">🔒</span>}
                    </button>
                  ))}
                </div>
                {stackSizes.length === 1 && (
                  <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-2">
                    💡 無料プランでは30BBモードのみ利用可能です。プランアップグレードで全スタックサイズが利用できます。
                  </div>
                )}
              </div>
              
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium mb-2">あなたのポジション</h3>
                <div className="flex flex-wrap gap-1 sm:gap-2">
                  {positions.map(pos => (
                    <button 
                      key={pos}
                      className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base min-h-[44px] touch-manipulation ${position === pos ? 'bg-green-600' : 'bg-gray-700'} transition-colors hover:bg-green-500`}
                      onClick={() => setPosition(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-medium mb-2">アクションタイプ</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
                  {actionTypes.map(action => (
                    <button 
                      key={action.id}
                      className={`px-2 sm:px-3 py-2 sm:py-3 rounded-lg text-sm sm:text-base min-h-[44px] touch-manipulation ${
                        actionType === action.id ? 'bg-blue-600' : 'bg-gray-700'
                      } transition-colors hover:bg-blue-500`}
                      onClick={() => setActionType(action.id)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mb-4 sm:mb-6 md:mb-8 bg-gray-700 bg-opacity-50 rounded-lg p-3 sm:p-4 md:p-5">
              <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4">ハンド範囲選択</h3>
              
              <button 
                onClick={openHandSelector}
                className="w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-base sm:text-lg transition-colors shadow-lg flex items-center justify-center min-h-[44px] touch-manipulation"
              >
                ハンドを選択
              </button>
              
              {selectedHands.length > 0 ? (
                <div className="mt-3 sm:mt-4">
                  <div className="text-xs sm:text-sm text-purple-300 mb-2">{selectedHands.length}種類のハンドを選択中</div>
                  <div className="bg-gray-800 rounded-lg p-2 sm:p-3 max-h-24 sm:max-h-32 overflow-auto border border-gray-700">
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedHands.map(hand => (
                        <span key={hand} className="inline-block px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-700 rounded text-xs font-medium">
                          {hand}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-300 text-center">
                  ハンドを選択しない場合、すべてのハンドからランダムに出題されます
                </div>
              )}
            </div>
            
            <button 
              onClick={handleStartTraining}
              disabled={isLoading}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold text-base sm:text-lg transition-colors shadow-lg flex items-center justify-center min-h-[44px] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  読み込み中...
                </>
              ) : (
                <>
                  <FaPlay className="mr-2" />
                  トレーニングスタート
                </>
              )}
            </button>
            
                         <div className="bg-gray-800 rounded-xl p-3 sm:p-4 md:p-6 shadow-lg mb-4 sm:mb-6 md:mb-8 mt-6 sm:mt-8">
               <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">MTT プリフロップ戦略とは？</h2>
               <p className="mb-3 sm:mb-4 text-gray-300 text-sm sm:text-base leading-relaxed">
                 MTT（マルチテーブルトーナメント）でのプリフロップ戦略はキャッシュゲームとは異なります。
                 スタックサイズに応じて戦略を変える必要があります。
               </p>
             </div>

            
          </div>
        </div>
        
        {showHandSelector && (
          <SimpleHandRangeSelector
            onSelectHands={handleHandSelectionChange}
            title="MTT トレーニング用ハンド範囲選択"
            onClose={() => setShowHandSelector(false)}
            initialSelectedHands={selectedHands}
          />
        )}
      </div>
    </AuthGuard>
  );
} 
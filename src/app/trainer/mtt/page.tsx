'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { AuthGuard } from '@/components/AuthGuard';
import { HAND_TEMPLATES } from '@/components/HandRange';
import { useAuth } from '@/contexts/AuthContext';

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
      0: [], // レベル0: 空のハンドセット
      1: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'AKo', 'AQo', 'AJo', 'ATo', 'KQs', 'KJs', 'KTs', 'K9s', 'JTs', 'T9s', 'KQo', 'QJs', 'QTs'],
      2: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', '98s', 'T8s', '87s', 'KQo', 'KJo', 'QJs', 'QTs', 'Q9s', 'QJo', 'JTs', 'J9s', 'T9s'],
      3: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'QJo', 'JTs', 'J9s', 'J8s', 'T9s', 'T8s', '98s', '87s'],
      4: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'KQo', 'KJo', 'KTo', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'QJo', 'QTo', 'JTs', 'J9s', 'J8s', 'J7s', 'JTo', 'T9s', 'T8s', 'T7s', '98s', '97s', '96s', '87s', '86s', '76s', '75s', '65s', '54s'],
      5: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'KQo', 'KJo', 'KTo', 'K9o', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s', 'QJo', 'QTo', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'JTo', 'T9s', 'T8s', 'T7s', 'T6s', 'T9o', '98s', '97s', '96s', '87s', '86s', '85s', '76s', '75s', '65s', '64s', '54s'],
      6: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22', 'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o', 'KQs', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'KQo', 'KJo', 'KTo', 'K9o', 'K8o', 'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s', 'QJo', 'QTo', 'Q9o', 'Q8o', 'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s', 'JTo', 'J9o', 'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s', 'T9o', '98s', '97s', '96s', '95s', '94s', '93s', '92s', '87s', '86s', '85s', '84s', '83s', '82s', '76s', '75s', '74s', '73s', '72s', '65s', '64s', '63s', '62s', '54s', '53s', '52s', '43s', '42s', '32s'],
      7: allHands.map(h => h.hand) // レベル7: 全選択（全てのハンド）
    };
    
    // 指定されたレベルのハンドのみを返す（累積しない）
    if (levelHands[level as keyof typeof levelHands]) {
      return levelHands[level as keyof typeof levelHands];
    }
    
    return [];
  };

  // 初期化時にinitialSelectedHandsがある場合はそれを設定、なければレベル0を設定
  useEffect(() => {
    if (initialSelectedHands.length > 0) {
      setSelectedHands(initialSelectedHands);
    } else {
      // 初期値がない場合はレベル0のハンドを設定（空の配列）
      const level0Hands = getLevelHands(0);
      setSelectedHands(level0Hands);
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
    console.log('MouseDown:', hand);
    setIsDragging(true);
    setDragStartHand(hand);
    setDragStartRow(row);
    setDragStartCol(col);
    setDragDistance(0);
    
    // ドラッグ開始時の選択状態を記録
    const isCurrentlySelected = selectedHands.includes(hand);
    setDragStartSelected(isCurrentlySelected);
    console.log('Drag start - hand:', hand, 'selected:', isCurrentlySelected);
  };

  const handleMouseEnter = (hand: string, row: number, col: number) => {
    if (isDragging) {
      // ドラッグ距離を更新
      const distance = Math.abs(row - dragStartRow) + Math.abs(col - dragStartCol);
      setDragDistance(distance);
      
      const isCurrentlySelected = selectedHands.includes(hand);
      
      // ドラッグ開始時の選択状態に合わせて、現在のハンドの選択状態を変更
      if (dragStartSelected && !isCurrentlySelected) {
        // ドラッグ開始時が選択済み → 選択追加
        console.log('Drag: Adding hand:', hand, 'distance:', distance);
        setSelectedHands(prev => [...prev, hand]);
      } else if (!dragStartSelected && isCurrentlySelected) {
        // ドラッグ開始時が未選択 → 選択解除
        console.log('Drag: Removing hand:', hand, 'distance:', distance);
        setSelectedHands(prev => prev.filter(h => h !== hand));
      }
      // 既に正しい状態の場合は何もしない
    }
  };

  const handleMouseUp = () => {
    console.log('MouseUp - ending drag, wasDragging:', isDragging, 'distance:', dragDistance);
    setIsDragging(false);
    setDragStartHand('');
    setDragStartRow(-1);
    setDragStartCol(-1);
    setDragStartSelected(false);
    setDragDistance(0);
  };

  const handleHandClick = (hand: string) => {
    console.log('handleHandClick called with:', hand, 'isDragging:', isDragging, 'distance:', dragDistance);
    
    // ドラッグ中でない場合、または小さなドラッグ（距離1以下）の場合はクリック処理を実行
    if (isDragging && dragDistance > 1) {
      console.log('Click ignored - significant dragging in progress');
      return;
    }
    
    const isCurrentlySelected = selectedHands.includes(hand);
    
    console.log('Current state:', { 
      hand, 
      isCurrentlySelected,
      selectedHandsCount: selectedHands.length
    });
    
    if (isCurrentlySelected) {
      // 選択解除
      console.log('Removing hand:', hand);
      setSelectedHands(prev => prev.filter(h => h !== hand));
    } else {
      // 選択追加
      console.log('Adding hand:', hand);
      setSelectedHands(prev => [...prev, hand]);
    }
  };

  const handleConfirm = () => {
    onSelectHands(selectedHands);
    onClose();
  };

  const handleTemplateSelect = (templateName: string) => {
    const templateHands = HAND_TEMPLATES[templateName as keyof typeof HAND_TEMPLATES];
    if (templateHands) {
      setSelectedHands(templateHands);
    }
  };

  const handleLevelChange = (level: number) => {
    const levelHands = getLevelHands(level);
    setSelectedHands(levelHands);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <style jsx>{`
        .slider {
          -webkit-appearance: none;
          appearance: none;
          outline: none;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease-in-out;
        }
        
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        .slider::-webkit-slider-thumb:active {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.6);
        }
        
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #8b5cf6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease-in-out;
        }
        
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        
        .slider::-moz-range-thumb:active {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(139, 92, 246, 0.6);
        }
        
        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
        
        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
      `}</style>
      <div className="bg-gray-900 rounded-xl p-2 md:p-6 max-w-4xl w-full mx-1 md:mx-4 max-h-[98vh] md:max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700">
        <div className="flex justify-between items-center mb-1 md:mb-4">
          <h2 className="text-sm md:text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700 p-0.5 md:p-2 rounded-lg transition-all duration-200">✕</button>
        </div>
        
        <div className="mb-1 md:mb-4 bg-gray-800 rounded-lg p-1 md:p-3 border border-gray-600">
          <div className="flex items-center justify-between mb-1 md:mb-2">
            <p className="text-xs md:text-sm font-semibold text-white">
              選択: <span className="text-purple-400">{selectedHands.length}</span>個
            </p>
            <div className="flex gap-0.5 md:gap-2">
              <button
                onClick={() => {
                  // 全選択時はレベル6のハンドを設定
                  const level6Hands = getLevelHands(6);
                  setSelectedHands(level6Hands);
                }}
                className="px-1 md:px-3 py-0.5 md:py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm rounded-md transition-all duration-200"
              >
                全選択
              </button>
              <button
                onClick={() => {
                  // 全解除時は空の配列を設定
                  setSelectedHands([]);
                }}
                className="px-1 md:px-3 py-0.5 md:py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs md:text-sm rounded-md transition-all duration-200"
              >
                全解除
              </button>
            </div>
          </div>
        </div>
        
        <div 
          className="mb-2 md:mb-4 select-none"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(13, 1fr)', gap: '1px' }}
          onMouseLeave={() => handleMouseUp()}
        >
          {allHands.map(({ hand, row, col }) => (
            <div
              key={`${row}-${col}`}
              className={`${selectedHands.includes(hand) ? 'bg-purple-600 border-purple-500' : 'bg-gray-800 hover:bg-gray-700 border-gray-600'} text-white text-xs font-normal py-0.5 md:py-2 px-0 md:px-1 text-center cursor-pointer rounded transition-all duration-200 border border-gray-600 hover:shadow-md min-h-[1rem] md:min-h-[2.5rem] flex items-center justify-center`}
              style={{ fontSize: '12px' }}
              onMouseDown={(e) => handleMouseDown(hand, row, col, e)}
              onMouseEnter={() => handleMouseEnter(hand, row, col)}
              onMouseUp={() => handleMouseUp()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleHandClick(hand);
              }}
              title={hand}
            >
              {hand}
            </div>
          ))}
        </div>

        {/* レベルスライダー */}
        <div className="mb-1 md:mb-4 bg-gray-800 rounded-lg p-1 md:p-2 border border-gray-600">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs md:text-sm text-white font-medium">レベル選択</span>
            <span className="text-xs md:text-sm text-purple-400 font-bold" id="level-display">レベル0</span>
          </div>
          <input
            type="range"
            min="0"
            max="7"
            step="1"
            defaultValue="0"
            onChange={(e) => {
              const level = Number(e.target.value);
              handleLevelChange(level);
              // レベル表示を更新
              const levelDisplay = document.getElementById('level-display');
              if (levelDisplay) {
                if (level === 7) {
                  levelDisplay.textContent = '全レンジ';
                } else {
                  levelDisplay.textContent = `レベル${level}`;
                }
              }
            }}
            className="w-full h-1 md:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 ease-in-out"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 0%, #374151 0%, #374151 100%)`,
              transition: 'background 0.3s ease-in-out'
            }}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>レベル0</span>
            <span>レベル1</span>
            <span>レベル2</span>
            <span>レベル3</span>
            <span>レベル4</span>
            <span>レベル5</span>
            <span>レベル6</span>
            <span>全レンジ</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            <p>レベル0: ランダム出題</p>
            <p>レベル1-6: 段階的なハンドセット</p>
            <p>全レンジ: 全選択（全てのハンド）</p>
          </div>
        </div>

        <div className="mb-1 md:mb-4">
          <button
            onClick={handleConfirm}
            className="w-full px-2 md:px-4 py-1 md:py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs md:text-base font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
            選択完了 ({selectedHands.length}ハンド)
          </button>
        </div>
        
        {/* テンプレート選択セクション */}
        <div className="mb-1 md:mb-4 bg-gray-800 rounded-lg p-1 md:p-3 border border-gray-600">
          <h3 className="text-xs md:text-sm font-semibold text-white mb-1 md:mb-2">📋 ハンドテンプレート</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1 md:gap-2">
            {Object.entries(HAND_TEMPLATES).map(([templateName, hands]) => (
              <button
                key={templateName}
                onClick={() => handleTemplateSelect(templateName)}
                className="px-1 md:px-3 py-1 md:py-2 text-white text-xs md:text-sm rounded-md transition-all duration-200 text-left bg-blue-600 hover:bg-blue-700"
                title={`${templateName} (${hands.length}ハンド)`}
              >
                <div className="font-medium">{templateName}</div>
                <div className="text-xs text-blue-200">{hands.length}ハンド</div>
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-1 md:gap-3 text-xs text-white bg-gray-800 rounded-lg p-1 md:p-3 border border-gray-600">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 md:w-3 h-2 md:h-3 bg-gray-800 border border-gray-600 rounded"></div>
            <span>未選択</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-2 md:w-3 h-2 md:h-3 bg-purple-600 border-2 border-purple-500 rounded"></div>
            <span>選択済み</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MTTTrainerPage() {
  const router = useRouter();
  const { canUseStackSize, getAllowedStackSizes } = useAuth();
  
  const [stackSize, setStackSize] = useState('75BB');
  const [position, setPosition] = useState('BTN');
  const [actionType, setActionType] = useState('openraise');
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [hasLocalStorage, setHasLocalStorage] = useState(false);
  
  const allStackSizes = ['75BB', '50BB', '40BB', '30BB', '20BB', '15BB', '10BB'];
  const stackSizes = getAllowedStackSizes();
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
        
        if (settings.stackSize && canUseStackSize(settings.stackSize)) {
          setStackSize(settings.stackSize);
        } else if (settings.stackSize && !canUseStackSize(settings.stackSize)) {
          // 保存されたスタックサイズが使用できない場合は30BBに変更
          setStackSize('30BB');
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
    <AuthGuard>
      <div className="min-h-screen bg-gray-900 text-white p-2 md:p-8">
        <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-3 md:mb-6">
          <h1 className="text-xl md:text-3xl font-bold text-center">MTTプリフロップトレーニング</h1>
        </div>
        <p className="text-center text-gray-300 mb-4 md:mb-8 text-sm md:text-base">
          トーナメントに特化したプリフロップ意思決定トレーニングで、MTTでの最適な戦略を学びましょう。
        </p>
        
        <div className="bg-gray-800 rounded-xl p-3 md:p-6 shadow-lg mb-4 md:mb-8">
          <div className="flex justify-between items-center mb-3 md:mb-4">
            <h2 className="text-lg md:text-xl font-semibold">シナリオ設定</h2>
            <div className="flex items-center gap-1 md:gap-2">
              {(saveStatus === 'saving' || saveStatus === 'saved') && (
                <div className={`text-xs px-2 md:px-3 py-1 rounded-lg transition-all duration-300 ${
                  saveStatus === 'saving' ? 'text-yellow-400 bg-yellow-900/30 border border-yellow-600/50' :
                  'text-green-400 bg-green-900/30 border border-green-600/50'
                }`}>
                  {saveStatus === 'saving' ? '🔄 保存中' : '✅ 完了'}
                </div>
              )}
              <button
                onClick={resetSettings}
                className="px-2 md:px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs md:text-sm rounded-lg transition-colors"
                title="設定をリセット"
              >
                🔄 リセット
              </button>
            </div>
          </div>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-medium mb-2">エフェクティブスタック</h3>
            <div className="flex flex-wrap gap-1 md:gap-2">
              {allStackSizes.map(stack => (
                <button 
                  key={stack}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-sm md:text-base transition-colors ${
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
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-medium mb-2">あなたのポジション</h3>
            <div className="flex flex-wrap gap-1 md:gap-2">
              {positions.map(pos => (
                <button 
                  key={pos}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-sm md:text-base ${position === pos ? 'bg-green-600' : 'bg-gray-700'} transition-colors hover:bg-green-500`}
                  onClick={() => setPosition(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-base md:text-lg font-medium mb-2">アクションタイプ</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-1 md:gap-2">
              {actionTypes.map(action => (
                <button 
                  key={action.id}
                  className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-sm md:text-base ${actionType === action.id ? 'bg-red-600' : 'bg-gray-700'} transition-colors text-left hover:bg-red-500`}
                  onClick={() => setActionType(action.id)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4 md:mb-8 bg-gray-700 bg-opacity-50 rounded-lg p-3 md:p-5">
            <h3 className="text-base md:text-lg font-medium mb-3 md:mb-4">ハンド範囲選択</h3>
            
            <button 
              onClick={openHandSelector}
              className="w-full py-3 md:py-4 px-4 md:px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-base md:text-lg transition-colors shadow-lg flex items-center justify-center"
            >
              ハンドを選択
            </button>
            
            {selectedHands.length > 0 ? (
              <div className="mt-3 md:mt-4">
                <div className="text-xs md:text-sm text-purple-300 mb-2">{selectedHands.length}種類のハンドを選択中</div>
                <div className="bg-gray-800 rounded-lg p-2 md:p-3 max-h-24 md:max-h-32 overflow-auto border border-gray-700">
                  <div className="flex flex-wrap gap-1 md:gap-2">
                    {selectedHands.map(hand => (
                      <span key={hand} className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 bg-purple-700 rounded text-xs font-medium">
                        {hand}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 md:mt-3 text-xs md:text-sm text-gray-300 text-center">
                ハンドを選択しない場合、すべてのハンドからランダムに出題されます
              </div>
            )}
          </div>
          
          <button 
            onClick={handleStartTraining}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold text-base md:text-lg transition-colors shadow-lg flex items-center justify-center"
          >
            トレーニングスタート
          </button>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-3 md:p-6 shadow-lg mb-4 md:mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">MTTプリフロップトレーニングとは？</h2>
          <p className="mb-3 md:mb-4 text-gray-300 text-sm md:text-base">
            MTT（マルチテーブルトーナメント）でのプリフロップGTO戦略を学習します。
            このトレーニングではチップEVを考慮しており、ICM（Independent Chip Model）は考慮していません。
            スタックサイズに応じて戦略を変える必要があります。
          </p>
        </div>


        
        {showHandSelector && (
          <SimpleHandRangeSelector
            onSelectHands={handleHandSelectionChange}
            title="MTTプリフロップトレーニング用ハンド範囲選択"
            onClose={() => setShowHandSelector(false)}
            initialSelectedHands={selectedHands}
          />
        )}
      </div>
    </div>
    </AuthGuard>
  );
} 
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/contexts/AdminContext';
import { AuthGuard } from '@/components/AuthGuard';
import { HAND_TEMPLATES, getMTTRange, HandInfo } from '@/components/HandRange';
import { useAuth } from '@/contexts/FirebaseAuthContext';

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
  // NONEハンド除外用の新しいprops
  position?: string;
  stackSize?: string;
  actionType?: string;
  excludeNoneHands?: boolean;
  onTemplateSelect?: (templateName: string) => void;
}> = ({ 
  onSelectHands, 
  onClose, 
  title = "プレイするハンドを選択", 
  initialSelectedHands = [],
  position,
  stackSize,
  actionType,
  excludeNoneHands = false,
  onTemplateSelect
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartHand, setDragStartHand] = useState<string>('');
  const [dragStartRow, setDragStartRow] = useState<number>(-1);
  const [dragStartCol, setDragStartCol] = useState<number>(-1);
  const [dragStartSelected, setDragStartSelected] = useState<boolean>(false);
  const [dragDistance, setDragDistance] = useState<number>(0);
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [showAllTemplates, setShowAllTemplates] = useState<boolean>(false);
  
  // NONEアクションのハンドを取得する関数
  const getNoneHands = (): string[] => {
    if (!excludeNoneHands || !position || !stackSize || !actionType) {
      return [];
    }

    try {
      // スタックサイズを数値に変換
      const stackDepthBB = parseInt(stackSize.replace('BB', ''));
      
      // デフォルトのMTTレンジからNONEハンドを検索
      const rangeData = getMTTRange(position, stackDepthBB);

      if (rangeData) {
        return Object.entries(rangeData)
          .filter(([hand, info]) => info.action === 'NONE')
          .map(([hand]) => hand);
      }
    } catch (error) {
      console.warn('NONEハンドの取得に失敗:', error);
    }
    
    return [];
  };

  const noneHands = getNoneHands();
  console.log('🚫 Simple除外対象のNONEハンド:', noneHands.length, noneHands);
  
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
      let hands = levelHands[level as keyof typeof levelHands];
      
      // NONEハンド除外が有効な場合は、NONEハンドを除外
      if (excludeNoneHands && noneHands.length > 0) {
        hands = hands.filter(hand => !noneHands.includes(hand));
      }
      
      return hands;
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4 md:p-6 pt-32 md:pt-36 pb-safe-bottom" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
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
      <div className="bg-gray-900 rounded-xl p-2 md:p-6 max-w-4xl w-full mx-1 md:mx-4 h-[calc(100dvh-9rem)] md:h-[calc(100vh-10rem)] max-h-[calc(100dvh-9rem)] md:max-h-[calc(100vh-10rem)] overflow-y-auto shadow-2xl border border-gray-700" style={{ maxHeight: 'calc(100dvh - 9rem)' }}>
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
          <input
            type="range"
            min="0"
            max="7"
            step="1"
            defaultValue="0"
            onChange={(e) => {
              const level = Number(e.target.value);
              handleLevelChange(level);
            }}
            className="w-full h-1 md:h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider transition-all duration-300 ease-in-out"
            style={{
              background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 0%, #374151 0%, #374151 100%)`,
              transition: 'background 0.3s ease-in-out'
            }}
          />
        </div>

        <div className="mb-1 md:mb-4">
          <button
            onClick={handleConfirm}
            className="w-full px-3 md:px-4 py-2 md:py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm md:text-base font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
            選択完了 ({selectedHands.length}ハンド)
          </button>
        </div>
        
        {/* ハンドテンプレートセクション */}
        <div className="mb-1 md:mb-4 bg-gray-800 rounded-lg p-1 md:p-3 border border-gray-600">
          <h3 className="text-xs md:text-sm font-semibold text-white mb-1 md:mb-2">ハンドテンプレート</h3>
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
  const [opponentPosition, setOpponentPosition] = useState<string>('random');
  const [selectedHands, setSelectedHands] = useState<string[]>([]);
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [hasLocalStorage, setHasLocalStorage] = useState(false);
  
  const allStackSizes = ['75BB', '50BB', '40BB', '30BB', '20BB', '15BB'];
  const stackSizes = getAllowedStackSizes();
  const positions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  
  // アクション別の有効な相手ポジションを計算
  const getValidOpponentPositions = (heroPos: string, action: string): string[] => {
    const heroIndex = positions.indexOf(heroPos);
    if (action === 'vsopen') {
      // vsオープン: オープンレイザーはヒーローより前
      let validPositions = heroIndex > 0 ? positions.slice(0, heroIndex) : [];
      
      // 15BBでBBの場合、SBもオープナーとして追加
      if (stackSize === '15BB' && heroPos === 'BB') {
        validPositions.push('SB');
      }
      
      return validPositions;
    }
    if (action === 'vs3bet') {
      // vs3ベット: 3ベッターはヒーローより後
      return heroIndex < positions.length - 1 ? positions.slice(heroIndex + 1) : [];
    }
    if (action === 'vs4bet') {
      // vs4ベット: 4ベッターはヒーローより前（通常オリジナルオープンレイザー）
      return heroIndex > 0 ? positions.slice(0, heroIndex) : [];
    }
    return [];
  };
  
  const validOpponentPositions = getValidOpponentPositions(position, actionType);
  
  const actionTypes = [
    { id: 'openraise', label: 'オープン' },
    { id: 'vsopen', label: 'vs オープン', disabled: position === 'UTG' },
    { id: 'vs3bet', label: 'vs 3ベット', disabled: position === 'BB' },
    { id: 'vs4bet', label: 'vs 4ベット', disabled: stackSize === '15BB' || stackSize === '10BB' || position === 'UTG' },
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
          // 保存されたスタックサイズが使用できない場合は20BBに変更
          setStackSize('20BB');
        }
        if (settings.position && positions.includes(settings.position)) {
          setPosition(settings.position);
        }
        if (settings.actionType && actionTypes.some(a => a.id === settings.actionType)) {
          setActionType(settings.actionType);
        }
        if (settings.opponentPosition) {
          setOpponentPosition(settings.opponentPosition);
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
        opponentPosition,
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
  
  // アクションタイプ変更時に相手ポジションをリセット
  useEffect(() => {
    if (!isInitialLoad) {
      setOpponentPosition('random');
    }
  }, [actionType, isInitialLoad]);
  
  // スタックサイズ変更時にアクションタイプをチェック
  useEffect(() => {
    if (!isInitialLoad) {
      const currentAction = actionTypes.find(a => a.id === actionType);
      if (currentAction?.disabled) {
        // 現在のアクションが無効な場合、最初の有効なアクションに変更
        const validAction = actionTypes.find(a => !a.disabled);
        if (validAction) {
          setActionType(validAction.id);
        }
      }
    }
  }, [stackSize, position, isInitialLoad]);
  
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
    const params = new URLSearchParams({
      stack: stackSize,
      position: position,
      action: actionType,
      ...(opponentPosition !== 'random' && {
        ...(actionType === 'vsopen' && { opener: opponentPosition }),
        ...(actionType === 'vs3bet' && { threebetter: opponentPosition }),
        ...(actionType === 'vs4bet' && { fourbetter: opponentPosition })
      }),
      ...(selectedHands.length > 0 ? { hands: encodeURIComponent(selectedHands.join(',')) } : {})
    });
    
    router.push(`/trainer/mtt/training?${params.toString()}`);
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
          <h1 className="text-lg md:text-3xl font-bold text-center">MTTプリフロップトレーニング - チップEV</h1>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-2 md:p-4 shadow-lg mb-3 md:mb-6">
          <div className="flex justify-between items-center mb-2 md:mb-3">
            <h2 className="text-base md:text-xl font-semibold">シナリオ設定</h2>
            <div className="flex items-center gap-1 md:gap-2">
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
            <h3 className="text-sm md:text-lg font-medium mb-2">エフェクティブスタック</h3>
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
                  title={!canUseStackSize(stack) ? '無料プランでは20BBのみ利用可能です' : ''}
                >
                  {stack}
                  {!canUseStackSize(stack) && <span className="ml-1 text-xs">🔒</span>}
                </button>
              ))}
            </div>
            {stackSizes.length === 1 && (
              <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-2">
                💡 無料プランでは20BBモードのみ利用可能です。プランアップグレードで全スタックサイズが利用できます。
              </div>
            )}
          </div>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-lg font-medium mb-2">あなたのポジション</h3>
            <div className="flex flex-wrap gap-1 md:gap-2">
              {positions.map(pos => (
                <button 
                  key={pos}
                  className={`px-2 md:px-3 py-1 md:py-2 rounded text-sm md:text-base ${position === pos ? 'bg-green-600' : 'bg-gray-700'} transition-colors hover:bg-green-500`}
                  onClick={() => setPosition(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-lg font-medium mb-2">相手のポジション</h3>
            <div className="flex flex-wrap gap-1 md:gap-2">
              <button 
                className={`px-2 md:px-3 py-1 md:py-2 rounded text-sm md:text-base transition-colors ${
                  (actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet') 
                    ? (opponentPosition === 'random' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-blue-500')
                    : 'bg-gray-500 cursor-not-allowed opacity-50'
                }`}
                onClick={() => (actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet') && setOpponentPosition('random')}
                disabled={!(actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet')}
              >
                ランダム
              </button>
              {positions.map(pos => {
                const isValid = validOpponentPositions.includes(pos);
                const isActionTypeValid = (actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet');
                return (
                  <button 
                    key={pos}
                    className={`px-2 md:px-3 py-1 md:py-2 rounded text-sm md:text-base transition-colors ${
                      !isActionTypeValid ? 'bg-gray-500 cursor-not-allowed opacity-50' :
                      opponentPosition === pos ? 'bg-blue-600' : 
                      isValid ? 'bg-gray-700 hover:bg-blue-500' : 'bg-gray-500 cursor-not-allowed opacity-50'
                    }`}
                    onClick={() => isActionTypeValid && isValid && setOpponentPosition(pos)}
                    disabled={!isActionTypeValid || !isValid}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
            {!validOpponentPositions.length && (actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet') && (
              <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-2">
                ⚠️ 現在の設定では有効な相手ポジションがありません。ヒーローポジションまたはアクションタイプを変更してください。
              </div>
            )}
          </div>
          
          <div className="mb-4 md:mb-6">
            <h3 className="text-sm md:text-lg font-medium mb-2">アクションタイプ</h3>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-1 md:gap-2">
              {actionTypes.map(action => (
                <button 
                  key={action.id}
                  className={`px-1.5 md:px-3 py-1 md:py-2 rounded-lg text-xs md:text-base ${
                    action.disabled ? 'bg-gray-500 cursor-not-allowed opacity-50' : 
                    actionType === action.id ? 'bg-red-600' : 'bg-gray-700'
                  } transition-colors text-left ${!action.disabled ? 'hover:bg-red-500' : ''}`}
                  onClick={() => !action.disabled && setActionType(action.id)}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="mb-4 md:mb-8 bg-gray-700 bg-opacity-50 rounded-lg p-3 md:p-5">
            <button 
              onClick={openHandSelector}
              className="w-full py-2 md:py-4 px-3 md:px-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-sm md:text-lg transition-colors shadow-lg flex items-center justify-center"
            >
              ハンドを選択
            </button>
            
            {selectedHands.length > 0 ? (
              <div className="mt-2 md:mt-4">
                <div className="text-xs md:text-sm text-purple-300 mb-1 md:mb-2">{selectedHands.length}種類のハンドを選択中</div>
                <div className="bg-gray-800 rounded-lg p-1.5 md:p-3 max-h-16 md:max-h-32 overflow-auto border border-gray-700">
                  <div className="flex flex-wrap gap-0.5 md:gap-2">
                    {selectedHands.map(hand => (
                      <span key={hand} className="inline-block px-1 md:px-2 py-0.5 md:py-1 bg-purple-700 rounded text-xs font-medium">
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
        


        
        {showHandSelector && (
          <SimpleHandRangeSelector
            onSelectHands={handleHandSelectionChange}
            title="MTTプリフロップトレーニング - チップEV用ハンド範囲選択"
            onClose={() => setShowHandSelector(false)}
            initialSelectedHands={selectedHands}
            position={position}
            stackSize={stackSize}
            actionType={actionType}
            excludeNoneHands={true}
          />
        )}
      </div>
    </div>
    </AuthGuard>
  );
} 
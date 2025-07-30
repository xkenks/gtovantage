'use client';

import React, { useEffect, useState } from 'react';
import { PokerCardList } from './PokerCard';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaCheck } from 'react-icons/fa';
import { HandRangeGrid, HandRangeButton, btnOpenRaiseRange, HandInfo, getRangeForPosition } from './HandRange';

// Position type
type PositionType = 'SB' | 'BB' | 'UTG' | 'UTG1' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'MP';

// テーブル上のポジション情報の型定義
interface PositionInfo {
  label: string;
  x: number;
  y: number;
  isHero: boolean;
}

// PokerTable で使用するスポットの型定義
export interface Spot {
  id: string;
  name?: string;
  description: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'intermediate' | 'beginner' | 'advanced';
  currentStreet?: 'preflop' | 'flop' | 'turn' | 'river';
  street?: 'preflop' | 'flop' | 'turn' | 'river';
  heroPosition?: string;
  heroHand?: string | string[];
  potSize?: number;
  pot?: number;
  correctAction?: string;
  optimalAction?: string;
  explanation?: string;
  evData?: {
    [action: string]: number;
  };
  evs?: {
    [action: string]: number;
  };
  board?: string[];
  positions?: Record<string, { 
    active: boolean; 
    stack: number;
    isHero?: boolean;
    actions?: string[];
  }>;
  players?: {
    position: string;
    stack: number;
    hand: any;
    hasAction: boolean;
  }[];
  correctBetSize?: number;
  preflopActions?: string[];
  
  // MTT特有のフィールド
  tournamentType?: 'standard' | 'turbo' | 'hyper';
  tournamentStage?: 'early' | 'middle' | 'bubble' | 'final_table';
  icmFactors?: {
    payoutStructure?: number[];
    playerChipStacks?: number[];
    remainingPlayers?: number;
  };
  icmPressure?: 'low' | 'medium' | 'high' | 'extreme';
  stackDepth?: string; // "15BB", "30BB", etc.
  frequencies?: {
    [action: string]: number;
  };
  
  // vs オープン用の追加情報
  openRaiserPosition?: string; // オープンレイズしたプレイヤーのポジション
  openRaiseSize?: number;     // オープンレイズのサイズ
  openerActionType?: 'MIN' | 'ALL_IN'; // オープンレイザーのアクションタイプ
  
  // vs 3ベット用の追加情報
  threeBetSize?: number;      // 3ベットのサイズ
  threeBetterPosition?: string; // 3ベットしたプレイヤーのポジション
  
  // アクションタイプ (push_fold など)
  actionType?: string;
}

// アクションボタンの型定義
interface ActionButton {
  label: string;
  action: string;
  colorClass: string;
}

export interface PokerTableProps {
  currentSpot: Spot;
  selectedAction: string | null;
  isCorrect?: boolean;
  showResults?: boolean;
  onActionSelect?: (action: string, betSize?: number) => void;
  availableActions?: string[];
  heroHand?: string[];
  potSize?: number;
  onNextSpot?: () => void;
  onRepeatSpot?: () => void; // 繰り返し機能のコールバック
  positionRangeData?: Record<string, HandInfo>; // ポジションごとのレンジデータ
  stackSize?: string; // スタックサイズを追加
  cpuActionEnabled?: boolean; // CPUアクション機能の有効/無効
  onActionCompleted?: () => void; // CPU行動が完了した時のコールバック
  backButtonUrl?: string; // 戻るボタンのURL
}

export const PokerTable: React.FC<PokerTableProps> = ({ 
  currentSpot, 
  selectedAction,
  isCorrect = false,
  showResults = false,
  onActionSelect,
  availableActions = ['FOLD', 'CHECK', 'CALL', 'RAISE'],
  heroHand,
  potSize,
  onNextSpot,
  onRepeatSpot,
  positionRangeData,
  stackSize = '100',
  cpuActionEnabled = false,
  onActionCompleted,
  backButtonUrl
}) => {
  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // ハンドレンジの表示状態管理
  const [showHandRange, setShowHandRange] = useState(false);

  // アクション結果の表示状態管理
  const [showActionResult, setShowActionResult] = useState(true);
  // アクション結果の不透明度管理
  const [actionResultOpacity, setActionResultOpacity] = useState(1);
  // アクション結果のトランスフォーム管理（位置）
  const [actionResultTransform, setActionResultTransform] = useState('translate(-100%, 0)');

  // CPUプレイヤーのアクション状態管理
  const [cpuActionPlayers, setCpuActionPlayers] = useState<string[]>([]);
  const [currentCpuIndex, setCurrentCpuIndex] = useState<number>(-1);
  const [cpuActionResults, setCpuActionResults] = useState<Record<string, {action: string, result?: string}>>({});
  const [cpuActionComplete, setCpuActionComplete] = useState(false);
  
  // アクション順序の初期化
  const [actionOrder, setActionOrder] = useState<string[]>([]);

  // 選択されたアクションが変更されたときに表示し、数秒後に非表示にする
  useEffect(() => {
    if (selectedAction) {
      // 表示状態をリセット
      setShowActionResult(true);
      setActionResultOpacity(0); // 最初は透明に設定
      // 左から入ってくるエフェクト用のトランスフォーム初期設定
      setActionResultTransform('translate(-100%, 0)');
      
      // 表示用タイマー - 遅延を短くして即座に表示開始
      const showTimer = setTimeout(() => {
        setActionResultOpacity(1); // フェードイン
        setActionResultTransform('translate(-50%, 0)'); // 中央に移動
      }, 10); // 遅延を50msから10msに短縮
      
      // 1.5秒後にフェードアウト開始
      const fadeOutTimer = setTimeout(() => {
        setActionResultOpacity(0); // フェードアウト開始
        setActionResultTransform('translate(-50%, 0) translateX(30px)'); // 右に移動（距離を短く）
      }, 1500);
      
      // 2秒後に表示を消すタイマー
      const hideTimer = setTimeout(() => {
        setShowActionResult(false);
      }, 2000);
      
      // コンポーネントがアンマウントされるときにタイマーをクリア
      return () => {
        clearTimeout(showTimer);
        clearTimeout(fadeOutTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [selectedAction]);

  // アクション順序の初期化
  useEffect(() => {
    if (currentSpot && currentSpot.heroPosition) {
      // アクション順序を定義（UTGから始まる）
      const allPositions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
      
      // ヒーローのインデックスを取得
      const heroIndex = allPositions.indexOf(currentSpot.heroPosition);
      
      if (heroIndex !== -1) {
        // ヒーローから次のBBまでのプレイヤーをアクション順に設定
        const playersAfterHero = allPositions.slice(heroIndex + 1);
        
        // ヒーローの後ろのプレイヤーがアクション順序になる
        setActionOrder(playersAfterHero);
        
        // CPUプレイヤーが有効な場合は初期化
        if (cpuActionEnabled) {
          setCpuActionPlayers(playersAfterHero);
          setCpuActionResults({});
          setCpuActionComplete(false);
          setCurrentCpuIndex(-1); // 初期状態では何も実行していない
        }
      }
    }
  }, [currentSpot, cpuActionEnabled]);

  // ヒーローポジションに基づいたレンジデータを取得
  const heroPosition = currentSpot.heroPosition || 'UTG1';
  const rangeData = positionRangeData || getRangeForPosition(heroPosition);

  // ポットサイズを取得する関数
  const getPotSize = (): number => {
    if (potSize !== undefined) {
      return potSize;
    }
    if (currentSpot.potSize !== undefined) {
      return currentSpot.potSize;
    }
    if (currentSpot.pot !== undefined) {
      return currentSpot.pot;
    }
    return 0;
  };

  // CPUプレイヤーのアクションを実行する関数
  const executeNextCpuAction = () => {
    if (!cpuActionEnabled || currentCpuIndex >= cpuActionPlayers.length - 1) {
      // すべてのCPUプレイヤーのアクションが完了した場合
      setCpuActionComplete(true);
      if (onActionCompleted) {
        onActionCompleted();
      }
      return;
    }
    
    // 次のCPUプレイヤーへ
    const nextIndex = currentCpuIndex + 1;
    setCurrentCpuIndex(nextIndex);
    
    // 次のプレイヤーのポジションを取得
    const nextPosition = cpuActionPlayers[nextIndex];
    
    // CPU行動のタイプを生成
    const cpuHandType = generateCpuHandType();
    // アクションを決定
    const cpuAction = getCpuAction(nextPosition, cpuHandType);
    
    // アクション結果を保存
    setCpuActionResults(prev => ({
      ...prev,
      [nextPosition]: {
        action: cpuAction,
        result: formatCpuActionResult(cpuAction, nextPosition)
      }
    }));
    
    // 少し遅延して次のCPUプレイヤーのアクションを実行
    setTimeout(() => {
      executeNextCpuAction();
    }, 1000); // 1秒後に次のCPUプレイヤーのアクションを実行
  };

  // CPU用のハンドタイプをランダムに生成
  const generateCpuHandType = () => {
    const handStrengths = ['premium', 'strong', 'medium', 'weak', 'trash'];
    // ランダムにハンド強さを選択（ランダム性を高めるための重み付け）
    const weights = [10, 20, 30, 25, 15]; // 合計100
    
    const totalWeight = weights.reduce((acc, weight) => acc + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < weights.length; i++) {
      if (random < weights[i]) {
        return handStrengths[i];
      }
      random -= weights[i];
    }
    
    return handStrengths[Math.floor(Math.random() * handStrengths.length)];
  };

  // CPU用の3ベットサイズを取得
  const getCpu3betSize = (position: string) => {
    // ポジションに基づいて3ベットサイズを決定
    if (['BTN', 'CO'].includes(position)) {
      return 7; // ボタンやカットオフからは小さめの3ベット
    } else if (['SB', 'BB'].includes(position)) {
      return 9; // ブラインドからは大きめの3ベット
    }
    return 8; // その他のポジションからは標準的な3ベット
  };

  // CPUのアクションを決定する関数
  const getCpuAction = (position: string, handType: string) => {
    // GTOレンジに基づく行動決定のシミュレーション
    // 実際には現在のGTOデータベースからの参照やAIによる決定を行う
    
    // ハンドタイプとポジションに基づく行動確率
    const actionProbabilities: Record<string, Record<string, number>> = {
      'premium': { 'FOLD': 0, 'CALL': 20, 'RAISE': 80 },
      'strong': { 'FOLD': 10, 'CALL': 50, 'RAISE': 40 },
      'medium': { 'FOLD': 30, 'CALL': 60, 'RAISE': 10 },
      'weak': { 'FOLD': 70, 'CALL': 30, 'RAISE': 0 },
      'trash': { 'FOLD': 95, 'CALL': 5, 'RAISE': 0 }
    };
    
    // ポジションによる調整
    let positionAdjustment: Record<string, Record<string, number>> = {
      'SB': { 'FOLD': -10, 'CALL': 0, 'RAISE': 10 }, // SBはよりアグレッシブに
      'BB': { 'FOLD': -20, 'CALL': 10, 'RAISE': 10 }, // BBは防衛的に
      'BTN': { 'FOLD': -5, 'CALL': -5, 'RAISE': 10 }, // BTNはレイズ寄り
      'CO': { 'FOLD': 0, 'CALL': 0, 'RAISE': 0 } // COは標準的
    };
    
    // その他のポジションの調整
    if (!positionAdjustment[position]) {
      positionAdjustment[position] = { 'FOLD': 5, 'CALL': 0, 'RAISE': -5 }; // アーリーポジションはタイト
    }
    
    // 調整された確率を計算
    const adjustedProbabilities: Record<string, number> = {
      'FOLD': Math.max(0, Math.min(100, actionProbabilities[handType]['FOLD'] + (positionAdjustment[position]['FOLD'] || 0))),
      'CALL': Math.max(0, Math.min(100, actionProbabilities[handType]['CALL'] + (positionAdjustment[position]['CALL'] || 0))),
      'RAISE': Math.max(0, Math.min(100, actionProbabilities[handType]['RAISE'] + (positionAdjustment[position]['RAISE'] || 0)))
    };
    
    // 合計が100になるように正規化
    const total = adjustedProbabilities['FOLD'] + adjustedProbabilities['CALL'] + adjustedProbabilities['RAISE'];
    
    if (total > 0) {
      adjustedProbabilities['FOLD'] = (adjustedProbabilities['FOLD'] / total) * 100;
      adjustedProbabilities['CALL'] = (adjustedProbabilities['CALL'] / total) * 100;
      adjustedProbabilities['RAISE'] = (adjustedProbabilities['RAISE'] / total) * 100;
    }
    
    // 確率に基づいてアクションを選択
    const random = Math.random() * 100;
    
    if (random < adjustedProbabilities['FOLD']) {
      return 'FOLD';
    } else if (random < adjustedProbabilities['FOLD'] + adjustedProbabilities['CALL']) {
      return 'CALL';
          } else {
      // レイズの場合はサイズも決定
      const raiseSize = getCpu3betSize(position);
      return `RAISE ${raiseSize}`;
    }
  };

  // CPUのアクション結果をフォーマットする関数
  const formatCpuActionResult = (action: string, position: string) => {
    if (action === 'FOLD') {
      return 'フォールド';
    } else if (action === 'CALL') {
      return 'コール';
    } else if (action.startsWith('RAISE')) {
      const match = action.match(/RAISE (\d+(\.\d+)?)/);
      const raiseAmount = match ? match[1] : '?';
      return `${raiseAmount}BBにレイズ`;
    } else if (action === 'ALL IN') {
      return 'オールイン';
    }
    return '';
  };

  // ヒーローのアクションが選択された後にCPUアクションを開始
  useEffect(() => {
    if (cpuActionEnabled && selectedAction && !cpuActionComplete) {
      // 少し遅延してCPUアクションを開始
      setTimeout(() => {
        executeNextCpuAction();
      }, 1000);
    }
  }, [selectedAction, cpuActionEnabled]);

  // アクションが完了しているかチェックする関数
  const isCPUActionComplete = () => {
    return cpuActionComplete;
  };

  // ポジションがアクティブかどうかをチェックする関数
  const isActionActive = (position: string) => {
    if (!cpuActionEnabled) return false;
    
    // 現在のCPUプレイヤーインデックスを取得
    const playerIndex = cpuActionPlayers.indexOf(position);
    return playerIndex === currentCpuIndex;
  };

  // ポジションがアクション待ちかどうかをチェックする関数
  const isWaitingForAction = (position: string) => {
    if (!cpuActionEnabled) return false;
    
    // 現在のCPUプレイヤーインデックスを取得
    const playerIndex = cpuActionPlayers.indexOf(position);
    return playerIndex > currentCpuIndex && playerIndex < cpuActionPlayers.length;
  };

  // CPUアクション結果を取得する関数
  const getCpuActionResult = (position: string) => {
    return cpuActionResults[position]?.action || null;
  };

  // アクション結果をフォーマットする関数
  const formatActionResult = (): { element: JSX.Element; evaluationLevel: 'perfect' | 'optimal' | 'acceptable' | 'suboptimal' } => {
    if (!selectedAction) return { element: <></>, evaluationLevel: 'suboptimal' };
    
    // 評価レベルのデフォルト値
    let evaluationLevel: 'perfect' | 'optimal' | 'acceptable' | 'suboptimal' = 'optimal';
    
    // アクションの種類と頻度を取得
    const actionType = selectedAction.split(' ')[0]; // "RAISE", "CALL", "FOLD", "ALL IN"
    let actionFrequency = 0;
    
    // 頻度ベースの評価（frequencies情報がある場合）
    if (currentSpot.frequencies && Object.keys(currentSpot.frequencies).length > 0) {
      // 選択したアクションの頻度を直接取得（既にパーセント形式）
      const selectedFrequency = currentSpot.frequencies[selectedAction] || 0;
      actionFrequency = selectedFrequency; // パーセントとして直接使用
      
      // 最大頻度のアクションを見つける
      let maxFrequency = 0;
      let maxFrequencyAction = '';
      
      Object.entries(currentSpot.frequencies).forEach(([action, frequency]) => {
        if (frequency > maxFrequency) {
          maxFrequency = frequency;
          maxFrequencyAction = action;
        }
      });
      
      // 頻度に基づいて評価
      if (selectedAction === maxFrequencyAction) {
        // 最大頻度のアクションを選んだ場合は大正解（perfect）
        evaluationLevel = 'perfect';
      } else if (selectedFrequency >= 30) {
        // 頻度が30%以上のアクションを選んだ場合は正解（optimal）
        evaluationLevel = 'optimal';
      } else if (selectedFrequency >= 10) {
        // 頻度が10%以上のアクションを選んだ場合は許容範囲（acceptable）
        evaluationLevel = 'acceptable';
            } else {
        // 頻度が10%未満のアクションを選んだ場合は不正解（suboptimal）
        evaluationLevel = 'suboptimal';
      }
    }
    // 頻度情報がない場合は従来の評価方法を使用
    else {
      // 正しいアクションとの比較（正解がない場合は常にoptimal）
      if (currentSpot.correctAction) {
        if (selectedAction === currentSpot.correctAction) {
          evaluationLevel = 'perfect';
        } else if (
          // リスクの低いアクションを選んだ場合（コールvs.レイズなど）
          (currentSpot.correctAction === 'RAISE' && selectedAction === 'CALL') ||
          (currentSpot.correctAction === 'CALL' && selectedAction === 'FOLD')
        ) {
          evaluationLevel = 'acceptable';
        } else {
          evaluationLevel = 'suboptimal';
        }
      }
      
      // 頻度情報がない場合の頻度計算（評価レベルに基づく調整）
      if (evaluationLevel === 'perfect') {
        // 大正解の場合は状況に応じた頻度（パーセント形式）
        if (actionType === 'FOLD') actionFrequency = 95;   // フォールドの大正解
        else if (actionType === 'CALL') actionFrequency = 75;  // コールの大正解  
        else if (actionType === 'RAISE') actionFrequency = 65;  // レイズの大正解
        else if (actionType === 'ALL') actionFrequency = 90;   // オールインの大正解
        else actionFrequency = 80;  // その他
      } else if (evaluationLevel === 'optimal') {
        // 正解の場合は中程度の頻度（パーセント形式）
        if (actionType === 'FOLD') actionFrequency = 60;   // フォールド正解
        else if (actionType === 'CALL') actionFrequency = 50;  // コール正解
        else if (actionType === 'RAISE') actionFrequency = 40;  // レイズ正解
        else if (actionType === 'ALL') actionFrequency = 55;   // オールイン正解
        else actionFrequency = 45;  // その他
      } else if (evaluationLevel === 'acceptable') {
        // 許容範囲の場合は低めの頻度（パーセント形式）
        if (actionType === 'FOLD') actionFrequency = 30;
        else if (actionType === 'CALL') actionFrequency = 25;
        else if (actionType === 'RAISE') actionFrequency = 20;
        else if (actionType === 'ALL') actionFrequency = 15;
        else actionFrequency = 20;
      } else if (evaluationLevel === 'suboptimal') {
        // 不正解の場合は極めて低い頻度（パーセント形式）
        if (actionType === 'FOLD') actionFrequency = 5;
        else if (actionType === 'CALL') actionFrequency = 10;
        else if (actionType === 'RAISE') actionFrequency = 5;
        else if (actionType === 'ALL') actionFrequency = 2;
        else actionFrequency = 5;
      }
    }
    
    // 頻度の表示形式（パーセントで表示）
    const frequencyText = ` ${Math.round(actionFrequency)}%`;
    
    // アクションに応じた表示（英語で表示）
    const actionLabel = (() => {
      switch (actionType) {
        case 'FOLD': return 'FOLD';
        case 'CHECK': return 'CHECK';
        case 'CALL': return 'CALL';
        case 'RAISE': return 'RAISE';
        case 'ALL': return 'ALL IN'; // "ALL IN"の場合
        case 'MIN': return 'MIN'; // MINレイズの場合
        default: return actionType;
      }
    })();
    
    // isCorrectによる強制的な上書き
    if (isCorrect && (evaluationLevel === 'suboptimal' || evaluationLevel === 'acceptable')) {
      evaluationLevel = 'optimal';
    } else if (!isCorrect && (evaluationLevel === 'perfect' || evaluationLevel === 'optimal' || evaluationLevel === 'acceptable')) {
      evaluationLevel = 'suboptimal';
    }
    
    // 評価レベルに応じた表示
    if (evaluationLevel === 'perfect' || evaluationLevel === 'optimal' || evaluationLevel === 'acceptable') {
      // 正解の場合（シンプルなボックスのみ）
      return {
        element: (
          <div className="bg-green-500 text-white px-3 py-2 rounded-sm text-sm whitespace-nowrap flex items-center shadow-lg border border-green-400">
            {actionLabel}{frequencyText}
          </div>
        ),
        evaluationLevel
      };
    } else {
      // 不正解の場合（シンプルなボックス）
      return {
        element: (
          <div className="bg-red-500 text-white px-3 py-2 rounded-sm text-sm whitespace-nowrap flex items-center shadow-lg border border-red-400">
            {actionLabel}{frequencyText}
          </div>
        ),
        evaluationLevel
      };
    }
  };

  // ポジションの表示名を取得する関数
  const getPositionDisplayName = (position: string): string => {
    // ポジション名のみ返す
    return position === 'UTG1' ? 'UTG+1' : position;
  };

  // アクションが終わったポジションかどうかを判断する関数
  const isActionComplete = (position: string): boolean => {
    // ヒーローのポジション
    const heroPos = currentSpot.heroPosition || '';
    
    // vs3ベットの場合
    if (currentSpot.actionType === 'vs3bet') {
      // ヒーローと3ベッター以外はフォールド
      const threeBetterPos = currentSpot.threeBetterPosition;
      return position !== heroPos && position !== threeBetterPos;
    }
    
    // vs4ベットの場合
    if (currentSpot.actionType === 'vs4bet') {
      // ヒーローと4ベッター以外はフォールド
      const fourBetterPos = currentSpot.openRaiserPosition; // vs4ベットでは4ベッターがオープンレイザー
      return position !== heroPos && position !== fourBetterPos;
    }
    
    // vsオープンの場合（既存のロジック）
    // オープンレイザーは常にアクティブ状態を保つ
    if (position === currentSpot.openRaiserPosition) {
      return false;
    }
    
    // アクション順序を定義（UTGから始まる）
    const actionOrder = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    
    // ヒーローとチェックするポジションのインデックスを取得
    const heroIndex = actionOrder.indexOf(heroPos);
    const posIndex = actionOrder.indexOf(position);
    
    // インデックスが存在しない場合はfalse
    if (heroIndex === -1 || posIndex === -1) return false;
    
    // ヒーローより前にアクションするポジションはアクションが終わっている
    return posIndex < heroIndex;
  };

  // ポジションのスタック数を計算する関数
  const getPositionStack = (position: string): string => {
    // stackSizeが文字列なので数値に変換
    const baseStack = parseInt(stackSize);
    
    // ブラインドポジションはスタックが減る
    if (position === 'SB') {
      const stack = baseStack - 0.5;
      return stack === 0 ? '0' : `${stack}`;
    } else if (position === 'BB') {
      const stack = baseStack - 1;
      return stack === 0 ? '0' : `${stack}`;
    }
    
    // ヒーローがレイズした場合
    if (position === currentSpot.heroPosition && selectedAction && selectedAction.startsWith('RAISE')) {
      // レイズ額を抽出して減算
      const raiseMatch = selectedAction.match(/RAISE (\d+(\.\d+)?)/);
      if (raiseMatch && raiseMatch[1]) {
        const raiseAmount = parseFloat(raiseMatch[1]);
        const stack = baseStack - raiseAmount;
        return stack === 0 ? '0' : `${stack.toFixed(1)}`;
      }
    }
    
    // オープンレイザーの場合、レイズ額分のスタックを減らす
    if (position === currentSpot.openRaiserPosition && currentSpot.openRaiseSize) {
      const stack = baseStack - currentSpot.openRaiseSize;
      return stack === 0 ? '0' : `${stack.toFixed(1)}`;
    }
    
    // その他のポジションは指定されたスタックサイズをそのまま使用
    return `${baseStack}`;
  };

  // PCレイアウト用のポジション計算関数
  const calculatePCPositions = (): Record<string, PositionInfo> => {
    // ポジション座標を明示的に定義
    const positions: Record<string, PositionInfo> = {};

    // ヒーローのポジションを特定
    const heroPos = currentSpot.heroPosition || '';
    
    // 実際のポーカーテーブルでの席順（時計回り）: BTN→SB→BB→UTG→UTG+1→LJ→HJ→CO→BTN
    // プリフロップのアクション順: UTG→UTG+1→LJ→HJ→CO→BTN→SB→BB→UTG
    
    if (heroPos === 'BTN') {
      // BTNがヒーローの場合（6時位置）
      positions['BTN'] = { label: 'BTN', x: 50, y: 55, isHero: true };      // ヒーロー位置（6時→高さを55に修正）
      positions['SB'] = { label: 'SB', x: 25, y: 55, isHero: false };       // 左下（7-8時）
      positions['BB'] = { label: 'BB', x: 15, y: 35, isHero: false };       // 左（9時）
      positions['UTG'] = { label: 'UTG', x: 25, y: 15, isHero: false };     // 左上（10-11時）
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 15, isHero: false };   // 上（12時）
      positions['LJ'] = { label: 'LJ', x: 75, y: 15, isHero: false };       // 右上（1-2時）
      positions['HJ'] = { label: 'HJ', x: 85, y: 35, isHero: false };       // 右（3時）
      positions['CO'] = { label: 'CO', x: 75, y: 55, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'SB') {
      // SBがヒーローの場合（6時位置）
      positions['SB'] = { label: 'SB', x: 50, y: 55, isHero: true };        // ヒーロー位置（6時→高さを55に修正）
      positions['BB'] = { label: 'BB', x: 25, y: 55, isHero: false };       // 左下（7-8時）
      positions['UTG'] = { label: 'UTG', x: 15, y: 35, isHero: false };     // 左（9時）
      positions['UTG1'] = { label: 'UTG+1', x: 25, y: 15, isHero: false };   // 左上（10-11時）
      positions['LJ'] = { label: 'LJ', x: 50, y: 15, isHero: false };       // 上（12時）
      positions['HJ'] = { label: 'HJ', x: 75, y: 15, isHero: false };       // 右上（1-2時）
      positions['CO'] = { label: 'CO', x: 85, y: 35, isHero: false };       // 右（3時）
      positions['BTN'] = { label: 'BTN', x: 75, y: 55, isHero: false };     // 右下（4-5時）
    } else if (heroPos === 'BB') {
      // BBがヒーローの場合（6時位置）
      positions['BB'] = { label: 'BB', x: 50, y: 55, isHero: true };        // ヒーロー位置（6時→高さを55に修正）
      positions['UTG'] = { label: 'UTG', x: 25, y: 55, isHero: false };     // 左下（7-8時）
      positions['UTG1'] = { label: 'UTG+1', x: 15, y: 35, isHero: false };   // 左（9時）
      positions['LJ'] = { label: 'LJ', x: 25, y: 15, isHero: false };       // 左上（10-11時）
      positions['HJ'] = { label: 'HJ', x: 50, y: 15, isHero: false };       // 上（12時）
      positions['CO'] = { label: 'CO', x: 75, y: 15, isHero: false };       // 右上（1-2時）
      positions['BTN'] = { label: 'BTN', x: 85, y: 35, isHero: false };     // 右（3時）
      positions['SB'] = { label: 'SB', x: 75, y: 55, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'UTG') {
      // UTGがヒーローの場合（6時位置）
      positions['UTG'] = { label: 'UTG', x: 50, y: 55, isHero: true };      // ヒーロー位置（6時→高さを55に修正）
      positions['UTG1'] = { label: 'UTG+1', x: 25, y: 55, isHero: false };   // 左下（7-8時）
      positions['LJ'] = { label: 'LJ', x: 15, y: 35, isHero: false };       // 左（9時）
      positions['HJ'] = { label: 'HJ', x: 25, y: 15, isHero: false };       // 左上（10-11時）
      positions['CO'] = { label: 'CO', x: 50, y: 15, isHero: false };       // 上（12時）
      positions['BTN'] = { label: 'BTN', x: 75, y: 15, isHero: false };     // 右上（1-2時）
      positions['SB'] = { label: 'SB', x: 85, y: 35, isHero: false };       // 右（3時）
      positions['BB'] = { label: 'BB', x: 75, y: 55, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'UTG1') {
      // UTG1がヒーローの場合（6時位置）
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 55, isHero: true };    // ヒーロー位置（6時→高さを55に修正）
      positions['LJ'] = { label: 'LJ', x: 25, y: 55, isHero: false };       // 左下（7-8時）
      positions['HJ'] = { label: 'HJ', x: 15, y: 35, isHero: false };       // 左（9時）
      positions['CO'] = { label: 'CO', x: 25, y: 15, isHero: false };       // 左上（10-11時）
      positions['BTN'] = { label: 'BTN', x: 50, y: 15, isHero: false };     // 上（12時）
      positions['SB'] = { label: 'SB', x: 75, y: 15, isHero: false };       // 右上（1-2時）
      positions['BB'] = { label: 'BB', x: 85, y: 35, isHero: false };       // 右（3時）
      positions['UTG'] = { label: 'UTG', x: 75, y: 55, isHero: false };     // 右下（4-5時）
    } else if (heroPos === 'LJ') {
      // LJがヒーローの場合（6時位置）
      positions['LJ'] = { label: 'LJ', x: 50, y: 55, isHero: true };        // ヒーロー位置（6時→高さを55に修正）
      positions['HJ'] = { label: 'HJ', x: 25, y: 55, isHero: false };       // 左下（7-8時）
      positions['CO'] = { label: 'CO', x: 15, y: 35, isHero: false };       // 左（9時）
      positions['BTN'] = { label: 'BTN', x: 25, y: 15, isHero: false };     // 左上（10-11時）
      positions['SB'] = { label: 'SB', x: 50, y: 15, isHero: false };       // 上（12時）
      positions['BB'] = { label: 'BB', x: 75, y: 15, isHero: false };       // 右上（1-2時）
      positions['UTG'] = { label: 'UTG', x: 85, y: 35, isHero: false };     // 右（3時）
      positions['UTG1'] = { label: 'UTG+1', x: 75, y: 55, isHero: false };   // 右下（4-5時）
    } else if (heroPos === 'HJ') {
      // HJがヒーローの場合（6時位置）
      positions['HJ'] = { label: 'HJ', x: 50, y: 55, isHero: true };        // ヒーロー位置（6時→高さを55に修正）
      positions['CO'] = { label: 'CO', x: 25, y: 55, isHero: false };       // 左下（7-8時）
      positions['BTN'] = { label: 'BTN', x: 15, y: 35, isHero: false };     // 左（9時）
      positions['SB'] = { label: 'SB', x: 25, y: 15, isHero: false };       // 左上（10-11時）
      positions['BB'] = { label: 'BB', x: 50, y: 15, isHero: false };       // 上（12時）
      positions['UTG'] = { label: 'UTG', x: 75, y: 15, isHero: false };     // 右上（1-2時）
      positions['UTG1'] = { label: 'UTG+1', x: 85, y: 35, isHero: false };   // 右（3時）
      positions['LJ'] = { label: 'LJ', x: 75, y: 55, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'CO') {
      // COがヒーローの場合（6時位置）
      positions['CO'] = { label: 'CO', x: 50, y: 55, isHero: true };        // ヒーロー位置（6時→高さを55に修正）
      positions['BTN'] = { label: 'BTN', x: 25, y: 55, isHero: false };     // 左下（7-8時）
      positions['SB'] = { label: 'SB', x: 15, y: 35, isHero: false };       // 左（9時）
      positions['BB'] = { label: 'BB', x: 25, y: 15, isHero: false };       // 左上（10-11時）
      positions['UTG'] = { label: 'UTG', x: 50, y: 15, isHero: false };     // 上（12時）
      positions['UTG1'] = { label: 'UTG+1', x: 75, y: 15, isHero: false };   // 右上（1-2時）
      positions['LJ'] = { label: 'LJ', x: 85, y: 35, isHero: false };       // 右（3時）
      positions['HJ'] = { label: 'HJ', x: 75, y: 55, isHero: false };       // 右下（4-5時）
    } else {
      // デフォルト配置（BTNがヒーロー）
      positions['BTN'] = { label: 'BTN', x: 50, y: 68, isHero: heroPos === 'BTN' };
      positions['SB'] = { label: 'SB', x: 25, y: 55, isHero: heroPos === 'SB' };
      positions['BB'] = { label: 'BB', x: 15, y: 35, isHero: heroPos === 'BB' };
      positions['UTG'] = { label: 'UTG', x: 25, y: 15, isHero: heroPos === 'UTG' };
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 15, isHero: heroPos === 'UTG1' };
      positions['LJ'] = { label: 'LJ', x: 75, y: 15, isHero: heroPos === 'LJ' };
      positions['HJ'] = { label: 'HJ', x: 85, y: 35, isHero: heroPos === 'HJ' };
      positions['CO'] = { label: 'CO', x: 75, y: 55, isHero: heroPos === 'CO' };
    }

    return positions;
  };
  
  // モバイルレイアウト用のポジション計算関数
  const calculateMobilePositions = (): Record<string, PositionInfo> => {
    // ポジション座標を明示的に定義
    const positions: Record<string, PositionInfo> = {};

    // ヒーローのポジションを特定
    const heroPos = currentSpot.heroPosition || '';
    
    // 実際のポーカーテーブルでの席順（時計回り）: BTN→SB→BB→UTG→UTG+1→LJ→HJ→CO→BTN
    // プリフロップのアクション順: UTG→UTG+1→LJ→HJ→CO→BTN→SB→BB→UTG
    
    if (heroPos === 'BTN') {
      // BTNがヒーローの場合（6時位置）
      positions['BTN'] = { label: 'BTN', x: 50, y: 62, isHero: true };      // ヒーロー位置（6時）
      positions['SB'] = { label: 'SB', x: 25, y: 40, isHero: false };       // 左下（7-8時）
      positions['BB'] = { label: 'BB', x: 8, y: 25, isHero: false };       // 左（9時）
      positions['UTG'] = { label: 'UTG', x: 25, y: 10, isHero: false };     // 左上（10-11時）
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 5, isHero: false };   // 上（12時）
      positions['LJ'] = { label: 'LJ', x: 75, y: 10, isHero: false };       // 右上（1-2時）
      positions['HJ'] = { label: 'HJ', x: 92, y: 25, isHero: false };       // 右（3時）
      positions['CO'] = { label: 'CO', x: 75, y: 40, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'SB') {
      // SBがヒーローの場合（6時位置）
      positions['SB'] = { label: 'SB', x: 50, y: 62, isHero: true };        // ヒーロー位置（6時）
      positions['BB'] = { label: 'BB', x: 25, y: 40, isHero: false };       // 左下（7-8時）
      positions['UTG'] = { label: 'UTG', x: 8, y: 25, isHero: false };     // 左（9時）
      positions['UTG1'] = { label: 'UTG+1', x: 25, y: 10, isHero: false };   // 左上（10-11時）
      positions['LJ'] = { label: 'LJ', x: 50, y: 5, isHero: false };       // 上（12時）
      positions['HJ'] = { label: 'HJ', x: 75, y: 10, isHero: false };       // 右上（1-2時）
      positions['CO'] = { label: 'CO', x: 92, y: 25, isHero: false };       // 右（3時）
      positions['BTN'] = { label: 'BTN', x: 75, y: 40, isHero: false };     // 右下（4-5時）
    } else if (heroPos === 'BB') {
      // BBがヒーローの場合（6時位置）
      positions['BB'] = { label: 'BB', x: 50, y: 62, isHero: true };        // ヒーロー位置（6時）
      positions['UTG'] = { label: 'UTG', x: 25, y: 40, isHero: false };     // 左下（7-8時）
      positions['UTG1'] = { label: 'UTG+1', x: 8, y: 25, isHero: false };   // 左（9時）
      positions['LJ'] = { label: 'LJ', x: 25, y: 5, isHero: false };       // 左上（10-11時）
      positions['HJ'] = { label: 'HJ', x: 50, y: 5, isHero: false };       // 上（12時）
      positions['CO'] = { label: 'CO', x: 75, y: 5, isHero: false };       // 右上（1-2時）
      positions['BTN'] = { label: 'BTN', x: 92, y: 25, isHero: false };     // 右（3時）
      positions['SB'] = { label: 'SB', x: 75, y: 40, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'UTG') {
      // UTGがヒーローの場合（6時位置）
      positions['UTG'] = { label: 'UTG', x: 50, y: 62, isHero: true };      // ヒーロー位置（6時）
      positions['UTG1'] = { label: 'UTG+1', x: 25, y: 40, isHero: false };   // 左下（7-8時）
      positions['LJ'] = { label: 'LJ', x: 8, y: 25, isHero: false };       // 左（9時）
      positions['HJ'] = { label: 'HJ', x: 25, y: 5, isHero: false };       // 左上（10-11時）
      positions['CO'] = { label: 'CO', x: 50, y: 5, isHero: false };       // 上（12時）
      positions['BTN'] = { label: 'BTN', x: 75, y: 5, isHero: false };     // 右上（1-2時）
      positions['SB'] = { label: 'SB', x: 92, y: 25, isHero: false };       // 右（3時）
      positions['BB'] = { label: 'BB', x: 75, y: 40, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'UTG1') {
      // UTG1がヒーローの場合（6時位置）
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 62, isHero: true };    // ヒーロー位置（6時）
      positions['LJ'] = { label: 'LJ', x: 25, y: 40, isHero: false };       // 左下（7-8時）
      positions['HJ'] = { label: 'HJ', x: 8, y: 25, isHero: false };       // 左（9時）
      positions['CO'] = { label: 'CO', x: 25, y: 5, isHero: false };       // 左上（10-11時）
      positions['BTN'] = { label: 'BTN', x: 50, y: 5, isHero: false };     // 上（12時）
      positions['SB'] = { label: 'SB', x: 75, y: 5, isHero: false };       // 右上（1-2時）
      positions['BB'] = { label: 'BB', x: 92, y: 25, isHero: false };       // 右（3時）
      positions['UTG'] = { label: 'UTG', x: 75, y: 40, isHero: false };     // 右下（4-5時）
    } else if (heroPos === 'LJ') {
      // LJがヒーローの場合（6時位置）
      positions['LJ'] = { label: 'LJ', x: 50, y: 62, isHero: true };        // ヒーロー位置（6時）
      positions['HJ'] = { label: 'HJ', x: 25, y: 40, isHero: false };       // 左下（7-8時）
      positions['CO'] = { label: 'CO', x: 8, y: 25, isHero: false };       // 左（9時）
      positions['BTN'] = { label: 'BTN', x: 25, y: 5, isHero: false };     // 左上（10-11時）
      positions['SB'] = { label: 'SB', x: 50, y: 5, isHero: false };       // 上（12時）
      positions['BB'] = { label: 'BB', x: 75, y: 5, isHero: false };       // 右上（1-2時）
      positions['UTG'] = { label: 'UTG', x: 92, y: 25, isHero: false };     // 右（3時）
      positions['UTG1'] = { label: 'UTG+1', x: 75, y: 40, isHero: false };   // 右下（4-5時）
    } else if (heroPos === 'HJ') {
      // HJがヒーローの場合（6時位置）
      positions['HJ'] = { label: 'HJ', x: 50, y: 62, isHero: true };        // ヒーロー位置（6時）
      positions['CO'] = { label: 'CO', x: 25, y: 40, isHero: false };       // 左下（7-8時）
      positions['BTN'] = { label: 'BTN', x: 8, y: 25, isHero: false };     // 左（9時）
      positions['SB'] = { label: 'SB', x: 25, y: 5, isHero: false };       // 左上（10-11時）
      positions['BB'] = { label: 'BB', x: 50, y: 5, isHero: false };       // 上（12時）
      positions['UTG'] = { label: 'UTG', x: 75, y: 5, isHero: false };     // 右上（1-2時）
      positions['UTG1'] = { label: 'UTG+1', x: 92, y: 25, isHero: false };   // 右（3時）
      positions['LJ'] = { label: 'LJ', x: 75, y: 40, isHero: false };       // 右下（4-5時）
    } else if (heroPos === 'CO') {
      // COがヒーローの場合（6時位置）
      positions['CO'] = { label: 'CO', x: 50, y: 62, isHero: true };        // ヒーロー位置（6時）
      positions['BTN'] = { label: 'BTN', x: 25, y: 40, isHero: false };     // 左下（7-8時）
      positions['SB'] = { label: 'SB', x: 8, y: 25, isHero: false };       // 左（9時）
      positions['BB'] = { label: 'BB', x: 25, y: 5, isHero: false };       // 左上（10-11時）
      positions['UTG'] = { label: 'UTG', x: 50, y: 5, isHero: false };     // 上（12時）
      positions['UTG1'] = { label: 'UTG+1', x: 75, y: 5, isHero: false };   // 右上（1-2時）
      positions['LJ'] = { label: 'LJ', x: 92, y: 25, isHero: false };       // 右（3時）
      positions['HJ'] = { label: 'HJ', x: 75, y: 40, isHero: false };       // 右下（4-5時）
    } else {
      // デフォルト配置（BTNがヒーロー）
      positions['BTN'] = { label: 'BTN', x: 50, y: 62, isHero: heroPos === 'BTN' };
      positions['SB'] = { label: 'SB', x: 25, y: 40, isHero: heroPos === 'SB' };
      positions['BB'] = { label: 'BB', x: 8, y: 25, isHero: heroPos === 'BB' };
      positions['UTG'] = { label: 'UTG', x: 25, y: 5, isHero: heroPos === 'UTG' };
      positions['UTG1'] = { label: 'UTG+1', x: 50, y: 5, isHero: heroPos === 'UTG1' };
      positions['LJ'] = { label: 'LJ', x: 75, y: 5, isHero: heroPos === 'LJ' };
      positions['HJ'] = { label: 'HJ', x: 92, y: 25, isHero: heroPos === 'HJ' };
      positions['CO'] = { label: 'CO', x: 75, y: 40, isHero: heroPos === 'CO' };
    }

    return positions;
  };

  // ポーカーハンドの表示形式を整える
  const formatHand = (hand: string | string[] | undefined) => {
    if (!hand) return ['?', '?'];
    
    // 文字列の場合はカード表記に分解
    if (typeof hand === 'string') {
      // スートとランクの分離 (例: "AsKh" -> ["As", "Kh"])
      if (hand.length === 4) {
        return [hand.slice(0, 2), hand.slice(2, 4)];
      }
      return [hand, '?'];
    }
    
    // 配列の場合はそのまま返す
    return hand;
  };

  // MTTステージに基づいた背景色を取得
  const getTournamentStageBackground = () => {
    if (!currentSpot.tournamentStage) return '';
    
    switch(currentSpot.tournamentStage) {
      case 'bubble':
        return 'border-blue-500/50 bg-blue-900/20';
      case 'final_table':
        return 'border-purple-500/50 bg-purple-900/20';
      default:
        return '';
    }
  };

  // ICMプレッシャーに基づいたスタイルを取得
  const getICMPressureStyle = () => {
    if (!currentSpot.icmPressure) return '';
    
    switch(currentSpot.icmPressure) {
      case 'high':
        return 'border-yellow-500';
      case 'extreme':
        return 'border-red-500';
      default:
        return '';
    }
  };

  // アクションの日本語表記を取得
  const getActionLabel = (action: string) => {
    const baseAction = action.split(' ')[0];
    const size = action.split(' ')[1];
    
    return baseAction + (size ? ` ${size}` : '');
  };

  // ポジション情報を計算（常にPCレイアウトを使用）
  const tablePositions = calculatePCPositions();

  // ハンドの表示形式を整える
  const heroHandFormatted = formatHand(currentSpot.heroHand);

  // 現在のストリートを取得（プリフロップに固定）
  const currentStreet = 'preflop';

  // ポットサイズの取得
  const potSizeFormatted = getPotSize();
  
  // 選択したアクションと正解アクションの基本部分
  const selectedActionBase = selectedAction ? selectedAction.split(' ')[0] : '';
  const correctActionBase = currentSpot.correctAction ? currentSpot.correctAction.split(' ')[0] : '';

  // シナリオ情報を取得
  const scenarioInfo = currentSpot.description || '';
  const matches = scenarioInfo.match(/CO\s+vs\s+UTG1/i);
  const scenario = matches ? matches[0] : '';

  // ヒーローのレイズ額を取得する関数
  const getHeroRaiseAmount = (): number | null => {
    if (!selectedAction || !selectedAction.startsWith('RAISE')) return null;
    
    // レイズ額を抽出
    const raiseMatch = selectedAction.match(/RAISE (\d+(\.\d+)?)/);
    if (raiseMatch && raiseMatch[1]) {
      return parseFloat(raiseMatch[1]);
    }
    
    return null;
  };

  // 推奨レイズ額を取得する関数
  const getRecommendedRaiseAmount = (): number | null => {
    // correctBetSizeがある場合はそれを使用
    if (currentSpot.correctBetSize) {
      return currentSpot.correctBetSize;
    }
    
    // optimalActionがある場合はそこからレイズ額を抽出
    if (currentSpot.optimalAction && currentSpot.optimalAction.startsWith('RAISE')) {
      const raiseMatch = currentSpot.optimalAction.match(/RAISE (\d+(\.\d+)?)/);
      if (raiseMatch && raiseMatch[1]) {
        return parseFloat(raiseMatch[1]);
      }
    }
    
    // correctActionがある場合はそこからレイズ額を抽出
    if (currentSpot.correctAction && currentSpot.correctAction.startsWith('RAISE')) {
      const raiseMatch = currentSpot.correctAction.match(/RAISE (\d+(\.\d+)?)/);
      if (raiseMatch && raiseMatch[1]) {
        return parseFloat(raiseMatch[1]);
      }
    }
    
    return null;
  };

  // 有効なアクションを取得する関数（エフェクティブスタックに基づいてオールインを追加）
  const getAvailableActions = () => {
    // stackSizeを数値に変換
    const stackNum = parseInt(stackSize);
    
    // 基本のアクション
    let actions = [...availableActions];
    
    // エフェクティブスタックが15BB以下の場合、または特定のシナリオでオールインオプションを追加
    const showAllIn = 
      // 浅いスタック（15BB以下）の場合
      stackNum <= 15 || 
      // PioSolverのレンジにAll inが含まれる場合
      (currentSpot.frequencies && currentSpot.frequencies['ALL IN'] > 0) ||
      // トーナメントの状況によって（例：バブル際でICM圧力が高い）
      (currentSpot.tournamentStage === 'bubble' && currentSpot.icmPressure === 'high') ||
      // 特定のアクションタイプ（push/fold領域）
      currentSpot.actionType === 'push_fold';
    
    // オールインが含まれておらず、表示条件を満たす場合に追加
    if (showAllIn && !actions.includes('ALL IN')) {
      actions.push('ALL IN');
    }
    
    return actions;
  };

  // モバイル版のテーブルをレンダリングする関数
  const renderMobileTable = () => {
    const heroPosition = Object.entries(tablePositions).find(([pos, info]) => info.isHero);
    const heroHandFormatted = formatHand(currentSpot.heroHand);
    
    // 1.2.2.2.1の均一配置（時計回り順序で）
    const mobilePositions: Record<string, {x: number, y: number}> = {};
    
    // ヒーローポジションを特定
    const heroPos = Object.entries(tablePositions).find(([pos, info]) => info.isHero);
    
    if (heroPos) {
             // ヒーローを一番下に配置（1）- 少し上に移動
       mobilePositions[heroPos[0]] = { x: 50, y: 78 };
       
       // ヒーロー以外のポジションをヒーローから時計回り順序で取得
       const pokerOrder = ['SB', 'BB', 'UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN'];
       const heroPosition = heroPos[0];
       const heroIndex = pokerOrder.indexOf(heroPosition);
       
       // ヒーローから時計回りに順序を作成
       const clockwiseOrder = [];
       for (let i = 1; i < pokerOrder.length; i++) {
         const nextIndex = (heroIndex + i) % pokerOrder.length;
         const position = pokerOrder[nextIndex];
         if (tablePositions[position] && !tablePositions[position].isHero) {
           clockwiseOrder.push(position);
         }
       }
       
               // 座標配置の定義
        const coordinatePositions = [
          { x: 50, y: -30 }, // 1段目（中央）- 少し下に移動
          { x: 5, y: -20 },  // 2段目左 - さらに上に移動
          { x: 95, y: -20 }, // 2段目右 - さらに上に移動
          { x: -2, y: 24 },  // 3段目左 - さらに左右に開く
          { x: 102, y: 24 }, // 3段目右 - さらに左右に開く
          { x: 5, y: 67 },   // 4段目左 - さらに下に移動
          { x: 95, y: 67 }   // 4段目右 - さらに下に移動
        ];
       
               // 時計回り順序から座標配置順序を決定
        // 座標インデックス: 0=1段目中央, 1=2段目左, 2=2段目右, 3=3段目左, 4=3段目右, 5=4段目左, 6=4段目右
        
        // 時計回り順序の最初（ヒーローの次）のポジションを4段目左（5）に配置
        // 2番目を3段目左（3）、3番目を2段目左（1）、4番目を1段目中央（0）
        // 5番目を2段目右（2）、6番目を3段目右（4）、7番目を4段目右（6）
        const targetCoordinates = [5, 3, 1, 0, 2, 4, 6]; // 4段目左→3段目左→2段目左→1段目中央→2段目右→3段目右→4段目右
        
        for (let i = 0; i < clockwiseOrder.length && i < targetCoordinates.length; i++) {
          const position = clockwiseOrder[i];
          const coordIndex = targetCoordinates[i];
          if (coordIndex < coordinatePositions.length) {
            mobilePositions[position] = coordinatePositions[coordIndex];
          }
        }
    }
    
    return (
      <>
        {/* 戻るボタン（モバイル版テーブル右上） */}
        {backButtonUrl && (
          <div className="absolute top-0 right-2 z-50">
            <a 
              href={backButtonUrl}
              className="px-3 py-1 bg-gray-700/90 hover:bg-gray-600/90 rounded text-white text-sm backdrop-blur-sm"
            >
              ← 戻る
            </a>
          </div>
        )}

        {/* ポットサイズ表示（ポジション間の中央） */}
        <div className="absolute w-full flex flex-col items-center text-white z-40" style={{ top: '36%' }}>
          <div className="text-base font-bold">
            {getPotSize()} BB
          </div>
        </div>

        {/* テーブル */}
        <div className="absolute inset-0 flex items-center justify-center mt-8">
                      <div className="relative w-72 h-72">
              
                            {/* モバイル版接続線（時計回り八角形） */}
              <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }}>
                {/* 時計回り八角形の線 */}
                {(() => {
                  const connectionPairs = [
                    ['UTG', 'UTG+1'],
                    ['UTG+1', 'LJ'],
                    ['LJ', 'HJ'],
                    ['HJ', 'CO'],
                    ['CO', 'BTN'],
                    ['BTN', 'SB'],
                    ['SB', 'BB'],
                    ['BB', 'UTG']
                  ];
                  
                  return connectionPairs.map(([pos1, pos2], index) => {
                    const p1 = mobilePositions[pos1];
                    const p2 = mobilePositions[pos2];
                    
                    if (!p1 || !p2) return null;
                    
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    
                    return (
                      <div
                        key={`line-${pos1}-${pos2}-${index}`}
                        className="absolute bg-gray-400"
                        style={{
                          left: `${p1.x}%`,
                          top: `${p1.y}%`,
                          width: `${length}%`,
                          height: '1.5px',
                          transformOrigin: '0 50%',
                          transform: `rotate(${angle}deg)`,
                        }}
                    />
                  );
                  });
                })()}

                {/* 1段目から2段目への最終線 */}
                {(() => {
                  // 全ポジションをチェック
                  const topPos = Object.keys(mobilePositions).find(key => 
                    key.includes('UTG') && key !== 'UTG'
                  ) || 'UTG+1';
                  
                  const lines = [];
                  
                  // 1段目 → UTG（2段目左）
                  if (mobilePositions[topPos] && mobilePositions['UTG']) {
                    const p1 = mobilePositions[topPos];
                    const p2 = mobilePositions['UTG'];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    
                    lines.push(
                      <div
                        key="line1"
                        className="absolute bg-gray-400"
                        style={{
                          left: `${p1.x}%`,
                          top: `${p1.y}%`,
                          width: `${length}%`,
                          height: '1.5px',
                          transformOrigin: '0 50%',
                          transform: `rotate(${angle}deg)`,
                        }}
                      />
                    );
                  }
                  
                  // 1段目 → LJ（2段目右）
                  if (mobilePositions[topPos] && mobilePositions['LJ']) {
                    const p1 = mobilePositions[topPos];
                    const p2 = mobilePositions['LJ'];
                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const length = Math.sqrt(dx * dx + dy * dy);
                    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                    
                    lines.push(
                      <div
                        key="line2"
                        className="absolute bg-gray-400"
                        style={{
                          left: `${p1.x}%`,
                          top: `${p1.y}%`,
                          width: `${length}%`,
                          height: '1.5px',
                          transformOrigin: '0 50%',
                          transform: `rotate(${angle}deg)`,
                        }}
                    />
                  );
                }
            
                  return lines;
          })()}
        

          </div>

               
             {/* 全プレイヤーの配置 */}
            {Object.entries(tablePositions).map(([position, info]) => {
              const pos = mobilePositions[position];
              if (!pos) return null;
              
              const isOpenRaiser = currentSpot.openRaiserPosition === position;
              const isHero = info.isHero;
              
              return (
                <div
                  key={position}
                  className="absolute z-20"
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                                                      <div className={`w-14 h-14 flex flex-col items-center justify-center rounded-full border-2
                    ${isHero
                      ? 'bg-green-700 border-green-400'
                      : isActionComplete(position) && position !== currentSpot.openRaiserPosition
                        ? 'bg-gray-950 border-gray-900'
                        : isOpenRaiser
                          ? 'bg-orange-700 border-orange-400'
                          : 'bg-gray-700 border-gray-500'
                    }`}>
                    <div className={`font-bold text-xs ${
                      isHero 
                        ? 'text-white' 
                        : isOpenRaiser
                          ? 'text-white'
                          : isActionComplete(position)
                            ? 'text-gray-500' 
                            : 'text-gray-300'
                    }`}>
                      {info.label}
            </div>
                    <div className={`font-bold text-[10px] ${
                      isHero 
                        ? 'text-white' 
                        : isOpenRaiser
                          ? 'text-white'
                          : isActionComplete(position)
                            ? 'text-gray-500' 
                            : 'text-gray-300'
                    }`}>
                      {getPositionStack(position)}
                    </div>
        </div>
        
                  {/* ヒーローのハンドカード（ポジションの下） */}
                  {isHero && (
                    <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30">
                      <div className="flex gap-1 scale-110">
                        <PokerCardList cards={heroHandFormatted} size="sm" />
            </div>
        </div>
                  )}
        
                  {/* アクションボタン（ハンドカードの下） - アクション選択前のみ表示 */}
                  {isHero && !selectedAction && (
                    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-30">
                      <div className="flex space-x-2 justify-center">
                        {getAvailableActions().map((action) => {
                          // アクションボタンのラベルとスタイルを決定
                          const { label, colorClass } = (() => {
                            if (action === 'FOLD') return { label: 'FOLD', colorClass: 'bg-blue-600 hover:bg-blue-700' };
                            if (action === 'CHECK') return { label: 'CHECK', colorClass: 'bg-gray-600 hover:bg-gray-700' };
                            if (action === 'CALL') return { label: 'CALL', colorClass: 'bg-green-600 hover:bg-green-700' };
                            if (action === 'RAISE') return { label: 'RAISE', colorClass: 'bg-red-600 hover:bg-red-700' };
                            if (action === 'ALL IN') return { label: 'ALLIN', colorClass: 'bg-purple-600 hover:bg-purple-700' };
                            return { label: action, colorClass: 'bg-gray-600 hover:bg-gray-700' };
                          })();
            
            return (
                            <button
                              key={action}
                              className={`px-5 py-3 rounded-lg text-white font-semibold whitespace-nowrap min-h-12 min-w-20 ${colorClass} transition-colors shadow-lg`}
                              onClick={() => onActionSelect && onActionSelect(action)}
                              disabled={cpuActionEnabled && !cpuActionComplete}
                            >
                              {label}
                            </button>
                          );
                        })}
          </div>
                    </div>
                  )}
                  
                  {/* 繰り返す・次のハンドボタン（アクション選択後に表示） */}
                  {isHero && selectedAction && (
                    <div className="absolute top-32 left-1/2 transform -translate-x-1/2 z-30">
                      <div className="flex space-x-3 justify-center">
                        {onRepeatSpot && (
                          <button
                            className="px-4 py-3 rounded-lg text-white text-sm font-semibold bg-gray-500 hover:bg-gray-600 transition-colors whitespace-nowrap min-w-20 shadow-lg"
                            onClick={onRepeatSpot}
                          >
                            再試行
                          </button>
                        )}
                        {onNextSpot && (
                          <button
                            className="px-4 py-3 rounded-lg text-white text-sm font-semibold bg-green-500 hover:bg-green-600 transition-colors whitespace-nowrap min-w-20 shadow-lg"
                            onClick={onNextSpot}
                          >
                            次へ
                          </button>
                        )}
                      </div>
                    </div>
                  )}
        </div>
            );
            })}
          
            {/* モバイル版チップ表示（テーブルコンテナ内に配置） */}
        {(() => {
              const renderElements: JSX.Element[] = [];
              
              // SBとBBのポジション座標を取得（mobilePositionsから）
              const sbPos = mobilePositions['SB'];
              const bbPos = mobilePositions['BB'];
              const openRaiserPos = currentSpot.openRaiserPosition;
              const openRaiserPosition = openRaiserPos ? mobilePositions[openRaiserPos] : null;
              
              // テーブル中央座標（ポット位置）
            const centerX = 50;
            const centerY = 35;
            
              // 実際のポジション座標からポット方向へのチップ配置を計算
              const getOptimalChipPosition = (pos: {x: number, y: number}, positionName: string) => {
                // ポジションからポット方向のベクトルを計算
                const vecX = centerX - pos.x;
                const vecY = centerY - pos.y;
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            const normX = vecX / length;
            const normY = vecY / length;
            
                // ポジション別の最適な移動距離と微調整
                let moveDistance = 22; // 基本移動距離（適度な距離）
                let offsetX = 0; // 水平微調整
                let offsetY = 0; // 垂直微調整
                
                                 if (positionName === 'SB') {
                   // SBの場合：ポジション別の精密調整
                   if (pos.x > 80) { // 右側にSBがある場合（BTNの右等）
                     moveDistance = 16;
                     offsetX = -2;
                     offsetY = 3;
                   } else if (pos.x < 20) { // 左側にSBがある場合（UTG側）
                     moveDistance = 18;
                     offsetX = 4;
                     offsetY = 2;
                   } else if (pos.y > 60) { // 下側にSBがある場合（ヒーロー下部）
                     moveDistance = 14;
                     offsetX = 1;
                     offsetY = -1;
                   } else if (pos.x > 50 && pos.y < 40) { // 右上（CO-BTN間等）
                     moveDistance = 18;
                     offsetX = -1;
                     offsetY = 4;
                   } else { // 上側・中央にSBがある場合
                     moveDistance = 20;
                     offsetX = 0;
                     offsetY = 3;
                   }
                 } else if (positionName === 'BB') {
                   // BBの場合：ポジション別の精密調整
                   if (pos.x > 80) { // 右側にBBがある場合
                     moveDistance = 18;
                     offsetX = -3;
                     offsetY = 4;
                   } else if (pos.x < 20) { // 左側にBBがある場合（UTG-UTG1側）
                     moveDistance = 16;
                     offsetX = 3;
                     offsetY = 3;
                   } else if (pos.y > 60) { // 下側にBBがある場合（ヒーロー下部）
                     moveDistance = 12;
                     offsetX = 0;
                     offsetY = 0;
                   } else if (pos.x < 50 && pos.y < 40) { // 左上（UTG-LJ間等）
                     moveDistance = 17;
                     offsetX = 2;
                     offsetY = 5;
                   } else { // 右上・中央にBBがある場合
                     moveDistance = 22;
                     offsetX = -1;
                     offsetY = 4;
                   }
                 } else {
                   // オープンレイザーその他の場合：ポジションにより近い配置
                   if (pos.x > 80) { // 右側ポジション（BTN-CO等）
                     moveDistance = 18;
                     offsetX = -1;
                     offsetY = 2;
                   } else if (pos.x < 20) { // 左側ポジション（UTG-LJ等）
                     moveDistance = 18;
                     offsetX = 1;
                     offsetY = 2;
                   } else if (pos.y > 60) { // 下側ポジション（ヒーロー）
                     moveDistance = 12;
                     offsetX = 0;
                     offsetY = -2;
                   } else if (pos.y < 20) { // 上側ポジション（HJ-CO等）
                     moveDistance = 20;
                     offsetX = 0;
                     offsetY = 3;
                   } else { // 中央付近ポジション
                     moveDistance = 19;
                     offsetX = 0;
                     offsetY = 1;
                   }
                 }
                
                // 基本位置を計算
                const chipX = pos.x + normX * moveDistance + offsetX;
                const chipY = pos.y + normY * moveDistance + offsetY;
                
                return { x: chipX, y: chipY };
              };
              
              // SBのブラインドチップ（0.5BB）を表示
              // 3ベッターがSBの場合、またはBBがヒーローでSBがオープンレイザーの場合は非表示
              const shouldHideSBChipMobile = (currentSpot.heroPosition === 'BB' && openRaiserPos === 'SB') || 
                                            (currentSpot.threeBetterPosition === 'SB');
              
              if (sbPos && !shouldHideSBChipMobile) {
                const chipPos = getOptimalChipPosition(sbPos, 'SB');
            
            renderElements.push(
              <div
                    key="sb-blind-chip-mobile"
                className="absolute z-30"
                style={{ 
                      left: `${chipPos.x}%`, 
                      top: `${chipPos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                      <div className="bg-blue-400 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-blue-300">
                  </div>
                      <span className="text-white font-medium text-xs">0.5</span>
                </div>
              </div>
            );
          }
          
              // BBのブラインドチップ（1BB）を表示
              // 3ベッターがBBの場合は非表示
              const showBBBlindMobile = bbPos && currentSpot.threeBetterPosition !== 'BB';
              
              if (showBBBlindMobile) {
                const chipPos = getOptimalChipPosition(bbPos, 'BB');
            
            renderElements.push(
              <div
                    key="bb-blind-chip-mobile"
                className="absolute z-30"
                style={{ 
                      left: `${chipPos.x}%`, 
                      top: `${chipPos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                      <div className="bg-blue-600 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-blue-500">
                  </div>
                      <span className="text-white font-medium text-xs">1</span>
                </div>
              </div>
            );
          }
          
              // オープンレイザーのチップ表示
              if (openRaiserPosition && currentSpot?.openRaiseSize) {
                const chipPos = getOptimalChipPosition(openRaiserPosition, openRaiserPos || 'OPEN');
            
            renderElements.push(
              <div
                    key="open-raiser-chips-mobile"
                className="absolute z-30"
                style={{ 
                      left: `${chipPos.x}%`,
                      top: `${chipPos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                      <div className="bg-red-600 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-red-500">
                  </div>
                      <span className="text-white font-medium text-xs">{currentSpot.openRaiseSize}</span>
                </div>
              </div>
            );
          } 
          
          // 3ベッターのチップ表示（モバイル版）
          const threeBetterPosMobile = currentSpot.threeBetterPosition;
          const threeBetterInfoMobile = threeBetterPosMobile ? Object.entries(mobilePositions).find(([pos]) => pos === threeBetterPosMobile)?.[1] : null;
          
          if (threeBetterInfoMobile && currentSpot?.threeBetSize && threeBetterPosMobile) {
            const chipPos = getOptimalChipPosition(threeBetterInfoMobile, threeBetterPosMobile);
        
            renderElements.push(
              <div
                key="three-better-chip-mobile"
                className="absolute z-30"
                style={{ 
                  left: `${chipPos.x}%`, 
                  top: `${chipPos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-orange-600 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-orange-500">
                  </div>
                  <span className="text-white font-medium text-xs">{currentSpot.threeBetSize}</span>
                </div>
              </div>
            );
          }
          
          // 4ベットの場合のヒーロー（3ベッター）のチップ表示
          if (currentSpot.actionType === 'vs4bet' && currentSpot?.threeBetSize && currentSpot.heroPosition) {
            const heroPosMobile = Object.entries(mobilePositions).find(([pos]) => pos === currentSpot.heroPosition)?.[1];
            if (heroPosMobile) {
              const chipPos = getOptimalChipPosition(heroPosMobile, currentSpot.heroPosition);
          
              renderElements.push(
                <div
                  key="hero-three-bet-chip-mobile"
                  className="absolute z-30"
                  style={{ 
                    left: `${chipPos.x}%`, 
                    top: `${chipPos.y}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <div className="bg-orange-600 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-orange-500">
                    </div>
                    <span className="text-white font-medium text-xs">{currentSpot.threeBetSize}</span>
                  </div>
                </div>
              );
            }
          }
          
          // 4ベッターのチップ表示（モバイル版）
          const fourBetterPosMobile = currentSpot.openRaiserPosition; // vs4ベットでは4ベッターがオープンレイザー
          const fourBetterInfoMobile = fourBetterPosMobile ? Object.entries(mobilePositions).find(([pos]) => pos === fourBetterPosMobile)?.[1] : null;
          
          // デバッグ用のログ
          console.log('4ベットデバッグ:', {
            actionType: currentSpot.actionType,
            openRaiserPosition: currentSpot.openRaiserPosition,
            openRaiseSize: currentSpot.openRaiseSize,
            fourBetterPosMobile,
            fourBetterInfoMobile
          });
          
          if (fourBetterInfoMobile && currentSpot?.openRaiseSize && fourBetterPosMobile && currentSpot.actionType === 'vs4bet') {
            const chipPos = getOptimalChipPosition(fourBetterInfoMobile, fourBetterPosMobile);
        
            renderElements.push(
              <div
                key="four-better-chip-mobile"
                className="absolute z-30"
                style={{ 
                  left: `${chipPos.x}%`, 
                  top: `${chipPos.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-purple-600 w-2.5 h-2.5 rounded-full flex items-center justify-center shadow-md border border-purple-500">
                  </div>
                  <span className="text-white font-medium text-xs">{currentSpot.openRaiseSize}</span>
                </div>
              </div>
            );
          }
              
              return renderElements;
            })()} 
          </div>
        </div>

        {/* アクション結果表示（モバイル版） - ヒーローポジションの上に表示 */}
        {selectedAction && showResults && showActionResult && (() => {
          const heroPosition = Object.entries(tablePositions).find(([pos, info]) => info.isHero);
          const heroPos = heroPosition ? mobilePositions[heroPosition[0]] : { x: 50, y: 68 };
          
          return (
                <div
              className="absolute z-50"
                  style={{ 
                left: `${heroPos.x + 15}%`, // 右に15%オフセット
                top: `${heroPos.y - 20}%`, // ヒーローポジションの20%上に表示
                    transform: 'translate(-50%, -50%)'
                  }}
                >
              {(() => {
                const { element } = formatActionResult();
                return (
                  <div 
                    style={{
                      transform: actionResultTransform,
                      opacity: actionResultOpacity,
                      transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
                    }}
                  >
                    {element}
                    </div>
                );
              })()}
            </div>
          );
        })()}

        {/* ハンドレンジモーダル（モバイル版でも同じ） */}
        {showHandRange && (
          <HandRangeGrid 
            rangeData={rangeData} 
            title={`${currentSpot.heroPosition || 'BTN'}ポジションからのオープンレイズレンジ (100BB)`} 
            onClose={() => setShowHandRange(false)} 
          />
        )}


      </>
    );
  };

  // モバイル版とデスクトップ版でレンダリングを分離
  if (isMobile) {
  return (
    <div className="w-full h-full">
        {/* モバイル版レイアウト */}
        <div className={`w-full h-full relative ${getTournamentStageBackground()}`}>
          {/* モバイル用のテーブル内容 */}
          {renderMobileTable()}
                  </div>
                </div>
              );
            }

  return (
    <div className="w-full h-full">
      {/* デスクトップ版ポーカーテーブル */}
      <div className={`w-full h-full relative bg-[#0a0a0a] rounded-lg overflow-hidden ${getTournamentStageBackground()} ${currentSpot.tournamentStage ? 'border' : ''}`}>
        
        {/* 左上の余計な線をカバーする黒い矩形 */}
        <div className="absolute top-0 left-0 w-[120px] h-[70px] bg-[#0a0a0a] z-30"></div>
        
        {/* PC版ポジション間の接続線 */}
        <svg 
          className="absolute inset-0 w-full h-full z-20" 
          style={{ pointerEvents: 'none' }}
        >
          {(() => {
            // 接続を完全に明示的に定義（それ以外は描画しない）
            const explicitConnections = [
              // 上部の水平接続
              { from: 'UTG', to: 'UTG1' },
              { from: 'UTG1', to: 'LJ' },
              { from: 'LJ', to: 'HJ' },
              { from: 'HJ', to: 'CO' },
              
              // 下部の水平接続
              { from: 'BTN', to: 'SB' },
              { from: 'SB', to: 'BB' },
              
              // 左右の接続
              { from: 'BB', to: 'UTG' },
              { from: 'CO', to: 'BTN' }
            ];
            
            // 接続描画用の配列
            const renderConnections: JSX.Element[] = [];
            
            // 各接続に対して
            explicitConnections.forEach((connection, index) => {
              const { from, to } = connection;
              
              // 両方のポジションが存在する場合のみ描画
              if (tablePositions[from] && tablePositions[to]) {
                const fromPos = tablePositions[from];
                const toPos = tablePositions[to];
                
                // 座標を取得
                const fromX = fromPos.x;
                const fromY = fromPos.y;
                const toX = toPos.x;
                const toY = toPos.y;
                
                // 線のスタイル
                const lineColor = "rgba(200, 200, 200, 0.7)";
                const lineWidth = "1.2";

                // 直線を描画
                renderConnections.push(
                  <line 
                    key={`pc-${from}-${to}-${index}`}
                    x1={`${fromX}%`} 
                    y1={`${fromY}%`} 
                    x2={`${toX}%`} 
                    y2={`${toY}%`} 
                    stroke={lineColor} 
                    strokeWidth={lineWidth} 
                  />
                );
              }
            });
            
            return renderConnections;
        })()}
        </svg>

        {/* ポットサイズの表示を上部ポジションの少し下に配置 */}
        <div className="absolute w-full top-[180px] flex flex-col items-center text-white z-40">
          <div className="text-base font-medium px-2.5 py-0.5 bg-black/50 rounded-lg">
            {getPotSize()} BB
          </div>

          {/* ICMプレッシャー表示 - 右上に配置 */}
          {currentSpot.icmPressure && (
            <div className={`absolute top-0 right-4 px-3 py-1 rounded-full text-sm font-medium
              ${currentSpot.icmPressure === 'low' ? 'bg-green-700/70' : 
                currentSpot.icmPressure === 'medium' ? 'bg-yellow-700/70' : 
                currentSpot.icmPressure === 'high' ? 'bg-orange-700/70' : 'bg-red-700/70'}`}>
              ICM: {currentSpot.icmPressure === 'low' ? '低' : 
                    currentSpot.icmPressure === 'medium' ? '中' : 
                    currentSpot.icmPressure === 'high' ? '高' : '極高'}
            </div>
          )}
        </div>
        
        {/* ディーラーボタン - 常にBTNポジションの近くで中央寄りに配置 */}
        {(() => {
          // ディーラーボタンは常にBTNポジションに配置する
          // テーブル上の実際のBTNポジションを取得
          const btnPosition = Object.entries(tablePositions).find(([pos]) => pos === 'BTN')?.[1];
          
          if (btnPosition) {
            // BTNポジションから左上方向へ移動した位置
            const leftPos = btnPosition.x - 5;
            const topPos = btnPosition.y - 4.5;
            
            return (
        <div className="absolute z-50" style={{ 
                left: `${leftPos}%`, 
                top: `${topPos}%` 
        }}>
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-300">
                  <span className="text-black font-bold text-[9px]">D</span>
          </div>
        </div>
            );
          }
          
          return null;
        })()}
        

        
        {/* ポジション表示 - ヒーロー位置を強調表示 */}
        {Object.entries(tablePositions).map(([position, info]) => {
          // オープンレイザーかどうかをチェック
          const isOpenRaiser = currentSpot.openRaiserPosition === position;
          // 3ベッターかどうかをチェック
          const isThreeBetter = currentSpot.threeBetterPosition === position;
          
          return (
          <div 
            key={position}
              className={`absolute ${isActionActive(position) ? 'z-50 animate-pulse' : isWaitingForAction(position) ? 'z-40' : 'z-30'}`}
            style={{
              left: `${info.x}%`,
              top: `${info.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* アクション結果表示 - ヒーローポジションの場合のみポジションの上に表示 */}
              {info.isHero && selectedAction && showResults && showActionResult && (
              (() => {
                const { element, evaluationLevel } = formatActionResult();
                // 変形とアニメーションを追加するためのラッパー（背景色なし）
                return (
                  <div 
                    className="absolute -top-10 left-1/2 z-[999]"
                    style={{
                      transform: actionResultTransform,
                      opacity: actionResultOpacity,
                      transition: 'transform 0.1s ease-out, opacity 0.1s ease-out'
                    }}
                  >
                    {element}
                  </div>
                );
              })()
            )}
            
            
            {/* ポジション表示 - ヒーロー、オープンレイザー、3ベッターを強調表示 */}
            <div className={`w-[4rem] h-[4rem] flex flex-col items-center justify-center rounded-full 
              ${info.isHero 
                ? 'bg-green-800 border-2 border-green-500 shadow-md shadow-green-500/50' 
                  : isOpenRaiser
                  ? 'bg-red-700 border-2 border-red-500 shadow-md'
                    : isThreeBetter
                    ? 'bg-orange-700 border-2 border-orange-500 shadow-md shadow-orange-500/50'
                      : isActionComplete(position)
                        ? 'bg-[#1a1a1a] border border-[#252525] shadow-md' 
                        : isActionActive(position)
                          ? 'bg-blue-800 border-2 border-blue-500 shadow-md shadow-blue-500/50 scale-110'
                          : cpuActionResults[position]?.action === 'FOLD'
                            ? 'bg-gray-800 border border-gray-700 shadow-md opacity-60'
                            : 'bg-[#1a1a1a] border border-[#252525] shadow-md'
              }`}>
                <div className={`text-[14px] font-bold ${info.isHero ? 'text-white' : isOpenRaiser ? 'text-white' : isThreeBetter ? 'text-white' : isActionComplete(position) ? 'text-gray-600' : isActionActive(position) || isWaitingForAction(position) ? 'text-white' : cpuActionResults[position]?.action === 'FOLD' ? 'text-gray-500' : 'text-white'}`}>{info.label}</div>
                <div className={`text-[14px] font-bold mt-0.5 ${info.isHero ? 'text-white' : isOpenRaiser ? 'text-white' : isThreeBetter ? 'text-white' : isActionComplete(position) ? 'text-gray-600' : isActionActive(position) || isWaitingForAction(position) ? 'text-white' : cpuActionResults[position]?.action === 'FOLD' ? 'text-gray-500' : 'text-white'}`}>
                  {getPositionStack(position)}
              </div>
            </div>
            
            {/* ヒーローの場合は手札を表示 - ヒーローポジションからさらに下側に表示 */}
            {info.isHero && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-0 space-x-0.5 z-40">
                <PokerCardList cards={heroHandFormatted} size="md" />
                </div>
              )}
              
              {/* アクション表示（ヒーロー以外の完了したアクション） */}
              {cpuActionResults[position]?.result && !isOpenRaiser && (
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-40">
                  <div className={`text-xs px-2 py-1 rounded whitespace-nowrap font-semibold shadow-lg border border-opacity-50
                    ${cpuActionResults[position]?.action === 'FOLD' ? 'bg-blue-600 text-white border-blue-400' : 
                      cpuActionResults[position]?.action === 'CALL' ? 'bg-green-600 text-white border-green-400' : 
                      cpuActionResults[position]?.action?.startsWith('RAISE') ? 'bg-red-600 text-white border-red-400' : 
                      'bg-gray-600 text-white border-gray-400'}`}>
                    {cpuActionResults[position]?.result}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* ブラインドチップおよびオープンレイザーのチップ表示 */}
        {(() => {
          // SBとBBのポジションを取得
          const sbPosition = Object.entries(tablePositions).find(([pos]) => pos === 'SB')?.[1];
          const bbPosition = Object.entries(tablePositions).find(([pos]) => pos === 'BB')?.[1];
          // ヒーローのポジション情報を取得
          const heroPosition = Object.entries(tablePositions).find(([pos, info]) => info.isHero)?.[1];
          // オープンレイザーのポジション情報を取得
          const openRaiserPos = currentSpot.openRaiserPosition;
          const openRaiserPosition = openRaiserPos ? Object.entries(tablePositions).find(([pos]) => pos === openRaiserPos)?.[1] : null;
          // 3ベッターのポジション情報を取得
          const threeBetterPos = currentSpot.threeBetterPosition;
          
          const renderElements = [];
          
          // SBのチップを表示
          // 以下の場合は0.5BBブラインドチップを表示しない：
          // 1. BBがヒーローでSBがオープンレイザーの場合
          // 2. SBが3ベッターの場合
          console.log('🎯 チップ表示条件チェック:', {
            heroPosition: currentSpot.heroPosition,
            openRaiserPos,
            threeBetterPos,
            sbExists: !!sbPosition,
            sbIsHero: sbPosition?.isHero,
            stackSize: stackSize,
            openRaiseSize: currentSpot?.openRaiseSize,
            isBBHero: currentSpot.heroPosition === 'BB',
            isSBOpener: openRaiserPos === 'SB',
            isSBThreeBetter: threeBetterPos === 'SB'
          });
          
          // 0.5BBチップを非表示にする条件
          const shouldHideSBChip = (currentSpot.heroPosition === 'BB' && openRaiserPos === 'SB') || 
                                   (threeBetterPos === 'SB');
          console.log('🔍 Should hide 0.5BB chip?', shouldHideSBChip, {
            isBBHero: currentSpot.heroPosition === 'BB',
            isSBOpener: openRaiserPos === 'SB',
            isSBThreeBetter: threeBetterPos === 'SB',
            openRaiseSize: currentSpot?.openRaiseSize
          });
          
          if (shouldHideSBChip) {
            console.log('🚫 SB chip hidden - reason:', threeBetterPos === 'SB' ? 'SB is 3-better' : 'BB hero + SB opener');
          }
          
          // BBがヒーローかつSBがオープンレイザーの場合は0.5BBチップを絶対に表示しない
          const shouldHide = currentSpot.heroPosition === 'BB' && openRaiserPos === 'SB';
          console.log('🔍 Should hide 0.5BB chip?', shouldHide, {
            isBBHero: currentSpot.heroPosition === 'BB',
            isSBOpener: openRaiserPos === 'SB', 
            openRaiseSize: currentSpot?.openRaiseSize
          });
          
          if (shouldHide) {
            console.log('🚫 BB hero + SB opener: 0.5BB chip hidden');
            // 0.5BBチップは表示しない
          } else if (sbPosition && !sbPosition.isHero && !(currentSpot.heroPosition === 'BB' && openRaiserPos === 'SB') && currentSpot.threeBetterPosition !== 'SB') {
            // テーブル中央に向かって少し移動した位置
            const centerX = 50;
            const centerY = 35;
            
            // SBポジションからテーブル中央方向へのベクトル
            const vecX = centerX - sbPosition.x;
            const vecY = centerY - sbPosition.y;
            
            // ベクトルの長さを計算
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            
            // ベクトルを正規化して一定距離移動
            const moveDistance = 10; // SBチップを中央寄りに少し移動
            const normX = vecX / length;
            const normY = vecY / length;
            
            // 新しい位置を計算
            const chipX = sbPosition.x + normX * moveDistance;
            const chipY = sbPosition.y + normY * moveDistance;
            
            renderElements.push(
              <div
                key="sb-blind-chip"
                className="absolute z-10"
                style={{ 
                  left: `${chipX}%`, 
                  top: `${chipY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-blue-400 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md border-2 border-blue-300">
                  </div>
                  <span className="text-white font-medium text-[13px]">0.5</span>
                </div>
              </div>
            );
          }
          
          // BBのチップを表示（BBは常に1BBのブラインドを払っているため表示）
          // ただし、BBが3ベッターの場合は1BBブラインドチップを非表示
          const showBBBlind = bbPosition && currentSpot.threeBetterPosition !== 'BB';
          if (showBBBlind) {
            // テーブル中央に向かって少し移動した位置
            const centerX = 50;
            const centerY = 35;
            
            // BBポジションからテーブル中央方向へのベクトル
            const vecX = centerX - bbPosition.x;
            const vecY = centerY - bbPosition.y;
            
            // ベクトルの長さを計算
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            
            // ベクトルを正規化して一定距離移動
            const moveDistance = 10; // BBチップを中央寄りに少し移動
            const normX = vecX / length;
            const normY = vecY / length;
            
            // 新しい位置を計算
            const chipX = bbPosition.x + normX * moveDistance;
            const chipY = bbPosition.y + normY * moveDistance;
            
            renderElements.push(
              <div
                key="bb-blind-chip-mobile"
                className="absolute z-10"
                style={{ 
                  left: `${chipX}%`, 
                  top: `${chipY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-blue-600 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md border-2 border-blue-500">
                  </div>
                  <span className="text-white font-medium text-[13px]">1</span>
                </div>
              </div>
            );
          }
          
          // SBがオープンレイザーで1BBリンプの場合のみ1BBリンプチップを表示
          const showSBLimp = (openRaiserPos === 'SB' && stackSize === '15' && currentSpot?.openRaiseSize === 1.0) ||
                            (currentSpot.heroPosition === 'BB' && openRaiserPos === 'SB');
                            
          if (showSBLimp) {
            // SBからの1BBリンプチップを表示
            const centerX = 50;
            const centerY = 35;
            
            const vecX = centerX - sbPosition!.x;
            const vecY = centerY - sbPosition!.y;
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            const moveDistance = 10;
            const normX = vecX / length;
            const normY = vecY / length;
            
            const chipX = sbPosition!.x + normX * moveDistance;
            const chipY = sbPosition!.y + normY * moveDistance;
            
            renderElements.push(
              <div
                key="sb-limp-chip"
                className="absolute z-20"
                style={{ 
                  left: `${chipX}%`, 
                  top: `${chipY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-green-600 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md border-2 border-green-500">
                  </div>
                  <span className="text-white font-medium text-[13px]">1</span>
                </div>
              </div>
            );
          }
          
          // オープンレイザーのチップ表示（オープンレイザーのポジションから中央方向に）
          // SBの15BBリンプ以外の場合に表示、かつBBがヒーローでSBがオープンレイザーの場合は表示しない
          if (openRaiserPosition && currentSpot?.openRaiseSize && 
              !(openRaiserPos === 'SB' && stackSize === '15' && currentSpot?.openRaiseSize === 1.0) &&
              !(bbPosition?.isHero && openRaiserPos === 'SB')) {
            // テーブル中央の座標
            const centerX = 50;
            const centerY = 35;
            
            // オープンレイザーのポジションから中央方向へのベクトルを計算
            const vecX = centerX - openRaiserPosition.x;
            const vecY = centerY - openRaiserPosition.y;
            
            // ベクトルの長さを計算
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            
            // ベクトルを正規化して適切な距離（オープンレイザーから中央寄り）に移動
            const moveDistance = 10; // オープンレイザーから中央方向への移動距離
            const normX = vecX / length;
            const normY = vecY / length;
            
            // チップの表示位置を計算
            const chipX = openRaiserPosition.x + normX * moveDistance;
            const chipY = openRaiserPosition.y + normY * moveDistance;
            
            renderElements.push(
              <div
                key="open-raiser-chips-dynamic"
                className="absolute z-20"
                style={{ 
                  left: `${chipX}%`, 
                  top: `${chipY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-red-600 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md border-2 border-red-500">
                  </div>
                  <span className="text-white font-medium text-[13px]">{currentSpot.openRaiseSize}</span>
                </div>
              </div>
            );
          }
          
          // 3ベッターのチップ表示（3ベッターのポジションから中央方向に）
          const threeBetterPosition = currentSpot.threeBetterPosition ? Object.entries(tablePositions).find(([pos]) => pos === currentSpot.threeBetterPosition)?.[1] : null;
          
          if (threeBetterPosition && currentSpot?.threeBetSize) {
            // テーブル中央の座標
            const centerX = 50;
            const centerY = 35;
            
            // 3ベッターのポジションから中央方向へのベクトルを計算
            const vecX = centerX - threeBetterPosition.x;
            const vecY = centerY - threeBetterPosition.y;
            
            // ベクトルの長さを計算
            const length = Math.sqrt(vecX * vecX + vecY * vecY);
            
            // ベクトルを正規化して適切な距離（3ベッターから中央寄り）に移動
            const moveDistance = 10; // 3ベッターから中央方向への移動距離（適度な距離）
            const normX = vecX / length;
            const normY = vecY / length;
            
            // チップの表示位置を計算
            const chipX = threeBetterPosition.x + normX * moveDistance;
            const chipY = threeBetterPosition.y + normY * moveDistance;
            
            renderElements.push(
              <div
                key="three-better-chips-dynamic"
                className="absolute z-30"
                style={{ 
                  left: `${chipX}%`, 
                  top: `${chipY}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="flex items-center space-x-1">
                  <div className="bg-orange-600 w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-md border-2 border-orange-500">
                  </div>
                  <span className="text-white font-medium text-[13px]">{currentSpot.threeBetSize}</span>
                </div>
              </div>
            );
          }
          
          return renderElements;
        })()}
      
      {/* ハンドレンジモーダル */}
      {showHandRange && (
        <HandRangeGrid 
          rangeData={rangeData} 
          title={`${currentSpot.heroPosition || 'BTN'}ポジションからのオープンレイズレンジ (100BB)`} 
          onClose={() => setShowHandRange(false)} 
        />
      )}
      </div>
      
      {/* デスクトップ版アクションボタン - テーブル外部に配置 */}
      <div className="flex space-x-2 mt-3">
        {getAvailableActions().map((action) => {
          // アクションボタンのラベルとスタイルを決定
          const { label, colorClass } = (() => {
            if (action === 'FOLD') return { label: 'フォールド', colorClass: 'bg-blue-600 hover:bg-blue-700' };
            if (action === 'CHECK') return { label: 'チェック', colorClass: 'bg-gray-600 hover:bg-gray-700' };
            if (action === 'CALL') return { label: 'コール', colorClass: 'bg-green-600 hover:bg-green-700' };
            if (action === 'RAISE') return { label: 'レイズ', colorClass: 'bg-red-600 hover:bg-red-700' };
            if (action === 'ALL IN') return { label: 'オールイン', colorClass: 'bg-purple-600 hover:bg-purple-700' };
            return { label: action, colorClass: 'bg-gray-600 hover:bg-gray-700' };
          })();
          
          return (
            <button
              key={action}
              className={`px-4 py-2 rounded text-white font-medium ${colorClass} transition-colors`}
              onClick={() => onActionSelect && onActionSelect(action)}
              disabled={!!selectedAction || cpuActionEnabled && !cpuActionComplete}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
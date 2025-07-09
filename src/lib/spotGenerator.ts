'use client';

import { PreflopScenario } from '@/components/GTOStrategySelector';

// ポーカーのスポット（状況）を定義するインターフェース
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
  effectiveStack?: number;
  possibleActions?: string[];
  correctBetSize?: number;
  preflopActions?: string[];
}

// カードのランクと強さのマッピング
const rankStrength: Record<string, number> = {
  'A': 14,
  'K': 13,
  'Q': 12,
  'J': 11,
  'T': 10,
  '9': 9,
  '8': 8,
  '7': 7,
  '6': 6,
  '5': 5,
  '4': 4,
  '3': 3,
  '2': 2
};

// ポーカーハンドの生成とランク付け用の関数
export function generateRandomHand(): string[] {
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const suits = ['s', 'h', 'd', 'c'];
  
  let card1 = ranks[Math.floor(Math.random() * ranks.length)] + suits[Math.floor(Math.random() * suits.length)];
  let card2;
  
  do {
    card2 = ranks[Math.floor(Math.random() * ranks.length)] + suits[Math.floor(Math.random() * suits.length)];
  } while (card1 === card2);
  
  return [card1, card2];
}

// ハンドの強さを評価する関数（シンプルな実装）
const evaluateHandStrength = (hand: string[]): number => {
  // カードのランクを抽出
  const rank1 = hand[0].charAt(0);
  const rank2 = hand[1].charAt(0);
  const suit1 = hand[0].charAt(1);
  const suit2 = hand[1].charAt(1);
  
  // ランクの強さを取得
  const strength1 = rankStrength[rank1] || 0;
  const strength2 = rankStrength[rank2] || 0;
  
  // ペアの場合は強さを倍増
  if (rank1 === rank2) {
    return (strength1 * 10) + 200; // ペアの強さを倍増
  }
  
  // スーテッドの場合はボーナス
  const isSuited = suit1 === suit2;
  const bonus = isSuited ? 50 : 0;
  
  // コネクター（連続したランク）の場合はボーナス
  const diff = Math.abs(strength1 - strength2);
  const connectorBonus = diff === 1 ? 30 : 
                        diff === 2 ? 15 : 
                        diff === 3 ? 5 : 0;
  
  // 高いランクほど価値が高い
  const rankSum = Math.max(strength1, strength2) * 10 + Math.min(strength1, strength2);
  
  return rankSum + bonus + connectorBonus;
};

// GTO範囲の定義
type PositionKey = 'UTG' | 'UTG1' | 'UTG2' | 'MP' | 'HJ' | 'CO' | 'BTN' | 'SB';

interface GTORanges {
  rfi: {
    [key in PositionKey]: {
      pairs: string[];
      suited: string[];
      offsuit: string[];
    }
  };
}

const gtoRanges: GTORanges = {
  rfi: {
    'UTG': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'QJ', 'QT', 'JT'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'KQ']
    },
    'UTG1': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'QJ', 'QT', 'JT', 'T9'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'KQ', 'KJ']
    },
    'UTG2': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'QJ', 'QT', 'Q9', 'JT', 'J9', 'T9', '98'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'KQ', 'KJ', 'KT', 'QJ']
    },
    'MP': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'QJ', 'QT', 'Q9', 'Q8', 'JT', 'J9', 'J8', 'T9', 'T8', '98', '87'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'KQ', 'KJ', 'KT', 'K9', 'QJ', 'QT', 'JT']
    },
    'HJ': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'K6', 'K5', 'QJ', 'QT', 'Q9', 'Q8', 'Q7', 'JT', 'J9', 'J8', 'J7', 'T9', 'T8', 'T7', '98', '97', '87', '76'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'QJ', 'QT', 'Q9', 'JT', 'J9', 'T9']
    },
    'CO': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'K6', 'K5', 'K4', 'K3', 'K2', 'QJ', 'QT', 'Q9', 'Q8', 'Q7', 'Q6', 'Q5', 'Q4', 'JT', 'J9', 'J8', 'J7', 'J6', 'T9', 'T8', 'T7', 'T6', '98', '97', '96', '87', '86', '76', '75', '65', '54'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'QJ', 'QT', 'Q9', 'Q8', 'JT', 'J9', 'J8', 'T9', 'T8', '98']
    },
    'BTN': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'K6', 'K5', 'K4', 'K3', 'K2', 'QJ', 'QT', 'Q9', 'Q8', 'Q7', 'Q6', 'Q5', 'Q4', 'Q3', 'Q2', 'JT', 'J9', 'J8', 'J7', 'J6', 'J5', 'J4', 'J3', 'J2', 'T9', 'T8', 'T7', 'T6', 'T5', 'T4', 'T3', 'T2', '98', '97', '96', '95', '94', '93', '87', '86', '85', '84', '76', '75', '74', '65', '64', '54', '53', '43'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'K6', 'K5', 'K4', 'QJ', 'QT', 'Q9', 'Q8', 'Q7', 'Q6', 'JT', 'J9', 'J8', 'J7', 'T9', 'T8', 'T7', '98', '97', '87']
    },
    'SB': {
      pairs: ['AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22'],
      suited: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'K7', 'K6', 'K5', 'K4', 'K3', 'K2', 'QJ', 'QT', 'Q9', 'Q8', 'Q7', 'Q6', 'Q5', 'Q4', 'Q3', 'JT', 'J9', 'J8', 'J7', 'J6', 'J5', 'J4', 'T9', 'T8', 'T7', 'T6', 'T5', '98', '97', '96', '95', '87', '86', '85', '76', '75', '65', '54'],
      offsuit: ['AK', 'AQ', 'AJ', 'AT', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'KQ', 'KJ', 'KT', 'K9', 'K8', 'QJ', 'QT', 'Q9', 'JT', 'J9', 'T9']
    }
  }
};

// ハンドからランクとスートを抽出する関数
function getHandRankAndSuit(hand: string[]): { 
  rank1: string; 
  rank2: string; 
  suit1: string; 
  suit2: string;
  isSuited: boolean;
  isPair: boolean;
  handNotation: string;
} {
  const rank1 = hand[0][0];
  const suit1 = hand[0][1];
  const rank2 = hand[1][0];
  const suit2 = hand[1][1];
  
  const isSuited = suit1 === suit2;
  const isPair = rank1 === rank2;
  
  // AKs, AKo のような表記を作成
  let handNotation = '';
  if (isPair) {
    handNotation = rank1 + rank2;
  } else {
    // ランクの強さでソート（Aが最も強い）
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const idx1 = ranks.indexOf(rank1);
    const idx2 = ranks.indexOf(rank2);
    
    if (idx1 <= idx2) {
      handNotation = rank1 + rank2;
    } else {
      handNotation = rank2 + rank1;
    }
  }
  
  return { rank1, rank2, suit1, suit2, isSuited, isPair, handNotation };
}

// ハンドがGTO範囲に含まれているかチェックする関数
function isHandInGTORange(hand: string[], position: PositionKey): boolean {
  const { isSuited, isPair, handNotation } = getHandRankAndSuit(hand);
  
  // 指定されたポジションのGTO範囲を取得
  if (!(position in gtoRanges.rfi)) {
    return false;
  }
  
  const positionRange = gtoRanges.rfi[position];
  
  if (isPair) {
    return positionRange.pairs.includes(handNotation);
  } else if (isSuited) {
    return positionRange.suited.includes(handNotation);
  } else {
    return positionRange.offsuit.includes(handNotation);
  }
}

// プレミアムハンドの判定
function isPremiumHand(hand: string[]): boolean {
  const { handNotation, isPair, isSuited } = getHandRankAndSuit(hand);
  
  // ハイペア (TT以上) または AK, AQs, AJs
  const premiumPairs = ['AA', 'KK', 'QQ', 'JJ', 'TT'];
  const premiumSuited = ['AK', 'AQ', 'AJ'];
  const premiumOffsuit = ['AK'];
  
  if (isPair && premiumPairs.includes(handNotation)) {
    return true;
  }
  
  if (isSuited && premiumSuited.includes(handNotation)) {
    return true;
  }
  
  if (!isSuited && premiumOffsuit.includes(handNotation)) {
    return true;
  }
  
  return false;
}

// 3betに適したハンドの判定
function is3betHand(hand: string[], position: PositionKey): boolean {
  // プレミアムハンドは常に3bet
  if (isPremiumHand(hand)) {
    return true;
  }
  
  // ポジションや状況に応じた3bet範囲の追加
  const { handNotation, isPair, isSuited } = getHandRankAndSuit(hand);
  
  // 例: BTNからのオープンに対してSBから3betするハンド
  if (position === 'SB') {
    const additional3betPairs = ['99', '88', '77'];
    const additional3betSuited = ['AQ', 'AJ', 'AT', 'KQ', 'KJ'];
    const additional3betOffsuit = ['AQ', 'AJ'];
    
    if (isPair && additional3betPairs.includes(handNotation)) {
      return true;
    }
    
    if (isSuited && additional3betSuited.includes(handNotation)) {
      return true;
    }
    
    if (!isSuited && additional3betOffsuit.includes(handNotation)) {
      return true;
    }
  }
  
  return false;
}

// GTO戦略に基づくアクションの決定
export function determineGTOAction(hand: string[], position: string, scenario: any): { action: string; betSize?: number } {
  // ポジションの型を確認
  if (!['UTG', 'UTG1', 'UTG2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'].includes(position)) {
    return { action: 'fold' }; // 無効なポジションの場合はfold
  }
  
  // ポジションを適切な型にキャスト（BBの場合はSBとして扱う）
  const posKey = (position === 'BB' ? 'SB' : position) as PositionKey;

  // シナリオの型を正規化
  const scenarioType = typeof scenario === 'string' ? scenario : scenario.type;
  
  // Open Raise First In (RFI) シナリオ
  if (scenarioType === 'openRaise') {
    if (isHandInGTORange(hand, posKey)) {
      return { action: 'RAISE', betSize: 2.5 }; // 標準的なオープンレイズサイズ
    } else {
      return { action: 'FOLD' };
    }
  }
  
  // Facing an open raise
  if (scenarioType === 'facingOpenRaise') {
    if (is3betHand(hand, posKey)) {
      return { action: 'RAISE', betSize: 9 }; // 3betサイズ
    } else if (isHandInGTORange(hand, posKey)) {
      return { action: 'CALL' };
    } else {
      return { action: 'FOLD' };
    }
  }
  
  // 3betに直面した場合
  if (scenarioType === 'facing3bet') {
    if (isPremiumHand(hand)) {
      return { action: 'RAISE', betSize: 20 }; // 4bet
    } else if (isHandInGTORange(hand, posKey)) {
      return { action: 'CALL' };
    } else {
      return { action: 'FOLD' };
    }
  }
  
  // デフォルトのアクション
  return { action: 'FOLD' };
}

// ハンドの標準表記を取得（AA, AKs, QTo等）
const getHandNotation = (hand: string[]): string => {
  const rank1 = hand[0].charAt(0);
  const rank2 = hand[1].charAt(0);
  const suit1 = hand[0].charAt(1);
  const suit2 = hand[1].charAt(1);
  
  // ランクの強さを取得して比較
  const strength1 = rankStrength[rank1] || 0;
  const strength2 = rankStrength[rank2] || 0;
  
  // ペアの場合
  if (rank1 === rank2) {
    return `${rank1}${rank1}`;
  }
  
  // 強いランクが先
  const firstRank = strength1 >= strength2 ? rank1 : rank2;
  const secondRank = strength1 >= strength2 ? rank2 : rank1;
  const firstSuit = strength1 >= strength2 ? suit1 : suit2;
  const secondSuit = strength1 >= strength2 ? suit2 : suit1;
  
  // スーテッドかオフスートか
  const suitedText = firstSuit === secondSuit ? 's' : 'o';
  
  return `${firstRank}${secondRank}${suitedText}`;
};

// ポーカーのポジションを取得する関数
const getPositionDescriptions = (): Record<string, string> => {
  return {
    'BTN': 'ボタン（ディーラー）',
    'SB': 'スモールブラインド',
    'BB': 'ビッグブラインド',
    'UTG': 'アンダー・ザ・ガン (最初のポジション)',
    'UTG1': 'UTG+1',
    'UTG2': 'UTG+2',
    'MP': 'ミドルポジション',
    'HJ': 'ハイジャック',
    'CO': 'カットオフ'
  };
};

// プリフロップのシナリオを生成する関数
const generatePreflopScenario = () => {
  const scenarios = [
    { 
      type: 'openRaise', 
      description: '誰もレイズしていない状況で、最初のアクションを選択',
      initialAction: null
    },
    { 
      type: 'facingOpenRaise', 
      description: '前のプレイヤーがレイズした状況で、アクションを選択',
      initialAction: 'RAISE 3'
    },
    { 
      type: 'facingOpenRaise', 
      description: '前のプレイヤーが2.5BBレイズした状況で、アクションを選択',
      initialAction: 'RAISE 2.5'
    },
    { 
      type: '3bet', 
      description: 'オープンレイズに対して3ベットされた状況で、アクションを選択',
      initialAction: 'RAISE 3, RAISE 9'
    },
    { 
      type: '4bet', 
      description: '3ベットに対して4ベットされた状況で、アクションを選択',
      initialAction: 'RAISE 3, RAISE 9, RAISE 20'
    },
    { 
      type: 'limped', 
      description: '前のプレイヤーがリンプした状況で、アクションを選択',
      initialAction: 'CALL 1'
    }
  ];
  
  return scenarios[Math.floor(Math.random() * scenarios.length)];
};

// Random spot generator function
export function generateRandomSpot(
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
  scenario: PreflopScenario = 'ランダム'
): Spot {
  // ポジションのリスト
  const positions: string[] = ['UTG', 'UTG1', 'UTG2', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  
  // ヒーローのポジションをランダムで選択
  const heroPositionIndex = Math.floor(Math.random() * positions.length);
  const heroPosition = positions[heroPositionIndex];
  
  // ヒーローのハンドをランダムで生成
  const heroHand = generateRandomHand();
  
  // スポットのデフォルト設定
  const spot: Spot = {
    id: Math.random().toString(36).substring(2, 8),
    description: 'プリフロップのスポット',
    street: 'preflop',
    currentStreet: 'preflop',
    difficulty: difficulty,
    heroPosition: heroPosition,
    heroHand: heroHand,
    potSize: 1.5, // デフォルトのポットサイズ（SB+BB）
    pot: 1.5,
    positions: {},
    optimalAction: 'FOLD', // 後で計算
    possibleActions: ['FOLD', 'CALL', 'RAISE'],
    evs: {},
    board: [],
    preflopActions: []
  };
  
  // アクティブなプレイヤーを設定
  positions.forEach(pos => {
    spot.positions![pos] = {
      active: true,
      stack: 100, // 全員100BBでスタート
      isHero: pos === heroPosition
    };
  });
  
  // ハンドの強さに基づいてGTO戦略を計算
  const handStrength = evaluateHandStrength(heroHand);
  
  // ポジションに基づいて最適なアクションを判断
  const gtoAction = determineGTOAction(heroHand, heroPosition, 'openRaise');
  
  // 結果をスポットに設定
  spot.optimalAction = gtoAction.action;
  spot.correctAction = gtoAction.action;
  
  if (gtoAction.betSize) {
    spot.optimalAction += ` ${gtoAction.betSize}`;
    spot.correctAction += ` ${gtoAction.betSize}`;
  }
  
  return spot;
}

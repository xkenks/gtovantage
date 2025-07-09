'use client';

// 更新されたSpotのインターフェース
export interface Card {
  rank: string;
  suit: string;
}

export interface PlayerInfo {
  position: string;
  stack: number;
  hand: [Card, Card];
  hasAction: boolean;
}

export interface Spot {
  id: string;
  name?: string;
  board: Card[];
  pot: number;
  potSize?: number;
  players: PlayerInfo[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  currentStreet?: 'preflop' | 'flop' | 'turn' | 'river';
  description: string;
  effectiveStack: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'easy' | 'medium' | 'hard';
  possibleActions: string[];
  optimalAction: string;
  correctAction?: string;
  evs: { [action: string]: number };
  evData?: { [action: string]: number };
  heroPosition?: string;
  heroHand?: string | string[];
  explanation?: string;
  correctBetSize?: number;
  preflopActions?: string[];
}

// GTOに基づいた最適なアクションを取得する関数
export const getOptimalAction = (spot: Spot): string => {
  // このシンプルな実装では、spotに既に含まれている正しいアクションを返します
  return spot.correctAction || spot.optimalAction;
};

// アクションの期待値を計算する
export const calculateEV = (spot: Spot, action: string): number => {
  // アクションの基本部分を抽出（例：'RAISE 3' -> 'RAISE'）
  const baseAction = action.split(' ')[0];
  const actionSize = action.split(' ')[1] ? parseFloat(action.split(' ')[1]) : undefined;
  
  // EVデータの取得
  const evData = spot.evData || spot.evs || {};
  
  // 基本アクションのEVを取得
  const baseEV = evData[baseAction] || -10;
  
  // RAISEの場合、サイズに応じてEVを調整
  if (baseAction === 'RAISE' && actionSize && spot.correctBetSize) {
    const optimalSize = spot.correctBetSize;
    // サイズの差に応じてEVペナルティを適用
    const sizeDifference = Math.abs(actionSize - optimalSize);
    // 最適サイズから離れるほどEVが下がる
    const penalty = sizeDifference * 0.5;
    return baseEV - penalty;
  }
  
  return baseEV;
};

// アクションの最適なサイズを取得する
export const getOptimalBetSize = (spot: Spot): number | undefined => {
  const optimalAction = spot.correctAction || spot.optimalAction;
  
  // RAISEの場合は最適なサイズを返す
  if (optimalAction.startsWith('RAISE') && spot.correctBetSize) {
    return spot.correctBetSize;
  }
  
  // ポジションと状況に応じたGTOベースのサイズを返す
  if (optimalAction === 'RAISE') {
    // プリフロップでのGTOレイズサイズ指針
    const heroPosition = spot.heroPosition || '';
    
    // オープンレイズのサイズ
    if (!spot.preflopActions || spot.preflopActions.length === 0) {
      // BTNやCOからのオープンは2.5BB
      if (heroPosition === 'BTN' || heroPosition === 'CO') {
        return 2.5;
      }
      // それ以外のポジションからは3BB
      return 3;
    }
    
    // 3ベットのサイズ
    const lastRaise = spot.preflopActions?.find(a => a.startsWith('RAISE'));
    if (lastRaise) {
      const lastSize = parseFloat(lastRaise.split(' ')[1]);
      // 3ベットは一般的に前回レイズの3倍程度
      return Math.min(lastSize * 3, 12);
    }
  }
  
  return undefined;
};

// GTO理論に基づいたアクション説明を取得する
export const getActionExplanation = (spot: Spot, action: string): string => {
  // アクションの基本部分と数値部分を抽出
  const parts = action.split(' ');
  const baseAction = parts[0];
  const actionSize = parts[1] ? parseFloat(parts[1]) : undefined;
  
  // 正しいアクションを取得
  const correctAction = spot.correctAction || spot.optimalAction;
  const correctBase = correctAction.split(' ')[0];
  const correctSize = spot.correctBetSize;
  
  // 正解かどうかを判定
  const isCorrectBase = baseAction === correctBase;
  const isCorrectSize = actionSize && correctSize ? Math.abs(actionSize - correctSize) <= 0.5 : true;
  const isCorrect = isCorrectBase && isCorrectSize;
  
  if (isCorrect) {
    // スポットごとの説明がある場合はそれを使用
    if (spot.explanation) {
      return spot.explanation;
    }
    
    // ポジションと状況に応じた説明
    const heroPosition = spot.heroPosition || '';
    const handDesc = Array.isArray(spot.heroHand) ? `${spot.heroHand[0]}-${spot.heroHand[1]}` : spot.heroHand || '';
    
    if (baseAction === 'FOLD') {
      return `このスポットで${handDesc}をFOLDするのが最適です。${heroPosition}のポジションではこのハンドはリミットRFIレンジに含まれず、コーリングレンジにも含まれないため、フォールドが正しいGTOプレイです。`;
    } else if (baseAction === 'CALL') {
      return `このスポットでは${handDesc}をCALLするのが最も期待値が高いです。レイズに対して十分なエクイティを持っていますが、3ベットするほど強くないため、コールが正しいGTOプレイです。`;
    } else if (baseAction === 'CHECK') {
      return `このスポットでは${handDesc}をCHECKするのが最適です。ビッグブラインドでこのハンドはフリーフロップを見るだけの価値がありますが、レイズするほど強くないため、チェックが適切なGTOプレイです。`;
    } else if (baseAction === 'RAISE') {
      if (actionSize) {
        return `このスポットでは${handDesc}を${actionSize}BBにRAISEするのが最も期待値が高いです。この強さのハンドはGTOレンジの中でレイズが最適で、${actionSize}BBというサイズは効率的にポットを構築しつつ、ポジションの優位性を活かすことができます。`;
      } else {
        return `このスポットでは${handDesc}をRAISEするのが最も期待値が高いです。${heroPosition}のポジションからこのハンドはGTOレイズレンジの一部で、アグレッシブなプレイが最適です。`;
      }
    }
    
    return `このスポットでは ${correctAction} が最適なアクションです。GTOソルバーの計算に基づくと、このプレイが最も期待値が高いです。`;
  }
  
  // 不正解の場合の説明 - GTOの観点から詳細に解説
  switch (baseAction) {
    case 'FOLD':
      return `このスポットでFOLDするのは価値を損ねます。あなたのハンドはGTOレンジの中では${correctBase}すべきハンドです。フォールドすると期待値が大きく下がります。`;
    case 'CHECK':
      if (correctBase === 'RAISE') {
        return `CHECKは消極的すぎます。GTOソルバーによればこのハンドはレイズレンジに含まれます。チェックすることでポジションの優位性を失い、ポットを獲得する機会を逃します。`;
      } else if (correctBase === 'CALL') {
        return `CHECKは消極的すぎます。GTOに基づくとこのハンドはコールレンジに含まれ、レイズに対してプロフィタブルにコールできます。`;
      }
      return `CHECKはこのスポットでは最適ではありません。GTOソルバーによれば${correctBase}が最も期待値の高いプレイです。`;
    case 'CALL':
      if (correctBase === 'RAISE') {
        return `CALLは消極的すぎます。あなたのハンドはGTOレンジの中ではレイズすべきハンドです。コールすることで期待値を損ないます。`;
      } else if (correctBase === 'FOLD') {
        return `CALLは楽観的すぎます。GTOに基づくとこのハンドはフォールドレンジに含まれます。コールすることでEVを失います。`;
      }
      return `CALLはこのスポットでは最適ではありません。GTOソルバーによれば${correctBase}が最も期待値の高いプレイです。`;
    case 'RAISE':
      if (correctBase === 'CALL') {
        return `RAISEは強気すぎます。GTOレンジではこのハンドはコールに適しています。レイズすることで不必要にリスクを増やし、より強いハンドにドミネートされる可能性があります。`;
      } else if (correctBase === 'FOLD') {
        return `RAISEは強気すぎます。GTOに基づくとこのハンドはフォールドレンジに含まれます。レイズすることでEVが大きくマイナスになります。`;
      } else if (correctBase === 'RAISE' && actionSize && correctSize) {
        if (actionSize > correctSize) {
          return `レイズのサイズが大きすぎます。GTOに基づく最適なサイズは${correctSize}BBです。大きすぎるとより弱いハンドをフォールドさせすぎて価値を損ないます。`;
        } else {
          return `レイズのサイズが小さすぎます。GTOに基づく最適なサイズは${correctSize}BBです。小さすぎるとポットを効率的に構築できず、価値を損ないます。`;
        }
      }
      return `RAISEはこのスポットでは最適ではありません。GTOソルバーによれば${correctBase}が最も期待値の高いプレイです。`;
    default:
      return `このアクションは標準的ではありません。GTOに基づくと${correctAction}が最適なプレイです。`;
  }
};

// GTO Engine - シンプルなポーカー意思決定の評価モジュール

export interface GTOEvaluation {
  isCorrect: boolean;
  evLoss?: number;
  explanation?: string;
}

// アクションを評価する関数
export const evaluateAction = (spot: any, selectedAction: string): GTOEvaluation => {
  // 正しいアクションを取得
  const correctAction = spot.correctAction || spot.optimalAction || '';
  
  // 選択されたアクションと正解アクションの基本部分を取得
  const selectedBase = selectedAction.split(' ')[0]; // 例：'RAISE 3BB' -> 'RAISE'
  const correctBase = correctAction.split(' ')[0];
  
  // 正解かどうかを判定（ベースアクションが一致すれば正解とみなす）
  const isCorrect = selectedBase === correctBase;
  
  // EV損失を計算
  // EVsが存在すれば、正解アクションとの差分を計算
  let evLoss = 0;
  if (spot.evData && spot.evData[correctBase] !== undefined && spot.evData[selectedBase] !== undefined) {
    evLoss = spot.evData[correctBase] - spot.evData[selectedBase];
  }
  
  // 説明を生成
  let explanation = '';
  if (isCorrect) {
    explanation = `${selectedAction}は最適なアクションです。期待値は${spot.evData?.[selectedBase] || '?'}BBです。`;
  } else {
    explanation = `${selectedAction}の代わりに${correctAction}が最適です。期待値の差は${evLoss.toFixed(2)}BBです。`;
  }
  
  return {
    isCorrect,
    evLoss,
    explanation
  };
};

// ランダムなカードを生成する補助関数
export const generateRandomCard = (): string => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['h', 's', 'd', 'c'];
  
  const randomRank = ranks[Math.floor(Math.random() * ranks.length)];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];
  
  return `${randomRank}${randomSuit}`;
};

// ランダムなハンドを生成（2枚のカード）
export const generateRandomHand = (): string[] => {
  const hand: string[] = [];
  
  while (hand.length < 2) {
    const card = generateRandomCard();
    // 既に同じカードが選ばれていないか確認
    if (!hand.includes(card)) {
      hand.push(card);
    }
  }
  
  return hand;
};

// ランダムなボードを生成
export const generateRandomBoard = (count: number = 5): string[] => {
  const board: string[] = [];
  
  while (board.length < count) {
    const card = generateRandomCard();
    // 既に同じカードが選ばれていないか確認
    if (!board.includes(card)) {
      board.push(card);
    }
  }
  
  return board;
};

// スポットの難易度に基づいてポイントを計算
export const calculatePoints = (spot: Spot, selectedAction: string): number => {
  const { isCorrect, evLoss } = evaluateAction(spot, selectedAction);
  
  // 基本ポイント
  let points = 0;
  
  // 正解なら基本ポイントを加算
  if (isCorrect) {
    switch (spot.difficulty) {
      case 'easy':
      case 'beginner':
        points = 10;
        break;
      case 'medium':
      case 'intermediate':
        points = 20;
        break;
      case 'hard':
      case 'advanced':
        points = 30;
        break;
    }
  }
  
  // EV損失に基づいてポイントを減算
  points -= Math.round(evLoss * 5);
  
  // 最低0ポイント
  return Math.max(0, points);
}; 
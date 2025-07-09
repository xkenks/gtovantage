'use client';

// GTO戦略データのインターフェース
export interface ActionFrequency {
  action: string;       // 'FOLD', 'CALL', 'CHECK', 'RAISE' など
  frequency: number;    // アクションの頻度（0-100%）
  ev: number;           // 期待値（BB単位）
  sizing?: number[];    // ベットサイズまたはレイズサイズのオプション（ポットの割合）
}

export interface HandGTOStrategy {
  handType: string;        // 'AA', 'AKs', 'KQo' など
  actionFrequencies: ActionFrequency[];
}

export interface PositionStrategy {
  position: string;          // 'BTN', 'SB', 'BB', 'UTG' など
  stackSize: string;         // '100BB', '50BB', など
  scenario: string;          // 'openraise', 'vs3bet', 'vsopen' など
  strategies: HandGTOStrategy[];
}

// PioSolverから直接エクスポートしたデータを格納するインターフェース
export interface PioSolverData {
  nodeId: string;
  street: 'preflop' | 'flop' | 'turn' | 'river';
  board: string[];
  pot: number;
  betSize: number;
  strategies: Record<string, ActionFrequency[]>; // ハンドタイプごとの戦略
}

// サンプルデータ（実際にはPioSolverからエクスポートしたデータをここに格納）
export const preflopOpenRaiseData: PositionStrategy[] = [
  {
    position: 'BTN',
    stackSize: '100BB',
    scenario: 'openraise',
    strategies: [
      {
        handType: 'AA',
        actionFrequencies: [
          { action: 'RAISE', frequency: 100, ev: 3.5 },
          { action: 'FOLD', frequency: 0, ev: -1.5 },
          { action: 'CALL', frequency: 0, ev: 1.2 }
        ]
      },
      {
        handType: 'KK',
        actionFrequencies: [
          { action: 'RAISE', frequency: 100, ev: 3.2 },
          { action: 'FOLD', frequency: 0, ev: -1.5 },
          { action: 'CALL', frequency: 0, ev: 1.1 }
        ]
      },
      {
        handType: 'AKs',
        actionFrequencies: [
          { action: 'RAISE', frequency: 100, ev: 2.8 },
          { action: 'FOLD', frequency: 0, ev: -1.5 },
          { action: 'CALL', frequency: 0, ev: 0.9 }
        ]
      },
      {
        handType: '72o',
        actionFrequencies: [
          { action: 'RAISE', frequency: 0, ev: -0.5 },
          { action: 'FOLD', frequency: 100, ev: 0 },
          { action: 'CALL', frequency: 0, ev: -0.8 }
        ]
      },
      // 他のハンドも同様に追加...
    ]
  },
  // 他のポジションも同様に追加...
];

/**
 * ポジション、スタック、シナリオに基づいてGTO戦略を取得する
 */
export function getGTOStrategy(
  position: string,
  stackSize: string,
  scenario: string,
  handType: string
): ActionFrequency[] | null {
  // 適切なデータセットを検索
  const posStrategy = preflopOpenRaiseData.find(
    ps => ps.position === position && ps.stackSize === stackSize && ps.scenario === scenario
  );
  
  if (!posStrategy) return null;
  
  // ハンドタイプの戦略を検索
  const handStrategy = posStrategy.strategies.find(s => s.handType === handType);
  
  return handStrategy?.actionFrequencies || null;
}

/**
 * ハンド表記を正規化する（例：AsKh → AKs, 2c2h → 22）
 */
export function normalizeHandType(cards: string[]): string {
  if (cards.length !== 2) return '';
  
  const rank1 = cards[0][0];
  const suit1 = cards[0][1];
  const rank2 = cards[1][0];
  const suit2 = cards[1][1];
  
  // ペアの場合
  if (rank1 === rank2) {
    return rank1 + rank2;
  }
  
  // ランクの順序を決定（Aが最強）
  const rankOrder: Record<string, number> = {
    'A': 0, 'K': 1, 'Q': 2, 'J': 3, 'T': 4, 
    '9': 5, '8': 6, '7': 7, '6': 8, '5': 9, 
    '4': 10, '3': 11, '2': 12
  };
  
  // 強いランクが先に来るようにソート
  let firstRank, secondRank;
  if (rankOrder[rank1] <= rankOrder[rank2]) {
    firstRank = rank1;
    secondRank = rank2;
  } else {
    firstRank = rank2;
    secondRank = rank1;
  }
  
  // スーテッドかオフスートか判定
  const suited = suit1 === suit2 ? 's' : 'o';
  
  return firstRank + secondRank + suited;
}

/**
 * 最も高いEVを持つアクションを取得する
 */
export function getOptimalAction(actionFrequencies: ActionFrequency[]): ActionFrequency | null {
  if (!actionFrequencies || actionFrequencies.length === 0) return null;
  
  // EVが最も高いアクションを選択
  return actionFrequencies.reduce((optimal, current) => 
    current.ev > optimal.ev ? current : optimal, actionFrequencies[0]);
} 
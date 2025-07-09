'use client';

import React from 'react';

// プリフロップシナリオの型定義
export type PreflopScenario = 'オープン' | 'vs オープン' | 'vs 3bet' | 'vs 4bet' | 'vs 5bet' | 'ランダム';

// GTOStrategySelector で使用するスポットの型定義
export interface GTOStrategySelectorProps {
  spot?: {
    id: string;
    name?: string;
    description: string;
    currentStreet?: 'preflop' | 'flop' | 'turn' | 'river';
    street?: 'preflop' | 'flop' | 'turn' | 'river';
    heroPosition?: string;
    heroHand?: string | string[];
    potSize?: number;
    pot?: number;
    correctAction?: string;
    optimalAction?: string;
    preflopActions?: string[];
    possibleActions?: string[];
  };
  onActionSelect?: (action: string, betSize?: number) => void;
  preflopScenario?: PreflopScenario;
  onPreflopScenarioChange?: (scenario: PreflopScenario) => void;
  onScenarioSelect?: (scenario: PreflopScenario) => void;
  showSettings?: boolean;
  onSettingsChange?: (show: boolean) => void;
}

export const GTOStrategySelector: React.FC<GTOStrategySelectorProps> = () => {
  // 表示を無効化
  return null;
};

export default GTOStrategySelector; 
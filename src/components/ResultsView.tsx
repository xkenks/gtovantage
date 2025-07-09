'use client';

import React from 'react';

// Position型の定義を追加
interface Position {
  active: boolean;
  stack: number;
  isHero?: boolean;
  action?: string;
  cards?: string[];
}

// ポーカースポットの型定義
export interface Spot {
  id: string;
  name?: string;
  description?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'intermediate' | 'beginner' | 'advanced';
  board: string[];
  pot: number;
  potSize?: number;
  players?: any[];
  street: 'preflop' | 'flop' | 'turn' | 'river';
  heroPosition?: string;
  heroHand?: any;
  correctAction?: string;
  optimalAction?: string;
  explanation?: string;
  evData?: Record<string, number>;
  evs?: Record<string, number>;
  effectiveStack?: number;
  bettingRound?: number;
  actionTo?: string;
  positions?: Record<string, Position>;
  selectedAction?: string;
  isCorrect?: boolean;
  evLoss?: number;
  correctBetSize?: number;
}

// ResultsView で使用する型定義
export interface ResultsViewProps {
  // 従来のスタイル
  currentSpot?: Spot;
  selectedAction?: string;
  isCorrect?: boolean;
  evLoss?: number;
  showExplanation?: boolean;
  setShowExplanation?: (show: boolean) => void;
  
  // 新しいスタイル - スポットの配列とカレントインデックス
  spots?: Spot[];
  currentIndex?: number;
}

export const ResultsView: React.FC<ResultsViewProps> = () => {
  // 表示を無効化
  return null;
};

export default ResultsView; 
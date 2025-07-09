'use client';

import React from 'react';

// GTOAnalysis で使用するpropsの型定義
export interface GTOAnalysisProps {
  spot?: {
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
    correctBetSize?: number;
  };
  evData?: {
    [action: string]: number;
  };
  selectedAction: string;
  correctAction: string;
  evLoss: number;
  explanation?: string;
}

export const GTOAnalysis: React.FC<GTOAnalysisProps> = () => {
  // GTO分析を空にする
  return null;
};

export default GTOAnalysis; 
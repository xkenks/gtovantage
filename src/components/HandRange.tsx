'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

// ポーカーハンドの情報を表す型
export interface HandInfo {
  action: 'RAISE' | 'ALL_IN' | 'CALL' | 'FOLD' | '3BET' | '3BB' | 'MIXED' | 'MIN' | 'NONE';
  frequency: number;
  // 混合戦略用の頻度分布
  mixedFrequencies?: {
    ALL_IN: number;
    CALL: number;
    FOLD: number;
    MIN?: number;
  };
}

// BTNポジションからのオープンレンジ（100BB）
export const btnOpenRaiseRange: Record<string, HandInfo> = {
  // プレミアムペア
  'AA': { action: 'ALL_IN', frequency: 100 },
  'KK': { action: 'ALL_IN', frequency: 100 },
  'QQ': { action: 'ALL_IN', frequency: 100 },
  'JJ': { action: 'ALL_IN', frequency: 100 },
  'TT': { action: 'ALL_IN', frequency: 100 },
  '99': { action: 'ALL_IN', frequency: 100 },
  '88': { action: 'ALL_IN', frequency: 100 },
  '77': { action: 'ALL_IN', frequency: 100 },
  '66': { action: 'ALL_IN', frequency: 100 },
  '55': { action: 'ALL_IN', frequency: 100 },
  '44': { action: 'ALL_IN', frequency: 100 },
  '33': { action: 'ALL_IN', frequency: 100 },
  '22': { action: 'ALL_IN', frequency: 100 },
  
  // エース系
  'AKs': { action: 'ALL_IN', frequency: 100 },
  'AQs': { action: 'ALL_IN', frequency: 100 },
  'AJs': { action: 'ALL_IN', frequency: 100 },
  'ATs': { action: 'ALL_IN', frequency: 100 },
  'A9s': { action: 'ALL_IN', frequency: 100 },
  'A8s': { action: 'ALL_IN', frequency: 100 },
  'A7s': { action: 'ALL_IN', frequency: 100 },
  'A6s': { action: 'ALL_IN', frequency: 100 },
  'A5s': { action: 'ALL_IN', frequency: 100 },
  'A4s': { action: 'ALL_IN', frequency: 100 },
  'A3s': { action: 'ALL_IN', frequency: 100 },
  'A2s': { action: 'ALL_IN', frequency: 100 },
  
  'AKo': { action: 'ALL_IN', frequency: 100 },
  'AQo': { action: 'ALL_IN', frequency: 100 },
  'AJo': { action: 'ALL_IN', frequency: 100 },
  'ATo': { action: 'ALL_IN', frequency: 100 },
  'A9o': { action: 'ALL_IN', frequency: 100 },
  'A8o': { action: 'ALL_IN', frequency: 100 },
  'A7o': { action: 'ALL_IN', frequency: 100 },
  'A6o': { action: 'ALL_IN', frequency: 100 },
  'A5o': { action: 'ALL_IN', frequency: 100 },
  'A4o': { action: 'FOLD', frequency: 0 },
  'A3o': { action: 'FOLD', frequency: 0 },
  'A2o': { action: 'FOLD', frequency: 0 },
  
  // その他の強いハンド
  'KQs': { action: 'ALL_IN', frequency: 100 },
  'KJs': { action: 'ALL_IN', frequency: 100 },
  'KTs': { action: 'ALL_IN', frequency: 100 },
  'K9s': { action: 'ALL_IN', frequency: 100 },
  'K8s': { action: 'ALL_IN', frequency: 100 },
  'K7s': { action: 'ALL_IN', frequency: 100 },
  'K6s': { action: 'ALL_IN', frequency: 100 },
  'K5s': { action: 'ALL_IN', frequency: 100 },
  'K4s': { action: 'ALL_IN', frequency: 100 },
  'K3s': { action: 'ALL_IN', frequency: 100 },
  'K2s': { action: 'ALL_IN', frequency: 100 },
  
  'KQo': { action: 'ALL_IN', frequency: 100 },
  'KJo': { action: 'ALL_IN', frequency: 100 },
  'KTo': { action: 'ALL_IN', frequency: 100 },
  'K9o': { action: 'ALL_IN', frequency: 100 },
  'K8o': { action: 'ALL_IN', frequency: 100 },
  'K7o': { action: 'ALL_IN', frequency: 100 },
  'K6o': { action: 'ALL_IN', frequency: 100 },
  'K5o': { action: 'ALL_IN', frequency: 100 },
  'K4o': { action: 'ALL_IN', frequency: 100 },
  'K3o': { action: 'FOLD', frequency: 0 },
  'K2o': { action: 'FOLD', frequency: 0 },
  
  // 残り全てFOLD
  'QJs': { action: 'ALL_IN', frequency: 100 },
  'QTs': { action: 'ALL_IN', frequency: 100 },
  'Q9s': { action: 'ALL_IN', frequency: 100 },
  'Q8s': { action: 'ALL_IN', frequency: 100 },
  'Q7s': { action: 'ALL_IN', frequency: 100 },
  'Q6s': { action: 'ALL_IN', frequency: 100 },
  'Q5s': { action: 'ALL_IN', frequency: 100 },
  'Q4s': { action: 'ALL_IN', frequency: 100 },
  'Q3s': { action: 'ALL_IN', frequency: 100 },
  'Q2s': { action: 'ALL_IN', frequency: 100 },
  
  'QJo': { action: 'ALL_IN', frequency: 100 },
  'QTo': { action: 'ALL_IN', frequency: 100 },
  'Q9o': { action: 'ALL_IN', frequency: 100 },
  'Q8o': { action: 'ALL_IN', frequency: 100 },
  'Q7o': { action: 'ALL_IN', frequency: 100 },
  'Q6o': { action: 'ALL_IN', frequency: 100 },
  'Q5o': { action: 'ALL_IN', frequency: 100 },
  'Q4o': { action: 'ALL_IN', frequency: 100 },
  'Q3o': { action: 'FOLD', frequency: 0 },
  'Q2o': { action: 'FOLD', frequency: 0 },
  
  'JTs': { action: 'ALL_IN', frequency: 100 },
  'J9s': { action: 'ALL_IN', frequency: 100 },
  'J8s': { action: 'ALL_IN', frequency: 100 },
  'J7s': { action: 'ALL_IN', frequency: 100 },
  'J6s': { action: 'ALL_IN', frequency: 100 },
  'J5s': { action: 'ALL_IN', frequency: 100 },
  'J4s': { action: 'ALL_IN', frequency: 100 },
  'J3s': { action: 'ALL_IN', frequency: 100 },
  'J2s': { action: 'ALL_IN', frequency: 100 },
  
  'JTo': { action: 'ALL_IN', frequency: 100 },
  'J9o': { action: 'ALL_IN', frequency: 100 },
  'J8o': { action: 'ALL_IN', frequency: 100 },
  'J7o': { action: 'ALL_IN', frequency: 100 },
  'J6o': { action: 'ALL_IN', frequency: 100 },
  'J5o': { action: 'ALL_IN', frequency: 100 },
  'J4o': { action: 'FOLD', frequency: 0 },
  'J3o': { action: 'FOLD', frequency: 0 },
  'J2o': { action: 'FOLD', frequency: 0 },
  
  'T9s': { action: 'ALL_IN', frequency: 100 },
  'T8s': { action: 'ALL_IN', frequency: 100 },
  'T7s': { action: 'ALL_IN', frequency: 100 },
  'T6s': { action: 'ALL_IN', frequency: 100 },
  'T5s': { action: 'ALL_IN', frequency: 100 },
  'T4s': { action: 'ALL_IN', frequency: 100 },
  'T3s': { action: 'ALL_IN', frequency: 100 },
  'T2s': { action: 'ALL_IN', frequency: 100 },
  
  'T9o': { action: 'ALL_IN', frequency: 100 },
  'T8o': { action: 'RAISE', frequency: 100 },
  'T7o': { action: 'RAISE', frequency: 100 },
  'T6o': { action: 'RAISE', frequency: 100 },
  'T5o': { action: 'RAISE', frequency: 100 },
  'T4o': { action: 'FOLD', frequency: 0 },
  'T3o': { action: 'FOLD', frequency: 0 },
  'T2o': { action: 'FOLD', frequency: 0 },
  
  '98s': { action: 'RAISE', frequency: 100 },
  '97s': { action: 'RAISE', frequency: 100 },
  '96s': { action: 'RAISE', frequency: 100 },
  '95s': { action: 'RAISE', frequency: 100 },
  '94s': { action: 'RAISE', frequency: 100 },
  '93s': { action: 'RAISE', frequency: 100 },
  '92s': { action: 'RAISE', frequency: 100 },
  
  '98o': { action: 'RAISE', frequency: 100 },
  '97o': { action: 'RAISE', frequency: 100 },
  '96o': { action: 'RAISE', frequency: 100 },
  '95o': { action: 'RAISE', frequency: 100 },
  '94o': { action: 'FOLD', frequency: 0 },
  '93o': { action: 'FOLD', frequency: 0 },
  '92o': { action: 'FOLD', frequency: 0 },
  
  '87s': { action: 'RAISE', frequency: 100 },
  '86s': { action: 'RAISE', frequency: 100 },
  '85s': { action: 'RAISE', frequency: 100 },
  '84s': { action: 'RAISE', frequency: 100 },
  '83s': { action: 'RAISE', frequency: 100 },
  '82s': { action: 'RAISE', frequency: 100 },
  
  '87o': { action: 'RAISE', frequency: 100 },
  '86o': { action: 'RAISE', frequency: 100 },
  '85o': { action: 'RAISE', frequency: 100 },
  '84o': { action: 'FOLD', frequency: 0 },
  '83o': { action: 'FOLD', frequency: 0 },
  '82o': { action: 'FOLD', frequency: 0 },
  
  '76s': { action: 'RAISE', frequency: 100 },
  '75s': { action: 'RAISE', frequency: 100 },
  '74s': { action: 'RAISE', frequency: 100 },
  '73s': { action: 'RAISE', frequency: 100 },
  '72s': { action: 'RAISE', frequency: 100 },
  
  '76o': { action: 'RAISE', frequency: 100 },
  '75o': { action: 'RAISE', frequency: 100 },
  '74o': { action: 'FOLD', frequency: 0 },
  '73o': { action: 'FOLD', frequency: 0 },
  '72o': { action: 'FOLD', frequency: 0 },
  
  '65s': { action: 'RAISE', frequency: 100 },
  '64s': { action: 'RAISE', frequency: 100 },
  '63s': { action: 'RAISE', frequency: 100 },
  '62s': { action: 'RAISE', frequency: 100 },
  
  '65o': { action: 'RAISE', frequency: 100 },
  '64o': { action: 'FOLD', frequency: 0 },
  '63o': { action: 'FOLD', frequency: 0 },
  '62o': { action: 'FOLD', frequency: 0 },
  
  '54s': { action: 'RAISE', frequency: 100 },
  '53s': { action: 'RAISE', frequency: 100 },
  '52s': { action: 'RAISE', frequency: 100 },
  
  '54o': { action: 'RAISE', frequency: 100 },
  '53o': { action: 'FOLD', frequency: 0 },
  '52o': { action: 'FOLD', frequency: 0 },
  
  '43s': { action: 'RAISE', frequency: 100 },
  '42s': { action: 'RAISE', frequency: 100 },
  
  '43o': { action: 'FOLD', frequency: 0 },
  '42o': { action: 'FOLD', frequency: 0 },
  
  '32s': { action: 'RAISE', frequency: 100 },
  '32o': { action: 'FOLD', frequency: 0 }
};

// UTGポジションからのオープンレンジ（100BB）
export const utgOpenRaiseRange: Record<string, HandInfo> = {
  // プレミアムペア
  'AA': { action: 'RAISE', frequency: 100 },
  'KK': { action: 'RAISE', frequency: 100 },
  'QQ': { action: 'RAISE', frequency: 100 },
  'JJ': { action: 'RAISE', frequency: 100 },
  'TT': { action: 'RAISE', frequency: 100 },
  '99': { action: 'RAISE', frequency: 100 },
  '88': { action: 'RAISE', frequency: 100 },
  '77': { action: 'RAISE', frequency: 100 },
  '66': { action: 'RAISE', frequency: 100 },
  '55': { action: 'RAISE', frequency: 100 },
  '44': { action: 'FOLD', frequency: 0 },
  '33': { action: 'FOLD', frequency: 0 },
  '22': { action: 'FOLD', frequency: 0 },
  
  // エース系
  'AKs': { action: 'RAISE', frequency: 100 },
  'AQs': { action: 'RAISE', frequency: 100 },
  'AJs': { action: 'RAISE', frequency: 100 },
  'ATs': { action: 'RAISE', frequency: 100 },
  'A9s': { action: 'FOLD', frequency: 0 },
  'A8s': { action: 'FOLD', frequency: 0 },
  'A7s': { action: 'FOLD', frequency: 0 },
  'A6s': { action: 'FOLD', frequency: 0 },
  'A5s': { action: 'RAISE', frequency: 100 },
  'A4s': { action: 'RAISE', frequency: 100 },
  'A3s': { action: 'FOLD', frequency: 0 },
  'A2s': { action: 'FOLD', frequency: 0 },
  
  'AKo': { action: 'RAISE', frequency: 100 },
  'AQo': { action: 'RAISE', frequency: 100 },
  'AJo': { action: 'RAISE', frequency: 100 },
  'ATo': { action: 'RAISE', frequency: 100 },
  'A9o': { action: 'FOLD', frequency: 0 },
  'A8o': { action: 'FOLD', frequency: 0 },
  'A7o': { action: 'FOLD', frequency: 0 },
  'A6o': { action: 'FOLD', frequency: 0 },
  'A5o': { action: 'FOLD', frequency: 0 },
  'A4o': { action: 'FOLD', frequency: 0 },
  'A3o': { action: 'FOLD', frequency: 0 },
  'A2o': { action: 'FOLD', frequency: 0 },
  
  // 他のハンド
  'KQs': { action: 'RAISE', frequency: 100 },
  'KJs': { action: 'RAISE', frequency: 100 },
  'KTs': { action: 'FOLD', frequency: 0 },
  'K9s': { action: 'FOLD', frequency: 0 },
  'K8s': { action: 'FOLD', frequency: 0 },
  'K7s': { action: 'FOLD', frequency: 0 },
  'K6s': { action: 'FOLD', frequency: 0 },
  'K5s': { action: 'FOLD', frequency: 0 },
  'K4s': { action: 'FOLD', frequency: 0 },
  'K3s': { action: 'FOLD', frequency: 0 },
  'K2s': { action: 'FOLD', frequency: 0 },
  
  'KQo': { action: 'RAISE', frequency: 100 },
  'KJo': { action: 'FOLD', frequency: 0 },
  'KTo': { action: 'FOLD', frequency: 0 },
  'K9o': { action: 'FOLD', frequency: 0 },
  'K8o': { action: 'FOLD', frequency: 0 },
  'K7o': { action: 'FOLD', frequency: 0 },
  'K6o': { action: 'FOLD', frequency: 0 },
  'K5o': { action: 'FOLD', frequency: 0 },
  'K4o': { action: 'FOLD', frequency: 0 },
  'K3o': { action: 'FOLD', frequency: 0 },
  'K2o': { action: 'FOLD', frequency: 0 },
  
  'QJs': { action: 'RAISE', frequency: 100 },
  'QTs': { action: 'FOLD', frequency: 0 },
  'Q9s': { action: 'FOLD', frequency: 0 },
  'Q8s': { action: 'FOLD', frequency: 0 },
  'Q7s': { action: 'FOLD', frequency: 0 },
  'Q6s': { action: 'FOLD', frequency: 0 },
  'Q5s': { action: 'FOLD', frequency: 0 },
  'Q4s': { action: 'FOLD', frequency: 0 },
  'Q3s': { action: 'FOLD', frequency: 0 },
  'Q2s': { action: 'FOLD', frequency: 0 },
  
  'QJo': { action: 'FOLD', frequency: 0 },
  'QTo': { action: 'FOLD', frequency: 0 },
  'Q9o': { action: 'FOLD', frequency: 0 },
  'Q8o': { action: 'FOLD', frequency: 0 },
  'Q7o': { action: 'FOLD', frequency: 0 },
  'Q6o': { action: 'FOLD', frequency: 0 },
  'Q5o': { action: 'FOLD', frequency: 0 },
  'Q4o': { action: 'FOLD', frequency: 0 },
  'Q3o': { action: 'FOLD', frequency: 0 },
  'Q2o': { action: 'FOLD', frequency: 0 },
  
  'JTs': { action: 'RAISE', frequency: 100 },
  'J9s': { action: 'FOLD', frequency: 0 },
  'J8s': { action: 'FOLD', frequency: 0 },
  'J7s': { action: 'FOLD', frequency: 0 },
  'J6s': { action: 'FOLD', frequency: 0 },
  'J5s': { action: 'FOLD', frequency: 0 },
  'J4s': { action: 'FOLD', frequency: 0 },
  'J3s': { action: 'FOLD', frequency: 0 },
  'J2s': { action: 'FOLD', frequency: 0 },
  
  'JTo': { action: 'FOLD', frequency: 0 },
  'J9o': { action: 'FOLD', frequency: 0 },
  'J8o': { action: 'FOLD', frequency: 0 },
  'J7o': { action: 'FOLD', frequency: 0 },
  'J6o': { action: 'FOLD', frequency: 0 },
  'J5o': { action: 'FOLD', frequency: 0 },
  'J4o': { action: 'FOLD', frequency: 0 },
  'J3o': { action: 'FOLD', frequency: 0 },
  'J2o': { action: 'FOLD', frequency: 0 },
  
  // 10系以下
  'T9s': { action: 'FOLD', frequency: 0 },
  'T8s': { action: 'FOLD', frequency: 0 },
  'T7s': { action: 'FOLD', frequency: 0 },
  'T6s': { action: 'FOLD', frequency: 0 },
  'T5s': { action: 'FOLD', frequency: 0 },
  'T4s': { action: 'FOLD', frequency: 0 },
  'T3s': { action: 'FOLD', frequency: 0 },
  'T2s': { action: 'FOLD', frequency: 0 },
  
  'T9o': { action: 'FOLD', frequency: 0 },
  'T8o': { action: 'FOLD', frequency: 0 },
  'T7o': { action: 'FOLD', frequency: 0 },
  'T6o': { action: 'FOLD', frequency: 0 },
  'T5o': { action: 'FOLD', frequency: 0 },
  'T4o': { action: 'FOLD', frequency: 0 },
  'T3o': { action: 'FOLD', frequency: 0 },
  'T2o': { action: 'FOLD', frequency: 0 },
  
  '98s': { action: 'FOLD', frequency: 0 },
  '97s': { action: 'FOLD', frequency: 0 },
  '96s': { action: 'FOLD', frequency: 0 },
  '95s': { action: 'FOLD', frequency: 0 },
  '94s': { action: 'FOLD', frequency: 0 },
  '93s': { action: 'FOLD', frequency: 0 },
  '92s': { action: 'FOLD', frequency: 0 },
  
  '98o': { action: 'FOLD', frequency: 0 },
  '97o': { action: 'FOLD', frequency: 0 },
  '96o': { action: 'FOLD', frequency: 0 },
  '95o': { action: 'FOLD', frequency: 0 },
  '94o': { action: 'FOLD', frequency: 0 },
  '93o': { action: 'FOLD', frequency: 0 },
  '92o': { action: 'FOLD', frequency: 0 },
  
  '87s': { action: 'FOLD', frequency: 0 },
  '86s': { action: 'FOLD', frequency: 0 },
  '85s': { action: 'FOLD', frequency: 0 },
  '84s': { action: 'FOLD', frequency: 0 },
  '83s': { action: 'FOLD', frequency: 0 },
  '82s': { action: 'FOLD', frequency: 0 },
  
  '87o': { action: 'FOLD', frequency: 0 },
  '86o': { action: 'FOLD', frequency: 0 },
  '85o': { action: 'FOLD', frequency: 0 },
  '84o': { action: 'FOLD', frequency: 0 },
  '83o': { action: 'FOLD', frequency: 0 },
  '82o': { action: 'FOLD', frequency: 0 },
  
  '76s': { action: 'FOLD', frequency: 0 },
  '75s': { action: 'FOLD', frequency: 0 },
  '74s': { action: 'FOLD', frequency: 0 },
  '73s': { action: 'FOLD', frequency: 0 },
  '72s': { action: 'FOLD', frequency: 0 },
  
  '76o': { action: 'FOLD', frequency: 0 },
  '75o': { action: 'FOLD', frequency: 0 },
  '74o': { action: 'FOLD', frequency: 0 },
  '73o': { action: 'FOLD', frequency: 0 },
  '72o': { action: 'FOLD', frequency: 0 },
  
  '65s': { action: 'FOLD', frequency: 0 },
  '64s': { action: 'FOLD', frequency: 0 },
  '63s': { action: 'FOLD', frequency: 0 },
  '62s': { action: 'FOLD', frequency: 0 },
  
  '65o': { action: 'FOLD', frequency: 0 },
  '64o': { action: 'FOLD', frequency: 0 },
  '63o': { action: 'FOLD', frequency: 0 },
  '62o': { action: 'FOLD', frequency: 0 },
  
  '54s': { action: 'FOLD', frequency: 0 },
  '53s': { action: 'FOLD', frequency: 0 },
  '52s': { action: 'FOLD', frequency: 0 },
  
  '54o': { action: 'FOLD', frequency: 0 },
  '53o': { action: 'FOLD', frequency: 0 },
  '52o': { action: 'FOLD', frequency: 0 },
  
  '43s': { action: 'FOLD', frequency: 0 },
  '42s': { action: 'FOLD', frequency: 0 },
  
  '43o': { action: 'FOLD', frequency: 0 },
  '42o': { action: 'FOLD', frequency: 0 },
  
  '32s': { action: 'FOLD', frequency: 0 },
  '32o': { action: 'FOLD', frequency: 0 }
};

// 簡略化された他のポジションのレンジ
export const coOpenRaiseRange = btnOpenRaiseRange; // COはBTNと同じ
export const hjOpenRaiseRange = btnOpenRaiseRange; // HJはBTNと同じ
export const ljOpenRaiseRange = utgOpenRaiseRange; // LJはUTGと同じ
export const sbOpenRaiseRange = btnOpenRaiseRange; // SBはBTNと同じ

// ポジション別のレンジマッピング
export const positionRanges: Record<string, Record<string, HandInfo>> = {
  'BTN': btnOpenRaiseRange,
  'CO': coOpenRaiseRange,
  'HJ': hjOpenRaiseRange,
  'LJ': ljOpenRaiseRange,
  'UTG1': utgOpenRaiseRange,
  'UTG': utgOpenRaiseRange,
  'SB': sbOpenRaiseRange
};

// ポジションに基づいてレンジを取得する関数
export const getRangeForPosition = (position: string): Record<string, HandInfo> => {
  return positionRanges[position] || utgOpenRaiseRange;
};

// MTTレンジを取得する関数
export const getMTTRange = (position: string, stackSize: number = 100): Record<string, HandInfo> => {
  if (stackSize <= 15) {
    // 15BBスタック用のMonkerGuyレンジ（画像データに基づく）
    switch (position) {
      case 'UTG':
        // UTG: ALL IN(0.1%) + MIN(14.9%) + FOLD(84.9%)
        const utgRange: Record<string, HandInfo> = {};
        
        // ALL IN (0.1%) - AAのみ
        utgRange['AA'] = { action: 'ALL_IN', frequency: 100 };
        
        // MIN (14.9%) - 厳選されたプレミアムハンド
        const utgMinHands = [
          'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
          'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'AKo', 'AQo', 'AJo', 'ATo',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo',
          'QJs', 'QTs',
          'JTs',
          'T9s',
          '98s'
        ];
        
        utgMinHands.forEach(hand => {
          utgRange[hand] = { action: 'MIN', frequency: 100 };
        });
        
        // 残りは全てFOLD
        return new Proxy(utgRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });
        
      case 'UTG1':
        // UTG+1: ALL IN(2.1%) + MIN(15.0%) + FOLD(82.9%)
        const utg1Range: Record<string, HandInfo> = {};
        
        // ALL IN (2.1%)
        const utg1AllInHands = ['AA', 'KK', 'AKs', 'AKo'];
        utg1AllInHands.forEach(hand => {
          utg1Range[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // MIN (15.0%)
        const utg1MinHands = [
          'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55',
          'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'AQo', 'AJo', 'ATo',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo',
          'QJs', 'QTs',
          'JTs',
          'T9s',
          '98s'
        ];
        
        utg1MinHands.forEach(hand => {
          utg1Range[hand] = { action: 'MIN', frequency: 100 };
        });
        
        return new Proxy(utg1Range, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });

      case 'LJ':
        // LJ (UTG+2): ALL IN(7.8%) + MIN(15.8%) + FOLD(76.4%)
        const ljRange: Record<string, HandInfo> = {};
        
        // ALL IN (7.8%)
        const ljAllInHands = [
          'AA', 'KK', 'QQ', 'JJ', 'TT', '99',
          'AKs', 'AQs', 'AJs', 'ATs',
          'AKo', 'AQo'
        ];
        ljAllInHands.forEach(hand => {
          ljRange[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // MIN (15.8%)
        const ljMinHands = [
          '88', '77', '66', '55',
          'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'AJo', 'ATo',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo',
          'QJs', 'QTs',
          'JTs',
          'T9s',
          '98s'
        ];
        
        ljMinHands.forEach(hand => {
          ljRange[hand] = { action: 'MIN', frequency: 100 };
        });
        
        return new Proxy(ljRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });

      case 'HJ':
        // HJ (UTG+3): ALL IN(12.9%) + MIN(16.0%) + FOLD(71.1%)
        const hjRange: Record<string, HandInfo> = {};
        
        // ALL IN (12.9%)
        const hjAllInHands = [
          'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
          'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s',
          'AKo', 'AQo', 'AJo'
        ];
        hjAllInHands.forEach(hand => {
          hjRange[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // MIN (16.0%)
        const hjMinHands = [
          '66', '55',
          'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'ATo',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo',
          'QJs', 'QTs',
          'JTs',
          'T9s',
          '98s'
        ];
        
        hjMinHands.forEach(hand => {
          hjRange[hand] = { action: 'MIN', frequency: 100 };
        });
        
        return new Proxy(hjRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });

      case 'CO':
        // CO: ALL IN(12.9%) + MIN(16.0%) + FOLD(71.1%)
        const coRange: Record<string, HandInfo> = {};
        
        // ALL IN (12.9%)
        const coAllInHands = [
          'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77',
          'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s',
          'AKo', 'AQo', 'AJo'
        ];
        coAllInHands.forEach(hand => {
          coRange[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // MIN (16.0%)
        const coMinHands = [
          '66', '55',
          'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'ATo',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo',
          'QJs', 'QTs',
          'JTs',
          'T9s',
          '98s'
        ];
        
        coMinHands.forEach(hand => {
          coRange[hand] = { action: 'MIN', frequency: 100 };
        });
        
        return new Proxy(coRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });

      case 'BTN':
        // BTN: ALL IN(19.2%) + CALL(26.2%) + FOLD(54.6%)
        const btnRange: Record<string, HandInfo> = {};
        
        // ALL IN (19.2%)
        const btnAllInHands = [
          'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
          'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'AKo', 'AQo', 'AJo', 'ATo', 'A9o',
          'KQs', 'KJs', 'KTs', 'K9s',
          'KQo', 'KJo',
          'QJs', 'QTs', 'Q9s',
          'QJo',
          'JTs', 'J9s',
          'JTo',
          'T9s',
          '98s'
        ];
        
        btnAllInHands.forEach(hand => {
          btnRange[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // CALL (26.2%)
        const btnCallHands = [
          'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o',
          'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
          'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
          'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
          'QTo', 'Q9o', 'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o', 'Q3o', 'Q2o',
          'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
          'J9o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
          'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
          'T9o', 'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
          '97s', '96s', '95s', '94s', '93s', '92s',
          '98o', '97o', '96o', '95o',
          '87s', '86s', '85s', '84s', '83s', '82s',
          '87o', '86o', '85o',
          '76s', '75s', '74s', '73s', '72s',
          '76o', '75o',
          '65s', '64s', '63s', '62s',
          '65o',
          '54s', '53s', '52s',
          '54o',
          '43s', '42s',
          '32s'
        ];
        
        btnCallHands.forEach(hand => {
          btnRange[hand] = { action: 'CALL', frequency: 100 };
        });
        
        return new Proxy(btnRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });
        
      case 'SB':
        // SB: ALL IN(23.9%) + 3BB(9.6%) + CALL(49.2%) + FOLD(17.3%)
        const sbRange: Record<string, HandInfo> = {};
        
        // ALL IN (23.9%)
        const sbAllInHands = [
          'AA', 'KK', 'QQ', 'JJ', 'TT', '99', '88', '77', '66', '55', '44', '33', '22',
          'AKs', 'AQs', 'AJs', 'ATs', 'A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s',
          'AKo', 'AQo', 'AJo', 'ATo', 'A9o', 'A8o', 'A7o', 'A6o', 'A5o', 'A4o', 'A3o', 'A2o'
        ];
        
        sbAllInHands.forEach(hand => {
          sbRange[hand] = { action: 'ALL_IN', frequency: 100 };
        });
        
        // 3BB (9.6%)
        const sb3BBHands = ['KQs', 'KJs', 'KTs', 'KQo', 'KJo'];
        sb3BBHands.forEach(hand => {
          sbRange[hand] = { action: '3BB', frequency: 100 };
        });
        
        // CALL (49.2%) - 残りのほぼ全て
        const sbCallHands = [
          'K9s', 'K8s', 'K7s', 'K6s', 'K5s', 'K4s', 'K3s', 'K2s',
          'KTo', 'K9o', 'K8o', 'K7o', 'K6o', 'K5o', 'K4o', 'K3o', 'K2o',
          'QJs', 'QTs', 'Q9s', 'Q8s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'Q2s',
          'QJo', 'QTo', 'Q9o', 'Q8o', 'Q7o', 'Q6o', 'Q5o', 'Q4o', 'Q3o', 'Q2o',
          'JTs', 'J9s', 'J8s', 'J7s', 'J6s', 'J5s', 'J4s', 'J3s', 'J2s',
          'JTo', 'J9o', 'J8o', 'J7o', 'J6o', 'J5o', 'J4o', 'J3o', 'J2o',
          'T9s', 'T8s', 'T7s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s',
          'T9o', 'T8o', 'T7o', 'T6o', 'T5o', 'T4o', 'T3o', 'T2o',
          '98s', '97s', '96s', '95s', '94s', '93s', '92s',
          '98o', '97o', '96o', '95o', '94o', '93o', '92o',
          '87s', '86s', '85s', '84s', '83s', '82s',
          '87o', '86o', '85o', '84o', '83o', '82o',
          '76s', '75s', '74s', '73s', '72s',
          '76o', '75o', '74o', '73o', '72o',
          '65s', '64s', '63s', '62s',
          '65o', '64o', '63o', '62o',
          '54s', '53s', '52s',
          '54o', '53o', '52o',
          '43s', '42s',
          '43o', '42o',
          '32s',
          '32o'
        ];
        
        sbCallHands.forEach(hand => {
          sbRange[hand] = { action: 'CALL', frequency: 100 };
        });
        
        // FOLDはほとんどない（17.3%）が、一部の弱いハンド
        return new Proxy(sbRange, {
          get: (target, prop) => {
            if (typeof prop === 'string' && target[prop]) {
              return target[prop];
            }
            return { action: 'FOLD', frequency: 0 };
          }
        });
        
      default:
        // デフォルトはUTGレンジ
        return getMTTRange('UTG', stackSize);
    }
  }
  
  // 100BB以上の通常戦略
  return getRangeForPosition(position);
};

// ハンドレンジグリッドコンポーネント
const HandRangeGrid: React.FC<{
  rangeData: Record<string, HandInfo>;
  title: string;
  onClose: () => void;
  onSelectHands?: (selectedHands: string[]) => void;
  initialSelectedHands?: string[];
  showLegend?: boolean;
}> = ({ rangeData, title, onClose, onSelectHands, initialSelectedHands = [], showLegend = true }) => {
  const [selectedHands, setSelectedHands] = useState<string[]>(initialSelectedHands);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ row: number; col: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [isRangeSelectMode, setIsRangeSelectMode] = useState(false);
  const [rangeFirstClick, setRangeFirstClick] = useState<{ row: number; col: number } | null>(null);

  // selectedHandsの変更を親コンポーネントに通知
  useEffect(() => {
    if (onSelectHands) {
      onSelectHands(selectedHands);
    }
  }, [selectedHands, onSelectHands]);

  // 頻度データを取得する関数
  const getHandFrequencies = (hand: string) => {
    const handInfo = rangeData[hand];
    if (!handInfo) {
      return { MIN: 0, ALL_IN: 0, CALL: 0, FOLD: 100 };
    }

    if (handInfo.mixedFrequencies) {
      return handInfo.mixedFrequencies as { MIN: number; ALL_IN: number; CALL: number; FOLD: number; };
    } else {
      // 単一アクション
      const freq = { MIN: 0, ALL_IN: 0, CALL: 0, FOLD: 0 };
      switch (handInfo.action) {
        case 'MIN':
        case 'RAISE':
        case '3BB':
          freq.MIN = handInfo.frequency;
          break;
        case 'ALL_IN':
          freq.ALL_IN = handInfo.frequency;
          break;
        case 'CALL':
          freq.CALL = handInfo.frequency;
          break;
        default:
          freq.FOLD = handInfo.frequency;
      }
      return freq;
    }
  };

  // 範囲内のハンドが選択中かどうか確認する関数
  const isInSelectedRange = (row: number, col: number) => {
    if (!isRangeSelectMode || !rangeFirstClick) return false;
    
    const minRow = Math.min(rangeFirstClick.row, row);
    const maxRow = Math.max(rangeFirstClick.row, row);
    const minCol = Math.min(rangeFirstClick.col, col);
    const maxCol = Math.max(rangeFirstClick.col, col);
    
    return row >= minRow && row <= maxRow && col >= minCol && col <= maxCol;
  };

  // グリッドを生成
  const generateGrid = () => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const grid = [];
    
    for (let i = 0; i < 13; i++) {
      const row = [];
      for (let j = 0; j < 13; j++) {
        let hand = '';
        if (i === j) {
          hand = ranks[i] + ranks[j];
        } else if (i < j) {
          hand = ranks[i] + ranks[j] + 's';
        } else {
          hand = ranks[j] + ranks[i] + 'o';
        }
        row.push({ hand, row: i, col: j });
      }
      grid.push(row);
    }
    return grid;
  };

  const grid = generateGrid();

  // 色を取得する関数
  const getHandColor = (hand: string, row: number, col: number) => {
    // 範囲選択モードで開始点を設定済みの場合
    if (isRangeSelectMode && rangeFirstClick) {
      if (rangeFirstClick.row === row && rangeFirstClick.col === col) {
        return 'bg-green-500 border-green-600'; // 開始点は緑色
      }
      // 現在のセルが範囲内の場合は水色でプレビュー
      if (isInSelectedRange(row, col)) {
        return 'bg-cyan-400 border-cyan-500';
      }
    }

    // 選択されているハンドは赤色で表示
    if (selectedHands.includes(hand)) {
      return 'bg-red-500 border-red-600';
    }
    
    // ドラッグ中の選択範囲をハイライト
    if (isDragging && selectionStart && currentSelection) {
      const minRow = Math.min(selectionStart.row, currentSelection.row);
      const maxRow = Math.max(selectionStart.row, currentSelection.row);
      const minCol = Math.min(selectionStart.col, currentSelection.col);
      const maxCol = Math.max(selectionStart.col, currentSelection.col);
      
      if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
        return 'bg-blue-300 border-blue-500';
      }
    }
    
    return 'bg-black hover:bg-gray-700 border-gray-600';
  };

  // アクション別の色を取得
  const getActionColor = (action: string) => {
    switch (action) {
      case 'MIN': return 'bg-blue-500 hover:bg-blue-600';
      case 'ALL_IN': return 'bg-red-500 hover:bg-red-600';
      case 'CALL': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'FOLD': return 'bg-gray-600 hover:bg-gray-700';
      default: return 'bg-gray-800 hover:bg-gray-700';
    }
  };

  // Tailwind用の色クラス
  const getActionColorTailwind = (action: string) => {
    switch (action) {
      case 'MIN': return 'blue-500';
      case 'ALL_IN': return 'red-500';
      case 'CALL': return 'yellow-500';
      default: return 'gray-600';
    }
  };

  // Hex色を取得
  const getActionColorHex = (action: string) => {
    switch (action) {
      case 'MIN': return '#3b82f6';
      case 'ALL_IN': return '#ef4444';
      case 'CALL': return '#eab308';
      default: return '#6b7280';
    }
  };

  // ハンドセルの表示テキストを取得（頻度情報付き）
  const getHandDisplayText = (hand: string) => {
    return hand;
  };

  // 頻度に応じた動的スタイルを取得
  const getHandStyle = (hand: string) => {
    const frequencies = getHandFrequencies(hand);
    const actions = [
      { key: 'MIN', color: getActionColorHex('MIN'), value: frequencies.MIN },
      { key: 'ALL_IN', color: getActionColorHex('ALL_IN'), value: frequencies.ALL_IN },
      { key: 'CALL', color: getActionColorHex('CALL'), value: frequencies.CALL },
      { key: 'FOLD', color: getActionColorHex('FOLD'), value: frequencies.FOLD }
    ];
    const nonZeroActions = actions.filter(a => a.value > 0);
    const totalNonFold = frequencies.MIN + frequencies.ALL_IN + frequencies.CALL;

    // フォールド100%
    if (totalNonFold === 0) {
      return { background: 'rgb(31, 41, 55)' };
    }
    // 単一アクション100%
    if (nonZeroActions.length === 1 && nonZeroActions[0].value === 100) {
      return { background: nonZeroActions[0].color };
    }
    // 混合戦略（2つ以上のアクションが0%超）
    if (nonZeroActions.length >= 2) {
      let gradientStops = [];
      let currentPosition = 0;
      for (const a of actions) {
        if (a.value > 0) {
          gradientStops.push(`${a.color} ${currentPosition}% ${currentPosition + a.value}%`);
          currentPosition += a.value;
        }
      }
      const gradientStyle = `linear-gradient(90deg, ${gradientStops.join(', ')})`;
      return {
        background: gradientStyle,
        border: '1px solid rgb(75, 85, 99)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat'
      };
    }
    // それ以外（念のため）
    return {
      background: 'rgb(31, 41, 55)',
      border: '1px solid rgb(75, 85, 99)'
    };
  };

  // マウスダウン（ドラッグ開始）
  const handleMouseDown = (row: number, col: number) => {
    if (!onSelectHands) return;
    setIsDragging(true);
    setSelectionStart({ row, col });
    setCurrentSelection({ row, col });
    setHasDragged(false);
    
    console.log('マウスダウン:', row, col); // デバッグ用
  };

  // マウスエンター（ドラッグ中）
  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && selectionStart) {
      // ドラッグが検出された - より厳密な判定
      const deltaRow = Math.abs(row - selectionStart.row);
      const deltaCol = Math.abs(col - selectionStart.col);
      
      if (deltaRow > 0 || deltaCol > 0) {
        setHasDragged(true);
        console.log('ドラッグ検出:', deltaRow, deltaCol); // デバッグ用
      }
      setCurrentSelection({ row, col });
    }
  };

  // マウスアップ（ドラッグ終了またはクリック）
  const handleMouseUp = () => {
    if (!isDragging || !selectionStart || !currentSelection || !onSelectHands) {
      setIsDragging(false);
      setHasDragged(false);
      return;
    }

    if (!hasDragged) {
      // 単一クリック
      const cell = grid[selectionStart.row][selectionStart.col];
      if (cell) {
        handleHandClick(cell.hand);
      }
    } else {
      // 範囲選択
      const minRow = Math.min(selectionStart.row, currentSelection.row);
      const maxRow = Math.max(selectionStart.row, currentSelection.row);
      const minCol = Math.min(selectionStart.col, currentSelection.col);
      const maxCol = Math.max(selectionStart.col, currentSelection.col);
      
      const rangeHands: string[] = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let c = minCol; c <= maxCol; c++) {
          if (grid[r] && grid[r][c]) {
            rangeHands.push(grid[r][c].hand);
          }
        }
      }
      
      // 範囲選択されたハンドを選択済みリストに追加
      setSelectedHands(prev => {
        const newSelected = [...prev];
        rangeHands.forEach(hand => {
          if (newSelected.includes(hand)) {
            // 既に選択されている場合は解除
            const index = newSelected.indexOf(hand);
            newSelected.splice(index, 1);
          } else {
            // 未選択の場合は追加
            newSelected.push(hand);
          }
        });
        return newSelected;
      });
    }
    
    setIsDragging(false);
    setSelectionStart(null);
    setCurrentSelection(null);
    setHasDragged(false);
  };

  // ハンドクリック処理
  const handleHandClick = (hand: string) => {
    if (!onSelectHands) return;
    
    console.log('ハンドクリック:', hand); // デバッグ用
    
    setSelectedHands(prev => {
      const newSelected = prev.includes(hand) 
        ? prev.filter(h => h !== hand)
        : [...prev, hand];
      
      console.log('選択状態更新:', newSelected); // デバッグ用
      return newSelected;
    });
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-4xl w-full mx-4 shadow-2xl border border-gray-700">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-all duration-200"
          >
            ✕
          </button>
        </div>
        
        {/* コントロール */}
        {onSelectHands && (
          <div className="mb-4 bg-gray-800 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-white">
                選択されたハンド: <span className="text-red-400">{selectedHands.length}</span>個
              </p>
              <div className="flex gap-2">
            <button
                  onClick={() => setSelectedHands(Object.keys(rangeData))}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-all duration-200"
                >
                  全選択
                </button>
                <button
                  onClick={() => setSelectedHands([])}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-all duration-200"
                >
                  全解除
            </button>
          </div>
        </div>
            <p className="text-xs text-gray-400">
              💡 クリックで単一選択、ドラッグで範囲選択ができます
            </p>
          </div>
        )}
        
        {/* グリッド */}
        <div 
          className="grid grid-cols-13 gap-1 mb-4 select-none"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHasDragged(false);
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  ${getHandColor(cell.hand, rowIndex, colIndex)} 
                  text-white text-xs font-bold py-1 px-1 text-center cursor-pointer 
                  rounded transition-all duration-200
                  hover:shadow-md min-h-[2rem] flex items-center justify-center
                `}
                style={getHandStyle(cell.hand)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                onContextMenu={(e) => e.preventDefault()}
                title={`${cell.hand} - 右クリックで詳細設定`}
              >
                {getHandDisplayText(cell.hand)}
              </div>
            ))
          )}
        </div>


        
        {/* 凡例 */}
        {showLegend && (
          <div className="flex flex-wrap gap-3 text-xs text-white bg-gray-800 rounded-lg p-3 border border-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-black border border-gray-500 rounded"></div>
              <span>未選択</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 border-2 border-red-600 rounded"></div>
              <span>選択済み</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ハンドレンジボタンコンポーネント
export const HandRangeButton: React.FC<{
  position: string;
  action: string;
  onShowRange: () => void;
}> = ({ position, action, onShowRange }) => {
  return (
    <button
      onClick={onShowRange}
      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
    >
      {position} {action}レンジ
    </button>
  );
};

// トレーニング用ハンドテンプレート定義
export const HAND_TEMPLATES = {
  'プレミアム': ['AA', 'KK', 'QQ', 'JJ', 'TT', 'AKs', 'AKo', 'AQs', 'AQo'],
  'ブロードウェイ': ['KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs', 'KQo', 'KJo', 'KTo', 'QJo', 'QTo', 'JTo'],
  'スーコネ': ['T9s', '98s', '87s', '76s', '65s', '54s', '43s', '32s'],
  'スモールペア': ['99', '88', '77', '66', '55', '44', '33', '22'],
  'エーススート': ['A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s'],
  'ギャッパー': ['J9s', 'J8s', 'T8s', 'T7s', '97s', '96s', '86s', '85s', '75s'],
  '際どい判断': ['KTs', 'K9s', 'K8s', 'K7s', 'QTs', 'Q9s', 'Q8s', 'J9s', 'J8s', 'T9s', 'T8s', 'T7s', '97s', '98s', '87s', '86s', '76s', '75s', '65s', '54s', '77', '66', '55', '44'],
  '際どい判断2': ['A9s', 'A8s', 'A7s', 'A6s', 'A5s', 'A4s', 'A3s', 'A2s', 'AJo', 'ATo', 'A9o', 'A8o', 'KJs', 'KTs', 'K9s', 'K8s', 'K7s', 'QJs', 'QTs', 'Q9s', 'Q8s', 'JTs', 'J9s', 'T9s', 'T8s', '98s', '87s', '76s', '66', '55', '44', '33']
};

// ハンドレンジセレクターコンポーネント
export const HandRangeSelector: React.FC<{
  onSelectHands: (selectedHands: string[]) => void;
  initialSelectedHands?: string[];
  title?: string;
  onClose: () => void;
  onTemplateSelect?: (templateName: string) => void;
}> = ({ onSelectHands, initialSelectedHands = [], title = "プレイするハンドを選択", onClose, onTemplateSelect }) => {
  // トレーニング用：全ハンドを選択可能にする（頻度データは不要）
  const allHands = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  const trainingRangeData: Record<string, HandInfo> = {};
  
  // 全169ハンドを生成
  for (let i = 0; i < 13; i++) {
    for (let j = 0; j < 13; j++) {
      let hand = '';
      if (i === j) {
        // ペア
        hand = allHands[i] + allHands[j];
      } else if (i < j) {
        // スーテッド
        hand = allHands[i] + allHands[j] + 's';
      } else {
        // オフスーツ
        hand = allHands[j] + allHands[i] + 'o';
      }
      trainingRangeData[hand] = { action: 'RAISE', frequency: 100 };
    }
  }
  
  const [selectedHands, setSelectedHands] = useState<string[]>(initialSelectedHands);

  // selectedHandsの変更を監視して親に通知
  useEffect(() => {
    console.log('🔄 HandRangeSelector useEffect:', { 
      selectedHands, 
      selectedHandsLength: selectedHands.length,
      hasOnSelectHands: !!onSelectHands 
    });
    if (onSelectHands) {
      console.log('🔄 HandRangeSelector: onSelectHands呼び出し（useEffect）');
      onSelectHands(selectedHands);
    }
  }, [selectedHands, onSelectHands]);

  // ハンドグリッドを生成する関数
  const generateHandGrid = () => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const grid = [];

    // ヘッダー行
    const headerRow = [<div key="empty" className="w-8 h-8 md:w-10 md:h-10"></div>];
    ranks.forEach(rank => {
      headerRow.push(
        <div key={`header-${rank}`} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold text-white">
          {rank}
        </div>
      );
    });
    grid.push(<div key="header" className="contents">{headerRow}</div>);

    // ハンド行
    ranks.forEach((rank1, i) => {
      const row = [
        <div key={`row-header-${rank1}`} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm md:text-xl font-bold text-white">
          {rank1}
        </div>
      ];

      ranks.forEach((rank2, j) => {
        let hand = '';
        if (i === j) {
          hand = rank1 + rank2; // ペア
        } else if (i < j) {
          hand = rank1 + rank2 + 's'; // スーテッド
        } else {
          hand = rank2 + rank1 + 'o'; // オフスーツ
        }

        const isSelected = selectedHands.includes(hand);
        
        row.push(
          <button
            key={hand}
            onClick={() => {
              if (isSelected) {
                setSelectedHands(prev => prev.filter(h => h !== hand));
              } else {
                setSelectedHands(prev => [...prev, hand]);
              }
            }}
            className={`w-8 h-8 md:w-10 md:h-10 text-xs md:text-xl font-bold rounded transition-all duration-200 ${
              isSelected 
                ? 'bg-purple-600 text-white border-2 border-purple-400' 
                : 'bg-gray-700 text-gray-100 md:text-white hover:bg-gray-600 border border-gray-600'
            }`}
            style={{ fontSize: '40px' }}
          >
            {hand}
          </button>
        );
      });

      grid.push(<div key={`row-${rank1}`} className="contents">{row}</div>);
    });

    return grid;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] shadow-2xl border border-gray-700 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-all duration-200">✕</button>
        </div>
        

        
        {/* ハンドレンジグリッド */}
        <div className="flex-1 mb-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
            <div className="grid grid-cols-13 gap-1">
              {generateHandGrid()}
            </div>
          </div>
        </div>

        {/* 選択完了ボタン */}
        <div className="mt-auto">
          <button
            onClick={() => {
              console.log('🔄 HandRangeSelector: 選択完了ボタンクリック:', {
                selectedHands,
                selectedHandsLength: selectedHands.length
              });
              onSelectHands(selectedHands);
              console.log('🔄 HandRangeSelector: onSelectHands呼び出し（選択完了ボタン）');
              onClose();
            }}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
            選択完了 ({selectedHands.length}ハンド) ✓
          </button>
        </div>
      </div>
    </div>
  );
};

export default HandRangeGrid;

// HandRangeGridを名前付きエクスポートとしても追加
export { HandRangeGrid };

// スタックサイズに基づいてレンジを取得
export const getRangeForStackSize = (position: string, stackSize: number): Record<string, HandInfo> => {
  if (stackSize <= 20) {
    // 20BB以下はMTTレンジを使用
    return getMTTRange(position, stackSize);
  } else {
    // 20BB超は深いスタック戦略
    return getRangeForPosition(position);
  }
};

// 15BB MTT戦略 - UTGポジション (画像データに基づく)
export const utg15bbRange: Record<string, HandInfo> = {
  // ALL IN (0.1%) - AAのみ
  'AA': { action: 'ALL_IN', frequency: 0.1 },
  
  // MIN (14.9%) - プレミアムハンド
  'KK': { action: 'MIN', frequency: 14.9 },
  'QQ': { action: 'MIN', frequency: 14.9 },
  'JJ': { action: 'MIN', frequency: 14.9 },
  'TT': { action: 'MIN', frequency: 14.9 },
  '99': { action: 'MIN', frequency: 14.9 },
  '88': { action: 'MIN', frequency: 14.9 },
  '77': { action: 'MIN', frequency: 14.9 },
  '66': { action: 'MIN', frequency: 14.9 },
  '55': { action: 'MIN', frequency: 14.9 },
  
  // エース系スーテッド
  'AKs': { action: 'MIN', frequency: 14.9 },
  'AQs': { action: 'MIN', frequency: 14.9 },
  'AJs': { action: 'MIN', frequency: 14.9 },
  'ATs': { action: 'MIN', frequency: 14.9 },
  'A9s': { action: 'MIN', frequency: 14.9 },
  'A8s': { action: 'MIN', frequency: 14.9 },
  'A7s': { action: 'MIN', frequency: 14.9 },
  'A6s': { action: 'MIN', frequency: 14.9 },
  'A5s': { action: 'MIN', frequency: 14.9 },
  'A4s': { action: 'MIN', frequency: 14.9 },
  'A3s': { action: 'MIN', frequency: 14.9 },
  'A2s': { action: 'MIN', frequency: 14.9 },
  
  // キング系スーテッド
  'KQs': { action: 'MIN', frequency: 14.9 },
  'KJs': { action: 'MIN', frequency: 14.9 },
  'KTs': { action: 'MIN', frequency: 14.9 },
  'K9s': { action: 'MIN', frequency: 14.9 },
  'K8s': { action: 'MIN', frequency: 14.9 },
  'K7s': { action: 'MIN', frequency: 14.9 },
  'K6s': { action: 'MIN', frequency: 14.9 },
  'K5s': { action: 'MIN', frequency: 14.9 },
  'K4s': { action: 'MIN', frequency: 14.9 },
  'K3s': { action: 'MIN', frequency: 14.9 },
  'K2s': { action: 'MIN', frequency: 14.9 },
  
  // クイーン系スーテッド
  'QJs': { action: 'MIN', frequency: 14.9 },
  'QTs': { action: 'MIN', frequency: 14.9 },
  'Q9s': { action: 'MIN', frequency: 14.9 },
  'Q8s': { action: 'MIN', frequency: 14.9 },
  
  // ジャック系スーテッド
  'JTs': { action: 'MIN', frequency: 14.9 },
  'J9s': { action: 'MIN', frequency: 14.9 },
  
  // 10系スーテッド
  'T9s': { action: 'MIN', frequency: 14.9 },
  'T8s': { action: 'MIN', frequency: 14.9 },
  
  // その他スーテッド
  '98s': { action: 'MIN', frequency: 14.9 },
  '87s': { action: 'MIN', frequency: 14.9 },
  
  // オフスーツ
  'AKo': { action: 'MIN', frequency: 14.9 },
  'AQo': { action: 'MIN', frequency: 14.9 },
  'AJo': { action: 'MIN', frequency: 14.9 },
  'ATo': { action: 'MIN', frequency: 14.9 },
  'KQo': { action: 'MIN', frequency: 14.9 },
  
  // 残り全てFOLD (84.9%)
  'Q7s': { action: 'FOLD', frequency: 84.9 },
  'Q6s': { action: 'FOLD', frequency: 84.9 },
  'Q5s': { action: 'FOLD', frequency: 84.9 },
  'Q4s': { action: 'FOLD', frequency: 84.9 },
  'Q3s': { action: 'FOLD', frequency: 84.9 },
  'Q2s': { action: 'FOLD', frequency: 84.9 },
  'J8s': { action: 'FOLD', frequency: 84.9 },
  'J7s': { action: 'FOLD', frequency: 84.9 },
  'J6s': { action: 'FOLD', frequency: 84.9 },
  'J5s': { action: 'FOLD', frequency: 84.9 },
  'J4s': { action: 'FOLD', frequency: 84.9 },
  'J3s': { action: 'FOLD', frequency: 84.9 },
  'J2s': { action: 'FOLD', frequency: 84.9 },
  'T7s': { action: 'FOLD', frequency: 84.9 },
  'T6s': { action: 'FOLD', frequency: 84.9 },
  'T5s': { action: 'FOLD', frequency: 84.9 },
  'T4s': { action: 'FOLD', frequency: 84.9 },
  'T3s': { action: 'FOLD', frequency: 84.9 },
  'T2s': { action: 'FOLD', frequency: 84.9 },
  '97s': { action: 'FOLD', frequency: 84.9 },
  '96s': { action: 'FOLD', frequency: 84.9 },
  '95s': { action: 'FOLD', frequency: 84.9 },
  '94s': { action: 'FOLD', frequency: 84.9 },
  '93s': { action: 'FOLD', frequency: 84.9 },
  '92s': { action: 'FOLD', frequency: 84.9 },
  '86s': { action: 'FOLD', frequency: 84.9 },
  '85s': { action: 'FOLD', frequency: 84.9 },
  '84s': { action: 'FOLD', frequency: 84.9 },
  '83s': { action: 'FOLD', frequency: 84.9 },
  '82s': { action: 'FOLD', frequency: 84.9 },
  '76s': { action: 'FOLD', frequency: 84.9 },
  '75s': { action: 'FOLD', frequency: 84.9 },
  '74s': { action: 'FOLD', frequency: 84.9 },
  '73s': { action: 'FOLD', frequency: 84.9 },
  '72s': { action: 'FOLD', frequency: 84.9 },
  '65s': { action: 'FOLD', frequency: 84.9 },
  '64s': { action: 'FOLD', frequency: 84.9 },
  '63s': { action: 'FOLD', frequency: 84.9 },
  '62s': { action: 'FOLD', frequency: 84.9 },
  '54s': { action: 'FOLD', frequency: 84.9 },
  '53s': { action: 'FOLD', frequency: 84.9 },
  '52s': { action: 'FOLD', frequency: 84.9 },
  '43s': { action: 'FOLD', frequency: 84.9 },
  '42s': { action: 'FOLD', frequency: 84.9 },
  '32s': { action: 'FOLD', frequency: 84.9 },
  
  // オフスーツ（フォールド）
  'A9o': { action: 'FOLD', frequency: 84.9 },
  'A8o': { action: 'FOLD', frequency: 84.9 },
  'A7o': { action: 'FOLD', frequency: 84.9 },
  'A6o': { action: 'FOLD', frequency: 84.9 },
  'A5o': { action: 'FOLD', frequency: 84.9 },
  'A4o': { action: 'FOLD', frequency: 84.9 },
  'A3o': { action: 'FOLD', frequency: 84.9 },
  'A2o': { action: 'FOLD', frequency: 84.9 },
  'KJo': { action: 'FOLD', frequency: 84.9 },
  'KTo': { action: 'FOLD', frequency: 84.9 },
  'K9o': { action: 'FOLD', frequency: 84.9 },
  'K8o': { action: 'FOLD', frequency: 84.9 },
  'K7o': { action: 'FOLD', frequency: 84.9 },
  'K6o': { action: 'FOLD', frequency: 84.9 },
  'K5o': { action: 'FOLD', frequency: 84.9 },
  'K4o': { action: 'FOLD', frequency: 84.9 },
  'K3o': { action: 'FOLD', frequency: 84.9 },
  'K2o': { action: 'FOLD', frequency: 84.9 },
  'QJo': { action: 'FOLD', frequency: 84.9 },
  'QTo': { action: 'FOLD', frequency: 84.9 },
  'Q9o': { action: 'FOLD', frequency: 84.9 },
  'Q8o': { action: 'FOLD', frequency: 84.9 },
  'Q7o': { action: 'FOLD', frequency: 84.9 },
  'Q6o': { action: 'FOLD', frequency: 84.9 },
  'Q5o': { action: 'FOLD', frequency: 84.9 },
  'Q4o': { action: 'FOLD', frequency: 84.9 },
  'Q3o': { action: 'FOLD', frequency: 84.9 },
  'Q2o': { action: 'FOLD', frequency: 84.9 },
  'JTo': { action: 'FOLD', frequency: 84.9 },
  'J9o': { action: 'FOLD', frequency: 84.9 },
  'J8o': { action: 'FOLD', frequency: 84.9 },
  'J7o': { action: 'FOLD', frequency: 84.9 },
  'J6o': { action: 'FOLD', frequency: 84.9 },
  'J5o': { action: 'FOLD', frequency: 84.9 },
  'J4o': { action: 'FOLD', frequency: 84.9 },
  'J3o': { action: 'FOLD', frequency: 84.9 },
  'J2o': { action: 'FOLD', frequency: 84.9 },
  'T9o': { action: 'FOLD', frequency: 84.9 },
  'T8o': { action: 'FOLD', frequency: 84.9 },
  'T7o': { action: 'FOLD', frequency: 84.9 },
  'T6o': { action: 'FOLD', frequency: 84.9 },
  'T5o': { action: 'FOLD', frequency: 84.9 },
  'T4o': { action: 'FOLD', frequency: 84.9 },
  'T3o': { action: 'FOLD', frequency: 84.9 },
  'T2o': { action: 'FOLD', frequency: 84.9 },
  '98o': { action: 'FOLD', frequency: 84.9 },
  '97o': { action: 'FOLD', frequency: 84.9 },
  '96o': { action: 'FOLD', frequency: 84.9 },
  '95o': { action: 'FOLD', frequency: 84.9 },
  '94o': { action: 'FOLD', frequency: 84.9 },
  '93o': { action: 'FOLD', frequency: 84.9 },
  '92o': { action: 'FOLD', frequency: 84.9 },
  '87o': { action: 'FOLD', frequency: 84.9 },
  '86o': { action: 'FOLD', frequency: 84.9 },
  '85o': { action: 'FOLD', frequency: 84.9 },
  '84o': { action: 'FOLD', frequency: 84.9 },
  '83o': { action: 'FOLD', frequency: 84.9 },
  '82o': { action: 'FOLD', frequency: 84.9 },
  '76o': { action: 'FOLD', frequency: 84.9 },
  '75o': { action: 'FOLD', frequency: 84.9 },
  '74o': { action: 'FOLD', frequency: 84.9 },
  '73o': { action: 'FOLD', frequency: 84.9 },
  '72o': { action: 'FOLD', frequency: 84.9 },
  '65o': { action: 'FOLD', frequency: 84.9 },
  '64o': { action: 'FOLD', frequency: 84.9 },
  '63o': { action: 'FOLD', frequency: 84.9 },
  '62o': { action: 'FOLD', frequency: 84.9 },
  '54o': { action: 'FOLD', frequency: 84.9 },
  '53o': { action: 'FOLD', frequency: 84.9 },
  '52o': { action: 'FOLD', frequency: 84.9 },
  '43o': { action: 'FOLD', frequency: 84.9 },
  '42o': { action: 'FOLD', frequency: 84.9 },
  '32o': { action: 'FOLD', frequency: 84.9 },
  
  // ポケットペア（フォールド）
  '44': { action: 'FOLD', frequency: 84.9 },
  '33': { action: 'FOLD', frequency: 84.9 },
  '22': { action: 'FOLD', frequency: 84.9 }
};

// 15BB MTT戦略 - BTNポジション (画像データに基づく)
export const btn15bbRange: Record<string, HandInfo> = {
  // ALL IN (19.2%) - プレミアムハンド
  'AA': { action: 'ALL_IN', frequency: 19.2 },
  'KK': { action: 'ALL_IN', frequency: 19.2 },
  'QQ': { action: 'ALL_IN', frequency: 19.2 },
  'JJ': { action: 'ALL_IN', frequency: 19.2 },
  'TT': { action: 'ALL_IN', frequency: 19.2 },
  '99': { action: 'ALL_IN', frequency: 19.2 },
  '88': { action: 'ALL_IN', frequency: 19.2 },
  '77': { action: 'ALL_IN', frequency: 19.2 },
  '66': { action: 'ALL_IN', frequency: 19.2 },
  '55': { action: 'ALL_IN', frequency: 19.2 },
  '44': { action: 'ALL_IN', frequency: 19.2 },
  '33': { action: 'ALL_IN', frequency: 19.2 },
  '22': { action: 'ALL_IN', frequency: 19.2 },
  
  // エース系（ALL IN）
  'AKs': { action: 'ALL_IN', frequency: 19.2 },
  'AQs': { action: 'ALL_IN', frequency: 19.2 },
  'AJs': { action: 'ALL_IN', frequency: 19.2 },
  'ATs': { action: 'ALL_IN', frequency: 19.2 },
  'A9s': { action: 'ALL_IN', frequency: 19.2 },
  'A8s': { action: 'ALL_IN', frequency: 19.2 },
  'A7s': { action: 'ALL_IN', frequency: 19.2 },
  'A6s': { action: 'ALL_IN', frequency: 19.2 },
  'A5s': { action: 'ALL_IN', frequency: 19.2 },
  'A4s': { action: 'ALL_IN', frequency: 19.2 },
  'A3s': { action: 'ALL_IN', frequency: 19.2 },
  'A2s': { action: 'ALL_IN', frequency: 19.2 },
  
  'AKo': { action: 'ALL_IN', frequency: 19.2 },
  'AQo': { action: 'ALL_IN', frequency: 19.2 },
  'AJo': { action: 'ALL_IN', frequency: 19.2 },
  'ATo': { action: 'ALL_IN', frequency: 19.2 },
  'A9o': { action: 'ALL_IN', frequency: 19.2 },
  
  // キング系（ALL IN）
  'KQs': { action: 'ALL_IN', frequency: 19.2 },
  'KJs': { action: 'ALL_IN', frequency: 19.2 },
  'KTs': { action: 'ALL_IN', frequency: 19.2 },
  'K9s': { action: 'ALL_IN', frequency: 19.2 },
  'K8s': { action: 'ALL_IN', frequency: 19.2 },
  'K7s': { action: 'ALL_IN', frequency: 19.2 },
  'K6s': { action: 'ALL_IN', frequency: 19.2 },
  'K5s': { action: 'ALL_IN', frequency: 19.2 },
  'K4s': { action: 'ALL_IN', frequency: 19.2 },
  'K3s': { action: 'ALL_IN', frequency: 19.2 },
  'K2s': { action: 'ALL_IN', frequency: 19.2 },
  
  'KQo': { action: 'ALL_IN', frequency: 19.2 },
  'KJo': { action: 'ALL_IN', frequency: 19.2 },
  'KTo': { action: 'ALL_IN', frequency: 19.2 },
  'K9o': { action: 'ALL_IN', frequency: 19.2 },
  
  // クイーン系（ALL IN）
  'QJs': { action: 'ALL_IN', frequency: 19.2 },
  'QTs': { action: 'ALL_IN', frequency: 19.2 },
  'Q9s': { action: 'ALL_IN', frequency: 19.2 },
  'Q8s': { action: 'ALL_IN', frequency: 19.2 },
  'Q7s': { action: 'ALL_IN', frequency: 19.2 },
  'Q6s': { action: 'ALL_IN', frequency: 19.2 },
  'Q5s': { action: 'ALL_IN', frequency: 19.2 },
  'Q4s': { action: 'ALL_IN', frequency: 19.2 },
  'Q3s': { action: 'ALL_IN', frequency: 19.2 },
  'Q2s': { action: 'ALL_IN', frequency: 19.2 },
  
  'QJo': { action: 'ALL_IN', frequency: 19.2 },
  'QTo': { action: 'ALL_IN', frequency: 19.2 },
  'Q9o': { action: 'ALL_IN', frequency: 19.2 },
  
  // CALL (26.2%) - ミドルレンジハンド
  'A8o': { action: 'CALL', frequency: 26.2 },
  'A7o': { action: 'CALL', frequency: 26.2 },
  'A6o': { action: 'CALL', frequency: 26.2 },
  'A5o': { action: 'CALL', frequency: 26.2 },
  'A4o': { action: 'CALL', frequency: 26.2 },
  'A3o': { action: 'CALL', frequency: 26.2 },
  'A2o': { action: 'CALL', frequency: 26.2 },
  'K8o': { action: 'CALL', frequency: 26.2 },
  'K7o': { action: 'CALL', frequency: 26.2 },
  'K6o': { action: 'CALL', frequency: 26.2 },
  'K5o': { action: 'CALL', frequency: 26.2 },
  'K4o': { action: 'CALL', frequency: 26.2 },
  'K3o': { action: 'CALL', frequency: 26.2 },
  'K2o': { action: 'CALL', frequency: 26.2 },
  'Q8o': { action: 'CALL', frequency: 26.2 },
  'Q7o': { action: 'CALL', frequency: 26.2 },
  'Q6o': { action: 'CALL', frequency: 26.2 },
  'Q5o': { action: 'CALL', frequency: 26.2 },
  'Q4o': { action: 'CALL', frequency: 26.2 },
  'Q3o': { action: 'CALL', frequency: 26.2 },
  'Q2o': { action: 'CALL', frequency: 26.2 },
  
  // ジャック系以下（ALL IN継続）
  'JTs': { action: 'ALL_IN', frequency: 19.2 },
  'J9s': { action: 'ALL_IN', frequency: 19.2 },
  'J8s': { action: 'ALL_IN', frequency: 19.2 },
  'J7s': { action: 'ALL_IN', frequency: 19.2 },
  'J6s': { action: 'CALL', frequency: 26.2 },
  'J5s': { action: 'CALL', frequency: 26.2 },
  'J4s': { action: 'CALL', frequency: 26.2 },
  'J3s': { action: 'CALL', frequency: 26.2 },
  'J2s': { action: 'CALL', frequency: 26.2 },
  
  'JTo': { action: 'ALL_IN', frequency: 19.2 },
  'J9o': { action: 'CALL', frequency: 26.2 },
  'J8o': { action: 'CALL', frequency: 26.2 },
  'J7o': { action: 'CALL', frequency: 26.2 },
  'J6o': { action: 'CALL', frequency: 26.2 },
  'J5o': { action: 'CALL', frequency: 26.2 },
  'J4o': { action: 'CALL', frequency: 26.2 },
  'J3o': { action: 'CALL', frequency: 26.2 },
  'J2o': { action: 'CALL', frequency: 26.2 },
  
  // 10系以下
  'T9s': { action: 'ALL_IN', frequency: 19.2 },
  'T8s': { action: 'ALL_IN', frequency: 19.2 },
  'T7s': { action: 'CALL', frequency: 26.2 },
  'T6s': { action: 'CALL', frequency: 26.2 },
  'T5s': { action: 'CALL', frequency: 26.2 },
  'T4s': { action: 'CALL', frequency: 26.2 },
  'T3s': { action: 'CALL', frequency: 26.2 },
  'T2s': { action: 'CALL', frequency: 26.2 },
  
  'T9o': { action: 'CALL', frequency: 26.2 },
  'T8o': { action: 'CALL', frequency: 26.2 },
  'T7o': { action: 'CALL', frequency: 26.2 },
  'T6o': { action: 'CALL', frequency: 26.2 },
  'T5o': { action: 'CALL', frequency: 26.2 },
  'T4o': { action: 'CALL', frequency: 26.2 },
  'T3o': { action: 'CALL', frequency: 26.2 },
  'T2o': { action: 'CALL', frequency: 26.2 },
  
  '98s': { action: 'ALL_IN', frequency: 19.2 },
  '97s': { action: 'CALL', frequency: 26.2 },
  '96s': { action: 'CALL', frequency: 26.2 },
  '95s': { action: 'CALL', frequency: 26.2 },
  '94s': { action: 'CALL', frequency: 26.2 },
  '93s': { action: 'CALL', frequency: 26.2 },
  '92s': { action: 'CALL', frequency: 26.2 },
  
  '98o': { action: 'CALL', frequency: 26.2 },
  '97o': { action: 'CALL', frequency: 26.2 },
  '96o': { action: 'CALL', frequency: 26.2 },
  '95o': { action: 'CALL', frequency: 26.2 },
  '94o': { action: 'FOLD', frequency: 54.6 },
  '93o': { action: 'FOLD', frequency: 54.6 },
  '92o': { action: 'FOLD', frequency: 54.6 },
  
  '87s': { action: 'ALL_IN', frequency: 19.2 },
  '86s': { action: 'CALL', frequency: 26.2 },
  '85s': { action: 'CALL', frequency: 26.2 },
  '84s': { action: 'CALL', frequency: 26.2 },
  '83s': { action: 'CALL', frequency: 26.2 },
  '82s': { action: 'CALL', frequency: 26.2 },
  
  '87o': { action: 'CALL', frequency: 26.2 },
  '86o': { action: 'CALL', frequency: 26.2 },
  '85o': { action: 'CALL', frequency: 26.2 },
  '84o': { action: 'FOLD', frequency: 54.6 },
  '83o': { action: 'FOLD', frequency: 54.6 },
  '82o': { action: 'FOLD', frequency: 54.6 },
  
  // 残りのハンドはFOLD (54.6%)
  '76s': { action: 'CALL', frequency: 26.2 },
  '75s': { action: 'CALL', frequency: 26.2 },
  '74s': { action: 'FOLD', frequency: 54.6 },
  '73s': { action: 'FOLD', frequency: 54.6 },
  '72s': { action: 'FOLD', frequency: 54.6 },
  
  '76o': { action: 'CALL', frequency: 26.2 },
  '75o': { action: 'CALL', frequency: 26.2 },
  '74o': { action: 'FOLD', frequency: 54.6 },
  '73o': { action: 'FOLD', frequency: 54.6 },
  '72o': { action: 'FOLD', frequency: 54.6 },
  
  '65s': { action: 'CALL', frequency: 26.2 },
  '64s': { action: 'CALL', frequency: 26.2 },
  '63s': { action: 'FOLD', frequency: 54.6 },
  '62s': { action: 'FOLD', frequency: 54.6 },
  
  '65o': { action: 'CALL', frequency: 26.2 },
  '64o': { action: 'FOLD', frequency: 54.6 },
  '63o': { action: 'FOLD', frequency: 54.6 },
  '62o': { action: 'FOLD', frequency: 54.6 },
  
  '54s': { action: 'CALL', frequency: 26.2 },
  '53s': { action: 'CALL', frequency: 26.2 },
  '52s': { action: 'FOLD', frequency: 54.6 },
  
  '54o': { action: 'CALL', frequency: 26.2 },
  '53o': { action: 'FOLD', frequency: 54.6 },
  '52o': { action: 'FOLD', frequency: 54.6 },
  
  '43s': { action: 'CALL', frequency: 26.2 },
  '42s': { action: 'FOLD', frequency: 54.6 },
  
  '43o': { action: 'FOLD', frequency: 54.6 },
  '42o': { action: 'FOLD', frequency: 54.6 },
  
  '32s': { action: 'FOLD', frequency: 54.6 },
  '32o': { action: 'FOLD', frequency: 54.6 }
};

// 15BBレンジのマッピング
export const all15bbRanges: Record<string, Record<string, HandInfo>> = {
  'UTG': utg15bbRange,
  'UTG1': utg15bbRange, // まずはUTGと同じに設定
  'LJ': utg15bbRange,
  'HJ': btn15bbRange,
  'CO': btn15bbRange,
  'BTN': btn15bbRange,
  'SB': btn15bbRange,
  'BB': btn15bbRange
}; 

// MTTレンジエディターコンポーネント
export const MTTRangeEditor: React.FC<{
  position: string;
  stackSize: number;
  onSaveRange: (position: string, rangeData: Record<string, HandInfo>) => void;
  onClose: () => void;
  initialRange?: Record<string, HandInfo>;
}> = ({ position, stackSize, onSaveRange, onClose, initialRange }) => {
  const [selectedAction, setSelectedAction] = useState<'MIN' | 'ALL_IN' | 'CALL' | 'FOLD' | 'CLEAR'>('MIN');
  const [rangeData, setRangeData] = useState<Record<string, HandInfo>>(initialRange || {});
  const [isDragging, setIsDragging] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<{ row: number; col: number } | null>(null);
  const [hasDragged, setHasDragged] = useState(false);
  const [showFrequencyModal, setShowFrequencyModal] = useState(false);
  const [editingHand, setEditingHand] = useState<string>('');

  // グリッドを生成
  const generateGrid = () => {
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    const grid = [];
    
    for (let i = 0; i < 13; i++) {
      const row = [];
      for (let j = 0; j < 13; j++) {
        let hand = '';
        if (i === j) {
          hand = ranks[i] + ranks[j];
        } else if (i < j) {
          hand = ranks[i] + ranks[j] + 's';
        } else {
          hand = ranks[j] + ranks[i] + 'o';
        }
        row.push({ hand, row: i, col: j });
      }
      grid.push(row);
    }
    return grid;
  };

  const grid = generateGrid();

  // 混合戦略の頻度を取得
  const getHandFrequencies = (hand: string) => {
    const handInfo = rangeData[hand];
    if (handInfo?.mixedFrequencies) {
      return {
        MIN: handInfo.mixedFrequencies.MIN || 0,
        ALL_IN: handInfo.mixedFrequencies.ALL_IN || 0,
        CALL: handInfo.mixedFrequencies.CALL || 0,
        FOLD: handInfo.mixedFrequencies.FOLD || 0
      };
    }
    // シンプルな戦略の場合はそのアクションを100%に設定
    if (handInfo) {
      return {
        MIN: handInfo.action === 'MIN' ? 100 : 0,
        ALL_IN: handInfo.action === 'ALL_IN' ? 100 : 0,
        CALL: handInfo.action === 'CALL' ? 100 : 0,
        FOLD: handInfo.action === 'FOLD' ? 100 : 0
      };
    }
    return { MIN: 0, ALL_IN: 0, CALL: 0, FOLD: 100 };
  };

  // 混合戦略の背景色とスタイルを取得（頻度比率で色をミックス）
  const getHandBackgroundStyle = (hand: string) => {
    // NONEアクションの特別処理
    if (rangeData[hand]?.action === 'NONE') {
      return { 
        background: 'rgb(156, 163, 175)', // gray-400
        border: '1px solid rgb(107, 114, 128)' // gray-500
      };
    }
    
    const frequencies = getHandFrequencies(hand);
    const actions = [
      { key: 'MIN', color: getActionColorHex('MIN'), value: frequencies.MIN },
      { key: 'ALL_IN', color: getActionColorHex('ALL_IN'), value: frequencies.ALL_IN },
      { key: 'CALL', color: getActionColorHex('CALL'), value: frequencies.CALL },
      { key: 'FOLD', color: getActionColorHex('FOLD'), value: frequencies.FOLD }
    ];
    const nonZeroActions = actions.filter(a => a.value > 0);
    const totalNonFold = frequencies.MIN + frequencies.ALL_IN + frequencies.CALL;

    // フォールド100%
    if (totalNonFold === 0) {
      return { background: 'rgb(31, 41, 55)' };
    }
    // 単一アクション100%
    if (nonZeroActions.length === 1 && nonZeroActions[0].value === 100) {
      return { background: nonZeroActions[0].color };
    }
    // 混合戦略（2つ以上のアクションが0%超）
    if (nonZeroActions.length >= 2) {
      let gradientStops = [];
      let currentPosition = 0;
      
      // アクションごとの色セグメントを作成（より美しいグラデーション）
      if (frequencies.CALL > 0) {
        const callColor = getActionColorHex('CALL');
        gradientStops.push(`${callColor} ${currentPosition}% ${currentPosition + frequencies.CALL}%`);
        currentPosition += frequencies.CALL;
      }
      
      if (frequencies.FOLD > 0) {
        const foldColor = getActionColorHex('FOLD');
        gradientStops.push(`${foldColor} ${currentPosition}% ${currentPosition + frequencies.FOLD}%`);
        currentPosition += frequencies.FOLD;
      }
      
      if (frequencies.MIN > 0) {
        const minColor = getActionColorHex('MIN');
        gradientStops.push(`${minColor} ${currentPosition}% ${currentPosition + frequencies.MIN}%`);
        currentPosition += frequencies.MIN;
      }
      
      if (frequencies.ALL_IN > 0) {
        const allInColor = getActionColorHex('ALL_IN');
        gradientStops.push(`${allInColor} ${currentPosition}% ${currentPosition + frequencies.ALL_IN}%`);
        currentPosition += frequencies.ALL_IN;
      }
      
      // FOLD部分（薄いグレーで表示）
      if (frequencies.FOLD > 0) {
        gradientStops.push(`rgba(75, 85, 99, 0.3) ${currentPosition}% 100%`);
      }
      
      const gradientStyle = `linear-gradient(90deg, ${gradientStops.join(', ')})`;
      
      return {
        background: gradientStyle,
        border: '1px solid rgb(75, 85, 99)',
        boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat'
      };
    }
    
    return {
      background: 'rgb(31, 41, 55)',
      border: '1px solid rgb(75, 85, 99)'
    };
  };

  // 色を取得する関数（混合戦略対応）
  const getHandColor = (hand: string, row: number, col: number) => {
    // ドラッグ中の選択範囲をハイライト
    if (isDragging && selectionStart && currentSelection) {
      const minRow = Math.min(selectionStart.row, currentSelection.row);
      const maxRow = Math.max(selectionStart.row, currentSelection.row);
      const minCol = Math.min(selectionStart.col, currentSelection.col);
      const maxCol = Math.max(selectionStart.col, currentSelection.col);
      
      if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
        return 'ring-2 ring-yellow-400 ring-inset';
      }
    }
    
    // 混合戦略の場合は特別な境界線を追加
    const frequencies = getHandFrequencies(hand);
    const activeActions = Object.values(frequencies).filter(freq => freq > 0);
    const isMixedStrategy = activeActions.length > 1;
    
    let baseClasses = 'hover:scale-105 transition-transform duration-150';
    
    if (isMixedStrategy) {
      baseClasses += ' ring-1 ring-purple-400 ring-opacity-60';
    }
    
    return baseClasses;
  };

  // アクション別の色を取得
  const getActionColor = (action: string) => {
    switch (action) {
      case 'MIN': return 'bg-blue-500 hover:bg-blue-600';
      case 'ALL_IN': return 'bg-red-500 hover:bg-red-600';
      case 'CALL': return 'bg-yellow-500 hover:bg-yellow-600';
      case 'FOLD': return 'bg-gray-600 hover:bg-gray-700';
      case 'NONE': return 'bg-gray-400 hover:bg-gray-500';
      default: return 'bg-gray-800 hover:bg-gray-700';
    }
  };

  // Tailwind用の色クラス
  const getActionColorTailwind = (action: string) => {
    switch (action) {
      case 'MIN': return 'blue-500';
      case 'ALL_IN': return 'red-500';
      case 'CALL': return 'yellow-500';
      default: return 'gray-600';
    }
  };

  // Hex色を取得
  const getActionColorHex = (action: string) => {
    switch (action) {
      case 'MIN': return '#3b82f6';
      case 'ALL_IN': return '#ef4444';
      case 'CALL': return '#eab308';
      default: return '#6b7280';
    }
  };

  // ハンドセルの表示テキストを取得（頻度情報付き）
  const getHandDisplayText = (hand: string) => {
    // NONEアクションの特別処理
    if (rangeData[hand]?.action === 'NONE') {
      return (
        <div className="text-center">
          <div className="text-xs font-bold leading-tight text-gray-400">{hand}</div>
          <div className="text-[7px] leading-none text-gray-500 font-semibold">
            NONE
          </div>
        </div>
      );
    }
    
    const frequencies = getHandFrequencies(hand);
    const activeActions = [
      { name: 'CALL', freq: frequencies.CALL, symbol: 'C', color: 'text-yellow-200' },
      { name: 'FOLD', freq: frequencies.FOLD, symbol: 'F', color: 'text-gray-300' },
      { name: 'MIN', freq: frequencies.MIN, symbol: 'M', color: 'text-blue-200' },
      { name: 'ALL_IN', freq: frequencies.ALL_IN, symbol: 'A', color: 'text-red-200' }
    ].filter(action => action.freq > 0);

    if (activeActions.length === 1 && activeActions[0].freq === 100) {
      // 単一アクション100%の場合は通常表示
      return hand;
    } else if (activeActions.length > 0) {
      // 混合戦略 - 複数の頻度を表示（色分け付き）
      const topTwo = activeActions
        .sort((a, b) => b.freq - a.freq)
        .slice(0, 2); // 上位2つまで表示
      
      return (
        <div className="text-center">
          <div className="text-xs font-bold leading-tight text-white">{hand}</div>
          <div className="text-[7px] leading-none space-y-0">
            {topTwo.map((action) => (
              <div key={action.name} className={`font-semibold ${action.color}`}>
                {action.symbol}{action.freq}%
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    return hand;
  };

  // 右クリックで頻度設定モーダルを開く
  const handleRightClick = (e: React.MouseEvent, hand: string) => {
    e.preventDefault();
    setEditingHand(hand);
    setShowFrequencyModal(true);
  };

  // 頻度設定を保存
  const handleFrequencySave = (frequencies: { MIN: number; ALL_IN: number; CALL: number; FOLD: number }) => {
    const hasNonFoldAction = frequencies.MIN > 0 || frequencies.ALL_IN > 0 || frequencies.CALL > 0;
    
    if (hasNonFoldAction) {
      // 混合戦略として保存
      setRangeData(prev => ({
        ...prev,
        [editingHand]: { 
          action: 'MIXED', 
          frequency: 100,
          mixedFrequencies: frequencies
        }
      }));
    } else {
      // フォールド100%
      setRangeData(prev => ({
        ...prev,
        [editingHand]: { action: 'FOLD', frequency: 100 }
      }));
    }
  };

  // マウスダウン（ドラッグ開始）
  const handleMouseDown = (row: number, col: number) => {
    setIsDragging(true);
    setSelectionStart({ row, col });
    setCurrentSelection({ row, col });
    setHasDragged(false);
  };

  // マウスエンター（ドラッグ中）
  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && selectionStart) {
      if (row !== selectionStart.row || col !== selectionStart.col) {
        setHasDragged(true);
      }
      setCurrentSelection({ row, col });
    }
  };

  // マウスアップ（ドラッグ終了またはクリック）
  const handleMouseUp = () => {
    if (!isDragging || !selectionStart || !currentSelection) {
      setIsDragging(false);
      setHasDragged(false);
      return;
    }

    if (!hasDragged) {
      // 単一クリック
      const cell = grid[selectionStart.row][selectionStart.col];
      if (cell) {
        if (selectedAction === 'CLEAR') {
          // 解除：rangeDataからハンドを削除
          setRangeData(prev => {
            const newData = { ...prev };
            delete newData[cell.hand];
            return newData;
          });
        } else if (rangeData[cell.hand] && rangeData[cell.hand].action === selectedAction) {
          // 同じアクションをクリックした場合は解除
          setRangeData(prev => {
            const newData = { ...prev };
            delete newData[cell.hand];
            return newData;
          });
        } else {
          // 新しいアクションを設定
          setRangeData(prev => ({
            ...prev,
            [cell.hand]: { action: selectedAction as 'MIN' | 'ALL_IN' | 'CALL' | 'FOLD' | 'NONE', frequency: 100 }
          }));
        }
      }
    } else {
      // 範囲選択
      const minRow = Math.min(selectionStart.row, currentSelection.row);
      const maxRow = Math.max(selectionStart.row, currentSelection.row);
      const minCol = Math.min(selectionStart.col, currentSelection.col);
      const maxCol = Math.max(selectionStart.col, currentSelection.col);
      
      if (selectedAction === 'CLEAR') {
        // 範囲解除：選択範囲のハンドをrangeDataから削除
        setRangeData(prev => {
          const newData = { ...prev };
          for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              if (grid[r] && grid[r][c]) {
                delete newData[grid[r][c].hand];
              }
            }
          }
          return newData;
        });
      } else {
        // 範囲設定（トグル機能付き）
        const updates: Record<string, HandInfo> = {};
        const toDelete: string[] = [];
        
        for (let r = minRow; r <= maxRow; r++) {
          for (let c = minCol; c <= maxCol; c++) {
            if (grid[r] && grid[r][c]) {
              const hand = grid[r][c].hand;
              const currentHandInfo = rangeData[hand];
              
              // 既に同じアクションが設定されている場合は解除（削除）
              if (currentHandInfo && currentHandInfo.action === selectedAction) {
                toDelete.push(hand);
              } else {
                // 新しいアクションを設定または異なるアクションで上書き
                updates[hand] = { action: selectedAction as 'MIN' | 'ALL_IN' | 'CALL' | 'FOLD' | 'NONE', frequency: 100 };
              }
            }
          }
        }
        
        setRangeData(prev => {
          const newData = { ...prev, ...updates };
          // 削除対象のハンドを削除
          toDelete.forEach(hand => {
            delete newData[hand];
          });
          return newData;
        });
      }
    }
    
    setIsDragging(false);
    setSelectionStart(null);
    setCurrentSelection(null);
    setHasDragged(false);
  };

  // 統計を計算（頻度考慮）
  const getStats = () => {
    const total = 169; // 全ハンド数
    const actions = { MIN: 0, ALL_IN: 0, CALL: 0, FOLD: 0, NONE: 0 };
    let totalWeightedPercentage = 0;
    
    grid.flat().forEach(cell => {
      const handInfo = rangeData[cell.hand];
      
      if (handInfo?.action === 'MIXED' && handInfo.mixedFrequencies) {
        // 混合戦略の場合、各アクションの頻度をパーセンテージとして加算
        const freq = handInfo.mixedFrequencies;
        actions.MIN += (freq.MIN || 0);
        actions.ALL_IN += (freq.ALL_IN || 0);
        actions.CALL += (freq.CALL || 0);
        actions.FOLD += (freq.FOLD || 0);
        totalWeightedPercentage += 100; // 各ハンドは100%としてカウント
      } else if (handInfo) {
        // 単一アクションの場合
        const frequency = handInfo.frequency || 100;
        
        switch (handInfo.action) {
          case 'MIN':
          case 'RAISE':
          case '3BB':
            actions.MIN += frequency;
            break;
          case 'ALL_IN':
            actions.ALL_IN += frequency;
            break;
          case 'CALL':
            actions.CALL += frequency;
            break;
          case 'FOLD':
            actions.FOLD += frequency;
            break;
          case 'NONE':
            actions.NONE += frequency;
            break;
        }
        totalWeightedPercentage += 100;
      } else {
        // 設定されていないハンドはFOLDとして扱う
        actions.FOLD += 100;
        totalWeightedPercentage += 100;
      }
    });
    
    return {
      ...actions,
      totalSet: actions.MIN + actions.ALL_IN + actions.CALL,
      percentage: {
        MIN: totalWeightedPercentage > 0 ? ((actions.MIN / totalWeightedPercentage) * 100).toFixed(1) : '0.0',
        ALL_IN: totalWeightedPercentage > 0 ? ((actions.ALL_IN / totalWeightedPercentage) * 100).toFixed(1) : '0.0',
        CALL: totalWeightedPercentage > 0 ? ((actions.CALL / totalWeightedPercentage) * 100).toFixed(1) : '0.0',
        FOLD: totalWeightedPercentage > 0 ? ((actions.FOLD / totalWeightedPercentage) * 100).toFixed(1) : '0.0',
        NONE: totalWeightedPercentage > 0 ? ((actions.NONE / totalWeightedPercentage) * 100).toFixed(1) : '0.0'
      }
    };
  };

  const stats = getStats();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-3 md:p-6 max-w-6xl w-full mx-2 md:mx-4 max-h-[98vh] md:max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-700">
        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
          <h2 className="text-base md:text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent leading-tight">
            {position.startsWith('vsopen_') ? (
              (() => {
                const parts = position.split('_');
                return `MTTレンジエディター - vsopen（ヒーロー: ${parts[1]} ／ オープンレイザー: ${parts[3]} ／ スタック: ${stackSize}BB）`;
              })()
            ) : (
              `MTTレンジエディター - ${position} (${stackSize}BB)`
            )}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-lg transition-all duration-200 self-end md:self-auto"
          >
            ✕
          </button>
        </div>
        
        {/* アクション選択 */}
        <div className="mb-4 bg-gray-800 rounded-lg p-3 md:p-4 border border-gray-600">
          <h3 className="text-xs md:text-sm font-semibold text-white mb-3">クイック設定（左クリック/ドラッグ）：</h3>
          <div className="grid grid-cols-3 md:flex md:gap-3 md:flex-wrap gap-2">
            {[
              { action: 'MIN', label: 'レイズ', shortLabel: 'RAISE', color: 'bg-blue-500' },
              { action: 'ALL_IN', label: 'オールイン', shortLabel: 'ALL IN', color: 'bg-red-500' },
              { action: 'CALL', label: 'コール', shortLabel: 'CALL', color: 'bg-yellow-500' },
              { action: 'FOLD', label: 'フォールド', shortLabel: 'FOLD', color: 'bg-gray-600' },
              { action: 'NONE', label: 'NONE', shortLabel: 'NONE', color: 'bg-gray-400' },
              { action: 'CLEAR', label: '解除', shortLabel: 'CLEAR', color: 'bg-gray-700' }
            ].map(({ action, label, shortLabel, color }) => (
              <button
                key={action}
                onClick={() => setSelectedAction(action as any)}
                className={`px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 border-2 ${
                  selectedAction === action 
                    ? `${color} text-white border-white shadow-lg scale-105` 
                    : `${color} text-white border-transparent opacity-70 hover:opacity-100`
                }`}
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{shortLabel}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            💡 <strong>右クリック</strong>で詳細な頻度設定（例：RAISE 60%, FOLD 40%）
          </p>
        </div>

        {/* 統計 */}
        <div className="mb-4 bg-gray-800 rounded-lg p-3 md:p-4 border border-gray-600">
          <h3 className="text-xs md:text-sm font-semibold text-white mb-3">統計（頻度考慮）:</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3 text-xs md:text-sm">
            <div className="bg-yellow-500 bg-opacity-20 border border-yellow-500 rounded p-1.5 md:p-2 text-center">
              <div className="text-yellow-300 font-semibold text-xs">CALL</div>
              <div className="text-white text-xs md:text-sm">{stats.percentage.CALL}%</div>
            </div>
            <div className="bg-gray-600 bg-opacity-20 border border-gray-600 rounded p-1.5 md:p-2 text-center">
              <div className="text-gray-300 font-semibold text-xs">FOLD</div>
              <div className="text-white text-xs md:text-sm">{stats.percentage.FOLD}%</div>
            </div>
            <div className="bg-blue-500 bg-opacity-20 border border-blue-500 rounded p-1.5 md:p-2 text-center">
              <div className="text-blue-300 font-semibold text-xs">RAISE</div>
              <div className="text-white text-xs md:text-sm">{stats.percentage.MIN}%</div>
            </div>
            <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded p-1.5 md:p-2 text-center">
              <div className="text-red-300 font-semibold text-xs">ALL IN</div>
              <div className="text-white text-xs md:text-sm">{stats.percentage.ALL_IN}%</div>
            </div>
            <div className="bg-gray-400 bg-opacity-20 border border-gray-400 rounded p-1.5 md:p-2 text-center">
              <div className="text-gray-300 font-semibold text-xs">NONE</div>
              <div className="text-white text-xs md:text-sm">{stats.percentage.NONE}%</div>
            </div>
          </div>
        </div>
        
        {/* グリッド */}
        <div 
          className="grid grid-cols-13 gap-0.5 md:gap-1 mb-4 select-none overflow-x-auto"
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setIsDragging(false);
            setHasDragged(false);
          }}
        >
          {grid.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  ${getHandColor(cell.hand, rowIndex, colIndex)} 
                  text-white text-[10px] md:text-xs font-bold py-0.5 md:py-1 px-0.5 md:px-1 text-center cursor-pointer 
                  rounded transition-all duration-200
                  hover:shadow-md min-h-[1.5rem] md:min-h-[2rem] flex items-center justify-center
                `}
                style={getHandBackgroundStyle(cell.hand)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                onContextMenu={(e) => handleRightClick(e, cell.hand)}
                title={`${cell.hand} - 右クリックで詳細設定`}
              >
                {getHandDisplayText(cell.hand)}
              </div>
            ))
          )}
        </div>

        {/* コントロールボタン */}
        <div className="flex flex-col md:flex-row gap-3 justify-between">
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={() => setRangeData({})}
              className="px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base font-semibold rounded-lg transition-all duration-200"
            >
              全クリア
            </button>
            <button
              onClick={() => {
                const allFold: Record<string, HandInfo> = {};
                grid.flat().forEach(cell => {
                  allFold[cell.hand] = { action: 'FOLD', frequency: 100 };
                });
                setRangeData(allFold);
              }}
              className="px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base font-semibold rounded-lg transition-all duration-200"
            >
              全フォールド
            </button>
          </div>
          
          <div className="flex gap-2 md:gap-3">
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm md:text-base font-semibold rounded-lg transition-all duration-200"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onSaveRange(position, rangeData);
                onClose();
              }}
              className="px-4 md:px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm md:text-base font-bold rounded-lg transition-all duration-200 shadow-lg"
            >
              保存 ✓
            </button>
          </div>
        </div>

        {/* 使い方ガイド */}
        <div className="mt-4 bg-gray-800 rounded-lg p-3 border border-gray-600">
          <h4 className="text-xs md:text-sm font-semibold text-white mb-2">使い方：</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• <strong>左クリック/ドラッグ：</strong> 選択したアクションを設定</li>
            <li>• <strong>解除ボタン + クリック/ドラッグ：</strong> ハンドの設定を削除</li>
            <li>• <strong>同じアクションを再クリック：</strong> そのハンドを解除</li>
            <li>• <strong>右クリック：</strong> 詳細な頻度設定（例：RAISE 60%, FOLD 40%）</li>
            <li>• <strong>混合戦略の色分け：</strong> 複数アクションが設定されたハンドは横方向のグラデーションで表示</li>
            <li>• <strong>色の意味：</strong> 青=RAISE、赤=ALL_IN、黄=コール、グレー=フォールド</li>
            <li>• <strong>混合戦略の識別：</strong> 紫の境界線と小さな%表示で混合戦略を識別</li>
            <li>• 統計は頻度を考慮した加重平均で表示</li>
          </ul>
        </div>

        {/* 頻度設定モーダル */}
        {showFrequencyModal && (
          <FrequencyModal
            hand={editingHand}
            initialFrequencies={getHandFrequencies(editingHand)}
            onSave={handleFrequencySave}
            onClose={() => setShowFrequencyModal(false)}
            onSetNone={() => {
              setRangeData(prev => ({
                ...prev,
                [editingHand]: { action: 'NONE', frequency: 100 }
              }));
            }}
          />
        )}
      </div>
    </div>
  );
};

// 頻度設定モーダルコンポーネント
const FrequencyModal: React.FC<{
  hand: string;
  initialFrequencies: { MIN: number; ALL_IN: number; CALL: number; FOLD: number };
  onSave: (frequencies: { MIN: number; ALL_IN: number; CALL: number; FOLD: number }) => void;
  onClose: () => void;
  onSetNone?: () => void;
}> = ({ hand, initialFrequencies, onSave, onClose, onSetNone }) => {
  const [frequencies, setFrequencies] = useState(initialFrequencies);
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);

  // 頻度を更新する関数
  const updateFrequency = (action: string, value: number) => {
    const newFrequencies = { ...frequencies, [action]: value };
    
    // 他のアクションの合計を計算
    const otherTotal = Object.keys(newFrequencies)
      .filter(key => key !== action)
      .reduce((sum, key) => sum + newFrequencies[key as keyof typeof newFrequencies], 0);
    
    // 合計が100を超える場合は他のアクションを proportionally 調整
    if (otherTotal + value > 100) {
      const excess = otherTotal + value - 100;
      const adjustmentFactor = Math.max(0, otherTotal - excess) / otherTotal;
      
      Object.keys(newFrequencies).forEach(key => {
        if (key !== action) {
          newFrequencies[key as keyof typeof newFrequencies] = 
            Math.round(newFrequencies[key as keyof typeof newFrequencies] * adjustmentFactor);
        }
      });
    }
    
    setFrequencies(newFrequencies);
  };

  // 残りの頻度を計算
  const totalUsed = Object.values(frequencies).reduce((sum, val) => sum + val, 0);
  const remaining = 100 - totalUsed;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60]">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">
            {hand} の頻度設定
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* CALL */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-yellow-300 font-semibold">コール</label>
              <span className="text-white font-bold">{frequencies.CALL}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={frequencies.CALL}
              onChange={(e) => updateFrequency('CALL', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #eab308 0%, #eab308 ${frequencies.CALL}%, #374151 ${frequencies.CALL}%, #374151 100%)`
              }}
            />
          </div>

          {/* FOLD */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-300 font-semibold">フォールド</label>
              <span className="text-white font-bold">{frequencies.FOLD}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={frequencies.FOLD}
              onChange={(e) => updateFrequency('FOLD', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #6b7280 0%, #6b7280 ${frequencies.FOLD}%, #374151 ${frequencies.FOLD}%, #374151 100%)`
              }}
            />
          </div>

          {/* MIN */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-blue-300 font-semibold">レイズ</label>
              <span className="text-white font-bold">{frequencies.MIN}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={frequencies.MIN}
              onChange={(e) => updateFrequency('MIN', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${frequencies.MIN}%, #374151 ${frequencies.MIN}%, #374151 100%)`
              }}
            />
          </div>

          {/* ALL_IN */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-red-300 font-semibold">オールイン</label>
              <span className="text-white font-bold">{frequencies.ALL_IN}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={frequencies.ALL_IN}
              onChange={(e) => updateFrequency('ALL_IN', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${frequencies.ALL_IN}%, #374151 ${frequencies.ALL_IN}%, #374151 100%)`
              }}
            />
          </div>

          {/* 合計表示 */}
          <div className="border-t border-gray-700 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">合計:</span>
              <span className={`font-bold ${totalUsed === 100 ? 'text-green-400' : totalUsed > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
                {totalUsed}%
              </span>
            </div>
            {remaining !== 0 && (
              <div className="text-xs text-gray-400 mt-1">
                {remaining > 0 ? `残り ${remaining}%` : `${Math.abs(remaining)}% 超過`}
              </div>
            )}
          </div>

          {/* クイック設定ボタン */}
          <div className="border-t border-gray-700 pt-4">
            <div className="text-sm text-gray-300 mb-3">クイック設定:</div>
            
            {/* 単一アクション */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => setFrequencies({ MIN: 0, ALL_IN: 0, CALL: 100, FOLD: 0 })}
                className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-all duration-200"
              >
                CALL 100%
              </button>
              <button
                onClick={() => setFrequencies({ MIN: 0, ALL_IN: 0, CALL: 0, FOLD: 100 })}
                className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700 transition-all duration-200"
              >
                FOLD 100%
              </button>
              <button
                onClick={() => setFrequencies({ MIN: 100, ALL_IN: 0, CALL: 0, FOLD: 0 })}
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-all duration-200"
              >
                RAISE 100%
              </button>
              <button
                onClick={() => setFrequencies({ MIN: 0, ALL_IN: 100, CALL: 0, FOLD: 0 })}
                className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-all duration-200"
              >
                ALL IN 100%
              </button>
            </div>
            
            {/* アコーディオンメニュー */}
            <div className="space-y-2">
              {/* RAISE/FOLD */}
              <div className="border border-gray-600 rounded-lg">
                <button
                  onClick={() => setAccordionOpen(accordionOpen === 'raise-fold' ? null : 'raise-fold')}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold flex justify-between items-center rounded-lg transition-all duration-200"
                >
                  <span>RAISE/FOLD</span>
                  <span className={`transform transition-transform duration-200 ${accordionOpen === 'raise-fold' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {accordionOpen === 'raise-fold' && (
                  <div className="p-3 bg-gray-900 border-t border-gray-600">
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 80, 70, 60, 50, 40, 30, 20, 10].map(raisePercent => (
                        <button
                          key={raisePercent}
                          onClick={() => setFrequencies({ MIN: raisePercent, ALL_IN: 0, CALL: 0, FOLD: 100 - raisePercent })}
                          className="px-2 py-1 bg-gradient-to-r from-blue-600 to-gray-600 text-white rounded text-xs hover:from-blue-700 hover:to-gray-700 transition-all duration-200"
                        >
                          {raisePercent}%/{100 - raisePercent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* RAISE/CALL */}
              <div className="border border-gray-600 rounded-lg">
                <button
                  onClick={() => setAccordionOpen(accordionOpen === 'raise-call' ? null : 'raise-call')}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold flex justify-between items-center rounded-lg transition-all duration-200"
                >
                  <span>RAISE/CALL</span>
                  <span className={`transform transition-transform duration-200 ${accordionOpen === 'raise-call' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {accordionOpen === 'raise-call' && (
                  <div className="p-3 bg-gray-900 border-t border-gray-600">
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 80, 70, 60, 50, 40, 30, 20, 10].map(raisePercent => (
                        <button
                          key={raisePercent}
                          onClick={() => setFrequencies({ MIN: raisePercent, ALL_IN: 0, CALL: 100 - raisePercent, FOLD: 0 })}
                          className="px-2 py-1 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded text-xs hover:from-blue-700 hover:to-green-700 transition-all duration-200"
                        >
                          {raisePercent}%/{100 - raisePercent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* CALL/FOLD */}
              <div className="border border-gray-600 rounded-lg">
                <button
                  onClick={() => setAccordionOpen(accordionOpen === 'call-fold' ? null : 'call-fold')}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold flex justify-between items-center rounded-lg transition-all duration-200"
                >
                  <span>CALL/FOLD</span>
                  <span className={`transform transition-transform duration-200 ${accordionOpen === 'call-fold' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {accordionOpen === 'call-fold' && (
                  <div className="p-3 bg-gray-900 border-t border-gray-600">
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 80, 70, 60, 50, 40, 30, 20, 10].map(callPercent => (
                        <button
                          key={callPercent}
                          onClick={() => setFrequencies({ MIN: 0, ALL_IN: 0, CALL: callPercent, FOLD: 100 - callPercent })}
                          className="px-2 py-1 bg-gradient-to-r from-green-600 to-gray-600 text-white rounded text-xs hover:from-green-700 hover:to-gray-700 transition-all duration-200"
                        >
                          {callPercent}%/{100 - callPercent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ALLIN/CALL */}
              <div className="border border-gray-600 rounded-lg">
                <button
                  onClick={() => setAccordionOpen(accordionOpen === 'allin-call' ? null : 'allin-call')}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold flex justify-between items-center rounded-lg transition-all duration-200"
                >
                  <span>ALLIN/CALL</span>
                  <span className={`transform transition-transform duration-200 ${accordionOpen === 'allin-call' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {accordionOpen === 'allin-call' && (
                  <div className="p-3 bg-gray-900 border-t border-gray-600">
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 80, 70, 60, 50, 40, 30, 20, 10].map(allinPercent => (
                        <button
                          key={allinPercent}
                          onClick={() => setFrequencies({ MIN: 0, ALL_IN: allinPercent, CALL: 100 - allinPercent, FOLD: 0 })}
                          className="px-2 py-1 bg-gradient-to-r from-red-600 to-green-600 text-white rounded text-xs hover:from-red-700 hover:to-green-700 transition-all duration-200"
                        >
                          {allinPercent}%/{100 - allinPercent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* ALLIN/FOLD */}
              <div className="border border-gray-600 rounded-lg">
                <button
                  onClick={() => setAccordionOpen(accordionOpen === 'allin-fold' ? null : 'allin-fold')}
                  className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold flex justify-between items-center rounded-lg transition-all duration-200"
                >
                  <span>ALLIN/FOLD</span>
                  <span className={`transform transition-transform duration-200 ${accordionOpen === 'allin-fold' ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {accordionOpen === 'allin-fold' && (
                  <div className="p-3 bg-gray-900 border-t border-gray-600">
                    <div className="grid grid-cols-3 gap-2">
                      {[90, 80, 70, 60, 50, 40, 30, 20, 10].map(allinPercent => (
                        <button
                          key={allinPercent}
                          onClick={() => setFrequencies({ MIN: 0, ALL_IN: allinPercent, CALL: 0, FOLD: 100 - allinPercent })}
                          className="px-2 py-1 bg-gradient-to-r from-red-600 to-gray-600 text-white rounded text-xs hover:from-red-700 hover:to-gray-700 transition-all duration-200"
                        >
                          {allinPercent}%/{100 - allinPercent}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              💡 ワンクリックで一般的な頻度比率を設定できます
            </div>
          </div>
        </div>

        {/* 保存ボタン */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
          >
            キャンセル
          </button>
          <button
            onClick={() => {
              onSave(frequencies);
              onClose();
            }}
            disabled={totalUsed !== 100}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold ${
              totalUsed === 100 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
          >
            保存 ✓
          </button>
        </div>
      </div>
    </div>
  );
};
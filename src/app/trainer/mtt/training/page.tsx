'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PokerTable, Spot } from '@/components/PokerTable';
import Link from 'next/link';
import { getMTTRange, MTTRangeEditor, HandInfo, HandRangeSelector } from '@/components/HandRange';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';

// ポーカーユーティリティ関数を直接定義

// ポジション順序の定義（UTGが最も早く、BBが最も遅い）
const POSITION_ORDER = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// ポジションのインデックスを取得する関数
const getPositionIndex = (position: string): number => {
  return POSITION_ORDER.indexOf(position);
};

// vs オープンで有効なオープンレイザーポジションを取得する関数
const getValidOpenerPositions = (heroPosition: string): string[] => {
  const heroIndex = getPositionIndex(heroPosition);
  if (heroIndex <= 0) return []; // UTGまたは無効なポジションの場合、前のポジションは存在しない
  
  return POSITION_ORDER.slice(0, heroIndex); // ヒーローより前のポジションのみ
};

// ポジション組み合わせが有効かチェックする関数
const isValidVsOpenCombination = (heroPosition: string, openerPosition: string): boolean => {
  const heroIndex = getPositionIndex(heroPosition);
  const openerIndex = getPositionIndex(openerPosition);
  
  // オープンレイザーがヒーローより前のポジションである必要がある
  return openerIndex < heroIndex && openerIndex >= 0 && heroIndex >= 0;
};

const generateRandomHand = (): string[] => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['s', 'h', 'd', 'c'];
  
  const cards: string[] = [];
  while (cards.length < 2) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const card = rank + suit;
    if (!cards.includes(card)) {
      cards.push(card);
    }
  }
  
  return cards;
};

const normalizeHandType = (hand: string[]): string => {
  if (!hand || hand.length !== 2) return 'XX';
  
  const rank1 = hand[0][0];
  const rank2 = hand[1][0];
  const suit1 = hand[0][1];
  const suit2 = hand[1][1];
  
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const rank1Index = ranks.indexOf(rank1);
  const rank2Index = ranks.indexOf(rank2);
  
  if (rank1 === rank2) {
    // ペア
    return rank1 + rank2;
  } else {
    // 異なるランク
    const higher = rank1Index > rank2Index ? rank1 : rank2;
    const lower = rank1Index > rank2Index ? rank2 : rank1;
    const suffix = suit1 === suit2 ? 's' : 'o';
    return higher + lower + suffix;
  }
};

// MTT特有のICMランドを生成するユーティリティ関数
const generateMTTHand = () => {
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const suits = ['s', 'h', 'd', 'c'];
  
  // 2枚のカードを選ぶ（重複なし）
  const cards: string[] = [];
  while (cards.length < 2) {
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const card = rank + suit;
    if (!cards.includes(card)) {
      cards.push(card);
    }
  }
  
  return cards;
};

// ハンド強度を数値で計算する関数
const getHandStrengthNumeric = (hand: string[]): number => {
  const handStr = normalizeHandType(hand);
  const card1 = hand[0];
  const card2 = hand[1];
  const rank1 = card1[0];
  const rank2 = card2[0];
  const suited = card1[1] === card2[1];
  
  // ランクの強度マッピング
  const rankValues: Record<string, number> = {
    'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
    '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
  };
  
  const val1 = rankValues[rank1] || 0;
  const val2 = rankValues[rank2] || 0;
  
  // ペアの場合
  if (rank1 === rank2) {
    return val1 + 5; // ペアボーナス
  } else {
    // エースハイの場合
    if (val1 === 14 || val2 === 14) {
      const otherCard = val1 === 14 ? val2 : val1;
      if (otherCard >= 10) return 10 + (suited ? 1 : 0); // AK, AQ, AJ, AT
      if (otherCard >= 7) return 8 + (suited ? 1 : 0);  // A9-A7
      return 6 + (suited ? 1 : 0); // A6以下
    }
    
    // キングハイの場合
    if (val1 === 13 || val2 === 13) {
      const otherCard = val1 === 13 ? val2 : val1;
      if (otherCard >= 10) return 8 + (suited ? 1 : 0); // KQ, KJ, KT
      return 5 + (suited ? 1 : 0);
    }
    
    // クイーンハイの場合
    if (val1 === 12 || val2 === 12) {
      const otherCard = val1 === 12 ? val2 : val1;
      if (otherCard >= 10) return 7 + (suited ? 1 : 0); // QJ, QT
      return 4 + (suited ? 1 : 0);
    }
    
    // ジャックハイの場合
    if (val1 === 11 || val2 === 11) {
      const otherCard = val1 === 11 ? val2 : val1;
      if (otherCard >= 10) return 6 + (suited ? 1 : 0); // JT
      return 3 + (suited ? 1 : 0);
    }
    
    // その他のブロードウェイコンボ
    if (val1 >= 10 && val2 >= 10) {
      return 5 + (suited ? 1 : 0);
    }
    
    // コネクター系
    if (Math.abs(val1 - val2) <= 1 && suited) {
      return Math.max(val1, val2) / 2 + 2;
    }
    
    // その他
    return Math.max(val1, val2) / 3;
  }
};

// MTT向けのGTOシミュレーション（簡略化：スタックサイズとポジションのみ考慮）
const simulateMTTGTOData = (
  hand: string[], 
  position: string, 
  stackSize: string, 
  actionType: string,
  customRanges?: Record<string, Record<string, HandInfo>>,
  openerPosition?: string
) => {
  // 手札のランク情報を取得
  const normalizedHandType = normalizeHandType(hand);
  const rankA = hand[0][0];
  const rankB = hand[1][0];
  const suited = hand[0][1] === hand[1][1];
  
  // 15BBスタック専用の戦略（GTOレンジに基づく）
  const stackDepthBB = parseInt(stackSize.replace('BB', ''));
  
  // 変数を関数のスコープで宣言
  let frequencies: { [action: string]: number } = {
    'FOLD': 0,
    'CALL': 0,
    'RAISE': 0,
    'ALL IN': 0
  };
  let gtoAction: string = 'FOLD';
  let evData: { [action: string]: number } = {
    'FOLD': 0,
    'CALL': -1.2,
    'RAISE': -1.5,
    'ALL IN': -2.0
  };
  
  // vs オープンの場合の特別処理
  if (actionType === 'vsopen' && openerPosition) {
    // ポジション組み合わせの検証
    if (!isValidVsOpenCombination(position, openerPosition)) {
      console.error('❌ 無効なvsオープン組み合わせ:', {
        heroPosition: position,
        openerPosition,
        validOpeners: getValidOpenerPositions(position),
        reason: 'オープンレイザーはヒーローより前のポジションである必要があります'
      });
      
      // 無効な組み合わせの場合はエラー情報を返す
      gtoAction = 'FOLD';
      frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL IN': 0 };
      evData = { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL IN': -5 };
      
      return {
        correctAction: gtoAction,
        evData: evData,
        frequencies: frequencies,
        normalizedHandType: normalizedHandType,
        effectiveStackExplanation: `❌ 無効なポジション組み合わせ: ${openerPosition} → ${position}`,
        stackSizeStrategy: `${position}ポジションに対して、${openerPosition}からのオープンは無効です。有効なオープンレイザー: ${getValidOpenerPositions(position).join(', ')}`,
        icmConsideration: 'vs オープンでは、オープンレイザーはヒーローより前のポジションである必要があります。',
        recommendedBetSize: 0,
        isInvalidCombination: true,
        errorMessage: `${openerPosition} から ${position} への vs オープンは不可能です。`,
        validOpeners: getValidOpenerPositions(position)
      };
    }
    
    // カスタムレンジが設定されている場合はそれを使用（スタックサイズを含めたキー）
    const rangeKey = `vsopen_${position}_vs_${openerPosition}_${stackSize}`;
    console.log('🔍 vs オープン分析:', {
      rangeKey,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      hasThisRange: !!(customRanges && customRanges[rangeKey]),
      hasThisHand: !!(customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]),
      availableRangeKeys: customRanges ? Object.keys(customRanges) : []
    });
    
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      const customHandData = customRanges[rangeKey][normalizedHandType];
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.mixedFrequencies) {
        // 混合戦略の場合 - vs オープン用の頻度分布を使用
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
  } else {
        // 単一アクションの場合
        customPrimaryAction = customHandData.action.replace('ALL_IN', 'ALL IN');
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
      }
      
      // カスタムレンジ用のEVデータを生成
      const customEvData = {
          'FOLD': 0,
        'CALL': customPrimaryAction === 'CALL' ? 0.8 : -1.0,
        'RAISE': customPrimaryAction === 'RAISE' ? 1.5 : -1.2,
        'ALL IN': customPrimaryAction === 'ALL IN' ? 2.8 : -2.0
      };
      
      console.log('🎯 カスタムレンジ使用:', {
        rangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const vsOpenAdvice = getVsOpenAdvice(position, openerPosition, customPrimaryAction, stackDepthBB);
      const currentOpenRaiseSize = openerPosition === 'BTN' && stackSize === '15BB' ? 1.0 : 2.5;
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: normalizedHandType,
        effectiveStackExplanation: `カスタムレンジ: ${openerPosition}からのオープンに対する${position}ポジションでの設定済み戦略です。`,
        stackSizeStrategy: vsOpenAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true,
        isCustomRange: true // カスタムレンジ使用を示すフラグ
      };
    }
    
    // カスタムレンジがない場合はデフォルト戦略を使用
    const vsOpenResult = getVsOpenStrategy(normalizedHandType, position, openerPosition, stackDepthBB);
    if (vsOpenResult) {
      gtoAction = vsOpenResult.primaryAction;
      frequencies = vsOpenResult.frequencies;
      evData = vsOpenResult.evData;
      
      const vsOpenAdvice = getVsOpenAdvice(position, openerPosition, gtoAction, stackDepthBB);
      
      // スタックサイズに応じたオープンレイズサイズ
      const currentOpenRaiseSize = openerPosition === 'BTN' && stackSize === '15BB' ? 1.0 : 2.0;
      
      return {
        correctAction: gtoAction,
        evData: evData,
        frequencies: frequencies,
        normalizedHandType: normalizedHandType,
        effectiveStackExplanation: `${openerPosition}からのオープンに対する${position}ポジションでの最適戦略です。`,
        stackSizeStrategy: vsOpenAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, gtoAction, position),
        recommendedBetSize: gtoAction === 'ALL IN' ? stackDepthBB : gtoAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true
      };
    }
  }
    
    // カスタムレンジがない場合はデフォルト戦略を使用
    const vsOpenResult = getVsOpenStrategy(normalizedHandType, position, openerPosition, stackDepthBB);
    if (vsOpenResult) {
      gtoAction = vsOpenResult.primaryAction;
      frequencies = vsOpenResult.frequencies;
      evData = vsOpenResult.evData;
      
      const vsOpenAdvice = getVsOpenAdvice(position, openerPosition, gtoAction, stackDepthBB);
      
      // スタックサイズに応じたオープンレイズサイズ
      const currentOpenRaiseSize = openerPosition === 'BTN' && stackSize === '15BB' ? 1.0 : 2.0;
      
      return {
        correctAction: gtoAction,
        evData: evData,
        frequencies: frequencies,
        normalizedHandType: normalizedHandType,
        effectiveStackExplanation: `${openerPosition}からのオープンに対する${position}ポジションでの最適戦略です。`,
        stackSizeStrategy: vsOpenAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, gtoAction, position),
        recommendedBetSize: gtoAction === 'ALL IN' ? stackDepthBB : gtoAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true
      };
    }
  }
  
  // 🎯 全スタックサイズ対応のカスタムレンジ戦略（20BB、25BB、30BBなど全対応）
  const stackRangeKey = `${position}_${stackSize}`;
  console.log('🔍 カスタムレンジ確認:', {
    position,
    stackSize,
    stackDepthBB,
    stackRangeKey,
    handType: normalizedHandType,
    hasCustomRanges: !!customRanges,
    hasThisPosition: !!(customRanges && customRanges[stackRangeKey]),
    hasThisHand: !!(customRanges && customRanges[stackRangeKey] && customRanges[stackRangeKey][normalizedHandType]),
    availablePositions: customRanges ? Object.keys(customRanges) : []
  });
  
  // カスタムレンジが設定されている場合はそれを使用（全スタックサイズ対応）
  if (customRanges && customRanges[stackRangeKey] && customRanges[stackRangeKey][normalizedHandType]) {
    const customHandData = customRanges[stackRangeKey][normalizedHandType];
    
    // カスタムレンジから頻度データを取得
    let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL IN': 0 };
    let customPrimaryAction = 'FOLD';
    
    if (customHandData.mixedFrequencies) {
      // 混合戦略の場合
      const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
      customFrequencies = {
        'FOLD': mixedFreq.FOLD || 0,
        'CALL': mixedFreq.CALL || 0,
        'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
        'ALL IN': mixedFreq.ALL_IN || 0
      };
      
      // 最大頻度のアクションを主要アクションとする
      const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
        curr[1] > max[1] ? curr : max
      );
      customPrimaryAction = maxFreqEntry[0];
    } else {
      // 単一アクションの場合
      const actionMapping: { [key: string]: string } = {
        'ALL_IN': 'ALL IN',
        'MIN': 'RAISE',
        'CALL': 'CALL',
        'FOLD': 'FOLD',
        'RAISE': 'RAISE'
      };
      customPrimaryAction = actionMapping[customHandData.action] || customHandData.action.replace('ALL_IN', 'ALL IN');
      const actionKey = customPrimaryAction as keyof typeof customFrequencies;
      customFrequencies[actionKey] = customHandData.frequency;
      
      // 残りの頻度をFOLDに設定
      if (customHandData.frequency < 100) {
        customFrequencies['FOLD'] = 100 - customHandData.frequency;
      }
    }
    
    // スタックサイズに応じたEVデータを生成（20BB、25BBなど対応）
    const getStackBasedEV = (action: string, stackBB: number) => {
      const baseMultiplier = stackBB <= 15 ? 1.0 : stackBB <= 20 ? 1.1 : stackBB <= 25 ? 1.2 : 1.3;
      return {
        'FOLD': 0,
        'CALL': action === 'CALL' ? (0.8 * baseMultiplier) : -1.0,
        'RAISE': action === 'RAISE' ? (2.5 * baseMultiplier) : -1.2,
        'ALL IN': action === 'ALL IN' ? (3.2 * baseMultiplier) : -2.0
      };
    };
    
    const customEvData = getStackBasedEV(customPrimaryAction, stackDepthBB);
    
    // スタックサイズに応じたベットサイズの計算
    const getRecommendedBetSize = (action: string, stackBB: number) => {
      if (action === 'ALL IN') return stackBB;
      if (action === 'RAISE') {
        if (stackBB <= 15) return 2.2;
        if (stackBB <= 20) return 2.5;
        if (stackBB <= 25) return 2.8;
        return 3.0;
      }
      return 0;
    };
    
    console.log('🎯 カスタムレンジ適用成功:', {
      position,
      stackSize,
      stackRangeKey,
      handType: normalizedHandType,
      customHandData,
      primaryAction: customPrimaryAction,
      frequencies: customFrequencies,
      evData: customEvData
    });
    
    const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
    
    return {
      correctAction: customPrimaryAction,
      evData: customEvData,
      frequencies: customFrequencies,
      normalizedHandType: normalizedHandType,
      effectiveStackExplanation: `カスタムレンジ: ${position}ポジション(${stackSize})での設定済みオープン戦略です。`,
      stackSizeStrategy: positionAdvice,
      icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
      recommendedBetSize: getRecommendedBetSize(customPrimaryAction, stackDepthBB),
      strategicAnalysis: `カスタム${stackSize}戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
      exploitSuggestion: getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
      isCustomRange: true // カスタムレンジ使用を示すフラグ
    };
  }
  
  // カスタムレンジがない場合は適切なMTTレンジをデフォルトとして使用
  console.log('📊 デフォルトMTTレンジ使用:', {
    position,
    stackDepthBB,
    handType: normalizedHandType
  });
  
  // HandRange.tsxからMTTレンジを取得（既にインポート済み）
  const defaultRange = getMTTRange(position, stackDepthBB);
  const handData = defaultRange[normalizedHandType];
  
  if (handData) {
    // レンジ内のハンドの場合
    if (handData.mixedFrequencies) {
      // 混合戦略の場合
      const mixedFreq = handData.mixedFrequencies as { FOLD?: number; CALL?: number; RAISE?: number; ALL_IN?: number; MIN?: number; };
      frequencies = {
        'FOLD': mixedFreq.FOLD || 0,
        'CALL': mixedFreq.CALL || 0,
        'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
        'ALL IN': mixedFreq.ALL_IN || 0
      };
      
      // 最大頻度のアクションを主要アクションとする
      const maxFreqEntry = Object.entries(frequencies).reduce((max, curr) => 
        curr[1] > max[1] ? curr : max
      );
      gtoAction = maxFreqEntry[0];
    } else {
      // 単一アクションの場合
      const actionMapping: { [key: string]: string } = {
        'ALL_IN': 'ALL IN',
        'MIN': 'RAISE',
        'CALL': 'CALL',
        'FOLD': 'FOLD',
        'RAISE': 'RAISE'
      };
      gtoAction = actionMapping[handData.action] || handData.action.replace('ALL_IN', 'ALL IN');
      const actionKey = gtoAction as keyof typeof frequencies;
      frequencies[actionKey] = handData.frequency;
      
      // 残りの頻度をFOLDに設定
      if (handData.frequency < 100) {
        frequencies['FOLD'] = 100 - handData.frequency;
      }
    }
    
    // デフォルトレンジ用のEVデータを生成
    evData = {
      'FOLD': 0,
      'CALL': gtoAction === 'CALL' ? 0.8 : -1.0,
      'RAISE': gtoAction === 'RAISE' ? 2.5 : -1.2,
      'ALL IN': gtoAction === 'ALL IN' ? 3.2 : -2.0
    };
  } else {
    // レンジ外のハンドの場合はフォールド
    gtoAction = 'FOLD';
    frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL IN': 0 };
    evData = { 'FOLD': 0, 'CALL': -1.5, 'RAISE': -2.0, 'ALL IN': -2.5 };
  }
  
  return {
    correctAction: gtoAction,
    evData: evData,
    frequencies: frequencies,
    normalizedHandType: normalizeHandType(hand),
    effectiveStackExplanation: `${stackSize}スタックでのMTTレンジベース戦略です。`,
    stackSizeStrategy: `デフォルトMTTレンジ: ${normalizedHandType}は${gtoAction}が推奨されます。`,
    icmConsideration: 'スタックに余裕があるため標準的な戦略を使用します。',
    recommendedBetSize: gtoAction === 'RAISE' ? 2.5 : 0,
    strategicAnalysis: `${stackSize}戦略: ${normalizeHandType(hand)}は${gtoAction}が推奨されます。`,
    exploitSuggestion: getExploitSuggestion(gtoAction, position, normalizeHandType(hand))
  };

// ポジション別のアドバイスを生成する関数
const getPositionAdvice = (position: string, action: string, stackDepthBB: number): string => {
  const positionDescriptions = {
    'UTG': 'アーリーポジション',
    'UTG1': 'アーリーポジション',
    'LJ': 'ミドルポジション',
    'HJ': 'ミドルポジション',
    'CO': 'レイトポジション',
    'BTN': 'ボタン（最有利ポジション）',
    'SB': 'スモールブラインド',
    'BB': 'ビッグブラインド'
  };

  const positionDesc = positionDescriptions[position as keyof typeof positionDescriptions] || position;
  
  if (action === 'ALL IN') {
    return `${positionDesc}からの${stackDepthBB}BBオールインは、フォールドエクイティを最大化する戦略です。${position === 'UTG' || position === 'UTG1' ? 'アーリーポジションからのオールインは特にタイトなレンジが必要です。' : position === 'BTN' ? 'ボタンからのオールインは最も広いレンジで可能です。' : 'ポジションに応じた適切なレンジでプレイしましょう。'}`;
  } else if (action === 'MIN') {
    return `${positionDesc}からのミニレイズは、スタックを温存しながら主導権を握る戦略です。${stackDepthBB}BBでは、コミット率が高くなるため慎重に選択しましょう。`;
  } else if (action === 'CALL') {
    return `${positionDesc}からのコールは、ポストフロップでの判断を必要とします。${stackDepthBB}BBでは${stackDepthBB <= 15 ? '複雑な判断を避けるため、シンプルなプレイが推奨されます。' : 'ポストフロップでの適切な判断が重要になります。'}`;
  } else if (action === '3BB') {
    return `${positionDesc}からの3BBレイズは、ミニレイズよりも強い意思表示です。フォールドエクイティと価値の両方を狙います。`;
  } else {
    return `${positionDesc}からはフォールドが最適です。${stackDepthBB}BBという貴重なスタックを温存し、より有利な状況を待ちましょう。`;
  }
};

// ICM考慮事項のアドバイスを生成する関数
const getICMAdvice = (stackDepthBB: number, action: string, position: string): string => {
  if (stackDepthBB <= 10) {
    return `${stackDepthBB}BBという極めて浅いスタックでは、ICMプレッシャーが最大となります。生存価値を最優先に考え、${action === 'ALL_IN' ? '確実に優位性のあるハンドでのみオールインしましょう。' : 'リスクを極力避けてプレイしましょう。'}`;
  } else if (stackDepthBB <= 15) {
    return `15BBスタックでは中程度のICMプレッシャーがあります。${action === 'FOLD' ? 'タイトなプレイで生存を優先しつつ、' : '適度なアグレッションを保ちながら、'}ペイアウトジャンプを意識したプレイが重要です。`;
  } else {
    return 'スタックに余裕があるため、標準的なICM考慮でプレイできます。ただし、常にトーナメント状況を意識しましょう。';
  }
};

// エクスプロイト提案を生成する関数
const getExploitSuggestion = (action: string, position: string, handType: string): string => {
  if (action === 'FOLD') {
    return `${handType}は${position}ポジションでは一般的にフォールドですが、対戦相手がタイトな場合は時折ブラフとして利用できる可能性があります。`;
  }
  if (action === 'RAISE') {
    return `${handType}での${position}からのレイズは、対戦相手の3ベット頻度に応じて調整しましょう。`;
  }
  if (action === 'ALL IN') {
    return `${handType}でのオールインは15BBスタックでは標準的ですが、ICM状況を考慮して調整が必要な場合があります。`;
  }
  return `${handType}は${position}ポジションで柔軟性のある戦略を要求します。`;
};

// オープンレイザーの情報を取得する関数
const getOpenerInfo = (openerPosition: string): string => {
  const openerData: { [key: string]: string } = {
    'UTG': 'UTGからのオープンは最もタイトなレンジです。プレミアムハンドと強いブロードウェイを中心とした約9-12%のレンジ。',
    'MP': 'MPからのオープンは中程度のレンジです。UTGよりもやや緩く、約12-15%のハンドでオープンします。',
    'CO': 'COからのオープンは積極的なレンジです。約22-26%のハンドでオープンし、ポジション利用を重視します。',
    'BTN': 'BTNからのオープンは最も広いレンジです。約40-50%のハンドでオープンし、ポジション優位を最大限活用。',
    'SB': 'SBからのオープンは特殊な戦略です。BBとヘッズアップになることを考慮した約30-40%のレンジ。'
  };
  
  return openerData[openerPosition] || 'このポジションからのオープンレンジを分析中...';
};

// vsオープン戦略を取得する関数
const getVsOpenStrategy = (handType: string, heroPosition: string, openerPosition: string, stackBB: number) => {
  // 15BB以下での基本的なvsオープン戦略
  if (stackBB <= 15) {
    // プレミアムハンド
    if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(handType)) {
      return {
        frequencies: { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL IN': 100 },
        primaryAction: 'ALL IN',
        evData: { 'FOLD': 0, 'CALL': -1.0, 'RAISE': 1.5, 'ALL IN': 3.2 }
      };
    }
    
    // 強いハンド
    if (['JJ', 'TT', '99', 'AQs', 'AQo', 'AJs'].includes(handType)) {
      // オープンレイザーのポジションによって調整
      const tightOpeners = ['UTG', 'MP'];
      if (tightOpeners.includes(openerPosition)) {
        return {
          frequencies: { 'FOLD': 30, 'CALL': 20, 'RAISE': 0, 'ALL IN': 50 },
          primaryAction: 'ALL IN',
          evData: { 'FOLD': 0, 'CALL': 0.8, 'RAISE': 1.2, 'ALL IN': 2.5 }
        };
      } else {
        return {
          frequencies: { 'FOLD': 10, 'CALL': 30, 'RAISE': 0, 'ALL IN': 60 },
          primaryAction: 'ALL IN',
          evData: { 'FOLD': 0, 'CALL': 1.0, 'RAISE': 1.5, 'ALL IN': 2.8 }
        };
      }
    }
    
    // 中程度のハンド
    if (['88', '77', '66', 'ATo', 'KQs', 'KQo'].includes(handType)) {
      return {
        frequencies: { 'FOLD': 60, 'CALL': 25, 'RAISE': 0, 'ALL IN': 15 },
        primaryAction: 'FOLD',
        evData: { 'FOLD': 0, 'CALL': 0.3, 'RAISE': 0.8, 'ALL IN': 1.8 }
      };
    }
  }
  
  // デフォルト: 弱いハンドはフォールド
  return {
    frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL IN': 0 },
    primaryAction: 'FOLD',
    evData: { 'FOLD': 0, 'CALL': -1.5, 'RAISE': -2.0, 'ALL IN': -2.5 }
  };
};

// vsオープンのアドバイスを取得する関数
const getVsOpenAdvice = (heroPosition: string, openerPosition: string, action: string, stackBB: number): string => {
  const positionInfo = `${openerPosition}のオープンに対して${heroPosition}ポジションから`;
  
  if (action === 'ALL IN') {
    return `${positionInfo}のオールインは15BBスタックでは標準的な戦略です。ICM圧力を考慮して調整してください。`;
  } else if (action === 'CALL') {
    return `${positionInfo}のコールは、フロップでの戦略を事前に計画しておくことが重要です。`;
  } else if (action === 'FOLD') {
    return `${positionInfo}のフォールドは、オープンレイザーのレンジに対して適切な判断です。`;
  }
  
  return `${positionInfo}の戦略は、相手のレンジとポジション優位を考慮して決定されています。`;
};

export default function MTTTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, token, user, logout, loading } = useAdmin();
  
  // URLからシナリオパラメータを取得（簡略化）
  const stackSize = searchParams.get('stack') || '100BB';
  const position = searchParams.get('position') || 'BTN';
  const actionType = searchParams.get('action') || 'openraise';
  
  // URLからカスタム選択ハンドを取得
  const customHandsString = searchParams.get('hands') || '';
  const customHands = customHandsString ? decodeURIComponent(customHandsString).split(',') : [];
  
  // ステート
  const [hand, setHand] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [gtoData, setGtoData] = useState<any>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [trainingCount, setTrainingCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  
  // レンジエディター関連のstate
  const [showRangeEditor, setShowRangeEditor] = useState<boolean>(false);
  const [customRanges, setCustomRanges] = useState<Record<string, Record<string, HandInfo>>>({});
  const [selectedEditPosition, setSelectedEditPosition] = useState<string>('UTG');
  const [isRangeEditorOpen, setIsRangeEditorOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  
  // vsオープン用レンジエディター関連のstate
  const [selectedVSOpenPosition, setSelectedVSOpenPosition] = useState<string>('BTN');
  const [selectedOpenerPosition, setSelectedOpenerPosition] = useState<string>('CO');
  
  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);
  
  // ハンド選択機能
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [selectedTrainingHands, setSelectedTrainingHands] = useState<string[]>([]);

  // ハンドタイプからカード配列を生成するヘルパー関数
  const generateHandFromType = (handType: string): string[] => {
    console.log('🎲 ハンド生成デバッグ:', { handType });
    
    // ハンドタイプを正規化（高いランクを最初に）
    let normalizedHandType = handType;
    if (handType.length === 3) {
      const rank1 = handType[0];
      const rank2 = handType[1];
      const suitType = handType[2];
      
      const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
      const rank1Index = ranks.indexOf(rank1);
      const rank2Index = ranks.indexOf(rank2);
      
      if (rank1Index < rank2Index) {
        // ランクを入れ替える（高いランクを最初に）
        normalizedHandType = rank2 + rank1 + suitType;
        console.log('🔄 ハンドタイプを正規化:', { original: handType, normalized: normalizedHandType });
      }
    }
    
    const suits = ['s', 'h', 'd', 'c'];
    let card1: string, card2: string;
    
    if (normalizedHandType.length === 2) {
      // ペア（AA, KK など）の場合は異なるスートで生成
      const rank = normalizedHandType[0];
      const suitIndex1 = Math.floor(Math.random() * suits.length);
      let suitIndex2 = (suitIndex1 + 1 + Math.floor(Math.random() * 3)) % 4; // 異なるスートを確保
      
      card1 = rank + suits[suitIndex1];
      card2 = rank + suits[suitIndex2];
    } else if (normalizedHandType.length === 3) {
      const rank1 = normalizedHandType[0];
      const rank2 = normalizedHandType[1];
      const suitType = normalizedHandType[2]; // 's' または 'o'
      
      console.log('🎲 3文字ハンド処理:', { rank1, rank2, suitType });
      
      if (suitType === 's') {
        // スーテッド（AKs, QJs など）の場合は同じスート
        const suitIndex = Math.floor(Math.random() * suits.length);
        card1 = rank1 + suits[suitIndex];
        card2 = rank2 + suits[suitIndex];
      } else {
        // オフスーツ（AKo, QJo など）の場合は異なるスート
        const suitIndex1 = Math.floor(Math.random() * suits.length);
        let suitIndex2 = (suitIndex1 + 1 + Math.floor(Math.random() * 3)) % 4;
        
        card1 = rank1 + suits[suitIndex1];
        card2 = rank2 + suits[suitIndex2];
      }
    } else {
      // 不正なハンドタイプの場合はランダム生成
      console.log('⚠️ 不正なハンドタイプ:', normalizedHandType);
      return generateMTTHand();
    }
    
    const result = [card1, card2];
    console.log('🎲 生成されたハンド:', { originalHandType: handType, normalizedHandType, result, finalNormalized: normalizeHandType(result) });
    return result;
  };

  // 新しいシナリオを生成
  const generateNewScenario = () => {
    // 新しいハンドの生成方法を決定
    let newHand: string[];
    let handType: string;
    
    if (selectedTrainingHands.length > 0) {
      // 選択されたトレーニングハンドがある場合はその中からランダムに選ぶ
      const randomHandType = selectedTrainingHands[Math.floor(Math.random() * selectedTrainingHands.length)];
      
      // ハンドタイプからカード配列を生成
      newHand = generateHandFromType(randomHandType);
      handType = randomHandType;
    } else if (customHands.length > 0) {
      // カスタムハンドが選択されている場合はその中からランダムに選ぶ
      const randomHandType = customHands[Math.floor(Math.random() * customHands.length)];
      
      // ハンドタイプからカード配列を生成
      newHand = generateHandFromType(randomHandType);
      handType = randomHandType;
    } else {
      // カスタムハンドがない場合はランダム生成
      newHand = generateMTTHand();
      handType = normalizeHandType(newHand);
    }
    
    setHand(newHand);
    
    // vs openの場合、オープンレイザーを動的に決定
    let openerPosition: string | undefined;
    if (actionType === 'vsopen') {
      // URLパラメータでオープンレイザーが指定されている場合はそれを使用
      const urlOpener = searchParams.get('opener');
      if (urlOpener && isValidVsOpenCombination(position, urlOpener)) {
        openerPosition = urlOpener;
      } else {
        // 指定されていない、または無効な場合はランダムに選択
        const validOpeners = getValidOpenerPositions(position);
        if (validOpeners.length > 0) {
          openerPosition = validOpeners[Math.floor(Math.random() * validOpeners.length)];
        }
      }
    }
    
    // MTT特有のGTOデータをシミュレート（簡略化）
    const data = simulateMTTGTOData(
      newHand, 
      position, 
      stackSize, 
      actionType as string,
      customRanges,
      openerPosition
    );
    setGtoData(data);
    
    // レイズ推奨サイズを取得
    const recommendedBetSize = data.recommendedBetSize;
    
    // ポットサイズの計算 - vs openの場合はオープンレイズの大きさを考慮
    let potSize = 1.5;     // デフォルト
    let openRaiseSize = 2.0; // デフォルトのオープンサイズ
    
    // BTNの15BBスタックの場合はリンプ戦略を使用
    if (actionType === 'vsopen' && openerPosition === 'BTN' && stackSize === '15BB') {
      openRaiseSize = 1.0; // リンプ
      potSize = openRaiseSize + 1.0; // リンプ + BB（SBのブラインド分は除外）
    } else if (actionType === 'vsopen' && openerPosition === 'SB' && stackSize === '15BB') {
      openRaiseSize = 1.0; // SBリンプ
      potSize = openRaiseSize + 1.0; // SBリンプ + BB
    } else if (actionType === 'vsopen') {
      // 通常のオープンレイズの場合は2.0BBを使用
      potSize = openRaiseSize + 1.5;
    } else if (actionType === 'openraise') {
      potSize = 1.5; // SB + BB
    } else if (actionType === 'vs3bet') {
      potSize = 13;
    } else if (actionType === 'vs4bet') {
      potSize = 30;
    } else if (actionType === 'vs5bet') {
      potSize = 70;
    }
    
    // スポットデータを作成（簡略化）
    const newSpot: Spot = {
      id: Math.random().toString(),
      description: `エフェクティブスタック:${stackSize} - ${
        actionType === 'openraise' ? 'オープンレイズ' : 
        actionType === 'vsopen' ? (
          openerPosition === 'BTN' && stackSize === '15BB' 
            ? `vs ${openerPosition || 'UTG'}のリンプ(1BB)` 
            : `vs ${openerPosition || 'UTG'}のオープン(2.5BB)`
        ) : 
        actionType === 'vs3bet' ? 'vs 3ベット' : 
        actionType === 'vs4bet' ? 'vs 4ベット' : 
        actionType === 'vs5bet' ? 'vs 5ベット' : 
        'ランダム'
      }`,
      heroPosition: position,
      heroHand: newHand,
      potSize: potSize,
      correctAction: data.correctAction,
      evData: data.evData as { [action: string]: number } | undefined,
      frequencies: data.frequencies, // 頻度データを追加
      correctBetSize: recommendedBetSize,
      // スタック関連の情報を追加
      stackDepth: stackSize,
      // vs オープン用の追加情報
      openRaiserPosition: openerPosition,
      openRaiseSize: openRaiseSize, // 計算されたオープンサイズを使用
      // 各ポジションのスタック情報を作成（全てのポジションに同じスタックを設定）
      positions: {
        'UTG': { active: true, stack: parseInt(stackSize), isHero: position === 'UTG' },
        'UTG1': { active: true, stack: parseInt(stackSize), isHero: position === 'UTG1' },
        'LJ': { active: true, stack: parseInt(stackSize), isHero: position === 'LJ' },
        'HJ': { active: true, stack: parseInt(stackSize), isHero: position === 'HJ' },
        'CO': { active: true, stack: parseInt(stackSize), isHero: position === 'CO' },
        'BTN': { active: true, stack: parseInt(stackSize), isHero: position === 'BTN' },
        'SB': { active: true, stack: parseInt(stackSize) - 0.5, isHero: position === 'SB' },
        'BB': { active: true, stack: parseInt(stackSize) - 1, isHero: position === 'BB' }
      }
    };
    setSpot(newSpot);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 初期化（依存関係も簡略化）
  useEffect(() => {
    generateNewScenario();
  }, [position, stackSize, actionType, customHandsString]);
  
  // システム全体からレンジデータを自動読み込み（カスタマー向けの常時同期）
  useEffect(() => {
    const loadSystemRanges = async () => {
      try {
        const response = await fetch('/api/mtt-ranges');
        if (response.ok) {
          const systemData = await response.json();
          
          // システムデータが存在する場合は常に優先して使用（カスタマー向けの設定を確実に反映）
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            console.log('🔄 システムからカスタムレンジを自動読み込み中...', {
              systemRangesCount: Object.keys(systemData.ranges).length,
              systemRanges: Object.keys(systemData.ranges)
            });
            
            // システムデータを優先してcustomRangesに設定
            setCustomRanges(systemData.ranges);
            
            // localStorageも更新して一貫性を保つ
            localStorage.setItem('mtt-custom-ranges', JSON.stringify(systemData.ranges));
            console.log('✅ システムからカスタムレンジを自動読み込み完了!', {
              loadedPositions: Object.keys(systemData.ranges).length,
              totalHands: Object.values(systemData.ranges).reduce((total: number, range: any) => total + Object.keys(range).length, 0)
            });
          } else {
            console.log('📝 システムにカスタムレンジが見つかりません。ローカルデータを使用します。');
            
            // システムデータがない場合のみローカルストレージからの読み込みを試行
            const localRanges = localStorage.getItem('mtt-custom-ranges');
            if (localRanges) {
              try {
                const localData = JSON.parse(localRanges);
                
                // 古い形式のキーを新形式に変換
                const convertedRanges: Record<string, Record<string, HandInfo>> = {};
                let hasConverted = false;
                
                for (const [key, value] of Object.entries(localData)) {
                  let newKey = key;
                  
                  // vsopen_で始まり、末尾にスタックサイズがない場合
                  if (key.startsWith('vsopen_') && !key.match(/_\d+BB$/)) {
                    newKey = `${key}_15BB`;
                    hasConverted = true;
                    console.log(`🔄 変換: ${key} -> ${newKey}`);
                  }
                  // 通常のポジションキーでスタックサイズがない場合
                  else if (!key.startsWith('vsopen_') && !key.match(/_\d+BB$/)) {
                    newKey = `${key}_15BB`;
                    hasConverted = true;
                    console.log(`🔄 変換: ${key} -> ${newKey}`);
                  }
                  
                  convertedRanges[newKey] = value as Record<string, HandInfo>;
                }
                
                setCustomRanges(convertedRanges);
                
                // 変換が行われた場合はlocalStorageを更新
                if (hasConverted) {
                  localStorage.setItem('mtt-custom-ranges', JSON.stringify(convertedRanges));
                  console.log('✅ 古い形式のキーを新形式に変換してlocalStorageを更新しました');
                }
                
                console.log('📂 ローカルストレージからカスタムレンジを読み込み:', Object.keys(convertedRanges).length, 'ポジション');
              } catch (error) {
                console.error('ローカルデータの解析に失敗:', error);
              }
            }
          }
        } else {
          console.log('🔍 システムレンジAPI応答エラー:', response.status, response.statusText);
          
          // APIエラーの場合はローカルストレージからの読み込みを試行
          const localRanges = localStorage.getItem('mtt-custom-ranges');
          if (localRanges) {
            try {
              const localData = JSON.parse(localRanges);
              setCustomRanges(localData);
              console.log('📂 フォールバック: ローカルストレージからカスタムレンジを読み込み');
            } catch (error) {
              console.error('ローカルデータの解析に失敗:', error);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ システムレンジ読み込みエラー（ローカルデータを使用）:', (error as Error).message);
        
        // ネットワークエラーなどの場合はローカルストレージからの読み込みを試行
        const localRanges = localStorage.getItem('mtt-custom-ranges');
        if (localRanges) {
          try {
            const localData = JSON.parse(localRanges);
            setCustomRanges(localData);
            console.log('📂 フォールバック: ローカルストレージからカスタムレンジを読み込み');
          } catch (error) {
            console.error('ローカルデータの解析に失敗:', error);
          }
        }
      }
    };

    // コンポーネントマウント時に即座に実行
    loadSystemRanges();
  }, []);
  
  // カスタムレンジのデバッグ用ヘルパー関数
  const debugCustomRange = (position: string, handType: string) => {
    const positionRange = customRanges[position];
    if (!positionRange) {
      console.log(`🔍 ${position}ポジションのカスタムレンジが存在しません`);
      return null;
    }
    
    const handInfo = positionRange[handType];
    console.log(`🔍 ${position}ポジション、${handType}ハンドの情報:`, {
      handInfo,
      hasMixedFrequencies: !!handInfo?.mixedFrequencies,
      mixedFrequencies: handInfo?.mixedFrequencies,
      action: handInfo?.action,
      frequency: handInfo?.frequency
    });
    
    return handInfo;
  };
  
  // レンジエディターのハンドラー関数
  const handleSaveRange = async (position: string, rangeData: Record<string, HandInfo>) => {
    const newCustomRanges = {
      ...customRanges,
      [position]: rangeData
    };
    setCustomRanges(newCustomRanges);
    
    // localStorageに保存
    try {
      localStorage.setItem('mtt-custom-ranges', JSON.stringify(newCustomRanges));
      console.log(`${position}ポジションのカスタムレンジを保存しました`);
    } catch (error) {
      console.error('カスタムレンジの保存に失敗しました:', error);
    }
    
    // 管理者認証済みならAPIにも保存
    if (isAdmin && token) {
      try {
        const response = await fetch('/api/mtt-ranges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ranges: newCustomRanges,
            metadata: {
              creator: 'MTT Admin System',
              timestamp: new Date().toISOString()
            }
          }),
        });
        if (response.ok) {
          const result = await response.json();
          alert(`✅ システム全体に保存完了！\n${result.metadata.totalPositions}ポジション、${result.metadata.totalHands}ハンドを保存しました。`);
        } else {
          const error = await response.json();
          throw new Error(error.error || '保存に失敗しました');
        }
      } catch (error) {
        console.error('システム保存エラー:', error);
        alert(`❌ システムへの保存に失敗しました: ${(error as Error).message}`);
      }
    }
  };

  // カスタムレンジをJSONファイルとしてエクスポート
  const handleExportRanges = () => {
    try {
      const dataStr = JSON.stringify(customRanges, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mtt-custom-ranges-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('レンジのエクスポートに失敗しました:', error);
      alert('エクスポートに失敗しました。');
    }
  };

  // JSONファイルからカスタムレンジをインポート
  const handleImportRanges = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedRanges = JSON.parse(e.target?.result as string);
        
        // データの妥当性をチェック
        if (typeof importedRanges === 'object' && importedRanges !== null) {
          setCustomRanges(importedRanges);
          localStorage.setItem('mtt-custom-ranges', JSON.stringify(importedRanges));
          alert('レンジを正常にインポートしました。');
        } else {
          throw new Error('無効なファイル形式です。');
        }
      } catch (error) {
        console.error('レンジのインポートに失敗しました:', error);
        alert('ファイルの読み込みに失敗しました。正しいフォーマットのファイルか確認してください。');
      }
    };
    reader.readAsText(file);
    
    // ファイル選択をリセット
    event.target.value = '';
  };

  // カスタムレンジを完全にクリア
  const handleClearAllRanges = () => {
    if (confirm('全てのカスタムレンジを削除しますか？この操作は取り消せません。')) {
      setCustomRanges({});
      localStorage.removeItem('mtt-custom-ranges');
      alert('全てのカスタムレンジを削除しました。');
    }
  };

  // システム全体にレンジデータを保存
  const handleSaveToSystem = async () => {
    if (!isAdmin || !token) {
      alert('❌ 管理者権限が必要です。');
      return;
    }

    if (Object.keys(customRanges).length === 0) {
      alert('保存するレンジデータがありません。');
      return;
    }

    try {
      const response = await fetch('/api/mtt-ranges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ranges: customRanges,
          metadata: {
            creator: 'MTT Admin System',
            timestamp: new Date().toISOString()
          }
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ システム全体に保存完了！\n${result.metadata.totalPositions}ポジション、${result.metadata.totalHands}ハンドを保存しました。`);
        } else {
        const error = await response.json();
        throw new Error(error.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('システム保存エラー:', error);
      alert(`❌ システムへの保存に失敗しました: ${(error as Error).message}`);
    }
  };

  // システム全体からレンジデータを読み込み
  const handleLoadFromSystem = async () => {
    if (!isAdmin || !token) {
      alert('❌ 管理者権限が必要です。');
      return;
    }

    try {
      const response = await fetch('/api/mtt-ranges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const systemData = await response.json();
        
        if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
          if (confirm(`システムデータを読み込みますか？\n${systemData.metadata.totalPositions}ポジション、${systemData.metadata.totalHands}ハンドが存在します。\n現在のローカルデータは上書きされます。`)) {
            setCustomRanges(systemData.ranges);
            localStorage.setItem('mtt-custom-ranges', JSON.stringify(systemData.ranges));
            alert('✅ システムデータを正常に読み込みました！');
          }
        } else {
          alert('❌ システムに保存されたレンジデータが見つかりません。');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'データの読み込みに失敗しました');
      }
    } catch (error) {
      console.error('システム読み込みエラー:', error);
      alert(`❌ システムからの読み込みに失敗しました: ${(error as Error).message}`);
    }
  };

  // システムのレンジデータをクリア
  const handleClearSystemRanges = async () => {
    if (!isAdmin || !token) {
      alert('❌ 管理者権限が必要です。');
      return;
    }

    if (confirm('⚠️ システム全体のレンジデータを削除しますか？\nこの操作は全てのユーザーに影響し、取り消せません。')) {
      try {
        const response = await fetch('/api/mtt-ranges', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          alert('✅ システム全体のレンジデータを削除しました。');
    } else {
          const error = await response.json();
          throw new Error(error.error || '削除に失敗しました');
        }
      } catch (error) {
        console.error('システム削除エラー:', error);
        alert(`❌ システムデータの削除に失敗しました: ${(error as Error).message}`);
      }
    }
  };
  
  const handleOpenRangeEditor = (position: string) => {
    // スタックサイズを含めたキーを生成
    const rangeKey = position.startsWith('vsopen_') ? position : `${position}_${stackSize}`;
    console.log('レンジエディターボタン押下:', position, '→ キー:', rangeKey);
    setSelectedEditPosition(rangeKey);
    setShowRangeEditor(true);
    setTimeout(() => {
      // 状態が反映された後の値を確認
      console.log('showRangeEditor:', showRangeEditor, 'selectedEditPosition:', selectedEditPosition);
    }, 100);
  };
  


  // ハンド選択機能のハンドラー
  const handleOpenHandSelector = () => {
    setShowHandSelector(true);
  };

  const handleCloseHandSelector = () => {
    setShowHandSelector(false);
  };

  const handleSelectTrainingHands = (hands: string[]) => {
    setSelectedTrainingHands(hands);
    console.log('選択されたトレーニングハンド:', hands);
  };
  
  // アクション選択ハンドラー
  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    
    // アクションの基本部分を抽出して比較（例：'RAISE 2.5' → 'RAISE'）
    const selectedBase = action.split(' ')[0];
    const correctBase = gtoData?.correctAction?.split(' ')[0] || '';
    
    // 基本アクションが一致するかで正解判定
    let correct = selectedBase === correctBase;
    
    // より詳細な評価：頻度情報があれば使用
    if (gtoData?.frequencies && action in gtoData.frequencies) {
      const selectedFrequency = gtoData.frequencies[action];
      // 頻度が30%以上なら正解扱い、10%以上なら部分正解扱い
      if (selectedFrequency >= 30) {
        correct = true;
      } else if (selectedFrequency >= 10) {
        correct = true; // 部分正解も正解扱い
      } else {
        correct = false;
      }
    }
    
    setIsCorrect(correct);
    setShowResults(true);
    
    // 統計データ更新
    setTrainingCount(prev => prev + 1);
    if (correct) {
      setCorrectCount(prev => prev + 1);
    }
  };
  
  // 次のスポットへ進むハンドラー
  const handleNextSpot = () => {
    // 結果をリセット
    setSelectedAction(null);
    setIsCorrect(false);
    setShowResults(false);
    
    // 新しいシナリオを生成
    generateNewScenario();
  };
  
  // 同じスポットを繰り返すハンドラー
  const handleRepeatSpot = () => {
    // 結果をリセットするが、同じハンドを使用
    setSelectedAction(null);
    setIsCorrect(false);
    setShowResults(false);
    
    // 同じスポットを再作成（IDのみ変更して再レンダリングを確実にする）
    if (spot) {
      // スポットのIDだけを変更して他のプロパティはそのまま維持
      const repeatedSpot: Spot = {
        ...spot,
        id: Math.random().toString(), // 新しいIDを生成
      };
      setSpot(repeatedSpot);
    }
  };
  
  // スタックの表示名を取得
  const getStackSizeDisplay = () => {
    switch(stackSize) {
      case '10BB': return '超浅いエフェクティブスタック (10BB)';
      case '15BB': return '浅いエフェクティブスタック (15BB)';
      case '20BB': return '浅めエフェクティブスタック (20BB)';
      case '30BB': return '中程度エフェクティブスタック (30BB)';
      case '50BB': return '深めエフェクティブスタック (50BB)';
      case '100BB': return '深いエフェクティブスタック (100BB)';
      default: return `${stackSize}`;
    }
  };
  
  if (!spot) {
    return <div className="min-h-screen bg-black md:bg-gray-900 text-white flex items-center justify-center">ローディング中...</div>;
  }
  
  return (
    <div className="relative">
      {/* 管理者ログインボタン（未ログイン時のみ表示） */}
      {!isAdmin && (
        <button
          className="absolute top-4 right-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg font-bold"
          onClick={() => setShowAdminLogin(true)}
        >
          管理者ログイン
        </button>
      )}
      {/* 管理者ログインモーダル */}
      {showAdminLogin && (
        <AdminLogin onClose={() => setShowAdminLogin(false)} />
      )}

      {/* ここから下は既存のページ内容 */}
      <div className="min-h-screen bg-black md:bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 hidden md:flex justify-between items-center">
            <h1 className="text-2xl font-bold">MTT GTOトレーニング</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={handleOpenHandSelector}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors"
              >
                📱 ハンド選択 ({selectedTrainingHands.length})
              </button>
              <Link 
                href={`/trainer/mtt?${new URLSearchParams({
                  stack: stackSize,
                  position: position,
                  action: actionType,
                  ...(customHands.length > 0 ? { hands: encodeURIComponent(customHands.join(',')) } : {})
                }).toString()}`} 
                className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 text-sm"
              >
                ← 戻る
              </Link>
            </div>
          </div>
          
          {/* モバイル版ヘッダー */}
          <div className="mb-4 md:hidden">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-xl font-bold">MTT GTOトレーニング</h1>
              <Link 
                href={`/trainer/mtt?${new URLSearchParams({
                  stack: stackSize,
                  position: position,
                  action: actionType,
                  ...(customHands.length > 0 ? { hands: encodeURIComponent(customHands.join(',')) } : {})
                }).toString()}`} 
                className="px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 text-xs"
              >
                ← 戻る
              </Link>
            </div>
            <button
              onClick={handleOpenHandSelector}
              className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors mb-2"
            >
              📱 トレーニングハンドを選択 ({selectedTrainingHands.length}個選択中)
            </button>
            {selectedTrainingHands.length > 0 && (
              <div className="text-xs text-gray-400 mb-2">
                💡 選択されたハンドからランダムに出題されます
              </div>
            )}
          </div>
          


          {/* レンジエディターアクセス - 管理者限定 */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4 mb-4 border border-purple-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">レンジをカスタマイズ <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">各ポジションのオープンレイズレンジを設定できます</p>
                  <p className="text-xs text-blue-300 mt-1">💡 ハンド形式: K9s, ATo, QQ など（9Ks → K9s に自動変換されます）</p>
                  {Object.keys(customRanges).length > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      カスタムレンジ設定済み: {Object.keys(customRanges).join(', ')}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'].map(pos => {
                    const rangeKey = `${pos}_${stackSize}`;
                    return (
                      <button
                        key={pos}
                        onClick={() => handleOpenRangeEditor(pos)}
                        className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          customRanges[rangeKey] 
                            ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white border-2 border-transparent'
                        }`}
                      >
                        {pos}
                        {customRanges[rangeKey] && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* データ管理セクション */}
              <div className="mt-4 pt-4 border-t border-purple-600/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">💾 データ永続保存</h4>
                    <p className="text-xs text-gray-400">
                      レンジデータをファイルで保存・復元できます（ブラウザに依存しない永続保存）
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {/* エクスポートボタン */}
                    <button
                      onClick={handleExportRanges}
                      disabled={Object.keys(customRanges).length === 0}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        Object.keys(customRanges).length > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m3 3V10" />
                      </svg>
                      エクスポート
                    </button>
                    
                    {/* インポートボタン */}
                    <label className="px-3 py-2 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white border border-green-500 cursor-pointer transition-all duration-200 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      インポート
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportRanges}
                        className="hidden"
                      />
                    </label>
                    
                    {/* クリアボタン */}
                    <button
                      onClick={handleClearAllRanges}
                      disabled={Object.keys(customRanges).length === 0}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        Object.keys(customRanges).length > 0
                          ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      全削除
                    </button>
                  </div>
                </div>
                
                {/* システム全体保存セクション（管理者のみ） */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-red-600/30 bg-red-900/10 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-red-300 mb-1 flex items-center">
                          🔒 管理者専用システム管理
                        </h4>
                        <p className="text-xs text-gray-400">
                          重要なシステム - 全てのweb・環境で共有される永続データ保存
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* システム保存ボタン */}
                        <button
                          onClick={handleSaveToSystem}
                          disabled={Object.keys(customRanges).length === 0}
                          className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                            Object.keys(customRanges).length > 0
                              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          システム保存
                        </button>
                        
                        {/* システム読み込みボタン */}
                        <button
                          onClick={handleLoadFromSystem}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 transition-all duration-200 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          システム読み込み
                        </button>
                        
                        {/* システム削除ボタン */}
                        <button
                          onClick={handleClearSystemRanges}
                          className="px-3 py-2 rounded-lg text-xs font-medium bg-red-800 hover:bg-red-900 text-white border border-red-700 transition-all duration-200 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          システム削除
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}



          {/* vs オープン専用レンジエディター */}
          {isAdmin && actionType === 'vsopen' && (
            <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 rounded-lg p-4 mb-4 border border-green-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">vs オープンレンジをカスタマイズ <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">ヒーローポジションとオープンレイザーの組み合わせでレンジを設定できます</p>
                  <p className="text-xs text-green-300 mt-1">💡 オープンに対してFOLD/CALL/RAISE/ALL INの頻度を設定します</p>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">ヒーローポジション別のvsオープンレンジ設定：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(heroPos => {
                    const validOpeners = getValidOpenerPositions(heroPos);
                    if (validOpeners.length === 0) return null;
                    
                    return (
                      <div key={heroPos} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm font-semibold text-green-400 mb-2">{heroPos} (ヒーロー)</div>
                        <div className="text-xs text-gray-300 mb-2">
                          {heroPos === 'SB' || heroPos === 'BB' ? 'BTNからのアクションに対する設定:' : 'vs オープンレイザー:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {validOpeners.map(opener => {
                            const rangeKey = `vsopen_${heroPos}_vs_${opener}_${stackSize}`;
                            const hasCustomRange = customRanges[rangeKey];
                            
                            // BTNのオープンレンジがレイズなしの場合（15BBなど）の特別表示
                            const isLimpOnlyOpener = opener === 'BTN' && stackSize === '15BB';
                            const displayText = isLimpOnlyOpener && (heroPos === 'SB' || heroPos === 'BB') 
                              ? `${opener}がリンプ→${heroPos}（あなた）のアクション`
                              : opener;
                            
                            return (
                              <button
                                key={opener}
                                onClick={() => handleOpenRangeEditor(rangeKey)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  hasCustomRange
                                    ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                }`}
                                title={`${heroPos} vs ${opener}のレンジ設定`}
                              >
                                {displayText}
                                {hasCustomRange && ' ✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* vs オープンレンジの説明 */}
                <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded text-xs">
                  <div className="text-blue-400 font-semibold mb-1">💡 vs オープンレンジの特徴</div>
                  <div className="text-gray-300">
                    • <strong>ポジション依存:</strong> ヒーローより前のポジションからのオープンのみ対応<br/>
                    • <strong>アクション選択:</strong> FOLD（フォールド）、CALL（コール）、RAISE（レイズ）、ALL IN（オールイン）<br/>
                    • <strong>混合戦略:</strong> 右クリックで詳細な頻度設定（例：CALL 60%, FOLD 40%）
                  </div>
                </div>
              </div>
            </div>
          )}


          
          {/* メインコンテンツ - 2カラムレイアウト（大きな画面のみ） */}
          <div className={`flex flex-col lg:flex-row ${isMobile ? 'gap-2' : 'gap-4'}`}>
            {/* 左側 - ポーカーテーブル（常に表示、レスポンシブ対応） */}
            <div className={`w-full lg:w-3/5 ${isMobile ? 'h-[500px] overflow-hidden' : 'h-[550px] bg-gray-800 rounded-xl overflow-hidden'}`}>
              {spot && (
                <PokerTable
                  currentSpot={spot}
                  selectedAction={selectedAction}
                  isCorrect={isCorrect}
                  showResults={showResults}
                  onActionSelect={handleActionSelect}
                  availableActions={['FOLD', 'CALL', 'RAISE', 'ALL IN']}
                  onNextSpot={handleNextSpot}
                  onRepeatSpot={handleRepeatSpot}
                  stackSize={stackSize.replace('BB', '')} // BBを除去して数値のみを渡す
                  backButtonUrl={`/trainer/mtt?${new URLSearchParams({
                    stack: stackSize,
                    position: position,
                    action: actionType,
                    ...(customHands.length > 0 ? { hands: encodeURIComponent(customHands.join(',')) } : {})
                  }).toString()}`}
                />
              )}
            </div>
            
            {/* 右側 - コントロールパネル */}
            <div className="w-full lg:w-2/5">
              <div className={`w-full ${isMobile ? '' : 'bg-gray-800 rounded-xl'} ${isMobile ? 'p-2' : 'p-4'}`}>
                {/* タイトル - PC版のみ表示 */}
                {!isMobile && (
                <h2 className="text-xl font-bold mb-4">
                  {showResults ? "結果分析" : "アクションを選択"}
                </h2>
                )}
                
                {/* 結果表示エリア - PC版のみ表示 */}
                {!isMobile && (
                <div className="mb-4 h-[60px]">
                  {showResults ? (
                    <div className={`p-3 rounded-lg text-center font-bold ${isCorrect ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                      {isCorrect ? '✓ 正解！ 最適なプレイです' : '✗ 不正解 - 最適なプレイではありません'}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg text-center text-gray-400 bg-gray-700/30">
                      GTOの観点から最適なプレイを選びましょう
                    </div>
                  )}
                </div>
                )}
                
                {/* アクションボタンエリア - PC版のみ表示 */}
                {!isMobile && (
                <div className="border-t border-gray-700 pt-4 mb-4 h-[80px] flex items-center">
                  {!showResults ? (
                    <div className="grid grid-cols-4 gap-2 w-full">
                      <button
                        className="py-3 rounded-lg font-bold text-lg shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all border border-gray-700"
                        onClick={() => handleActionSelect('FOLD')}
                      >
                        FOLD
                      </button>
                      <button
                        className="py-3 rounded-lg font-bold text-lg shadow-lg bg-green-600 hover:bg-green-700 text-white transition-all border border-gray-700"
                        onClick={() => handleActionSelect('CALL')}
                      >
                        CALL
                      </button>
                      <button
                        className="py-3 rounded-lg font-bold text-lg shadow-lg bg-red-600 hover:bg-red-700 text-white transition-all border border-gray-700"
                        onClick={() => handleActionSelect('RAISE')}
                      >
                        RAISE
                      </button>
                      {/* ALL INボタン - エフェクティブスタックが小さい場合や、PioSolverがオールインを推奨する場合に表示 */}
                      {parseInt(stackSize) <= 20 || (gtoData && gtoData.frequencies && gtoData.frequencies['ALL IN'] > 0) ? (
                        <button
                          className="py-3 rounded-lg font-bold text-lg shadow-lg bg-purple-600 hover:bg-purple-700 text-white transition-all border border-gray-700"
                          onClick={() => handleActionSelect('ALL IN')}
                        >
                          ALL IN
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={handleRepeatSpot}
                        className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-base flex items-center justify-center shadow-lg transition-all flex-1 whitespace-nowrap"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>繰り返す</span>
                      </button>
                      <button
                        onClick={handleNextSpot}
                        className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base flex items-center justify-center shadow-lg transition-all flex-1 whitespace-nowrap"
                      >
                        <span>次のハンド</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                )}
                
                {/* 結果情報エリア - 常に同じ高さで表示、空の場合は空白のプレースホルダー */}
                <div className={`${isMobile ? 'pt-1' : 'pt-4'} ${isMobile ? 'h-auto' : 'h-[340px] overflow-y-auto border-t border-gray-700'}`}>
                  {/* 結果がない場合のプレースホルダー */}
                  {!showResults && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                      <div className="mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-lg">アクションを選択すると<br/>GTO分析が表示されます</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 結果情報 - 結果がある場合のみ中身を表示 */}
                  {showResults && gtoData && (
                    <div>
                      {/* エラー状態の表示 */}
                      {gtoData.isInvalidCombination && (
                        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4 mb-4">
                          <h4 className="text-red-400 font-semibold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            ポジション組み合わせエラー
                          </h4>
                          <div className="text-red-300 text-sm mb-3">
                            {gtoData.effectiveStackExplanation}
                          </div>
                          <div className="text-gray-300 text-sm mb-2">
                            {gtoData.stackSizeStrategy}
                          </div>
                          <div className="text-blue-300 text-sm bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
                            <strong>💡 解決方法:</strong><br/>
                            {gtoData.icmConsideration}
                          </div>
                          <div className="text-yellow-300 text-xs mt-3 bg-yellow-900/20 p-2 rounded">
                            <strong>ポジション順序:</strong> {gtoData.exploitSuggestion}
                          </div>
                        </div>
                      )}
                      
                      {/* 通常の結果表示（エラーでない場合のみ） */}
                      {!gtoData.isInvalidCombination && (
                        <>
                      {/* 結果サマリー */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className={`${isMobile ? 'bg-gray-700/20' : 'bg-gray-700/40'} p-3 rounded`}>
                          <h4 className="text-gray-400 text-xs mb-1">最適なアクション</h4>
                          <div className="text-lg font-bold text-green-400">{gtoData.correctAction}</div>
                              {gtoData.frequencies && gtoData.frequencies[gtoData.correctAction] && (
                                <div className="text-xs text-green-300 mt-1">
                                  推奨頻度: {gtoData.frequencies[gtoData.correctAction]}%
                        </div>
                              )}
                        </div>
                        <div className={`${isMobile ? 'bg-gray-700/20' : 'bg-gray-700/40'} p-3 rounded`}>
                          <h4 className="text-gray-400 text-xs mb-1">あなたの選択</h4>
                          <div className="text-lg font-bold">{selectedAction}</div>
                              {gtoData.frequencies && selectedAction && gtoData.frequencies[selectedAction] !== undefined && (
                                <div className={`text-xs mt-1 ${gtoData.frequencies[selectedAction] > 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                  正解頻度: {gtoData.frequencies[selectedAction]}%
                                  {gtoData.frequencies[selectedAction] === 0 && ' (推奨されません)'}
                                </div>
                              )}
                        </div>
                      </div>



                          {/* 頻度詳細情報 */}
                          {gtoData.frequencies && (
                            <div className={`${isMobile ? 'bg-gray-700/10' : 'bg-gray-700/30'} p-4 rounded mb-4`}>
                              <h4 className="text-white font-semibold mb-3 text-sm">
                                ハンド {gtoData.normalizedHandType} の正解頻度分布
                                {(gtoData as any).isCustomRange && <span className="text-purple-400 text-xs ml-2">(カスタム設定)</span>}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(gtoData.frequencies).map(([action, frequency]) => (
                                  <div 
                                    key={action} 
                                    className={`flex justify-between p-2 rounded ${
                                      action === selectedAction 
                                        ? 'bg-blue-600/30 border border-blue-500' 
                                        : action === gtoData.correctAction 
                                          ? 'bg-green-600/30 border border-green-500' 
                                          : 'bg-gray-600/30'
                                    }`}
                                  >
                                    <span className={`font-medium ${
                                      action === selectedAction 
                                        ? 'text-blue-300' 
                                        : action === gtoData.correctAction 
                                          ? 'text-green-300' 
                                          : 'text-gray-300'
                                    }`}>
                                      {action}
                                      {action === selectedAction && ' (選択)'}
                                      {action === gtoData.correctAction && ' (推奨)'}
                                    </span>
                                    <span className={`font-bold ${
                                      Number(frequency) > 0 ? 'text-white' : 'text-gray-500'
                                    }`}>
                                      {Number(frequency)}%
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* 選択の評価 */}
                              {selectedAction && gtoData.frequencies[selectedAction] !== undefined && (
                                <div className="mt-3 p-3 rounded-lg border-l-4 border-blue-500 bg-blue-900/20">
                                  <h5 className="text-blue-300 font-semibold text-xs mb-1">選択の評価</h5>
                                  <p className="text-sm text-gray-300">
                                    {gtoData.frequencies[selectedAction] > 30 
                                      ? `${selectedAction}は高頻度推奨アクション（${gtoData.frequencies[selectedAction]}%）です。優秀な選択です！`
                                      : gtoData.frequencies[selectedAction] > 10
                                        ? `${selectedAction}は中頻度アクション（${gtoData.frequencies[selectedAction]}%）です。場合によっては選択可能です。`
                                        : gtoData.frequencies[selectedAction] > 0
                                          ? `${selectedAction}は低頻度アクション（${gtoData.frequencies[selectedAction]}%）です。稀に選択される戦略です。`
                                          : `${selectedAction}は推奨されないアクション（0%）です。別のアクションを検討しましょう。`
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                      
                      {/* vs openの場合はオープンレイザーの情報を表示 */}
                      {actionType === 'vsopen' && gtoData.openRaiserPosition && (
                        <div className={`${isMobile ? 'bg-gray-700/10' : 'bg-gray-700/30'} p-3 rounded mb-4`}>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">オープンレイザー:</span>
                            <span className="font-medium">{gtoData.openRaiserPosition}</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-400">レイズサイズ:</span>
                            <span className="font-medium">{gtoData.openRaiseSize}BB</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-400">現在のポット:</span>
                            <span className="font-medium">{spot?.potSize}BB</span>
                          </div>
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-400">エフェクティブスタック:</span>
                            <span className="font-medium">{stackSize}</span>
                            <span className="text-xs text-gray-500 ml-2">(ヒーローと相手の中で小さい方のスタック)</span>
                          </div>
                        </div>
                      )}
                      
                          {/* エクスプロイト提案 */}
                          {gtoData.exploitSuggestion && !gtoData.isInvalidCombination && (
                            <div className="bg-yellow-900/20 p-3 rounded border border-yellow-700/50">
                              <h5 className="text-yellow-300 font-semibold text-xs mb-2">エクスプロイト提案</h5>
                              <p className="text-xs text-gray-300">
                                {gtoData.exploitSuggestion}
                              </p>
                          </div>
                        )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* レンジエディター */}
      {showRangeEditor && (
        (() => { console.log('MTTRangeEditor描画', { showRangeEditor, selectedEditPosition, stackSize, initialRange: customRanges[selectedEditPosition] }); return null; })()
      )}
      {showRangeEditor && (
        <MTTRangeEditor
          position={selectedEditPosition}
          stackSize={parseInt(stackSize.replace('BB', ''))}
          onSaveRange={handleSaveRange}
          onClose={() => setShowRangeEditor(false)}
          initialRange={customRanges[selectedEditPosition]}
        />
      )}

      {/* ハンドセレクター */}
      {showHandSelector && (
        <HandRangeSelector
          onClose={handleCloseHandSelector}
          onSelectHands={handleSelectTrainingHands}
          initialSelectedHands={selectedTrainingHands}
        />
      )}
    </div>
  );
} 
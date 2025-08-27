'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PokerTable, Spot } from '@/components/PokerTable';
import Link from 'next/link';
import { getMTTRange, MTTRangeEditor, HandInfo, HandRangeSelector, HAND_TEMPLATES } from '@/components/HandRange';
import HandRangeViewer from '@/components/HandRangeViewer';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';
import { gtoEvents } from '@/lib/analytics';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

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
  if (!hand || hand.length !== 2) {
    console.log('🎯 normalizeHandType エラー: 無効なハンド', { hand });
    return 'XX';
  }
  
  // カードの形式を確認
  const card1 = hand[0];
  const card2 = hand[1];
  
  if (!card1 || !card2 || card1.length < 1 || card2.length < 1) {
    console.log('🎯 normalizeHandType エラー: 無効なカード形式', { card1, card2 });
    return 'XX';
  }
  
  const rank1 = card1[0];
  const rank2 = card2[0];
  const suit1 = card1[1] || '';
  const suit2 = card2[1] || '';
  
  console.log('🎯 normalizeHandType 詳細入力:', { 
    hand, 
    card1, 
    card2, 
    rank1, 
    rank2, 
    suit1, 
    suit2,
    rank1Length: rank1?.length,
    rank2Length: rank2?.length
  });
  
  // ペアの場合
  if (rank1 === rank2) {
    const result = rank1 + rank2;
    console.log('🎯 normalizeHandType ペア結果:', { result, rank1, rank2 });
    return result;
  }
  
  // ランクの順序を決定（Aが最強、gtoDatabase.tsと一致）
  const rankOrder: Record<string, number> = {
    'A': 0, 'K': 1, 'Q': 2, 'J': 3, 'T': 4, 
    '9': 5, '8': 6, '7': 7, '6': 8, '5': 9, 
    '4': 10, '3': 11, '2': 12
  };
  
  if (rankOrder[rank1] === undefined || rankOrder[rank2] === undefined) {
    console.log('🎯 normalizeHandType エラー: 無効なランク', { rank1, rank2 });
    return 'XX';
  }
  
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
  const suffix = suit1 === suit2 ? 's' : 'o';
  const result = firstRank + secondRank + suffix;
  
  console.log('🎯 normalizeHandType 非ペア結果:', { 
    result, 
    firstRank, 
    secondRank, 
    suffix,
    rank1Order: rankOrder[rank1],
    rank2Order: rankOrder[rank2]
  });
  
  return result;
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
  openerPosition?: string,
  threeBetType?: string
) => {
  console.log('🎯 simulateMTTGTOData 開始:', {
    hand,
    position,
    stackSize,
    actionType,
    openerPosition,
    threeBetType,
    hasCustomRanges: !!customRanges,
    customRangesKeys: customRanges ? Object.keys(customRanges) : [],
    customRangesCount: customRanges ? Object.keys(customRanges).length : 0
  });
  // 手札のランク情報を取得
  const normalizedHandType = normalizeHandType(hand);
  console.log('🎯 simulateMTTGTOData ハンド正規化:', {
    originalHand: hand,
    normalizedHandType,
    handLength: hand.length,
    actionType,
    position,
    stackSize
  });
  
  // ハンドタイプを固定（変更されないようにする）
  const finalHandType = normalizedHandType;
  const rankA = hand[0][0];
  const rankB = hand[1][0];
  const suited = hand[0][1] === hand[1][1];
  
  console.log('🎯 ハンド正規化デバッグ:', {
    originalHand: hand,
    normalizedHandType,
    rankA,
    rankB,
    suited
  });
  
  // 15BBスタック専用の戦略（GTOレンジに基づく）
  const stackDepthBB = parseInt(stackSize.replace('BB', ''));
  
  // SBとBBのスタック調整
  let adjustedStackDepthBB = stackDepthBB;
  if (position === 'SB') {
    adjustedStackDepthBB = stackDepthBB - 0.5; // SBは0.5BBを既にポットに置いている
  } else if (position === 'BB') {
    adjustedStackDepthBB = stackDepthBB - 1.0; // BBは1.0BBを既にポットに置いている
  }
  
  // 変数を関数のスコープで宣言
  let frequencies: { [action: string]: number } = {
    'FOLD': 0,
    'CALL': 0,
    'RAISE': 0,
    'ALL_IN': 0
  };
  let gtoAction: string = 'FOLD';
  let evData: { [action: string]: number } = {
    'FOLD': 0,
    'CALL': -1.2,
    'RAISE': -1.5,
    'ALL_IN': -2.0
  };
  
  // オープンレイズの場合のカスタムレンジ処理
  if (actionType === 'openraise' || actionType === 'open') {
    console.log('🔍 オープンレイズ カスタムレンジ検索開始:', {
      position,
      stackSize,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      customRangesKeys: customRanges ? Object.keys(customRanges) : []
    });
    
    // カスタムレンジが設定されている場合はそれを使用
    let rangeKey: string;
    let fallbackRangeKey: string | null = null;
    
    if (stackSize === '15BB') {
      // 15BBの場合は既存のキー形式を優先
      rangeKey = position;
      fallbackRangeKey = `${position}_15BB`;
    } else {
      // その他のスタックサイズは新しいキー形式を使用
      rangeKey = `${position}_${stackSize}`;
      // 15BBレンジがある場合はフォールバックとして使用
      fallbackRangeKey = position;
    }
    
    console.log('🔍 オープンレイズ レンジキー:', {
      rangeKey,
      fallbackRangeKey,
      stackSize,
      handType: normalizedHandType,
      hasThisRange: !!(customRanges && customRanges[rangeKey]),
      hasFallbackRange: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
      hasThisHand: !!(customRanges && (
        (customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) ||
        (fallbackRangeKey && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType])
      )),
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      openRangeKeys: customRanges ? Object.keys(customRanges).filter(key => 
        key === position || key.startsWith(position + '_') || key === rangeKey
      ) : []
    });
    
    // スタック固有レンジを優先し、フォールバックレンジも確認
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
      console.log('✅ オープンレイズ カスタムレンジ発見 (スタック固有):', { rangeKey, handType: normalizedHandType, customHandData });
    } else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('✅ オープンレイズ フォールバックレンジ使用:', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } else {
      console.log('❌ オープンレイズ カスタムレンジ未発見:', { 
        rangeKey, 
        fallbackRangeKey, 
        handType: normalizedHandType,
        hasCustomRanges: !!customRanges,
        availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
        hasRangeKey: !!(customRanges && customRanges[rangeKey]),
        hasFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
        rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
        fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : []
      });
    }
    
    if (customHandData) {
      // カスタムレンジから頻度データを取得
      console.log('🎯 オープンレイズ カスタムレンジ適用:', { 
        handType: normalizedHandType, 
        customHandData,
        usedRangeKey
      });
      
      let customFrequencies: { [action: string]: number } = {
        'FOLD': 0,
        'CALL': 0,
        'RAISE': 0,
        'ALL_IN': 0
      };
      
      let customPrimaryAction: string = 'FOLD';
      
      if (customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD?: number; CALL?: number; RAISE?: number; ALL_IN?: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
      } else {
        // 単一アクションの場合
        const actionMapping: { [key: string]: string } = {
          'ALL_IN': 'ALL_IN',
          'ALLIN': 'ALL_IN',
          'ALL-IN': 'ALL_IN',
          'MIN': 'RAISE',
          'CALL': 'CALL',
          'FOLD': 'FOLD',
          'RAISE': 'RAISE'
        };
        customPrimaryAction = actionMapping[customHandData.action] || customHandData.action;
        
        // オールインアクションの特別処理
        if (customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
        }
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
      }
      
      // カスタムレンジ用のEVデータを生成
      const customEvData: { [action: string]: number } = {
        'FOLD': 0,
        'CALL': customPrimaryAction === 'CALL' ? 1.5 : -1.0,
        'RAISE': customPrimaryAction === 'RAISE' ? 2.8 : -1.2,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 3.5 : -2.0
      };
      
      console.log('🎯 オープンレイズ カスタム戦略決定:', {
        handType: normalizedHandType,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}でのオープンレイズ戦略です。`,
        stackSizeStrategy: positionAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        strategicAnalysis: `カスタム${stackSize}オープンレイズ: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        exploitSuggestion: getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
        isCustomRange: true, // カスタムレンジ使用を示すフラグ
        usedRangeKey // デバッグ用
      };
    }
  }

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
      frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      evData = { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 };
      
      return {
        correctAction: gtoAction,
        evData: evData,
        frequencies: frequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `❌ 無効なポジション組み合わせ: ${openerPosition} → ${position}`,
        stackSizeStrategy: `${position}ポジションに対して、${openerPosition}からのオープンは無効です。有効なオープンレイザー: ${getValidOpenerPositions(position).join(', ')}`,
        icmConsideration: 'vs オープンでは、オープンレイザーはヒーローより前のポジションである必要があります。',
        recommendedBetSize: 0,
        isInvalidCombination: true,
        errorMessage: `${openerPosition} から ${position} への vs オープンは不可能です。`,
        validOpeners: getValidOpenerPositions(position)
      };
    }
    
    // カスタムレンジが設定されている場合はそれを使用
    // 15BBの場合は既存キーを優先し、新しいキーをフォールバックとして使用
    let rangeKey: string;
    let fallbackRangeKey: string | null = null;
    
    if (stackSize === '15BB') {
      // 15BBの場合は既存のキー形式を優先
      rangeKey = `vsopen_${position}_vs_${openerPosition}`;
      fallbackRangeKey = `vsopen_${position}_vs_${openerPosition}_15BB`;
    } else {
      // その他のスタックサイズは新しいキー形式を使用
      rangeKey = `vsopen_${position}_vs_${openerPosition}_${stackSize}`;
    }
    
    console.log('🔍 vs オープン分析:', {
      rangeKey,
      fallbackRangeKey,
      stackSize,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      hasThisRange: !!(customRanges && customRanges[rangeKey]),
      hasFallbackRange: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
      hasThisHand: !!(customRanges && (
        (customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) ||
        (fallbackRangeKey && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType])
      )),
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      vsopenKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vsopen_')) : [],
      currentRangeData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : null,
      fallbackRangeData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : null
    });
    
    // スタック固有レンジを優先し、15BBの場合は既存レンジにもフォールバック
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
    } else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('15BB互換性: 既存vsオープンレンジを使用', { fallbackRangeKey, handType: normalizedHandType });
    }
    
    if (customHandData) {
      console.log('✅ vs オープン カスタムレンジ使用:', {
        usedRangeKey,
        handType: normalizedHandType,
        customHandData
      });
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合 - vs オープン用の頻度分布を使用
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
        
        // MIXEDアクションの場合は、最大頻度のアクションを主要アクションとして設定
        if (customHandData.action === 'MIXED') {
          customHandData.action = customPrimaryAction as "FOLD" | "CALL" | "RAISE" | "ALL_IN" | "MIXED";
          customHandData.frequency = maxFreqEntry[1];
        }
        
        console.log('🎯 vs open MIXEDアクション処理（修正版）:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction,
          finalAction: customHandData.action,
          finalFrequency: customHandData.frequency
        });
  } else {
        // 単一アクションの場合
        let originalAction = customHandData.action;
        customPrimaryAction = originalAction.replace('ALL_IN', 'ALL_IN');
        
        // MINをRAISEに変換
        if (customPrimaryAction === 'MIN') {
          customPrimaryAction = 'RAISE';
        }
        
        // 頻度データを正しく設定
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
        
        console.log('🎯 vs3bet 単一アクション処理デバッグ:', {
          originalAction: originalAction,
          convertedAction: customPrimaryAction,
          frequency: customHandData.frequency,
          actionKey,
          customFrequencies,
          handType: normalizedHandType
        });
      }
      
      // カスタムレンジ用のEVデータを生成
      const customEvData = {
          'FOLD': 0,
        'CALL': customPrimaryAction === 'CALL' ? 0.8 : -1.0,
        'RAISE': customPrimaryAction === 'RAISE' ? 1.5 : -1.2,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 2.8 : -2.0
      };
      
      console.log('🎯 カスタムレンジ使用:', {
        rangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies,
        correctAction: customPrimaryAction,
        finalFrequencies: customFrequencies
      });
      
      const vsOpenAdvice = getVsOpenAdvice(position, openerPosition, customPrimaryAction, stackDepthBB);
      const currentOpenRaiseSize = openerPosition === 'BTN' && stackSize === '15BB' ? 1.0 : 2.5;
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${openerPosition}からのオープンに対する${position}ポジションでの設定済み戦略です。`,
        stackSizeStrategy: vsOpenAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true,
        isCustomRange: true // カスタムレンジ使用を示すフラグ
      };
    }
    
    // カスタムレンジがない場合のデバッグ情報
    console.log('❌ vs オープン カスタムレンジ未発見:', {
      rangeKey,
      fallbackRangeKey,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      vsopenKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vsopen_')) : []
    });
    
    // カスタムレンジがない場合はデフォルト戦略を使用
    const vsOpenResult = getVsOpenStrategy(normalizedHandType, position, openerPosition, stackDepthBB);
    if (vsOpenResult) {
      gtoAction = vsOpenResult.primaryAction;
      frequencies = vsOpenResult.frequencies;
      evData = vsOpenResult.evData;
      
      const vsOpenAdvice = getVsOpenAdvice(position, openerPosition, gtoAction, stackDepthBB);
      
      // BTNからの15BBスタックの場合はリンプサイズを使用
      const currentOpenRaiseSize = openerPosition === 'BTN' && stackSize === '15BB' ? 1.0 : 2.0;
      
      return {
        correctAction: gtoAction,
        evData: evData,
        frequencies: frequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `${openerPosition}からのオープンに対する${position}ポジションでの最適戦略です。`,
        stackSizeStrategy: vsOpenAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, gtoAction, position),
        recommendedBetSize: gtoAction === 'ALL_IN' ? stackDepthBB : gtoAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true
      };
    }
  }
  
  // vs 3ベットの場合の特別処理
  if (actionType === 'vs3bet') {
    // レンジ外ハンドの処理（vs3bet）
    if (['27o', '37o', '47o', '57o', '67o', '32o', '42o', '52o', '62o', '72o', '82o', '92o', 'T2o', 'J2o', 'Q2o', 'K2o', 'A2o', '23o', '24o', '25o', '26o', '28o', '29o', '2To', '2Jo', '2Qo', '2Ko', '2Ao'].includes(normalizedHandType)) {
      console.log('🎯 レンジ外ハンド検出:', { actionType, normalizedHandType });
      return {
        correctAction: 'FOLD',
        evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
        frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `このハンド(${normalizedHandType})は${actionType}のレンジに含まれていません。`,
        stackSizeStrategy: `レンジ外のハンドは通常フォールドが最適です。`,
        icmConsideration: `レンジ外ハンドの頻度が設定されていません。FOLD 100%が推奨されます。`,
        recommendedBetSize: 0,
        isRangeOut: true,
        exploitSuggestion: `このハンド(${normalizedHandType})は${actionType}のレンジに含まれていません。頻度が設定されていないため、FOLD 100%が推奨されます。`
      };
    }
    
    // vs3betでは3ベッターのポジションが必要（オープンレイザーに対する3ベッターの位置）
    let threeBetterPosition = openerPosition; // URLパラメータで3ベッターが指定されている場合
    if (!threeBetterPosition) {
      // 3ベッターが指定されていない場合はランダムに選択（オープンレイザーより後のポジション）
      const getValidThreeBetters = (openRaiserPos: string): string[] => {
        const openRaiserIndex = getPositionIndex(openRaiserPos);
        if (openRaiserIndex >= POSITION_ORDER.length - 1) return []; // 最後のポジションの場合、後のポジションは存在しない
        return POSITION_ORDER.slice(openRaiserIndex + 1); // オープンレイザーより後のポジションのみ
      };
      
      const validThreeBetters = getValidThreeBetters(position);
      if (validThreeBetters.length === 0) {
        // 有効な3ベッターがいない場合はフォールド
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -3, 'RAISE': -3, 'ALL_IN': -3 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: '❌ 無効なvs3ベット設定: 有効な3ベッターが存在しません',
          stackSizeStrategy: 'vs3ベットには、オープンレイザーより後のポジションの3ベッターが必要です。',
          icmConsideration: 'ポジション設定を確認してください。',
          recommendedBetSize: 0
        };
      }
      
      threeBetterPosition = validThreeBetters[Math.floor(Math.random() * validThreeBetters.length)];
    }
    
    // スタック固有のレンジキーを構築（オープンレイザー vs 3ベッターの形式）
    // UTG+1とUTG1の表記統一
    const normalizedPosition = position === 'UTG+1' ? 'UTG1' : position;
    const normalizedThreeBetterPosition = threeBetterPosition === 'UTG+1' ? 'UTG1' : threeBetterPosition;
    
    // 20BBの場合は3ベットタイプを使用（レイズまたはオールイン）
    let rangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_${stackSize}`;
    
    if (stackSize === '20BB' && threeBetType) {
      const typeSpecificRangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_${threeBetType}_20BB`;
      
      // 20BBの場合は常にタイプ別レンジキーを使用
      rangeKey = typeSpecificRangeKey;
      console.log('🎯 20BB 3ベットタイプ別レンジ使用:', { 
        threeBetType, 
        typeSpecificRangeKey, 
        handType: normalizedHandType 
      });
    }
    
    // 15BBの場合は既存キーとの互換性も確認
    const fallbackRangeKey = stackSize === '15BB' ? `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}` : null;
    
    console.log('🎯 レンジキー正規化:', {
      originalPosition: position,
      originalThreeBetterPosition: threeBetterPosition,
      normalizedPosition,
      normalizedThreeBetterPosition,
      rangeKey,
      fallbackRangeKey
    });
    
    console.log('🔍 vs 3ベット分析:', {
      rangeKey,
      fallbackRangeKey,
      stackSize,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      hasThisRange: !!(customRanges && customRanges[rangeKey]),
      hasFallbackRange: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
      hasThisHand: !!(customRanges && (
        (customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) ||
        (fallbackRangeKey && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType])
      )),
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      // 詳細な検索結果
      rangeKeyExists: !!(customRanges && customRanges[rangeKey]),
      rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
      handInRangeKey: !!(customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]),
      fallbackKeyExists: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
      fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : [],
      handInFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType])
    });
    
    // カスタムレンジの詳細デバッグ
    console.log('🎯 カスタムレンジ詳細デバッグ:', {
      customRangesExists: !!customRanges,
      customRangesKeys: customRanges ? Object.keys(customRanges) : [],
      targetRangeKey: rangeKey,
      targetHandType: normalizedHandType,
      hasTargetRange: !!(customRanges && customRanges[rangeKey]),
      targetRangeData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
      hasTargetHand: !!(customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType])
    });
    
    // スタック固有レンジを優先し、15BBの場合は既存レンジにもフォールバック
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    console.log('🔍 Searching for custom range:', {
      rangeKey,
      fallbackRangeKey,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      customRangesKeys: customRanges ? Object.keys(customRanges) : [],
      targetRangeExists: !!(customRanges && customRanges[rangeKey]),
      targetHandExists: !!(customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType])
    });
    
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
      console.log('🎯 vs3bet カスタムレンジ発見 (スタック固有):', { rangeKey, handType: normalizedHandType, customHandData });
    } else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('🎯 15BB互換性: 既存vs3ベットレンジを使用', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } else {
      // 15BBのvs3ベットの場合の特別なデバッグ
      if (stackSize === '15BB') {
        console.log('🎯 15BB vs3ベット カスタムレンジ未発見の詳細デバッグ:', {
          rangeKey,
          fallbackRangeKey,
          handType: normalizedHandType,
          hasCustomRanges: !!customRanges,
          availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
          vs3betRangeKeys: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs3bet')) : [],
          hasRangeKey: !!(customRanges && customRanges[rangeKey]),
          hasFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
          rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
          fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : [],
          // 15BBのvs3ベットレンジの詳細確認
          has15BBVs3betRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs3bet') && !key.includes('_15BB')).length : 0,
          fifteenBBVs3betRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs3bet') && !key.includes('_15BB')) : [],
          // 現在のレンジキーに一致するレンジが存在するかチェック
          exactMatchExists: customRanges ? Object.keys(customRanges).includes(rangeKey) : false,
          partialMatches: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes(normalizedPosition) && key.includes(normalizedThreeBetterPosition)) : []
        });
      }
      
      // 20BBの場合、タイプ別レンジが見つからない場合のデバッグ
      if (stackSize === '20BB' && threeBetType) {
        console.log('🎯 20BB タイプ別レンジ未発見の詳細デバッグ:', {
          threeBetType,
          rangeKey,
          normalizedHandType,
          availableRangeKeys: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB')) : [],
          matchingRangeKeys: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes(normalizedPosition) && key.includes(normalizedThreeBetterPosition)) : [],
          hasRangeKey: !!(customRanges && customRanges[rangeKey]),
          rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
          // 20BBのタイプ別レンジの詳細確認
          has20BBRaiseRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('raise')).length : 0,
          has20BBAllinRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('allin')).length : 0,
          twentyBBRaiseRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('raise')) : [],
          twentyBBAllinRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('allin')) : [],
          // 現在のレンジキーに一致するレンジが存在するかチェック
          exactMatchExists: customRanges ? Object.keys(customRanges).includes(rangeKey) : false,
          partialMatches: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes(normalizedPosition) && key.includes(normalizedThreeBetterPosition)) : []
        });
      }
      console.log('🎯 vs3bet カスタムレンジ未発見:', { 
        rangeKey, 
        fallbackRangeKey, 
        handType: normalizedHandType,
        hasCustomRanges: !!customRanges,
        availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
        hasRangeKey: !!(customRanges && customRanges[rangeKey]),
        hasFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
        rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
        fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : []
      });
      
      // カスタムレンジが読み込まれていない場合は、強制的に読み込みを試行
      if (!customRanges || Object.keys(customRanges).length === 0) {
        console.log('🎯 カスタムレンジが空のため、ローカルストレージから強制読み込み');
        const localRanges = localStorage.getItem('mtt-custom-ranges');
        if (localRanges) {
          try {
            const parsedRanges = JSON.parse(localRanges);
            console.log('🎯 強制読み込み成功:', {
              rangeKeys: Object.keys(parsedRanges),
              hasTargetRange: !!parsedRanges[rangeKey],
              hasTargetHand: !!(parsedRanges[rangeKey] && parsedRanges[rangeKey][normalizedHandType])
            });
            
            // 強制読み込みしたレンジから該当ハンドを取得
            if (parsedRanges[rangeKey] && parsedRanges[rangeKey][normalizedHandType]) {
              customHandData = parsedRanges[rangeKey][normalizedHandType];
              usedRangeKey = rangeKey;
              console.log('🎯 強制読み込みからカスタムレンジ発見:', { rangeKey, handType: normalizedHandType, customHandData });
            } else if (fallbackRangeKey && parsedRanges[fallbackRangeKey] && parsedRanges[fallbackRangeKey][normalizedHandType]) {
              customHandData = parsedRanges[fallbackRangeKey][normalizedHandType];
              usedRangeKey = fallbackRangeKey;
              console.log('🎯 強制読み込みからフォールバックレンジ発見:', { fallbackRangeKey, handType: normalizedHandType, customHandData });
            }
            
            // カスタムレンジが見つかった場合はログ出力のみ（stateの更新は別途useEffectで処理）
            if (Object.keys(parsedRanges).length > 0) {
              console.log('🔄 強制読み込み成功: カスタムレンジが見つかりました');
            }
          } catch (e) {
            console.log('強制読み込みエラー:', e);
          }
        }
      }
      
      // 強力なハンドの場合は強制的に適切なアクションを設定
      if (!customHandData) {
        // カスタムレンジが見つからない場合は、デフォルト戦略を使用
        console.log('🎯 カスタムレンジ未発見 - デフォルト戦略を使用:', {
          handType: normalizedHandType,
          rangeKey,
          hasCustomRanges: !!customRanges,
          availableRanges: customRanges ? Object.keys(customRanges) : []
        });
        
        // カスタムレンジが見つからない場合は、nullを返してデフォルト戦略に委ねる
        customHandData = null;
      }
    }
    
    if (customHandData) {
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      console.log('🎯 15BB vs3ベット カスタムレンジ処理開始:', {
        customHandData,
        handType: normalizedHandType,
        stackSize,
        actionType,
        rangeKey: usedRangeKey
      });
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        
        // 正確な頻度計算（正規化なしで元の値を保持）
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
        
        // MIXEDアクションの場合は、最大頻度のアクションを主要アクションとして設定
        if (customHandData.action === 'MIXED') {
          customHandData.action = customPrimaryAction;
          customHandData.frequency = maxFreqEntry[1];
        }
        
        console.log('🎯 MIXEDアクション処理（修正版）:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction,
          finalAction: customHandData.action,
          finalFrequency: customHandData.frequency,
          handType: normalizedHandType,
          maxFrequency: maxFreqEntry[1],
          totalFreq: Object.values(customFrequencies).reduce((sum, freq) => sum + freq, 0)
        });
      } else {
        // カスタムレンジの設定を尊重（強制設定を削除）
        console.log('🎯 カスタムレンジ設定を尊重:', {
          handType: normalizedHandType,
          originalAction: customHandData.action,
          originalFrequency: customHandData.frequency,
          isMixed: customHandData.action === 'MIXED'
        });
        // 単一アクションの場合
        customPrimaryAction = customHandData.action;
        
        // オールインアクションの正規化
        if (customHandData.action.toUpperCase().includes('ALL') || 
            customHandData.action.toUpperCase().includes('ALLIN')) {
          customPrimaryAction = 'ALL_IN';
        }
        // MINをRAISEに変換
        else if (customPrimaryAction === 'MIN') {
          customPrimaryAction = 'RAISE';
        }
        
        console.log('🔥 オールイン正規化処理:', {
          originalAction: customHandData.action,
          normalizedAction: customPrimaryAction,
          frequency: customHandData.frequency,
          isAllInAction: customHandData.action.toUpperCase().includes('ALL')
        });
        
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
      }
      
      // 頻度の合計を確認（正規化は行わない）
      const totalFreq = Object.values(customFrequencies).reduce((sum, freq) => sum + freq, 0);
      
      console.log('🎯 カスタムレンジ頻度確認:', {
        frequencies: customFrequencies,
        totalFreq,
        customPrimaryAction,
        handType: normalizedHandType,
        stackSize,
        actionType,
        is15BBVs3bet: stackSize === '15BB' && actionType === 'vs3bet'
      });
      
      // カスタムレンジでFOLD 100%の場合はレンジ外として扱う（15BBのvs3ベットのALLIN無効化処理の前）
      if (customFrequencies['FOLD'] === 100 && !(stackSize === '15BB' && actionType === 'vs3bet' && customFrequencies['ALL_IN'] > 0)) {
        console.log('🎯 カスタムレンジFOLD 100%検出:', { actionType, normalizedHandType, rangeKey });
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: `このハンド(${normalizedHandType})はカスタムレンジでFOLD 100%に設定されています。`,
          stackSizeStrategy: `カスタムレンジでレンジ外として設定されたハンドです。`,
          icmConsideration: `カスタムレンジでFOLD 100%に設定されているため、レンジ外として扱われます。`,
          recommendedBetSize: 0,
          isRangeOut: true,
          exploitSuggestion: `このハンド(${normalizedHandType})はカスタムレンジでFOLD 100%に設定されています。レンジ外として扱われます。`
        };
      }
      


      console.log('🎯 vs3bet カスタムレンジ処理完了:', {
        originalAction: customHandData.action,
        finalAction: customPrimaryAction,
        frequencies: customFrequencies,
        handType: normalizedHandType
      });
      
      // カスタムレンジ用のEVデータを生成
      const customEvData = {
        'FOLD': 0,
        'CALL': customPrimaryAction === 'CALL' ? 1.2 : -1.5,
        'RAISE': customPrimaryAction === 'RAISE' ? 2.8 : -2.0,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 4.5 : -3.0
      };
      
      console.log('🎯 カスタムvs3ベットレンジ使用:', {
        rangeKey: usedRangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies,
        correctAction: customPrimaryAction
      });
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}でのvs 3ベット戦略です。`,
        stackSizeStrategy: `vs 3ベット: カスタム設定により${normalizedHandType}は${customPrimaryAction}が推奨されます。`,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? Math.min(stackDepthBB * 0.7, 25) : 0,
        strategicAnalysis: `カスタムvs3ベット戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        isCustomRange: true,

      };
    }
    
    // カスタムレンジがない場合のみデフォルト戦略を使用
    console.log('🎯 vs3bet カスタムレンジなし - デフォルト戦略使用:', {
      handType: normalizedHandType,
      stackSize,
      hasCustomRanges: !!customRanges,
      availableRangeKeys: customRanges ? Object.keys(customRanges) : []
    });
    
    // 強力なハンドの場合は強制的に適切なアクションを設定（CPUオールイン対応）
    if (normalizedHandType === 'AA') {
      gtoAction = 'ALL_IN';
      frequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 100 };
      console.log('🎯 AAハンド強制ALL IN設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (normalizedHandType === 'KK') {
      gtoAction = 'ALL_IN';
      frequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 100 };
      console.log('🎯 KKハンド強制ALL IN設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (normalizedHandType === 'QQ') {
      // QQは混合戦略（90%オールイン、10%フォールド）
      gtoAction = 'ALL_IN';
      frequencies = { 'FOLD': 10, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 90 };
      console.log('🎯 QQハンド混合戦略設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (['AKs', 'AKo'].includes(normalizedHandType)) {
      gtoAction = 'ALL_IN';
      frequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 100 };
      console.log('🎯 AKハンド強制ALL IN設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (normalizedHandType === 'JJ') {
      // JJは混合戦略（70%コール、30%オールイン）
      gtoAction = 'CALL';
      frequencies = { 'FOLD': 0, 'CALL': 70, 'RAISE': 0, 'ALL_IN': 30 };
      console.log('🎯 JJハンド混合戦略設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (normalizedHandType === 'TT') {
      // TTは混合戦略（60%コール、40%オールイン）
      gtoAction = 'CALL';
      frequencies = { 'FOLD': 0, 'CALL': 60, 'RAISE': 0, 'ALL_IN': 40 };
      console.log('🎯 TTハンド混合戦略設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (['AQs', 'AQo'].includes(normalizedHandType)) {
      // AQは混合戦略（80%コール、20%オールイン）
      gtoAction = 'CALL';
      frequencies = { 'FOLD': 0, 'CALL': 80, 'RAISE': 0, 'ALL_IN': 20 };
      console.log('🎯 AQハンド混合戦略設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else if (normalizedHandType === '99') {
      // 99は混合戦略（50%コール、50%オールイン）
      gtoAction = 'CALL';
      frequencies = { 'FOLD': 0, 'CALL': 50, 'RAISE': 0, 'ALL_IN': 50 };
      console.log('🎯 99ハンド混合戦略設定:', { 
        handType: normalizedHandType, 
        gtoAction, 
        frequencies,
        correctAction: gtoAction,
        primaryFrequency: frequencies[gtoAction]
      });
    } else {
      gtoAction = 'FOLD';
      frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
    }
    

    
    // 頻度の合計を確認（正規化は行わない）
    const totalFreq = Object.values(frequencies).reduce((sum, freq) => sum + freq, 0);
    
    console.log('🎯 デフォルト戦略頻度確認:', {
      handType: normalizedHandType,
      gtoAction,
      frequencies,
      totalFreq
    });
    
    console.log('🎯 vs3bet デフォルト戦略適用:', {
      handType: normalizedHandType,
      gtoAction,
      frequencies,
      stackSize
    });
    
    evData = {
      'FOLD': 0,
      'CALL': gtoAction === 'CALL' ? 1.2 : -1.5,
      'RAISE': gtoAction === 'RAISE' ? 2.8 : -2.0,
      'ALL_IN': gtoAction === 'ALL_IN' ? 4.5 : -3.0
    };
    
    return {
      correctAction: gtoAction,
      evData: evData,
      frequencies: frequencies,
      normalizedHandType: finalHandType,
      effectiveStackExplanation: `${stackSize}スタックでのvs 3ベット戦略です。`,
      stackSizeStrategy: `vs 3ベット: ${normalizedHandType}は${gtoAction}が推奨されます。`,
      icmConsideration: getICMAdvice(stackDepthBB, gtoAction, position),
      recommendedBetSize: gtoAction === 'ALL_IN' ? stackDepthBB : gtoAction === 'RAISE' ? Math.min(stackDepthBB * 0.7, 25) : 0,
      strategicAnalysis: `vs3ベット戦略: ${normalizedHandType}は${gtoAction}が推奨されます。`,
      exploitSuggestion: `vs 3ベットでは、相手の3ベット頻度と4ベットに対する反応を観察して調整しましょう。`,

    };
  }
  
  // vs 4ベットの場合の特別処理
  if (actionType === 'vs4bet') {
    // レンジ外ハンドの処理（vs4bet）
    if (['27o', '37o', '47o', '57o', '67o', '32o', '42o', '52o', '62o', '72o', '82o', '92o', 'T2o', 'J2o', 'Q2o', 'K2o', 'A2o', '23o', '24o', '25o', '26o', '28o', '29o', '2To', '2Jo', '2Qo', '2Ko', '2Ao'].includes(normalizedHandType)) {
      console.log('🎯 レンジ外ハンド検出:', { actionType, normalizedHandType });
      return {
        correctAction: 'FOLD',
        evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
        frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `このハンド(${normalizedHandType})は${actionType}のレンジに含まれていません。`,
        stackSizeStrategy: `レンジ外のハンドは通常フォールドが最適です。`,
        icmConsideration: `レンジ外ハンドの頻度が設定されていません。FOLD 100%が推奨されます。`,
        recommendedBetSize: 0,
        isRangeOut: true,
        exploitSuggestion: `このハンド(${normalizedHandType})は${actionType}のレンジに含まれていません。頻度が設定されていないため、FOLD 100%が推奨されます。`
      };
    }
    
    // vs4betでは4ベッターのポジションが必要（通常はオリジナルのオープンレイザー）
    let fourBetterPosition = openerPosition; // URLパラメータで4ベッターが指定されている場合
    if (!fourBetterPosition) {
      // 4ベッターが指定されていない場合はランダムに選択（3ベッターより前のポジション）
      const getValidFourBetters = (threeBetterPos: string): string[] => {
        const threeBetterIndex = getPositionIndex(threeBetterPos);
        if (threeBetterIndex <= 0) return []; // UTGまたは無効なポジションの場合、前のポジションは存在しない
        return POSITION_ORDER.slice(0, threeBetterIndex); // 3ベッターより前のポジションのみ
      };
      
      const validFourBetters = getValidFourBetters(position);
      if (validFourBetters.length === 0) {
        // 有効な4ベッターがいない場合はフォールド
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: '❌ 無効なvs4ベット設定: 有効な4ベッターが存在しません',
          stackSizeStrategy: 'vs4ベットには、3ベッターより前のポジション（通常オリジナルのオープンレイザー）の4ベッターが必要です。',
          icmConsideration: 'ポジション設定を確認してください。',
          recommendedBetSize: 0
        };
      }
      
      fourBetterPosition = validFourBetters[Math.floor(Math.random() * validFourBetters.length)];
    }
    
    // スタック固有のレンジキーを構築（3ベッター vs 4ベッターの形式）
    const rangeKey = `vs4bet_${position}_vs_${fourBetterPosition}_${stackSize}`;
    // 15BBの場合は既存キーとの互換性も確認
    const fallbackRangeKey = stackSize === '15BB' ? `vs4bet_${position}_vs_${fourBetterPosition}` : null;
    
    console.log('🔍 vs 4ベット分析:', {
      rangeKey,
      fallbackRangeKey,
      stackSize,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      hasThisRange: !!(customRanges && customRanges[rangeKey]),
      hasFallbackRange: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
      hasThisHand: !!(customRanges && (
        (customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) ||
        (fallbackRangeKey && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType])
      )),
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      // 40bbのvs4ベットレンジの詳細確認
      vs4bet40BBRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('40BB')) : [],
      vs4betAllRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('vs4bet')) : [],
      // 特定のレンジキーの詳細確認
      targetRangeData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : null,
      fallbackRangeData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : null
    });
    
    // スタック固有レンジを優先し、15BBの場合は既存レンジにもフォールバック
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
      console.log('✅ vs4ベット スタック固有レンジ発見:', { rangeKey, handType: normalizedHandType, customHandData });
    } else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('15BB互換性: 既存vs4ベットレンジを使用', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } else {
      console.log('❌ vs4ベット カスタムレンジ未発見:', { 
        rangeKey, 
        fallbackRangeKey, 
        handType: normalizedHandType,
        hasRangeKey: !!(customRanges && customRanges[rangeKey]),
        hasFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
        rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
        fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : []
      });
    }
    
    if (customHandData) {
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
        
        console.log('🎯 vs4bet MIXEDアクション処理:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction
        });
      } else {
        // 単一アクションの場合
        customPrimaryAction = customHandData.action.replace('ALL_IN', 'ALL_IN');
        // MINをRAISEに変換
        if (customPrimaryAction === 'MIN') {
          customPrimaryAction = 'RAISE';
        }
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
      }
      
      // カスタムレンジでFOLD 100%の場合はレンジ外として扱う
      if (customFrequencies['FOLD'] === 100) {
        console.log('🎯 カスタムレンジFOLD 100%検出:', { actionType, normalizedHandType, rangeKey });
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: `このハンド(${normalizedHandType})はカスタムレンジでFOLD 100%に設定されています。`,
          stackSizeStrategy: `カスタムレンジでレンジ外として設定されたハンドです。`,
          icmConsideration: `カスタムレンジでFOLD 100%に設定されているため、レンジ外として扱われます。`,
          recommendedBetSize: 0,
          isRangeOut: true,
          exploitSuggestion: `このハンド(${normalizedHandType})はカスタムレンジでFOLD 100%に設定されています。レンジ外として扱われます。`
        };
      }

      console.log('🎯 vs4bet カスタムレンジ処理完了:', {
        originalAction: customHandData.action,
        finalAction: customPrimaryAction,
        frequencies: customFrequencies,
        handType: normalizedHandType
      });
      
      // カスタムレンジ用のEVデータを生成
      const customEvData = {
        'FOLD': 0,
        'CALL': customPrimaryAction === 'CALL' ? 2.0 : -2.5,
        'RAISE': customPrimaryAction === 'RAISE' ? 5.5 : -4.0,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 8.0 : -5.0
      };
      
      console.log('🎯 カスタムvs4ベットレンジ使用:', {
        rangeKey: usedRangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const result = {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}でのvs 4ベット戦略です。`,
        stackSizeStrategy: `vs 4ベット: カスタム設定により${normalizedHandType}は${customPrimaryAction}が推奨されます。`,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? stackDepthBB : 0,
        strategicAnalysis: `カスタムvs4ベット戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        isCustomRange: true
      };
      
      console.log('🎯 vs4bet カスタムレンジ戻り値:', {
        normalizedHandType: result.normalizedHandType,
        originalNormalizedHandType: normalizedHandType,
        resultKeys: Object.keys(result)
      });
      
      return result;
    }
    
    // カスタムレンジがない場合のみデフォルト戦略を使用
    console.log('🎯 vs4bet カスタムレンジなし - デフォルト戦略使用:', {
      handType: normalizedHandType,
      stackSize,
      hasCustomRanges: !!customRanges,
      availableRangeKeys: customRanges ? Object.keys(customRanges) : []
    });
    
    if (['AA', 'KK'].includes(normalizedHandType)) {
      gtoAction = 'ALL_IN';
      frequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 100 };
    } else if (['QQ', 'AKs', 'AKo'].includes(normalizedHandType)) {
      gtoAction = 'CALL';
      frequencies = { 'FOLD': 20, 'CALL': 70, 'RAISE': 0, 'ALL_IN': 10 };
    } else {
      gtoAction = 'FOLD';
      frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
    }
    
    console.log('🎯 vs4bet デフォルト戦略適用:', {
      handType: normalizedHandType,
      gtoAction,
      frequencies,
      stackSize
    });
    
    evData = {
      'FOLD': 0,
      'CALL': gtoAction === 'CALL' ? 2.0 : -2.5,
      'RAISE': gtoAction === 'RAISE' ? 5.5 : -4.0,
      'ALL_IN': gtoAction === 'ALL_IN' ? 8.0 : -5.0
    };
    
    return {
      correctAction: gtoAction,
      evData: evData,
      frequencies: frequencies,
      normalizedHandType: finalHandType,
      effectiveStackExplanation: `${stackSize}スタックでのvs 4ベット戦略です。`,
      stackSizeStrategy: `vs 4ベット: ${normalizedHandType}は${gtoAction}が推奨されます。`,
      icmConsideration: getICMAdvice(stackDepthBB, gtoAction, position),
      recommendedBetSize: gtoAction === 'ALL_IN' ? stackDepthBB : gtoAction === 'RAISE' ? stackDepthBB : 0,
      strategicAnalysis: `vs4ベット戦略: ${normalizedHandType}は${gtoAction}が推奨されます。`,
      exploitSuggestion: `vs 4ベットでは、プレミアムハンド以外はほぼフォールドが基本です。相手の4ベット頻度を観察しましょう。`
    };
  }
  
  // 通常の15BBスタック戦略 - カスタムレンジを優先して使用
  if (stackDepthBB <= 15) {
    // スタックサイズ固有のレンジキーを構築
    const stackSpecificRangeKey = `${position}_${stackSize}`;
    
    console.log('🔍 スタック固有レンジ分析:', {
      position,
      stackSize,
      stackSpecificRangeKey,
      handType: normalizedHandType,
      hasCustomRanges: !!customRanges,
      hasStackSpecificRange: !!(customRanges && customRanges[stackSpecificRangeKey]),
      hasGenericRange: !!(customRanges && customRanges[position]),
      hasThisHand: !!(customRanges && (customRanges[stackSpecificRangeKey] || customRanges[position]) && 
                      ((customRanges[stackSpecificRangeKey] && customRanges[stackSpecificRangeKey][normalizedHandType]) ||
                       (customRanges[position] && customRanges[position][normalizedHandType]))),
      availablePositions: customRanges ? Object.keys(customRanges) : []
    });
    
    // 1. スタックサイズ固有のレンジを優先
    if (customRanges && customRanges[stackSpecificRangeKey] && customRanges[stackSpecificRangeKey][normalizedHandType]) {
      const customHandData = customRanges[stackSpecificRangeKey][normalizedHandType];
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
        
        console.log('🎯 RFI MIXEDアクション処理:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction
        });
      } else {
        // 単一アクションの場合
        const actionMapping: { [key: string]: string } = {
          'ALL_IN': 'ALL_IN',
          'ALLIN': 'ALL_IN',
          'ALL-IN': 'ALL_IN',
          'MIN': 'RAISE',
          'CALL': 'CALL',
          'FOLD': 'FOLD',
          'RAISE': 'RAISE'
        };
        customPrimaryAction = actionMapping[customHandData.action] || customHandData.action;
        
        // オールインアクションの特別処理
        if (customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
        }
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
        'RAISE': customPrimaryAction === 'RAISE' ? 2.5 : -1.2,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 3.2 : -2.0
      };
      
      console.log('🎯 スタック固有カスタムレンジ使用:', {
        rangeKey: stackSpecificRangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}での設定済み戦略です。`,
        stackSizeStrategy: positionAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        strategicAnalysis: `カスタム${stackSize}戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        exploitSuggestion: getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
        isCustomRange: true // カスタムレンジ使用を示すフラグ
      };
    }
    
    // 2. スタック固有のレンジがない場合は汎用ポジションレンジを使用
    if (customRanges && customRanges[position] && customRanges[position][normalizedHandType]) {
      const customHandData = customRanges[position][normalizedHandType];
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
      } else {
        // 単一アクションの場合
        const actionMapping: { [key: string]: string } = {
          'ALL_IN': 'ALL_IN',
          'ALLIN': 'ALL_IN',
          'ALL-IN': 'ALL_IN',
          'MIN': 'RAISE',
          'CALL': 'CALL',
          'FOLD': 'FOLD',
          'RAISE': 'RAISE'
        };
        customPrimaryAction = actionMapping[customHandData.action] || customHandData.action;
        
        // オールインアクションの特別処理
        if (customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
        }
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
        'RAISE': customPrimaryAction === 'RAISE' ? 2.5 : -1.2,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 3.2 : -2.0
      };
      
      console.log('🎯 カスタムレンジ使用 (オープン):', {
        position,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジションでの設定済み15BBオープン戦略です。`,
        stackSizeStrategy: positionAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        strategicAnalysis: `カスタム15BB戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        exploitSuggestion: getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
        isCustomRange: true // カスタムレンジ使用を示すフラグ
      };
    }
  }
  
  // 15BBより深いスタックでもスタック固有のレンジがあれば使用
  if (stackDepthBB > 15) {
    const stackSpecificRangeKey = `${position}_${stackSize}`;
    
    console.log('🔍 深いスタック固有レンジ分析:', {
      position,
      stackSize,
      stackSpecificRangeKey,
      handType: normalizedHandType,
      hasStackSpecificRange: !!(customRanges && customRanges[stackSpecificRangeKey]),
      hasThisHand: !!(customRanges && customRanges[stackSpecificRangeKey] && customRanges[stackSpecificRangeKey][normalizedHandType])
    });
    
    if (customRanges && customRanges[stackSpecificRangeKey] && customRanges[stackSpecificRangeKey][normalizedHandType]) {
      const customHandData = customRanges[stackSpecificRangeKey][normalizedHandType];
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 最大頻度のアクションを主要アクションとする
        const maxFreqEntry = Object.entries(customFrequencies).reduce((max, curr) => 
          curr[1] > max[1] ? curr : max
        );
        customPrimaryAction = maxFreqEntry[0];
        
        console.log('🎯 3bet MIXEDアクション処理:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction
        });
      } else {
        // 単一アクションの場合
        const actionMapping: { [key: string]: string } = {
          'ALL_IN': 'ALL_IN',
          'ALLIN': 'ALL_IN',
          'ALL-IN': 'ALL_IN',
          'MIN': 'RAISE',
          'CALL': 'CALL',
          'FOLD': 'FOLD',
          'RAISE': 'RAISE'
        };
        customPrimaryAction = actionMapping[customHandData.action] || customHandData.action;
        
        // オールインアクションの特別処理
        if (customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
        }
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
        'RAISE': customPrimaryAction === 'RAISE' ? 2.5 : -1.2,
        'ALL_IN': customPrimaryAction === 'ALL_IN' ? 3.2 : -2.0
      };
      
      console.log('🎯 深いスタック固有カスタムレンジ使用:', {
        rangeKey: stackSpecificRangeKey,
        handType: normalizedHandType,
        customHandData,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies
      });
      
      const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}での設定済み戦略です。`,
        stackSizeStrategy: positionAdvice,
        icmConsideration: getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        strategicAnalysis: `カスタム${stackSize}戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        exploitSuggestion: getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
        isCustomRange: true // カスタムレンジ使用を示すフラグ
      };
    }
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
        'ALL_IN': mixedFreq.ALL_IN || 0
      };
      
      // 最大頻度のアクションを主要アクションとする
      const maxFreqEntry = Object.entries(frequencies).reduce((max, curr) => 
        curr[1] > max[1] ? curr : max
      );
      gtoAction = maxFreqEntry[0];
          } else {
      // 単一アクションの場合
      const actionMapping: { [key: string]: string } = {
        'ALL_IN': 'ALL_IN',
        'MIN': 'RAISE',
        'CALL': 'CALL',
        'FOLD': 'FOLD',
        'RAISE': 'RAISE'
      };
      gtoAction = actionMapping[handData.action] || handData.action;
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
      'ALL_IN': gtoAction === 'ALL_IN' ? 3.2 : -2.0
          };
        } else {
    // レンジ外のハンドの場合はフォールド
          gtoAction = 'FOLD';
    frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
    evData = { 'FOLD': 0, 'CALL': -1.5, 'RAISE': -2.0, 'ALL_IN': -2.5 };
  }
  
  console.log('🎯 デフォルト戦略使用:', {
    handType: normalizeHandType(hand),
    position,
    stackSize,
    gtoAction,
    frequencies,
    hasCustomRanges: !!customRanges,
    availableRangeKeys: customRanges ? Object.keys(customRanges) : []
  });
  
  const result = {
    correctAction: gtoAction,
    evData: evData,
    frequencies: frequencies,
    normalizedHandType: finalHandType,
    effectiveStackExplanation: `${stackSize}スタックでのMTTレンジベース戦略です。`,
    stackSizeStrategy: `デフォルトMTTレンジ: ${normalizedHandType}は${gtoAction}が推奨されます。`,
    icmConsideration: 'スタックに余裕があるため標準的な戦略を使用します。',
    recommendedBetSize: gtoAction === 'RAISE' ? 2.5 : 0,
    strategicAnalysis: `${stackSize}戦略: ${finalHandType}は${gtoAction}が推奨されます。`,
    exploitSuggestion: getExploitSuggestion(gtoAction, position, finalHandType)
  };
  
  console.log('🎯 simulateMTTGTOData 最終戻り値:', {
    originalHand: hand,
    finalHandType,
    resultNormalizedHandType: result.normalizedHandType
  });
  
  return result;
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
  
  if (action === 'ALL_IN') {
    return `${positionDesc}からの15BBオールインは、フォールドエクイティを最大化する戦略です。${position === 'UTG' || position === 'UTG1' ? 'アーリーポジションからのオールインは特にタイトなレンジが必要です。' : position === 'BTN' ? 'ボタンからのオールインは最も広いレンジで可能です。' : 'ポジションに応じた適切なレンジでプレイしましょう。'}`;
  } else if (action === 'MIN') {
    return `${positionDesc}からのミニレイズは、スタックを温存しながら主導権を握る戦略です。${stackDepthBB}BBでは、コミット率が高くなるため慎重に選択しましょう。`;
  } else if (action === 'CALL') {
    return `${positionDesc}からのコールは、ポストフロップでの判断を必要とします。15BBでは複雑な判断を避けるため、シンプルなプレイが推奨されます。`;
  } else if (action === '3BB') {
    return `${positionDesc}からの3BBレイズは、ミニレイズよりも強い意思表示です。フォールドエクイティと価値の両方を狙います。`;
          } else {
    return `${positionDesc}からはフォールドが最適です。15BBという貴重なスタックを温存し、より有利な状況を待ちましょう。`;
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
    return `${handType}は${position}ポジションでは一般的にフォールドですが、対戦相手がタイトな場合は時折ブラフとして利用できる可能性があります。`
  }
  if (action === 'RAISE') {
    return `${handType}での${position}からのレイズは、対戦相手の3ベット頻度に応じて調整しましょう。`
  }
  if (action === 'ALL_IN') {
    return `${handType}でのオールインは15BBスタックでは標準的ですが、ICM状況を考慮して調整が必要な場合があります。`
  }
  return `${handType}は${position}ポジションで柔軟性のある戦略を要求します。`
}

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
}

// vsオープン戦略を取得する関数
const getVsOpenStrategy = (handType: string, heroPosition: string, openerPosition: string, stackBB: number) => {
  // 15BB以下での基本的なvsオープン戦略
  if (stackBB <= 15) {
    // プレミアムハンド
    if (['AA', 'KK', 'QQ', 'AKs', 'AKo'].includes(handType)) {
      return {
        frequencies: { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 100 },
        primaryAction: 'ALL_IN',
        evData: { 'FOLD': 0, 'CALL': -1.0, 'RAISE': 1.5, 'ALL_IN': 3.2 }
      };
    }
    
    // 強いハンド
    if (['JJ', 'TT', '99', 'AQs', 'AQo', 'AJs'].includes(handType)) {
      // オープンレイザーのポジションによって調整
      const tightOpeners = ['UTG', 'MP'];
      if (tightOpeners.includes(openerPosition)) {
        return {
          frequencies: { 'FOLD': 30, 'CALL': 20, 'RAISE': 0, 'ALL_IN': 50 },
          primaryAction: 'ALL_IN',
          evData: { 'FOLD': 0, 'CALL': 0.8, 'RAISE': 1.2, 'ALL_IN': 2.5 }
            };
          } else {
        return {
          frequencies: { 'FOLD': 10, 'CALL': 30, 'RAISE': 0, 'ALL_IN': 60 },
          primaryAction: 'ALL_IN',
          evData: { 'FOLD': 0, 'CALL': 1.0, 'RAISE': 1.5, 'ALL_IN': 2.8 }
        };
      }
    }
    
    // 中程度のハンド
    if (['88', '77', '66', 'ATo', 'KQs', 'KQo'].includes(handType)) {
      return {
        frequencies: { 'FOLD': 60, 'CALL': 25, 'RAISE': 0, 'ALL_IN': 15 },
        primaryAction: 'FOLD',
        evData: { 'FOLD': 0, 'CALL': 0.3, 'RAISE': 0.8, 'ALL_IN': 1.8 }
      };
    }
  }
  
  // デフォルト: 弱いハンドはフォールド
  return {
    frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
    primaryAction: 'FOLD',
    evData: { 'FOLD': 0, 'CALL': -1.5, 'RAISE': -2.0, 'ALL_IN': -2.5 }
  };
}

// vsオープンのアドバイスを取得する関数
const getVsOpenAdvice = (heroPosition: string, openerPosition: string, action: string, stackBB: number): string => {
  const positionInfo = `${openerPosition}のオープンに対して${heroPosition}ポジションから`;
  
  if (action === 'ALL_IN') {
    return `${positionInfo}のオールインは15BBスタックでは標準的な戦略です。ICM圧力を考慮して調整してください。`;
  } else if (action === 'CALL') {
    return `${positionInfo}のコールは、フロップでの戦略を事前に計画しておくことが重要です。`;
  } else if (action === 'FOLD') {
    return `${positionInfo}のフォールドは、オープンレイザーのレンジに対して適切な判断です。`;
  }
  
  return `${positionInfo}の戦略は、相手のレンジとポジション優位を考慮して決定されています。`;
}



function MTTTrainingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAdmin, token, user, logout, loading } = useAdmin();
  const { canPractice, practiceCount, maxPracticeCount, incrementPracticeCount } = useAuth();
  
  // URLからシナリオパラメータを取得（簡略化）
  const stackSize = searchParams.get('stack') || '75BB';
  const position = searchParams.get('position') || 'BTN';
  const actionType = searchParams.get('action') || 'openraise';
  
  // URLからカスタム選択ハンドを取得
  const customHandsString = searchParams.get('hands') || '';
  const customHands = customHandsString ? decodeURIComponent(customHandsString).split(',').filter(hand => hand.trim() !== '') : [];
  
  // URLから相手のポジション情報を取得
  const opponentPosition = searchParams.get('opener') || searchParams.get('threebetter') || searchParams.get('fourbetter') || null;
  
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
  const [lastRangeUpdate, setLastRangeUpdate] = useState<number>(0); // レンジ更新タイムスタンプ
  const [isInitialized, setIsInitialized] = useState(false); // 初期化制御フラグ
  
  // vsオープン用レンジエディター関連のstate
  const [selectedVSOpenPosition, setSelectedVSOpenPosition] = useState<string>('BTN');
  const [selectedOpenerPosition, setSelectedOpenerPosition] = useState<string>('CO');
  
  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);
  
  // ハンド選択機能
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [selectedTrainingHands, setSelectedTrainingHands] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // ハンドレンジ表示用のstate
  const [showHandRange, setShowHandRange] = useState<boolean>(false);
  const [showHandRangeViewer, setShowHandRangeViewer] = useState<boolean>(false);
  
  // 現在のスポットのレンジキーを取得する関数
  const getCurrentSpotRangeKey = (): string | null => {
    if (!spot) return null;
    
    const { actionType, heroPosition, stackDepth } = spot;
    
    console.log('🎯 getCurrentSpotRangeKey デバッグ:', {
      actionType,
      heroPosition,
      stackDepth,
      openRaiserPosition: spot.openRaiserPosition,
      threeBetterPosition: spot.threeBetterPosition,
      hasThreeBetterPosition: !!spot.threeBetterPosition,
      hasOpenRaiserPosition: !!spot.openRaiserPosition,
      spotKeys: Object.keys(spot)
    });
    
    if (actionType === 'open' || actionType === 'openraise') {
      // オープンレンジの場合
      if (stackDepth === '15BB') {
        return heroPosition || null; // 15BBの場合はポジション名のみ
      } else {
        return heroPosition && stackDepth ? `${heroPosition}_${stackDepth}` : null; // その他のスタックサイズ
      }
    } else if (actionType === 'vsopen' && spot.openRaiserPosition) {
      // vsオープンレンジの場合
      if (stackDepth === '15BB') {
        return `vsopen_${heroPosition}_vs_${spot.openRaiserPosition}`; // 15BBの場合は既存キー形式
      } else {
        return `vsopen_${heroPosition}_vs_${spot.openRaiserPosition}_${stackDepth}`; // その他のスタックサイズ
      }
    } else if (actionType === 'vs3bet' && spot.threeBetterPosition) {
      // vs3ベットレンジの場合
      const vs3betKey = stackDepth === '15BB' 
        ? `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}` 
        : `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_${stackDepth}`;
      
      console.log('🎯 vs3ベットレンジキー生成:', {
        actionType,
        heroPosition,
        threeBetterPosition: spot.threeBetterPosition,
        stackDepth,
        generatedKey: vs3betKey,
        is15BB: stackDepth === '15BB',
        keyFormat: stackDepth === '15BB' ? '15BB形式（スタックサイズなし）' : 'スタック固有形式'
      });
      
      // 15BBのvs3ベットの場合の特別なデバッグログ
      if (stackDepth === '15BB') {
        console.log('🎯 15BB vs3ベット特別デバッグ:', {
          heroPosition,
          threeBetterPosition: spot.threeBetterPosition,
          generatedKey: vs3betKey,
          expectedKeyFormat: `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}`,
          keyMatches: vs3betKey === `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}`
        });
      }
      
      // 各スタックサイズでのレンジキー生成例をログ出力
      const exampleKeys = {
        '10BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_10BB`,
        '15BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}`,
        '20BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_20BB`,
        '30BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_30BB`,
        '40BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_40BB`,
        '50BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_50BB`,
        '75BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_75BB`,
        '100BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_100BB`
      };
      
      console.log('🎯 vs3ベット全スタックサイズレンジキー例:', exampleKeys);
      
      return vs3betKey;
    } else if (actionType === 'vs4bet' && spot.openRaiserPosition) {
      // vs4ベットレンジの場合（4ベッターはopenRaiserPositionに格納）
      const vs4betKey = stackDepth === '15BB' 
        ? `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}` 
        : `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_${stackDepth}`;
      
      console.log('🎯 vs4ベットレンジキー生成:', {
        actionType,
        heroPosition,
        fourBetterPosition: spot.openRaiserPosition,
        stackDepth,
        generatedKey: vs4betKey,
        is15BB: stackDepth === '15BB',
        keyFormat: stackDepth === '15BB' ? '15BB形式（スタックサイズなし）' : 'スタック固有形式'
      });
      
      // 各スタックサイズでのレンジキー生成例をログ出力
      const exampleKeys = {
        '10BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_10BB`,
        '15BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}`,
        '20BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_20BB`,
        '30BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_30BB`,
        '40BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_40BB`,
        '50BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_50BB`,
        '75BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_75BB`,
        '100BB': `vs4bet_${heroPosition}_vs_${spot.openRaiserPosition}_100BB`
      };
      
      console.log('🎯 vs4ベット全スタックサイズレンジキー例:', exampleKeys);
      
      return vs4betKey;
    }
    
    console.log('🎯 レンジキー生成失敗:', { 
      actionType, 
      heroPosition, 
      stackDepth,
      openRaiserPosition: spot.openRaiserPosition,
      threeBetterPosition: spot.threeBetterPosition,
      hasThreeBetterPosition: !!spot.threeBetterPosition,
      hasOpenRaiserPosition: !!spot.openRaiserPosition,
      reason: actionType === 'vs3bet' ? 'threeBetterPositionが未設定' : 
              actionType === 'vs4bet' ? 'openRaiserPositionが未設定' :
              actionType === 'vsopen' ? 'openRaiserPositionが未設定' : '不明'
    });
    return null;
  };

  // アクションボタンが表示されるかどうかを判定する関数
         const shouldShowAction = (action: string): boolean => {
         if (!spot || !spot.stackDepth) return true;
         
         const { actionType, stackDepth } = spot;
         const stackSizeNum = parseInt(stackDepth.replace('BB', ''));
         
         // 15BBの場合
         if (stackSizeNum === 15 && actionType === 'vs3bet' && (action === 'RAISE' || action === 'ALL_IN')) {
           return false;
         }
         
         // 20BBの場合
         if (stackSizeNum === 20 && actionType === 'vs3bet' && action === 'RAISE') {
           return false;
         }
    
    // 30BBの場合
    if (stackSizeNum === 30) {
      if (actionType === 'vs3bet' && action === 'RAISE') {
        return false;
      } else if (actionType === 'vs4bet' && (action === 'RAISE' || action === 'ALL_IN')) {
        return false;
      }
    }
    
    // 40BBの場合
    if (stackSizeNum === 40) {
      if (actionType === 'vs3bet' && action === 'RAISE') {
        return false;
      } else if (actionType === 'vs4bet' && action === 'RAISE') {
        return false;
      }
    }
    
    // 50BBの場合
    if (stackSizeNum === 50 && actionType === 'vs4bet' && action === 'RAISE') {
      return false;
    }
    
    // 75BBの場合
    if (stackSizeNum === 75 && actionType === 'vs4bet' && action === 'RAISE') {
      return false;
    }
    
    // 100BBの場合
    if (stackSizeNum === 100 && actionType === 'vs4bet' && action === 'RAISE') {
      return false;
    }
    
    return true;
  };

  // アクションボタンの表示テキストを取得する関数
  const getActionButtonText = (action: string): string => {
    if (!spot || !spot.stackDepth) return action;
    
    const { actionType, heroPosition, stackDepth, threeBetterPosition, openRaiserPosition } = spot;
    const stackSizeNum = parseInt(stackDepth.replace('BB', ''));
    
    if (action === 'FOLD') return 'FOLD';
    if (action === 'CALL') return 'CALL';
    
    if (action === 'RAISE') {
      // オープンレイズの場合
      if (actionType === 'open' || actionType === 'openraise') {
        const openRaiseAmounts: Record<string, number> = {
          '10BB': 2.0, '15BB': 2.0, '20BB': 2.0, '30BB': 2.1, 
          '40BB': 2.3, '50BB': 2.3, '75BB': 2.3, '100BB': 2.3
        };
        const amount = openRaiseAmounts[stackDepth] || 2.0;
        return `RAISE ${amount}`;
      }
      
      // vsオープンの場合
      if (actionType === 'vsopen') {
        // 15BBの場合はRAISEボタンが存在しない
        if (stackSizeNum <= 15) return 'RAISE';
        
        // ヒーローのポジションに基づいてレイズ額を決定
        const vsOpenAmounts: Record<string, { default: number; SB: number; BB: number }> = {
          '20BB': { default: 5.0, SB: 5.5, BB: 6.0 },
          '30BB': { default: 6.3, SB: 7.5, BB: 8.2 },
          '40BB': { default: 6.8, SB: 8.6, BB: 9.2 },
          '50BB': { default: 6.9, SB: 9.2, BB: 9.8 },
          '75BB': { default: 8.0, SB: 10.0, BB: 10.3 },
          '100BB': { default: 8.0, SB: 11.0, BB: 11.5 }
        };
        
        const amounts = vsOpenAmounts[stackDepth];
        if (!amounts) return 'RAISE';
        
        let amount: number;
        if (heroPosition === 'SB') {
          amount = amounts.SB;
        } else if (heroPosition === 'BB') {
          amount = amounts.BB;
        } else {
          amount = amounts.default;
        }
        
        return `RAISE ${amount}`;
      }
      
      // vs3ベットの場合
      if (actionType === 'vs3bet') {
        // 15BB、30BB、40BBの場合はRAISEボタンが存在しない
        if (stackSizeNum <= 40) return 'RAISE';
        
        // 50BBの場合
        if (stackSizeNum === 50) {
          // 3ベッターのポジションを確認
          if (threeBetterPosition === 'SB' || threeBetterPosition === 'BB') {
            return 'RAISE'; // ALLINになるため、RAISEボタンは表示されない
          }
          return 'RAISE 16';
        }
        
        // 75BB、100BBの場合
        const vs3betAmounts: Record<string, { default: number; SB: number; BB: number }> = {
          '75BB': { default: 20.9, SB: 21.2, BB: 22.0 },
          '100BB': { default: 21.0, SB: 23.0, BB: 24.0 }
        };
        
        const amounts = vs3betAmounts[stackDepth];
        if (!amounts) return 'RAISE';
        
        // 3ベッターのポジションを確認
        let amount: number;
        if (threeBetterPosition === 'SB') {
          amount = amounts.SB;
        } else if (threeBetterPosition === 'BB') {
          amount = amounts.BB;
        } else {
          amount = amounts.default;
        }
        
        return `RAISE ${amount}`;
      }
      
      // vs4ベットの場合
      if (actionType === 'vs4bet') {
        // 30BB、40BB、50BB、75BB、100BBの場合はRAISEボタンが存在しない
        return 'RAISE';
      }
      
      return 'RAISE';
    }
    
    if (action === 'ALL_IN') {
      return `ALLIN ${stackSizeNum}`;
    }
    
    return action;
  };

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
    // アナリティクス: トレーニング開始を追跡
    gtoEvents.startTraining(position, stackSize, actionType);
    // 最新のカスタムレンジを強制的に読み込み
    const latestLocalRanges = localStorage.getItem('mtt-custom-ranges');
    let latestCustomRanges = customRanges; // 現在のstateから開始
    
    if (latestLocalRanges) {
      try {
        const parsedRanges = JSON.parse(latestLocalRanges);
        if (Object.keys(parsedRanges).length > 0) {
          latestCustomRanges = parsedRanges;
          // stateも同期更新
          if (JSON.stringify(customRanges) !== JSON.stringify(parsedRanges)) {
            setCustomRanges(parsedRanges);
            console.log('🔄 シナリオ生成時にカスタムレンジを同期更新');
          }
        }
      } catch (e) {
        console.log('最新カスタムレンジ取得エラー:', e);
      }
    }
    
    // URLパラメータで特定のハンドが指定されている場合はそれを維持
    const urlHands = searchParams.get('hands') ? decodeURIComponent(searchParams.get('hands')!) : null;
    
    // デバッグ情報を追加
    console.log('🔍 generateNewScenario デバッグ:', {
      urlHands,
      selectedTrainingHandsLength: selectedTrainingHands.length,
      selectedTrainingHands,
      customHandsLength: customHands.length,
      customHands,
      customRangesCount: Object.keys(customRanges).length,
      customRangesKeys: Object.keys(customRanges).slice(0, 5)
    });
    
    // 新しいハンドの生成方法を決定
    let newHand: string[];
    let handType: string;
    
    // URLパラメータのhandsを優先（シナリオ設定から渡されたハンド）
    if (urlHands) {
      // URLパラメータで指定されたハンドを維持
      const handTypes = urlHands.split(',').filter(hand => hand.trim() !== '');
      if (handTypes.length > 0) {
        const randomHandType = handTypes[Math.floor(Math.random() * handTypes.length)];
        newHand = generateHandFromType(randomHandType);
        handType = randomHandType;
        console.log('🎯 URLパラメータハンドを維持:', { urlHands, selectedHandType: randomHandType });
      } else {
        // 空の場合はランダム生成
        newHand = generateMTTHand();
        handType = normalizeHandType(newHand);
      }
    } else if (selectedTrainingHands.length > 0) {
      // 選択されたトレーニングハンドがある場合はその中からランダムに選ぶ
      const randomHandType = selectedTrainingHands[Math.floor(Math.random() * selectedTrainingHands.length)];
      
      // ハンドタイプからカード配列を生成
      newHand = generateHandFromType(randomHandType);
      handType = randomHandType;
      console.log('✅ selectedTrainingHands使用:', { randomHandType, selectedTrainingHands });
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
    
    // vs open, vs3bet, vs4betの場合、相手のポジションを動的に決定
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
    } else if (actionType === 'vs3bet') {
      // vs3betの場合、3ベッターをランダムに選択（オープンレイザーより後のポジション）
      const urlThreeBetter = searchParams.get('threebetter');
      if (urlThreeBetter) {
        const threeBetterIndex = getPositionIndex(urlThreeBetter);
        const positionIndex = getPositionIndex(position);
        if (threeBetterIndex > positionIndex) {
          openerPosition = urlThreeBetter; // vs3betでは3ベッターの情報をopenerPositionパラメータで渡す
        }
      }
      
      if (!openerPosition) {
        const positionIndex = getPositionIndex(position);
        if (positionIndex < POSITION_ORDER.length - 1) {
          const validThreeBetters = POSITION_ORDER.slice(positionIndex + 1);
          if (validThreeBetters.length > 0) {
            openerPosition = validThreeBetters[Math.floor(Math.random() * validThreeBetters.length)];
          }
        }
      }
    } else if (actionType === 'vs4bet') {
      // vs4betの場合、4ベッターをランダムに選択（3ベッターより前のポジション）
      const urlFourBetter = searchParams.get('fourbetter');
      if (urlFourBetter) {
        const fourBetterIndex = getPositionIndex(urlFourBetter);
        const positionIndex = getPositionIndex(position);
        if (fourBetterIndex < positionIndex) {
          openerPosition = urlFourBetter; // vs4betでは4ベッターの情報をopenerPositionパラメータで渡す
        }
      }
      
      if (!openerPosition) {
        const positionIndex = getPositionIndex(position);
        if (positionIndex > 0) {
          const validFourBetters = POSITION_ORDER.slice(0, positionIndex);
          if (validFourBetters.length > 0) {
            openerPosition = validFourBetters[Math.floor(Math.random() * validFourBetters.length)];
          }
        }
      }
    }
    
    // 20BBの場合の3ベットタイプ決定
    let threeBetType: string | undefined;
    if (actionType === 'vs3bet' && stackSize === '20BB') {
      threeBetType = Math.random() < 0.7 ? 'raise' : 'allin'; // 70%がレイズ、30%がオールイン
      console.log('🎯 20BB 3ベットタイプ決定:', { 
        threeBetType, 
        probability: threeBetType === 'raise' ? '70%' : '30%',
        handType: normalizeHandType(newHand)
      });
      
      // 3ベットタイプをグローバルに保存（ポット計算で使用）
      (window as any).currentThreeBetType = threeBetType;
    }
    
    console.log('🎯 シナリオ生成デバッグ:', {
      newHand,
      handType,
      normalizedHandType: normalizeHandType(newHand),
      position,
      stackSize,
      actionType,
      openerPosition,
      threeBetType,
      hasCustomRanges: !!customRanges,
      customRangesCount: customRanges ? Object.keys(customRanges).length : 0,
      customRangesKeys: customRanges ? Object.keys(customRanges) : [],
      // 20BBのレンジ詳細確認
      ...(stackSize === '20BB' && {
        has20BBRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB')).length : 0,
        has20BBRaiseRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('raise')).length : 0,
        has20BBAllinRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('allin')).length : 0,
        twentyBBRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB')) : [],
        twentyBBRaiseRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('raise')) : [],
        twentyBBAllinRanges: customRanges ? Object.keys(customRanges).filter(key => key.includes('20BB') && key.includes('allin')) : []
      }),
      // カスタムレンジの詳細確認（20BB以外の場合）
      ...(stackSize !== '20BB' && {
        vs3betRangeKey: `vs3bet_${position}_vs_${openerPosition}_${stackSize}`,
        hasVs3betRange: !!(customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}_${stackSize}`]),
        vs3betRangeData: customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}_${stackSize}`] ? 
          Object.keys(customRanges[`vs3bet_${position}_vs_${openerPosition}_${stackSize}`]) : []
      })
    });
    
    // MTT特有のGTOデータをシミュレート（簡略化）
    // 最新のカスタムレンジを使用
    const data = simulateMTTGTOData(
      newHand, 
      position, 
      stackSize, 
      actionType as string,
      latestCustomRanges, // 最新のカスタムレンジを渡す
      openerPosition,
      threeBetType
    );
    console.log('🎯 setGtoData直前:', {
      newHand,
      dataNormalizedHandType: data.normalizedHandType,
      dataFrequencies: data.frequencies,
      dataCorrectAction: data.correctAction,
      customRangesKeys: Object.keys(customRanges),
      customRangesCount: Object.keys(customRanges).length,
      isCustomRangeUsed: (data as any)?.isCustomRange
    });
    setGtoData(data);
    
    // レイズ推奨サイズを取得
    const recommendedBetSize = data.recommendedBetSize;
    
    // ポットサイズの計算 - Ante 1BBを含む正確な計算（ポット調整対応）
    let potSize = 1.5;     // デフォルト（SB + BB）
    // 4ベットサイズをスタックサイズに応じて動的に設定
    let fourBetSize = 30; // デフォルト
    if (actionType === 'vs4bet') {
      switch (stackSize) {
        case '10BB':
          fourBetSize = 10;
          break;
        case '15BB':
          fourBetSize = 15;
          break;
        case '20BB':
          fourBetSize = 20;
          break;
        case '30BB':
          fourBetSize = 30;
          break;
        case '40BB':
          fourBetSize = 40;
          break;
        case '50BB':
          fourBetSize = 50;
          break;
        case '75BB':
          fourBetSize = 75;
          break;
        case '100BB':
          fourBetSize = 100;
          break;
        default:
          fourBetSize = 30;
      }
    }
    let openRaiseSize = actionType === 'vs4bet' ? fourBetSize : 2.0; // 4ベットの場合はスタックサイズに応じたサイズ、それ以外は2.0BB
    
    // 4ベットサイズのデバッグログ
    if (actionType === 'vs4bet') {
      console.log('🎯 4ベットサイズ設定:', {
        stackSize,
        fourBetSize,
        openRaiseSize,
        actionType
      });
    }
    let threeBetSize = 6.3; // デフォルトの3ベットサイズ
    
    // ポット調整係数（SBとBBの位置に応じて調整）
    let potAdjustment = 0;
    if (position === 'SB') {
      potAdjustment = -0.5; // SBは0.5BBを既にポットに置いている
    } else if (position === 'BB') {
      potAdjustment = -1.0; // BBは1.0BBを既にポットに置いている
    }
    
    // 20BBスタック固有のサイジング
    if (stackSize === '20BB') {
      if (actionType === 'openraise') {
        openRaiseSize = 2.1;
        potSize = 1.5 + 1; // SB + BB + Ante
      } else if (actionType === 'vsopen') {
        openRaiseSize = 2.1;
        potSize = openRaiseSize + 1.5 + 1; // オープンレイズ + ブラインド + Ante
              } else if (actionType === 'vs3bet') {
          openRaiseSize = 2.1;
          
          // 3ベットタイプに応じて3ベットサイズを決定
          const currentThreeBetType = (window as any).currentThreeBetType;
          console.log('🎯 20BB vs3bet 3ベットタイプ確認:', { currentThreeBetType, openerPosition });
          
          if (currentThreeBetType === 'allin') {
            // オールインの場合は20BB
            threeBetSize = 20;
            console.log('🎯 20BB vs3bet オールイン設定:', { threeBetSize: 20 });
          } else {
            // レイズの場合はポジションに応じて決定
            if (openerPosition === 'SB') {
              threeBetSize = 5.5; // SBの3ベットは5.5BB
            } else if (openerPosition === 'BB') {
              threeBetSize = 6; // BBの3ベットは6BB
            } else {
              threeBetSize = 5; // その他のポジションは5BB
            }
            console.log('🎯 20BB vs3bet レイズ設定:', { threeBetSize, openerPosition });
          }
          console.log(`🎯 20BB vs3bet threeBetSize設定: ${threeBetSize} (${openerPosition})`);
          // 3ベッターのポジションに応じてポットサイズを計算（ポット調整対応）
          if (openerPosition === 'SB') {
            // SBが3ベッターの場合：SBの0.5BBは引っ込めて、3ベット額だけ追加
            // ポットにはBBの1BBが含まれる
            potSize = openRaiseSize + threeBetSize + 1 + 1; // オープン + 3ベット + BB + Ante
          } else if (openerPosition === 'BB') {
            // BBが3ベッターの場合：BBの1BBは既にテーブル上にあるため、3ベット額だけ追加
            // ポットにはSBの0.5BBが含まれる
            potSize = openRaiseSize + threeBetSize + 0.5 + 1; // オープン + 3ベット + SB + Ante
          } else {
            // その他のポジションの場合：通常の計算
            potSize = openRaiseSize + threeBetSize + 0.5 + 1 + 1; // オープン + 3ベット + SB + BB + Ante
          }
          
          // 3ベットタイプに応じてポットサイズを調整
          if (currentThreeBetType === 'allin') {
            console.log('🎯 20BB vs3bet オールインポット調整:', { 
              originalPotSize: potSize, 
              threeBetSize, 
              actionType: 'allin' 
            });
          }
          
          // ポット調整を適用
          potSize += potAdjustment;
          potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
          console.log(`🎯 20BB vs3ベットポット計算:`, {
            openerPosition,
            openRaiseSize,
            threeBetSize,
            sbInPot: openerPosition === 'SB' ? 0 : 0.5,
            bbInPot: openerPosition === 'BB' ? 0 : 1,
            ante: 1,
            total: potSize
          });
          console.log(`🎯 20BB vs3ベット最終ポットサイズ: ${potSize}BB (Ante含む)`);
          
          // ポットサイズの詳細計算をログ出力
          const expectedPot = openerPosition === 'SB' ? 
            openRaiseSize + threeBetSize + 1 + 1 : // 2.1 + 5.5 + 1 + 1 = 9.6
            openerPosition === 'BB' ? 
              openRaiseSize + threeBetSize + 0.5 + 1 : // 2.1 + 6 + 0.5 + 1 = 9.6
              openRaiseSize + threeBetSize + 0.5 + 1 + 1; // 2.1 + 5 + 0.5 + 1 + 1 = 9.6
          console.log(`🎯 20BB vs3ベット期待ポットサイズ: ${expectedPot}BB (計算: ${openRaiseSize} + ${threeBetSize} + ${openerPosition === 'SB' ? '1' : openerPosition === 'BB' ? '0.5' : '0.5+1'} + 1)`);
      } else if (actionType === 'vs4bet') {
        console.log(`🎯 20BB vs4ベット計算開始:`, { stackSize, position, actionType });
        // vs4ベットの正確なポット計算（ポット調整対応）
        if (position === 'SB') {
          // ヒーローがSBの場合、SB(0.5BB)を引っ込めて3ベット
          potSize = 5 + 20 + 1; // 3ベット(5BB) + 4ベット(20BB) + Ante(1BB)
        } else if (position === 'BB') {
          // ヒーローがBBの場合、BB(1BB)を引っ込めて3ベット
          potSize = 5 + 20 + 0.5 + 1; // 3ベット(5BB) + 4ベット(20BB) + SB(0.5BB) + Ante(1BB)
        } else {
          // ヒーローがその他のポジションの場合
          potSize = 5 + 20 + 0.5 + 1 + 1; // 3ベット(5BB) + 4ベット(20BB) + SB(0.5BB) + BB(1BB) + Ante(1BB)
        }
        
        // ポット調整を適用
        potSize += potAdjustment;
        potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        console.log(`🎯 20BB vs4ベットポット計算:`, {
          stackSize,
          heroPosition: position,
          threeBetChip: 5,
          fourBetChip: 20,
          smallBlindChip: position === 'SB' ? 0 : 0.5,
          ante: 1,
          total: potSize
        });
      }
    } else if (stackSize === '30BB') {
      // 30BBスタック固有のサイジング
      if (actionType === 'openraise') {
        openRaiseSize = 2.1;
        potSize = 1.5 + 1; // SB + BB + Ante
      } else if (actionType === 'vsopen') {
        openRaiseSize = 2.1;
        potSize = openRaiseSize + 1.5 + 1; // オープンレイズ + ブラインド + Ante
      } else if (actionType === 'vs3bet') {
        openRaiseSize = 2.1;
        // 3ベッターのポジションに応じて3ベットサイズを決定
        if (openerPosition === 'SB') {
          threeBetSize = 7.5;
        } else if (openerPosition === 'BB') {
          threeBetSize = 8.2;
        } else {
          threeBetSize = 6.3; // UTG+1・LJ・HJ・CO・BTN
        }
        // 3ベッターのポジションに応じてポットサイズを計算（ポット調整対応）
        if (openerPosition === 'SB') {
          // SBが3ベッターの場合：SBの0.5BBは引っ込めて、3ベット額だけ追加
          potSize = openRaiseSize + threeBetSize + 1; // オープン + 3ベット + Ante
        } else if (openerPosition === 'BB') {
          // BBが3ベッターの場合：BBの1BBは引っ込めて、3ベット額だけ追加
          potSize = openRaiseSize + threeBetSize + 1; // オープン + 3ベット + Ante
        } else {
          // その他のポジションの場合：通常の計算
          potSize = openRaiseSize + threeBetSize + 0.5 + 1; // オープン + 3ベット + SB残り + Ante
        }
        
        // ポット調整を適用
        potSize += potAdjustment;
        potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        console.log(`🎯 30BB vs3ベットポット計算:`, {
          openerPosition,
          openRaiseSize,
          threeBetSize,
          sbRemaining: openerPosition === 'SB' ? 0 : 0.5,
          bbRemaining: openerPosition === 'BB' ? 0 : 1,
          ante: 1,
          total: potSize
        });
      } else if (actionType === 'vs4bet') {
        console.log(`🎯 vs4ベット計算開始:`, { stackSize, position, actionType });
        // vs4ベットの正確なポット計算（ポット調整対応）
        if (position === 'SB') {
          // ヒーローがSBの場合、SB(0.5BB)を引っ込めて3ベット
          // 3ベット(6.3BB) + 4ベット(30BB) + Ante(1BB) = 37.3BB
          potSize = 6.3 + 30 + 1; // 3ベット + 4ベット + Ante
        } else if (position === 'BB') {
          console.log(`🎯 BBの場合の計算:`, { stackSize, position });
          // ヒーローがBBの場合、BB(1BB)を引っ込めて3ベット
          // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + Ante(1BB) = 37.8BB
          potSize = 6.3 + 30 + 0.5 + 1; // 3ベット + 4ベット + SB + Ante
          console.log(`🎯 BB計算結果:`, { calculation: '6.3 + 30 + 0.5 + 1', result: potSize });
        } else {
          // ヒーローがその他のポジションの場合
          // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + BB(1BB) + Ante(1BB) = 38.8BB
          potSize = 6.3 + 30 + 0.5 + 1 + 1;
        }
        
        // ポット調整を適用
        potSize += potAdjustment;
        potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        console.log(`🎯 ${stackSize} vs4ベットポット計算:`, {
          stackSize,
          heroPosition: position,
          threeBetChip: 6.3,
          fourBetChip: 30,
          smallBlindChip: position === 'SB' ? 0 : 0.5,
          ante: 1,
          total: potSize
        });
      }
    } else if (stackSize === '40BB') {
      // 40BBスタック固有のサイジング
      if (actionType === 'openraise') {
        openRaiseSize = 2.1;
        potSize = 1.5 + 1; // SB + BB + Ante
      } else if (actionType === 'vsopen') {
        openRaiseSize = 2.1;
        potSize = openRaiseSize + 1.5 + 1; // オープンレイズ + ブラインド + Ante
      } else if (actionType === 'vs3bet') {
        openRaiseSize = 2.1;
        // 3ベッターのポジションに応じて3ベットサイズを決定
        if (openerPosition === 'SB') {
          threeBetSize = 7.5;
        } else if (openerPosition === 'BB') {
          threeBetSize = 8.2;
        } else {
          threeBetSize = 6.3; // UTG+1・LJ・HJ・CO・BTN
        }
        // 3ベッターのポジションに応じてポットサイズを計算（ポット調整対応）
        if (openerPosition === 'SB') {
          // SBが3ベッターの場合：SBの0.5BBは引っ込めて、3ベット額だけ追加
          potSize = openRaiseSize + threeBetSize + 1; // オープン + 3ベット + Ante
        } else if (openerPosition === 'BB') {
          // BBが3ベッターの場合：BBの1BBは引っ込めて、3ベット額だけ追加
          potSize = openRaiseSize + threeBetSize + 1; // オープン + 3ベット + Ante
        } else {
          // その他のポジションの場合：通常の計算
          // SB(0.5BB) + BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2.1BB) + 3ベット(6.3BB) = 10.9BB
          potSize = 0.5 + 1 + 1 + openRaiseSize + threeBetSize;
        }
        
        // ポット調整を適用
        potSize += potAdjustment;
        potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        console.log(`🎯 40BB vs3ベットポット計算:`, {
          openerPosition,
          openRaiseSize,
          threeBetSize,
          sbRemaining: openerPosition === 'SB' ? 0 : 0.5,
          bbRemaining: openerPosition === 'BB' ? 0 : 1,
          ante: 1,
          total: potSize
        });
      } else if (actionType === 'vs4bet') {
        console.log(`🎯 40BB vs4ベット計算開始:`, { stackSize, position, actionType });
        // vs4ベットの正確なポット計算（ポット調整対応）
        if (position === 'SB') {
          // ヒーローがSBの場合、SB(0.5BB)を引っ込めて3ベット
          // 3ベット(6.3BB) + 4ベット(30BB) + Ante(1BB) = 37.3BB
          potSize = 6.3 + 30 + 1; // 3ベット + 4ベット + Ante
        } else if (position === 'BB') {
          console.log(`🎯 40BB BBの場合の計算:`, { stackSize, position });
          // ヒーローがBBの場合、BB(1BB)を引っ込めて3ベット
          // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + Ante(1BB) = 37.8BB
          potSize = 6.3 + 30 + 0.5 + 1; // 3ベット + 4ベット + SB + Ante
          console.log(`🎯 40BB BB計算結果:`, { calculation: '6.3 + 30 + 0.5 + 1', result: potSize });
        } else {
          // ヒーローがその他のポジションの場合
          // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + BB(1BB) + Ante(1BB) = 38.8BB
          potSize = 6.3 + 30 + 0.5 + 1 + 1;
        }
        
        // ポット調整を適用
        potSize += potAdjustment;
        potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        console.log(`🎯 ${stackSize} vs4ベットポット計算:`, {
          stackSize,
          heroPosition: position,
          threeBetChip: 6.3,
          fourBetChip: 30,
          smallBlindChip: position === 'SB' ? 0 : 0.5,
          ante: 1,
          total: potSize
        });
      }
    } else {
      // 他のスタックサイズでの従来の処理
      if (actionType === 'vsopen' && openerPosition === 'BTN' && stackSize === '15BB') {
        openRaiseSize = 1.0; // リンプ
        potSize = openRaiseSize + 1.0 + 1; // リンプ + BB + Ante
      } else if (actionType === 'vsopen' && openerPosition === 'SB' && stackSize === '15BB') {
        openRaiseSize = 1.0; // SBリンプ
        potSize = openRaiseSize + 1.0 + 1; // SBリンプ + BB + Ante
      } else if (actionType === 'vsopen') {
        // 通常のオープンレイズの場合は2.0BBを使用
        potSize = openRaiseSize + 1.5 + 1; // オープンレイズ + ブラインド + Ante
      } else if (actionType === 'openraise') {
        potSize = 1.5 + 1; // SB + BB + Ante
      } else if (actionType === 'vs3bet') {
                  // 15BBのvs3ベットの正確な計算（ポット調整対応）
          if (stackSize === '15BB') {
            // 15BBのvs3ベットの正確な計算
            // 3ベッターのポジションに応じてポット計算を調整
            if (openerPosition === 'SB') {
              // 3ベッターがSBの場合、SB(0.5BB)を引っ込めて3ベット
              // BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 19BB
              potSize = 1 + 1 + 2 + 15;
              console.log(`🎯 vs3bet 15BB SB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '1 + 1 + 2 + 15', potSize });
            } else if (openerPosition === 'BB') {
              // 3ベッターがBBの場合、BB(1BB)を引っ込めて3ベット
              // SB(0.5BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 18.5BB
              potSize = 0.5 + 1 + 2 + 15;
              console.log(`🎯 vs3bet 15BB BB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 2 + 15', potSize });
            } else {
              // 3ベッターがその他のポジションの場合
              // SB(0.5BB) + BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 19.5BB
              potSize = 0.5 + 1 + 1 + 2 + 15;
              console.log(`🎯 vs3bet 15BB その他 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 1 + 2 + 15', potSize });
            }
            
            // ポット調整を適用
            potSize += potAdjustment;
        } else if (stackSize === '40BB') {
          // 40BBのvs3ベットの正確な計算
          // 3ベッターのポジションに応じてポット計算を調整
          if (openerPosition === 'SB') {
            // 3ベッターがSBの場合、SB(0.5BB)を引っ込めて3ベット
            // BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2.1BB) + 3ベット(7.5BB) = 11.6BB
            potSize = 1 + 1 + 2.1 + 7.5;
            console.log(`🎯 vs3bet 40BB SB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '1 + 1 + 2.1 + 7.5', potSize });
          } else if (openerPosition === 'BB') {
            // 3ベッターがBBの場合、BB(1BB)を引っ込めて3ベット
            // SB(0.5BB) + Ante(1BB) + ヒーローのオープンレイズ(2.1BB) + 3ベット(8.2BB) = 11.8BB
            potSize = 0.5 + 1 + 2.1 + 8.2;
            console.log(`🎯 vs3bet 40BB BB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 2.1 + 8.2', potSize });
          } else {
            // 3ベッターがその他のポジションの場合
            // SB(0.5BB) + BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2.1BB) + 3ベット(6.3BB) = 10.9BB
            potSize = 0.5 + 1 + 1 + 2.1 + 6.3;
            console.log(`🎯 vs3bet 40BB その他 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 1 + 2.1 + 6.3', potSize });
          }
          potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
        } else {
          // その他のスタックサイズ
          // 3ベッターのポジションに応じてポット計算を調整
          if (openerPosition === 'SB') {
            // 3ベッターがSBの場合、SB(0.5BB)を引っ込めて3ベット
            // BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 19BB
            potSize = 1 + 1 + 2 + 15;
            console.log(`🎯 vs3bet SB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '1 + 1 + 2 + 15', potSize });
          } else if (openerPosition === 'BB') {
            // 3ベッターがBBの場合、BB(1BB)を引っ込めて3ベット
            // SB(0.5BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 18.5BB
            potSize = 0.5 + 1 + 2 + 15;
            console.log(`🎯 vs3bet BB 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 2 + 15', potSize });
          } else {
            // 3ベッターがその他のポジションの場合
            // SB(0.5BB) + BB(1BB) + Ante(1BB) + ヒーローのオープンレイズ(2BB) + 3ベット(15BB) = 19.5BB
            potSize = 0.5 + 1 + 1 + 2 + 15;
            console.log(`🎯 vs3bet その他 3ベッター計算:`, { stackSize, threeBetterPosition: openerPosition, calculation: '0.5 + 1 + 1 + 2 + 15', potSize });
          }
        }
      } else if (actionType === 'vs4bet') {
        console.log(`🎯 vs4ベット計算開始（その他）:`, { stackSize, position, actionType });
        // vs4ベットの正確なポット計算（その他のスタックサイズ）
        if (stackSize === '40BB') {
          // 40BBのvs4ベットの正確なポット計算
          if (position === 'SB') {
            // ヒーローがSBの場合、SB(0.5BB)を引っ込めて3ベット
            // 3ベット(6.3BB) + 4ベット(30BB) + Ante(1BB) = 37.3BB
            potSize = 6.3 + 30 + 1 + 1; // Ante(1BB)を追加
          } else if (position === 'BB') {
            console.log(`🎯 40BB BBの場合の計算（その他）:`, { stackSize, position });
            // ヒーローがBBの場合、BB(1BB)を引っ込めて3ベット
            // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + Ante(1BB) = 37.8BB
            // BBのブラインド分は引っ込めているので除外
            potSize = 6.3 + 30 + 0.5 + 1 - 1 + 1; // BBのブラインド分(1BB)を除外 + Ante(1BB)を追加
            console.log(`🎯 40BB BB計算結果（その他）:`, { calculation: '6.3 + 30 + 0.5 + 1 - 1', result: potSize });
          } else {
            // ヒーローがその他のポジションの場合
            // 3ベット(6.3BB) + 4ベット(30BB) + SB(0.5BB) + BB(1BB) + Ante(1BB) = 38.8BB
            potSize = 6.3 + 30 + 0.5 + 1 + 1;
          }
          potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
          console.log(`🎯 ${stackSize} vs4ベットポット計算（その他）:`, {
            stackSize,
            heroPosition: position,
            threeBetChip: 6.3,
            fourBetChip: 30,
            smallBlindChip: position === 'SB' ? 0 : 0.5,
            ante: 1,
            total: potSize
          });
        } else {
          // その他のスタックサイズ
          if (position === 'SB') {
            // ヒーローがSBの場合、SB(0.5BB)を引っ込めて3ベット
            potSize = 6.3 + 30 + 1 + 1; // Ante(1BB)を追加
          } else if (position === 'BB') {
            console.log(`🎯 BBの場合の計算（その他）:`, { stackSize, position });
            // ヒーローがBBの場合、BB(1BB)を引っ込めて3ベット
            potSize = 6.3 + 30 + 0.5 + 1 - 1 + 1; // BBのブラインド分(1BB)を除外 + Ante(1BB)を追加
            console.log(`🎯 BB計算結果（その他）:`, { calculation: '6.3 + 30 + 0.5 + 1 - 1', result: potSize });
          } else {
            // ヒーローがその他のポジションの場合
            potSize = 6.3 + 30 + 0.5 + 1 + 1;
          }
          potSize = Math.round(potSize * 10) / 10; // 小数点第1位で丸め処理
          console.log(`🎯 ${stackSize} vs4ベットポット計算（その他）:`, {
            stackSize,
            heroPosition: position,
            threeBetChip: 6.3,
            fourBetChip: 30,
            smallBlindChip: position === 'SB' ? 0 : 0.5,
            ante: 1,
            total: potSize
          });
        }
      } else if (actionType === 'vs5bet') {
        potSize = 70 + 1; // 5ベット + Ante
      }
    }
    
    // スポットデータを作成（簡略化）
    console.log('🎯 スポット作成開始:', {
      actionType,
      stackSize,
      position,
      openerPosition,
      newHand,
      dataCorrectAction: data.correctAction,
      dataFrequencies: data.frequencies,
      dataIsCustomRange: data.isCustomRange,
      dataNormalizedHandType: data.normalizedHandType
    });
    
    const newSpot: Spot = {
      id: Math.random().toString(),
      description: `エフェクティブスタック:${stackSize} - ${
        actionType === 'openraise' ? (
          stackSize === '30BB' ? 'オープンレイズ(2.1BB)' : 'オープンレイズ'
        ) : 
        actionType === 'vsopen' ? (
          openerPosition === 'BTN' && stackSize === '15BB' 
            ? `vs ${openerPosition || 'UTG'}のリンプ(1BB)` 
            : stackSize === '30BB'
              ? `vs ${openerPosition || 'UTG'}のオープン(2.1BB)`
              : `vs ${openerPosition || 'UTG'}のオープン(2.5BB)`
        ) : 
        actionType === 'vs3bet' ? (
          stackSize === '20BB' && openerPosition && (window as any).currentThreeBetType
            ? `vs ${openerPosition}の3ベット(${(window as any).currentThreeBetType === 'allin' ? 'オールイン' : `${threeBetSize}BB`})`
            : stackSize === '30BB' && openerPosition
              ? `vs ${openerPosition}の3ベット(${threeBetSize}BB)`
              : 'vs 3ベット'
        ) : 
        actionType === 'vs4bet' ? 'vs 4ベット' : 
        actionType === 'vs5bet' ? 'vs 5ベット' : 
        'ランダム'
      }`,
      heroPosition: position,
      heroHand: newHand,
      potSize: potSize,
      // ポットサイズのデバッグログ
      ...(actionType === 'vs3bet' && {
        _debug: {
          actionType,
          stackSize,
          openRaiseSize,
          threeBetSize,
          calculatedPotSize: potSize,
          expectedPotSize: openRaiseSize + threeBetSize + 0.5 + 1
        }
      }),
      correctAction: data.correctAction, // 頻度を含めずにアクションのみを保存
      evData: data.evData as { [action: string]: number } | undefined,
      frequencies: data.frequencies, // 頻度データを追加

      correctBetSize: recommendedBetSize,
      // スタック関連の情報を追加
      stackDepth: stackSize,
      // アクションタイプを追加（重要！）
      actionType: actionType,
      // vs オープン用の追加情報
      openRaiserPosition: actionType === 'vs3bet' ? position : 
                         actionType === 'vs4bet' ? openerPosition : openerPosition, // vs4betでは4ベッターがopenRaiserPosition
      openRaiseSize: openRaiseSize, // 計算されたオープンサイズを使用
      // vs3bet用の追加情報
      threeBetSize: (() => {
        if (actionType === 'vs3bet' || actionType === 'vs4bet') {
          if (actionType === 'vs3bet' && stackSize === '15BB') {
            console.log(`🎯 15BB 3ベットサイズ設定: 15`);
            return 15;
          } else if (actionType === 'vs3bet' && stackSize === '20BB') {
            const currentThreeBetType = (window as any).currentThreeBetType;
            if (currentThreeBetType === 'allin') {
              console.log(`🎯 20BB 3ベットサイズ設定: オールイン`);
              return 20;
            } else {
              console.log(`🎯 20BB 3ベットサイズ設定: 5`);
              return 5;
            }
          } else {
            console.log(`🎯 その他 3ベットサイズ設定: ${threeBetSize}`);
            return threeBetSize;
          }
        }
        console.log(`🎯 3ベットサイズ設定なし: undefined`);
        return undefined;
      })(),
      threeBetterPosition: actionType === 'vs3bet' ? openerPosition : 
                          actionType === 'vs4bet' ? position : undefined, // vs4betではヒーローが3ベッター
      // 20BBの場合の3ベットタイプ情報を追加
      threeBetType: actionType === 'vs3bet' && stackSize === '20BB' ? (window as any).currentThreeBetType : undefined,
      // 各ポジションのスタック情報を作成（根本的に確実な方法）
      positions: (() => {
        const stackValue = parseInt(stackSize);
        
        // 3ベッターのスタックを事前計算（SB・BBのブラインド分を考慮）
        let threeBetterStack = stackValue;
        if (actionType === 'vs3bet' && openerPosition) {
          if (stackSize === '15BB') {
            threeBetterStack = 0;
          } else if (stackSize === '20BB') {
            // 3ベッターのポジションに応じて3ベットサイズを決定
            const currentThreeBetType = (window as any).currentThreeBetType;
            let threeBetAmount: number;
            
            if (currentThreeBetType === 'allin') {
              threeBetAmount = 20; // オールインの場合は20BB
              // オールインの場合はスタックが0になる
              threeBetterStack = 0;
              console.log(`🎯 20BB オールイン 3ベッター: スタック = 0 (オールイン完了)`);
            } else {
              if (openerPosition === 'SB') {
                threeBetAmount = 5.5; // SBの3ベットは5.5BB
              } else if (openerPosition === 'BB') {
                threeBetAmount = 6; // BBの3ベットは6BB
              } else {
                threeBetAmount = 5; // その他のポジションは5BB
              }
              
              console.log(`🎯 20BB 3ベッタースタック計算開始: threeBetAmount=${threeBetAmount} (${openerPosition})`);
              // SB・BBの場合はブラインドを戻してからレイズするため、スタックの減り方が異なる
              if (openerPosition === 'SB') {
                // SB: 20BB - 0.5BB(戻す) - 5.5BB(レイズ) = 14BB
                threeBetterStack = 20 - 0.5 - threeBetAmount;
                console.log(`🎯 20BB SB 3ベッター: 20 - 0.5 - ${threeBetAmount} = ${threeBetterStack}`);
              } else if (openerPosition === 'BB') {
                // BB: 20BB - 6BB(レイズ) = 14BB (ブラインドは既にテーブル上にあるため戻す必要なし)
                threeBetterStack = 20 - threeBetAmount;
                console.log(`🎯 20BB BB 3ベッター: 20 - ${threeBetAmount} = ${threeBetterStack}`);
              } else {
                // その他のポジション: 20BB - 5BB(レイズ) = 15BB
                threeBetterStack = 20 - threeBetAmount;
                console.log(`🎯 20BB その他 3ベッター: 20 - ${threeBetAmount} = ${threeBetterStack}`);
              }
            }
          } else if (stackSize === '30BB') {
            // SB・BBの場合はブラインド分を考慮
            if (openerPosition === 'SB') {
              threeBetterStack = 29.5 - threeBetSize; // 30 - 0.5 - threeBetSize
            } else if (openerPosition === 'BB') {
              threeBetterStack = 29 - threeBetSize; // 30 - 1 - threeBetSize
            } else {
              threeBetterStack = 30 - threeBetSize; // その他のポジション
            }
          }
        }
        
        // 各ポジションのスタックを直接設定（SB・BBの3ベッター対応）
        const positions = {
          'UTG': { active: true, stack: openerPosition === 'UTG' ? threeBetterStack : stackValue, isHero: position === 'UTG' },
          'UTG1': { active: true, stack: openerPosition === 'UTG1' ? threeBetterStack : stackValue, isHero: position === 'UTG1' },
          'LJ': { active: true, stack: openerPosition === 'LJ' ? threeBetterStack : stackValue, isHero: position === 'LJ' },
          'HJ': { active: true, stack: openerPosition === 'HJ' ? threeBetterStack : stackValue, isHero: position === 'HJ' },
          'CO': { active: true, stack: openerPosition === 'CO' ? threeBetterStack : stackValue, isHero: position === 'CO' },
          'BTN': { active: true, stack: openerPosition === 'BTN' ? threeBetterStack : stackValue, isHero: position === 'BTN' },
          'SB': { 
            active: true, 
            stack: openerPosition === 'SB' ? threeBetterStack : (stackValue - 0.5), 
            isHero: position === 'SB' 
          },
          'BB': { 
            active: true, 
            stack: openerPosition === 'BB' ? threeBetterStack : (stackValue - 1), 
            isHero: position === 'BB' 
          }
        };
        
        console.log(`🎯 根本的実装: actionType=${actionType}, openerPosition=${openerPosition}, threeBetterStack=${threeBetterStack}, threeBetSize=${threeBetSize}, stackSize=${stackSize}`);
        console.log(`🎯 ${openerPosition}のスタック: ${positions[openerPosition as keyof typeof positions]?.stack || 'N/A'}`);
        console.log(`🎯 20BB vs3bet デバッグ: stackSize=${stackSize}, actionType=${actionType}, threeBetSize=${threeBetSize}, threeBetterStack=${threeBetterStack}`);
        console.log(`🎯 20BB vs3bet 詳細デバッグ:`, {
          stackSize,
          actionType,
          threeBetSize,
          threeBetterStack,
          openerPosition,
          stackValue,
          condition: actionType === 'vs3bet' && openerPosition,
          stackCondition: stackSize === '20BB'
        });
        
        return positions;
      })()
    };
    
    // 20BBのvs3betで3ベットタイプに応じてthreeBetSizeとポットサイズを強制的に設定
    if (actionType === 'vs3bet' && stackSize === '20BB') {
      const currentThreeBetType = (window as any).currentThreeBetType;
      console.log(`🎯 20BB vs3bet 強制設定開始: threeBetType=${currentThreeBetType}, openerPosition=${openerPosition}`);
      
      if (currentThreeBetType === 'allin') {
        // オールインの場合
        newSpot.threeBetSize = 20;
        console.log(`🎯 強制設定: newSpot.threeBetSize = 20 (オールイン)`);
        
        // ポットサイズも強制的に設定（オールイン）
        if (openerPosition === 'SB') {
          newSpot.potSize = 2.1 + 20 + 1 + 1; // 24.1BB (オープン + オールイン + BB + Ante)
        } else if (openerPosition === 'BB') {
          newSpot.potSize = 2.1 + 20 + 0.5 + 1; // 23.6BB (オープン + オールイン + SB + Ante)
        } else {
          newSpot.potSize = 2.1 + 20 + 0.5 + 1 + 1; // 24.6BB (オープン + オールイン + SB + BB + Ante)
        }
      } else {
        // レイズの場合
        if (openerPosition === 'SB') {
          newSpot.threeBetSize = 5.5;
        } else if (openerPosition === 'BB') {
          newSpot.threeBetSize = 6;
        } else {
          newSpot.threeBetSize = 5;
        }
        console.log(`🎯 強制設定: newSpot.threeBetSize = ${newSpot.threeBetSize} (${openerPosition})`);
        
        // ポットサイズも強制的に設定
        if (openerPosition === 'SB') {
          newSpot.potSize = 2.1 + 5.5 + 1 + 1; // 9.6BB (オープン + 3ベット + BB + Ante)
        } else if (openerPosition === 'BB') {
          newSpot.potSize = 2.1 + 6 + 0.5 + 1; // 9.6BB (オープン + 3ベット + SB + Ante)
        } else {
          newSpot.potSize = 2.1 + 5 + 0.5 + 1 + 1; // 9.6BB (オープン + 3ベット + SB + BB + Ante)
        }
      }
      
      newSpot.potSize = Math.round(newSpot.potSize * 10) / 10;
      console.log(`🎯 強制設定: newSpot.potSize = ${newSpot.potSize}BB (Ante含む, ${openerPosition}, ${currentThreeBetType})`);
    }
    
    // 強制的にUIを更新
    const finalSpot = {
      ...newSpot,
      id: Date.now().toString()
    };
    
    console.log('🎯 最終スポット設定:', {
      spotId: finalSpot.id,
      spotCorrectAction: finalSpot.correctAction,
      spotFrequencies: finalSpot.frequencies,

      heroHand: finalSpot.heroHand,
      actionType: finalSpot.actionType,
      stackSize: finalSpot.stackDepth
    });
    
    // 強制的にgtoDataも同じデータで設定
    setGtoData(data);
    
    console.log('🎯 gtoData同期設定:', {
      gtoDataCorrectAction: data.correctAction,
      gtoDataFrequencies: data.frequencies,
      gtoDataIsCustomRange: data.isCustomRange,
      spotCorrectAction: finalSpot.correctAction,
      spotFrequencies: finalSpot.frequencies,
      dataMatch: data.correctAction === finalSpot.correctAction && 
                JSON.stringify(data.frequencies) === JSON.stringify(finalSpot.frequencies),
      // 詳細な比較
      actionMatch: data.correctAction === finalSpot.correctAction,
      frequencyMatch: JSON.stringify(data.frequencies) === JSON.stringify(finalSpot.frequencies),
      dataSource: 'simulateMTTGTOData',
      timestamp: Date.now()
    });
    
    setSpot(finalSpot);
    
    // ハンドレンジ表示をリセット
    setShowHandRange(false);
    setShowHandRangeViewer(false);
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // 初期化（カスタムレンジ読み込み完了後に実行）
  useEffect(() => {
    console.log('🔄 初期化 useEffect 実行:', {
      isInitialized,
      position,
      stackSize,
      actionType,
      customHandsString,
      lastRangeUpdate,
      customRangesCount: Object.keys(customRanges).length
    });

    if (!isInitialized) {
      // カスタムレンジがある場合は読み込み完了を待つ
      const localRanges = localStorage.getItem('mtt-custom-ranges');
      if (localRanges) {
        try {
          const parsedRanges = JSON.parse(localRanges);
          if (Object.keys(parsedRanges).length > 0) {
            // カスタムレンジが存在するが、まだstateに反映されていない場合は待機
            if (Object.keys(customRanges).length === 0) {
              console.log('🔄 カスタムレンジ読み込み待機中 - 初期化を遅延');
              setCustomRanges(parsedRanges);
              // 次のレンダリングサイクルで初期化を実行
              setTimeout(() => {
                generateNewScenario();
                setIsInitialized(true);
              }, 50);
              return;
            }
          }
        } catch (e) {
          console.log('カスタムレンジ確認エラー:', e);
        }
      }

      // カスタムレンジがない場合、または既に読み込み済みの場合は即座に初期化
      generateNewScenario();
      setIsInitialized(true);
    }
  }, [position, stackSize, actionType, customHandsString, isInitialized, customRanges]); // customRanges added to dependencies

  // selectedTrainingHandsの変更を監視して新しいシナリオを生成
  useEffect(() => {
    const urlHands = searchParams.get('hands') ? decodeURIComponent(searchParams.get('hands')!) : null;
    console.log('🔄 selectedTrainingHands useEffect実行:', {
      selectedTrainingHandsLength: selectedTrainingHands.length,
      selectedTrainingHands,
      isInitialized,
      urlHands,
      willGenerateScenario: selectedTrainingHands.length > 0 && isInitialized && !urlHands
    });
    
    // URLパラメータにhandsがない場合のみselectedTrainingHandsを使用
    if (selectedTrainingHands.length > 0 && isInitialized && !urlHands) {
      generateNewScenario();
    }
  }, [selectedTrainingHands, isInitialized, searchParams]);
  
  // 新しいアプローチ: spot変更後にスタックを監視・修正
  useEffect(() => {
    if (spot && spot.actionType === 'vs3bet' && spot.threeBetterPosition && spot.positions) {
      console.log(`🔍 useEffect: vs3ベットスタック監視開始`);
      console.log(`🔍 spot詳細:`, {
        actionType: spot.actionType,
        threeBetterPosition: spot.threeBetterPosition,
        stackDepth: spot.stackDepth,
        threeBetSize: spot.threeBetSize,
        currentStack: spot.positions[spot.threeBetterPosition as keyof typeof spot.positions].stack
      });
      
      // SB・BBの場合はブラインド分を考慮した期待値を計算
      let expectedStack: number;
      if (spot.stackDepth === '15BB') {
        expectedStack = 0;
      } else if (spot.stackDepth === '20BB') {
        // 20BBの場合、3ベットタイプに応じて計算
        const currentThreeBetType = (window as any).currentThreeBetType;
        if (currentThreeBetType === 'allin') {
          // オールインの場合はスタックが0になる
          expectedStack = 0;
          console.log(`🔍 20BB オールイン: expectedStack = 0`);
        } else {
          // レイズの場合
          if (spot.threeBetterPosition === 'SB') {
            expectedStack = 19.5 - (spot.threeBetSize || 0); // 20 - 0.5 - threeBetSize
          } else if (spot.threeBetterPosition === 'BB') {
            expectedStack = 19 - (spot.threeBetSize || 0); // 20 - 1 - threeBetSize
          } else {
            expectedStack = 20 - (spot.threeBetSize || 0); // その他のポジション
          }
          console.log(`🔍 20BB レイズ: expectedStack = ${expectedStack}`);
        }
      } else if (spot.stackDepth === '30BB') {
        if (spot.threeBetterPosition === 'SB') {
          expectedStack = 29.5 - (spot.threeBetSize || 0); // 30 - 0.5 - threeBetSize
        } else if (spot.threeBetterPosition === 'BB') {
          expectedStack = 29 - (spot.threeBetSize || 0); // 30 - 1 - threeBetSize
        } else {
          expectedStack = 30 - (spot.threeBetSize || 0); // その他のポジション
        }
      } else {
        expectedStack = 30 - (spot.threeBetSize || 0);
      }
      const currentStack = spot.positions[spot.threeBetterPosition as keyof typeof spot.positions].stack;
      
      console.log(`🔍 計算詳細: stackDepth=${spot.stackDepth}, threeBetSize=${spot.threeBetSize}, threeBetterPosition=${spot.threeBetterPosition}, expectedStack=${expectedStack}`);
      
      if (currentStack !== expectedStack) {
        console.log(`🚨 スタック不一致を検出: 期待値=${expectedStack}, 現在値=${currentStack}`);
        
        // 新しいspotオブジェクトを作成してスタックを修正
        const correctedSpot = {
          ...spot,
          positions: {
            ...spot.positions,
            [spot.threeBetterPosition]: {
              ...spot.positions[spot.threeBetterPosition as keyof typeof spot.positions],
              stack: expectedStack
            }
          }
        };
        
        console.log(`🔧 スタックを修正: ${spot.threeBetterPosition} = ${expectedStack}`);
        console.log(`🔧 修正後のspot確認:`, {
          threeBetterPosition: correctedSpot.threeBetterPosition,
          stack: correctedSpot.positions[correctedSpot.threeBetterPosition as keyof typeof correctedSpot.positions].stack
        });
        setSpot(correctedSpot);
      } else {
        console.log(`✅ スタックは正しい: ${spot.threeBetterPosition} = ${currentStack}`);
      }
    }
  }, [spot]);
  
  // カスタムレンジをlocalStorageから読み込み（リアルタイム更新対応）
  useEffect(() => {
    console.log('🔄 カスタムレンジ読み込み useEffect 実行:', { lastRangeUpdate, isInitialized });
    
    const savedRanges = localStorage.getItem('mtt-custom-ranges');
    if (savedRanges) {
      try {
        const parsedRanges = JSON.parse(savedRanges);
        
        // 読み込んだデータの基本的なバリデーション
        if (typeof parsedRanges !== 'object' || parsedRanges === null) {
          console.error('❌ 無効なカスタムレンジデータ: オブジェクトではありません');
          localStorage.removeItem('mtt-custom-ranges');
          return;
        }
        
        console.log('📂 localStorageからカスタムレンジを読み込み:', {
          rangeCount: Object.keys(parsedRanges).length,
          rangeKeys: Object.keys(parsedRanges).slice(0, 5),
          lastRangeUpdate
        });
        
        // stateの更新が確実に反映されるようにする
        setCustomRanges(prev => {
          const hasChanged = JSON.stringify(prev) !== JSON.stringify(parsedRanges);
          if (hasChanged) {
            console.log('🔄 カスタムレンジが変更されました - 新しいシナリオを生成予定');
            // 次のレンダリングサイクルでシナリオを生成
            setTimeout(() => {
              if (isInitialized) {
                console.log('🔄 カスタムレンジ読み込み後に新しいシナリオを生成');
                generateNewScenario();
              }
            }, 100);
          }
          return parsedRanges;
        });
        
      } catch (error) {
        console.error('カスタムレンジの読み込みに失敗しました:', error);
      }
    } else {
      console.log('📂 localStorageにカスタムレンジが見つかりません');
    }
  }, [lastRangeUpdate, isInitialized]); // isInitializedを追加
  
  // StorageEventリスナーを追加（他のタブでの変更を検知）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mtt-custom-ranges' && e.newValue) {
        console.log('🔄 他のタブでカスタムレンジが更新されました');
        try {
          const parsedRanges = JSON.parse(e.newValue);
          setCustomRanges(parsedRanges);
          // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
          setLastRangeUpdate(Date.now());
          console.log('✅ 他のタブからの変更を反映しました');
        } catch (error) {
          console.error('他のタブからのレンジ更新の反映に失敗:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // システム全体からレンジデータを自動読み込み（エンタープライズ機能）
  useEffect(() => {
    const loadSystemRanges = async () => {
      // 新しい端末での初回アクセスかどうかをチェック
      const isFirstVisit = !localStorage.getItem('mtt-ranges-timestamp');
      if (isFirstVisit) {
        console.log('🎯 新しい端末での初回アクセスを検出');
      }
      console.log('🎯 カスタムレンジ読み込み開始');
      
      // 保存中でない場合のみ処理を実行
      if (!isSaving) {
        const localRanges = localStorage.getItem('mtt-custom-ranges');
        const localTimestamp = localStorage.getItem('mtt-ranges-timestamp');
        
        // ローカルデータがある場合は一時的に設定（後でAPIと比較）
        if (localRanges) {
          try {
            const parsedRanges = JSON.parse(localRanges);
            if (Object.keys(parsedRanges).length > 0) {
              setCustomRanges(parsedRanges);
              console.log('🎯 ローカルストレージのデータを一時設定:', {
                rangeKeys: Object.keys(parsedRanges),
                rangeCount: Object.keys(parsedRanges).length,
                vsopenKeys: Object.keys(parsedRanges).filter(key => key.startsWith('vsopen_')),
                vs3betKeys: Object.keys(parsedRanges).filter(key => key.startsWith('vs3bet_')),
                vs4betKeys: Object.keys(parsedRanges).filter(key => key.startsWith('vs4bet_')),
                sampleVsopenRange: Object.keys(parsedRanges).filter(key => key.startsWith('vsopen_'))[0] ? 
                  Object.keys(parsedRanges[Object.keys(parsedRanges).filter(key => key.startsWith('vsopen_'))[0]]) : null
              });
              // ローカルデータがあってもAPIとの同期を続行
            }
          } catch (e) {
            console.log('ローカルストレージ解析エラー:', e);
          }
        }
      }
      
      try {
        // APIからの読み込みを試行（常に実行）
        console.log('🎯 システムAPIからの読み込みを試行');
        const response = await fetch('/api/mtt-ranges');
        if (response.ok) {
          const systemData = await response.json();
          
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            const localRanges = localStorage.getItem('mtt-custom-ranges');
            const localTimestamp = localStorage.getItem('mtt-ranges-timestamp');
            let shouldUpdate = false;
            
            console.log('🎯 システムAPIデータ確認:', {
              systemRangeCount: Object.keys(systemData.ranges).length,
              systemLastUpdated: systemData.lastUpdated,
              localRangeCount: localRanges ? Object.keys(JSON.parse(localRanges)).length : 0,
              localTimestamp: localTimestamp
            });
            
            if (!localRanges || isFirstVisit) {
              shouldUpdate = true;
              console.log('🎯 ローカルデータがないか初回アクセスのため更新');
            } else {
              // タイムスタンプベースで更新チェック
              if (!localTimestamp || (systemData.lastUpdated && systemData.lastUpdated > localTimestamp)) {
                shouldUpdate = true;
                console.log('🎯 タイムスタンプが新しいため更新');
              }
              // 数量ベースのフォールバック
              else if (Object.keys(systemData.ranges).length > Object.keys(JSON.parse(localRanges)).length) {
                shouldUpdate = true;
                console.log('🎯 システムデータの方が多いため更新');
              } else {
                console.log('🎯 システムデータは最新です');
              }
            }
            
            if (shouldUpdate) {
              // QQ設定の復元保証
              const vs3betKeys = Object.keys(systemData.ranges).filter(key => key.startsWith('vs3bet_') && key.includes('_40BB'));
              vs3betKeys.forEach(key => {
                if (!systemData.ranges[key]['QQ']) {
                  console.log(`🎯 システムAPIからQQ設定を復元: ${key}`);
                  systemData.ranges[key]['QQ'] = {
                    action: 'MIXED' as const,
                    mixedFrequencies: { FOLD: 0, CALL: 0, MIN: 10, ALL_IN: 90 }
                  };
                }
              });
              
              setCustomRanges(systemData.ranges);
              localStorage.setItem('mtt-custom-ranges', JSON.stringify(systemData.ranges));
              localStorage.setItem('mtt-ranges-timestamp', systemData.lastUpdated || new Date().toISOString());
              console.log('✅ システムAPIからレンジデータを自動同期しました（QQ復元済み）');
              console.log('🎯 システムAPIレンジ詳細:', {
                rangeKeys: Object.keys(systemData.ranges),
                rangeCount: Object.keys(systemData.ranges).length,
                qqRestored: vs3betKeys.filter(key => systemData.ranges[key]['QQ']).length,
                sampleRange: Object.keys(systemData.ranges)[0] ? systemData.ranges[Object.keys(systemData.ranges)[0]] : null
              });
              return; // API読み込み成功時は終了
            } else {
              console.log('📋 システムレンジは最新です');
            }
          } else {
            console.log('❌ システムAPIにレンジデータがありません');
          }
        } else {
          console.log('❌ システムAPIからの読み込みに失敗:', response.status, response.statusText);
        }
        
        // API読み込みが失敗した場合の処理
        console.log('❌ APIからの読み込みに失敗しました。ローカルデータまたはファイルデータを使用します。');
        
        // APIからの読み込みが失敗した場合、データファイルから直接読み込み
        console.log('ローカルデータがないため、データファイルから読み込みます...');
        const fileResponse = await fetch('/data/mtt-ranges.json');
        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          
          if (fileData.ranges && Object.keys(fileData.ranges).length > 0) {
            const localRanges = localStorage.getItem('mtt-custom-ranges');
            const localTimestamp = localStorage.getItem('mtt-ranges-timestamp');
            let shouldUpdate = false;
            
            if (!localRanges) {
              shouldUpdate = true;
            } else {
              // タイムスタンプベースで更新チェック
              if (!localTimestamp || (fileData.lastUpdated && fileData.lastUpdated > localTimestamp)) {
                shouldUpdate = true;
              }
              // 数量ベースのフォールバック
              else if (Object.keys(fileData.ranges).length > Object.keys(JSON.parse(localRanges)).length) {
                shouldUpdate = true;
              }
            }
            
            if (shouldUpdate) {
              // QQ設定の復元保証
              const vs3betKeys = Object.keys(fileData.ranges).filter(key => key.startsWith('vs3bet_') && key.includes('_40BB'));
              vs3betKeys.forEach(key => {
                if (!fileData.ranges[key]['QQ']) {
                  console.log(`🎯 ファイルからQQ設定を復元: ${key}`);
                  fileData.ranges[key]['QQ'] = {
                    action: 'MIXED' as const,
                    mixedFrequencies: { FOLD: 0, CALL: 0, RAISE: 10, ALL_IN: 90 }
                  };
                }
              });
              
              setCustomRanges(fileData.ranges);
              localStorage.setItem('mtt-custom-ranges', JSON.stringify(fileData.ranges));
              localStorage.setItem('mtt-ranges-timestamp', fileData.lastUpdated || new Date().toISOString());
              console.log(`✅ データファイルからレンジデータを自動同期しました（QQ復元済み、${Object.keys(fileData.ranges).length}ポジション）`);
              console.log('🎯 ファイルレンジ詳細:', {
                rangeKeys: Object.keys(fileData.ranges),
                rangeCount: Object.keys(fileData.ranges).length,
                qqRestored: vs3betKeys.filter(key => fileData.ranges[key]['QQ']).length,
                sampleRange: Object.keys(fileData.ranges)[0] ? fileData.ranges[Object.keys(fileData.ranges)[0]] : null
              });
            } else {
              console.log('📋 ファイルレンジは最新です');
            }
          }
        }
      } catch (error) {
        console.log('自動レンジ読み込みエラー:', (error as Error).message);
        
        // フォールバック: 緊急時の最小限のレンジ
        const localRanges = localStorage.getItem('mtt-custom-ranges');
        if (!localRanges) {
          console.log('緊急フォールバック: 基本レンジを設定します');
          // 必要最小限のレンジを設定（QQの完全な設定を復元）
          const fallbackRanges: Record<string, Record<string, HandInfo>> = {
            'vs3bet_HJ_vs_CO_40BB': { 
              'QQ': { 
                action: 'MIXED' as const, 
                frequency: 100,
                mixedFrequencies: { FOLD: 0, CALL: 0, MIN: 10, ALL_IN: 90 } 
              } 
            },
            'vs3bet_UTG1_vs_SB_40BB': {
              'QQ': {
                action: 'MIXED' as const,
                frequency: 100,
                mixedFrequencies: { FOLD: 0, CALL: 0, MIN: 10, ALL_IN: 90 }
              }
            },
            'vs3bet_LJ_vs_BB_40BB': {
              'QQ': {
                action: 'MIXED' as const,
                frequency: 100,
                mixedFrequencies: { FOLD: 0, CALL: 0, MIN: 10, ALL_IN: 90 }
              }
            }
          };
          setCustomRanges(fallbackRanges);
          console.log('🎯 緊急フォールバックレンジ設定:', fallbackRanges);
        } else {
          // ローカルストレージから読み込み（QQ設定の復元保証）
          try {
            const parsedRanges = JSON.parse(localRanges);
            
            // QQ設定が消えている場合は復元
            const vs3betKeys = Object.keys(parsedRanges).filter(key => key.startsWith('vs3bet_') && key.includes('_40BB'));
            vs3betKeys.forEach(key => {
              if (!parsedRanges[key]['QQ']) {
                console.log(`🎯 QQ設定を復元: ${key}`);
                parsedRanges[key]['QQ'] = {
                  action: 'MIXED' as const,
                  mixedFrequencies: { FOLD: 0, CALL: 0, RAISE: 10, ALL_IN: 90 }
                };
              }
            });
            
            setCustomRanges(parsedRanges);
            console.log('🎯 ローカルストレージからレンジ読み込み（QQ復元済み）:', {
              rangeKeys: Object.keys(parsedRanges),
              hasVs3betRange: !!parsedRanges['vs3bet_HJ_vs_CO_40BB'],
              vs3betRangeData: parsedRanges['vs3bet_HJ_vs_CO_40BB'] ? Object.keys(parsedRanges['vs3bet_HJ_vs_CO_40BB']) : [],
              qqRestored: vs3betKeys.filter(key => parsedRanges[key]['QQ']).length
            });
          } catch (e) {
            console.log('ローカルストレージ解析エラー:', e);
          }
        }
      }
    };

      // 初回読み込み
  loadSystemRanges();
  
  // カスタムレンジの読み込み状況を確認
  console.log('🎯 カスタムレンジ読み込み状況確認:', {
    hasCustomRanges: !!customRanges,
    customRangesKeys: customRanges ? Object.keys(customRanges) : [],
    customRangesCount: customRanges ? Object.keys(customRanges).length : 0,
    localStorageRanges: localStorage.getItem('mtt-custom-ranges') ? '存在' : 'なし',
    localStorageTimestamp: localStorage.getItem('mtt-ranges-timestamp') || 'なし',
    vs3betKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_')) : [],
    vs3betCount: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_')).length : 0
  });
  
  // カスタムレンジの変更を監視（デバッグ用）
  console.log('🎯 カスタムレンジ変更監視開始:', {
    currentRanges: Object.keys(customRanges),
    currentCount: Object.keys(customRanges).length
  });
    
    // 定期的にレンジの更新をチェック（30秒間隔）- 保存直後はスキップ
    const intervalId = setInterval(() => {
      // 保存中または保存直後の場合はスキップ
      if (isSaving) {
        console.log('保存中のため、自動更新をスキップします');
        return;
      }
      
      // 最後の保存から30秒以内の場合はスキップ
      const lastSaveTime = localStorage.getItem('mtt-ranges-timestamp');
      if (lastSaveTime) {
        const timeSinceLastSave = Date.now() - new Date(lastSaveTime).getTime();
        if (timeSinceLastSave < 30000) {
          console.log('保存直後のため、自動更新をスキップします');
          return;
        }
      }
      loadSystemRanges();
    }, 30000);

    // クリーンアップ
    return () => clearInterval(intervalId);
  }, []);
  
  // カスタムレンジの変更を監視
  useEffect(() => {
    if (Object.keys(customRanges).length > 0) {
      console.log('🎯 カスタムレンジ変更検出:', {
        rangeKeys: Object.keys(customRanges),
        rangeCount: Object.keys(customRanges).length,
        timestamp: new Date().toISOString()
      });
    }
  }, [customRanges]);

  // ストレージイベントリスナーを追加（他のタブでの変更を検知）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mtt-custom-ranges' && e.newValue) {
        try {
          const parsedRanges = JSON.parse(e.newValue);
          console.log('📂 他のタブからカスタムレンジ更新を検知:', parsedRanges);
          setCustomRanges(parsedRanges);
          setLastRangeUpdate(Date.now());
        } catch (error) {
          console.error('ストレージ変更の解析に失敗しました:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 自動バックアップ機能（1時間ごと）
  useEffect(() => {
    const autoBackup = () => {
      const currentRanges = localStorage.getItem('mtt-custom-ranges');
      if (currentRanges && Object.keys(JSON.parse(currentRanges)).length > 0) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const backupKey = `mtt-custom-ranges-auto-backup-${timestamp}`;
          localStorage.setItem(backupKey, currentRanges);
          
          // 古い自動バックアップを削除（最新の5個のみ保持）
          const autoBackupKeys = Object.keys(localStorage).filter(key => 
            key.startsWith('mtt-custom-ranges-auto-backup-')
          ).sort().reverse();
          
          if (autoBackupKeys.length > 5) {
            autoBackupKeys.slice(5).forEach(key => {
              localStorage.removeItem(key);
              console.log('🗑️ 古い自動バックアップを削除:', key);
            });
          }
          
          console.log('💾 自動バックアップを作成:', backupKey);
        } catch (error) {
          console.error('自動バックアップ作成に失敗:', error);
        }
      }
    };

    // 初回バックアップ
    autoBackup();
    
    // 1時間ごとにバックアップ
    const interval = setInterval(autoBackup, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);



  
  // レンジエディターのハンドラー関数
  // レンジデータのバリデーション関数
  const validateRangeData = (rangeData: Record<string, HandInfo>): boolean => {
    try {
      if (!rangeData || typeof rangeData !== 'object') {
        console.error('レンジデータが無効です: データがオブジェクトではありません');
        return false;
      }

      for (const [hand, handInfo] of Object.entries(rangeData)) {
        if (!handInfo || typeof handInfo !== 'object') {
          console.error(`レンジデータが無効です: ${hand}のデータが無効です`);
          return false;
        }

        if (typeof handInfo.action !== 'string' || 
            typeof handInfo.frequency !== 'number' ||
            handInfo.frequency < 0 || handInfo.frequency > 100) {
          console.error(`レンジデータが無効です: ${hand}のaction(${handInfo.action})またはfrequency(${handInfo.frequency})が無効です`);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('レンジデータのバリデーション中にエラーが発生しました:', error);
      return false;
    }
  };

  const handleSaveRange = async (position: string, rangeData: Record<string, HandInfo>) => {
    // データの妥当性をチェック
    if (!validateRangeData(rangeData)) {
      console.error('❌ レンジデータのバリデーションに失敗しました');
      setIsSaving(false);
      return;
    }

    console.log('🎯 保存開始:', { 
      position, 
      rangeDataKeys: Object.keys(rangeData), 
      rangeDataSize: Object.keys(rangeData).length,
      is20BB: position.includes('20BB'),
      threeBetType: position.includes('raise') ? 'raise' : position.includes('allin') ? 'allin' : 'none'
    });
    
    setIsSaving(true);
    
    const newCustomRanges = {
      ...customRanges,
      [position]: rangeData
    };
    
    // 15BBスタック固有のレンジキーの場合、既存の互換性も保つ
    if (position.endsWith('_15BB')) {
      const basePosition = position.replace('_15BB', '');
      newCustomRanges[basePosition] = rangeData; // 既存のレンジキーも更新
      console.log('15BB互換性: 既存レンジキーも更新', { basePosition, position });
    }
    // vsオープンレンジで15BBの場合の互換性も保つ
    else if (position.includes('vsopen_') && position.endsWith('_15BB')) {
      const baseVsOpenKey = position.replace('_15BB', '');
      newCustomRanges[baseVsOpenKey] = rangeData; // 既存のvsオープンレンジキーも更新
      console.log('15BB互換性: 既存vsオープンレンジキーも更新', { baseVsOpenKey, position });
    }
    // vsオープンレンジで15BBの既存キー形式の場合、新しいキー形式も更新
    else if (position.includes('vsopen_') && !position.includes('_15BB') && stackSize === '15BB') {
      const newVsOpenKey = `${position}_15BB`;
      newCustomRanges[newVsOpenKey] = rangeData; // 新しいvsオープンレンジキーも更新
      console.log('15BB互換性: 新しいvsオープンレンジキーも更新', { newVsOpenKey, position });
    }
    // vs3ベットレンジで15BBの場合の互換性も保つ (例: vs3bet_UTG_vs_BTN_15BB → vs3bet_UTG_vs_BTN)
    else if (position.startsWith('vs3bet_') && position.endsWith('_15BB')) {
      const baseVs3BetKey = position.replace('_15BB', '');
      newCustomRanges[baseVs3BetKey] = rangeData; // 既存のvs3ベットレンジキーも更新
      console.log('15BB互換性: 既存vs3ベットレンジキーも更新', { baseVs3BetKey, position });
    }
    // vs4ベットレンジで15BBの場合の互換性も保つ (例: vs4bet_BTN_vs_UTG_15BB → vs4bet_BTN_vs_UTG)
    else if (position.startsWith('vs4bet_') && position.endsWith('_15BB')) {
      const baseVs4BetKey = position.replace('_15BB', '');
      newCustomRanges[baseVs4BetKey] = rangeData; // 既存のvs4ベットレンジキーも更新
      console.log('15BB互換性: 既存vs4ベットレンジキーも更新', { baseVs4BetKey, position });
    }
    // vs4ベットレンジで他のスタックサイズの場合の処理
    else if (position.startsWith('vs4bet_') && !position.endsWith('_15BB')) {
      // vs4ベットレンジはそのまま保存（例: vs4bet_BTN_vs_UTG_40BB）
      newCustomRanges[position] = rangeData;
      console.log('vs4ベットレンジ保存:', { position, stackSize });
    }
    // 他のスタックサイズでポジション名のみが指定された場合は、現在のスタックサイズのレンジキーを使用
    else if (!position.includes('_') && !position.startsWith('vsopen_') && stackSize !== '15BB') {
      const stackSpecificKey = `${position}_${stackSize}`;
      newCustomRanges[stackSpecificKey] = rangeData;
      delete newCustomRanges[position]; // ポジション名のみのキーは削除
      console.log('スタック固有レンジ保存', { position, stackSpecificKey });
    }
    
    setCustomRanges(newCustomRanges);
    
    // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
    setLastRangeUpdate(Date.now());
    
    // localStorageに安全に保存
    try {
      const dataToSave = JSON.stringify(newCustomRanges);
      
      // データサイズをチェック（5MBを超える場合は警告）
      if (dataToSave.length > 5 * 1024 * 1024) {
        console.warn('⚠️ データサイズが大きすぎます:', dataToSave.length, 'bytes');
      }
      
      localStorage.setItem('mtt-custom-ranges', dataToSave);
      localStorage.setItem('mtt-ranges-timestamp', new Date().toISOString());
      console.log(`✅ ${position}ポジションのカスタムレンジを保存しました`);
      console.log('🎯 保存詳細:', {
        position,
        rangeKeys: Object.keys(newCustomRanges),
        savedRangeKeys: Object.keys(rangeData),
        localStorageSize: JSON.stringify(newCustomRanges).length,
        timestamp: new Date().toISOString(),
        // 20BBのレンジが正しく保存されているかを確認
        has20BBRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB')).length,
        twentyBBRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB')),
        // 20BBのタイプ別レンジの詳細確認
        has20BBRaiseRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB') && key.includes('raise')).length,
        has20BBAllinRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB') && key.includes('allin')).length,
        twentyBBRaiseRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB') && key.includes('raise')),
        twentyBBAllinRanges: Object.keys(newCustomRanges).filter(key => key.includes('20BB') && key.includes('allin')),
        // 40BBのvs4ベットレンジの詳細確認
        has40BBRanges: Object.keys(newCustomRanges).filter(key => key.includes('40BB')).length,
        fortyBBRanges: Object.keys(newCustomRanges).filter(key => key.includes('40BB')),
        vs4bet40BBRanges: Object.keys(newCustomRanges).filter(key => key.includes('vs4bet') && key.includes('40BB')),
        vs4betAllRanges: Object.keys(newCustomRanges).filter(key => key.includes('vs4bet'))
      });
      
      // 保存完了後、少し待ってからフラグをリセット
      setTimeout(() => {
        setIsSaving(false);
        console.log('🎯 保存フラグをリセットしました');
      }, 2000);
    } catch (error) {
      console.error('❌ カスタムレンジの保存に失敗しました:', error);
      setIsSaving(false);
    }
    
    // 管理者認証済みならAPIにも自動保存（全プレイヤーに即座に反映）
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
          console.log(`✅ システム全体に自動保存完了: ${result.metadata.totalPositions}ポジション、${result.metadata.totalHands}ハンド`);
        } else {
          const error = await response.json();
          console.error('システム保存エラー:', error.error || '保存に失敗しました');
        }
      } catch (error) {
        console.error('システム保存エラー:', error);
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
          // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
          setLastRangeUpdate(Date.now());
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
    if (confirm('全てのカスタムレンジを削除しますか？この操作は取り消せません。\n\n⚠️ 注意: この操作は元に戻せません。')) {
      // 削除前にバックアップを作成
      const currentRanges = localStorage.getItem('mtt-custom-ranges');
      if (currentRanges) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          localStorage.setItem(`mtt-custom-ranges-backup-${timestamp}`, currentRanges);
          console.log('🎯 削除前にバックアップを作成:', `mtt-custom-ranges-backup-${timestamp}`);
        } catch (error) {
          console.error('バックアップ作成に失敗:', error);
        }
      }
      
      setCustomRanges({});
      localStorage.removeItem('mtt-custom-ranges');
      // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
      setLastRangeUpdate(Date.now());
      alert('全てのカスタムレンジを削除しました。\n\n💾 バックアップが自動的に作成されました。');
    }
  };

  // バックアップから復元
  const handleRestoreFromBackup = () => {
    // 利用可能なバックアップを検索
    const backupKeys = Object.keys(localStorage).filter(key => 
      key.startsWith('mtt-custom-ranges-backup-')
    ).sort().reverse(); // 最新のバックアップを最初に

    if (backupKeys.length === 0) {
      alert('❌ 利用可能なバックアップが見つかりません。');
      return;
    }

    // 最新のバックアップを取得
    const latestBackupKey = backupKeys[0];
    const backupData = localStorage.getItem(latestBackupKey);
    
    if (!backupData) {
      alert('❌ バックアップデータの読み込みに失敗しました。');
      return;
    }

    try {
      const parsedRanges = JSON.parse(backupData);
      setCustomRanges(parsedRanges);
      localStorage.setItem('mtt-custom-ranges', backupData);
      setLastRangeUpdate(Date.now());
      
      const rangeCount = Object.keys(parsedRanges).length;
      alert(`✅ バックアップから復元しました！\n\n📊 復元されたレンジ数: ${rangeCount}\n📅 バックアップ日時: ${latestBackupKey.replace('mtt-custom-ranges-backup-', '')}`);
    } catch (error) {
      console.error('バックアップ復元エラー:', error);
      alert('❌ バックアップの復元に失敗しました。');
    }
  };

  // システム全体にレンジデータを保存
  const handleSaveToSystem = async () => {
    console.log('🎯 システム保存開始:', {
      isAdmin,
      hasToken: !!token,
      customRangesCount: Object.keys(customRanges).length,
      sampleRange: Object.keys(customRanges)[0] ? customRanges[Object.keys(customRanges)[0]] : null
    });

    if (!isAdmin || !token) {
      alert('❌ 管理者権限が必要です。');
      return;
    }

    if (Object.keys(customRanges).length === 0) {
      alert('保存するレンジデータがありません。');
      return;
    }

    try {
      const requestBody = {
        ranges: customRanges,
        metadata: {
          creator: 'MTT Admin System',
          timestamp: new Date().toISOString()
        }
      };

      console.log('🎯 リクエストボディ:', requestBody);

      const response = await fetch('/api/mtt-ranges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎯 レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🎯 システム保存完了（ローカルストレージは保持）:', {
          savedRangeKeys: Object.keys(customRanges),
          savedRangeCount: Object.keys(customRanges).length,
          systemMetadata: result.metadata
        });
        alert(`✅ システム全体に保存完了！\n${result.metadata.totalPositions}ポジション、${result.metadata.totalHands}ハンドを保存しました。\n（ローカルデータは保持されます）`);
      } else {
        const error = await response.json();
        console.error('🎯 エラーレスポンス:', error);
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
      console.log('🎯 システム読み込み開始（強制同期）');
      
      const response = await fetch('/api/mtt-ranges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('🎯 システム読み込みレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const systemData = await response.json();
        
        console.log('🎯 システムデータ詳細:', {
          hasRanges: !!systemData.ranges,
          rangesType: typeof systemData.ranges,
          rangesKeys: systemData.ranges ? Object.keys(systemData.ranges) : [],
          rangesCount: systemData.ranges ? Object.keys(systemData.ranges).length : 0,
          metadata: systemData.metadata,
          lastUpdated: systemData.lastUpdated,
          version: systemData.version
        });
        
        if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
          if (confirm(`システムデータを読み込みますか？\n${systemData.metadata.totalPositions}ポジション、${systemData.metadata.totalHands}ハンドが存在します。\n現在のローカルデータは上書きされます。`)) {
            // 強制的にローカルストレージをクリアしてからシステムデータを読み込み
            localStorage.removeItem('mtt-custom-ranges');
            localStorage.removeItem('mtt-ranges-timestamp');
            
            // システムデータをメモリとローカルストレージの両方に保存
            setCustomRanges(systemData.ranges);
            localStorage.setItem('mtt-custom-ranges', JSON.stringify(systemData.ranges));
            localStorage.setItem('mtt-ranges-timestamp', systemData.lastUpdated || new Date().toISOString());
            
            // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
            setLastRangeUpdate(Date.now());
            
            console.log('🎯 システムデータ読み込み後のlastRangeUpdate更新:', {
              newTimestamp: Date.now(),
              systemRangeCount: Object.keys(systemData.ranges).length
            });
            
            console.log('🎯 システムデータを読み込み完了:', {
              systemRangeKeys: Object.keys(systemData.ranges),
              systemRangeCount: Object.keys(systemData.ranges).length,
              localStorageUpdated: true,
              lastRangeUpdate: Date.now()
            });
            
            // デバッグ用：読み込み後の状態確認
            setTimeout(() => {
              const currentRanges = localStorage.getItem('mtt-custom-ranges');
              console.log('🎯 読み込み後1秒の状態確認:', {
                localStorageRanges: currentRanges ? '存在' : 'なし',
                customRangesState: Object.keys(customRanges).length,
                lastRangeUpdate: lastRangeUpdate
              });
            }, 1000);
            
            alert('✅ システムデータを正常に読み込みました！\n\n💾 ローカルストレージにも保存されました。');
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
    console.log('レンジエディターボタン押下:', position);
    
    // 15BBの場合、既存のレンジキー（ポジション名のみ）がある場合はそれを使用
    let targetPosition = position;
    if (position.endsWith('_15BB')) {
      const basePosition = position.replace('_15BB', '');
      if (customRanges[basePosition] && !customRanges[position]) {
        targetPosition = basePosition;
        console.log('15BB互換性: 既存レンジキーを使用', { basePosition, targetPosition });
      }
    }
    // vsオープンレンジでの15BB互換性も確認
    else if (position.startsWith('vsopen_') && position.endsWith('_15BB')) {
      const baseVsOpenKey = position.replace('_15BB', '');
      if (customRanges[baseVsOpenKey] && !customRanges[position]) {
        targetPosition = baseVsOpenKey;
        console.log('15BB互換性: 既存vsオープンレンジキーを使用', { baseVsOpenKey, targetPosition });
      }
    }
    // vsオープンレンジで15BBの既存キー形式の場合、新しいキー形式も確認
    else if (position.startsWith('vsopen_') && !position.includes('_15BB') && stackSize === '15BB') {
      const newVsOpenKey = `${position}_15BB`;
      if (customRanges[newVsOpenKey] && !customRanges[position]) {
        targetPosition = newVsOpenKey;
        console.log('15BB互換性: 新しいvsオープンレンジキーを使用', { newVsOpenKey, targetPosition });
      }
    }
    // vs3ベットレンジでの15BB互換性も確認 (例: vs3bet_UTG_vs_BTN_15BB → vs3bet_UTG_vs_BTN)
    else if (position.startsWith('vs3bet_') && position.endsWith('_15BB')) {
      const baseVs3BetKey = position.replace('_15BB', '');
      if (customRanges[baseVs3BetKey] && !customRanges[position]) {
        targetPosition = baseVs3BetKey;
        console.log('15BB互換性: 既存vs3ベットレンジキーを使用', { baseVs3BetKey, targetPosition });
      }
    }
    // vs4ベットレンジでの15BB互換性も確認 (例: vs4bet_BTN_vs_UTG_15BB → vs4bet_BTN_vs_UTG)
    else if (position.startsWith('vs4bet_') && position.endsWith('_15BB')) {
      const baseVs4BetKey = position.replace('_15BB', '');
      if (customRanges[baseVs4BetKey] && !customRanges[position]) {
        targetPosition = baseVs4BetKey;
        console.log('15BB互換性: 既存vs4ベットレンジキーを使用', { baseVs4BetKey, targetPosition });
      }
    }
    
    setSelectedEditPosition(targetPosition);
    setShowRangeEditor(true);
    setTimeout(() => {
      // 状態が反映された後の値を確認
      console.log('showRangeEditor:', showRangeEditor, 'selectedEditPosition:', targetPosition);
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

  // テンプレート選択ハンドラー
  const handleTemplateSelect = (templateName: string) => {
    const templateHands = HAND_TEMPLATES[templateName as keyof typeof HAND_TEMPLATES];
    if (templateHands) {
      setSelectedTrainingHands(templateHands);
      console.log(`テンプレート「${templateName}」を選択:`, templateHands.length, 'ハンド');
    }
  };
  
  // アクション選択ハンドラー
  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    
    // アクションの基本部分を抽出して比較（例：'RAISE 2.5' → 'RAISE'）
    const selectedBase = action.split(' ')[0];
    const correctBase = gtoData?.correctAction?.split(' ')[0] || '';
    
    // NONEアクションの特別処理
    if (correctBase === 'NONE') {
      console.log('🎯 NONEアクション検出:', {
        selectedAction: action,
        correctAction: correctBase,
        message: 'このハンドはアクションが設定されていません'
      });
      setShowResults(true);
      setIsCorrect(false); // NONEの場合は不正解として扱う
      return;
    }
    
    // MINをRAISEに変換して比較
    const normalizedCorrectBase = correctBase === 'MIN' ? 'RAISE' : correctBase;
    let correct = selectedBase === normalizedCorrectBase;
    
    // カスタムレンジの場合は、頻度情報を優先して判定
    console.log('🎯 頻度判定開始:', {
      action,
      correctAction: gtoData?.correctAction,
      frequencies: gtoData?.frequencies,
      frequencyKeys: gtoData?.frequencies ? Object.keys(gtoData.frequencies) : [],
      hasAction: gtoData?.frequencies ? action in gtoData.frequencies : false,
      isCustomRange: (gtoData as any)?.isCustomRange
    });
    
    // まず直接のアクションマッチングを試行
    let foundFrequency = 0;
    let usedVariant = action;
    
    if (gtoData?.frequencies && action in gtoData.frequencies) {
      foundFrequency = gtoData.frequencies[action];
    } else if (gtoData?.frequencies) {
      // アクションが頻度に含まれていない場合、ALL_IN系の特別処理
      const actionVariants = {
        'ALL_IN': ['ALL_IN', 'ALL IN', 'ALLIN', 'ALL-IN'],
        'ALL IN': ['ALL IN', 'ALL_IN', 'ALLIN', 'ALL-IN'],
        'RAISE': ['RAISE', 'MIN'],
        'CALL': ['CALL'],
        'FOLD': ['FOLD']
      };
      
      const variants = actionVariants[action as keyof typeof actionVariants] || [action];
      
      console.log('🎯 アクション変形検索:', { 
        originalAction: action, 
        variants, 
        availableKeys: Object.keys(gtoData.frequencies),
        isCustomRange: (gtoData as any)?.isCustomRange
      });
      
      for (const variant of variants) {
        if (variant in gtoData.frequencies) {
          foundFrequency = gtoData.frequencies[variant];
          usedVariant = variant;
          console.log('🎯 アクション変形発見:', { action, variant, frequency: foundFrequency });
          break;
        }
      }
      
      // オールインアクション特別処理強化
      if ((action === 'ALL_IN' || action === 'ALL IN') && foundFrequency === 0) {
        const allinKeys = Object.keys(gtoData.frequencies).filter(key => 
          key.toUpperCase().includes('ALL') || key.toUpperCase().includes('ALLIN')
        );
        
        if (allinKeys.length > 0) {
          foundFrequency = gtoData.frequencies[allinKeys[0]];
          usedVariant = allinKeys[0];
          console.log('🎯 オールイン特別検索成功:', { 
            foundKey: allinKeys[0], 
            frequency: foundFrequency,
            isCustomRange: (gtoData as any)?.isCustomRange
          });
        }
      }
    }
    
    if (foundFrequency > 0) {
      // カスタムレンジの場合は、頻度が10%以上なら正解扱い
      if ((gtoData as any)?.isCustomRange) {
        console.log('🎯 カスタムレンジ判定（統合版）:', {
          selectedAction: action,
          usedVariant,
          foundFrequency,
          threshold: 10,
          isCorrect: foundFrequency >= 10
        });
        if (foundFrequency >= 10) {
          correct = true;
        } else {
          correct = false;
        }
      } else {
        // 通常の場合は、頻度が30%以上なら正解扱い、10%以上なら部分正解扱い
        if (foundFrequency >= 30) {
          correct = true;
        } else if (foundFrequency >= 10) {
          correct = true; // 部分正解も正解扱い
        } else {
          correct = false;
        }
      }
    } else {
      // 頻度情報がない場合は、アクションの基本部分で判定
      console.log('🎯 頻度情報なし - 基本アクションで判定:', {
        selectedAction: action,
        selectedBase,
        correctBase,
        normalizedCorrectBase,
        isCorrect: selectedBase === normalizedCorrectBase
      });
      correct = selectedBase === normalizedCorrectBase;
    }
    
    console.log('🎯 アクション選択デバッグ:', {
      selectedAction: action,
      selectedBase,
      correctBase,
      normalizedCorrectBase,
      isCorrect: correct,
      isCustomRange: (gtoData as any)?.isCustomRange,
      frequencies: gtoData?.frequencies,
      selectedFrequency: gtoData?.frequencies?.[action],
      correctAction: gtoData?.correctAction,
      hasFrequencies: !!gtoData?.frequencies,
      frequencyKeys: gtoData?.frequencies ? Object.keys(gtoData.frequencies) : [],
      isAllInAction: action === 'ALL_IN' || action === 'ALL IN',
      allInFrequency: gtoData?.frequencies?.['ALL_IN'],
      allInRelatedKeys: gtoData?.frequencies ? Object.keys(gtoData.frequencies).filter(key => 
        key.toUpperCase().includes('ALL') || key.toUpperCase().includes('ALLIN')
      ) : []
    });
    
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
    console.log('🎯 次のスポットに進む:', {
      currentHand: hand,
      currentHandType: normalizeHandType(hand),
      urlHands: searchParams.get('hands')
    });
    
    // 練習回数をカウント
    incrementPracticeCount();
    
    // 結果をリセット
    setSelectedAction(null);
    setIsCorrect(false);
    setShowResults(false);
    
    // 新しいシナリオを生成（URLパラメータのハンドは維持される）
    generateNewScenario();
  };
  
  // 同じスポットを繰り返すハンドラー
  const handleRepeatSpot = () => {
    console.log('🎯 同じスポットを繰り返し:', {
      currentHand: hand,
      currentHandType: normalizeHandType(hand),
      urlHands: searchParams.get('hands')
    });
    
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
      case '40BB': return '中程度エフェクティブスタック (40BB)';
      case '50BB': return '深めエフェクティブスタック (50BB)';
      case '75BB': return '深いエフェクティブスタック (75BB)';
      default: return `${stackSize}`;
    }
  };
  
  if (!spot) {
    return <div className="min-h-screen bg-black md:bg-gray-900 text-white flex items-center justify-center">ローディング中...</div>;
  }
  
  return (
    <AuthGuard>
      <div className="relative">

      
      {/* 管理者ログアウトボタン（ログイン時のみ表示、PC版のみ） */}

      
      {/* 管理者ログインモーダル */}
      {showAdminLogin && (
        <AdminLogin onClose={() => setShowAdminLogin(false)} />
      )}

      {/* 練習制限警告 */}
      {!canPractice && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg border border-red-500">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold">今日の練習上限に達しました</div>
              <div className="text-sm">プランアップグレードで無制限練習が可能です</div>
            </div>
          </div>
        </div>
      )}

      {/* 練習回数表示 */}
      {maxPracticeCount !== Infinity && (
        <div className="fixed top-4 left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm">
            <span className="font-semibold">練習回数:</span> {practiceCount}/{maxPracticeCount}
          </div>
        </div>
      )}

      {/* ここから下は既存のページ内容 */}
      <div className="min-h-screen bg-black md:bg-gray-900 text-white p-4">
        <div className="max-w-6xl mx-auto">
          {/* 統一ヘッダー（PC・モバイル共通） */}
          <div className="mb-4 flex justify-between items-center">
            <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-300">
              <span className="bg-blue-600/20 px-2 md:px-3 py-1 rounded-full border border-blue-500/30">
                {stackSize}
              </span>
              <span className="bg-green-600/20 px-2 md:px-3 py-1 rounded-full border border-green-500/30">
                {position}
              </span>
              <span className="bg-purple-600/20 px-2 md:px-3 py-1 rounded-full border border-purple-500/30">
                {actionType === 'open' || actionType === 'openraise' ? 'オープンレイズ' : 
                 actionType === 'vsopen' ? 'vsオープン' :
                 actionType === 'vs3bet' ? 'vs3ベット' : 
                 actionType === 'vs4bet' ? 'vs4ベット' : 'オープンレイズ'}
              </span>
              {/* 相手のポジション情報を表示 */}
              {(actionType === 'vsopen' || actionType === 'vs3bet' || actionType === 'vs4bet') && (
                <span className="bg-orange-600/20 px-2 md:px-3 py-1 rounded-full border border-orange-500/30">
                  {opponentPosition ? `vs${opponentPosition}` : 'vsランダム'}
                </span>
              )}
            </div>
            
            <Link 
              href={`/trainer/mtt?${new URLSearchParams({
                stack: stackSize,
                position: position,
                action: actionType,
                ...(customHands.length > 0 ? { hands: encodeURIComponent(customHands.join(',')) } : {})
              }).toString()}`} 
              className="px-3 md:px-4 py-1 md:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs md:text-sm font-medium transition-colors duration-200 flex items-center gap-1 md:gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="hidden md:inline">戻る</span>
            </Link>
          </div>
          


          {/* レンジエディターアクセス - 管理者限定 */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-3 md:p-4 mb-4 border border-purple-700/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base md:text-lg font-semibold text-white mb-1">レンジをカスタマイズ <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-xs md:text-sm text-gray-300">各ポジションの{stackSize}オープンレイズレンジを設定できます</p>
                  <p className="text-xs text-blue-300 mt-1">💡 ハンド形式: K9s, ATo, QQ など（9Ks → K9s に自動変換されます）</p>
                  {Object.keys(customRanges).filter(key => key.endsWith(`_${stackSize}`) || !key.includes('_')).length > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      {stackSize}カスタムレンジ設定済み: {Object.keys(customRanges).filter(key => key.endsWith(`_${stackSize}`) || (!key.includes('_') && stackSize === '15BB')).length}レンジ
                    </div>
                  )}
                </div>
                <div className="flex gap-1 md:gap-2 flex-wrap">
                  {['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'].map(pos => {
                    // スタックサイズ固有のレンジキーを使用
                    const rangeKey = `${pos}_${stackSize}`;
                    const hasCustomRange = customRanges[rangeKey] || (stackSize === '15BB' && customRanges[pos]);
                    
                    return (
                      <button
                        key={pos}
                        onClick={() => handleOpenRangeEditor(rangeKey)}
                        className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
                          hasCustomRange
                            ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400' 
                            : 'bg-purple-600 hover:bg-purple-700 text-white border-2 border-transparent'
                        }`}
                        title={`${pos}ポジション ${stackSize}スタックのレンジ設定`}
                      >
                        {pos}
                        {hasCustomRange && ' ✓'}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* データ管理セクション */}
              <div className="mt-4 pt-4 border-t border-purple-600/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="text-xs md:text-sm font-semibold text-white mb-1">💾 データ永続保存</h4>
                    <p className="text-xs text-gray-400">
                      レンジデータをファイルで保存・復元できます（ブラウザに依存しない永続保存）
                    </p>
                  </div>
                  <div className="flex gap-1 md:gap-2 flex-wrap">
                    {/* エクスポートボタン */}
                    <button
                      onClick={handleExportRanges}
                      disabled={Object.keys(customRanges).length === 0}
                      className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        Object.keys(customRanges).length > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m3 3V10" />
                      </svg>
                      <span className="hidden md:inline">エクスポート</span>
                      <span className="md:hidden">出力</span>
                    </button>
                    
                    {/* インポートボタン */}
                    <label className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white border border-green-500 cursor-pointer transition-all duration-200 flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="hidden md:inline">インポート</span>
                      <span className="md:hidden">入力</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportRanges}
                        className="hidden"
                      />
                    </label>
                    
                    {/* バックアップ復元ボタン */}
                    <button
                      onClick={handleRestoreFromBackup}
                      className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all duration-200 flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden md:inline">バックアップ復元</span>
                      <span className="md:hidden">復元</span>
                    </button>
                    
                    {/* クリアボタン */}
                    <button
                      onClick={handleClearAllRanges}
                      disabled={Object.keys(customRanges).length === 0}
                      className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                        Object.keys(customRanges).length > 0
                          ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                          : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span className="hidden md:inline">全削除</span>
                      <span className="md:hidden">削除</span>
                    </button>
                  </div>
                </div>
                
                {/* システム全体保存セクション（管理者のみ） */}
                {isAdmin && (
                  <div className="mt-4 pt-3 border-t border-red-600/30 bg-red-900/10 rounded-lg p-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="text-xs md:text-sm font-semibold text-red-300 mb-1 flex items-center">
                          🔒 管理者専用システム管理
                        </h4>
                        <p className="text-xs text-gray-400">
                          重要なシステム - 全てのweb・環境で共有される永続データ保存
                        </p>
                      </div>
                      <div className="flex gap-1 md:gap-2 flex-wrap">
                        {/* システム保存ボタン */}
                        <button
                          onClick={handleSaveToSystem}
                          disabled={Object.keys(customRanges).length === 0}
                          className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                            Object.keys(customRanges).length > 0
                              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                              : 'bg-gray-600 text-gray-400 cursor-not-allowed border border-gray-500'
                          }`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          <span className="hidden md:inline">システム保存</span>
                          <span className="md:hidden">保存</span>
                        </button>
                        
                        {/* システム読み込みボタン */}
                        <button
                          onClick={handleLoadFromSystem}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 transition-all duration-200 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <span className="hidden md:inline">システム読み込み</span>
                          <span className="md:hidden">読み込み</span>
                        </button>
                        
                        {/* 強制データファイル読み込みボタン */}
                        <button
                          onClick={() => {
                            fetch('/data/mtt-ranges.json')
                              .then(response => response.json())
                              .then(data => {
                                if (data.ranges) {
                                  setCustomRanges(data.ranges);
                                  localStorage.setItem('mtt-custom-ranges', JSON.stringify(data.ranges));
                                  alert(`✅ データファイルから読み込み完了！\n${Object.keys(data.ranges).length}ポジション分のレンジを読み込みました。`);
                                  // ページをリロードして反映
                                  window.location.reload();
                                } else {
                                  alert('❌ データファイルの形式が正しくありません');
                                }
                              })
                              .catch(error => {
                                console.error('データファイル読み込みエラー:', error);
                                alert(`❌ データファイルの読み込みに失敗しました: ${error.message}`);
                              });
                          }}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white border border-green-500 transition-all duration-200 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="hidden md:inline">データファイル読み込み</span>
                          <span className="md:hidden">ファイル読み込み</span>
                        </button>
                        
                        {/* システム削除ボタン */}
                        <button
                          onClick={handleClearSystemRanges}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-red-800 hover:bg-red-900 text-white border border-red-700 transition-all duration-200 flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span className="hidden md:inline">システム削除</span>
                          <span className="md:hidden">削除</span>
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
                  <h3 className="text-lg font-semibold text-white mb-1">vs オープンレンジをカスタマイズ ({stackSize}) <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">現在の{stackSize}スタックでのヒーローポジションとオープンレイザーの組み合わせでレンジを設定できます</p>
                  <p className="text-xs text-green-300 mt-1">💡 オープンに対してFOLD/CALL/RAISE/ALL INの頻度を設定します</p>
                  {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length > 0 && (
                    <div className="text-xs text-green-400 mt-1">
                      {stackSize}カスタムvsオープンレンジ設定済み: {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length}レンジ
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">{stackSize}スタックでのヒーローポジション別vsオープンレンジ設定：</h4>
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
                            // 15BBの場合は既存キーを優先し、新しいキーをフォールバックとして使用
                            let rangeKey: string;
                            let fallbackRangeKey: string | null = null;
                            
                            if (stackSize === '15BB') {
                              // 15BBの場合は既存のキー形式を優先
                              rangeKey = `vsopen_${heroPos}_vs_${opener}`;
                              fallbackRangeKey = `vsopen_${heroPos}_vs_${opener}_15BB`;
                            } else {
                              // その他のスタックサイズは新しいキー形式を使用
                              rangeKey = `vsopen_${heroPos}_vs_${opener}_${stackSize}`;
                            }
                            
                            const hasCustomRange = customRanges[rangeKey] || (fallbackRangeKey && customRanges[fallbackRangeKey]);
                            
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
                                title={`${heroPos} vs ${opener}の{stackSize}スタックレンジ設定`}
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
                  <div className="text-blue-400 font-semibold mb-1">💡 vs オープンレンジの特徴 ({stackSize}スタック固有)</div>
                  <div className="text-gray-300">
                    • <strong>スタック依存:</strong> {stackSize}スタック専用のレンジ設定<br/>
                    • <strong>ポジション依存:</strong> ヒーローより前のポジションからのオープンのみ対応<br/>
                    • <strong>アクション選択:</strong> FOLD（フォールド）、CALL（コール）、RAISE（レイズ）、ALL IN（オールイン）<br/>
                    • <strong>混合戦略:</strong> 右クリックで詳細な頻度設定（例：CALL 60%, FOLD 40%）
                  </div>
                </div>
              </div>
            </div>
          )}



          {isAdmin && actionType === 'vs4bet' && (
            <div className="bg-gradient-to-r from-red-900/30 to-pink-900/30 rounded-lg p-4 mb-4 border border-red-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">vs 4ベットレンジをカスタマイズ ({stackSize}) <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">現在の{stackSize}スタックでの3ベッターと4ベッターの組み合わせでレンジを設定できます</p>
                  <p className="text-xs text-red-300 mt-1">💡 4ベットに対してFOLD/CALL/ALL IN(5bet)の頻度を設定します</p>
                  {Object.keys(customRanges).filter(key => key.startsWith('vs4bet_') && key.endsWith(`_${stackSize}`)).length > 0 && (
                    <div className="text-xs text-red-400 mt-1">
                      {stackSize}カスタムvs4ベットレンジ設定済み: {Object.keys(customRanges).filter(key => key.startsWith('vs4bet_') && key.endsWith(`_${stackSize}`)).length}レンジ
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">{stackSize}スタックでの3ベッター別vs4ベットレンジ設定：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(threeBetterPos => {
                    const getValidFourBetters = (threeBetterPosition: string): string[] => {
                      const threeBetterIndex = getPositionIndex(threeBetterPosition);
                      if (threeBetterIndex <= 0) return [];
                      return POSITION_ORDER.slice(0, threeBetterIndex);
                    };
                    
                    const validFourBetters = getValidFourBetters(threeBetterPos);
                    if (validFourBetters.length === 0) return null;
                    
                    return (
                      <div key={threeBetterPos} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm font-semibold text-red-400 mb-2">{threeBetterPos} (3ベッター)</div>
                        <div className="text-xs text-gray-300 mb-2">4ベッターからの攻撃に対する対応:</div>
                        <div className="flex flex-wrap gap-1">
                          {validFourBetters.map(fourBetter => {
                            const rangeKey = `vs4bet_${threeBetterPos}_vs_${fourBetter}_${stackSize}`;
                            // 15BBの場合は既存レンジキーも確認
                            const fallbackRangeKey = stackSize === '15BB' ? `vs4bet_${threeBetterPos}_vs_${fourBetter}` : null;
                            const hasCustomRange = customRanges[rangeKey] || (fallbackRangeKey && customRanges[fallbackRangeKey]);
                            
                            return (
                              <button
                                key={fourBetter}
                                onClick={() => handleOpenRangeEditor(rangeKey)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  hasCustomRange
                                    ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-400'
                                    : 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-transparent'
                                }`}
                                title={`${threeBetterPos} vs ${fourBetter}の${stackSize}スタックvs4ベットレンジ設定`}
                              >
                                {fourBetter}
                                {hasCustomRange && ' ✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* vs 4ベットレンジの説明 */}
                <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded text-xs">
                  <div className="text-red-400 font-semibold mb-1">💡 vs 4ベットレンジの特徴 ({stackSize}スタック固有)</div>
                  <div className="text-gray-300">
                    • <strong>スタック依存:</strong> {stackSize}スタック専用のレンジ設定<br/>
                    • <strong>ポジション依存:</strong> 3ベッターが前のポジション（通常オリジナルのオープンレイザー）からの4ベットに対する反応戦略<br/>
                    • <strong>アクション選択:</strong> FOLD（フォールド）、CALL（コール）、ALL IN（5ベット/オールイン）<br/>
                    • <strong>混合戦略:</strong> 右クリックで詳細な頻度設定（例：FOLD 80%, ALL IN 20%）
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* vs 3ベットレンジをカスタマイズ（20BB以外） */}
          {isAdmin && actionType === 'vs3bet' && stackSize !== '20BB' && (
            <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-4 mb-4 border border-orange-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">vs 3ベットレンジをカスタマイズ ({stackSize}) <span className="text-xs bg-red-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">現在の{stackSize}スタックでのオープンレイザーと3ベッターの組み合わせでレンジを設定できます</p>
                  <p className="text-xs text-orange-300 mt-1">💡 3ベットに対してFOLD/CALL/RAISE(4bet)/ALL INの頻度を設定します</p>
                  {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.endsWith(`_${stackSize}`)).length > 0 && (
                    <div className="text-xs text-orange-400 mt-1">
                      {stackSize}カスタムvs3ベットレンジ設定済み: {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.endsWith(`_${stackSize}`)).length}レンジ
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">{stackSize}スタックでのオープンレイザー別vs3ベットレンジ設定：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'].map(openRaiserPos => {
                    const getValidThreeBetters = (openRaiserPosition: string): string[] => {
                      const openRaiserIndex = getPositionIndex(openRaiserPosition);
                      if (openRaiserIndex >= POSITION_ORDER.length - 1) return [];
                      return POSITION_ORDER.slice(openRaiserIndex + 1);
                    };
                    
                    const validThreeBetters = getValidThreeBetters(openRaiserPos);
                    if (validThreeBetters.length === 0) return null;
                    
                    return (
                      <div key={openRaiserPos} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm font-semibold text-orange-400 mb-2">{openRaiserPos} (オープンレイザー)</div>
                        <div className="text-xs text-gray-300 mb-2">3ベッターからの攻撃に対する対応:</div>
                        <div className="flex flex-wrap gap-1">
                          {validThreeBetters.map(threeBetter => {
                            const rangeKey = `vs3bet_${openRaiserPos}_vs_${threeBetter}_${stackSize}`;
                            // 15BBの場合は既存レンジキーも確認
                            const fallbackRangeKey = stackSize === '15BB' ? `vs3bet_${openRaiserPos}_vs_${threeBetter}` : null;
                            const hasCustomRange = customRanges[rangeKey] || (fallbackRangeKey && customRanges[fallbackRangeKey]);
                            
                            return (
                              <button
                                key={threeBetter}
                                onClick={() => handleOpenRangeEditor(rangeKey)}
                                className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                  hasCustomRange
                                    ? 'bg-orange-600 hover:bg-orange-700 text-white border-2 border-orange-400'
                                    : 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-transparent'
                                }`}
                                title={`${openRaiserPos} vs ${threeBetter}の${stackSize}スタックvs3ベットレンジ設定`}
                              >
                                {threeBetter}
                                {hasCustomRange && ' ✓'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* vs 3ベットレンジの説明 */}
                <div className="mt-4 p-3 bg-orange-900/20 border border-orange-600/30 rounded text-xs">
                  <div className="text-orange-400 font-semibold mb-1">💡 vs 3ベットレンジの特徴 ({stackSize}スタック固有)</div>
                  <div className="text-gray-300">
                    • <strong>スタック依存:</strong> {stackSize}スタック専用のレンジ設定<br/>
                    • <strong>ポジション依存:</strong> オープンレイザーが後のポジションからの3ベットに対する反応戦略<br/>
                    • <strong>アクション選択:</strong> FOLD（フォールド）、CALL（コール）、RAISE（4ベット）、ALL IN（オールイン）<br/>
                    • <strong>混合戦略:</strong> 右クリックで詳細な頻度設定（例：CALL 70%, FOLD 30%）
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 20BB専用: 3ベットタイプ別レンジカスタマイズ */}
          {isAdmin && stackSize === '20BB' && actionType === 'vs3bet' && (
            <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg p-4 mb-4 border border-purple-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">20BB専用: 3ベットタイプ別レンジカスタマイズ <span className="text-xs bg-purple-600 px-2 py-1 rounded">管理者限定</span></h3>
                  <p className="text-sm text-gray-300">20BBスタックでの3ベットレイズ（5bb）と3ベットオールイン（20bb）を区別してレンジを設定できます</p>
                  <p className="text-xs text-purple-300 mt-1">💡 例：UTGオープン→LJが3ベットレイズ(5bb)、UTGオープン→LJが3ベットオールイン(20bb)の2種類</p>
                  {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && (key.includes('_raise_20BB') || key.includes('_allin_20BB'))).length > 0 && (
                    <div className="text-xs text-purple-400 mt-1">
                      20BB 3ベットタイプ別レンジ設定済み: {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && (key.includes('_raise_20BB') || key.includes('_allin_20BB'))).length}レンジ
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-white mb-3">20BBスタックでのオープンレイザー別3ベットタイプ別レンジ設定：</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'].map(openRaiserPos => {
                    const getValidThreeBetters = (openRaiserPosition: string): string[] => {
                      const openRaiserIndex = getPositionIndex(openRaiserPosition);
                      if (openRaiserIndex >= POSITION_ORDER.length - 1) return [];
                      return POSITION_ORDER.slice(openRaiserIndex + 1);
                    };
                    
                    const validThreeBetters = getValidThreeBetters(openRaiserPos);
                    if (validThreeBetters.length === 0) return null;
                    
                    return (
                      <div key={openRaiserPos} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm font-semibold text-purple-400 mb-2">{openRaiserPos} (オープンレイザー)</div>
                        <div className="text-xs text-gray-300 mb-2">3ベッターからの攻撃に対する対応（タイプ別）:</div>
                        <div className="flex flex-wrap gap-1">
                          {validThreeBetters.map(threeBetter => {
                            // 3ベットタイプ別のレンジキー
                            const raiseRangeKey = `vs3bet_${openRaiserPos}_vs_${threeBetter}_raise_20BB`;
                            const allinRangeKey = `vs3bet_${openRaiserPos}_vs_${threeBetter}_allin_20BB`;
                            const hasRaiseRange = customRanges[raiseRangeKey];
                            const hasAllinRange = customRanges[allinRangeKey];
                            
                            return (
                              <div key={threeBetter} className="flex flex-col gap-1">
                                <div className="text-xs text-gray-400 text-center">{threeBetter}</div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleOpenRangeEditor(raiseRangeKey)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                      hasRaiseRange
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-blue-400'
                                        : 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-transparent'
                                    }`}
                                    title={`${openRaiserPos} vs ${threeBetter}の20BBスタックvs3ベットレイズ(5bb)レンジ設定`}
                                  >
                                    レイズ(5bb)
                                    {hasRaiseRange && ' ✓'}
                                  </button>
                                  <button
                                    onClick={() => handleOpenRangeEditor(allinRangeKey)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                      hasAllinRange
                                        ? 'bg-red-600 hover:bg-red-700 text-white border-2 border-red-400'
                                        : 'bg-gray-600 hover:bg-gray-700 text-white border-2 border-transparent'
                                    }`}
                                    title={`${openRaiserPos} vs ${threeBetter}の20BBスタックvs3ベットオールイン(20bb)レンジ設定`}
                                  >
                                    オールイン(20bb)
                                    {hasAllinRange && ' ✓'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* 20BB 3ベットタイプ別レンジの説明 */}
                <div className="mt-4 p-3 bg-purple-900/20 border border-purple-600/30 rounded text-xs">
                  <div className="text-purple-400 font-semibold mb-1">💡 20BB 3ベットタイプ別レンジの特徴</div>
                  <div className="text-gray-300">
                    • <strong>20BB専用:</strong> 20BBスタックでのみ有効な詳細設定<br/>
                    • <strong>3ベットタイプ別:</strong> 3ベットレイズ（5bb）と3ベットオールイン（20bb）を区別<br/>
                    • <strong>独立した設定:</strong> 他のレンジ設定とは独立して動作<br/>
                    • <strong>優先順位:</strong> タイプ別レンジが設定されている場合は優先、未設定の場合はデフォルトレンジを使用<br/>
                    • <strong>アクション選択:</strong> FOLD（フォールド）、CALL（コール）、RAISE（4ベット）、ALL IN（オールイン）
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
                  currentSpot={{
                    ...spot,
                    // gtoDataと完全に同期させる
                    correctAction: gtoData.correctAction,
                    frequencies: gtoData.frequencies
                  }}
                  selectedAction={selectedAction}
                  isCorrect={isCorrect}
                  showResults={showResults}
                  onActionSelect={handleActionSelect}
                  availableActions={(() => {
                    // CPUがオールインしている場合、ヒーローのアクションをFOLD/CALLのみに制限
                    if (spot && spot.actionType === 'vs3bet' && spot.threeBetType === 'allin') {
                      return ['FOLD', 'CALL'];
                    }
                    // その他の場合は全てのアクションを許可
                    return ['FOLD', 'CALL', 'RAISE', 'ALL IN'];
                  })()}
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
              <div className={`w-full ${isMobile ? '' : 'bg-gray-800 rounded-xl'} ${isMobile ? 'p-2' : 'p-4'} ${!isMobile ? 'h-[550px] flex flex-col' : ''}`}>
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
                    <div className={`grid gap-2 w-full ${(() => {
                      // 表示されるアクション数をカウント
                      let visibleActions = 2; // FOLDとCALLは常に表示
                      
                      if (shouldShowAction('RAISE') && (!spot || spot.actionType !== 'vs3bet' || spot.threeBetType !== 'allin')) {
                        visibleActions++;
                      }
                      
                      if (shouldShowAction('ALL_IN') && (!spot || spot.actionType !== 'vs3bet' || spot.threeBetType !== 'allin') && 
                          (parseInt(stackSize) <= 80 || (gtoData && gtoData.frequencies && gtoData.frequencies['ALL_IN'] > 0))) {
                        visibleActions++;
                      }
                      
                      // アクション数に応じてグリッド列数を決定
                      if (visibleActions === 2) return 'grid-cols-2';
                      if (visibleActions === 3) return 'grid-cols-3';
                      return 'grid-cols-4';
                    })()}`}>
                      <button
                        className="py-3 rounded-lg font-bold text-base shadow-lg bg-blue-600 hover:bg-blue-700 text-white transition-all border border-gray-700"
                        onClick={() => handleActionSelect('FOLD')}
                      >
                        {getActionButtonText('FOLD')}
                      </button>
                      <button
                        className="py-3 rounded-lg font-bold text-base shadow-lg bg-green-600 hover:bg-green-700 text-white transition-all border border-gray-700"
                        onClick={() => handleActionSelect('CALL')}
                      >
                        {getActionButtonText('CALL')}
                      </button>
                      {/* RAISEボタン - 削除ロジックを適用 */}
                      {shouldShowAction('RAISE') && (!spot || spot.actionType !== 'vs3bet' || spot.threeBetType !== 'allin') ? (
                        <button
                          className="py-3 rounded-lg font-bold text-base shadow-lg bg-red-600 hover:bg-red-700 text-white transition-all border border-gray-700"
                          onClick={() => handleActionSelect('RAISE')}
                        >
                          {getActionButtonText('RAISE')}
                        </button>
                      ) : null}
                      {/* ALL INボタン - 削除ロジックを適用 */}
                      {shouldShowAction('ALL_IN') && (!spot || spot.actionType !== 'vs3bet' || spot.threeBetType !== 'allin') && 
                       (parseInt(stackSize) <= 80 || (gtoData && gtoData.frequencies && gtoData.frequencies['ALL_IN'] > 0)) ? (
                        <button
                          className="py-3 rounded-lg font-bold text-base shadow-lg bg-purple-600 hover:bg-purple-700 text-white transition-all border border-gray-700"
                          onClick={() => handleActionSelect('ALL_IN')}
                        >
                          {getActionButtonText('ALL_IN')}
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
                <div className={`${isMobile ? '-mt-6' : 'pt-4'} ${isMobile ? 'h-auto' : 'flex-1 border-t border-gray-700'}`}>
                  {/* 結果がない場合のプレースホルダー */}
                  {!showResults && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                      <div className="mb-2 mt-8">
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
                      
                      {/* レンジ外ハンドの警告表示 */}
                      {gtoData.isRangeOut && (
                        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4 mb-4">
                          <h4 className="text-yellow-400 font-semibold mb-2 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            レンジ外ハンド
                          </h4>
                          <div className="text-yellow-300 text-sm mb-3">
                            {gtoData.effectiveStackExplanation}
                          </div>
                          <div className="text-gray-300 text-sm mb-2">
                            {gtoData.stackSizeStrategy}
                          </div>
                          <div className="text-blue-300 text-sm bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
                            <strong>💡 推奨アクション:</strong><br/>
                            {gtoData.icmConsideration}
                          </div>
                        </div>
                      )}

                                            {/* 通常の結果表示（エラーでない場合のみ） */}
                      {!gtoData.isInvalidCombination && (
                        <>
                          {/* 頻度詳細情報 */}
                          {gtoData.frequencies && (
                            <div className={`${isMobile ? 'bg-gray-700/10' : 'bg-gray-700/30'} p-4 rounded mb-4`}>
                              {(() => {
                                console.log('🎯 結果表示デバッグ:', {
                                  normalizedHandType: gtoData?.normalizedHandType,
                                  frequencies: gtoData?.frequencies,
                                  correctAction: gtoData?.correctAction,
                                  isCustomRange: (gtoData as any)?.isCustomRange,
                                  gtoDataKeys: gtoData ? Object.keys(gtoData) : [],
                                  gtoDataType: typeof gtoData?.normalizedHandType,
                                  gtoDataExists: !!gtoData
                                });
                                return null;
                              })()}
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {gtoData.correctAction === 'NONE' ? (
                                  <div className="col-span-2 p-4 bg-yellow-600/30 border border-yellow-500 rounded text-center">
                                    <div className="text-yellow-300 font-bold mb-2">⚠️ GTO戦略なし</div>
                                    <div className="text-gray-300 text-sm">
                                      このハンドにはGTO戦略上、推奨アクションが存在しません。
                                    </div>
                                  </div>
                                ) : (
                                  Object.entries(gtoData.frequencies)
                                    .filter(([action]) => ['FOLD', 'CALL', 'RAISE', 'ALL_IN', 'ALL IN', 'ALLIN', 'ALL-IN'].includes(action))
                                    .map(([action, frequency]) => {
                                      // ALL_IN系のアクションを統一表示
                                      const displayAction = ['ALL_IN', 'ALLIN', 'ALL-IN'].includes(action) ? 'ALL_IN' : action;
                                      const isCorrectAction = action === gtoData.correctAction || 
                                                            (displayAction === 'ALL_IN' && gtoData.correctAction === 'ALL_IN') ||
                                                            (gtoData.correctAction === 'MIN' && action === 'RAISE');
                                      
                                      return (
                                  <div 
                                    key={action} 
                                    className={`flex justify-between p-2 rounded ${
                                      action === selectedAction 
                                        ? 'bg-blue-600/30 border border-blue-500' 
                                        : isCorrectAction
                                          ? 'bg-green-600/30 border border-green-500' 
                                          : 'bg-gray-600/30'
                                    }`}
                                  >
                                    <span className={`font-medium ${
                                      action === selectedAction 
                                        ? 'text-blue-300' 
                                        : isCorrectAction
                                          ? 'text-green-300' 
                                          : 'text-gray-300'
                                    }`}>
                                      {displayAction === 'ALL_IN' ? 'ALL_IN' : action}
                                      {isCorrectAction && ' (推奨)'}
                                    </span>
                                    <span className={`font-bold ${
                                      Number(frequency) > 0 ? 'text-white' : 'text-gray-500'
                                    }`}>
                                      {Number(frequency)}%
                                    </span>
                                  </div>
                                      );
                                    })
                                )}
                              </div>
                              
                              {/* ハンドレンジを表示ボタン */}
                              <div className="mt-4">
                                <button
                                  onClick={() => setShowHandRangeViewer(true)}
                                  className="w-full py-3 md:py-4 px-4 md:px-6 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-600 hover:from-purple-500 hover:via-purple-600 hover:to-purple-500 text-white rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 md:gap-3 shadow-lg hover:shadow-xl border border-purple-500/30 hover:border-purple-400/50 transform hover:scale-105"
                                >
                                  <div className="w-5 h-5 md:w-6 md:h-6 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-4 md:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                  </div>
                                  <span className="text-sm md:text-base">ハンドレンジを表示</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* 結果サマリー */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className={`${isMobile ? 'bg-gray-700/20' : 'bg-gray-700/40'} p-3 rounded`}>
                              <h4 className="text-gray-400 text-xs mb-1">最適なアクション</h4>
                              <div className="text-lg font-bold text-green-400">
                                {(() => {
                                  // 完全にgtoDataのみを使用（spotとの矛盾を防ぐ）
                                  let actionKey = gtoData.correctAction === 'MIN' ? 'RAISE' : gtoData.correctAction;
                                  
                                  // 頻度取得時に複数のキーを試行
                                  let frequency = 0;
                                  if (actionKey === 'ALL_IN') {
                                    // ALL_IN関連の複数キーを試行
                                    frequency = gtoData.frequencies?.['ALL_IN'] || 
                                               gtoData.frequencies?.['ALL IN'] || 
                                               gtoData.frequencies?.['ALLIN'] || 
                                               gtoData.frequencies?.['ALL-IN'] || 0;
                                    
                                    // カスタムレンジでオールインが正解なのに0%の場合の特別処理
                                    if (frequency === 0 && (gtoData as any)?.isCustomRange && gtoData.correctAction === 'ALL_IN') {
                                      // frequenciesから全てのキーを確認
                                      const allKeys = Object.keys(gtoData.frequencies || {});
                                      const allinRelatedKeys = allKeys.filter(key => 
                                        key.toUpperCase().includes('ALL') || 
                                        key.toLowerCase().includes('allin') ||
                                        key.toLowerCase().includes('all_in') ||
                                        key.toLowerCase().includes('all-in')
                                      );
                                      
                                      console.log('🔥 オールイン0%問題修正試行:', {
                                        allKeys,
                                        allinRelatedKeys,
                                        frequencies: gtoData.frequencies,
                                        correctAction: gtoData.correctAction
                                      });
                                      
                                      // 関連キーから最初の非ゼロ値を取得
                                      for (const key of allinRelatedKeys) {
                                        const val = gtoData.frequencies[key];
                                        if (val && val > 0) {
                                          frequency = val;
                                          console.log('🔥 オールイン頻度修正成功:', { key, frequency });
                                          break;
                                        }
                                      }
                                      
                                      // それでも0の場合は、correctActionがALL_INならば100%とする
                                      if (frequency === 0) {
                                        frequency = 100;
                                        console.log('🔥 オールイン頻度強制設定:', { frequency });
                                      }
                                    }
                                  } else {
                                    frequency = gtoData.frequencies?.[actionKey] || 0;
                                  }
                                  
                                  const displayActionKey = actionKey === 'ALL_IN' ? 'ALL IN' : actionKey;
                                  const displayText = frequency === 100 ? displayActionKey : `${displayActionKey} ${frequency}%`;
                                  
                                  console.log('🎯 最適アクション表示（修正版）:', {
                                    gtoDataCorrectAction: gtoData.correctAction,
                                    actionKey,
                                    frequency,
                                    displayText,
                                    gtoDataFrequencies: gtoData.frequencies,
                                    allFrequencyKeys: Object.keys(gtoData.frequencies || {}),
                                    isCustomRange: (gtoData as any)?.isCustomRange,
                                    isAllInCorrectAction: gtoData.correctAction === 'ALL_IN',
                                    allInFrequencyKeys: Object.keys(gtoData.frequencies || {}).filter(key => 
                                      key.toUpperCase().includes('ALL') || key.toUpperCase().includes('ALLIN')
                                    ),
                                    timestamp: Date.now()
                                  });
                                  
                                  return displayText;
                                })()}
                              </div>
                                  {gtoData.frequencies && (
                                    <div className="text-xs text-green-300 mt-1">
                                      推奨頻度: {(() => {
                                        // 完全にgtoDataのみを使用（spotとの矛盾を防ぐ）
                                        let actionKey = gtoData.correctAction === 'MIN' ? 'RAISE' : gtoData.correctAction;
                                        
                                        // 頻度取得時に複数のキーを試行
                                        let frequency = 0;
                                        if (actionKey === 'ALL_IN') {
                                          // ALL_IN関連の複数キーを試行
                                          frequency = gtoData.frequencies?.['ALL_IN'] || 
                                                     gtoData.frequencies?.['ALL IN'] || 
                                                     gtoData.frequencies?.['ALLIN'] || 
                                                     gtoData.frequencies?.['ALL-IN'] || 0;
                                          
                                          // カスタムレンジでオールインが正解なのに0%の場合の特別処理
                                          if (frequency === 0 && (gtoData as any)?.isCustomRange && gtoData.correctAction === 'ALL_IN') {
                                            // frequenciesから全てのキーを確認
                                            const allKeys = Object.keys(gtoData.frequencies || {});
                                            const allinRelatedKeys = allKeys.filter(key => 
                                              key.toUpperCase().includes('ALL') || 
                                              key.toLowerCase().includes('allin') ||
                                              key.toLowerCase().includes('all_in') ||
                                              key.toLowerCase().includes('all-in')
                                            );
                                            
                                            // 関連キーから最初の非ゼロ値を取得
                                            for (const key of allinRelatedKeys) {
                                              const val = gtoData.frequencies[key];
                                              if (val && val > 0) {
                                                frequency = val;
                                                console.log('🔥 推奨頻度オールイン修正成功:', { key, frequency });
                                                break;
                                              }
                                            }
                                            
                                            // それでも0の場合は、correctActionがALL_INならば100%とする
                                            if (frequency === 0) {
                                              frequency = 100;
                                              console.log('🔥 推奨頻度オールイン強制設定:', { frequency });
                                            }
                                          }
                                        } else {
                                          frequency = gtoData.frequencies?.[actionKey] || 0;
                                        }
                                        
                                        console.log('🎯 推奨頻度表示（修正版）:', {
                                          gtoDataCorrectAction: gtoData.correctAction,
                                          actionKey,
                                          frequency,
                                          gtoDataFrequencies: gtoData.frequencies,
                                          allFrequencyKeys: Object.keys(gtoData.frequencies || {}),
                                          timestamp: Date.now()
                                        });
                                        
                                        return frequency;
                                      })()}%
                            </div>
                                  )}
                            </div>
                            <div className={`${isMobile ? 'bg-gray-700/20' : 'bg-gray-700/40'} p-3 rounded`}>
                              <h4 className="text-gray-400 text-xs mb-1">あなたの選択</h4>
                              <div className="text-lg font-bold">{selectedAction}</div>
                                  {gtoData.frequencies && selectedAction && (
                                    (() => {
                                      // アクションの形式を正しく変換
                                      const actionVariants = {
                                        'ALL_IN': ['ALL_IN', 'ALL_IN'],
                                        'RAISE': ['RAISE', 'MIN'],
                                        'CALL': ['CALL'],
                                        'FOLD': ['FOLD']
                                      };
                                      
                                      const variants = actionVariants[selectedAction as keyof typeof actionVariants] || [selectedAction];
                                      let frequency = 0;
                                      let foundKey = '';
                                      
                                      // 利用可能な変形を試す
                                      for (const variant of variants) {
                                        if (gtoData.frequencies[variant] !== undefined) {
                                          frequency = gtoData.frequencies[variant];
                                          foundKey = variant;
                                          break;
                                        }
                                      }
                                      
                                      // デバッグ情報を追加
                                      console.log('🎯 正解頻度計算デバッグ:', {
                                        selectedAction,
                                        variants,
                                        foundKey,
                                        frequency,
                                        gtoDataFrequencies: gtoData.frequencies,
                                        allKeys: Object.keys(gtoData.frequencies)
                                      });
                                      
                                      return (
                                        <div className={`text-xs mt-1 ${frequency > 0 ? 'text-blue-300' : 'text-red-300'}`}>
                                          正解頻度: {frequency}%
                                          {frequency === 0 && ' (推奨されません)'}
                                        </div>
                                      );
                                    })()
                                  )}
                            </div>
                          </div>
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
        (() => {
          // レンジキーからポジションとスタックサイズを抽出
          let displayPosition = selectedEditPosition;
          let editorStackSize = parseInt(stackSize.replace('BB', ''));
          let initialRange = customRanges[selectedEditPosition];
          
          // スタックサイズ込みレンジキー（例：UTG_15BB）の場合
          if (selectedEditPosition.includes('_') && selectedEditPosition.includes('BB')) {
            const parts = selectedEditPosition.split('_');
            if (parts.length === 2) {
              displayPosition = parts[0];
              editorStackSize = parseInt(parts[1].replace('BB', ''));
              
              // 15BBの場合、既存のレンジキー（ポジション名のみ）も確認
              if (parts[1] === '15BB' && !initialRange && customRanges[parts[0]]) {
                initialRange = customRanges[parts[0]];
                console.log('15BB互換性: 既存レンジを使用', { position: parts[0], range: initialRange });
              }
            }
          }
          // vsオープンレンジキー（例：vsopen_BTN_vs_CO）の場合
          else if (selectedEditPosition.startsWith('vsopen_')) {
            const parts = selectedEditPosition.split('_');
            if (parts.length >= 4) {
              displayPosition = selectedEditPosition; // vsオープンの場合はレンジキー全体を使用
              editorStackSize = parseInt(stackSize.replace('BB', '')); // 現在のスタックサイズを使用
              
              // 15BBの場合、既存のvsオープンレンジキー（スタックサイズなし）も確認
              if (stackSize === '15BB' && !initialRange) {
                const baseParts = parts.slice(0, 4); // vsopen_BTN_vs_COの部分のみ
                const baseVsOpenKey = baseParts.join('_');
                if (customRanges[baseVsOpenKey]) {
                  initialRange = customRanges[baseVsOpenKey];
                  console.log('15BB互換性: 既存vsオープンレンジを使用', { baseVsOpenKey, range: initialRange });
                }
              }
            }
          }
          // vs3ベットレンジキー（例：vs3bet_BTN_75BB）の場合
          else if (selectedEditPosition.startsWith('vs3bet_')) {
            displayPosition = selectedEditPosition; // vs3ベットの場合はレンジキー全体を使用
            editorStackSize = parseInt(stackSize.replace('BB', '')); // 現在のスタックサイズを使用
            
            // 15BBの場合、既存のvs3ベットレンジキー（スタックサイズなし）も確認
            if (stackSize === '15BB' && !initialRange) {
              const baseVs3BetKey = selectedEditPosition.replace('_15BB', '');
              if (customRanges[baseVs3BetKey]) {
                initialRange = customRanges[baseVs3BetKey];
                console.log('15BB互換性: 既存vs3ベットレンジを使用', { baseVs3BetKey, range: initialRange });
              }
            }
          }
          // vs4ベットレンジキー（例：vs4bet_BTN_75BB）の場合
          else if (selectedEditPosition.startsWith('vs4bet_')) {
            displayPosition = selectedEditPosition; // vs4ベットの場合はレンジキー全体を使用
            editorStackSize = parseInt(stackSize.replace('BB', '')); // 現在のスタックサイズを使用
            
            // 15BBの場合、既存のvs4ベットレンジキー（スタックサイズなし）も確認
            if (stackSize === '15BB' && !initialRange) {
              const baseVs4BetKey = selectedEditPosition.replace('_15BB', '');
              if (customRanges[baseVs4BetKey]) {
                initialRange = customRanges[baseVs4BetKey];
                console.log('15BB互換性: 既存vs4ベットレンジを使用', { baseVs4BetKey, range: initialRange });
              }
            }
          }
          
          return (
            <MTTRangeEditor
              position={displayPosition}
              stackSize={editorStackSize}
              onSaveRange={handleSaveRange}
              onClose={() => setShowRangeEditor(false)}
              initialRange={initialRange}
            />
          );
        })()
      )}

      {/* ハンドセレクター */}
      {showHandSelector && (
        <HandRangeSelector
          onClose={handleCloseHandSelector}
          onSelectHands={handleSelectTrainingHands}
          initialSelectedHands={selectedTrainingHands}
          onTemplateSelect={handleTemplateSelect}
        />
      )}

      {/* ハンドレンジビューアー */}
      {showHandRangeViewer && (() => {
        const rangeKey = getCurrentSpotRangeKey();
        let rangeData = rangeKey ? customRanges[rangeKey] : null;
        
        // カスタムレンジが見つからない場合は、ローカルストレージから直接取得を試行
        if (!rangeData && rangeKey) {
          const localRanges = localStorage.getItem('mtt-custom-ranges');
          if (localRanges) {
            try {
              const parsedRanges = JSON.parse(localRanges);
              rangeData = parsedRanges[rangeKey] || null;
              console.log('🎯 ハンドレンジビューアー: ローカルストレージから直接取得:', {
                rangeKey,
                found: !!rangeData,
                rangeDataSize: rangeData ? Object.keys(rangeData).length : 0
              });
            } catch (e) {
              console.error('ローカルストレージからの直接取得に失敗:', e);
            }
          }
        }
        
        console.log('🎯 ハンドレンジビューアーデバッグ:', {
          showHandRangeViewer,
          rangeKey,
          rangeData: rangeData ? Object.keys(rangeData).length : null,
          spot: spot ? { actionType: spot.actionType, heroPosition: spot.heroPosition, stackDepth: spot.stackDepth } : null,
          customRangesKeys: Object.keys(customRanges).filter(key => key.includes('40BB')),
          hasRangeData: !!rangeData,
          // 全スタックサイズのvs3ベットレンジ確認
          vs3betRanges: Object.keys(customRanges).filter(key => key.includes('vs3bet')),
          vs3betRangesByStack: {
            '10BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('10BB')),
            '15BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && !key.includes('_')),
            '20BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('20BB')),
            '30BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('30BB')),
            '40BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('40BB')),
            '50BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('50BB')),
            '75BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('75BB')),
            '100BB': Object.keys(customRanges).filter(key => key.includes('vs3bet') && key.includes('100BB'))
          },
          // 全スタックサイズのvs4ベットレンジ確認
          vs4betRanges: Object.keys(customRanges).filter(key => key.includes('vs4bet')),
          vs4betRangesByStack: {
            '10BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('10BB')),
            '15BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && !key.includes('_')),
            '20BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('20BB')),
            '30BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('30BB')),
            '40BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('40BB')),
            '50BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('50BB')),
            '75BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('75BB')),
            '100BB': Object.keys(customRanges).filter(key => key.includes('vs4bet') && key.includes('100BB'))
          }
        });
        
        if (!rangeKey) {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">エラー</h2>
                  <button
                    onClick={() => setShowHandRangeViewer(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="text-gray-300 mb-4">
                  このスポットのレンジキーを特定できませんでした。
                </div>
                <button
                  onClick={() => setShowHandRangeViewer(false)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          );
        }
        
        if (!rangeData) {
          return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">レンジ未設定</h2>
                  <button
                    onClick={() => setShowHandRangeViewer(false)}
                    className="text-gray-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="text-gray-300 mb-4">
                  <div className="mb-2">レンジキー: <code className="bg-gray-700 px-2 py-1 rounded">{rangeKey}</code></div>
                  <div>このスポットのカスタムレンジは設定されていません。</div>
                </div>
                <button
                  onClick={() => setShowHandRangeViewer(false)}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          );
        }
        
        // 現在のスポットから相手のポジション情報を取得
        const currentOpponentPosition = opponentPosition || 
          (spot?.openRaiserPosition) || 
          (spot?.threeBetterPosition) || 
          undefined;
        
        return (
          <HandRangeViewer
            rangeData={rangeData}
            title={`現在のスポットのハンドレンジ`}
            onClose={() => setShowHandRangeViewer(false)}
            position={position}
            stackSize={stackSize}
            actionType={actionType}
            opponentPosition={currentOpponentPosition}
          />
        );
      })()}

      {/* レンジの読み込み状況デバッグ表示 */}
      {isAdmin && (
        <div className="bg-yellow-900/20 rounded-lg p-4 mb-4 border border-yellow-700/50">
          <h3 className="text-lg font-semibold text-yellow-300 mb-2">🔍 レンジ読み込み状況デバッグ ({stackSize})</h3>
          <div className="text-xs space-y-1">
            <div>カスタムレンジ総数: {Object.keys(customRanges).length}</div>
                        <div>vsオープンレンジ数: {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length}</div>
            <div>vs3ベットレンジ数: {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.endsWith(`_${stackSize}`)).length}</div>
            <div>vs4ベットレンジ数: {Object.keys(customRanges).filter(key => key.startsWith('vs4bet_') && key.endsWith(`_${stackSize}`)).length}</div>
            <div>{stackSize}スタック固有レンジ数: {Object.keys(customRanges).filter(key => key.endsWith(`_${stackSize}`) || (!key.includes('_') && stackSize === '15BB' && !key.startsWith('vsopen_') && !key.startsWith('vs3bet_') && !key.startsWith('vs4bet_'))).length}</div>
                          {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-300 mb-1">設定済み{stackSize}vsオープンレンジ:</div>
                <div className="max-h-32 overflow-y-auto">
                  {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).slice(0, 10).map(key => (
                    <div key={key} className="text-xs text-gray-300">• {key}</div>
                  ))}
                  {Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length > 10 && (
                    <div className="text-xs text-gray-400">...他{Object.keys(customRanges).filter(key => key.startsWith('vsopen_') && key.endsWith(`_${stackSize}`)).length - 10}レンジ</div>
                  )}
                </div>
                              </div>
                              )}
            {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.endsWith(`_${stackSize}`)).length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-300 mb-1">設定済み{stackSize}vs3ベットレンジ:</div>
                <div className="max-h-20 overflow-y-auto">
                  {Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.endsWith(`_${stackSize}`)).map(key => (
                    <div key={key} className="text-xs text-gray-300">• {key}</div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(customRanges).filter(key => key.startsWith('vs4bet_') && key.endsWith(`_${stackSize}`)).length > 0 && (
              <div className="mt-2">
                <div className="text-yellow-300 mb-1">設定済み{stackSize}vs4ベットレンジ:</div>
                <div className="max-h-20 overflow-y-auto">
                  {Object.keys(customRanges).filter(key => key.startsWith('vs4bet_') && key.endsWith(`_${stackSize}`)).map(key => (
                    <div key={key} className="text-xs text-gray-300">• {key}</div>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(customRanges).filter(key => key.endsWith(`_${stackSize}`) || (!key.includes('_') && stackSize === '15BB' && !key.startsWith('vsopen_') && !key.startsWith('vs3bet_') && !key.startsWith('vs4bet_'))).length > 0 && (
                              <div className="mt-2">
                  <div className="text-yellow-300 mb-1">設定済み{stackSize}レンジ:</div>
                  <div className="max-h-20 overflow-y-auto">
                    {Object.keys(customRanges).filter(key => key.endsWith(`_${stackSize}`) || (!key.includes('_') && stackSize === '15BB' && !key.startsWith('vsopen_') && !key.startsWith('vs3bet_') && !key.startsWith('vs4bet_'))).map(key => (
                    <div key={key} className="text-xs text-gray-300">• {key}</div>
                  ))}
                </div>
              </div>
            )}
            {actionType === 'vsopen' && (
              <div className="mt-2 p-2 bg-blue-900/20 rounded">
                <div className="text-blue-300">現在のvsオープン設定:</div>
                <div>ポジション: {position}</div>
                <div>スタック: {stackSize}</div>
                {spot?.openRaiserPosition && (
                  <div>オープンレイザー: {spot.openRaiserPosition}</div>
                )}
                {spot?.openRaiserPosition && (
                  <div>レンジキー: vsopen_{position}_vs_{spot.openRaiserPosition}_{stackSize}</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 管理者ログイン関連 - 画面一番下に配置 */}
      <div className="fixed bottom-4 left-4 z-50 hidden md:block">
        {/* 管理者ログインボタン（未ログイン時のみ表示） - PC版 */}
        {!isAdmin && (
          <button
            onClick={() => setShowAdminLogin(true)}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            管理者ログイン
          </button>
        )}
        
        {/* 管理者ログイン情報 - PC版 */}
        {isAdmin && (
          <div className="flex items-center gap-3 bg-green-600/20 px-3 py-2 rounded-lg border border-green-500/30 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-sm">
              <div className="text-green-400 font-medium">gto-admin</div>
              <div className="text-green-300 text-xs">管理者でログイン中</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('admin-token');
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors duration-200"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>

      {/* モバイル版管理者ログイン関連 - 右下に配置 */}
      <div className="fixed bottom-2 right-2 z-50 md:hidden">
        {/* 管理者ログインボタン（未ログイン時のみ表示） - モバイル版 */}
        {!isAdmin && (
          <button
            onClick={() => setShowAdminLogin(true)}
            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors duration-200 flex items-center gap-1 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            管理
          </button>
        )}
        
        {/* 管理者ログイン情報 - モバイル版 */}
        {isAdmin && (
          <div className="flex items-center gap-1 bg-green-600/20 px-2 py-1 rounded border border-green-500/30 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="text-xs">
              <div className="text-green-400 font-medium">管理</div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('admin-token');
                window.location.reload();
              }}
              className="px-1 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium transition-colors duration-200"
            >
              出
            </button>
          </div>
        )}
      </div>
    </div>
    </AuthGuard>
  );
} 

export default function MTTTrainingPageWrapper() {
  return (
    <Suspense>
      <MTTTrainingPage />
    </Suspense>
  );
}
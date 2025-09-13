'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PokerTable, Spot } from '@/components/PokerTable';
import Link from 'next/link';
import { MTTRangeEditor, HandInfo, HandRangeSelector, HAND_TEMPLATES } from '@/components/HandRange';
import HandRangeViewer from '@/components/HandRangeViewer';
import { useAdmin } from '@/contexts/AdminContext';
import { AdminLogin } from '@/components/AdminLogin';
import { gtoEvents } from '@/lib/analytics';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/FirebaseAuthContext';
import DailyLimitModal from '@/components/DailyLimitModal';
import LZString from 'lz-string';

// 統合ストレージ管理システム
const storageManager = {
  // localStorage容量チェック
  checkLocalStorageCapacity: () => {
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const itemSize = localStorage.getItem(key)?.length || 0;
          totalSize += itemSize;
        }
      }
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      const usagePercent = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);
      return {
        totalSizeMB: parseFloat(totalSizeMB),
        usagePercent: parseFloat(usagePercent),
        isNearLimit: parseFloat(usagePercent) > 80
      };
    } catch (error) {
      return { totalSizeMB: 0, usagePercent: 0, isNearLimit: false };
    }
  },

  // セーフなストレージ保存
  safeSetItem: (key: string, data: any) => {
    try {
      const dataString = JSON.stringify(data);
      
      // IndexedDBを優先的に試行
      if ('indexedDB' in window) {
        return { success: true, method: 'IndexedDB' };
      }
      
      // 圧縮localStorageを試行
      try {
        const compressed = LZString.compress(dataString);
        if (compressed) {
          localStorage.setItem(key + '_compressed', compressed);
          return { success: true, method: 'localStorage-compressed' };
        }
      } catch (error) {
        console.warn('圧縮localStorage保存失敗:', error);
      }
      
      // 通常のlocalStorageを試行
      localStorage.setItem(key, dataString);
      return { success: true, method: 'localStorage' };
    } catch (error) {
      console.warn('ストレージ保存失敗:', error);
      return { success: false, method: 'none', error: error instanceof Error ? error.message : String(error) };
    }
  },

  // セーフなストレージ読み込み
  safeGetItem: (key: string) => {
    try {
      // 圧縮データを確認
      const compressed = localStorage.getItem(key + '_compressed');
      if (compressed) {
        const decompressed = LZString.decompress(compressed);
        if (decompressed) {
          return JSON.parse(decompressed);
        }
      }
      
      // 通常データを確認
      const data = localStorage.getItem(key);
      if (data) {
        return JSON.parse(data);
      }
      
      return null;
    } catch (error) {
      console.warn('データ読み込み失敗:', error);
      return null;
    }
  },

  // 既存データの圧縮移行
  migrateToCompressed: () => {
    try {
      const existingData = localStorage.getItem('mtt-custom-ranges');
      if (existingData) {
        const compressed = LZString.compress(existingData);
        if (compressed) {
          localStorage.setItem('mtt-custom-ranges_compressed', compressed);
          localStorage.removeItem('mtt-custom-ranges');
          console.log('✅ 既存データを圧縮移行完了');
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('圧縮移行失敗:', error);
      return false;
    }
  },

  // カスタムレンジ保存
  saveRanges: async (ranges: any) => {
    const dataString = JSON.stringify(ranges);
    const dataSize = new Blob([dataString]).size;
    const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
    
    console.log('💾 ストレージ保存開始:', {
      rangeCount: Object.keys(ranges).length,
      dataSizeMB: dataSizeMB
    });
    
    // 既存データの圧縮移行を試行
    storageManager.migrateToCompressed();
    
    // 圧縮localStorageを優先的に試行
    try {
      const compressed = LZString.compress(dataString);
      if (compressed) {
        localStorage.setItem('mtt-custom-ranges_compressed', compressed);
        // 既存の非圧縮データを削除
        localStorage.removeItem('mtt-custom-ranges');
        console.log('✅ 圧縮localStorage保存成功');
        return { success: true, method: 'localStorage-compressed' };
      }
    } catch (error) {
      console.warn('圧縮localStorage保存失敗:', error);
    }
    
    // 通常のlocalStorageを試行
    try {
      localStorage.setItem('mtt-custom-ranges', dataString);
      console.log('✅ localStorage保存成功');
      return { success: true, method: 'localStorage' };
    } catch (error) {
      console.warn('localStorage保存失敗:', error);
      return { success: false, method: 'none', error: error instanceof Error ? error.message : String(error) };
    }
  },

  // カスタムレンジ読み込み
  loadRanges: async () => {
    try {
      // 圧縮データを確認
      const compressed = localStorage.getItem('mtt-custom-ranges_compressed');
      if (compressed) {
        const decompressed = LZString.decompress(compressed);
        if (decompressed) {
          const data = JSON.parse(decompressed);
          console.log('✅ 圧縮データ読み込み成功:', Object.keys(data).length + '個のレンジ');
          return data;
        }
      }
      
      // 通常データを確認
      const data = localStorage.getItem('mtt-custom-ranges');
      if (data) {
        const parsed = JSON.parse(data);
        console.log('✅ 通常データ読み込み成功:', Object.keys(parsed).length + '個のレンジ');
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.warn('データ読み込み失敗:', error);
      return null;
    }
  },

  // ストレージ情報取得
  getStorageInfo: async () => {
    const capacity = storageManager.checkLocalStorageCapacity();
    return {
      localStorage: {
        totalSizeMB: capacity.totalSizeMB,
        usagePercent: capacity.usagePercent,
        isNearLimit: capacity.isNearLimit,
        isAvailable: true
      },
      indexedDB: {
        isAvailable: 'indexedDB' in window,
        sizeEstimateMB: 'N/A',
        quotaEstimateMB: 'N/A'
      }
    };
  }
};

// ポーカーユーティリティ関数を直接定義

// ポジション順序の定義（UTGが最も早く、BBが最も遅い）
const POSITION_ORDER = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

// ポジションのインデックスを取得する関数
const getPositionIndex = (position: string): number => {
  return POSITION_ORDER.indexOf(position);
};

// vs オープンで有効なオープンレイザーポジションを取得する関数
const getValidOpenerPositions = (heroPosition: string, stackSize?: string): string[] => {
  const heroIndex = getPositionIndex(heroPosition);
  if (heroIndex <= 0) return []; // UTGまたは無効なポジションの場合、前のポジションは存在しない
  
  let validPositions = POSITION_ORDER.slice(0, heroIndex); // ヒーローより前のポジションのみ
  
  // 15BBでBBの場合、SBもオープナーとして追加（重複チェック）
  if (stackSize === '15BB' && heroPosition === 'BB' && !validPositions.includes('SB')) {
    validPositions.push('SB');
  }
  
  return validPositions;
};

// ポジション組み合わせが有効かチェックする関数
const isValidVsOpenCombination = (heroPosition: string, openerPosition: string, stackSize?: string): boolean => {
  const heroIndex = getPositionIndex(heroPosition);
  const openerIndex = getPositionIndex(openerPosition);
  
  // 基本的なチェック：オープンレイザーがヒーローより前のポジションである必要がある
  const basicValid = openerIndex < heroIndex && openerIndex >= 0 && heroIndex >= 0;
  
  // 15BBでBBの場合、SBからのオープンも許可
  if (stackSize === '15BB' && heroPosition === 'BB' && openerPosition === 'SB') {
    return true;
  }
  
  return basicValid;
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

// 現在のシナリオでハンドがNONEアクションかどうかをチェックする関数
const isHandNoneAction = (
  handType: string, 
  position: string, 
  stackSize: string, 
  actionType: string,
  customRanges: Record<string, Record<string, HandInfo>>
): boolean => {
  try {
    // スタックサイズを数値に変換
    const stackDepthBB = parseInt(stackSize.replace('BB', ''));
    
    // レンジキーを構築
    let rangeKey = '';
    
    if (actionType === 'open' || actionType === 'openraise') {
      rangeKey = `open_${position}_${stackSize}`;
    } else if (actionType === 'vsopen') {
      // vsOpenの場合、対戦相手ポジションは動的なのでデフォルトを使用
      rangeKey = `vsopen_${position}_vs_CO_${stackSize}`;
    } else if (actionType === 'vs3bet') {
      rangeKey = `vs3bet_${position}_vs_BTN_${stackSize}`;
    } else if (actionType === 'vs4bet') {
      rangeKey = `vs4bet_${position}_vs_CO_${stackSize}`;
    }

    // カスタムレンジからハンド情報を取得
    let rangeData: Record<string, HandInfo> | null = null;
    
    if (customRanges[rangeKey]) {
      rangeData = customRanges[rangeKey];
    }

    if (rangeData && rangeData[handType]) {
      return rangeData[handType].action === 'NONE';
    }
  } catch (error) {
    console.warn('NONEアクションチェックに失敗:', error);
  }
  
  return false;
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
  threeBetType?: string,
  spotData?: any // スポット情報を追加
) => {
  console.log('🎯 simulateMTTGTOData 関数が呼び出されました！');
  // カスタムレンジが空の場合は強制的に再読み込み
  let effectiveCustomRanges = customRanges;
  if (!customRanges || Object.keys(customRanges).length === 0) {
    console.log('🔄 カスタムレンジが空のため、ローカルストレージから強制読み込み');
    const localRanges = localStorage.getItem('mtt-custom-ranges');
    if (localRanges) {
      try {
        const parsedRanges = JSON.parse(localRanges);
        if (Object.keys(parsedRanges).length > 0) {
          effectiveCustomRanges = parsedRanges;
          console.log('✅ 強制読み込み成功:', {
            rangeKeys: Object.keys(parsedRanges),
            rangeCount: Object.keys(parsedRanges).length
          });
        }
      } catch (e) {
        console.error('強制読み込みエラー:', e);
      }
    }
  }

  console.log('🎯 simulateMTTGTOData 開始:', {
    hand,
    position,
    stackSize,
    actionType,
    openerPosition,
    threeBetType,
    hasCustomRanges: !!effectiveCustomRanges,
    customRangesKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : [],
    customRangesCount: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).length : 0,
    originalCustomRangesCount: customRanges ? Object.keys(customRanges).length : 0
  });
  
  // K4ハンドの特別デバッグ
  if (hand && hand.length === 2 && hand.includes('K') && hand.includes('4')) {
    console.log('🚨 K4ハンド検出 - 詳細デバッグ:', {
      hand,
      normalizedHandType: normalizeHandType(hand),
      position,
      stackSize,
      actionType,
      hasCustomRanges: !!effectiveCustomRanges,
      customRangesKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : []
    });
  }
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
      // 15BBの場合はスタックサイズを含むキーを優先（管理画面で設定される形式）
      rangeKey = `${position}_15BB`;
      fallbackRangeKey = position;
      console.log('🎯 15BB オープンレイズ レンジキー設定:', { 
        stackSize, 
        rangeKey, 
        fallbackRangeKey,
        handType: normalizedHandType 
      });
    } else {
      // その他のスタックサイズは新しいキー形式を使用
      rangeKey = `${position}_${stackSize}`;
      // 15BBレンジがある場合はフォールバックとして使用
      fallbackRangeKey = `${position}_15BB`;
      // さらにフォールバックとしてポジション名のみも試行
      const finalFallbackKey = position;
      console.log('🎯 その他スタックサイズ オープンレイズ レンジキー設定:', { 
        stackSize, 
        rangeKey,
        fallbackRangeKey,
        finalFallbackKey,
        handType: normalizedHandType 
      });
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
    
    // スタック固有レンジを優先し、複数フォールバックレンジも確認
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    // 1. メインレンジキーを試行
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
      console.log('✅ オープンレイズ カスタムレンジ発見 (スタック固有):', { rangeKey, handType: normalizedHandType, customHandData });
    } 
    // 2. 15BBフォールバックを試行
    else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('✅ オープンレイズ 15BBフォールバックレンジ使用:', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } 
    // 3. ポジション名のみのフォールバックを試行
    else if (customRanges && customRanges[position] && customRanges[position][normalizedHandType]) {
      customHandData = customRanges[position][normalizedHandType];
      usedRangeKey = position;
      console.log('✅ オープンレイズ ポジション名フォールバックレンジ使用:', { position, handType: normalizedHandType, customHandData });
    } else {
      console.log('❌ オープンレイズ カスタムレンジ未発見:', { 
        rangeKey, 
        fallbackRangeKey, 
        position,
        handType: normalizedHandType,
        hasCustomRanges: !!customRanges,
        availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
        hasRangeKey: !!(customRanges && customRanges[rangeKey]),
        hasFallbackKey: !!(customRanges && fallbackRangeKey && customRanges[fallbackRangeKey]),
        hasPositionKey: !!(customRanges && customRanges[position]),
        rangeKeyData: customRanges && customRanges[rangeKey] ? Object.keys(customRanges[rangeKey]) : [],
        fallbackKeyData: customRanges && fallbackRangeKey && customRanges[fallbackRangeKey] ? Object.keys(customRanges[fallbackRangeKey]) : [],
        positionKeyData: customRanges && customRanges[position] ? Object.keys(customRanges[position]) : []
      });
    }
    
    if (customHandData) {
      // カスタムレンジから頻度データを取得
      console.log('🎯 オープンレイズ カスタムレンジ適用:', { 
        handType: normalizedHandType, 
        customHandData,
        usedRangeKey
      });
      
      // K4ハンドの特別デバッグ
      if (normalizedHandType === 'K4o' || normalizedHandType === 'K4s') {
        console.log('🚨 K4ハンド カスタムレンジ処理:', {
          handType: normalizedHandType,
          customHandData,
          usedRangeKey,
          action: customHandData.action,
          frequency: customHandData.frequency
        });
      }
      
      let customFrequencies: { [action: string]: number } = {
        'FOLD': 0,
        'CALL': 0,
        'RAISE': 0,
        'ALL_IN': 0
      };
      
      let customPrimaryAction: string = 'FOLD';
      
      if (customHandData.mixedFrequencies) {
        // 混合戦略の場合 - 元の比率をそのまま保持
        const mixedFreq = customHandData.mixedFrequencies as { FOLD?: number; CALL?: number; RAISE?: number; ALL_IN?: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 混合戦略の場合は、元の比率を保持してMIXEDアクションとして扱う
        customPrimaryAction = 'MIXED';
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
        
        // FOLDアクションの場合は確実にFOLDを維持
        if (customHandData.action.toUpperCase() === 'FOLD') {
          customPrimaryAction = 'FOLD';
        }
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
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
      
      // K4ハンドの最終決定デバッグ
      if (normalizedHandType === 'K4o' || normalizedHandType === 'K4s') {
        console.log('🚨 K4ハンド 最終決定:', {
          handType: normalizedHandType,
          originalAction: customHandData.action,
          finalAction: customPrimaryAction,
          frequencies: customFrequencies,
          correctAction: customPrimaryAction
        });
      }
      
      const positionAdvice = getPositionAdvice(position, customPrimaryAction, stackDepthBB);
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}でのオープンレイズ戦略です。`,
        stackSizeStrategy: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : positionAdvice,
        icmConsideration: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'MIXED' 
          ? 0 // 混合戦略の場合は推奨サイズなし
          : customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        strategicAnalysis: customPrimaryAction === 'MIXED'
          ? `カスタム${stackSize}オープンレイズ混合戦略: ${normalizedHandType}は混合戦略（FOLD: ${customFrequencies.FOLD}%, CALL: ${customFrequencies.CALL}%, RAISE: ${customFrequencies.RAISE}%, ALL_IN: ${customFrequencies.ALL_IN}%）が設定されています。`
          : `カスタム${stackSize}オープンレイズ: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        exploitSuggestion: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : getExploitSuggestion(customPrimaryAction, position, normalizedHandType),
        isCustomRange: true, // カスタムレンジ使用を示すフラグ
        usedRangeKey, // デバッグ用
        isMixedStrategy: customPrimaryAction === 'MIXED',
        mixedFrequencies: customPrimaryAction === 'MIXED' ? customFrequencies : undefined
      };
    }
  }

  // vs オープンの場合の特別処理
  if (actionType === 'vsopen' && openerPosition) {
    // ポジション組み合わせの検証
    if (!isValidVsOpenCombination(position, openerPosition, stackSize)) {
      console.error('❌ 無効なvsオープン組み合わせ:', {
        heroPosition: position,
        openerPosition,
        validOpeners: getValidOpenerPositions(position, stackSize),
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
        stackSizeStrategy: `${position}ポジションに対して、${openerPosition}からのオープンは無効です。有効なオープンレイザー: ${getValidOpenerPositions(position, stackSize).join(', ')}`,
        icmConsideration: 'vs オープンでは、オープンレイザーはヒーローより前のポジションである必要があります。',
        recommendedBetSize: 0,
        isInvalidCombination: true,
        errorMessage: `${openerPosition} から ${position} への vs オープンは不可能です。`,
        validOpeners: getValidOpenerPositions(position, stackSize)
      };
    }
    
    // カスタムレンジが設定されている場合はそれを使用
    // 15BBでオールイン・リンプ対応のレンジキー構築
    let rangeKey: string;
    let fallbackRangeKey: string | null = null;
    
    if (stackSize === '15BB') {
      // 15BBの場合は、デフォルトでレイズキーを使用
      // オールイン・リンプキーは独立したレンジとして扱う（フォールバック無効）
      rangeKey = `vsopen_${position}_vs_${openerPosition}`;
      
      // SBアクションに応じて動的にレンジキーを変更
      if (spotData && openerPosition === 'SB' && position === 'BB') {
        if (spotData.openRaiseSize === 15.0) {
          rangeKey = `${rangeKey}_allin`;
        } else if (spotData.openRaiseSize === 2.0) {
          rangeKey = `${rangeKey}_raise`;
        } else if (spotData.openRaiseSize === 1.0) {
          rangeKey = `${rangeKey}_limp`;
        }
      }
      
      fallbackRangeKey = null; // 15BBではフォールバック無効
      
      console.log('🎯 15BB vsopen レンジキー設定:', { 
        stackSize, 
        openerPosition,
        rangeKey, 
        fallbackRangeKey,
        handType: normalizedHandType,
        spotData: spotData ? { openRaiseSize: spotData.openRaiseSize } : null,
        note: 'オールイン・リンプキーは管理画面で別途設定'
      });
    } else {
      // その他のスタックサイズは新しいキー形式を使用
      rangeKey = `vsopen_${position}_vs_${openerPosition}_${stackSize}`;
      // 15BBレンジがある場合はフォールバックとして使用
      fallbackRangeKey = `vsopen_${position}_vs_${openerPosition}`;
      console.log('🎯 その他スタックサイズ vsopen レンジキー設定:', { 
        stackSize, 
        rangeKey,
        fallbackRangeKey,
        handType: normalizedHandType 
      });
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
    
    // スタック固有レンジを優先し、複数フォールバックレンジも確認
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    // 1. メインレンジキーを試行
    if (customRanges && customRanges[rangeKey] && customRanges[rangeKey][normalizedHandType]) {
      customHandData = customRanges[rangeKey][normalizedHandType];
      console.log('✅ vsopen カスタムレンジ発見 (スタック固有):', { rangeKey, handType: normalizedHandType, customHandData });
    } 
    // 2. 15BBフォールバックを試行
    else if (fallbackRangeKey && customRanges && customRanges[fallbackRangeKey] && customRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = customRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('✅ vsopen 15BBフォールバックレンジ使用:', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } else {
      console.log('❌ vsopen カスタムレンジ未発見:', { 
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
      console.log('✅ vs オープン カスタムレンジ使用:', {
        usedRangeKey,
        handType: normalizedHandType,
        customHandData
      });
      
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合 - 元の比率をそのまま保持
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 混合戦略の場合は、元の比率を保持してMIXEDアクションとして扱う
        customPrimaryAction = 'MIXED';
        
        console.log('🎯 vs open MIXEDアクション処理（比率保持版）:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction,
          handType: normalizedHandType
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
        
        // デバッグログ: アクション変換の詳細
        console.log('🔍 vsOpen アクション変換デバッグ:', {
          originalAction: customHandData.action,
          mappedAction: customPrimaryAction,
          actionMapping: actionMapping,
          willCheckAllIn: customHandData.action.toUpperCase() !== 'FOLD' && 
                         customHandData.action.toUpperCase() !== 'MIN' && 
                         customHandData.action.toUpperCase() !== 'CALL' && 
                         customHandData.action.toUpperCase() !== 'RAISE' && 
                         customHandData.action.toUpperCase().includes('ALL')
        });
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
          console.log('🚨 vsOpen オールインアクション特別処理実行:', {
            originalAction: customHandData.action,
            finalAction: customPrimaryAction
          });
        }
        
        // 頻度データを正しく設定
        const actionKey = customPrimaryAction as keyof typeof customFrequencies;
        customFrequencies[actionKey] = customHandData.frequency;
        
        // 残りの頻度をFOLDに設定
        if (customHandData.frequency < 100) {
          customFrequencies['FOLD'] = 100 - customHandData.frequency;
        }
        
        console.log('🎯 vs3bet 単一アクション処理デバッグ:', {
          originalAction: customHandData.action,
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
        stackSizeStrategy: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : vsOpenAdvice,
        icmConsideration: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'MIXED' 
          ? 0 // 混合戦略の場合は推奨サイズなし
          : customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? 2.2 : 0,
        openerInfo: getOpenerInfo(openerPosition),
        openRaiserPosition: openerPosition,
        openRaiseSize: currentOpenRaiseSize,
        isVsOpen: true,
        isCustomRange: true, // カスタムレンジ使用を示すフラグ
        isMixedStrategy: customPrimaryAction === 'MIXED',
        mixedFrequencies: customPrimaryAction === 'MIXED' ? customFrequencies : undefined
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
    
    // vs3betでは3ベッターのポジションが必要（ヒーローに対する3ベッターの位置）
    let threeBetterPosition: string;
    
    // 3ベッターのポジションを決定（常にヒーローより後のポジションから選択）
    const getValidThreeBetters = (heroPos: string): string[] => {
      const heroIndex = getPositionIndex(heroPos);
      if (heroIndex >= POSITION_ORDER.length - 1) return []; // 最後のポジションの場合、後のポジションは存在しない
      
      // ヒーローより後のポジションから、ヒーローと同じポジションを除外
      const allAfterHero = POSITION_ORDER.slice(heroIndex + 1);
      const validPositions = allAfterHero.filter(pos => pos !== heroPos);
      
      console.log('🔍 getValidThreeBetters:', {
        heroPos,
        heroIndex,
        positionOrder: POSITION_ORDER,
        allAfterHero,
        validPositions,
        reason: 'ヒーローと同じポジションを除外',
        validation: {
          heroIndexValid: heroIndex >= 0,
          hasAfterPositions: allAfterHero.length > 0,
          hasValidPositions: validPositions.length > 0
        }
      });
      
      return validPositions;
    };
    
    // openerPositionの検証と3ベッターポジションの決定
    console.log('🔍 3ベッターポジション決定開始:', {
      heroPosition: position,
      openerPosition,
      heroIndex: getPositionIndex(position),
      validThreeBetters: getValidThreeBetters(position),
      positionOrder: POSITION_ORDER
    });
    
    // openerPositionの厳密な検証と3ベッターポジションの決定
    let isOpenerPositionValid = false;
    if (openerPosition && openerPosition !== position) {
      // ヒーローより後のポジションかどうかを厳密にチェック
      const heroIndex = getPositionIndex(position);
      const openerIndex = getPositionIndex(openerPosition);
      const validThreeBetters = getValidThreeBetters(position);
      
      isOpenerPositionValid = openerIndex > heroIndex && validThreeBetters.includes(openerPosition);
      
      console.log('🔍 openerPosition厳密検証:', {
        openerPosition,
        heroPosition: position,
        isSameAsHero: openerPosition === position,
        isAfterHero: openerIndex > heroIndex,
        isValidPosition: isOpenerPositionValid,
        openerPositionIndex: openerIndex,
        heroIndex: heroIndex,
        validThreeBetters: validThreeBetters,
        positionOrder: POSITION_ORDER,
        validation: {
          isDifferentFromHero: openerPosition !== position,
          isAfterHero: openerIndex > heroIndex,
          isInValidThreeBetters: validThreeBetters.includes(openerPosition),
          finalValidation: openerIndex > heroIndex && validThreeBetters.includes(openerPosition)
        }
      });
    }
    
    // generateNewScenarioから渡されたopenerPositionを優先的に使用
    if (isOpenerPositionValid && openerPosition) {
      threeBetterPosition = openerPosition;
      console.log('✅ generateNewScenarioから渡されたopenerPositionを使用:', {
        heroPosition: position,
        threeBetterPosition,
        openerPosition,
        source: 'generateNewScenario',
        validation: {
          isDifferentFromHero: openerPosition !== position,
          isAfterHero: getPositionIndex(openerPosition) > getPositionIndex(position),
          isValidPosition: isOpenerPositionValid
        }
      });
    } else {
      // openerPositionが無効または未設定の場合は、必ず新しく有効な3ベッターを選択
      const validThreeBetters = getValidThreeBetters(position);
      if (validThreeBetters.length === 0) {
        // 有効な3ベッターがいない場合はフォールド
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -3, 'RAISE': -3, 'ALL_IN': -3 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: '❌ 無効なvs3ベット設定: 有効な3ベッターが存在しません',
          stackSizeStrategy: 'vs3ベットには、ヒーローより後のポジションの3ベッターが必要です。',
          icmConsideration: 'ポジション設定を確認してください。',
          recommendedBetSize: 0
        };
      }
      
      // ランダム選択を確実に行う
      const randomIndex = Math.floor(Math.random() * validThreeBetters.length);
      threeBetterPosition = validThreeBetters[randomIndex];
      // setCurrentOpponentPosition(threeBetterPosition); // TODO: コンポーネント内で呼ぶように修正
      
      console.log('🔄 新しい3ベッターポジションを選択:', {
        heroPosition: position,
        threeBetterPosition,
        validOptions: validThreeBetters,
        randomIndex,
        reason: openerPosition ? `openerPosition(${openerPosition})が無効` : 'openerPosition未設定',
        openerPositionValidation: {
          isSameAsHero: openerPosition === position,
          isValidPosition: isOpenerPositionValid,
          openerPositionIndex: openerPosition ? getPositionIndex(openerPosition) : -1
        }
      });
      
      // 選択されたポジションが有効か再確認
      if (threeBetterPosition === position || getPositionIndex(threeBetterPosition) <= getPositionIndex(position)) {
        console.error('❌ 新規選択で無効な3ベッターポジションが選ばれました:', {
          heroPosition: position,
          selectedPosition: threeBetterPosition,
          heroIndex: getPositionIndex(position),
          selectedIndex: getPositionIndex(threeBetterPosition),
          validThreeBetters,
          randomIndex,
          reason: 'ヒーローと同じポジション、またはヒーローより前のポジションが選択されました'
        });
        
        // 強制的に有効なポジションを選択
        const safeOptions = validThreeBetters.filter(pos => 
          pos !== position && getPositionIndex(pos) > getPositionIndex(position)
        );
        
        if (safeOptions.length > 0) {
          threeBetterPosition = safeOptions[Math.floor(Math.random() * safeOptions.length)];
          console.log('🔄 強制修正で3ベッターポジションを再選択:', {
            from: '無効なポジション',
            to: threeBetterPosition,
            safeOptions,
            reason: '無効なポジションが選択されていたため強制修正'
          });
        } else {
          console.error('❌ 安全な3ベッターポジションが存在しません:', {
            heroPosition: position,
            validThreeBetters,
            safeOptions
          });
        }
      }
    }
    
    // 最終確認：3ベッターのポジションが正しく設定されているか
    if (threeBetterPosition === position || getPositionIndex(threeBetterPosition) <= getPositionIndex(position)) {
      console.error('❌ 最終確認で無効な3ベッターのポジションが設定されています:', {
        heroPosition: position,
        threeBetterPosition,
        openerPosition,
        heroIndex: getPositionIndex(position),
        threeBetterIndex: getPositionIndex(threeBetterPosition),
        reason: 'ヒーローと同じポジション、またはヒーローより前のポジションが設定されています。これは完全にありえない状況です。強制修正が必要です。'
      });
      
      // 強制的にヒーローより後のポジションを選択
      const validThreeBetters = POSITION_ORDER.slice(getPositionIndex(position) + 1).filter(pos => pos !== position);
      if (validThreeBetters.length > 0) {
        // ヒーローと同じポジションを除外して選択
        const safeOptions = validThreeBetters.filter(pos => 
          pos !== position && getPositionIndex(pos) > getPositionIndex(position)
        );
        
        if (safeOptions.length > 0) {
          threeBetterPosition = safeOptions[Math.floor(Math.random() * safeOptions.length)];
          console.log('🔄 最終強制修正完了:', {
            from: '無効なポジション',
            to: threeBetterPosition,
            safeOptions,
            reason: '無効なポジションが設定されていたため強制修正'
          });
        } else {
          console.error('❌ 安全な3ベッターポジションが存在しません:', {
            heroPosition: position,
            validThreeBetters,
            safeOptions
          });
        }
      }
    }
    
    // 最終的な3ベッターポジションの有効性を確認
    const finalValidation = threeBetterPosition !== position && getPositionIndex(threeBetterPosition) > getPositionIndex(position);
    if (!finalValidation) {
      console.error('❌ 最終検証で無効な3ベッターポジションが設定されています:', {
        heroPosition: position,
        threeBetterPosition,
        heroIndex: getPositionIndex(position),
        threeBetterIndex: getPositionIndex(threeBetterPosition),
        reason: 'simulateMTTGTODataでの設定が無効です。これは完全にありえない状況です。'
      });
      
      // 強制的に有効なポジションを設定
      const validOptions = POSITION_ORDER.slice(getPositionIndex(position) + 1).filter(pos => pos !== position);
      if (validOptions.length > 0) {
        threeBetterPosition = validOptions[Math.floor(Math.random() * validOptions.length)];
        console.log('🔄 simulateMTTGTOData最終強制修正:', {
          from: '無効なポジション',
          to: threeBetterPosition,
          validOptions,
          reason: '最終検証で無効なポジションが発見されたため強制修正'
        });
      }
    }
    
    console.log('🎯 vs3bet ポジション設定完了:', {
      heroPosition: position,
      threeBetterPosition,
      openerPosition,
      heroIndex: getPositionIndex(position),
      threeBetterIndex: getPositionIndex(threeBetterPosition),
      validThreeBetters: POSITION_ORDER.slice(getPositionIndex(position) + 1),
      positionValidation: {
        areDifferent: position !== threeBetterPosition,
        heroIndexValid: getPositionIndex(position) >= 0,
        threeBetterIndexValid: getPositionIndex(threeBetterPosition) >= 0,
        threeBetterAfterHero: getPositionIndex(threeBetterPosition) > getPositionIndex(position)
      }
    });
    
    // スタック固有のレンジキーを構築（ヒーロー vs 3ベッターの形式）
    // UTG+1とUTG1の表記統一
    const normalizedPosition = position === 'UTG+1' ? 'UTG1' : position;
    const normalizedThreeBetterPosition = threeBetterPosition === 'UTG+1' ? 'UTG1' : threeBetterPosition;
    
    // 15BBの場合は既存キーを優先し、新しいキーをフォールバックとして使用
    let rangeKey: string;
    let fallbackRangeKey: string | null = null;
    
    if (stackSize === '15BB') {
      // 15BBの場合はスタックサイズを含むキーを優先（管理画面で設定される形式）
      rangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_15BB`;
      fallbackRangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`;
      console.log('🎯 15BB vs3bet レンジキー設定:', { 
        stackSize, 
        rangeKey, 
        fallbackRangeKey,
        handType: normalizedHandType 
      });
    } else if (stackSize === '20BB' && threeBetType) {
      // 20BBの場合は3ベットタイプを使用（レイズまたはオールイン）
      rangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_${threeBetType}_20BB`;
      console.log('🎯 20BB 3ベットタイプ別レンジ使用:', { 
        threeBetType, 
        rangeKey, 
        handType: normalizedHandType 
      });
    } else {
      // その他のスタックサイズは新しいキー形式を使用
      rangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_${stackSize}`;
      // 15BBレンジがある場合はフォールバックとして使用
      fallbackRangeKey = `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`;
      console.log('🎯 その他スタックサイズ vs3bet レンジキー設定:', { 
        stackSize, 
        rangeKey,
        fallbackRangeKey,
        handType: normalizedHandType 
      });
    }
    
    console.log('🎯 レンジキー正規化:', {
      originalPosition: position,
      originalThreeBetterPosition: threeBetterPosition,
      normalizedPosition,
      normalizedThreeBetterPosition,
      rangeKey,
      fallbackRangeKey,
      positionValidation: {
        isHeroValid: position && position !== '',
        isThreeBetterValid: threeBetterPosition && threeBetterPosition !== '',
        areDifferent: position !== threeBetterPosition,
        heroIndex: getPositionIndex(position),
        threeBetterIndex: getPositionIndex(threeBetterPosition)
      }
    });
    
    console.log('🔍 vs 3ベット分析:', {
      rangeKey,
      fallbackRangeKey,
      stackSize,
      handType: normalizedHandType,
      hasCustomRanges: !!effectiveCustomRanges,
      hasThisRange: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
      hasFallbackRange: !!(effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey]),
      hasThisHand: !!(effectiveCustomRanges && (
        (effectiveCustomRanges[rangeKey] && effectiveCustomRanges[rangeKey][normalizedHandType]) ||
        (fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey] && effectiveCustomRanges[fallbackRangeKey][normalizedHandType])
      )),
      availableRangeKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : [],
      // 詳細な検索結果
      rangeKeyExists: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
      rangeKeyData: effectiveCustomRanges && effectiveCustomRanges[rangeKey] ? Object.keys(effectiveCustomRanges[rangeKey]) : [],
      handInRangeKey: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey] && effectiveCustomRanges[rangeKey][normalizedHandType]),
      fallbackKeyExists: !!(effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey]),
      fallbackKeyData: effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey] ? Object.keys(effectiveCustomRanges[fallbackRangeKey]) : [],
      handInFallbackKey: !!(effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey] && effectiveCustomRanges[fallbackRangeKey][normalizedHandType])
    });
    
    // カスタムレンジの詳細デバッグ
    console.log('🎯 カスタムレンジ詳細デバッグ:', {
      customRangesExists: !!effectiveCustomRanges,
      customRangesKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : [],
      targetRangeKey: rangeKey,
      targetHandType: normalizedHandType,
      hasTargetRange: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
      targetRangeData: effectiveCustomRanges && effectiveCustomRanges[rangeKey] ? Object.keys(effectiveCustomRanges[rangeKey]) : [],
      hasTargetHand: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey] && effectiveCustomRanges[rangeKey][normalizedHandType])
    });
    
    // スタック固有レンジを優先し、15BBの場合は既存レンジにもフォールバック
    let customHandData = null;
    let usedRangeKey = rangeKey;
    
    console.log('🔍 Searching for custom range:', {
      rangeKey,
      fallbackRangeKey,
      handType: normalizedHandType,
      hasCustomRanges: !!effectiveCustomRanges,
      customRangesKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : [],
      targetRangeExists: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
      targetHandExists: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey] && effectiveCustomRanges[rangeKey][normalizedHandType])
    });
    
    if (effectiveCustomRanges && effectiveCustomRanges[rangeKey] && effectiveCustomRanges[rangeKey][normalizedHandType]) {
      customHandData = effectiveCustomRanges[rangeKey][normalizedHandType];
      console.log('🎯 vs3bet カスタムレンジ発見 (優先キー):', { rangeKey, handType: normalizedHandType, customHandData });
    } else if (fallbackRangeKey && effectiveCustomRanges && effectiveCustomRanges[fallbackRangeKey] && effectiveCustomRanges[fallbackRangeKey][normalizedHandType]) {
      customHandData = effectiveCustomRanges[fallbackRangeKey][normalizedHandType];
      usedRangeKey = fallbackRangeKey;
      console.log('🎯 vs3bet フォールバックレンジ使用:', { fallbackRangeKey, handType: normalizedHandType, customHandData });
    } else {
      // 20BBの場合、タイプ別レンジが見つからない場合のデバッグ
      if (stackSize === '20BB' && threeBetType) {
        console.log('🎯 20BB タイプ別レンジ未発見の詳細デバッグ:', {
          threeBetType,
          rangeKey,
          normalizedHandType,
          availableRangeKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB')) : [],
          matchingRangeKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes(normalizedPosition) && key.includes(normalizedThreeBetterPosition)) : [],
          hasRangeKey: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
          rangeKeyData: effectiveCustomRanges && effectiveCustomRanges[rangeKey] ? Object.keys(effectiveCustomRanges[rangeKey]) : [],
          // 20BBのタイプ別レンジの詳細確認
          has20BBRaiseRanges: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes('raise')).length : 0,
          has20BBAllinRanges: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes('allin')).length : 0,
          twentyBBRaiseRanges: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes('raise')) : [],
          twentyBBAllinRanges: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes('allin')) : [],
          // 現在のレンジキーに一致するレンジが存在するかチェック
          exactMatchExists: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).includes(rangeKey) : false,
          partialMatches: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.includes('20BB') && key.includes(normalizedPosition) && key.includes(normalizedThreeBetterPosition)) : []
        });
      }
      console.log('🎯 vs3bet カスタムレンジ未発見:', { 
        rangeKey, 
        fallbackRangeKey, 
        handType: normalizedHandType,
        hasCustomRanges: !!effectiveCustomRanges,
        availableRangeKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : [],
        hasRangeKey: !!(effectiveCustomRanges && effectiveCustomRanges[rangeKey]),
        hasFallbackKey: !!(effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey]),
        rangeKeyData: effectiveCustomRanges && effectiveCustomRanges[rangeKey] ? Object.keys(effectiveCustomRanges[rangeKey]) : [],
        fallbackKeyData: effectiveCustomRanges && fallbackRangeKey && effectiveCustomRanges[fallbackRangeKey] ? Object.keys(effectiveCustomRanges[fallbackRangeKey]) : [],
        // 15BB専用のデバッグ情報
        ...(stackSize === '15BB' && {
          vs3bet15BBKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.startsWith('vs3bet_') && !key.includes('_15BB') && !key.includes('_20BB') && !key.includes('_30BB') && !key.includes('_40BB') && !key.includes('_50BB') && !key.includes('_75BB') && !key.includes('_100BB')) : [],
          vs3bet15BBSpecificKeys: effectiveCustomRanges ? Object.keys(effectiveCustomRanges).filter(key => key.startsWith('vs3bet_') && key.includes('_15BB')) : []
        })
      });
      
      // サーバーベース GTOレンジの緊急取得（レンジが空の場合）
      if (!effectiveCustomRanges || Object.keys(effectiveCustomRanges).length === 0) {
        console.log('🎯 レンジが空 - サーバーからGTOレンジの緊急取得を実行');
        
        // サーバーからリアルタイムでGTOレンジを取得（非同期）
        fetch('/api/mtt-ranges')
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error('GTOレンジAPIエラー');
          })
          .then(systemData => {
            if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
              console.log('🚀 緊急取得: サーバーからGTOレンジを取得成功');
              
              // 次回シナリオ生成時のために情報をログ出力
              console.log('📦 緊急取得したGTOレンジを確認 - 自動同期により次回反映予定', {
                rangeCount: Object.keys(systemData.ranges).length,
                hasTargetRange: !!systemData.ranges[rangeKey],
                hasTargetHand: !!(systemData.ranges[rangeKey] && systemData.ranges[rangeKey][normalizedHandType])
              });
            }
          })
          .catch(fetchError => {
            console.error('❌ 緊急GTOレンジ取得失敗:', fetchError);
          });
      }
      
              // カスタムレンジが見つからない場合は注意メッセージを表示
        if (!customHandData) {
          console.log('🎯 カスタムレンジ未発見 - 注意メッセージを表示:', {
            handType: normalizedHandType,
            rangeKey,
            fallbackRangeKey,
            hasCustomRanges: !!effectiveCustomRanges,
            availableRanges: effectiveCustomRanges ? Object.keys(effectiveCustomRanges) : []
          });
        
        // カスタムレンジが設定されていない場合は注意メッセージを返す
        return {
          correctAction: 'FOLD',
          evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
          frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
          normalizedHandType: finalHandType,
          effectiveStackExplanation: `このハンド(${normalizedHandType})のカスタムレンジが設定されていません。`,
          stackSizeStrategy: `管理画面でカスタムレンジを設定してください。`,
          icmConsideration: `カスタムレンジが設定されていないため、FOLD 100%が推奨されます。`,
          recommendedBetSize: 0,
          isCustomRangeNotSet: true,
          customRangeNotSetMessage: `このハンド(${normalizedHandType})のカスタムレンジが設定されていません。管理画面でレンジを設定してください。`,
          targetRangeKey: rangeKey,
          fallbackRangeKey: fallbackRangeKey
        };
      }
    }
    
    if (customHandData) {
      // カスタムレンジから頻度データを取得
      let customFrequencies = { 'FOLD': 0, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
      let customPrimaryAction = 'FOLD';
      
      if (customHandData.action === 'MIXED' && customHandData.mixedFrequencies) {
        // 混合戦略の場合 - 元の比率をそのまま保持
        const mixedFreq = customHandData.mixedFrequencies as { FOLD: number; CALL: number; RAISE: number; ALL_IN: number; MIN?: number; };
        
        // 正確な頻度計算（正規化なしで元の値を保持）
        customFrequencies = {
          'FOLD': mixedFreq.FOLD || 0,
          'CALL': mixedFreq.CALL || 0,
          'RAISE': (mixedFreq.RAISE || 0) + (mixedFreq.MIN || 0), // MINをRAISEに統合
          'ALL_IN': mixedFreq.ALL_IN || 0
        };
        
        // 混合戦略の場合は、元の比率を保持してMIXEDアクションとして扱う
        customPrimaryAction = 'MIXED';
        
        console.log('🎯 MIXEDアクション処理（比率保持版）:', {
          mixedFreq,
          customFrequencies,
          customPrimaryAction,
          handType: normalizedHandType,
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
        // 単一アクションの場合 - カスタムレンジの設定をそのまま尊重
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
        
        // デバッグログ: アクション変換の詳細
        console.log('🔍 vs3bet アクション変換デバッグ:', {
          originalAction: customHandData.action,
          mappedAction: customPrimaryAction,
          actionMapping: actionMapping,
          willCheckAllIn: customHandData.action.toUpperCase() !== 'FOLD' && 
                         customHandData.action.toUpperCase() !== 'MIN' && 
                         customHandData.action.toUpperCase() !== 'CALL' && 
                         customHandData.action.toUpperCase() !== 'RAISE' && 
                         customHandData.action.toUpperCase().includes('ALL')
        });
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
          console.log('🚨 vs3bet オールインアクション特別処理実行:', {
            originalAction: customHandData.action,
            finalAction: customPrimaryAction
          });
        }
        
        console.log('🎯 アクション正規化処理:', {
          originalAction: customHandData.action,
          normalizedAction: customPrimaryAction,
          frequency: customHandData.frequency
        });
        
        // 頻度データを正しく設定
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
        handType: normalizedHandType
      });
      
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
        originalAction: customHandData.action,
        primaryAction: customPrimaryAction,
        frequencies: customFrequencies,
        correctAction: customPrimaryAction,
        actionNormalized: customHandData.action !== customPrimaryAction
      });
      
      // アクションの検証（デバッグ用）
      console.log('🎯 最終アクション検証:', {
        handType: normalizedHandType,
        originalAction: customHandData.action,
        finalAction: customPrimaryAction,
        isActionChanged: customHandData.action !== customPrimaryAction,
        frequencies: customFrequencies
      });
      
      return {
        correctAction: customPrimaryAction,
        evData: customEvData,
        frequencies: customFrequencies,
        normalizedHandType: finalHandType,
        effectiveStackExplanation: `カスタムレンジ: ${position}ポジション${stackSize}でのvs 3ベット戦略です。`,
        stackSizeStrategy: customPrimaryAction === 'MIXED' 
          ? `vs 3ベット: カスタム設定により${normalizedHandType}は混合戦略（FOLD: ${customFrequencies.FOLD}%, CALL: ${customFrequencies.CALL}%, RAISE: ${customFrequencies.RAISE}%, ALL_IN: ${customFrequencies.ALL_IN}%）が設定されています。`
          : `vs 3ベット: カスタム設定により${normalizedHandType}は${customPrimaryAction}が推奨されます。`,
        icmConsideration: customPrimaryAction === 'MIXED' 
          ? `混合戦略: 各アクションの比率に従ってランダムに選択してください。`
          : getICMAdvice(stackDepthBB, customPrimaryAction, position),
        recommendedBetSize: customPrimaryAction === 'MIXED' 
          ? 0 // 混合戦略の場合は推奨サイズなし
          : customPrimaryAction === 'ALL_IN' ? stackDepthBB : customPrimaryAction === 'RAISE' ? Math.min(stackDepthBB * 0.7, 25) : 0,
        strategicAnalysis: customPrimaryAction === 'MIXED'
          ? `カスタムvs3ベット混合戦略: ${normalizedHandType}は混合戦略（FOLD: ${customFrequencies.FOLD}%, CALL: ${customFrequencies.CALL}%, RAISE: ${customFrequencies.RAISE}%, ALL_IN: ${customFrequencies.CALL}%）が設定されています。`
          : `カスタムvs3ベット戦略: ${normalizedHandType}は${customPrimaryAction}が設定されています。`,
        isCustomRange: true,
        isMixedStrategy: customPrimaryAction === 'MIXED',
        mixedFrequencies: customPrimaryAction === 'MIXED' ? customFrequencies : undefined
      };
    }
    
    // カスタムレンジがない場合は注意メッセージを表示
    console.log('🎯 vs3bet カスタムレンジなし - 注意メッセージ表示:', {
      handType: normalizedHandType,
      stackSize,
      hasCustomRanges: !!customRanges,
      availableRangeKeys: customRanges ? Object.keys(customRanges) : [],
      // 15BB専用のデバッグ情報
      ...(stackSize === '15BB' && {
        vs3bet15BBKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && !key.includes('_15BB') && !key.includes('_20BB') && !key.includes('_30BB') && !key.includes('_40BB') && !key.includes('_50BB') && !key.includes('_75BB') && !key.includes('_100BB')) : [],
        vs3bet15BBSpecificKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.includes('_15BB')) : [],
        targetRangeKey: `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`,
        targetFallbackKey: `vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_15BB`,
        hasTargetRange: !!(customRanges && customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`]),
        hasTargetFallback: !!(customRanges && customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_15BB`]),
        targetRangeData: customRanges && customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`] ? 
          Object.keys(customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}`]) : null,
        targetFallbackData: customRanges && customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_15BB`] ? 
          Object.keys(customRanges[`vs3bet_${normalizedPosition}_vs_${normalizedThreeBetterPosition}_15BB`]) : null
      })
    });
    
    // カスタムレンジが設定されていない場合は、強制的にALLINを返すのではなく、FOLDを推奨
    return {
      correctAction: 'FOLD',
      evData: { 'FOLD': 0, 'CALL': -5, 'RAISE': -5, 'ALL_IN': -5 },
      frequencies: { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 },
      normalizedHandType: finalHandType,
      effectiveStackExplanation: `このハンド(${normalizedHandType})のカスタムレンジが設定されていません。`,
      stackSizeStrategy: `管理画面でカスタムレンジを設定してください。`,
      icmConsideration: `カスタムレンジが設定されていないため、FOLD 100%が推奨されます。`,
      recommendedBetSize: 0,
      isCustomRange: false,
      isCustomRangeNotSet: true,
      customRangeNotSetMessage: `このハンド(${normalizedHandType})のカスタムレンジが設定されていません。管理画面でレンジを設定してください。`,
      targetRangeKey: rangeKey,
      fallbackRangeKey: fallbackRangeKey
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
      // setCurrentOpponentPosition(fourBetterPosition); // TODO: コンポーネント内で呼ぶように修正
    }
    
    // スタック固有のレンジキーを構築（3ベッター vs 4ベッターの形式）
    const rangeKey = `vs4bet_${position}_vs_${fourBetterPosition}_${stackSize}`;
    // 15BBレンジがある場合はフォールバックとして使用
    const fallbackRangeKey = `vs4bet_${position}_vs_${fourBetterPosition}`;
    
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
        
        // デバッグログ: アクション変換の詳細
        console.log('🔍 vs4bet アクション変換デバッグ:', {
          originalAction: customHandData.action,
          mappedAction: customPrimaryAction,
          actionMapping: actionMapping,
          willCheckAllIn: customHandData.action.toUpperCase() !== 'FOLD' && 
                         customHandData.action.toUpperCase() !== 'MIN' && 
                         customHandData.action.toUpperCase() !== 'CALL' && 
                         customHandData.action.toUpperCase() !== 'RAISE' && 
                         customHandData.action.toUpperCase().includes('ALL')
        });
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
          customPrimaryAction = 'ALL_IN';
          console.log('🚨 vs4bet オールインアクション特別処理実行:', {
            originalAction: customHandData.action,
            finalAction: customPrimaryAction
          });
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
        
        // FOLDアクションの場合は確実にFOLDを維持
        if (customHandData.action.toUpperCase() === 'FOLD') {
          customPrimaryAction = 'FOLD';
        }
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
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
        
        // FOLDアクションの場合は確実にFOLDを維持
        if (customHandData.action.toUpperCase() === 'FOLD') {
          customPrimaryAction = 'FOLD';
        }
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
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
        
        // FOLDアクションの場合は確実にFOLDを維持
        if (customHandData.action.toUpperCase() === 'FOLD') {
          customPrimaryAction = 'FOLD';
        }
        
        // オールインアクションの特別処理（FOLD、MIN、CALL、RAISEアクションの場合は除外）
        if (customHandData.action.toUpperCase() !== 'FOLD' && 
            customHandData.action.toUpperCase() !== 'MIN' && 
            customHandData.action.toUpperCase() !== 'CALL' && 
            customHandData.action.toUpperCase() !== 'RAISE' && 
            customHandData.action.toUpperCase().includes('ALL')) {
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
  
  // カスタムレンジがない場合はFOLDを返す
  console.log('📊 カスタムレンジなし - FOLDを返す:', {
    position,
    stackDepthBB,
    handType: normalizedHandType
  });
  
  // カスタムレンジがない場合はFOLDを返す
  const handData = null;
  
  // カスタムレンジがない場合はFOLDを返す
  gtoAction = 'FOLD';
  frequencies = { 'FOLD': 100, 'CALL': 0, 'RAISE': 0, 'ALL_IN': 0 };
  evData = { 'FOLD': 0, 'CALL': -1.5, 'RAISE': -2.0, 'ALL_IN': -2.5 };
  
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
    effectiveStackExplanation: `${stackSize}スタックでのカスタムレンジ未設定戦略です。`,
    stackSizeStrategy: `カスタムレンジが設定されていません: ${normalizedHandType}はFOLDが推奨されます。`,
    icmConsideration: 'カスタムレンジが設定されていないため、FOLDが推奨されます。',
    recommendedBetSize: gtoAction === 'RAISE' ? 2.5 : 0,
    strategicAnalysis: `カスタムレンジ未設定: ${finalHandType}はFOLDが推奨されます。`,
    exploitSuggestion: getExploitSuggestion(gtoAction, position, finalHandType)
  };
  
  console.log('🎯 simulateMTTGTOData 最終戻り値:', {
    originalHand: hand,
    finalHandType,
    resultNormalizedHandType: result.normalizedHandType
  });
  
  return result;
};

// ベットサイズを計算する関数
const calculateBetSize = (
  stackDepth: string,
  actionType: string,
  heroPosition: string,
  openerPosition?: string,
  threeBetterPosition?: string
): { raiseSize: number; allinSize: number } => {
  const stackBB = parseInt(stackDepth.replace('BB', ''));
  
  // ALLINサイズは常にスタック全体
  const allinSize = stackBB;
  
  let raiseSize = 0;
  
  if (actionType === 'openraise') {
    // オープンレイズのサイズ
    if (stackBB <= 15) {
      raiseSize = heroPosition === 'SB' ? 2.5 : 2;
    } else if (stackBB <= 20) {
      raiseSize = 2;
    } else if (stackBB <= 30) {
      raiseSize = 2.1;
    } else {
      raiseSize = 2.3;
    }
  } else if (actionType === 'vsopen') {
    // vs オープンレイズのサイズ
    if (stackBB <= 15) {
      // 15BBのvsオープンではRAISEアクションが存在しない
      raiseSize = 0;
    } else if (stackBB <= 20) {
      if (heroPosition === 'SB') {
        raiseSize = 5.5;
      } else if (heroPosition === 'BB') {
        raiseSize = 6;
      } else {
        raiseSize = 5;
      }
    } else if (stackBB <= 30) {
      if (heroPosition === 'SB') {
        raiseSize = 7.5;
      } else if (heroPosition === 'BB') {
        raiseSize = 8.2;
      } else {
        raiseSize = 6.3;
      }
    } else if (stackBB <= 40) {
      if (heroPosition === 'SB') {
        raiseSize = 8.6;
      } else if (heroPosition === 'BB') {
        raiseSize = 9.2;
      } else {
        raiseSize = 6.8;
      }
    } else if (stackBB <= 50) {
      if (heroPosition === 'SB') {
        raiseSize = 9.2;
      } else if (heroPosition === 'BB') {
        raiseSize = 9.8;
      } else {
        raiseSize = 6.9;
      }
    } else if (stackBB <= 75) {
      if (heroPosition === 'SB') {
        raiseSize = 10;
      } else if (heroPosition === 'BB') {
        raiseSize = 10.3;
      } else {
        raiseSize = 8;
      }
    } else {
      // 100BB
      if (heroPosition === 'SB') {
        raiseSize = 11;
      } else if (heroPosition === 'BB') {
        raiseSize = 11.5;
      } else {
        raiseSize = 8;
      }
    }
  } else if (actionType === 'vs3bet') {
    // vs 3ベットのサイズ
    if (stackBB <= 15 || stackBB === 20 || stackBB === 30 || stackBB === 40) {
      // 15BB, 20BB, 30BB, 40BBではRAISEなし（ALLINのみ）
      raiseSize = 0;
    } else if (stackBB <= 50) {
      if (threeBetterPosition === 'SB' || threeBetterPosition === 'BB') {
        // 3ベッターがSB/BBの場合はALLINのみ
        raiseSize = 0;
      } else {
        raiseSize = 16;
      }
    } else if (stackBB <= 75) {
      if (threeBetterPosition === 'SB') {
        raiseSize = 21.2;
      } else if (threeBetterPosition === 'BB') {
        raiseSize = 22;
      } else {
        raiseSize = 20.9;
      }
    } else {
      // 100BB
      if (threeBetterPosition === 'SB') {
        raiseSize = 23;
      } else if (threeBetterPosition === 'BB') {
        raiseSize = 24;
      } else {
        raiseSize = 21;
      }
    }
  } else if (actionType === 'vs4bet') {
    // vs 4ベットではRAISEなし（CALL/ALLINのみ）
    raiseSize = 0;
  }
  
  return { raiseSize, allinSize };
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
  
  // 管理者状態のデバッグログ
  useEffect(() => {
    if (!loading) {
      console.log('🔍 管理者状態確認:', {
        isAdmin,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        adminToken: typeof window !== 'undefined' ? localStorage.getItem('admin-token')?.length || 0 : 'N/A',
        user: user?.username || 'N/A'
      });
    }
  }, [isAdmin, token, user, loading]);
  const { canPractice, maxPracticeCount, dailyPracticeCount, incrementPracticeCount, user: authUser, isMasterUser, subscriptionStatus } = useAuth();
  
  // 開発環境でのみデバッグログを表示
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 MTT Training Debug:', {
      authUser: authUser?.email,
      isMasterUser,
      isAdmin,
      shouldShowAdminButton: !isAdmin && isMasterUser
    });
  }
  
  // URLからシナリオパラメータを取得（簡略化）
  const stackSize = searchParams.get('stack') || '75BB';
  const positionParam = searchParams.get('position') || 'BTN';
  const actionType = searchParams.get('action') || 'openraise';
  
  // ランダムポジション処理
  const getRandomPosition = (): string => {
    // アクションタイプに応じて有効なポジションのみを選択
    let validPositions: string[] = [];
    
    if (actionType === 'openraise') {
      // オープンレイズはBB以外のポジションで可能（BBはオープンレイズできない）
      validPositions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];
    } else if (actionType === 'vsopen') {
      // vsオープンは、オープンレイザーより後のポジションのみ
      validPositions = ['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    } else if (actionType === 'vs3bet') {
      // vs3betは、3ベッターより後のポジションのみ
      validPositions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB'];
    } else if (actionType === 'vs4bet') {
      // vs4betは、4ベッターより後のポジションのみ
      validPositions = ['UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    } else {
      // その他のアクションタイプは全てのポジション
      validPositions = ['UTG', 'UTG1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    }
    
    return validPositions[Math.floor(Math.random() * validPositions.length)];
  };
  
  const position = positionParam === 'RANDOM' ? getRandomPosition() : positionParam;
  
  // デバッグ: ポジション情報をログ出力
  console.log('🎯 ポジション情報:', {
    positionParam,
    position,
    actionType,
    stackSize,
    isRandom: positionParam === 'RANDOM'
  });
  
  // URLからカスタム選択ハンドを取得
  const customHandsString = searchParams.get('hands') || '';
  const customHands = customHandsString ? decodeURIComponent(customHandsString).split(',').filter(hand => hand.trim() !== '') : [];
  
  // URLから相手のポジション情報を取得
  const opponentPositionParam = searchParams.get('opener') || searchParams.get('threebetter') || searchParams.get('fourbetter') || null;
  
  // ステート
  const [hand, setHand] = useState<string[]>([]);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [showResults, setShowResults] = useState<boolean>(false);
  const [gtoData, setGtoData] = useState<any>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  
  // GTO データとスポット情報のデバッグ
  if (gtoData) {
    console.log('🎯 GTO シナリオデバッグ:', {
      headerPosition: position,
      gtoHeroPosition: gtoData.heroPosition,
      spotHeroPosition: spot?.heroPosition,
      spotActionType: spot?.actionType,
      positionsMatch: position === gtoData.heroPosition,
      tableHeroPosition: spot?.positions ? Object.keys(spot.positions).find(pos => spot.positions?.[pos]?.isHero) : null
    });
  }
  const [trainingCount, setTrainingCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [currentOpponentPosition, setCurrentOpponentPosition] = useState<string | null>(opponentPositionParam);
  
  // レンジエディター関連のstate
  const [showRangeEditor, setShowRangeEditor] = useState<boolean>(false);
  const [customRanges, setCustomRanges] = useState<Record<string, Record<string, HandInfo>>>({});
  const [selectedEditPosition, setSelectedEditPosition] = useState<string>('UTG');
  const [isRangeEditorOpen, setIsRangeEditorOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<string>('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [lastRangeUpdate, setLastRangeUpdate] = useState<number>(0); // レンジ更新タイムスタンプ
  
  // 制限達成モーダルのstate
  const [showDailyLimitModal, setShowDailyLimitModal] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState(false); // 初期化制御フラグ
  
  // 即座に圧縮移行を実行（useEffectに依存しない）
  console.log('🔍 コンポーネント読み込み開始');
  
  // アプリケーション起動時の圧縮移行
  useEffect(() => {
    console.log('🚀 アプリケーション起動: 圧縮移行を開始');
    console.log('🔍 useEffect実行確認');
    
    // 即座に実行
    console.log('🚀 即座に圧縮移行を開始');
    try {
      const existingData = localStorage.getItem('mtt-custom-ranges');
      console.log('🔍 即座実行localStorage確認:', existingData ? 'データあり' : 'データなし');
      if (existingData) {
        console.log('📄 即座実行既存データを発見:', existingData.length + '文字');
        console.log('🔍 即座実行データの先頭100文字:', existingData.substring(0, 100));
        
        // データが既に圧縮されているかチェック
        if (existingData.startsWith('{"') || existingData.startsWith('{')) {
          console.log('📝 即座実行データはJSON形式です。圧縮を実行します。');
          
          // LZStringで圧縮
          const compressed = LZString.compress(existingData);
          if (compressed && compressed.length < existingData.length) {
            console.log('📦 即座実行圧縮完了:', compressed.length + '文字');
            
            // 圧縮データを保存
            localStorage.setItem('mtt-custom-ranges_compressed', compressed);
            localStorage.removeItem('mtt-custom-ranges');
            
            console.log('✅ 即座実行圧縮移行完了！');
            console.log('📊 即座実行圧縮率:', ((1 - compressed.length / existingData.length) * 100).toFixed(1) + '%');
          } else {
            console.log('❌ 即座実行圧縮に失敗または圧縮効果なし');
            console.log('🔍 即座実行圧縮結果:', compressed ? compressed.length + '文字' : 'null');
            
            // 圧縮に失敗した場合は強制的にIndexedDBに移行
            console.log('🔄 即座実行IndexedDBに強制移行を実行');
            try {
              const request = indexedDB.open('MTTStorage', 1);
              request.onerror = () => console.error('❌ 即座実行IndexedDB開くエラー');
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['ranges'], 'readwrite');
                const store = transaction.objectStore('ranges');
                const putRequest = store.put(existingData, 'mtt-custom-ranges');
                putRequest.onsuccess = () => {
                  console.log('✅ 即座実行IndexedDBに保存完了');
                  localStorage.removeItem('mtt-custom-ranges');
                  console.log('🗑️ 即座実行localStorageから元データを削除');
                };
                putRequest.onerror = () => console.error('❌ 即座実行IndexedDB保存エラー');
              };
            } catch (error) {
              console.error('❌ 即座実行IndexedDB移行エラー:', error);
            }
          }
        } else {
          console.log('⚠️ 即座実行データは既に圧縮されているか、圧縮できない形式です');
          
          // 強制的にIndexedDBに移行
          console.log('🔄 即座実行IndexedDBに強制移行を実行');
          try {
            const request = indexedDB.open('MTTStorage', 1);
            request.onerror = () => console.error('❌ 即座実行IndexedDB開くエラー');
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['ranges'], 'readwrite');
              const store = transaction.objectStore('ranges');
              const putRequest = store.put(existingData, 'mtt-custom-ranges');
              putRequest.onsuccess = () => {
                console.log('✅ 即座実行IndexedDBに保存完了');
                localStorage.removeItem('mtt-custom-ranges');
                console.log('🗑️ 即座実行localStorageから元データを削除');
              };
              putRequest.onerror = () => console.error('❌ 即座実行IndexedDB保存エラー');
            };
          } catch (error) {
            console.error('❌ 即座実行IndexedDB移行エラー:', error);
          }
        }
      } else {
        console.log('ℹ️ 即座実行既存データが見つかりませんでした。');
      }
    } catch (error) {
      console.error('❌ 即座実行圧縮移行エラー:', error);
    }
    
    // setTimeoutで遅延実行
    setTimeout(() => {
      console.log('⏰ setTimeout内で圧縮移行を実行');
      try {
        const existingData = localStorage.getItem('mtt-custom-ranges');
        console.log('🔍 setTimeout内localStorage確認:', existingData ? 'データあり' : 'データなし');
        if (existingData) {
          console.log('📄 setTimeout内既存データを発見:', existingData.length + '文字');
          console.log('🔍 setTimeout内データの先頭100文字:', existingData.substring(0, 100));
          
          // データが既に圧縮されているかチェック
          if (existingData.startsWith('{"') || existingData.startsWith('{')) {
            console.log('📝 setTimeout内データはJSON形式です。圧縮を実行します。');
            
            // LZStringで圧縮
            const compressed = LZString.compress(existingData);
            if (compressed && compressed.length < existingData.length) {
              console.log('📦 setTimeout内圧縮完了:', compressed.length + '文字');
              
              // 圧縮データを保存
              localStorage.setItem('mtt-custom-ranges_compressed', compressed);
              localStorage.removeItem('mtt-custom-ranges');
              
              console.log('✅ setTimeout内圧縮移行完了！');
              console.log('📊 setTimeout内圧縮率:', ((1 - compressed.length / existingData.length) * 100).toFixed(1) + '%');
            } else {
              console.log('❌ setTimeout内圧縮に失敗または圧縮効果なし');
              console.log('🔍 setTimeout内圧縮結果:', compressed ? compressed.length + '文字' : 'null');
              
              // 圧縮に失敗した場合は強制的にIndexedDBに移行
              console.log('🔄 setTimeout内IndexedDBに強制移行を実行');
              try {
                const request = indexedDB.open('MTTStorage', 1);
                request.onerror = () => console.error('❌ setTimeout内IndexedDB開くエラー');
                request.onsuccess = () => {
                  const db = request.result;
                  const transaction = db.transaction(['ranges'], 'readwrite');
                  const store = transaction.objectStore('ranges');
                  const putRequest = store.put(existingData, 'mtt-custom-ranges');
                  putRequest.onsuccess = () => {
                    console.log('✅ setTimeout内IndexedDBに保存完了');
                    localStorage.removeItem('mtt-custom-ranges');
                    console.log('🗑️ setTimeout内localStorageから元データを削除');
                  };
                  putRequest.onerror = () => console.error('❌ setTimeout内IndexedDB保存エラー');
                };
              } catch (error) {
                console.error('❌ setTimeout内IndexedDB移行エラー:', error);
              }
            }
          } else {
            console.log('⚠️ setTimeout内データは既に圧縮されているか、圧縮できない形式です');
            
            // 強制的にIndexedDBに移行
            console.log('🔄 setTimeout内IndexedDBに強制移行を実行');
            try {
              const request = indexedDB.open('MTTStorage', 1);
              request.onerror = () => console.error('❌ setTimeout内IndexedDB開くエラー');
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['ranges'], 'readwrite');
                const store = transaction.objectStore('ranges');
                const putRequest = store.put(existingData, 'mtt-custom-ranges');
                putRequest.onsuccess = () => {
                  console.log('✅ setTimeout内IndexedDBに保存完了');
                  localStorage.removeItem('mtt-custom-ranges');
                  console.log('🗑️ setTimeout内localStorageから元データを削除');
                };
                putRequest.onerror = () => console.error('❌ setTimeout内IndexedDB保存エラー');
              };
            } catch (error) {
              console.error('❌ setTimeout内IndexedDB移行エラー:', error);
            }
          }
        } else {
          console.log('ℹ️ setTimeout内既存データが見つかりませんでした。');
        }
      } catch (error) {
        console.error('❌ setTimeout内圧縮移行エラー:', error);
      }
    }, 100);
    
    // window.onloadイベントでも実行
    window.addEventListener('load', () => {
      console.log('🌐 window.onloadイベントで圧縮移行を実行');
      try {
        const existingData = localStorage.getItem('mtt-custom-ranges');
        console.log('🔍 window.onload内localStorage確認:', existingData ? 'データあり' : 'データなし');
        if (existingData) {
          console.log('📄 window.onload内既存データを発見:', existingData.length + '文字');
          console.log('🔍 window.onload内データの先頭100文字:', existingData.substring(0, 100));
          
          // データが既に圧縮されているかチェック
          if (existingData.startsWith('{"') || existingData.startsWith('{')) {
            console.log('📝 window.onload内データはJSON形式です。圧縮を実行します。');
            
            // LZStringで圧縮
            const compressed = LZString.compress(existingData);
            if (compressed && compressed.length < existingData.length) {
              console.log('📦 window.onload内圧縮完了:', compressed.length + '文字');
              
              // 圧縮データを保存
              localStorage.setItem('mtt-custom-ranges_compressed', compressed);
              localStorage.removeItem('mtt-custom-ranges');
              
              console.log('✅ window.onload内圧縮移行完了！');
              console.log('📊 window.onload内圧縮率:', ((1 - compressed.length / existingData.length) * 100).toFixed(1) + '%');
            } else {
              console.log('❌ window.onload内圧縮に失敗または圧縮効果なし');
              console.log('🔍 window.onload内圧縮結果:', compressed ? compressed.length + '文字' : 'null');
              
              // 圧縮に失敗した場合は強制的にIndexedDBに移行
              console.log('🔄 window.onload内IndexedDBに強制移行を実行');
              try {
                const request = indexedDB.open('MTTStorage', 1);
                request.onerror = () => console.error('❌ window.onload内IndexedDB開くエラー');
                request.onsuccess = () => {
                  const db = request.result;
                  const transaction = db.transaction(['ranges'], 'readwrite');
                  const store = transaction.objectStore('ranges');
                  const putRequest = store.put(existingData, 'mtt-custom-ranges');
                  putRequest.onsuccess = () => {
                    console.log('✅ window.onload内IndexedDBに保存完了');
                    localStorage.removeItem('mtt-custom-ranges');
                    console.log('🗑️ window.onload内localStorageから元データを削除');
                  };
                  putRequest.onerror = () => console.error('❌ window.onload内IndexedDB保存エラー');
                };
              } catch (error) {
                console.error('❌ window.onload内IndexedDB移行エラー:', error);
              }
            }
          } else {
            console.log('⚠️ window.onload内データは既に圧縮されているか、圧縮できない形式です');
            
            // 強制的にIndexedDBに移行
            console.log('🔄 window.onload内IndexedDBに強制移行を実行');
            try {
              const request = indexedDB.open('MTTStorage', 1);
              request.onerror = () => console.error('❌ window.onload内IndexedDB開くエラー');
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['ranges'], 'readwrite');
                const store = transaction.objectStore('ranges');
                const putRequest = store.put(existingData, 'mtt-custom-ranges');
                putRequest.onsuccess = () => {
                  console.log('✅ window.onload内IndexedDBに保存完了');
                  localStorage.removeItem('mtt-custom-ranges');
                  console.log('🗑️ window.onload内localStorageから元データを削除');
                };
                putRequest.onerror = () => console.error('❌ window.onload内IndexedDB保存エラー');
              };
            } catch (error) {
              console.error('❌ window.onload内IndexedDB移行エラー:', error);
            }
          }
        } else {
          console.log('ℹ️ window.onload内既存データが見つかりませんでした。');
        }
      } catch (error) {
        console.error('❌ window.onload内圧縮移行エラー:', error);
      }
    });
    
    // useEffect内でも圧縮移行を実行
    console.log('🔄 useEffect内で圧縮移行を実行');
    try {
      const existingData = localStorage.getItem('mtt-custom-ranges');
      console.log('🔍 useEffect内localStorage確認:', existingData ? 'データあり' : 'データなし');
      if (existingData) {
        console.log('📄 useEffect内既存データを発見:', existingData.length + '文字');
        console.log('🔍 データの先頭100文字:', existingData.substring(0, 100));
        
        // データが既に圧縮されているかチェック
        if (existingData.startsWith('{"') || existingData.startsWith('{')) {
          console.log('📝 データはJSON形式です。圧縮を実行します。');
          
          // LZStringで圧縮
          const compressed = LZString.compress(existingData);
          if (compressed && compressed.length < existingData.length) {
            console.log('📦 useEffect内圧縮完了:', compressed.length + '文字');
            
            // 圧縮データを保存
            localStorage.setItem('mtt-custom-ranges_compressed', compressed);
            localStorage.removeItem('mtt-custom-ranges');
            
            console.log('✅ useEffect内圧縮移行完了！');
            console.log('📊 useEffect内圧縮率:', ((1 - compressed.length / existingData.length) * 100).toFixed(1) + '%');
          } else {
            console.log('❌ 圧縮に失敗または圧縮効果なし');
            console.log('🔍 圧縮結果:', compressed ? compressed.length + '文字' : 'null');
            
            // 圧縮に失敗した場合は強制的にIndexedDBに移行
            console.log('🔄 useEffect内IndexedDBに強制移行を実行');
            try {
              const request = indexedDB.open('MTTStorage', 1);
              request.onerror = () => console.error('❌ useEffect内IndexedDB開くエラー');
              request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['ranges'], 'readwrite');
                const store = transaction.objectStore('ranges');
                const putRequest = store.put(existingData, 'mtt-custom-ranges');
                putRequest.onsuccess = () => {
                  console.log('✅ useEffect内IndexedDBに保存完了');
                  localStorage.removeItem('mtt-custom-ranges');
                  console.log('🗑️ useEffect内localStorageから元データを削除');
                };
                putRequest.onerror = () => console.error('❌ useEffect内IndexedDB保存エラー');
              };
            } catch (error) {
              console.error('❌ useEffect内IndexedDB移行エラー:', error);
            }
          }
        } else {
          console.log('⚠️ データは既に圧縮されているか、圧縮できない形式です');
          
          // 強制的にIndexedDBに移行
          console.log('🔄 IndexedDBに強制移行を実行');
          try {
            // IndexedDBに保存
            const request = indexedDB.open('MTTStorage', 1);
            request.onerror = () => console.error('❌ IndexedDB開くエラー');
            request.onsuccess = () => {
              const db = request.result;
              const transaction = db.transaction(['ranges'], 'readwrite');
              const store = transaction.objectStore('ranges');
              const putRequest = store.put(existingData, 'mtt-custom-ranges');
              putRequest.onsuccess = () => {
                console.log('✅ IndexedDBに保存完了');
                localStorage.removeItem('mtt-custom-ranges');
                console.log('🗑️ localStorageから元データを削除');
              };
              putRequest.onerror = () => console.error('❌ IndexedDB保存エラー');
            };
          } catch (error) {
            console.error('❌ IndexedDB移行エラー:', error);
          }
        }
      } else {
        console.log('ℹ️ useEffect内既存データが見つかりませんでした。');
      }
    } catch (error) {
      console.error('❌ useEffect内圧縮移行エラー:', error);
    }
    
    // 即座に圧縮移行を実行
    const performCompression = () => {
      console.log('🔧 圧縮移行を実行中...');
      try {
        const existingData = localStorage.getItem('mtt-custom-ranges');
        if (existingData) {
          console.log('📄 既存データを発見:', existingData.length + '文字');
          
          // LZStringで圧縮
          const compressed = LZString.compress(existingData);
          if (compressed) {
            console.log('📦 圧縮完了:', compressed.length + '文字');
            
            // 圧縮データを保存
            localStorage.setItem('mtt-custom-ranges_compressed', compressed);
            localStorage.removeItem('mtt-custom-ranges');
            
            console.log('✅ 圧縮移行完了！');
            console.log('📊 圧縮率:', ((1 - compressed.length / existingData.length) * 100).toFixed(1) + '%');
            
            // 容量を再チェック
            let newTotalSize = 0;
            for (let key in localStorage) {
              if (localStorage.hasOwnProperty(key)) {
                const itemSize = localStorage.getItem(key)?.length || 0;
                newTotalSize += itemSize;
              }
            }
            const newTotalSizeMB = (newTotalSize / (1024 * 1024)).toFixed(2);
            const newUsagePercent = ((newTotalSize / (5 * 1024 * 1024)) * 100).toFixed(1);
            
            console.log('💾 圧縮後の容量:', {
              totalSizeMB: parseFloat(newTotalSizeMB),
              usagePercent: parseFloat(newUsagePercent),
              isNearLimit: parseFloat(newUsagePercent) > 80
            });
          } else {
            console.error('❌ 圧縮に失敗しました');
          }
        } else {
          console.log('ℹ️ 既存データが見つかりませんでした。');
        }
      } catch (error) {
        console.error('❌ 圧縮移行エラー:', error);
      }
    };
    
    // 即座に実行
    performCompression();
    
    // ストレージ容量をチェック
    try {
      let totalSize = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const itemSize = localStorage.getItem(key)?.length || 0;
          totalSize += itemSize;
        }
      }
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      const usagePercent = ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1);
      
      const capacity = {
        totalSizeMB: parseFloat(totalSizeMB),
        usagePercent: parseFloat(usagePercent),
        isNearLimit: parseFloat(usagePercent) > 80
      };
      
      console.log('💾 現在のストレージ容量:', capacity);
      
      if (capacity.isNearLimit) {
        console.log('⚠️ localStorage容量が80%を超えています。圧縮移行を実行しました。');
      } else {
        console.log('✅ localStorage容量は正常です。');
      }
    } catch (error) {
      console.error('❌ 容量チェックエラー:', error);
    }
  }, []);

  // ページロード時の制限チェック（初期化完了後に実行）
  useEffect(() => {
    if (isInitialized && 
        ((subscriptionStatus === 'light' && dailyPracticeCount >= 50) ||
         (subscriptionStatus === 'free' && dailyPracticeCount >= 10))) {
      setShowDailyLimitModal(true);
    }
  }, [isInitialized, subscriptionStatus, dailyPracticeCount]);
  
  // vsオープン用レンジエディター関連のstate
  const [selectedVSOpenPosition, setSelectedVSOpenPosition] = useState<string>('BTN');
  const [selectedOpenerPosition, setSelectedOpenerPosition] = useState<string>('CO');
  
  // モバイル判定
  const [isMobile, setIsMobile] = useState(false);
  
  // ハンド選択機能
  const [showHandSelector, setShowHandSelector] = useState(false);
  const [selectedTrainingHands, setSelectedTrainingHands] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // isSavingフラグが長時間trueのままになることを防ぐ
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isSaving) {
      // 30秒後に自動的にフラグをリセット
      timeoutId = setTimeout(() => {
        console.log('⚠️ isSavingフラグを強制リセットしました（30秒タイムアウト）');
        setIsSaving(false);
      }, 30000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isSaving]);
  
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
        let rangeKey = `vsopen_${heroPosition}_vs_${spot.openRaiserPosition}`;
        
        // 15BBのSB vs BBの場合、SBのアクションタイプに応じてレンジキーを動的に変更
        if (spot.openRaiserPosition === 'SB' && heroPosition === 'BB') {
          if (spot.openRaiseSize === 15.0) {
            // SBオールインの場合は _allin キーを使用
            rangeKey = `${rangeKey}_allin`;
          } else if (spot.openRaiseSize === 2.0) {
            // SBレイズの場合は _raise キーを使用
            rangeKey = `${rangeKey}_raise`;
          } else if (spot.openRaiseSize === 1.0) {
            // SBリンプの場合は _limp キーを使用
            rangeKey = `${rangeKey}_limp`;
          }
        }
        
        console.log(`🎯 15BB vsopen レンジキー生成: ${rangeKey} (openRaiseSize: ${spot.openRaiseSize})`);
        return rangeKey;
      } else {
        return `vsopen_${heroPosition}_vs_${spot.openRaiserPosition}_${stackDepth}`; // その他のスタックサイズ
      }
    } else if (actionType === 'vs3bet') {
      // vs3ベットレンジの場合
      if (!spot.threeBetterPosition) {
        console.error('❌ vs3ベットでthreeBetterPositionが未設定:', {
          spot,
          actionType,
          heroPosition,
          stackDepth,
          availableKeys: Object.keys(spot),
          spotKeys: Object.keys(spot).filter(key => key.includes('Position') || key.includes('position'))
        });
        
        // 15BBの場合、スタックサイズなしのキーを探す
        if (stackDepth === '15BB') {
          const potentialKeys = Object.keys(customRanges).filter(key => 
            key.includes('vs3bet') && 
            key.includes(heroPosition || '') && 
            !key.includes('_10BB') && 
            !key.includes('_20BB') && 
            !key.includes('_30BB') && 
            !key.includes('_40BB') && 
            !key.includes('_50BB') && 
            !key.includes('_75BB') && 
            !key.includes('_100BB')
          );
          
          if (potentialKeys.length > 0) {
            console.log('🔄 15BBでスタックサイズなしのキーを発見:', potentialKeys);
            // 最初のキーから3ベッターポジションを抽出
            const firstKey = potentialKeys[0];
            const match = firstKey.match(/vs3bet_[^_]+_vs_([^_]+)/);
            if (match) {
              const extractedThreeBetter = match[1];
              console.log('✅ 3ベッターポジションを抽出:', extractedThreeBetter);
              return `vs3bet_${heroPosition}_vs_${extractedThreeBetter}`;
            }
          }
        }
        
        return null;
      }
      
      // 20bbの場合は3ベットタイプを考慮
      let vs3betKey: string;
      if (stackDepth === '15BB') {
        vs3betKey = `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}`;
      } else if (stackDepth === '20BB' && spot.threeBetType) {
        vs3betKey = `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_${spot.threeBetType}_20BB`;
      } else {
        vs3betKey = `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_${stackDepth}`;
      }
      
      console.log('🎯 vs3ベットレンジキー生成:', {
        actionType,
        heroPosition,
        threeBetterPosition: spot.threeBetterPosition,
        stackDepth,
        threeBetType: spot.threeBetType,
        generatedKey: vs3betKey,
        is15BB: stackDepth === '15BB',
        is20BB: stackDepth === '20BB',
        hasThreeBetType: !!spot.threeBetType,
        keyFormat: stackDepth === '15BB' ? '15BB形式（スタックサイズなし）' : 
                   (stackDepth === '20BB' && spot.threeBetType) ? '20BB 3ベットタイプ別形式' : 'スタック固有形式',
        // 生成されたキーがカスタムレンジに存在するか確認
        keyExists: customRanges[vs3betKey] ? '存在' : '不存在',
        availableKeys: Object.keys(customRanges).filter(key => 
          key.includes('vs3bet') && 
          key.includes(heroPosition || '') && 
          (stackDepth === '15BB' ? 
            !key.includes('_10BB') && !key.includes('_20BB') && !key.includes('_30BB') && 
            !key.includes('_40BB') && !key.includes('_50BB') && !key.includes('_75BB') && !key.includes('_100BB') :
            key.includes(`_${stackDepth || ''}`)
          )
        )
      });
      
      // 各スタックサイズでのレンジキー生成例をログ出力
      const exampleKeys = {
        '10BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_10BB`,
        '15BB': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}`,
        '20BB_raise': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_raise_20BB`,
        '20BB_allin': `vs3bet_${heroPosition}_vs_${spot.threeBetterPosition}_allin_20BB`,
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
    console.log('🎯 generateNewScenario 関数が呼び出されました！');
    console.log('🎯 generateNewScenario 開始:', {
      position,
      stackSize,
      actionType,
      hasCustomRanges: !!customRanges,
      customRangesCount: customRanges ? Object.keys(customRanges).length : 0
    });
    
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
        // NONEアクションのハンドを除外する
        const nonNoneUrlHands = handTypes.filter(hand => 
          !isHandNoneAction(hand, position, stackSize, actionType, customRanges)
        );
        
        console.log('🚫 URLハンドNONE除外フィルター:', {
          originalUrlHands: handTypes.length,
          filteredUrlHands: nonNoneUrlHands.length,
          excludedCount: handTypes.length - nonNoneUrlHands.length
        });
        
        if (nonNoneUrlHands.length > 0) {
          // NONEではないURLハンドから選択
          const randomHandType = nonNoneUrlHands[Math.floor(Math.random() * nonNoneUrlHands.length)];
          newHand = generateHandFromType(randomHandType);
          handType = randomHandType;
          console.log('🎯 URLパラメータハンド(NONE除外後)を維持:', { urlHands, selectedHandType: randomHandType, nonNoneUrlHands });
        } else {
          // 全てのURLハンドがNONEの場合はランダム生成にフォールバック
          console.warn('⚠️ URLパラメータハンドが全てNONEアクション。ランダム生成に切り替えます。');
          newHand = generateMTTHand();
          handType = normalizeHandType(newHand);
        }
      } else {
        // 空の場合はランダム生成
        newHand = generateMTTHand();
        handType = normalizeHandType(newHand);
      }
    } else if (selectedTrainingHands.length > 0) {
      // 選択されたトレーニングハンドがある場合はその中からランダムに選ぶ
      // NONEアクションのハンドを除外する
      const nonNoneHands = selectedTrainingHands.filter(hand => 
        !isHandNoneAction(hand, position, stackSize, actionType, customRanges)
      );
      
      console.log('🚫 NONEハンド除外フィルター:', {
        originalHands: selectedTrainingHands.length,
        filteredHands: nonNoneHands.length,
        excludedCount: selectedTrainingHands.length - nonNoneHands.length,
        position,
        stackSize,
        actionType
      });
      
      if (nonNoneHands.length > 0) {
        // NONEではないハンドから選択
        const randomHandType = nonNoneHands[Math.floor(Math.random() * nonNoneHands.length)];
        
        // ハンドタイプからカード配列を生成
        newHand = generateHandFromType(randomHandType);
        handType = randomHandType;
        console.log('✅ selectedTrainingHands(NONE除外後)使用:', { randomHandType, nonNoneHands });
      } else {
        // 全てのハンドがNONEの場合はランダム生成にフォールバック
        console.warn('⚠️ 選択されたハンドが全てNONEアクション。ランダム生成に切り替えます。');
        newHand = generateMTTHand();
        handType = normalizeHandType(newHand);
      }
    } else if (customHands.length > 0) {
      // カスタムハンドが選択されている場合はその中からランダムに選ぶ
      // NONEアクションのハンドを除外する
      const nonNoneCustomHands = customHands.filter(hand => 
        !isHandNoneAction(hand, position, stackSize, actionType, customRanges)
      );
      
      console.log('🚫 カスタムハンドNONE除外フィルター:', {
        originalCustomHands: customHands.length,
        filteredCustomHands: nonNoneCustomHands.length,
        excludedCount: customHands.length - nonNoneCustomHands.length
      });
      
      if (nonNoneCustomHands.length > 0) {
        // NONEではないカスタムハンドから選択
        const randomHandType = nonNoneCustomHands[Math.floor(Math.random() * nonNoneCustomHands.length)];
        
        // ハンドタイプからカード配列を生成
        newHand = generateHandFromType(randomHandType);
        handType = randomHandType;
        console.log('✅ customHands(NONE除外後)使用:', { randomHandType, nonNoneCustomHands });
      } else {
        // 全てのカスタムハンドがNONEの場合はランダム生成にフォールバック
        console.warn('⚠️ カスタムハンドが全てNONEアクション。ランダム生成に切り替えます。');
        newHand = generateMTTHand();
        handType = normalizeHandType(newHand);
      }
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
      if (urlOpener && isValidVsOpenCombination(position, urlOpener, stackSize)) {
        openerPosition = urlOpener;
        setCurrentOpponentPosition(urlOpener);
      } else {
        // 指定されていない、または無効な場合はランダムに選択
        const validOpeners = getValidOpenerPositions(position, stackSize);
        if (validOpeners.length > 0) {
          openerPosition = validOpeners[Math.floor(Math.random() * validOpeners.length)];
          setCurrentOpponentPosition(openerPosition);
        }
      }
    } else if (actionType === 'vs3bet') {
      // vs3betの場合、3ベッターをランダムに選択（ヒーローより後のポジション）
      console.log('🎯 vs3bet 3ベッターポジション設定開始:', {
        heroPosition: position,
        heroIndex: getPositionIndex(position),
        urlThreeBetter: searchParams.get('threebetter')
      });
      
      const urlThreeBetter = searchParams.get('threebetter');
      if (urlThreeBetter) {
        const threeBetterIndex = getPositionIndex(urlThreeBetter);
        const positionIndex = getPositionIndex(position);
        if (threeBetterIndex > positionIndex) {
          openerPosition = urlThreeBetter; // vs3betでは3ベッターの情報をopenerPositionパラメータで渡す
          setCurrentOpponentPosition(urlThreeBetter);
          console.log('✅ URLパラメータから3ベッターポジション設定:', {
            urlThreeBetter,
            threeBetterIndex,
            positionIndex,
            isValid: threeBetterIndex > positionIndex
          });
        } else {
          console.log('❌ URLパラメータの3ベッターポジションが無効:', {
            urlThreeBetter,
            threeBetterIndex,
            positionIndex,
            isValid: threeBetterIndex > positionIndex
          });
        }
      }
      
      if (!openerPosition) {
        const positionIndex = getPositionIndex(position);
        console.log('🎯 3ベッターポジション選択開始:', {
          heroPosition: position,
          heroIndex: positionIndex,
          totalPositions: POSITION_ORDER.length,
          availablePositions: POSITION_ORDER.slice(positionIndex + 1)
        });
        
        if (positionIndex < POSITION_ORDER.length - 1) {
          // ヒーローより後のポジションから、ヒーローと同じポジションを除外して選択
          const allAfterHero = POSITION_ORDER.slice(positionIndex + 1);
          const validThreeBetters = allAfterHero.filter(pos => pos !== position);
          
          console.log('🎯 有効な3ベッターポジション候補:', {
            allAfterHero,
            validThreeBetters,
            heroPosition: position,
            excludedPosition: position
          });
          
          if (validThreeBetters.length > 0) {
            // ランダム選択を確実に行う
            const randomIndex = Math.floor(Math.random() * validThreeBetters.length);
            openerPosition = validThreeBetters[randomIndex];
            setCurrentOpponentPosition(openerPosition);
            
            console.log('🔄 ランダムに3ベッターポジションを選択:', {
              heroPosition: position,
              heroIndex: positionIndex,
              validThreeBetters,
              randomIndex,
              selected: openerPosition,
              selectedIndex: getPositionIndex(openerPosition),
              reason: 'URLパラメータが無効または未設定',
              validation: {
                isDifferentFromHero: openerPosition !== position,
                isAfterHero: getPositionIndex(openerPosition) > getPositionIndex(position),
                isValid: true
              }
            });
            
            // 選択されたポジションの有効性を再確認
            const selectedIndex = getPositionIndex(openerPosition);
            const heroIndex = getPositionIndex(position);
            
            if (openerPosition === position || selectedIndex <= heroIndex) {
              console.error('❌ 選択された3ベッターポジションが無効です:', {
                heroPosition: position,
                selectedPosition: openerPosition,
                heroIndex: heroIndex,
                selectedIndex: selectedIndex,
                validThreeBetters,
                reason: 'ヒーローと同じポジション、またはヒーローより前のポジションが選択されました'
              });
              
              // 強制的に有効なポジションを選択
              const safeOptions = validThreeBetters.filter(pos => {
                const posIndex = getPositionIndex(pos);
                return pos !== position && posIndex > heroIndex;
              });
              
              if (safeOptions.length > 0) {
                const safeRandomIndex = Math.floor(Math.random() * safeOptions.length);
                openerPosition = safeOptions[safeRandomIndex];
                console.log('🔄 強制修正で3ベッターポジションを再選択:', {
                  from: '無効なポジション',
                  to: openerPosition,
                  safeOptions,
                  safeRandomIndex,
                  reason: '無効なポジションが選択されていたため強制修正'
                });
              } else {
                console.error('❌ 安全な3ベッターポジションが存在しません:', {
                  heroPosition: position,
                  validThreeBetters,
                  safeOptions
                });
              }
            }
          } else {
            console.error('❌ 有効な3ベッターポジションが存在しません:', {
              heroPosition: position,
              heroIndex: positionIndex,
              positionOrderLength: POSITION_ORDER.length,
              allAfterHero,
              validThreeBetters,
              reason: 'ヒーローと同じポジションを除外した結果、有効なポジションが残りませんでした'
            });
          }
        } else {
          console.error('❌ ヒーローが最後のポジションのため、3ベッターが存在しません:', {
            heroPosition: position,
            heroIndex: positionIndex,
            positionOrder: POSITION_ORDER
          });
        }
      }
      
      // 最終的なopenerPositionの有効性を確認
      if (openerPosition) {
        const finalValidation = openerPosition !== position && getPositionIndex(openerPosition) > getPositionIndex(position);
        if (!finalValidation) {
          console.error('❌ 最終検証で無効なopenerPositionが設定されています:', {
            heroPosition: position,
            openerPosition,
            heroIndex: getPositionIndex(position),
            openerIndex: getPositionIndex(openerPosition),
            reason: 'generateNewScenarioでの設定が無効です。強制修正が必要です。'
          });
          
          // 強制的に有効なポジションを設定
          const validOptions = POSITION_ORDER.slice(getPositionIndex(position) + 1).filter(pos => pos !== position);
          if (validOptions.length > 0) {
            openerPosition = validOptions[Math.floor(Math.random() * validOptions.length)];
            console.log('🔄 generateNewScenario最終強制修正:', {
              from: '無効なポジション',
              to: openerPosition,
              validOptions,
              reason: '最終検証で無効なポジションが発見されたため強制修正'
            });
          }
        }
      }
      
      // 最終確認：openerPositionが正しく設定されているか
      if (openerPosition) {
        const finalCheck = openerPosition !== position && getPositionIndex(openerPosition) > getPositionIndex(position);
        if (!finalCheck) {
          console.error('❌ 最終確認で無効なopenerPositionが設定されています:', {
            heroPosition: position,
            openerPosition,
            heroIndex: getPositionIndex(position),
            openerIndex: getPositionIndex(openerPosition),
            reason: 'これは完全にありえない状況です。強制修正が必要です。'
          });
          
          // 強制的に有効なポジションを設定
          const validOptions = POSITION_ORDER.slice(getPositionIndex(position) + 1).filter(pos => pos !== position);
          if (validOptions.length > 0) {
            openerPosition = validOptions[Math.floor(Math.random() * validOptions.length)];
            console.log('🔄 generateNewScenario最終強制修正完了:', {
              from: '無効なポジション',
              to: openerPosition,
              validOptions,
              reason: '最終確認で無効なポジションが発見されたため強制修正'
            });
          }
        }
      }
      
      console.log('🎯 vs3bet 3ベッターポジション設定完了:', {
        heroPosition: position,
        threeBetterPosition: openerPosition,
        heroIndex: getPositionIndex(position),
        threeBetterIndex: openerPosition ? getPositionIndex(openerPosition) : -1,
        isValid: openerPosition && openerPosition !== position && getPositionIndex(openerPosition) > getPositionIndex(position)
      });
    } else if (actionType === 'vs4bet') {
      // vs4betの場合、4ベッターをランダムに選択（3ベッターより前のポジション）
      const urlFourBetter = searchParams.get('fourbetter');
      if (urlFourBetter) {
        const fourBetterIndex = getPositionIndex(urlFourBetter);
        const positionIndex = getPositionIndex(position);
        if (fourBetterIndex < positionIndex) {
          openerPosition = urlFourBetter; // vs4betでは4ベッターの情報をopenerPositionパラメータで渡す
          setCurrentOpponentPosition(urlFourBetter);
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
    
    // 15BBのvs3ベット専用デバッグ（openerPosition確定後）
    if (stackSize === '15BB' && actionType === 'vs3bet' && latestCustomRanges) {
      console.log('🎯 15BB vs3ベット カスタムレンジ読み込み確認:', {
        parsedRangesCount: Object.keys(latestCustomRanges).length,
        vs3betKeys: Object.keys(latestCustomRanges).filter(key => key.startsWith('vs3bet_')),
        targetRangeKey: `vs3bet_${position}_vs_${openerPosition}`,
        targetFallbackKey: `vs3bet_${position}_vs_${openerPosition}_15BB`,
        hasTargetRange: !!latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}`],
        hasTargetFallback: !!latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`],
        targetRangeData: latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}`] ? 
          Object.keys(latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}`]) : null,
        targetFallbackData: latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`] ? 
          Object.keys(latestCustomRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`]) : null,
        // 全vs3betキーの詳細確認
        allVs3betKeys: Object.keys(latestCustomRanges).filter(key => key.startsWith('vs3bet_')),
        // 15BB関連のキーの詳細確認
        vs3bet15BBKeys: Object.keys(latestCustomRanges).filter(key => key.startsWith('vs3bet_') && !key.includes('_15BB') && !key.includes('_20BB') && !key.includes('_30BB') && !key.includes('_40BB') && !key.includes('_50BB') && !key.includes('_75BB') && !key.includes('_100BB')),
        vs3bet15BBSpecificKeys: Object.keys(latestCustomRanges).filter(key => key.startsWith('vs3bet_') && key.includes('_15BB'))
      });
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
      // 15BBのvs3ベット専用デバッグ
      ...(stackSize === '15BB' && actionType === 'vs3bet' && {
        vs3bet15BBRangeKey: `vs3bet_${position}_vs_${openerPosition}`,
        vs3bet15BBFallbackKey: `vs3bet_${position}_vs_${openerPosition}_15BB`,
        hasVs3bet15BBRange: !!(customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}`]),
        hasVs3bet15BBFallback: !!(customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`]),
        vs3bet15BBRangeData: customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}`] ? 
          Object.keys(customRanges[`vs3bet_${position}_vs_${openerPosition}`]) : [],
        vs3bet15BBFallbackData: customRanges && customRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`] ? 
          Object.keys(customRanges[`vs3bet_${position}_vs_${openerPosition}_15BB`]) : [],
        allVs3betKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_')) : []
      }),
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
    console.log('🎯 generateNewScenario: simulateMTTGTOData呼び出し直前');
    console.log('🎯 simulateMTTGTOData呼び出し直前:', {
      newHand,
      position,
      stackSize,
      actionType,
      latestCustomRangesExists: !!latestCustomRanges,
      latestCustomRangesKeys: latestCustomRanges ? Object.keys(latestCustomRanges) : [],
      latestCustomRangesCount: latestCustomRanges ? Object.keys(latestCustomRanges).length : 0,
      openerPosition,
      threeBetType
    });
    
    console.log('🎯 simulateMTTGTOData関数呼び出し開始');
    console.log('🎯 simulateMTTGTOData呼び出しパラメータ:', {
      newHand,
      position,
      stackSize,
      actionType: actionType as string,
      latestCustomRangesCount: latestCustomRanges ? Object.keys(latestCustomRanges).length : 0,
      openerPosition,
      threeBetType,
      // vs3ベット専用のデバッグ情報
      vs3betDebug: actionType === 'vs3bet' ? {
        openerPosition,
        openerPositionType: typeof openerPosition,
        heroPosition: position,
        heroIndex: getPositionIndex(position),
        openerPositionIndex: openerPosition ? getPositionIndex(openerPosition) : -1,
        isValid: openerPosition && openerPosition !== position && getPositionIndex(openerPosition) > getPositionIndex(position)
      } : null
    });
    
    // GTOデータの生成は newSpot 定義後に移動
    
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
        // 15BBのSB vs BBでは、CPUアクションをシミュレートしてランダムなopenRaiseSizeを決定
        const sbActionRates = { 'FOLD': 0, 'OPEN_2BB': 10, 'ALL_IN': 20, 'LIMP': 70 };
        const random = Math.random() * 100;
        let sbAction = 'LIMP';
        
        if (random <= sbActionRates['FOLD']) {
          sbAction = 'FOLD';
        } else if (random <= sbActionRates['FOLD'] + sbActionRates['OPEN_2BB']) {
          sbAction = 'OPEN_2BB';
        } else if (random <= sbActionRates['FOLD'] + sbActionRates['OPEN_2BB'] + sbActionRates['ALL_IN']) {
          sbAction = 'ALL_IN';
        } else {
          sbAction = 'LIMP';
        }
        
        console.log(`🎯 SBアクション決定: ${sbAction} (random: ${random})`);
        console.log(`🎯 SBアクション結果: openRaiseSize=${openRaiseSize}, potSize=${potSize}`);
        
        if (sbAction === 'OPEN_2BB') {
          openRaiseSize = 2.0;
        } else if (sbAction === 'ALL_IN') {
          openRaiseSize = 15.0;
        } else {
          openRaiseSize = 1.0; // LIMP or FOLD
        }
        
        potSize = openRaiseSize + 1.0 + 1; // SBアクション + BB + Ante
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
      newHand
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
            : openerPosition === 'SB' && stackSize === '15BB'
              ? `vs SBの${openRaiseSize === 2.0 ? 'オープン(2BB)' : openRaiseSize === 15.0 ? 'オールイン(15BB)' : 'リンプ(1BB)'}`
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
      correctAction: '', // GTOデータ生成後に設定
      evData: undefined,
      frequencies: undefined, // GTOデータ生成後に設定

      correctBetSize: 0, // GTOデータ生成後に設定
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
            // 15BBのvs3ベットでは、実際の3ベットサイズに基づいてスタックを計算
            const threeBetAmount = 15; // 15BBのvs3ベットは通常15BB
            if (openerPosition === 'SB') {
              threeBetterStack = 14.5 - threeBetAmount; // 15 - 0.5 - 15 = -0.5 → 0
            } else if (openerPosition === 'BB') {
              // BBが3ベッターの場合、15BBを3ベットするのでスタックは0になる
              threeBetterStack = 0; // 15BB - 15BB = 0BB
            } else {
              threeBetterStack = 15 - threeBetAmount; // 15 - 15 = 0
            }
            console.log(`🎯 15BB 3ベッタースタック計算: ${openerPosition} = ${threeBetterStack}`);
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
            stack: (() => {
              if (openerPosition === 'BB' && actionType === 'vs3bet' && stackSize === '15BB') {
                // 15BBのvs3ベットでBBが3ベッターの場合、強制的にスタックを0にする
                console.log('🎯 BBスタック強制修正: 15BB vs3ベットでBBが3ベッター、スタックを0に設定');
                return 0;
              } else if (openerPosition === 'BB') {
                // BBが3ベッターの場合（その他のスタックサイズ）
                return threeBetterStack;
              } else {
                // BBが3ベッターでない場合
                return (stackValue - 1);
              }
            })(), 
            isHero: position === 'BB' 
          }
        };
        
        console.log(`🎯 根本的実装: actionType=${actionType}, openerPosition=${openerPosition}, threeBetterStack=${threeBetterStack}, threeBetSize=${threeBetSize}, stackSize=${stackSize}`);
        console.log(`🎯 ${openerPosition}のスタック: ${positions[openerPosition as keyof typeof positions]?.stack || 'N/A'}`);
        console.log(`🎯 15BB vs3bet BBスタック計算デバッグ:`, {
          stackSize,
          actionType,
          threeBetSize,
          threeBetterStack,
          openerPosition,
          stackValue,
          condition: actionType === 'vs3bet' && openerPosition,
          stackCondition: stackSize === '15BB',
          bbStack: positions['BB']?.stack,
          isBBThreeBetter: openerPosition === 'BB',
          expectedBBStack: openerPosition === 'BB' ? threeBetterStack : (stackValue - 1)
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
    
    // GTOデータを生成（newSpot定義後に実行）
    const data = simulateMTTGTOData(
      newHand, 
      position, 
      stackSize, 
      actionType as string,
      latestCustomRanges, // 最新のカスタムレンジを渡す
      openerPosition,
      threeBetType,
      finalSpot // スポットデータを渡す
    );
    console.log('🎯 simulateMTTGTOData関数呼び出し完了:', {
      dataExists: !!data,
      dataCorrectAction: data?.correctAction,
      dataIsCustomRange: (data as any)?.isCustomRange
    });
    console.log('🎯 setGtoData直前:', {
      newHand,
      dataNormalizedHandType: data.normalizedHandType,
      dataFrequencies: data.frequencies,
      dataCorrectAction: data.correctAction,
      customRangesKeys: Object.keys(customRanges),
      customRangesCount: Object.keys(customRanges).length,
      isCustomRangeUsed: (data as any)?.isCustomRange
    });
    
    // finalSpotにGTOデータを反映
    finalSpot.correctAction = data.correctAction;
    finalSpot.evData = data.evData;
    finalSpot.frequencies = data.frequencies;
    finalSpot.correctBetSize = data.recommendedBetSize || 0;
    
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
                // 制限チェック - 制限に達している場合はシナリオ生成をスキップ
                if ((subscriptionStatus === 'light' && dailyPracticeCount >= 50) ||
                    (subscriptionStatus === 'free' && dailyPracticeCount >= 10)) {
                  setIsInitialized(true);
                  setShowDailyLimitModal(true);
                } else {
                  generateNewScenario();
                  setIsInitialized(true);
                }
              }, 50);
              return;
            }
          }
        } catch (e) {
          console.log('カスタムレンジ確認エラー:', e);
        }
      }

      // カスタムレンジがない場合、または既に読み込み済みの場合は即座に初期化
      // 制限チェック - 制限に達している場合はシナリオ生成をスキップして初期化のみ完了
      if ((subscriptionStatus === 'light' && dailyPracticeCount >= 50) ||
          (subscriptionStatus === 'free' && dailyPracticeCount >= 10)) {
        setIsInitialized(true);
        setShowDailyLimitModal(true);
      } else {
        generateNewScenario();
        setIsInitialized(true);
      }
    }
  }, [position, stackSize, actionType, customHandsString, isInitialized, lastRangeUpdate, subscriptionStatus, dailyPracticeCount]); // lastRangeUpdate used instead of customRanges

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
  
  // サーバーベース GTOレンジ読み込み（インポート優先対応）
  useEffect(() => {
    console.log('🌐 サーバーベース GTOレンジ読み込み開始:', { lastRangeUpdate, isInitialized });
    
    const loadServerRanges = async () => {
      try {
        // 現在のカスタムレンジが既にある場合（インポート済み）はスキップ
        if (Object.keys(customRanges).length > 0) {
          console.log('📦 既存のカスタムレンジを優先: サーバー読み込みをスキップ');
          return;
        }
        
        console.log('🔄 サーバーから管理者GTOレンジを直接取得中...');
        const response = await fetch('/api/mtt-ranges');
        
        if (response.ok) {
          const systemData = await response.json();
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            console.log('✅ サーバーから管理者GTOレンジ取得成功:', {
              systemRangeCount: Object.keys(systemData.ranges).length,
              systemKeys: Object.keys(systemData.ranges).slice(0, 10),
              lastUpdated: systemData.lastUpdated
            });
            
            // サーバーレンジを直接適用（既存データがない場合のみ）
            setCustomRanges(systemData.ranges);
            setLastRangeUpdate(Date.now());
            
            console.log('🎯 サーバーベース GTOレンジが適用されました');
          } else {
            console.log('⚠️ サーバーに管理者GTOレンジが存在しません');
          }
        } else {
          console.error('❌ サーバーGTOレンジAPIアクセス失敗:', response.status);
        }
      } catch (error) {
        console.error('❌ サーバーGTOレンジ取得エラー:', error);
      }
    };
    
    // サーバーから直接読み込み（既存データがない場合のみ）
    loadServerRanges();
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
        console.log('🎯 新しい端末での初回アクセスを検出 - システムレンジを優先読み込み');
      }
      console.log('🎯 カスタムレンジ読み込み開始');
      
      // 保存中でない場合のみ処理を実行
      if (!isSaving) {
        // 統合ストレージシステムからデータを読み込み
        const localRanges = await storageManager.loadRanges();
        const localTimestamp = localStorage.getItem('mtt-ranges-timestamp');
        
        // ローカルデータがある場合は一時的に設定（後でAPIと比較）
        if (localRanges && Object.keys(localRanges).length > 0) {
          setCustomRanges(localRanges);
          console.log('🎯 統合ストレージからデータを一時設定:', {
            rangeKeys: Object.keys(localRanges),
            rangeCount: Object.keys(localRanges).length,
            vsopenKeys: Object.keys(localRanges).filter(key => key.startsWith('vsopen_')),
            vs3betKeys: Object.keys(localRanges).filter(key => key.startsWith('vs3bet_')),
            vs4betKeys: Object.keys(localRanges).filter(key => key.startsWith('vs4bet_')),
            openRaiseKeys: Object.keys(localRanges).filter(key => !key.startsWith('vs') && !key.includes('_')),
            sampleVsopenRange: Object.keys(localRanges).filter(key => key.startsWith('vsopen_'))[0] ? 
              Object.keys(localRanges[Object.keys(localRanges).filter(key => key.startsWith('vsopen_'))[0]]) : null
          });
          // ローカルデータがあってもAPIとの同期を続行
        } else if (isFirstVisit) {
          console.log('🎯 初回アクセス: ローカルデータなし - システムレンジを優先読み込み');
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
        console.log('❌ APIからの読み込みに失敗しました。ローカルデータを保持します。');
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
    vs3betCount: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_')).length : 0,
    // 15BBのvs3ベット専用デバッグ
    vs3bet15BBKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && !key.includes('_15BB') && !key.includes('_20BB') && !key.includes('_30BB') && !key.includes('_40BB') && !key.includes('_50BB') && !key.includes('_75BB') && !key.includes('_100BB')) : [],
    vs3bet15BBSpecificKeys: customRanges ? Object.keys(customRanges).filter(key => key.startsWith('vs3bet_') && key.includes('_15BB')) : []
  });
  
  // カスタムレンジが空の場合は強制的にローカルストレージから読み込み
  if (!customRanges || Object.keys(customRanges).length === 0) {
    console.log('🎯 カスタムレンジが空のため、強制読み込みを実行');
    const localRanges = localStorage.getItem('mtt-custom-ranges');
    if (localRanges) {
      try {
        const parsedRanges = JSON.parse(localRanges);
        if (Object.keys(parsedRanges).length > 0) {
          setCustomRanges(parsedRanges);
          console.log('🎯 強制読み込み成功:', {
            rangeKeys: Object.keys(parsedRanges),
            rangeCount: Object.keys(parsedRanges).length
          });
        }
      } catch (e) {
        console.log('強制読み込みエラー:', e);
      }
    }
  }
  
  // カスタムレンジの変更を監視（デバッグ用）
  console.log('🎯 カスタムレンジ変更監視開始:', {
    currentRanges: Object.keys(customRanges),
    currentCount: Object.keys(customRanges).length
  });
    
    // サーバーベース GTOレンジの定期同期（インポート保護付き）
    const intervalId = setInterval(async () => {
      // 保存中またはユーザーがカスタムレンジをインポートしている場合はスキップ
      if (isSaving) {
        console.log('⏸️ 保存中のため、GTOレンジ同期をスキップ');
        return;
      }
      
      // ユーザーがレンジをインポートしてから5分間は同期をスキップ
      const lastUpdate = Date.now() - lastRangeUpdate;
      if (lastUpdate < 300000) { // 5分 = 300000ms
        console.log('⏸️ 最近インポートされたため、GTOレンジ同期をスキップ');
        return;
      }
      
      try {
        console.log('🔄 定期的なサーバーGTOレンジ同期を実行中...');
        const response = await fetch('/api/mtt-ranges');
        if (response.ok) {
          const systemData = await response.json();
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            // 現在のレンジと比較（インポートしたデータを保護）
            const currentRangesString = JSON.stringify(customRanges);
            const serverRangesString = JSON.stringify(systemData.ranges);
            
            // 管理者のみサーバーレンジで更新、一般ユーザーは既存データを保持
            if (isAdmin && currentRangesString !== serverRangesString) {
              console.log('🚀 管理者モード: サーバーGTOレンジが更新されました');
              
              // 管理者の場合のみサーバーレンジを適用
              setCustomRanges(systemData.ranges);
              setLastRangeUpdate(Date.now());
              
              console.log('✅ 定期同期完了: サーバーから最新GTOレンジを取得');
            } else {
              console.log('📋 インポートデータを保護: 同期をスキップ');
            }
          } else {
            console.log('⚠️ サーバーにGTOレンジが存在しません');
          }
        } else {
          console.log('⚠️ サーバーGTOレンジAPI応答エラー:', response.status);
        }
      } catch (error) {
        console.log('⚠️ 定期同期エラー:', error);
      }
    }, 10000); // 10秒間隔でリアルタイム同期

    // ページフォーカス時のサーバー同期（インポート保護付き）
    const handleFocus = async () => {
      if (isSaving) return;
      
      // ユーザーがレンジをインポートしてから5分間は同期をスキップ
      const lastUpdate = Date.now() - lastRangeUpdate;
      if (lastUpdate < 300000) { // 5分 = 300000ms
        console.log('⏸️ 最近インポートされたため、フォーカス時同期をスキップ');
        return;
      }
      
      try {
        console.log('🔔 ページフォーカス検出 - サーバーGTOレンジ同期実行');
        const response = await fetch('/api/mtt-ranges');
        if (response.ok) {
          const systemData = await response.json();
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            // 現在のレンジと比較（インポートしたデータを保護）
            const currentRangesString = JSON.stringify(customRanges);
            const serverRangesString = JSON.stringify(systemData.ranges);
            
            // 管理者のみサーバーレンジで更新
            if (isAdmin && currentRangesString !== serverRangesString) {
              console.log('🚀 フォーカス時同期: サーバーGTOレンジを更新');
              
              setCustomRanges(systemData.ranges);
              setLastRangeUpdate(Date.now());
              
              console.log(`✅ フォーカス時同期完了: ${Object.keys(systemData.ranges).length}個のレンジ`);
            } else {
              console.log('📋 インポートデータを保護: フォーカス時同期をスキップ');
            }
          } else {
            console.log('⚠️ サーバーにGTOレンジが存在しません');
          }
        }
      } catch (error) {
        console.log('⚠️ フォーカス時同期エラー:', error);
      }
    };
    
    // フォーカスイベントリスナーを追加
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        handleFocus();
      }
    });

    // クリーンアップ
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
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

  // シンプルな保存フラグ管理
  
  // シンプルなバッチ保存
  const handleBatchSaveRanges = async (ranges: Array<{position: string, rangeData: Record<string, HandInfo>}>) => {
    console.log('🎯 バッチ保存開始:', ranges.length, '個のレンジ');
    
    for (const { position, rangeData } of ranges) {
      await handleSaveRange(position, rangeData);
      // 各保存の間に少し待機
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ バッチ保存完了');
  };

  const handleSaveRange = async (position: string, rangeData: Record<string, HandInfo>) => {
    console.log('🔧 handleSaveRange 呼び出し:', { 
      position, 
      rangeDataValid: !!rangeData,
      rangeDataSize: rangeData ? Object.keys(rangeData).length : 0,
      isSaving,
      timestamp: new Date().toISOString()
    });

    // データの妥当性をチェック
    if (!validateRangeData(rangeData)) {
      console.error('❌ レンジデータのバリデーションに失敗しました', { position, rangeData });
      return;
    }

    // 保存中の場合は少し待ってから再試行
    if (isSaving) {
      console.log('⏳ 他の保存処理が実行中です。1秒後に再試行します:', { 
        position, 
        isSaving,
        timestamp: new Date().toISOString()
      });
      
      setTimeout(() => {
        if (!isSaving) {
          console.log('🔄 再試行: handleSaveRange', position);
          handleSaveRange(position, rangeData);
        } else {
          console.error('❌ 保存の再試行に失敗しました。isSavingフラグを強制リセットします');
          setIsSaving(false);
          handleSaveRange(position, rangeData);
        }
      }, 1000);
      return;
    }

    console.log('🎯 保存開始:', { 
      position, 
      rangeDataKeys: Object.keys(rangeData), 
      rangeDataSize: Object.keys(rangeData).length
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
    
    try {
      setCustomRanges(newCustomRanges);
      
      // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
      setLastRangeUpdate(Date.now());
      
      // 統合ストレージシステムで安全に保存
      const saveResult = await storageManager.saveRanges(newCustomRanges);
      
      if (saveResult.success) {
        const currentTimestamp = new Date().toISOString();
        localStorage.setItem('mtt-ranges-timestamp', currentTimestamp);
        console.log(`✅ ${position}ポジションのカスタムレンジを保存しました (${saveResult.method})`);
        
        // 管理者認証済みならAPIにも自動保存（全プレイヤーに即座に反映）
        if (isAdmin && token) {
          try {
            console.log('🔒 管理者として全プレイヤー向けのシステム全体にレンジを保存開始');
            const response = await fetch('/api/mtt-ranges', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ranges: newCustomRanges,
                metadata: {
                  creator: 'Admin',
                  totalRanges: Object.keys(newCustomRanges).length,
                  updatedBy: position,
                  timestamp: currentTimestamp
                }
              }),
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log('✅ システム全体への保存成功（端末間同期有効）:', result);
              
              // システム保存成功時はタイムスタンプを更新
              localStorage.setItem('mtt-ranges-timestamp', result.metadata?.lastUpdated || currentTimestamp);
            } else {
              const error = await response.json();
              console.error('❌ システム全体への保存失敗:', error.error || '保存に失敗しました');
            }
          } catch (error) {
            console.error('❌ API保存エラー:', error);
          }
        } else {
          console.log('📌 管理者でないため、サーバーベースレンジシステムを利用（ローカル保存は使用しない）');
          
          // 一般ユーザーはサーバーレンジを直接参照するため、保存は行わない
          console.log('ℹ️ 一般ユーザーのレンジ変更は保存されません - 管理者GTOレンジが常に適用されます');
        }
        
        console.log('🎯 保存詳細:', {
          position,
          rangeKeys: Object.keys(newCustomRanges),
          savedRangeKeys: Object.keys(rangeData),
          storageMethod: saveResult.method,
          timestamp: currentTimestamp,
          isAdmin,
          hasToken: !!token,
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
      } else {
        console.error('❌ 統合ストレージ保存失敗');
        alert(`❌ レンジの保存に失敗しました`);
      }
    } catch (error) {
      console.error('❌ レンジ保存エラー:', error);
      alert(`❌ ${position}の保存中にエラーが発生しました\n\nエラー詳細: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
      console.log('🎯 保存処理完了:', position);
      
      // 確実にフラグをリセットするための安全装置
      setTimeout(() => {
        setIsSaving(false);
      }, 100);
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

  // データ圧縮関数（重複除去とサイズ最適化）
  const compressRangeData = (data: Record<string, any>) => {
    // 1. 頻度データの重複除去（共通の頻度パターンを参照に）
    const frequencyPatterns: Record<string, any> = {};
    let patternId = 0;
    
    // 2. まず全てのハンドデータをスキャンして共通パターンを抽出
    const processedData: Record<string, any> = {};
    
    Object.entries(data).forEach(([rangeKey, rangeValue]) => {
      if (typeof rangeValue === 'object' && rangeValue !== null) {
        const processedRange: Record<string, any> = {};
        
        Object.entries(rangeValue).forEach(([hand, handInfo]: [string, any]) => {
          if (handInfo && typeof handInfo === 'object') {
            const handString = JSON.stringify(handInfo);
            
            // 既存のパターンを探す
            let existingPatternId = Object.keys(frequencyPatterns).find(
              id => JSON.stringify(frequencyPatterns[id]) === handString
            );
            
            if (!existingPatternId) {
              existingPatternId = `p${patternId++}`;
              frequencyPatterns[existingPatternId] = handInfo;
            }
            
            processedRange[hand] = { ref: existingPatternId };
          } else {
            processedRange[hand] = handInfo;
          }
        });
        
        processedData[rangeKey] = processedRange;
      } else {
        processedData[rangeKey] = rangeValue;
      }
    });
    
    return {
      patterns: frequencyPatterns,
      ranges: processedData,
      meta: {
        originalSize: JSON.stringify(data).length,
        compressedSize: JSON.stringify({ patterns: frequencyPatterns, ranges: processedData }).length,
        compressionRatio: JSON.stringify(data).length / JSON.stringify({ patterns: frequencyPatterns, ranges: processedData }).length
      }
    };
  };

  // データ展開関数
  const decompressRangeData = (compressedData: any) => {
    if (!compressedData.patterns || !compressedData.ranges) {
      // 圧縮されていないデータの場合はそのまま返す
      return compressedData;
    }
    
    const { patterns, ranges } = compressedData;
    const decompressedData: Record<string, any> = {};
    
    Object.entries(ranges).forEach(([rangeKey, rangeValue]: [string, any]) => {
      if (typeof rangeValue === 'object' && rangeValue !== null) {
        const decompressedRange: Record<string, any> = {};
        
        Object.entries(rangeValue).forEach(([hand, handInfo]: [string, any]) => {
          if (handInfo && handInfo.ref && patterns[handInfo.ref]) {
            decompressedRange[hand] = patterns[handInfo.ref];
          } else {
            decompressedRange[hand] = handInfo;
          }
        });
        
        decompressedData[rangeKey] = decompressedRange;
      } else {
        decompressedData[rangeKey] = rangeValue;
      }
    });
    
    return decompressedData;
  };

  // IndexedDB管理クラス
  class IndexedDBManager {
    private dbName = 'GTOVantageDB';
    private dbVersion = 1;
    private storeName = 'mttRanges';

    // IndexedDBを開く
    private async openDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
      });
    }

    // データを保存
    async saveRanges(ranges: Record<string, any>): Promise<void> {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      const data = {
        id: 'current',
        ranges,
        timestamp: new Date().toISOString(),
        version: 'v1.0'
      };
      
      return new Promise((resolve, reject) => {
        const request = store.put(data);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    // データを読み込み
    async loadRanges(): Promise<Record<string, any> | null> {
      try {
        const db = await this.openDB();
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        return new Promise((resolve, reject) => {
          const request = store.get('current');
          request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.ranges : null);
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('IndexedDB読み込みエラー:', error);
        return null;
      }
    }

    // データサイズを取得
    async getStorageInfo(): Promise<{ sizeEstimate?: number; quotaEstimate?: number; usageDetails?: any }> {
      try {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
          const estimate = await navigator.storage.estimate();
          return {
            sizeEstimate: estimate.usage,
            quotaEstimate: estimate.quota,
            usageDetails: (estimate as any).usageDetails
          };
        }
        return {};
      } catch (error) {
        console.error('Storage API エラー:', error);
        return {};
      }
    }

    // データを削除
    async clearRanges(): Promise<void> {
      const db = await this.openDB();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete('current');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // IndexedDBマネージャーのインスタンス
  const idbManager = new IndexedDBManager();

  // プライベートモード対応の高度なストレージ管理システム
  const storageManager = {
    // メモリベースのフォールバックストレージ
    memoryStorage: new Map<string, string>(),

    // ストレージ利用可能性をチェック
    isStorageAvailable: (type: 'localStorage' | 'sessionStorage' | 'indexedDB'): boolean => {
      try {
        if (type === 'indexedDB') {
          return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
        }
        
        const storage = type === 'localStorage' ? window.localStorage : window.sessionStorage;
        const test = '__storage_test__';
        storage.setItem(test, test);
        storage.removeItem(test);
        return true;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.warn(`🚫 ${type} 利用不可 (プライベートモード?):`, errorMessage);
        return false;
      }
    },

    // セーフなストレージ保存
    safeSetItem: (key: string, value: string): { success: boolean; method: string } => {
      try {
        // 1. localStorage を試行
        if (storageManager.isStorageAvailable('localStorage')) {
          localStorage.setItem(key, value);
          console.log(`✅ localStorage保存: ${key}`);
          return { success: true, method: 'localStorage' };
        }
        
        // 2. sessionStorage を試行（プライベートモードでも利用可能な場合がある）
        if (storageManager.isStorageAvailable('sessionStorage')) {
          sessionStorage.setItem(key, value);
          console.log(`✅ sessionStorage保存: ${key} (プライベートモード対応)`);
          return { success: true, method: 'sessionStorage' };
        }
        
        // 3. メモリストレージにフォールバック
        storageManager.memoryStorage.set(key, value);
        console.log(`⚠️ メモリ保存: ${key} (プライベートモード対応)`);
        return { success: true, method: 'memory' };
        
      } catch (error) {
        console.error(`❌ ストレージ保存失敗: ${key}`, error);
        // 最終フォールバック: メモリストレージ
        storageManager.memoryStorage.set(key, value);
        return { success: true, method: 'memory-fallback' };
      }
    },

    // セーフなストレージ取得
    safeGetItem: (key: string): { value: string | null; method: string } => {
      try {
        // 1. localStorage から試行
        if (storageManager.isStorageAvailable('localStorage')) {
          const value = localStorage.getItem(key);
          if (value !== null) {
            console.log(`✅ localStorage取得: ${key}`);
            return { value, method: 'localStorage' };
          }
        }
        
        // 2. sessionStorage から試行
        if (storageManager.isStorageAvailable('sessionStorage')) {
          const value = sessionStorage.getItem(key);
          if (value !== null) {
            console.log(`✅ sessionStorage取得: ${key} (プライベートモード対応)`);
            return { value, method: 'sessionStorage' };
          }
        }
        
        // 3. メモリストレージから取得
        const memoryValue = storageManager.memoryStorage.get(key);
        if (memoryValue !== undefined) {
          console.log(`⚠️ メモリ取得: ${key} (プライベートモード対応)`);
          return { value: memoryValue, method: 'memory' };
        }
        
        return { value: null, method: 'none' };
        
      } catch (error) {
        console.error(`❌ ストレージ取得失敗: ${key}`, error);
        // フォールバック: メモリストレージ
        const memoryValue = storageManager.memoryStorage.get(key);
        return { value: memoryValue || null, method: 'memory-fallback' };
      }
    },

    // localStorage容量情報を取得
    getLocalStorageInfo: () => {
      let totalSize = 0;
      let itemCount = 0;
      
      try {
        if (storageManager.isStorageAvailable('localStorage')) {
          for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
              const itemSize = localStorage.getItem(key)?.length || 0;
              totalSize += itemSize;
              itemCount++;
            }
          }
        }
      } catch (error) {
        console.warn('localStorage情報取得失敗:', error);
      }
      
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      const estimatedLimit = 5; // 一般的な制限値（MB）
      const usagePercent = ((totalSize / (estimatedLimit * 1024 * 1024)) * 100).toFixed(1);
      
      return {
        totalSizeBytes: totalSize,
        totalSizeMB,
        itemCount,
        estimatedLimitMB: estimatedLimit,
        usagePercent: parseFloat(usagePercent),
        isNearLimit: parseFloat(usagePercent) > 80,
        isAvailable: storageManager.isStorageAvailable('localStorage')
      };
    },

    // 統合ストレージ情報を取得（プライベートモード対応）
    getStorageInfo: async () => {
      const localStorage = storageManager.getLocalStorageInfo();
      let indexedDB;
      
      try {
        indexedDB = await idbManager.getStorageInfo();
      } catch (error) {
        console.warn('IndexedDB情報取得失敗:', error);
        indexedDB = { sizeEstimate: 0, quotaEstimate: 0 };
      }
      
      return {
        localStorage,
        sessionStorage: {
          isAvailable: storageManager.isStorageAvailable('sessionStorage')
        },
        indexedDB: {
          sizeEstimateMB: indexedDB.sizeEstimate ? (indexedDB.sizeEstimate / (1024 * 1024)).toFixed(2) : 'N/A',
          quotaEstimateMB: indexedDB.quotaEstimate ? (indexedDB.quotaEstimate / (1024 * 1024)).toFixed(2) : 'N/A',
          usagePercent: (indexedDB.sizeEstimate && indexedDB.quotaEstimate) ? 
            ((indexedDB.sizeEstimate / indexedDB.quotaEstimate) * 100).toFixed(2) : 'N/A',
          available: indexedDB.quotaEstimate ? 
            ((indexedDB.quotaEstimate - (indexedDB.sizeEstimate || 0)) / (1024 * 1024)).toFixed(2) : 'N/A',
          isAvailable: storageManager.isStorageAvailable('indexedDB')
        },
        memoryStorage: {
          items: storageManager.memoryStorage.size,
          isActive: storageManager.memoryStorage.size > 0,
          estimatedSizeKB: Array.from(storageManager.memoryStorage.values()).reduce((acc, val) => acc + val.length, 0) / 1024
        }
      };
    },

    // データを保存（自動フォールバック）
    saveRanges: async (ranges: Record<string, any>): Promise<{ method: string; success: boolean; error?: string }> => {
      const dataString = JSON.stringify(ranges);
      const dataSize = new Blob([dataString]).size;
      const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
      
      console.log('🗄️ 統合ストレージ保存開始:', {
        rangeCount: Object.keys(ranges).length,
        dataSizeMB,
        strategy: 'Auto-fallback: IndexedDB → Compressed → Normal'
      });

      // 1. IndexedDBを最優先で試行
      try {
        await idbManager.saveRanges(ranges);
        console.log('✅ IndexedDB保存成功 (無制限容量)');
        
        // IndexedDB成功時はセーフストレージも同期（プライベートモード対応）
        storageManager.safeSetItem('mtt-custom-ranges', dataString);
        storageManager.safeSetItem('mtt-ranges-timestamp', new Date().toISOString());
        
        return { method: 'IndexedDB', success: true };
      } catch (idbError) {
        console.log('⚠️ IndexedDB保存失敗、localStorageを試行:', idbError);
      }

      // 2. セーフストレージ保存を試行（プライベートモード対応）
      const saveResult = storageManager.safeSetItem('mtt-custom-ranges', dataString);
      const timestampResult = storageManager.safeSetItem('mtt-ranges-timestamp', new Date().toISOString());
      
      if (saveResult.success) {
        console.log(`✅ レンジ保存成功 (${saveResult.method}) - プライベートモード対応`);
        return { method: saveResult.method, success: true };
      }

      // 3. localStorage圧縮保存を試行
      try {
        const compressed = compressRangeData(ranges);
        const compressedString = JSON.stringify(compressed);
        const compressedSize = new Blob([compressedString]).size;
        const compressedSizeMB = (compressedSize / (1024 * 1024)).toFixed(2);
        
        localStorage.setItem('mtt-custom-ranges-compressed', compressedString);
        localStorage.setItem('mtt-custom-ranges-format', 'compressed');
        localStorage.removeItem('mtt-custom-ranges');
        
        console.log(`✅ localStorage圧縮保存成功: ${dataSizeMB}MB → ${compressedSizeMB}MB`);
        return { method: 'localStorage-compressed', success: true };
      } catch (compressedError) {
        console.error('❌ 全てのストレージ保存方法が失敗:', compressedError);
        return { 
          method: 'none', 
          success: false, 
          error: `全ての保存方法が失敗: データサイズ(${dataSizeMB}MB)が制限を超えています` 
        };
      }
    },

    // データを読み込み（自動フォールバック）
    loadRanges: async (): Promise<Record<string, any> | null> => {
      console.log('🗄️ 統合ストレージ読み込み開始');

      // 1. IndexedDBから読み込み試行
      try {
        const idbData = await idbManager.loadRanges();
        if (idbData && Object.keys(idbData).length > 0) {
          console.log('✅ IndexedDBから読み込み成功:', Object.keys(idbData).length + '個のレンジ');
          return idbData;
        }
      } catch (idbError) {
        console.log('⚠️ IndexedDB読み込み失敗:', idbError);
      }

      // 2. セーフストレージから読み込み試行（プライベートモード対応）
      const formatResult = storageManager.safeGetItem('mtt-custom-ranges-format');
      if (formatResult.value === 'compressed') {
        const compressedResult = storageManager.safeGetItem('mtt-custom-ranges-compressed');
        if (compressedResult.value) {
          try {
            const parsed = JSON.parse(compressedResult.value);
            const decompressed = decompressRangeData(parsed);
            console.log(`✅ 圧縮データ読み込み成功 (${compressedResult.method}):`, Object.keys(decompressed).length + '個のレンジ');
            return decompressed;
          } catch (error) {
            console.log('⚠️ 圧縮データ読み込み失敗:', error);
          }
        }
      }

      // 3. 通常データから読み込み試行（プライベートモード対応）
      const normalResult = storageManager.safeGetItem('mtt-custom-ranges');
      if (normalResult.value) {
        try {
          const parsed = JSON.parse(normalResult.value);
          console.log(`✅ 通常データ読み込み成功 (${normalResult.method}):`, Object.keys(parsed).length + '個のレンジ');
          return parsed;
        } catch (error) {
          console.log('⚠️ 通常データ読み込み失敗:', error);
        }
      }

      // 4. プライベートモード緊急対応：サーバーから直接取得
      console.log('🚨 プライベートモード: サーバーから管理者GTOレンジを緊急取得');
      try {
        const response = await fetch('/api/mtt-ranges');
        if (response.ok) {
          const systemData = await response.json();
          if (systemData.ranges && Object.keys(systemData.ranges).length > 0) {
            console.log('✅ プライベートモード緊急取得成功:', Object.keys(systemData.ranges).length + '個のレンジ');
            
            // メモリストレージに保存
            storageManager.memoryStorage.set('mtt-custom-ranges', JSON.stringify(systemData.ranges));
            storageManager.memoryStorage.set('mtt-ranges-timestamp', systemData.lastUpdated);
            
            // プライベートモードでもlocalStorageに保存を試行（可能な場合）
            try {
              localStorage.setItem('mtt-custom-ranges', JSON.stringify(systemData.ranges));
              localStorage.setItem('mtt-ranges-timestamp', systemData.lastUpdated);
              console.log('✅ プライベートモード: localStorageにも保存成功');
            } catch (localError) {
              console.log('⚠️ プライベートモード: localStorage保存失敗（正常）:', localError);
            }
            
            return systemData.ranges;
          }
        }
      } catch (error) {
        console.log('⚠️ サーバー緊急取得失敗:', error);
      }

      console.log('⚠️ 全てのストレージからデータが見つかりませんでした（プライベートモード対応済み）');
      return null;
    }
  };

  // JSONファイルからカスタムレンジをインポート
  const handleImportRanges = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 現在のストレージ使用状況を確認
    console.log('📁 インポート開始:', { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });

    // 統合ストレージ情報を取得して表示
    storageManager.getStorageInfo().then(storageInfo => {
      console.log('💾 現在のストレージ状況:', storageInfo);
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const fileContent = e.target?.result as string;
        console.log('📄 ファイル内容読み込み完了:', { 
          contentLength: fileContent?.length,
          contentPreview: fileContent?.substring(0, 200) + (fileContent?.length > 200 ? '...' : ''),
          contentEnd: fileContent?.length > 200 ? '...' + fileContent?.substring(fileContent.length - 100) : '',
          hasValidJSON: (() => {
            try {
              JSON.parse(fileContent);
              return true;
            } catch {
              return false;
            }
          })()
        });
        
        const importedRanges = JSON.parse(fileContent);
        console.log('🔍 JSON解析完了:', {
          type: typeof importedRanges,
          isNull: importedRanges === null,
          isArray: Array.isArray(importedRanges),
          keys: typeof importedRanges === 'object' && importedRanges !== null ? Object.keys(importedRanges).slice(0, 10) : [],
          totalKeys: typeof importedRanges === 'object' && importedRanges !== null ? Object.keys(importedRanges).length : 0
        });
        
        // データの妥当性をチェック
        if (typeof importedRanges === 'object' && importedRanges !== null && !Array.isArray(importedRanges)) {
          console.log('✅ データ妥当性チェック通過');
          
          // localStorage容量チェック
          const dataString = JSON.stringify(importedRanges);
          const dataSize = new Blob([dataString]).size;
          const dataSizeMB = (dataSize / (1024 * 1024)).toFixed(2);
          
          console.log('💾 データサイズ情報:', {
            rangeCount: Object.keys(importedRanges).length,
            dataSizeBytes: dataSize,
            dataSizeMB: dataSizeMB,
            estimatedLocalStorageLimit: '5-10MB'
          });
          
          try {
            // まずStateを更新
            setCustomRanges(importedRanges);
            
            // 統合ストレージシステムで永続保存
            const saveResult = await storageManager.saveRanges(importedRanges);
            
            if (saveResult.success) {
              console.log(`✅ インポート完了: ${saveResult.method}で保存`);
              
              // 管理者の場合はサーバーにも保存
              if (isAdmin) {
                try {
                  console.log('🔑 管理者モード: サーバーへの保存を実行', {
                    isAdmin,
                    hasToken: !!token,
                    tokenLength: token?.length || 0,
                    adminToken: localStorage.getItem('admin-token')?.length || 0
                  });
                  const response = await fetch('/api/mtt-ranges', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('admin-token') || ''}`
                    },
                    body: JSON.stringify({
                      ranges: importedRanges,
                      lastUpdated: new Date().toISOString()
                    })
                  });
                  
                  if (response.ok) {
                    console.log('✅ サーバーへの保存成功');
                  } else {
                    console.warn('⚠️ サーバー保存失敗、ローカル保存は成功');
                  }
                } catch (error) {
                  console.warn('⚠️ サーバー保存エラー、ローカル保存は成功:', error);
                }
              }
            } else {
              console.error('❌ インポート保存失敗:', saveResult.error);
            }
            
            // レンジ更新タイムスタンプを更新してリアルタイム反映をトリガー
            setLastRangeUpdate(Date.now());
            
            // 新しいシナリオを生成してインポート結果を即座に反映
            setTimeout(() => {
              generateNewScenario();
            }, 500);
            
            if (saveResult.success) {
              let successMessage = `✅ レンジを正常にインポートしました！\n\n`;
              successMessage += `📊 インポート結果:\n`;
              successMessage += `・レンジ数: ${Object.keys(importedRanges).length}個\n`;
              successMessage += `・データサイズ: ${dataSizeMB}MB\n`;
              successMessage += `・保存方式: ${saveResult.method === 'server' ? 'サーバー（全ユーザー共有）' : 
                saveResult.method === 'IndexedDB' ? 'IndexedDB（大容量対応）' : 'セッション（現在のブラウザのみ）'}\n\n`;
              
              switch (saveResult.method) {
                case 'IndexedDB':
                  successMessage += `🚀 IndexedDB保存成功！\n`;
                  successMessage += `・容量制限: 実質無制限（数GB対応）\n`;
                  successMessage += `・パフォーマンス: 高速アクセス\n`;
                  successMessage += `・将来対応: 大規模データに完全対応`;
                  break;
                case 'localStorage':
                  successMessage += `💾 localStorage保存成功！\n`;
                  successMessage += `・データ形式: 通常（圧縮なし）\n`;
                  successMessage += `・アクセス速度: 高速`;
                  break;
                case 'localStorage-compressed':
                  successMessage += `📦 localStorage圧縮保存成功！\n`;
                  successMessage += `・データ形式: 圧縮済み\n`;
                  successMessage += `・容量削減: 自動最適化`;
                  break;
              }
              
              alert(successMessage);
              console.log('✅ インポート完了:', saveResult);
              
              // サーバーベースシステムの定期同期を一時停止して、インポートしたデータが優先されるようにする
              console.log('🔄 インポート後のシステム状態確認:', {
                currentCustomRanges: Object.keys(customRanges).length,
                importedRanges: Object.keys(importedRanges).length,
                lastRangeUpdate,
                isAdmin,
                saveMethod: saveResult.method
              });
            } else {
              // 保存失敗だがStateは更新済み
              alert(`⚠️ データ読み込みは成功しましたが、永続保存に失敗しました。\n\n` +
                `エラー: 保存に失敗しました\n\n` +
                `📊 現在の状況:\n` +
                `・レンジ数: ${Object.keys(importedRanges).length}個\n` +
                `・データサイズ: ${dataSizeMB}MB\n` +
                `・利用可能性: セッション中のみ\n\n` +
                `💡 推奨対策:\n` +
                `1. 管理者権限でシステム全体に保存\n` +
                `2. 不要なレンジを削除してサイズを削減\n` +
                `3. ブラウザのストレージをクリア`);
            }
          } catch (error) {
            console.error('❌ インポート処理エラー:', {
              error,
              errorType: error instanceof Error ? error.constructor.name : 'Unknown',
              errorMessage: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined
            });
            alert(`❌ インポート処理中にエラーが発生しました\n\nエラータイプ: ${error instanceof Error ? error.constructor.name : 'Unknown'}\nエラー詳細: ${error instanceof Error ? error.message : String(error)}`);
          }
        } else {
          console.error('❌ データ妥当性チェック失敗:', {
            type: typeof importedRanges,
            isNull: importedRanges === null,
            isArray: Array.isArray(importedRanges)
          });
          throw new Error('無効なファイル形式です。オブジェクト形式のJSONファイルが必要です。');
        }
      } catch (error) {
        console.error('❌ レンジのインポートに失敗しました:', {
          error,
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          fileName: file.name,
          fileSize: file.size
        });
        
        if (error instanceof SyntaxError) {
          alert(`JSON解析エラーが発生しました。\n\nファイル: ${file.name}\nエラータイプ: ${error instanceof Error ? error.constructor.name : 'Unknown'}\nエラー詳細: ${error instanceof Error ? error.message : String(error)}\n\n対処法:\n1. JSONファイルの形式を確認\n2. 文字エンコーディングを確認\n3. ファイルが破損していないか確認`);
        } else {
          alert(`ファイル読み込みエラーが発生しました。\n\nファイル: ${file.name}\nエラータイプ: ${error instanceof Error ? error.constructor.name : 'Unknown'}\nエラー詳細: ${error instanceof Error ? error.message : String(error)}\n\n対処法:\n1. 正しいJSONファイルか確認\n2. ファイルサイズを確認\n3. ブラウザを再読み込み`);
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ ファイル読み込みエラー:', error);
      alert('ファイルの読み込み中にエラーが発生しました。');
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
      sampleRangeKeys: Object.keys(customRanges).slice(0, 5),
      totalHands: Object.values(customRanges).reduce((total, range) => {
        return total + (typeof range === 'object' && range !== null ? Object.keys(range).length : 0);
      }, 0)
    });

    if (!isAdmin || !token) {
      console.log('❌ 管理者権限チェック失敗:', {
        isAdmin,
        hasToken: !!token,
        tokenLength: token?.length || 0,
        adminToken: localStorage.getItem('admin-token')?.length || 0
      });
      alert('❌ 管理者権限が必要です。\n\n管理者としてログインしてください。\n\n現在の状態:\n- 管理者: ' + (isAdmin ? 'はい' : 'いいえ') + '\n- トークン: ' + (token ? 'あり' : 'なし'));
      return;
    }

    if (Object.keys(customRanges).length === 0) {
      alert('❌ 保存するレンジデータがありません。\n\nまず、データをインポートまたはレンジを作成してください。');
      return;
    }

    const confirmation = confirm(
      `システム全体への保存を実行しますか？\n\n` +
      `保存内容:\n` +
      `・レンジ数: ${Object.keys(customRanges).length}個\n` +
      `・総ハンド数: ${Object.values(customRanges).reduce((total, range) => {
        return total + (typeof range === 'object' && range !== null ? Object.keys(range).length : 0);
      }, 0)}個\n\n` +
      `⚠️ この操作により、システム全体のレンジデータが更新され、\n` +
      `すべてのユーザーに影響します。`
    );

    if (!confirmation) {
      console.log('🎯 システム保存をキャンセルしました');
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

      console.log('🎯 システム保存リクエスト詳細:', {
        rangeCount: Object.keys(customRanges).length,
        bodySize: JSON.stringify(requestBody).length,
        authorization: `Bearer ${token.substring(0, 10)}...`
      });

      const response = await fetch('/api/mtt-ranges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🎯 システム保存レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        url: response.url
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🎯 システム保存完了:', {
          savedRangeKeys: Object.keys(customRanges).slice(0, 10),
          savedRangeCount: Object.keys(customRanges).length,
          systemMetadata: result.metadata,
          responseResult: result
        });
        
        // 保存成功後にシステムから再読み込みして確認
        try {
          const verifyResponse = await fetch('/api/mtt-ranges', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            console.log('🔍 保存後確認:', {
              systemRangeCount: verifyData.rangesCount || Object.keys(verifyData.ranges || {}).length,
              lastUpdated: verifyData.lastUpdated
            });
          }
        } catch (verifyError) {
          console.log('保存後確認エラー:', verifyError);
        }
        
        alert(`✅ システム全体に保存完了！\n\n` +
          `保存されたデータ:\n` +
          `・レンジ数: ${result.metadata.totalPositions}個\n` +
          `・ハンド数: ${result.metadata.totalHands}個\n` +
          `・更新日時: ${new Date(result.metadata.timestamp).toLocaleString()}\n\n` +
          `すべてのユーザーがこのデータを利用できます。`);
      } else {
        const errorText = await response.text();
        let errorObj;
        try {
          errorObj = JSON.parse(errorText);
        } catch {
          errorObj = { error: errorText };
        }
        console.error('🎯 システム保存エラーレスポンス:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          errorObj
        });
        throw new Error(errorObj.error || `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ システム保存エラー:', error);
      alert(`❌ システムへの保存に失敗しました\n\nエラー詳細: ${(error as Error).message}\n\n対処法:\n1. 管理者権限を確認\n2. インターネット接続を確認\n3. ブラウザコンソールでエラー詳細を確認`);
    }
  };

  // システム全体からレンジデータを読み込み
  const handleLoadFromSystem = async () => {
    try {
      console.log('🌐 システム読み込み開始（端末間同期）');
      
      const response = await fetch('/api/mtt-ranges');
      
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
          // 現在のタイムスタンプと範囲数をチェック
          const localTimestamp = localStorage.getItem('mtt-ranges-timestamp');
          const currentRangeCount = Object.keys(customRanges).length;
          const systemRangeCount = Object.keys(systemData.ranges).length;
          
          console.log('🎯 同期判定:', {
            local: localTimestamp,
            system: systemData.lastUpdated,
            localRangeCount: currentRangeCount,
            systemRangeCount,
            shouldSync: !localTimestamp || 
                       currentRangeCount === 0 || 
                       systemData.lastUpdated > localTimestamp ||
                       systemRangeCount > currentRangeCount
          });
          
          // 端末間同期判定
          const shouldSync = !localTimestamp || 
                           currentRangeCount === 0 || 
                           systemData.lastUpdated > localTimestamp ||
                           systemRangeCount > currentRangeCount;
          
          if (shouldSync || isAdmin) {
            // 管理者は常に確認、一般ユーザーは自動同期判定
            const confirmMessage = isAdmin ? 
              `管理者が設定したレンジを読み込みますか？\n\n${systemData.metadata?.totalPositions || systemRangeCount}個のレンジが存在します。\n現在のローカルデータと統合されます。` :
              `管理者が設定したレンジを同期しますか？\n\n${systemRangeCount}個のレンジが利用可能です。\n（現在: ${currentRangeCount}個）\n\n管理者レンジを基盤にローカル設定で上書きされます。`;
            
            if (confirm(confirmMessage)) {
              // サーバーレンジを直接適用（ローカル統合は行わない）
              setCustomRanges(systemData.ranges);
              setLastRangeUpdate(Date.now());
              
              console.log('🎯 サーバーGTOレンジ同期完了:', {
                serverRangeCount: systemRangeCount,
                lastUpdated: systemData.lastUpdated,
                isAdmin
              });
              
              // 成功メッセージ
              alert(`✅ 最新のGTOレンジを取得しました\n\n${systemRangeCount}個のレンジ\n最終更新: ${new Date(systemData.lastUpdated).toLocaleString('ja-JP')}\n\n※サーバーベースシステムのため、ローカル保存は行いません`);
              
              // 新しいシナリオを生成
              generateNewScenario();
            }
          } else {
            console.log('📋 管理者レンジとの同期は不要');
            alert('📋 管理者レンジは既に最新です\n\n同期の必要はありません');
          }
        } else {
          console.log('⚠️ システムにレンジデータが存在しません');
          alert('⚠️ システムにレンジデータが存在しません\n\nまず管理者がレンジを設定する必要があります');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'データの読み込みに失敗しました');
      }
    } catch (error) {
      console.error('システム読み込みエラー:', error);
      alert(`❌ システムからの読み込みに失敗しました\n\nエラー: ${(error as Error).message}\n\nネットワーク接続を確認してください`);
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
    // ただし、オールインやリンプの新しいキーについてはフォールバックしない
    let targetPosition = position;
    if (position.endsWith('_15BB') && !position.includes('_allin') && !position.includes('_limp')) {
      const basePosition = position.replace('_15BB', '');
      if (customRanges[basePosition] && !customRanges[position]) {
        targetPosition = basePosition;
        console.log('15BB互換性: 既存レンジキーを使用', { basePosition, targetPosition });
      }
    }
    // vsオープンレンジでの15BB互換性も確認
    // ただし、オールインやリンプの新しいキーについてはフォールバックしない
    else if (position.startsWith('vsopen_') && position.endsWith('_15BB') && !position.includes('_allin') && !position.includes('_limp')) {
      const baseVsOpenKey = position.replace('_15BB', '');
      if (customRanges[baseVsOpenKey] && !customRanges[position]) {
        targetPosition = baseVsOpenKey;
        console.log('15BB互換性: 既存vsオープンレンジキーを使用', { baseVsOpenKey, targetPosition });
      }
    }
    // vsオープンレンジで15BBの既存キー形式の場合、新しいキー形式も確認
    // ただし、オールインやリンプは除外
    else if (position.startsWith('vsopen_') && !position.includes('_15BB') && !position.includes('_allin') && !position.includes('_limp') && stackSize === '15BB') {
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
    // 制限チェック
    if (subscriptionStatus === 'light' && dailyPracticeCount >= 50) {
      setShowDailyLimitModal(true);
      return;
    }
    if (subscriptionStatus === 'free' && dailyPracticeCount >= 10) {
      setShowDailyLimitModal(true);
      return;
    }
    
    setSelectedAction(action);
    
    // アクションの基本部分を抽出して比較（例：'RAISE 2.5' → 'RAISE'）
    const selectedBase = action.split(' ')[0];
    const correctBase = gtoData?.correctAction?.split(' ')[0] || '';
    
    // NONEアクション（レンジ外ハンド）の特別処理
    if (correctBase === 'NONE') {
      console.log('🎯 NONEアクション検出:', {
        selectedAction: action,
        correctAction: correctBase,
        message: 'このハンドはGTO戦略のレンジに含まれていないため、推奨アクションがありません'
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
        
        console.log('🎯 オールイン特別検索:', { 
          action,
          allinKeys,
          frequencies: gtoData.frequencies,
          isCustomRange: (gtoData as any)?.isCustomRange
        });
        
        if (allinKeys.length > 0) {
          foundFrequency = gtoData.frequencies[allinKeys[0]];
          usedVariant = allinKeys[0];
          console.log('🎯 オールイン特別検索成功:', { 
            foundKey: allinKeys[0], 
            frequency: foundFrequency,
            isCustomRange: (gtoData as any)?.isCustomRange
          });
        } else {
          // ALL INキーが見つからない場合、明示的に0%として扱う
          foundFrequency = 0;
          console.log('🎯 オールインキー未発見 - 0%として扱う:', { 
            action,
            availableKeys: Object.keys(gtoData.frequencies)
          });
        }
      }
    }
    
    // 頻度情報がある場合の判定
    if (gtoData?.frequencies) {
      // 頻度が0%の場合は確実に不正解
      if (foundFrequency === 0) {
        correct = false;
        console.log('🎯 頻度0% - 不正解:', {
          selectedAction: action,
          foundFrequency,
          isCorrect: false,
          frequencies: gtoData.frequencies
        });
      } else if (foundFrequency > 0) {
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
    
    // ALL INアクションの特別処理：頻度が0%の場合は確実に不正解
    if (action === 'ALL IN' || action === 'ALL_IN') {
      const allInFrequency = gtoData?.frequencies?.['ALL_IN'] || 
                           gtoData?.frequencies?.['ALL IN'] || 
                           gtoData?.frequencies?.['ALLIN'] || 0;
      if (allInFrequency === 0) {
        correct = false;
        console.log('🚨 ALL IN 0% - 強制的に不正解:', { action, allInFrequency, correct });
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
    console.log('🎯 次のスポットに進む:', {
      currentHand: hand,
      currentHandType: normalizeHandType(hand),
      urlHands: searchParams.get('hands')
    });
    
    // ライトプランの制限チェック
    if (subscriptionStatus === 'light' && dailyPracticeCount >= 49) {
      // 50回目の練習後に制限モーダルを表示
      incrementPracticeCount();
      setShowDailyLimitModal(true);
      return;
    }
    // 無料プランの制限チェック
    if (subscriptionStatus === 'free' && dailyPracticeCount >= 9) {
      // 10回目の練習後に制限モーダルを表示
      incrementPracticeCount();
      setShowDailyLimitModal(true);
      return;
    }
    
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
    // 制限チェック
    if (subscriptionStatus === 'light' && dailyPracticeCount >= 50) {
      setShowDailyLimitModal(true);
      return;
    }
    if (subscriptionStatus === 'free' && dailyPracticeCount >= 10) {
      setShowDailyLimitModal(true);
      return;
    }
    
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
  
  // ローディング判定 - 制限時は即座にUI表示
  if (!spot && !((subscriptionStatus === 'light' && dailyPracticeCount >= 50) || 
                 (subscriptionStatus === 'free' && dailyPracticeCount >= 10))) {
    return <div className="min-h-screen bg-black md:bg-gray-900 text-white flex items-center justify-center">ローディング中...</div>;
  }
  
  return (
    <AuthGuard>
      <div className="relative">
        {/* ヘッダーを条件付きで非表示（モバイル版でトレーニング画面の場合のみ） */}
        {spot && (
          <style jsx global>{`
            @media (max-width: 767px) {
              header {
                display: none !important;
              }
            }
          `}</style>
        )}

      
      {/* 管理者ログアウトボタン（ログイン時のみ表示、PC版のみ） */}

      
      {/* 管理者ログインモーダル */}
      {showAdminLogin && (
        <AdminLogin onClose={() => setShowAdminLogin(false)} />
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
                {spot?.heroPosition || gtoData?.heroPosition || position}
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
                  {currentOpponentPosition ? `vs${currentOpponentPosition}` : 'vsランダム'}
                </span>
              )}
            </div>
            
            <Link 
              href={`/trainer/mtt?${new URLSearchParams({
                stack: stackSize,
                position: positionParam,
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
                          title={`現在のレンジ数: ${Object.keys(customRanges).length}個\n管理者権限: ${isAdmin ? 'あり' : 'なし'}\nトークン: ${token ? 'あり' : 'なし'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          <span className="hidden md:inline">システム保存</span>
                          <span className="md:hidden">保存</span>
                          {Object.keys(customRanges).length > 0 && (
                            <span className="ml-1 bg-white bg-opacity-20 px-1.5 py-0.5 rounded text-[10px]">
                              {Object.keys(customRanges).length}
                            </span>
                          )}
                        </button>

                        {/* ストレージ情報表示ボタン */}
                        <button
                          onClick={async () => {
                            const storageInfo = await storageManager.getStorageInfo();
                            const details = `🗄️ ストレージ使用状況\n\n` +
                              `📱 localStorage:\n` +
                              `・使用量: ${storageInfo.localStorage.totalSizeMB}MB\n` +
                              `・使用率: ${storageInfo.localStorage.usagePercent}%\n` +
                              `・アイテム数: ${storageInfo.localStorage.itemCount}個\n\n` +
                              `🗃️ IndexedDB:\n` +
                              `・使用量: ${storageInfo.indexedDB.sizeEstimateMB}MB\n` +
                              `・利用可能: ${storageInfo.indexedDB.available}MB\n` +
                              `・総容量: ${storageInfo.indexedDB.quotaEstimateMB}MB\n` +
                              `・使用率: ${storageInfo.indexedDB.usagePercent}%\n\n` +
                              `💡 IndexedDBは数GBまで対応可能です！`;
                            alert(details);
                          }}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-all duration-200 flex items-center gap-1"
                          title="ストレージ使用状況を確認"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <span className="hidden md:inline">容量確認</span>
                          <span className="md:hidden">容量</span>
                        </button>
                        
                        {/* サーバーベースGTOレンジ取得ボタン（全ユーザー対応） */}
                        <button
                          onClick={handleLoadFromSystem}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-green-600 hover:bg-green-700 text-white border border-green-500 transition-all duration-200 flex items-center gap-1"
                          title="サーバーから最新のGTOレンジを取得します（完全サーバーベース）"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                          </svg>
                          <span className="hidden md:inline">GTOレンジ取得</span>
                          <span className="md:hidden">取得</span>
                        </button>
                        
                        {/* カスタムレンジ復旧ボタン */}
                        <button
                          onClick={async () => {
                            try {
                              console.log('🔄 カスタムレンジ復旧を開始...');
                              
                              // まず /data/ から読み込み
                              const dataResponse = await fetch('/data/mtt-ranges.json');
                              if (dataResponse.ok) {
                                const dataFileRanges = await dataResponse.json();
                                if (dataFileRanges.ranges && Object.keys(dataFileRanges.ranges).length > 0) {
                                  
                                  // 管理者の場合はサーバーに復旧データを保存
                                  if (isAdmin && localStorage.getItem('admin-token')) {
                                    try {
                                      const saveResponse = await fetch('/api/mtt-ranges', {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                          'Authorization': `Bearer ${localStorage.getItem('admin-token') || ''}`
                                        },
                                        body: JSON.stringify({
                                          ranges: dataFileRanges.ranges,
                                          lastUpdated: new Date().toISOString()
                                        })
                                      });
                                      
                                      if (saveResponse.ok) {
                                        console.log('✅ 復旧データをサーバーに保存完了');
                                      }
                                    } catch (saveError) {
                                      console.warn('⚠️ サーバー保存は失敗しましたが、セッションに復旧:', saveError);
                                    }
                                  }
                                  
                                  // ステートに復旧
                                  setCustomRanges(dataFileRanges.ranges);
                                  setLastRangeUpdate(Date.now());
                                  
                                  alert(`✅ カスタムレンジを復旧しました！\n\n復旧したレンジ数: ${Object.keys(dataFileRanges.ranges).length}個\n${isAdmin ? 'サーバーにも保存済み' : 'セッション内で利用可能'}`);
                                  generateNewScenario();
                                  return;
                                }
                              }
                              
                              alert('❌ 復旧可能なカスタムレンジデータが見つかりませんでした');
                              
                            } catch (error) {
                              console.error('❌ カスタムレンジ復旧エラー:', error);
                              alert('❌ カスタムレンジの復旧に失敗しました');
                            }
                          }}
                          className="px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs font-medium bg-orange-600 hover:bg-orange-700 text-white border border-orange-500 transition-all duration-200 flex items-center gap-1"
                          title="時間をかけて入力したカスタムレンジを復旧します"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="hidden md:inline">レンジ復旧</span>
                          <span className="md:hidden">復旧</span>
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
                                alert(`❌ データファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
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
                    const validOpeners = getValidOpenerPositions(heroPos, stackSize);
                    if (validOpeners.length === 0) return null;
                    
                    return (
                      <div key={heroPos} className="bg-gray-800/50 rounded-lg p-3 border border-gray-600">
                        <div className="text-sm font-semibold text-green-400 mb-2">{heroPos} (ヒーロー)</div>
                        <div className="text-xs text-gray-300 mb-2">
                          {heroPos === 'SB' ? 'BTNからのアクションに対する設定:' 
                           : heroPos === 'BB' ? (stackSize === '15BB' ? 'BTN/SBからのアクションに対する設定:' : 'BTNからのアクションに対する設定:')
                           : 'vs オープンレイザー:'}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {validOpeners.map(opener => {
                            // 15BBの場合は、全てのオープナーでレイズとオールインを分離
                            if (stackSize === '15BB') {
                              // SBの場合は専用のキーを使用して分離
                              const raiseRangeKey = opener === 'SB' && heroPos === 'BB' 
                                ? `vsopen_${heroPos}_vs_${opener}_raise`  // SBレイズ専用キー
                                : `vsopen_${heroPos}_vs_${opener}`;       // その他のオープナー
                              const allinRangeKey = `vsopen_${heroPos}_vs_${opener}_allin`;
                              
                              const hasRaiseRange = customRanges[raiseRangeKey];
                              const hasAllinRange = customRanges[allinRangeKey];
                              
                              // SBの場合はリンプも追加
                              if (opener === 'SB' && heroPos === 'BB') {
                                const limpRangeKey = `vsopen_${heroPos}_vs_${opener}_limp`;
                                const hasLimpRange = customRanges[limpRangeKey];
                                
                                return (
                                  <React.Fragment key={opener}>
                                    {/* SBレイズボタン */}
                                    <button
                                      onClick={() => handleOpenRangeEditor(raiseRangeKey)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                        hasRaiseRange
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                      }`}
                                      title={`${heroPos} vs SBレイズの${stackSize}スタックレンジ設定`}
                                    >
                                      SBレイズ
                                      {hasRaiseRange && ' ✓'}
                                    </button>
                                    
                                    {/* SBオールインボタン */}
                                    <button
                                      onClick={() => handleOpenRangeEditor(allinRangeKey)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                        hasAllinRange
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                      }`}
                                      title={`${heroPos} vs SBオールインの${stackSize}スタックレンジ設定`}
                                    >
                                      SBオールイン
                                      {hasAllinRange && ' ✓'}
                                    </button>
                                    
                                    {/* SBリンプボタン */}
                                    <button
                                      onClick={() => handleOpenRangeEditor(limpRangeKey)}
                                      className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                        hasLimpRange
                                          ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                      }`}
                                      title={`${heroPos} vs SBリンプの${stackSize}スタックレンジ設定`}
                                    >
                                      SBがリンプ→BB（あなた）のアクション
                                      {hasLimpRange && ' ✓'}
                                    </button>
                                  </React.Fragment>
                                );
                              }
                              
                              // その他のオープナー（BTNなど）はレイズとオールインのみ
                              return (
                                <React.Fragment key={opener}>
                                  {/* レイズボタン */}
                                  <button
                                    onClick={() => handleOpenRangeEditor(raiseRangeKey)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                      hasRaiseRange
                                        ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                    }`}
                                    title={`${heroPos} vs ${opener}レイズの${stackSize}スタックレンジ設定`}
                                  >
                                    {opener}レイズ
                                    {hasRaiseRange && ' ✓'}
                                  </button>
                                  
                                  {/* オールインボタン */}
                                  <button
                                    onClick={() => handleOpenRangeEditor(allinRangeKey)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                                      hasAllinRange
                                        ? 'bg-green-600 hover:bg-green-700 text-white border-2 border-green-400'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white border-2 border-transparent'
                                    }`}
                                    title={`${heroPos} vs ${opener}オールインの${stackSize}スタックレンジ設定`}
                                  >
                                    {opener}オールイン
                                    {hasAllinRange && ' ✓'}
                                  </button>
                                </React.Fragment>
                              );
                            }
                            
                            // 15BB以外の通常のオープナーの処理
                            let rangeKey: string;
                            let fallbackRangeKey: string | null = null;
                            
                            rangeKey = `vsopen_${heroPos}_vs_${opener}_${stackSize}`;
                            
                            const hasCustomRange = customRanges[rangeKey] || (fallbackRangeKey && customRanges[fallbackRangeKey]);
                            
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
                                {opener}
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
                    // 15BBのvs3ベットの場合、FOLD/CALLのみに制限
                    if (spot && spot.actionType === 'vs3bet' && spot.stackDepth === '15BB') {
                      return ['FOLD', 'CALL'];
                    }
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
                    (() => {
                      // ベットサイズを計算
                      const betSizes = spot ? calculateBetSize(
                        spot.stackDepth || '15BB',
                        spot.actionType || 'openraise',
                        spot.heroPosition || 'BTN',
                        spot.openRaiserPosition,
                        spot.threeBetterPosition
                      ) : { raiseSize: 0, allinSize: 0 };
                      
                      // 利用可能なアクションボタン数を計算
                      const hasRaise = betSizes.raiseSize > 0 && 
                        (!spot || spot.actionType !== 'vs3bet' || spot.stackDepth !== '15BB') && 
                        (!spot || spot.actionType !== 'vs3bet' || spot.threeBetType !== 'allin') &&
                        (!spot || spot.actionType !== 'vsopen' || spot.stackDepth !== '15BB' || spot.openRaiseSize !== 15.0);
                      
                      // ALL INボタンを強制的に表示
                      const hasAllin = true;
                      
                      // グリッド列数を決定
                      let gridCols = 2; // FOLD, CALL は常にある
                      if (hasRaise) gridCols++;
                      if (hasAllin) gridCols++;
                      
                      return (
                        <div className={`grid gap-2 w-full grid-cols-${gridCols}`}>
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
                          {/* RAISEボタン - ベットサイズ付き */}
                          {hasRaise && (
                            <button
                              className="py-3 rounded-lg font-bold text-lg shadow-lg bg-red-600 hover:bg-red-700 text-white transition-all border border-gray-700"
                              onClick={() => handleActionSelect('RAISE')}
                            >
                              RAISE {betSizes.raiseSize}
                            </button>
                          )}
                          {/* ALL INボタン - スタックサイズ付き */}
                          {(() => {
                            // 複数のキーでALL IN頻度を確認
                            const allInFrequency = gtoData?.frequencies?.['ALL_IN'] || 
                                                 gtoData?.frequencies?.['ALL IN'] || 
                                                 gtoData?.frequencies?.['ALLIN'] || 0;
                            const isAllInCorrect = allInFrequency > 0;
                            
                            // デバッグログを出力
                            console.log('ALL IN Debug:', { 
                              allInFrequency, 
                              isAllInCorrect, 
                              frequencies: gtoData?.frequencies,
                              spot: spot,
                              betSizes: betSizes
                            });
                            
                            return (
                              <button
                                className={`py-3 rounded-lg font-bold text-lg shadow-lg text-white transition-all border border-gray-700 ${
                                  isAllInCorrect
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-red-600 hover:bg-red-700'
                                }`}
                                onClick={() => handleActionSelect('ALL IN')}
                              >
                                ALLIN {betSizes.allinSize}
                              </button>
                            );
                          })()}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex justify-center items-center w-full">
                      <div className="flex gap-4">
                        <button
                          onClick={handleRepeatSpot}
                          className="py-3 px-6 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold text-base flex items-center justify-center shadow-lg transition-all whitespace-nowrap w-[150px]"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>繰り返す</span>
                        </button>
                        <button
                          onClick={handleNextSpot}
                          className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base flex items-center justify-center shadow-lg transition-all whitespace-nowrap w-[150px]"
                        >
                          <span>次のハンド</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
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
                                    <div className="text-yellow-300 font-bold mb-2">⚠️ ハンドレンジ外</div>
                                    <div className="text-gray-300 text-sm">
                                      このハンドはGTO戦略のレンジに含まれていないため、推奨アクションがありません。
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
                                      {displayAction === 'ALL_IN' ? 'ALLIN' : action}
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
              // ただし、オールイン・リンプキーは除外（完全に独立したレンジとして扱う）
              if (parts[1] === '15BB' && !initialRange && customRanges[parts[0]] && 
                  !selectedEditPosition.includes('_allin') && !selectedEditPosition.includes('_limp')) {
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
              // ただし、オールイン・リンプキーは除外（完全に独立したレンジとして扱う）
              if (stackSize === '15BB' && !initialRange && 
                  !selectedEditPosition.includes('_allin') && !selectedEditPosition.includes('_limp')) {
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
              isSaving={isSaving}
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
          position={position}
          stackSize={stackSize}
          actionType={actionType}
          excludeNoneHands={true}
          customRanges={customRanges}
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
        const spotOpponentPosition = currentOpponentPosition || 
          (spot?.openRaiserPosition) || 
          (spot?.threeBetterPosition) || 
          undefined;
        
        return (
          <HandRangeViewer
            rangeData={rangeData}
            title={`現在のスポットのハンドレンジ`}
            onClose={() => setShowHandRangeViewer(false)}
            position={spot?.heroPosition || gtoData?.heroPosition || position}
            stackSize={stackSize}
            actionType={actionType}
            opponentPosition={spotOpponentPosition}
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
        {/* 管理者ログインボタン（マスターアカウントでログイン中の時のみ表示） - PC版 */}
        {!isAdmin && isMasterUser && (
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
        {/* 管理者ログインボタン（マスターアカウントでログイン中の時のみ表示） - モバイル版 */}
        {!isAdmin && isMasterUser && (
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
      
      {/* 1日制限達成モーダル */}
      <DailyLimitModal 
        isOpen={showDailyLimitModal} 
        onClose={() => setShowDailyLimitModal(false)} 
      />
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
'use client';

import React, { useState, useEffect } from 'react';
import { GTOStrategySelector, PreflopScenario } from '@/components/GTOStrategySelector';
import { GTOAnalysis } from '@/components/GTOAnalysis';
import { ResultsView } from '@/components/ResultsView';
import { PokerTable } from '@/components/PokerTable';
import { generateRandomSpot } from '@/lib/spotGenerator';
import { evaluateAction } from '@/lib/gtoEngine';
import { FaPlay, FaCog, FaRedo } from 'react-icons/fa';
import Link from 'next/link';

// コンポーネント間で共有するSpotの型定義
export interface Spot {
  id: string;
  name?: string;
  board: string[];
  pot: number;
  potSize?: number;
  players?: any[];
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
  preflopActions?: string[];
  positions?: Record<string, { 
    active: boolean; 
    stack: number;
    isHero?: boolean;
    actions?: string[];
  }>;
}

export default function TrainerHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3">ポーカーGTO トレーナー</h1>
          <p className="text-gray-300 max-w-2xl mx-auto">最適な意思決定を学び、あなたのポーカースキルを向上させるための実践的なトレーニングプラットフォーム</p>
        </div>
        
        {/* メインカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* プリフロップトレーニング */}
          <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 rounded-2xl overflow-hidden shadow-xl transform transition-all hover:scale-[1.02] border border-blue-700/30">
            <div className="h-56 bg-[url('/images/preflop-training.jpg')] bg-cover bg-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-blue-900 to-transparent flex items-end">
                <div className="p-6">
                  <h2 className="text-3xl font-bold text-white mb-2">プリフロップ トレーニング</h2>
                  <p className="text-blue-100 text-sm">キャッシュゲーム向けGTOトレーニング</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-200 mb-5 leading-relaxed">
                テーブルサイズ、ポジション、スタックサイズを選択して、プリフロップの意思決定を練習しましょう。
                GTOソリューションとあなたの選択を比較し、正確なプレイを身につけましょう。
              </p>
              <Link 
                href="/trainer/preflop" 
                className="inline-flex items-center justify-center w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-bold shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                トレーニングを開始
              </Link>
            </div>
          </div>
          
          {/* MTTトレーニング */}
          <div className="bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 rounded-2xl overflow-hidden shadow-xl transform transition-all hover:scale-[1.02] border border-purple-700/30">
            <div className="h-56 bg-gradient-to-br from-purple-700 to-indigo-800 bg-center relative">
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900 to-transparent flex items-end">
                <div className="p-6">
                  <h2 className="text-3xl font-bold text-white mb-2">MTT トレーニング</h2>
                  <p className="text-purple-100 text-sm">トーナメントプレイヤー向け特別トレーニング</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-200 mb-5 leading-relaxed">
                トーナメント特有のICM考慮を含む意思決定を練習します。
                バブル、ファイナルテーブル、異なるスタックサイズでの最適なプレイを学びましょう。
              </p>
              <Link 
                href="/trainer/mtt" 
                className="inline-flex items-center justify-center w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white font-bold shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                トレーニングを開始
              </Link>
            </div>
          </div>
        </div>
        
        {/* GTO学習リソース */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-8 shadow-xl border border-gray-700">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4 text-white">GTOポーカーとは？</h2>
              <p className="text-gray-300 mb-4 leading-relaxed">
                ゲーム理論最適戦略（GTO）は、相手のプレイに関係なく、長期的に最も高いEV（期待値）をもたらす戦略です。
                GTOを学ぶことで、エクスプロイト（搾取）されにくい堅実なプレイスタイルを身につけることができます。
              </p>
            </div>
            
            <div className="flex-1">
              <h3 className="text-xl font-medium mb-3 text-white">このトレーナーの特徴</h3>
              <ul className="list-disc pl-5 text-gray-300 space-y-2">
                <li>実際のGTOソルバーの結果に基づいたトレーニング</li>
                <li>プリフロップとポストフロップの両方をカバー</li>
                <li>EV（期待値）とアクション頻度の詳細な分析</li>
                <li>様々なテーブルサイズとスタックサイズをサポート</li>
                <li>モバイルフレンドリーなデザイン</li>
              </ul>
            </div>
          </div>
          
          {/* 管理者向けリンク */}
          <div className="mt-8 pt-4 border-t border-gray-700 flex justify-end">
            <Link 
              href="/admin/gto-data" 
              className="text-sm text-blue-400 hover:text-blue-300 flex items-center bg-gray-800/50 px-4 py-2 rounded-lg transition-all hover:bg-gray-700/50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              GTOデータ管理（管理者向け）
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// availableActionsを取得する関数
const getAvailableActions = (spot: Spot, scenario: PreflopScenario) => {
  // スポットにアクションリストがある場合はそれを使用
  if (spot?.possibleActions && spot.possibleActions.length > 0) {
    return spot.possibleActions;
  }
  
  const actions = [];
  
  // シナリオに基づいてアクションを設定
  switch(scenario) {
    case 'オープン':
      actions.push('FOLD');
      actions.push('RAISE'); // オープンレイズ
      break;
    case 'vs オープン':
      actions.push('FOLD');
      actions.push('CALL');
      actions.push('RAISE'); // 3bet
      break;
    case 'vs 3bet':
      actions.push('FOLD');
      actions.push('CALL');
      actions.push('RAISE'); // 4bet
      break;
    case 'vs 4bet':
      actions.push('FOLD');
      actions.push('CALL');
      actions.push('RAISE'); // 5bet
      break;
    case 'vs 5bet':
      actions.push('FOLD');
      actions.push('CALL');
      // オールインが暗黙的に存在
      break;
    case 'ランダム':
    default:
      // 基本的なアクションをすべて含める
      actions.push('FOLD');
      actions.push('CALL');
      actions.push('RAISE');
      
      // BBでリンプが来た場合はチェックも可能
      const heroPosition = spot?.heroPosition || '';
      if (heroPosition === 'BB' && (!spot.preflopActions || spot.preflopActions.length === 0 || 
          (spot.preflopActions.length === 1 && spot.preflopActions[0] === 'CALL 1'))) {
        actions.push('CHECK');
      }
      break;
  }
  
  return actions;
};

// ヒローハンドを適切にフォーマットする関数
const formatHeroHand = (heroHand: string | string[] | undefined): string[] => {
  if (!heroHand) {
    return ['?', '?']; // デフォルト値
  }
  
  if (Array.isArray(heroHand)) {
    return heroHand; // すでに配列の場合はそのまま返す
  } else if (typeof heroHand === 'string') {
    // 文字列の場合はカード表記に分解 (例: "AsKh" -> ["As", "Kh"])
    if (heroHand.length === 4) {
      return [heroHand.slice(0, 2), heroHand.slice(2, 4)];
    }
    // その他の形式は単一要素の配列として返す
    return [heroHand];
  }
  
  return ['?', '?']; // フォールバック
}; 
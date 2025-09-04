'use client';

import React, { useState } from 'react';
import { FaChartBar, FaEye, FaCalculator, FaLightbulb, FaTrophy, FaExclamationTriangle } from 'react-icons/fa';

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

export const GTOAnalysis: React.FC<GTOAnalysisProps> = ({ 
  spot, 
  evData, 
  selectedAction, 
  correctAction, 
  evLoss, 
  explanation 
}) => {
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ev' | 'frequency' | 'tips'>('overview');

  // EVデータの取得（spotまたはpropsから）
  const evValues = evData || spot?.evData || spot?.evs || {};
  
  // アクションの色分け
  const getActionColor = (action: string) => {
    if (action === correctAction) return 'text-green-400';
    if (action === selectedAction && action !== correctAction) return 'text-red-400';
    return 'text-gray-300';
  };

  // アクションの背景色
  const getActionBgColor = (action: string) => {
    if (action === correctAction) return 'bg-green-900/30 border-green-500/30';
    if (action === selectedAction && action !== correctAction) return 'bg-red-900/30 border-red-500/30';
    return 'bg-gray-800/50 border-gray-600/30';
  };

  // EV差の計算
  const getEvDifference = (action: string) => {
    const actionEv = evValues[action] || 0;
    const optimalEv = evValues[correctAction] || 0;
    return actionEv - optimalEv;
  };

  // EV差の表示
  const formatEvDifference = (diff: number) => {
    if (diff === 0) return '±0.00';
    return diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`;
  };

  // アクションの説明を生成
  const getActionExplanation = () => {
    if (!spot) return explanation || 'GTO戦略に基づいた分析結果です。';
    
    const position = spot.heroPosition || 'Unknown';
    const hand = Array.isArray(spot.heroHand) ? spot.heroHand.join(',') : spot.heroHand || 'Unknown';
    const street = spot.street || spot.currentStreet || 'preflop';
    
    let baseExplanation = `${position}ポジションで${hand}をホールドしている状況`;
    
    if (street === 'preflop') {
      baseExplanation += 'のプリフロップ';
    } else {
      baseExplanation += `の${street}`;
    }
    
    if (selectedAction === correctAction) {
      return `${baseExplanation}では、${correctAction}が最適なアクションです。このプレイにより長期的に最大のEVを獲得できます。`;
    } else {
      const evDiff = getEvDifference(selectedAction);
      return `${baseExplanation}では、${correctAction}が最適です。選択した${selectedAction}は${formatEvDifference(evDiff)}のEV損失となります。`;
    }
  };

  // 難易度に応じたアドバイス
  const getDifficultyAdvice = () => {
    const difficulty = spot?.difficulty || 'medium';
    
    switch (difficulty) {
      case 'easy':
      case 'beginner':
        return '基本的なGTO戦略を覚えましょう。このような状況では一貫したプレイが重要です。';
      case 'medium':
      case 'intermediate':
        return '中級レベルの判断が必要です。ポジションとハンド強度を総合的に考慮しましょう。';
      case 'hard':
      case 'advanced':
        return '高度な戦略的判断が求められます。相手のレンジとボードテクスチャを詳細に分析しましょう。';
      default:
        return 'GTOの基本原理に従ってプレイしましょう。';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 shadow-lg border border-gray-700">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaChartBar className="text-blue-400 text-xl" />
          <h3 className="text-xl font-bold text-white">GTO分析結果</h3>
        </div>
        <button
          onClick={() => setShowDetailedAnalysis(!showDetailedAnalysis)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
        >
          {showDetailedAnalysis ? '簡易表示' : '詳細分析'}
        </button>
      </div>

      {/* 結果サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 選択アクション */}
        <div className={`p-4 rounded-lg border ${getActionBgColor(selectedAction)}`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-3 h-3 rounded-full ${selectedAction === correctAction ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-400">あなたの選択</span>
          </div>
          <div className={`text-lg font-bold ${getActionColor(selectedAction)}`}>
            {selectedAction}
          </div>
        </div>

        {/* 最適アクション */}
        <div className={`p-4 rounded-lg border ${getActionBgColor(correctAction)}`}>
          <div className="flex items-center gap-2 mb-2">
            <FaTrophy className="text-yellow-400" />
            <span className="text-sm text-gray-400">最適解</span>
          </div>
          <div className="text-lg font-bold text-green-400">
            {correctAction}
          </div>
        </div>

        {/* EV損失 */}
        <div className="p-4 rounded-lg border bg-gray-800/50 border-gray-600/30">
          <div className="flex items-center gap-2 mb-2">
            <FaCalculator className="text-purple-400" />
            <span className="text-sm text-gray-400">EV損失</span>
          </div>
          <div className={`text-lg font-bold ${evLoss === 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatEvDifference(-evLoss)}
          </div>
        </div>
      </div>

      {/* 詳細分析 */}
      {showDetailedAnalysis && (
        <div className="space-y-6">
          {/* タブナビゲーション */}
          <div className="flex flex-wrap gap-2 border-b border-gray-700">
            {[
              { id: 'overview', label: '概要', icon: FaEye },
              { id: 'ev', label: 'EV分析', icon: FaChartBar },
              { id: 'frequency', label: '頻度', icon: FaCalculator },
              { id: 'tips', label: 'アドバイス', icon: FaLightbulb }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <tab.icon className="text-sm" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div className="min-h-[200px]">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-white mb-3">状況説明</h4>
                  <p className="text-gray-300 leading-relaxed">
                    {getActionExplanation()}
                  </p>
                </div>
                
                {spot && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-1">ポジション</div>
                      <div className="text-white font-medium">{spot.heroPosition || 'Unknown'}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-1">ハンド</div>
                      <div className="text-white font-medium">
                        {Array.isArray(spot.heroHand) ? spot.heroHand.join(',') : spot.heroHand || 'Unknown'}
                      </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-1">ストリート</div>
                      <div className="text-white font-medium">{spot.street || spot.currentStreet || 'preflop'}</div>
                    </div>
                    <div className="bg-gray-800 rounded-lg p-3">
                      <div className="text-sm text-gray-400 mb-1">難易度</div>
                      <div className="text-white font-medium">{spot.difficulty || 'medium'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ev' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">期待値分析</h4>
                <div className="space-y-3">
                  {Object.entries(evValues).map(([action, ev]) => (
                    <div key={action} className={`flex items-center justify-between p-3 rounded-lg border ${getActionBgColor(action)}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          action === correctAction ? 'bg-green-400' : 
                          action === selectedAction ? 'bg-red-400' : 'bg-gray-500'
                        }`} />
                        <span className={`font-medium ${getActionColor(action)}`}>{action}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-mono">{(ev as number).toFixed(2)}</div>
                        <div className={`text-sm ${getEvDifference(action) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatEvDifference(getEvDifference(action))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'frequency' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">アクション頻度分析</h4>
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-300 mb-4">
                    GTOでは各アクションを一定の頻度でプレイします。完全にバランスを取ることで相手に情報を与えません。
                  </p>
                  <div className="space-y-3">
                    {Object.entries(evValues).map(([action, ev]) => {
                      const isOptimal = action === correctAction;
                      const frequency = isOptimal ? '85%' : Math.max(0, 100 - Object.keys(evValues).length * 20) + '%';
                      return (
                        <div key={action} className="flex items-center justify-between">
                          <span className={getActionColor(action)}>{action}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-24 bg-gray-700 rounded-full h-2">
                              <div 
                                className={`h-full rounded-full ${isOptimal ? 'bg-green-400' : 'bg-gray-500'}`}
                                style={{ width: frequency }}
                              />
                            </div>
                            <span className="text-sm text-gray-400 w-12">{frequency}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tips' && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">学習アドバイス</h4>
                
                <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaLightbulb className="text-yellow-400 text-lg mt-1" />
                    <div>
                      <h5 className="text-white font-medium mb-2">改善ポイント</h5>
                      <p className="text-gray-300">{getDifficultyAdvice()}</p>
                    </div>
                  </div>
                </div>

                {selectedAction !== correctAction && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <FaExclamationTriangle className="text-red-400 text-lg mt-1" />
                      <div>
                        <h5 className="text-white font-medium mb-2">よくある間違い</h5>
                        <p className="text-gray-300">
                          {selectedAction}を選択する理由として、直感的判断や感情的な要因が影響している可能性があります。
                          GTOでは数学的根拠に基づいた判断が重要です。
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <FaTrophy className="text-green-400 text-lg mt-1" />
                    <div>
                      <h5 className="text-white font-medium mb-2">次のステップ</h5>
                      <ul className="text-gray-300 space-y-1 list-disc list-inside">
                        <li>類似のシチュエーションでの練習を繰り返す</li>
                        <li>他のポジションでの同じハンドの戦略を学習</li>
                        <li>相手のレンジ構築についても理解を深める</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GTOAnalysis;

'use client';

import React from 'react';
import { HandInfo } from './HandRange';

interface HandRangeViewerProps {
  rangeData: Record<string, HandInfo>;
  title: string;
  onClose: () => void;
  position?: string;
  stackSize?: string;
}

const HandRangeViewer: React.FC<HandRangeViewerProps> = ({ 
  rangeData, 
  title, 
  onClose, 
  position, 
  stackSize 
}) => {
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

  // アクション別の色を取得
  const getActionColorHex = (action: string) => {
    switch (action) {
      case 'MIN': return '#3b82f6';
      case 'ALL_IN': return '#ef4444';
      case 'CALL': return '#eab308';
      default: return '#6b7280';
    }
  };

  // 頻度に応じた動的スタイルを取得（既存のHandRangeと同じロジック）
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

  // アクション別の統計を計算
  const calculateStats = () => {
    const stats = {
      MIN: { count: 0, percentage: 0 },
      ALL_IN: { count: 0, percentage: 0 },
      CALL: { count: 0, percentage: 0 },
      FOLD: { count: 0, percentage: 0 },
      NONE: { count: 0, percentage: 0 }
    };

    const totalHands = Object.keys(rangeData).length;
    
    Object.values(rangeData).forEach(handInfo => {
      if (handInfo.action === 'MIXED' && handInfo.mixedFrequencies) {
        const freq = handInfo.mixedFrequencies;
        const maxFreq = Math.max(freq.MIN || 0, freq.ALL_IN || 0, freq.CALL || 0, freq.FOLD || 0);
        
        if (maxFreq === (freq.MIN || 0)) {
          stats.MIN.count += 1;
        } else if (maxFreq === (freq.ALL_IN || 0)) {
          stats.ALL_IN.count += 1;
        } else if (maxFreq === (freq.CALL || 0)) {
          stats.CALL.count += 1;
        } else {
          stats.FOLD.count += 1;
        }
      } else {
        switch (handInfo.action) {
          case 'MIN':
          case 'RAISE':
          case '3BB':
            stats.MIN.count += 1;
            break;
          case 'ALL_IN':
            stats.ALL_IN.count += 1;
            break;
          case 'CALL':
            stats.CALL.count += 1;
            break;
          case 'FOLD':
            stats.FOLD.count += 1;
            break;
          case 'NONE':
            stats.NONE.count += 1;
            break;
        }
      }
    });

    // パーセンテージを計算
    Object.keys(stats).forEach(key => {
      stats[key as keyof typeof stats].percentage = totalHands > 0 ? 
        Math.round((stats[key as keyof typeof stats].count / totalHands) * 1000) / 10 : 0;
    });

    return stats;
  };

  const stats = calculateStats();

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

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-gray-900 rounded-3xl max-w-7xl w-full max-h-[98vh] overflow-hidden shadow-2xl border border-gray-800">
        {/* ヘッダー */}
        <div className="bg-gray-800 p-4 md:p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-7 md:w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-white">{title}</h2>
                {position && stackSize && (
                  <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                    <span className="bg-blue-600/20 px-2 md:px-3 py-1 rounded-full border border-blue-500/30 text-blue-300 text-xs md:text-sm font-medium">
                      {position}
                    </span>
                    <span className="bg-green-600/20 px-2 md:px-3 py-1 rounded-full border border-green-500/30 text-green-300 text-xs md:text-sm font-medium">
                      {stackSize}
                    </span>
                    <span className="text-gray-400 text-xs md:text-sm">
                      総ハンド数: <span className="text-white font-semibold">{Object.keys(rangeData).length}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 md:w-12 md:h-12 bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white rounded-xl flex items-center justify-center transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 統計バー */}
        <div className="p-4 md:p-6 bg-gray-800 border-b border-gray-700">
          <h3 className="text-white font-bold mb-3 md:mb-4 text-base md:text-lg">統計(頻度考慮):</h3>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            <div className="bg-blue-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium">
              MIN: {stats.MIN.count}ハンド ({stats.MIN.percentage}%)
            </div>
            <div className="bg-red-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium">
              ALL IN: {stats.ALL_IN.count}ハンド ({stats.ALL_IN.percentage}%)
            </div>
            <div className="bg-yellow-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium">
              CALL: {stats.CALL.count}ハンド ({stats.CALL.percentage}%)
            </div>
            <div className="bg-gray-600 text-white px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium">
              FOLD: {stats.FOLD.count}ハンド ({stats.FOLD.percentage}%)
            </div>
            <div className="bg-gray-700 text-gray-300 px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs md:text-sm font-medium">
              NONE: {stats.NONE.count}ハンド ({stats.NONE.percentage}%)
            </div>
          </div>
        </div>

        {/* ハンドグリッド - 既存のHandRangeの正確なデザインを使用 */}
        <div className="p-4 md:p-6 overflow-auto max-h-[60vh] md:max-h-[65vh] bg-gradient-to-br from-gray-900 to-gray-800">
          <div className="grid grid-cols-13 gap-0.5 md:gap-1 max-w-4xl md:max-w-5xl mx-auto">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                                 <div
                   key={`${rowIndex}-${colIndex}`}
                   className="text-white text-[10px] md:text-xs font-bold py-0.5 md:py-1 px-1 text-center rounded transition-all duration-200 hover:shadow-md min-h-[1.5rem] md:min-h-[2rem] flex items-center justify-center"
                   style={getHandStyle(cell.hand)}
                 >
                   {cell.hand}
                 </div>
              ))
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 md:p-6 bg-gray-800 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-gray-300 flex-wrap">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-blue-600 rounded-full"></div>
                <span>MIN/RAISE</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-red-600 rounded-full"></div>
                <span>ALL IN</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-yellow-600 rounded-full"></div>
                <span>CALL</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <div className="w-2 h-2 md:w-3 md:h-3 bg-gray-600 rounded-full"></div>
                <span>FOLD</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 md:px-6 py-2 md:py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 text-sm md:text-base"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandRangeViewer; 
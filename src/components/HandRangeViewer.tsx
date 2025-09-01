'use client';

import React from 'react';
import { HandInfo } from './HandRange';

interface HandRangeViewerProps {
  rangeData: Record<string, HandInfo>;
  title: string;
  onClose: () => void;
  position?: string;
  stackSize?: string;
  opponentPosition?: string;
  actionType?: string;
}

const HandRangeViewer: React.FC<HandRangeViewerProps> = ({ 
  rangeData, 
  title, 
  onClose, 
  position, 
  stackSize,
  opponentPosition,
  actionType
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
      case 'MIN': return '#F44336'; // レイズ: 赤（MINはRAISEに統合）
      case 'RAISE': return '#F44336'; // レイズ: 赤色
      case 'ALL_IN': return '#7f1d1d'; // オールイン: 濃い赤（ボルドー系のダークレッド）
      case 'CALL': return '#4CAF50'; // コール: 緑
      case 'FOLD': return '#4A90E2'; // フォールド: 青
      default: return '#6b7280';
    }
  };

  // 頻度に応じた動的スタイルを取得（カスタマイズレンジと同じ比率での視覚化）
  const getHandStyle = (hand: string) => {
    const frequencies = getHandFrequencies(hand);
    const actions = [
      { key: 'ALL_IN', color: getActionColorHex('ALL_IN'), value: frequencies.ALL_IN },
      { key: 'MIN', color: getActionColorHex('MIN'), value: frequencies.MIN },
      { key: 'RAISE', color: getActionColorHex('RAISE'), value: frequencies.MIN }, // MINをRAISEとして扱う
      { key: 'CALL', color: getActionColorHex('CALL'), value: frequencies.CALL },
      { key: 'FOLD', color: getActionColorHex('FOLD'), value: frequencies.FOLD }
    ];
    const nonZeroActions = actions.filter(a => a.value > 0);
    const totalNonFold = frequencies.MIN + frequencies.ALL_IN + frequencies.CALL;

    // フォールド100%
    if (totalNonFold === 0) {
      return { 
        background: '#4A90E2 !important',
        backgroundColor: '#4A90E2 !important',
        border: '1px solid rgb(75, 85, 99) !important'
      }; // 青色（FOLD色）- !importantで優先
    }
    // 単一アクション100%
    if (nonZeroActions.length === 1 && nonZeroActions[0].value === 100) {
      if (nonZeroActions[0].key === 'FOLD') {
        return { 
          background: '#4A90E2 !important',
          backgroundColor: '#4A90E2 !important',
          border: '1px solid rgb(75, 85, 99) !important'
        };
      }
      return { background: nonZeroActions[0].color };
    }
    // 混合戦略（2つ以上のアクションが0%超）- カスタマイズレンジと同じ比率での視覚化
    if (nonZeroActions.length >= 2) {
      let gradientStops = [];
      let currentPosition = 0;
      
      // アクションごとの色セグメントを作成（オールイン→レイズ→コール→フォールドの順）
      if (frequencies.ALL_IN > 0) {
        const allInColor = getActionColorHex('ALL_IN');
        gradientStops.push(`${allInColor} ${currentPosition}% ${currentPosition + frequencies.ALL_IN}%`);
        currentPosition += frequencies.ALL_IN;
      }
      
      if (frequencies.MIN > 0) {
        const minColor = getActionColorHex('MIN');
        gradientStops.push(`${minColor} ${currentPosition}% ${currentPosition + frequencies.MIN}%`);
        currentPosition += frequencies.MIN;
      }
      
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
      
      // FOLD部分（薄いグレーで表示）- カスタマイズレンジと同じ視覚化
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
    // それ以外（念のため）
    return {
      background: '#4A90E2 !important', // 青色（FOLD色）
      backgroundColor: '#4A90E2 !important',
      border: '1px solid rgb(75, 85, 99) !important'
    };
  };

  // アクション別の統計を計算（頻度考慮）
  const calculateStats = () => {
    const stats = {
      MIN: { count: 0, percentage: 0 },
      ALL_IN: { count: 0, percentage: 0 },
      CALL: { count: 0, percentage: 0 },
      FOLD: { count: 0, percentage: 0 },
      NONE: { count: 0, percentage: 0 }
    };

    let totalWeightedPercentage = 0;
    
    // 全169ハンドを対象とする（HandRangeと統一）
    const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
    for (let i = 0; i < 13; i++) {
      for (let j = 0; j < 13; j++) {
        let hand = '';
        if (i === j) {
          hand = ranks[i] + ranks[j];
        } else if (i < j) {
          hand = ranks[i] + ranks[j] + 's';
        } else {
          hand = ranks[j] + ranks[i] + 'o';
        }
        
        const handInfo = rangeData[hand];
        
        if (handInfo?.action === 'MIXED' && handInfo.mixedFrequencies) {
          // 混合戦略の場合、各アクションの頻度をパーセンテージとして加算
          const freq = handInfo.mixedFrequencies;
          stats.MIN.percentage += (freq.MIN || 0);
          stats.ALL_IN.percentage += (freq.ALL_IN || 0);
          stats.CALL.percentage += (freq.CALL || 0);
          stats.FOLD.percentage += (freq.FOLD || 0);
          totalWeightedPercentage += 100; // 各ハンドは100%としてカウント
        } else if (handInfo) {
          // 単一アクションの場合
          const frequency = handInfo.frequency || 100;
          
          switch (handInfo.action) {
            case 'MIN':
            case 'RAISE':
            case '3BB':
              stats.MIN.count += 1;
              stats.MIN.percentage += frequency;
              break;
            case 'ALL_IN':
              stats.ALL_IN.count += 1;
              stats.ALL_IN.percentage += frequency;
              break;
            case 'CALL':
              stats.CALL.count += 1;
              stats.CALL.percentage += frequency;
              break;
            case 'FOLD':
              stats.FOLD.count += 1;
              stats.FOLD.percentage += frequency;
              break;
            case 'NONE':
              stats.NONE.count += 1;
              stats.NONE.percentage += frequency;
              break;
          }
          totalWeightedPercentage += 100;
        } else {
          // 設定されていないハンドはFOLDとして扱う（HandRangeと統一）
          stats.FOLD.count += 1;
          stats.FOLD.percentage += 100;
          totalWeightedPercentage += 100;
        }
      }
    }

    // パーセンテージを正規化
    Object.keys(stats).forEach(key => {
      stats[key as keyof typeof stats].percentage = totalWeightedPercentage > 0 ? 
        Math.round((stats[key as keyof typeof stats].percentage / totalWeightedPercentage) * 1000) / 10 : 0;
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
      <div className="bg-gray-900 rounded-3xl max-w-[95vw] md:max-w-[80vw] w-full h-[98vh] overflow-hidden shadow-2xl border border-gray-800 flex flex-col">
        {/* ヘッダー */}
        <div className="bg-gray-800 p-3 md:p-4 border-b border-gray-700 flex-shrink-0">
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
                    {actionType && actionType !== 'open' && actionType !== 'openraise' && (
                      <span className="bg-purple-600/20 px-2 md:px-3 py-1 rounded-full border border-purple-500/30 text-purple-300 text-xs md:text-sm font-medium">
                        {actionType === 'vsopen' ? 'vsオープン' : 
                         actionType === 'vs3bet' ? 'vs3ベット' : 
                         actionType === 'vs4bet' ? 'vs4ベット' : 'vsオープン'}
                      </span>
                    )}
                    {opponentPosition && (
                      <span className="bg-orange-600/20 px-2 md:px-3 py-1 rounded-full border border-orange-500/30 text-orange-300 text-xs md:text-sm font-medium">
                        vs {opponentPosition}
                      </span>
                    )}
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
        <div className="p-2 md:p-3 bg-gray-800 border-b border-gray-700 flex-shrink-0">
          <div className="flex gap-1 md:gap-2 flex-wrap text-xs">
            <div className="bg-red-500 text-white px-2 py-1 rounded font-medium">
              RAISE: {stats.MIN.percentage}%
            </div>
            <div className="bg-green-500 text-white px-2 py-1 rounded font-medium">
              CALL: {stats.CALL.percentage}%
            </div>
            <div className="bg-red-900 text-white px-2 py-1 rounded font-medium">
              ALL IN: {stats.ALL_IN.percentage}%
            </div>
            <div className="bg-blue-500 text-white px-2 py-1 rounded font-medium">
              FOLD: {stats.FOLD.percentage}%
            </div>
            <div className="bg-gray-700 text-gray-300 px-2 py-1 rounded font-medium">
              NONE: {stats.NONE.percentage}%
            </div>
          </div>
        </div>

        {/* ハンドグリッド - 既存のHandRangeの正確なデザインを使用 */}
        <div className="p-2 md:p-4 flex-1 overflow-auto bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="grid grid-cols-13 gap-0.5 md:gap-1 max-w-4xl md:max-w-none mx-auto w-full">
            {grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                                                 <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`text-white text-[10px] md:text-sm font-bold py-0.5 md:py-1 px-1 md:px-1.5 text-center rounded transition-all duration-200 hover:shadow-md min-h-[1.5rem] md:min-h-[2rem] flex flex-col items-center justify-center hand-range-viewer-cell relative ${
                    (() => {
                      const handInfo = rangeData[cell.hand];
                      if (handInfo?.action === 'MIXED' && handInfo.mixedFrequencies) {
                        const freq = handInfo.mixedFrequencies;
                        const activeActions = Object.values(freq).filter(f => (f || 0) > 0);
                        return activeActions.length > 1 ? 'ring-1 ring-purple-400 ring-opacity-60' : '';
                      }
                      return '';
                    })()
                  }`}
                  style={getHandStyle(cell.hand)}
                  data-has-range={!!rangeData[cell.hand]}
                >
                  {/* ハンド名 */}
                  <div className="text-[8px] md:text-xs font-bold leading-none">
                    {cell.hand}
                  </div>
                  
                  {/* 混合戦略の比率表示 */}
                  {(() => {
                    const handInfo = rangeData[cell.hand];
                    if (handInfo?.action === 'MIXED' && handInfo.mixedFrequencies) {
                      const freq = handInfo.mixedFrequencies;
                      const ratios = [];
                      
                      if ((freq.ALL_IN || 0) > 0) ratios.push(`A${freq.ALL_IN || 0}%`);
                      if ((freq.MIN || 0) > 0) ratios.push(`R${freq.MIN || 0}%`);
                      if ((freq.CALL || 0) > 0) ratios.push(`C${freq.CALL || 0}%`);
                      if ((freq.FOLD || 0) > 0) ratios.push(`F${freq.FOLD || 0}%`);
                      
                      return (
                        <div className="text-[7px] leading-none mt-0.5">
                          {ratios.join('')}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))
            )}
          </div>
        </div>


      </div>
    </div>
  );
};

export default HandRangeViewer; 
'use client';

import React from 'react';

// 画像を参考にスートの色とマークを設定
const suits = {
  s: { color: "text-white", bgColor: "bg-gray-600", border: "border-gray-700", symbol: "♠" },     // スペード：薄いグレー背景に白文字
  h: { color: "text-white", bgColor: "bg-red-600", border: "border-red-700", symbol: "♥" },    // ハート：赤背景に白文字
  c: { color: "text-white", bgColor: "bg-green-600", border: "border-green-700", symbol: "♣" }, // クラブ：緑背景に白文字
  d: { color: "text-white", bgColor: "bg-blue-600", border: "border-blue-700", symbol: "♦" }    // ダイヤ：青背景に白文字
};

// カードの値
const ranks = {
  A: "A", K: "K", Q: "Q", J: "J", T: "10",
  9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2"
};

interface PokerCardProps {
  card: string;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
}

export const PokerCard: React.FC<PokerCardProps> = ({ 
  card, 
  size = 'md',
  highlight = false
}) => {
  // カードが無効な場合は？を表示する代わりに、適切なフォールバックを提供
  if (!card || card.length < 2 || card === '??') {
    // フォールバックとしてデフォルトカードを表示（例：As）
    card = 'As';
  }

  const rank = card[0].toUpperCase();
  const suit = card[1].toLowerCase();
  
  const suitInfo = suits[suit as keyof typeof suits] || { color: "text-white", bgColor: "bg-gray-500", border: "border-gray-600", symbol: "?" };
  const rankDisplay = ranks[rank as keyof typeof ranks] || rank;
  
  // サイズに基づくスタイル - サイズ調整と視認性の向上
  const cardSizes = {
    sm: { 
      width: "w-[35px]", 
      height: "h-[46px]", 
      fontSize: "text-2xl",
      symbolSize: "text-5xl",
      padding: "p-1"
    },
    md: { 
      width: "w-[46px]", 
      height: "h-[64px]", 
      fontSize: "text-3xl",
      symbolSize: "text-6xl",
      padding: "p-1.5"
    },
    lg: { 
      width: "w-[70px]", 
      height: "h-[96px]", 
      fontSize: "text-5xl",
      symbolSize: "text-8xl",
      padding: "p-2"
    }
  };
  
  const sizeStyle = cardSizes[size];
  
  return (
    <div
      className={`
        ${sizeStyle.width}
        ${sizeStyle.height}
        ${suitInfo.bgColor}
        rounded-md
        ${highlight ? 'border-yellow-400 border-2' : `border ${suitInfo.border} border-2`}
        ${highlight ? 'shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'shadow-md'}
        flex
        items-center
        justify-center
        ${sizeStyle.padding}
        m-0
        relative
        overflow-hidden
      `}
    >
      {/* 背景にマークを右側に半分見えるように表示 */}
      <div className="absolute inset-0 flex items-center justify-end opacity-20 z-0">
        <span className={`${suitInfo.color} ${sizeStyle.symbolSize} transform translate-x-1/2`}>
          {suitInfo.symbol}
        </span>
      </div>
      
      {/* ランク表示 - 中央に大きく表示 */}
      <span className={`${suitInfo.color} ${sizeStyle.fontSize} font-bold z-10`}>
        {rankDisplay}
      </span>
    </div>
  );
};

interface PokerCardListProps {
  cards: string[];
  size?: 'sm' | 'md' | 'lg';
  highlightedCards?: string[];
}

export const PokerCardList: React.FC<PokerCardListProps> = ({ 
  cards, 
  size = 'md',
  highlightedCards = [] 
}) => {
  // 常に2枚のカードを表示する
  let displayCards = [...cards];
  
  // カードがない場合はデフォルトの2枚のカードを表示
  if (displayCards.length === 0) {
    displayCards = ['As', 'Kd'];
  }
  // カードが1枚だけの場合は2枚目を追加
  else if (displayCards.length === 1) {
    displayCards.push('Kd');
  }
  
  // 最大2枚に制限
  displayCards = displayCards.slice(0, 2);
  
  return (
    <div className="flex items-center gap-0 space-x-0.5">
      {displayCards.map((card, index) => (
        <PokerCard 
          key={index} 
          card={card} 
          size={size} 
          highlight={highlightedCards.includes(card)} 
        />
      ))}
    </div>
  );
};

export default PokerCard; 
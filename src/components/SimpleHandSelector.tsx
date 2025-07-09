'use client';

import React, { useState } from 'react';

interface SimpleHandSelectorProps {
  onSelectHands: (selectedHands: string[]) => void;
  initialSelectedHands?: string[];
  title?: string;
  onClose: () => void;
}

export const SimpleHandSelector: React.FC<SimpleHandSelectorProps> = ({
  onSelectHands,
  initialSelectedHands = [],
  title = "ハンドを選択",
  onClose
}) => {
  const [selectedHands, setSelectedHands] = useState<string[]>(initialSelectedHands);

  // プリセットハンド
  const presets = {
    premium: ['AA', 'KK', 'QQ', 'JJ', 'TT'],
    aces: ['AKs', 'AQs', 'AJs', 'ATs', 'AKo', 'AQo'],
    broadway: ['KQs', 'KJs', 'KTs', 'QJs', 'QTs', 'JTs']
  };

  const handlePresetSelect = (hands: string[]) => {
    setSelectedHands(prev => {
      const newSelected = [...prev];
      hands.forEach(hand => {
        if (!newSelected.includes(hand)) {
          newSelected.push(hand);
        }
      });
      return newSelected;
    });
  };

  const handleConfirm = () => {
    onSelectHands(selectedHands);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">プリセット選択</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => handlePresetSelect(presets.premium)}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-left"
              >
                🔥 プレミアムペア (AA, KK, QQ, JJ, TT)
              </button>
              <button
                onClick={() => handlePresetSelect(presets.aces)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg text-left"
              >
                ⭐ 強いエース系 (AK, AQ, AJ, AT)
              </button>
              <button
                onClick={() => handlePresetSelect(presets.broadway)}
                className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg text-left"
              >
                🎭 ブロードウェイスーテッド (KQ, KJ, KT, etc.)
              </button>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-white mb-2">選択済み: {selectedHands.length}ハンド</p>
            {selectedHands.length > 0 && (
              <div className="bg-gray-700 rounded p-2 max-h-20 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {selectedHands.map(hand => (
                    <span 
                      key={hand}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-sm cursor-pointer"
                      onClick={() => setSelectedHands(prev => prev.filter(h => h !== hand))}
                    >
                      {hand} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setSelectedHands([])}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded-lg"
            >
              全クリア
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold"
            >
              選択完了 ({selectedHands.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 
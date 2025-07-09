'use client';

import { useState, useEffect } from 'react';
import { determineGTOAction } from '@/lib/spotGenerator';

export default function TestPage() {
  const [result, setResult] = useState<any>(null);
  
  useEffect(() => {
    // TQs（テン・クイーン・スーテッド）のテスト
    const hand = ['Ts', 'Qs']; // テン・クイーン・スーテッド
    const position = 'HJ'; // ハイジャックポジション
    const scenario = 'openRaise'; // オープンレイズシナリオ
    
    // GTO戦略に基づくアクションを判定
    const gtoDecision = determineGTOAction(hand, position, scenario);
    
    setResult({ 
      hand, 
      position, 
      scenario, 
      decision: gtoDecision,
      isRaiseHand: gtoDecision.action === 'RAISE'
    });
  }, []);
  
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>ハンドテスト結果</h1>
      <hr style={{ marginBottom: '20px' }} />
      
      {result ? (
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>TQs + ハイジャックポジションのテスト</h2>
          <p>ハンド: {result.hand.join(', ')}</p>
          <p>ポジション: {result.position}</p>
          <p>シナリオ: {result.scenario}</p>
          <p style={{ fontWeight: 'bold' }}>決定したアクション: {result.decision.action}</p>
          <p style={{ fontWeight: 'bold' }}>レイズ範囲に含まれる: {result.isRaiseHand ? 'はい' : 'いいえ'}</p>
          {result.decision.betSize && (
            <p>ベットサイズ: {result.decision.betSize}BB</p>
          )}
        </div>
      ) : (
        <p>読み込み中...</p>
      )}
    </div>
  );
} 
import { NextResponse } from 'next/server';
import { determineGTOAction } from '@/lib/spotGenerator';

export async function GET() {
  // TQs（テン・クイーン・スーテッド）のテスト
  const hand = ['Ts', 'Qs']; // テン・クイーン・スーテッド
  const position = 'HJ'; // ハイジャックポジション
  const scenario = 'openRaise'; // オープンレイズシナリオ
  
  // GTO戦略に基づくアクションを判定
  const gtoDecision = determineGTOAction(hand, position, scenario);
  
  return NextResponse.json({ 
    hand, 
    position, 
    scenario, 
    decision: gtoDecision,
    isRaiseHand: gtoDecision.action === 'RAISE'
  });
} 
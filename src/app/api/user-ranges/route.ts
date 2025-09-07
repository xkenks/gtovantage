import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/firebase-admin';

// メモリキャッシュ（本番環境ではRedis等を使用推奨）
let userRangeCache: Record<string, any> = {};
let cacheLastUpdated: string = '';

// 一般ユーザーのカスタムレンジを取得
export async function GET(request: NextRequest) {
  console.log('🎯 GET /api/user-ranges 開始');
  
  // Firebase認証チェック
  const authResult = await verifyFirebaseToken(request);
  if (!authResult.success) {
    console.log('❌ Firebase認証失敗');
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  
  const userId = authResult.uid;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'ユーザーIDが取得できませんでした' },
      { status: 401 }
    );
  }
  
  try {
    // キャッシュから取得
    if (userRangeCache[userId] && cacheLastUpdated) {
      console.log(`✅ ユーザーカスタムレンジをキャッシュから取得: ${userId}`);
      return NextResponse.json({
        ranges: userRangeCache[userId].ranges,
        lastUpdated: userRangeCache[userId].lastUpdated,
        userId: userId
      });
    }
    
    // データファイルから読み込み（フォールバック）
    console.log('📁 データファイルからユーザーレンジを読み込み');
    const fs = require('fs');
    const path = require('path');
    
    const dataPath = path.join(process.cwd(), 'data', 'user-ranges.json');
    
    if (fs.existsSync(dataPath)) {
      const fileData = fs.readFileSync(dataPath, 'utf8');
      const allUserRanges = JSON.parse(fileData);
      
      if (allUserRanges[userId]) {
        userRangeCache[userId] = allUserRanges[userId];
        cacheLastUpdated = allUserRanges[userId].lastUpdated;
        
        console.log(`✅ ユーザーカスタムレンジをファイルから取得: ${userId}, ${Object.keys(allUserRanges[userId].ranges).length}個のレンジ`);
        
        return NextResponse.json({
          ranges: allUserRanges[userId].ranges,
          lastUpdated: allUserRanges[userId].lastUpdated,
          userId: userId
        });
      }
    }
    
    // データが存在しない場合は空のレンジを返す
    console.log(`📭 ユーザーカスタムレンジが見つかりません: ${userId}`);
    return NextResponse.json({
      ranges: {},
      lastUpdated: new Date().toISOString(),
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ ユーザーカスタムレンジ取得エラー:', error);
    return NextResponse.json(
      { error: 'レンジの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 一般ユーザーのカスタムレンジを保存
export async function POST(request: NextRequest) {
  console.log('🎯 POST /api/user-ranges 開始');
  
  // Firebase認証チェック
  const authResult = await verifyFirebaseToken(request);
  if (!authResult.success) {
    console.log('❌ Firebase認証失敗');
    return NextResponse.json(
      { error: '認証が必要です' },
      { status: 401 }
    );
  }
  
  const userId = authResult.uid;
  
  if (!userId) {
    return NextResponse.json(
      { error: 'ユーザーIDが取得できませんでした' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    const { ranges, metadata } = body;
    
    if (!ranges || typeof ranges !== 'object') {
      return NextResponse.json(
        { error: '無効なレンジデータです' },
        { status: 400 }
      );
    }
    
    const totalRanges = Object.keys(ranges).length;
    const totalHands = Object.values(ranges).reduce((total: number, range: any) => {
      return total + (typeof range === 'object' && range !== null ? Object.keys(range).length : 0);
    }, 0);
    
    console.log(`🔒 ユーザーカスタムレンジ保存開始: ${userId}`, {
      totalRanges,
      totalHands,
      creator: metadata?.creator || 'Unknown'
    });
    
    // メモリキャッシュに保存
    userRangeCache[userId] = {
      ranges: ranges,
      lastUpdated: new Date().toISOString(),
      metadata: {
        ...metadata,
        userId: userId,
        totalRanges,
        totalHands
      }
    };
    
    // ファイルにも保存（永続化）
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataPath = path.join(process.cwd(), 'data', 'user-ranges.json');
      
      // 既存のデータを読み込み
      let allUserRanges: Record<string, any> = {};
      if (fs.existsSync(dataPath)) {
        const fileData = fs.readFileSync(dataPath, 'utf8');
        allUserRanges = JSON.parse(fileData);
      }
      
      // ユーザーデータを更新
      allUserRanges[userId] = userRangeCache[userId];
      
      // ファイルに保存
      fs.writeFileSync(dataPath, JSON.stringify(allUserRanges, null, 2));
      
      console.log(`✅ ユーザーカスタムレンジをファイルに保存完了: ${userId}`);
      
    } catch (fileError) {
      console.error('⚠️ ファイル保存エラー（メモリキャッシュは更新済み）:', fileError);
    }
    
    cacheLastUpdated = userRangeCache[userId].lastUpdated;
    
    console.log(`🔒 ユーザーカスタムレンジ保存完了: ${userId}`, {
      totalRanges,
      totalHands,
      lastUpdated: cacheLastUpdated
    });
    
    return NextResponse.json({
      success: true,
      message: 'ユーザーカスタムレンジを保存しました',
      data: {
        userId: userId,
        totalRanges,
        totalHands,
        lastUpdated: cacheLastUpdated
      }
    });
    
  } catch (error) {
    console.error('❌ ユーザーカスタムレンジ保存エラー:', error);
    return NextResponse.json(
      { error: 'レンジの保存に失敗しました' },
      { status: 500 }
    );
  }
}

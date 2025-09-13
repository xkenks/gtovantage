import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// グローバルキャッシュ（メモリ内）
let globalRangeCache: SystemRangeData | null = null;
let cacheLastUpdated: string | null = null;

// データ保存先のパス（Vercel環境では/tmpを使用）
const DATA_DIR = process.env.NODE_ENV === 'production' 
  ? '/tmp' 
  : path.join(process.cwd(), 'data');
const RANGES_FILE = path.join(DATA_DIR, 'mtt-ranges.json');

// 本番環境でのフォールバック用パス
const FALLBACK_RANGES_FILE = path.join(process.cwd(), 'public', 'data', 'mtt-ranges.json');
const JWT_SECRET = process.env.JWT_SECRET || 'gto-vantage-production-secret-key-2024-ultra-secure-admin-token-vercel-deployment';

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface HandInfo {
  action: string;
  frequency: number;
  mixedFrequencies?: {
    FOLD: number;
    CALL: number;
    MIN?: number;
    ALL_IN: number;
  };
}

export interface MTTRangeData {
  [position: string]: {
    [handType: string]: HandInfo;
  };
}

export interface SystemRangeData {
  version: string;
  lastUpdated: string;
  ranges: MTTRangeData;
  metadata: {
    totalPositions: number;
    totalHands: number;
    creator: string;
    environment: string;
  };
}

// 管理者認証チェック関数
function verifyAdminToken(request: NextRequest): boolean {
  try {
    console.log('🔍 管理者認証開始:', {
      environment: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET,
      jwtSecretLength: JWT_SECRET.length
    });
    
    // Authorization: Bearer ヘッダーをチェック
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔑 Bearer トークン検証中:', { tokenLength: token.length });
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      console.log('✅ Bearer トークン検証成功:', { role: decoded.role });
      return decoded.role === 'admin';
    }
    
    // Admin-Token ヘッダーをチェック（フロントエンド用）
    const adminToken = request.headers.get('admin-token');
    if (adminToken) {
      console.log('🔑 Admin-Token 検証中:', { tokenLength: adminToken.length });
      const decoded = jwt.verify(adminToken, JWT_SECRET) as any;
      console.log('✅ Admin-Token 検証成功:', { role: decoded.role });
      return decoded.role === 'admin';
    }
    
    console.log('❌ 認証トークンが見つかりません');
    return false;
  } catch (error) {
    console.log('❌ 認証エラー:', {
      error: error instanceof Error ? error.message : String(error),
      environment: process.env.NODE_ENV,
      hasJwtSecret: !!process.env.JWT_SECRET
    });
    return false;
  }
}

// システム全体のMTTレンジデータを取得（全プレイヤーアクセス可能）
export async function GET(request: NextRequest) {
  console.log('🎯 GET /api/mtt-ranges 開始');
  
  try {
    // キャッシュが有効な場合はキャッシュから返す
    if (globalRangeCache && cacheLastUpdated) {
      console.log('🎯 キャッシュからデータを返却:', {
        lastUpdated: cacheLastUpdated,
        totalPositions: globalRangeCache.metadata.totalPositions,
        totalHands: globalRangeCache.metadata.totalHands,
        hasRanges: !!globalRangeCache.ranges,
        rangesCount: globalRangeCache.ranges ? Object.keys(globalRangeCache.ranges).length : 0
      });
      return NextResponse.json(globalRangeCache);
    }

    // ファイルから読み込み
    if (!fs.existsSync(RANGES_FILE)) {
      console.log('🎯 メインファイルが存在しないため、フォールバックファイルを確認');
      
      // フォールバックファイルを確認
      if (fs.existsSync(FALLBACK_RANGES_FILE)) {
        console.log('🎯 フォールバックファイルからデータを読み込み');
        const fallbackData = fs.readFileSync(FALLBACK_RANGES_FILE, 'utf8');
        const rangeData: SystemRangeData = JSON.parse(fallbackData);
        
        // キャッシュを更新
        globalRangeCache = rangeData;
        cacheLastUpdated = rangeData.lastUpdated;
        
        console.log('🎯 フォールバックファイルからデータを読み込み、キャッシュを更新:', {
          lastUpdated: cacheLastUpdated,
          totalPositions: rangeData.metadata.totalPositions,
          totalHands: rangeData.metadata.totalHands,
          hasRanges: !!rangeData.ranges,
          rangesCount: rangeData.ranges ? Object.keys(rangeData.ranges).length : 0,
          fileSize: fallbackData.length
        });
        
        return NextResponse.json(rangeData);
      }
      
      console.log('🎯 フォールバックファイルも存在しないため、空のデータを返却');
      // ファイルが存在しない場合は空のデータを返す
      const emptyData: SystemRangeData = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        ranges: {},
        metadata: {
          totalPositions: 0,
          totalHands: 0,
          creator: 'System',
          environment: process.env.NODE_ENV || 'development'
        }
      };
      return NextResponse.json(emptyData);
    }

    console.log('🎯 ファイルからデータを読み込み開始');
    const data = fs.readFileSync(RANGES_FILE, 'utf8');
    const rangeData: SystemRangeData = JSON.parse(data);
    
    // キャッシュを更新
    globalRangeCache = rangeData;
    cacheLastUpdated = rangeData.lastUpdated;
    
    console.log('🎯 ファイルからデータを読み込み、キャッシュを更新:', {
      lastUpdated: cacheLastUpdated,
      totalPositions: rangeData.metadata.totalPositions,
      totalHands: rangeData.metadata.totalHands,
      hasRanges: !!rangeData.ranges,
      rangesCount: rangeData.ranges ? Object.keys(rangeData.ranges).length : 0,
      fileSize: data.length
    });
    
    return NextResponse.json(rangeData);
  } catch (error) {
    console.error('MTTレンジデータの読み込みエラー:', error);
    return NextResponse.json(
      { error: 'データの読み込みに失敗しました' },
      { status: 500 }
    );
  }
}

// システム全体にMTTレンジデータを保存（管理者のみ）
export async function POST(request: NextRequest) {
  console.log('🎯 POST /api/mtt-ranges 開始');
  
  // 管理者認証チェック
  if (!verifyAdminToken(request)) {
    console.log('❌ 管理者認証失敗');
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
    );
  }

  console.log('✅ 管理者認証成功');

  try {
    const body = await request.json();
    const { ranges, metadata } = body;

    console.log('🎯 リクエストボディ:', {
      hasRanges: !!ranges,
      rangesType: typeof ranges,
      rangesKeys: ranges ? Object.keys(ranges) : [],
      rangesCount: ranges ? Object.keys(ranges).length : 0,
      metadata
    });

    if (!ranges || typeof ranges !== 'object') {
      console.log('❌ 無効なレンジデータ');
      return NextResponse.json(
        { error: '無効なレンジデータです' },
        { status: 400 }
      );
    }

    // メタデータの計算
    const totalPositions = Object.keys(ranges).length;
    const totalHands = Object.values(ranges).reduce((total: number, positionRanges: any) => {
      return total + Object.keys(positionRanges).length;
    }, 0);

    const systemData: SystemRangeData = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      ranges: ranges,
      metadata: {
        totalPositions,
        totalHands,
        creator: metadata?.creator || 'Admin',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Vercel環境ではファイル保存ができないため、メモリキャッシュを更新
    if (process.env.NODE_ENV === 'production') {
      console.log('🎯 Vercel環境: メモリキャッシュを更新');
      
      // グローバルキャッシュを更新
      globalRangeCache = systemData;
      cacheLastUpdated = systemData.lastUpdated;
      
      console.log(`🔒 管理者がMTTレンジデータを保存（メモリキャッシュ更新）: ${totalPositions}ポジション, ${totalHands}ハンド`);
      console.log('🎯 キャッシュ更新詳細:', {
        hasCache: !!globalRangeCache,
        lastUpdated: cacheLastUpdated,
        hasRanges: !!globalRangeCache.ranges,
        rangesCount: globalRangeCache.ranges ? Object.keys(globalRangeCache.ranges).length : 0,
        rangesKeys: globalRangeCache.ranges ? Object.keys(globalRangeCache.ranges).slice(0, 5) : []
      });

      return NextResponse.json({
        success: true,
        message: 'システム全体にレンジデータを保存しました（メモリキャッシュ更新）',
        metadata: systemData.metadata,
        note: 'メモリキャッシュが更新されました。他のユーザーは「システム読み込み」で最新データを取得できます。'
      });
    }

    // 開発環境でのファイル保存
    console.log('🎯 ファイル保存開始:', {
      dataDir: DATA_DIR,
      rangesFile: RANGES_FILE,
      dataDirExists: fs.existsSync(DATA_DIR),
      rangesFileExists: fs.existsSync(RANGES_FILE),
      systemDataSize: JSON.stringify(systemData).length
    });
    
    try {
      fs.writeFileSync(RANGES_FILE, JSON.stringify(systemData, null, 2));
      console.log('✅ メインファイル保存成功');
      
      // 本番環境ではフォールバックファイルにも保存
      if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        try {
          fs.writeFileSync(FALLBACK_RANGES_FILE, JSON.stringify(systemData, null, 2));
          console.log('✅ フォールバックファイル保存成功');
        } catch (fallbackError) {
          console.warn('⚠️ フォールバックファイル保存失敗:', fallbackError);
        }
      }
      
      // キャッシュも更新
      globalRangeCache = systemData;
      cacheLastUpdated = systemData.lastUpdated;
      console.log('✅ メモリキャッシュも更新');
      
    } catch (writeError) {
      console.error('❌ ファイル書き込みエラー:', writeError);
      throw new Error(`ファイル書き込みに失敗: ${writeError}`);
    }

    console.log(`🔒 管理者がMTTレンジデータを保存: ${totalPositions}ポジション, ${totalHands}ハンド`);

    return NextResponse.json({
      success: true,
      message: 'システム全体にレンジデータを保存しました（ファイル + キャッシュ更新）',
      metadata: systemData.metadata
    });
  } catch (error) {
    console.error('MTTレンジデータの保存エラー:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `データの保存に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// システムのレンジデータを削除（管理者のみ）
export async function DELETE(request: NextRequest) {
  // 管理者認証チェック
  if (!verifyAdminToken(request)) {
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
    );
  }

  try {
    if (fs.existsSync(RANGES_FILE)) {
      fs.unlinkSync(RANGES_FILE);
    }

    // キャッシュもクリア
    globalRangeCache = null;
    cacheLastUpdated = null;
    console.log('🔒 管理者がシステム全体のレンジデータを削除しました（ファイル + キャッシュ）');

    return NextResponse.json({
      success: true,
      message: 'システム全体のレンジデータを削除しました（ファイル + キャッシュ）'
    });
  } catch (error) {
    console.error('MTTレンジデータの削除エラー:', error);
    return NextResponse.json(
      { error: 'データの削除に失敗しました' },
      { status: 500 }
    );
  }
}

// キャッシュの状態を確認するエンドポイント（管理者のみ）
export async function PATCH(request: NextRequest) {
  // 管理者認証チェック
  if (!verifyAdminToken(request)) {
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'clear-cache') {
      globalRangeCache = null;
      cacheLastUpdated = null;
      console.log('🔒 管理者がキャッシュをクリアしました');

      return NextResponse.json({
        success: true,
        message: 'キャッシュをクリアしました'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'キャッシュの状態',
      cache: {
        hasCache: !!globalRangeCache,
        lastUpdated: cacheLastUpdated,
        totalPositions: globalRangeCache?.metadata.totalPositions || 0,
        totalHands: globalRangeCache?.metadata.totalHands || 0
      }
    });
  } catch (error) {
    console.error('キャッシュ操作エラー:', error);
    return NextResponse.json(
      { error: 'キャッシュ操作に失敗しました' },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// データ保存先のパス
const DATA_DIR = path.join(process.cwd(), 'data');
const RANGES_FILE = path.join(DATA_DIR, 'mtt-ranges.json');
const JWT_SECRET = process.env.JWT_SECRET || 'gto-vantage-admin-secret-key-2024';

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface HandInfo {
  action: string;
  frequency: number;
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
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    return decoded.role === 'admin';
  } catch (error) {
    return false;
  }
}

// システム全体のMTTレンジデータを取得（全プレイヤーアクセス可能）
export async function GET(request: NextRequest) {
  try {
    if (!fs.existsSync(RANGES_FILE)) {
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

    const data = fs.readFileSync(RANGES_FILE, 'utf8');
    const rangeData: SystemRangeData = JSON.parse(data);
    
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
  // 管理者認証チェック
  if (!verifyAdminToken(request)) {
    return NextResponse.json(
      { error: '管理者権限が必要です' },
      { status: 403 }
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

    // ファイルに保存
    fs.writeFileSync(RANGES_FILE, JSON.stringify(systemData, null, 2));

    console.log(`🔒 管理者がMTTレンジデータを保存: ${totalPositions}ポジション, ${totalHands}ハンド`);

    return NextResponse.json({
      success: true,
      message: 'システム全体にレンジデータを保存しました',
      metadata: systemData.metadata
    });
  } catch (error) {
    console.error('MTTレンジデータの保存エラー:', error);
    return NextResponse.json(
      { error: 'データの保存に失敗しました' },
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

    console.log('🔒 管理者がシステム全体のレンジデータを削除しました');

    return NextResponse.json({
      success: true,
      message: 'システム全体のレンジデータを削除しました'
    });
  } catch (error) {
    console.error('MTTレンジデータの削除エラー:', error);
    return NextResponse.json(
      { error: 'データの削除に失敗しました' },
      { status: 500 }
    );
  }
} 
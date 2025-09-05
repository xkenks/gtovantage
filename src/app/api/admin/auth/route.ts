import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// レート制限のための記録
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15分

// 管理者認証情報（環境変数から取得 - 開発環境ではデフォルト値を使用）
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'gto-admin',
  password: process.env.ADMIN_PASSWORD || 'GTO2024Admin!'
};

const JWT_SECRET = process.env.JWT_SECRET || 'gto-vantage-admin-secret-key-2024';

// 本番環境での環境変数検証
if (process.env.NODE_ENV === 'production') {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    console.error('❌ 本番環境で管理者認証に必要な環境変数が設定されていません');
    console.error('ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET を設定してください');
  }
}

// IPアドレス取得ヘルパー
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

// レート制限チェック
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = failedAttempts.get(ip);
  
  if (!attempts) return true;
  
  // ロックアウト期間が過ぎていれば削除
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    failedAttempts.delete(ip);
    return true;
  }
  
  return attempts.count < MAX_FAILED_ATTEMPTS;
}

// 失敗記録
function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const attempts = failedAttempts.get(ip) || { count: 0, lastAttempt: 0 };
  
  attempts.count += 1;
  attempts.lastAttempt = now;
  
  failedAttempts.set(ip, attempts);
}

// 成功時のクリア
function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

// CORS設定
function setCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Cache-Control');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

// OPTIONS リクエスト（CORS プリフライト）
export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  return setCORSHeaders(response);
}

// 管理者ログイン
export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);
  
  try {
    // 本番環境での環境変数検証
    if (process.env.NODE_ENV === 'production' && (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET)) {
      console.error(`管理者認証試行が拒否されました（本番環境で環境変数未設定）: IP ${clientIP}`);
      const response = NextResponse.json(
        { error: '管理者認証システムが設定されていません' },
        { status: 503 }
      );
      return setCORSHeaders(response);
    }

    // レート制限チェック
    if (!checkRateLimit(clientIP)) {
      console.warn(`ログイン試行が制限されました: IP ${clientIP}`);
      const response = NextResponse.json(
        { error: 'ログイン試行回数が上限に達しました。15分後に再試行してください。' },
        { status: 429 }
      );
      return setCORSHeaders(response);
    }

    const { username, password } = await request.json();

    // 入力値検証
    if (!username || !password) {
      const response = NextResponse.json(
        { error: 'ユーザー名とパスワードが必要です' },
        { status: 400 }
      );
      return setCORSHeaders(response);
    }

    console.log(`管理者認証試行: ユーザー名="${username}", IP: ${clientIP}`);

    // 認証チェック
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      recordFailedAttempt(clientIP);
      console.warn(`認証失敗: IP ${clientIP}, ユーザー名: ${username}, パスワード長: ${password.length}`);
      const response = NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
      return setCORSHeaders(response);
    }

    // 認証成功
    clearFailedAttempts(clientIP);

    // JWTトークン生成
    const token = jwt.sign(
      { 
        username,
        role: 'admin',
        timestamp: Date.now(),
        ip: clientIP
      },
      JWT_SECRET,
      { expiresIn: '2h' } // セキュリティ強化: 2時間で期限切れ
    );

    console.log(`✅ 管理者ログイン成功: ${username}, IP: ${clientIP}, 時刻: ${new Date().toISOString()}`);

    const response = NextResponse.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin'
      }
    });
    
    return setCORSHeaders(response);
  } catch (error) {
    console.error(`管理者認証エラー (IP: ${clientIP}):`, error);
    const response = NextResponse.json(
      { error: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
    return setCORSHeaders(response);
  }
}

// トークン検証
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const response = NextResponse.json(
        { error: 'トークンが提供されていません' },
        { status: 401 }
      );
      return setCORSHeaders(response);
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const response = NextResponse.json({
      valid: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });
    
    return setCORSHeaders(response);
  } catch (error) {
    const response = NextResponse.json(
      { error: 'トークンが無効です' },
      { status: 401 }
    );
    return setCORSHeaders(response);
  }
} 
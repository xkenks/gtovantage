import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// 管理者認証情報（本番環境では環境変数を使用）
const ADMIN_CREDENTIALS = {
  username: 'gto-admin',
  password: 'mtt-ranges-2024!secure'
};

const JWT_SECRET = process.env.JWT_SECRET || 'gto-vantage-admin-secret-key-2024';

// 管理者ログイン
export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 認証チェック
    if (username !== ADMIN_CREDENTIALS.username || password !== ADMIN_CREDENTIALS.password) {
      return NextResponse.json(
        { error: '認証に失敗しました' },
        { status: 401 }
      );
    }

    // JWTトークン生成
    const token = jwt.sign(
      { 
        username,
        role: 'admin',
        timestamp: Date.now()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('管理者ログイン成功:', username);

    return NextResponse.json({
      success: true,
      token,
      user: {
        username,
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('管理者認証エラー:', error);
    return NextResponse.json(
      { error: '認証処理中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

// トークン検証
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'トークンが提供されていません' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    return NextResponse.json({
      valid: true,
      user: {
        username: decoded.username,
        role: decoded.role
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'トークンが無効です' },
      { status: 401 }
    );
  }
} 
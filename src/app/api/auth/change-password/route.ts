import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, userEmail } = await request.json();

    if (!currentPassword || !newPassword || !userEmail) {
      return NextResponse.json({ error: '現在のパスワード、新しいパスワード、ユーザーメールが必要です' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新しいパスワードは6文字以上である必要があります' }, { status: 400 });
    }

    // ローカルストレージベースの認証システムでは、
    // 実際のパスワード変更はクライアントサイドで行われるため、
    // このAPIは成功レスポンスのみを返す
    // 実際のパスワード変更ロジックはAuthContextで実装される

    return NextResponse.json({ 
      message: 'パスワード変更リクエストが正常に処理されました',
      success: true 
    });

  } catch (error) {
    console.error('パスワード変更エラー:', error);
    return NextResponse.json({ error: 'パスワード変更中にエラーが発生しました' }, { status: 500 });
  }
} 
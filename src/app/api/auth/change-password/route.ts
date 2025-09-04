import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, userEmail } = await request.json();

    if (!currentPassword || !newPassword || !userEmail) {
      return NextResponse.json({ error: '現在のパスワード、新しいパスワード、ユーザーメールが必要です' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新しいパスワードは6文字以上である必要があります' }, { status: 400 });
    }

    // ローカルストレージベースの認証システムでパスワードを変更
    try {
      // ユーザーデータを取得
      const users = JSON.parse(process.env.NODE_ENV === 'production' ? '[]' : 
        (typeof window !== 'undefined' ? localStorage.getItem('gto-vantage-users') || '[]' : '[]'));
      
      const currentHashedPassword = btoa(currentPassword + userEmail);
      const userIndex = users.findIndex((u: any) => u.email === userEmail && u.password === currentHashedPassword);

      if (userIndex === -1) {
        return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 401 });
      }

      // 新しいパスワードをハッシュ化
      const newHashedPassword = btoa(newPassword + userEmail);
      users[userIndex].password = newHashedPassword;
      
      // Note: サーバーサイドではlocalStorageにアクセスできないため、
      // 実際のパスワード変更はクライアントサイドで行う必要があります
      // このAPIは検証のみを行い、実際の変更はクライアントサイドで実行されます

      return NextResponse.json({ 
        message: 'パスワード変更リクエストが正常に処理されました',
        success: true 
      });

    } catch (storageError) {
      console.error('ローカルストレージアクセスエラー:', storageError);
      return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 401 });
    }

  } catch (error) {
    console.error('パスワード変更エラー:', error);
    return NextResponse.json({ error: 'パスワード変更中にエラーが発生しました' }, { status: 500 });
  }
} 
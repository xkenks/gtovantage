import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: '認証トークンが必要です' }, { status: 400 });
    }

    // サーバーサイドでの基本的な検証
    if (token.length !== 64) {
      return NextResponse.json({ error: '無効なトークンです' }, { status: 400 });
    }

    // ファイルからトークンを検証
    try {
      const fs = require('fs');
      const path = require('path');
      
      const tokensFile = path.join(process.cwd(), 'data', 'verification-tokens.json');
      
      if (!fs.existsSync(tokensFile)) {
        return NextResponse.json({ error: 'トークンが見つかりません' }, { status: 400 });
      }
      
      const fileContent = fs.readFileSync(tokensFile, 'utf8');
      const tokens = JSON.parse(fileContent);
      const tokenData = tokens[token];
      
      if (!tokenData) {
        return NextResponse.json({ error: '無効なトークンです' }, { status: 400 });
      }
      
      if (tokenData.used) {
        console.log('❌ トークン既に使用済み:', token, 'usedAt:', tokenData.usedAt);
        return NextResponse.json({ error: 'このトークンは既に使用されています' }, { status: 400 });
      }
      
      if (Date.now() > tokenData.expirationTime) {
        return NextResponse.json({ error: 'トークンの有効期限が切れています' }, { status: 400 });
      }
      
      // トークンを使用済みにマーク
      tokenData.used = true;
      tokenData.usedAt = Date.now();
      tokens[token] = tokenData;
      
      // ファイルを更新
      fs.writeFileSync(tokensFile, JSON.stringify(tokens, null, 2));
      
      console.log('✅ トークン認証成功:', token);
      
      return NextResponse.json({ 
        message: 'メールアドレスが正常に認証されました',
        success: true,
        email: tokenData.email
      });
      
    } catch (fileError) {
      console.error('トークンファイル処理エラー:', fileError);
      return NextResponse.json({ error: 'トークンの検証に失敗しました' }, { status: 500 });
    }

  } catch (error) {
    console.error('メール認証エラー:', error);
    return NextResponse.json({ error: 'メール認証に失敗しました' }, { status: 500 });
  }
}

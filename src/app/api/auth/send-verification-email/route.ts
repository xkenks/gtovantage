import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';

interface VerificationToken {
  email: string;
  name: string;
  expirationTime: number;
  used: boolean;
  createdAt: number;
}

interface TokensData {
  [token: string]: VerificationToken;
}

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'メールアドレスが必要です' }, { status: 400 });
    }

    // 検証トークンを生成
    const verificationToken = randomBytes(32).toString('hex');
    const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24時間後

    // ローカルストレージベースの実装では、サーバーサイドでトークンを保存できないため、
    // トークンをクライアントサイドで管理する必要があります
    // 実際の本番環境では、データベースにトークンを保存してください

    // サーバーサイドでトークンをファイルに保存（簡易実装）
    // 実際の本番環境では、データベースを使用してください
    try {
      const fs = require('fs');
      const path = require('path');
      
      const tokensDir = path.join(process.cwd(), 'data');
      const tokensFile = path.join(tokensDir, 'verification-tokens.json');
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(tokensDir)) {
        fs.mkdirSync(tokensDir, { recursive: true });
      }
      
      // 既存のトークンを読み込み
      let existingTokens: TokensData = {};
      if (fs.existsSync(tokensFile)) {
        try {
          const fileContent = fs.readFileSync(tokensFile, 'utf8');
          existingTokens = JSON.parse(fileContent);
        } catch (error) {
          console.error('既存のトークンファイル読み込みエラー:', error);
          existingTokens = {};
        }
      }
      
      // 新しいトークンを追加
      existingTokens[verificationToken] = {
        email,
        name,
        expirationTime,
        used: false,
        createdAt: Date.now()
      };
      
      // ファイルに保存
      fs.writeFileSync(tokensFile, JSON.stringify(existingTokens, null, 2));
      
      console.log('📄 トークンをファイルに保存しました:', verificationToken);
    } catch (error) {
      console.error('トークン保存エラー:', error);
      // エラーが発生しても処理を続行
    }

    // メール送信処理（実際の実装）
    // 本番環境では、SendGrid、AWS SES、Nodemailerなどを使用
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002'}/verify-email?token=${verificationToken}`;
    
    // 現在はコンソールにログ出力（開発環境用）
    console.log('🔗 メール認証URL:', verificationUrl);
    console.log('📧 送信先:', email);
    console.log('👤 ユーザー名:', name);
    
    // 実際のメール送信実装例（コメントアウト）
    /*
    const emailContent = {
      to: email,
      subject: 'GTO Vantage - メールアドレス認証',
      html: `
        <h2>メールアドレス認証</h2>
        <p>${name} 様</p>
        <p>GTO Vantageにご登録いただき、ありがとうございます。</p>
        <p>以下のリンクをクリックして、メールアドレスを認証してください：</p>
        <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">メールアドレスを認証する</a>
        <p>このリンクは24時間で無効になります。</p>
        <p>もしこのメールに心当たりがない場合は、このメールを無視してください。</p>
      `
    };
    
    // ここでメール送信サービスのAPIを呼び出し
    await sendEmail(emailContent);
    */

    return NextResponse.json({ 
      message: 'メール認証リンクを送信しました',
      success: true,
      ...(process.env.NODE_ENV === 'development' && {
        token: verificationToken, // 開発環境でのみ送信
        verificationUrl: verificationUrl.replace('localhost:3000', 'localhost:3002') // ポート番号を修正
      })
    });

  } catch (error) {
    console.error('メール送信エラー:', error);
    return NextResponse.json({ error: 'メールの送信に失敗しました' }, { status: 500 });
  }
}

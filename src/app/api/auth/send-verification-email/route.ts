import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, token, name } = await request.json();

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      );
    }

    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

        // テスト用: APIキーが設定されていない場合はコンソールに出力
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your_resend_api_key_here') {
      console.log('=== メール送信テスト（開発モード） ===');
      console.log('送信先:', email);
      console.log('確認URL:', verificationUrl);
      console.log('=====================================');
      
      return NextResponse.json({ 
        success: true, 
        message: '開発モード: メール送信をシミュレートしました',
        verificationUrl 
      });
    }

    const { data, error } = await resend.emails.send({
      from: 'GTO Vantage <noreply@gtovantage.com>',
      to: [email],
      subject: 'GTO Vantage - メールアドレス確認',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">GTO Vantage</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">メールアドレス確認</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <h2 style="color: #333; margin: 0 0 20px 0;">こんにちは、${name}さん</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 25px;">
              GTO Vantageへのご登録ありがとうございます。アカウントを有効化するために、以下のボタンをクリックしてメールアドレスを確認してください。
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 5px; 
                        font-weight: bold; 
                        display: inline-block;">
                メールアドレスを確認
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：
            </p>
            
            <p style="color: #667eea; word-break: break-all; margin-bottom: 25px;">
              ${verificationUrl}
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;">
            
            <p style="color: #999; font-size: 14px; margin: 0;">
              このメールに心当たりがない場合は、無視していただいて構いません。
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Send verification email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
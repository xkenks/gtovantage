import { NextRequest, NextResponse } from 'next/server';

interface ContactFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message }: ContactFormData = await request.json();

    // バリデーション
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ 
        error: '全ての項目を入力してください' 
      }, { status: 400 });
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: '有効なメールアドレスを入力してください' 
      }, { status: 400 });
    }

    // お問い合わせデータの保存（ローカルストレージベース）
    const contactData = {
      id: Date.now().toString(),
      name,
      email,
      subject,
      message,
      timestamp: new Date().toISOString(),
      status: 'new' as const,
      userAgent: request.headers.get('user-agent') || '',
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    };

    // 開発環境用：コンソールに出力
    console.log('📬 新しいお問い合わせを受信しました:');
    console.log('👤 名前:', name);
    console.log('📧 メール:', email);
    console.log('📝 件名:', subject);
    console.log('💬 内容:', message);
    console.log('🕒 送信時刻:', contactData.timestamp);

    // 実際の本番環境では、データベースに保存
    /*
    await db.contacts.insertOne(contactData);
    
    // 管理者へのメール通知
    await sendNotificationEmail({
      to: 'admin@gtovantage.com',
      subject: `新しいお問い合わせ: ${subject}`,
      html: `
        <h2>新しいお問い合わせが届きました</h2>
        <p><strong>名前:</strong> ${name}</p>
        <p><strong>メールアドレス:</strong> ${email}</p>
        <p><strong>件名:</strong> ${subject}</p>
        <p><strong>内容:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <p><strong>送信時刻:</strong> ${contactData.timestamp}</p>
      `
    });

    // 送信者への自動返信メール
    await sendAutoReplyEmail({
      to: email,
      name: name,
      subject: subject
    });
    */

    return NextResponse.json({ 
      message: 'お問い合わせを受け付けました。ご連絡いただきありがとうございます。',
      success: true,
      contactId: contactData.id
    });

  } catch (error) {
    console.error('お問い合わせ処理エラー:', error);
    return NextResponse.json({ 
      error: 'お問い合わせの送信中にエラーが発生しました。しばらく時間をおいて再度お試しください。' 
    }, { status: 500 });
  }
}

// 自動返信メール送信関数（実装例）
async function sendAutoReplyEmail(data: { to: string; name: string; subject: string }) {
  const { to, name, subject } = data;
  
  const autoReplyContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3b82f6;">お問い合わせありがとうございます</h2>
      <p>${name} 様</p>
      <p>この度は、GTO Vantageにお問い合わせいただき、誠にありがとうございます。</p>
      <p>以下の内容でお問い合わせを受け付けいたしました：</p>
      <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p><strong>件名:</strong> ${subject}</p>
        <p><strong>受付日時:</strong> ${new Date().toLocaleString('ja-JP')}</p>
      </div>
      <p>お問い合わせ内容を確認の上、2〜3営業日以内にご返信させていただきます。</p>
      <p>緊急のお問い合わせの場合は、お電話にてご連絡ください。</p>
      <hr style="margin: 24px 0;">
      <p style="color: #6b7280; font-size: 14px;">
        このメールは自動送信されています。<br>
        GTO Vantage サポートチーム
      </p>
    </div>
  `;

  // 実際のメール送信処理はここに実装
  console.log('📧 自動返信メール送信:', to);
  console.log('内容:', autoReplyContent);
}

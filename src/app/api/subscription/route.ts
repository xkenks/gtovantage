import { NextRequest, NextResponse } from 'next/server';

interface SubscriptionData {
  userEmail: string;
  planType: 'light' | 'premium';
  paymentMethod: string;
  billingInfo?: {
    name: string;
    email: string;
    address?: string;
  };
}

// サブスクリプション作成/更新
export async function POST(request: NextRequest) {
  try {
    const { userEmail, planType, paymentMethod, billingInfo }: SubscriptionData = await request.json();

    // バリデーション
    if (!userEmail || !planType || !paymentMethod) {
      return NextResponse.json({ 
        error: '必要な情報が不足しています' 
      }, { status: 400 });
    }

    if (!['light', 'premium'].includes(planType)) {
      return NextResponse.json({ 
        error: '無効なプランタイプです' 
      }, { status: 400 });
    }

    // プラン料金の設定
    const planPrices = {
      light: { monthly: 980, yearly: 9800 },
      premium: { monthly: 1980, yearly: 19800 }
    };

    const selectedPrice = planPrices[planType];

    // 実際の支払い処理のシミュレーション（本番では決済サービスのAPIを呼び出し）
    const paymentResult = await simulatePaymentProcessing({
      amount: selectedPrice.monthly,
      currency: 'JPY',
      planType,
      userEmail,
      paymentMethod
    });

    if (!paymentResult.success) {
      return NextResponse.json({ 
        error: paymentResult.message || '支払い処理に失敗しました' 
      }, { status: 400 });
    }

    // ユーザーのサブスクリプション状態を更新
    const subscriptionResult = await updateUserSubscription(userEmail, planType);

    if (!subscriptionResult.success) {
      return NextResponse.json({ 
        error: 'サブスクリプションの更新に失敗しました' 
      }, { status: 500 });
    }

    // 成功時のレスポンス
    return NextResponse.json({
      success: true,
      message: `${planType === 'light' ? 'ライトプラン' : 'プレミアムプラン'}へのアップグレードが完了しました`,
      subscription: {
        planType,
        startDate: new Date().toISOString(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
        amount: selectedPrice.monthly,
        currency: 'JPY'
      },
      paymentId: paymentResult.paymentId
    });

  } catch (error) {
    console.error('サブスクリプション処理エラー:', error);
    return NextResponse.json({ 
      error: 'サブスクリプション処理中にエラーが発生しました' 
    }, { status: 500 });
  }
}

// サブスクリプション情報取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json({ 
        error: 'メールアドレスが必要です' 
      }, { status: 400 });
    }

    // ユーザーのサブスクリプション情報を取得
    const subscription = await getUserSubscription(userEmail);

    return NextResponse.json({
      success: true,
      subscription
    });

  } catch (error) {
    console.error('サブスクリプション情報取得エラー:', error);
    return NextResponse.json({ 
      error: 'サブスクリプション情報の取得に失敗しました' 
    }, { status: 500 });
  }
}

// サブスクリプションキャンセル
export async function DELETE(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({ 
        error: 'メールアドレスが必要です' 
      }, { status: 400 });
    }

    // サブスクリプションをキャンセル
    const cancelResult = await cancelUserSubscription(userEmail);

    if (!cancelResult.success) {
      return NextResponse.json({ 
        error: 'サブスクリプションのキャンセルに失敗しました' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'サブスクリプションがキャンセルされました'
    });

  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    return NextResponse.json({ 
      error: 'キャンセル処理中にエラーが発生しました' 
    }, { status: 500 });
  }
}

// 支払い処理のシミュレーション（実際にはStripe、PayPal等のAPIを使用）
async function simulatePaymentProcessing(paymentData: any) {
  console.log('💳 支払い処理を開始しました:');
  console.log('金額:', paymentData.amount, '円');
  console.log('プラン:', paymentData.planType);
  console.log('ユーザー:', paymentData.userEmail);

  // 実際の決済処理例（コメントアウト）
  /*
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: paymentData.amount * 100, // Stripeは最小通貨単位で指定
    currency: 'jpy',
    metadata: {
      userEmail: paymentData.userEmail,
      planType: paymentData.planType
    }
  });

  return {
    success: true,
    paymentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret
  };
  */

  // 開発環境用シミュレーション
  await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒の遅延

  return {
    success: true,
    paymentId: `pay_${Date.now()}`,
    message: '支払いが正常に処理されました（開発環境）'
  };
}

// ユーザーのサブスクリプション状態を更新
async function updateUserSubscription(userEmail: string, planType: string) {
  try {
    if (typeof window !== 'undefined') {
      // クライアントサイドでの処理はできないため、実際にはサーバーサイドで実行
      return { success: false, error: 'サーバーサイドでのみ実行可能' };
    }

    // 実際の実装では、データベースを更新
    /*
    await db.users.updateOne(
      { email: userEmail },
      { 
        $set: { 
          subscriptionStatus: planType,
          subscriptionStartDate: new Date(),
          subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日後
        } 
      }
    );
    */

    console.log(`✅ ユーザー ${userEmail} のサブスクリプションを ${planType} に更新しました`);

    return { success: true };
  } catch (error) {
    console.error('サブスクリプション更新エラー:', error);
    return { success: false, error: 'データベース更新に失敗しました' };
  }
}

// ユーザーのサブスクリプション情報を取得
async function getUserSubscription(userEmail: string) {
  // 実際の実装では、データベースから取得
  /*
  const user = await db.users.findOne({ email: userEmail });
  return {
    planType: user.subscriptionStatus,
    startDate: user.subscriptionStartDate,
    endDate: user.subscriptionEndDate,
    isActive: user.subscriptionEndDate > new Date()
  };
  */

  // 開発環境用のダミーデータ
  return {
    planType: 'free',
    startDate: null,
    endDate: null,
    isActive: false
  };
}

// サブスクリプションをキャンセル
async function cancelUserSubscription(userEmail: string) {
  try {
    // 実際の実装では、決済サービスでサブスクリプションをキャンセル
    /*
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    await stripe.subscriptions.del(subscriptionId);
    
    await db.users.updateOne(
      { email: userEmail },
      { 
        $set: { 
          subscriptionStatus: 'free',
          subscriptionEndDate: new Date() // 即座に終了
        } 
      }
    );
    */

    console.log(`❌ ユーザー ${userEmail} のサブスクリプションをキャンセルしました`);

    return { success: true };
  } catch (error) {
    console.error('サブスクリプションキャンセルエラー:', error);
    return { success: false, error: 'キャンセル処理に失敗しました' };
  }
}

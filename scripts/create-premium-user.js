#!/usr/bin/env node

/**
 * Firebase Admin SDK を使用してプレミアムユーザーを作成するスクリプト
 * 実行方法: node scripts/create-premium-user.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin 初期化
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    // サービスアカウントキーのパスを確認
    const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
    
    try {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
      });
      console.log('✅ Firebase Admin SDK 初期化完了');
    } catch (error) {
      console.error('❌ Firebase Admin SDK 初期化エラー:', error.message);
      console.log('💡 firebase-service-account.json ファイルがプロジェクトルートに必要です');
      process.exit(1);
    }
  }
}

// プレミアムユーザーを作成
async function createPremiumUser() {
  const userEmail = 'premium@gtovantage.com';
  const userPassword = 'RsiKD76'; // AuthContext.tsx で定義されているパスワード
  const displayName = 'Premium User';

  try {
    console.log('🔄 プレミアムユーザー作成開始...');

    // ユーザーが既に存在するかチェック
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(userEmail);
      console.log('ℹ️ ユーザーは既に存在しています:', userEmail);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // ユーザーが存在しない場合は作成
        console.log('🔄 新しいユーザーを作成中...');
        userRecord = await admin.auth().createUser({
          email: userEmail,
          password: userPassword,
          displayName: displayName,
          emailVerified: true, // プレミアムユーザーはメール認証済みとする
        });
        console.log('✅ ユーザー作成完了:', userRecord.uid);
      } else {
        throw error;
      }
    }

    // Firestoreにプレミアムユーザー情報を保存
    const firestore = admin.firestore();
    const userDocRef = firestore.collection('users').doc(userRecord.uid);

    const premiumUserData = {
      email: userEmail,
      displayName: displayName,
      subscriptionStatus: 'premium',
      subscriptionExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      practiceCount: 0,
      emailVerified: true,
      isMasterUser: false,
      isTestAccount: true, // テストアカウントフラグ
    };

    await userDocRef.set(premiumUserData, { merge: true });
    console.log('✅ Firestoreにプレミアムユーザーデータを保存しました');

    // Custom Claims を設定（プレミアム権限）
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      subscriptionStatus: 'premium',
      isMasterUser: false,
      isTestAccount: true
    });
    console.log('✅ Custom Claims を設定しました');

    console.log('\n🎉 プレミアムユーザー作成完了!');
    console.log('📧 メールアドレス:', userEmail);
    console.log('🔑 パスワード:', userPassword);
    console.log('💎 ステータス: premium');
    console.log('📅 有効期限: 1年後');

  } catch (error) {
    console.error('❌ プレミアムユーザー作成エラー:', error);
  }
}

// メイン実行
async function main() {
  try {
    initializeFirebaseAdmin();
    await createPremiumUser();
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error);
  } finally {
    process.exit(0);
  }
}

// 直接実行された場合
if (require.main === module) {
  main();
}

module.exports = { createPremiumUser };

#!/usr/bin/env node

/**
 * テスト用アカウントの情報と作成方法
 */

console.log('🔐 GTO Vantage テスト用アカウント情報');
console.log('=====================================');
console.log('');

console.log('1. 📱 マスターアカウント (最高権限)');
console.log('   メール: admin@gtovantage.com');
console.log('   パスワード: Acs@ef3UR');
console.log('   権限: 全機能利用可能、管理者権限');
console.log('');

console.log('2. 💎 プレミアムアカウント (テスト用)');
console.log('   メール: premium@gtovantage.com');
console.log('   パスワード: RsiKD76');
console.log('   権限: 全スタックサイズ、無制限プラクティス');
console.log('');

console.log('3. 🆓 フリーアカウント (テスト用)');
console.log('   メール: test@gtovantage.com');
console.log('   パスワード: test123');
console.log('   権限: 20BBのみ、50回制限');
console.log('');

console.log('📋 アカウント作成方法:');
console.log('');
console.log('方法1: アプリ内新規登録');
console.log('  → http://localhost:3000/register');
console.log('  → 上記メール・パスワードで登録');
console.log('');
console.log('方法2: Firebase Console');
console.log('  → https://console.firebase.google.com/project/gtovantage-e180c');
console.log('  → Authentication > Users > Add user');
console.log('');
console.log('方法3: HTMLファイル (プレミアムのみ)');
console.log('  → file:///Users/kensuke/Desktop/gtovantage/create-premium-user.html');
console.log('');

console.log('🚀 現在の開発サーバー:');
console.log('  → http://localhost:3000');
console.log('');

console.log('🔍 デバッグ方法:');
console.log('  1. ブラウザのF12でコンソールを開く');
console.log('  2. ログイン試行時のログを確認');
console.log('  3. Firebase エラーコードを確認');
console.log('');

console.log('💡 トラブルシューティング:');
console.log('  - Firebaseの設定が正しいか確認');
console.log('  - インターネット接続を確認');
console.log('  - ブラウザのキャッシュをクリア');
console.log('  - 別のブラウザで試行');

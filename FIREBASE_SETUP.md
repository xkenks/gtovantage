# 🔥 Firebase セットアップガイド

## 📋 ステップ1: Firebaseプロジェクト作成

1. **Firebase Console** にアクセス
   ```
   https://console.firebase.google.com/
   ```

2. **新しいプロジェクトを作成**
   - プロジェクト名: `gtovantage` (または任意)
   - Google Analytics: 有効（推奨）

3. **ウェブアプリを追加**
   - アプリ名: `GTO Vantage Web`
   - Firebase Hosting: チェック（推奨）

## 🔧 ステップ2: Authentication設定

1. **Authentication** メニューに移動
2. **Sign-in method** タブを選択
3. **メール/パスワード** を有効化
4. **メールリンク（パスワードなしでログイン）** も有効化（推奨）

## 📧 ステップ3: メール設定

1. **Authentication > Templates** に移動
2. **メールアドレスの確認** テンプレートをカスタマイズ
   ```
   件名: 【GTO Vantage】メールアドレスの確認
   内容: カスタムメッセージ
   ```

## 🔑 ステップ4: 設定情報の取得

1. **プロジェクト設定** (⚙️アイコン) に移動
2. **全般** タブで設定情報をコピー
3. `src/lib/firebase.ts` の設定を更新

## 🛠️ ステップ5: 環境変数設定

`.env.local` ファイルを作成（推奨）:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

## ✅ 完了後の更新手順

1. Firebase設定情報を `src/lib/firebase.ts` に更新
2. 環境変数ファイル作成（オプション）
3. `src/app/layout.tsx` でAuthProvider切り替え
4. テスト実行

---

**🚨 重要**: 
- API キーなどの機密情報は `.env.local` に保存
- `.env.local` は `.gitignore` に含まれることを確認
- 本番環境では環境変数を適切に設定

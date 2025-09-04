# Firebase Console でプレミアムユーザーを作成する手順

## 方法1: Firebase Console (推奨)

### 1. Firebase Console にアクセス
```
https://console.firebase.google.com/
```

### 2. プロジェクト選択
- `gtovantage-e180c` プロジェクトを選択

### 3. Authentication でユーザー作成
1. 左メニューから「Authentication」を選択
2. 「Users」タブをクリック
3. 「Add user」ボタンをクリック
4. 以下の情報を入力：
   - **Email**: `premium@gtovantage.com`
   - **Password**: `RsiKD76`
5. 「Add user」をクリック

### 4. Firestore でユーザーデータ作成
1. 左メニューから「Firestore Database」を選択
2. 「Start collection」をクリック
3. Collection ID: `users`
4. Document ID: (作成されたユーザーのUID)
5. 以下のフィールドを追加：

```json
{
  "email": "premium@gtovantage.com",
  "displayName": "Premium User",
  "subscriptionStatus": "premium",
  "subscriptionExpiry": "2025-12-31T23:59:59.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "practiceCount": 0,
  "emailVerified": true,
  "isMasterUser": false,
  "isTestAccount": true
}
```

## 方法2: 開発サーバーから直接登録

アプリケーションの新規登録機能を使用して `premium@gtovantage.com` を登録し、
その後手動でFirestoreのサブスクリプションステータスを変更する。

## ログイン情報
- **メール**: premium@gtovantage.com
- **パスワード**: RsiKD76

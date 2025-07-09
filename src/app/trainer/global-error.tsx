'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('グローバルエラーが発生しました:', error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          textAlign: 'center',
          padding: '20px',
          backgroundColor: '#f8f9fa'
        }}>
          <h1 style={{ color: '#e53e3e', marginBottom: '16px' }}>
            致命的なエラーが発生しました
          </h1>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>
            申し訳ありませんが、アプリケーションに重大な問題が発生しました。
          </p>
          <p style={{ color: '#718096', marginBottom: '24px' }}>
            {error.message || 'エラーの詳細は開発者コンソールを確認してください。'}
          </p>
          <button
            onClick={reset}
            style={{
              backgroundColor: '#3182ce',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 20px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            アプリケーションをリセット
          </button>
        </div>
      </body>
    </html>
  );
} 
'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
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
      <h1 style={{ 
        fontSize: '48px', 
        fontWeight: 'bold',
        color: '#3182ce',
        marginBottom: '16px'
      }}>
        404
      </h1>
      <h2 style={{ 
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '16px'
      }}>
        ページが見つかりません
      </h2>
      <p style={{ 
        color: '#718096',
        maxWidth: '500px',
        marginBottom: '24px'
      }}>
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <Link href="/" style={{
        backgroundColor: '#3182ce',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '4px',
        padding: '10px 20px',
        fontSize: '16px'
      }}>
        ホームに戻る
      </Link>
    </div>
  );
} 
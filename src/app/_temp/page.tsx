'use client';

import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

// テスト用コンポーネント

// サンプルコンポーネント（このコードを独自のコンポーネントに置き換えてください）
const TestComponent = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ textAlign: 'center' }}>
      <h2>カウンターテスト</h2>
      <p>カウント: {count}</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          backgroundColor: '#4CAF50',
          border: 'none',
          color: 'white',
          padding: '10px 20px',
          textAlign: 'center',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '16px',
          margin: '4px 2px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      >
        増加
      </button>
      
      <button
        onClick={() => setCount(0)}
        style={{
          backgroundColor: '#f44336',
          border: 'none',
          color: 'white',
          padding: '10px 20px',
          textAlign: 'center',
          textDecoration: 'none',
          display: 'inline-block',
          fontSize: '16px',
          margin: '4px 2px',
          cursor: 'pointer',
          borderRadius: '4px'
        }}
      >
        リセット
      </button>
    </div>
  );
};


export default function TestPage() {
  return (
    <ChakraProvider>
      <div style={{ 
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{ 
          fontSize: '24px',
          marginBottom: '20px',
          borderBottom: '1px solid #eaeaea',
          paddingBottom: '10px'
        }}>
          コンポーネントテスト
        </h1>
        
        <div style={{ 
          border: '1px dashed #ccc',
          padding: '20px',
          borderRadius: '5px',
          backgroundColor: '#f9f9f9'
        }}>
          <TestComponent />
        </div>
        
        <div style={{ 
          marginTop: '20px',
          padding: '10px',
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          <p>テスト時刻: 2025/6/6 23:14:25</p>
        </div>
      </div>
    </ChakraProvider>
  );
}

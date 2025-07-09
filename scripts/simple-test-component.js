#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// プロジェクトディレクトリ
const projectDir = path.resolve('/Users/kensuke/Desktop/gto-vantage');
const srcDir = path.join(projectDir, 'src');
const tempDir = path.join(srcDir, 'app', '_temp');
const testFile = path.join(tempDir, 'page.tsx');

// ディレクトリがなければ作成
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// コンポーネントのテストページを作成
function createTestPage(componentCode) {
  const testPageContent = `'use client';

import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';

// テスト用コンポーネント
${componentCode}

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
          <p>テスト時刻: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </ChakraProvider>
  );
}
`;

  fs.writeFileSync(testFile, testPageContent);
  console.log(`✅ テストページを作成しました: ${testFile}`);
}

// サンプルコンポーネントを作成
function createSampleComponent() {
  return `
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
`;
}

// ブラウザでテストページを開く
function openTestPage() {
  const url = 'http://localhost:3000/_temp';
  console.log(`🌐 ブラウザでテストページを開きます: ${url}`);
  
  try {
    let command;
    switch (process.platform) {
      case 'darwin': // macOS
        command = `open ${url}`;
        break;
      case 'win32': // Windows
        command = `start ${url}`;
        break;
      default: // Linux
        command = `xdg-open ${url}`;
        break;
    }
    
    execSync(command);
  } catch (error) {
    console.error('❌ ブラウザを開く際にエラーが発生しました:', error.message);
  }
}

// メイン処理
function main() {
  console.log('🧪 簡易コンポーネントテスターを開始します...');
  
  // サンプルコンポーネントを作成
  const sampleComponent = createSampleComponent();
  
  // テストページを作成
  createTestPage(sampleComponent);
  
  console.log(`
===============================================
🚀 使用方法:
1. 開発サーバーが起動していることを確認してください
2. ${testFile} を開いて TestComponent を編集します
3. 保存すると変更が自動的に反映されます
4. ブラウザでテストページを確認: http://localhost:3000/_temp
===============================================
`);

  // ブラウザでテストページを開く
  openTestPage();
}

main(); 
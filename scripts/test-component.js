#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// プロジェクトディレクトリ
const projectDir = path.resolve('/Users/kensuke/Desktop/gto-vantage');
const srcDir = path.join(projectDir, 'src');
const componentsDir = path.join(srcDir, 'components');
const appDir = path.join(srcDir, 'app');
const testDir = path.join(projectDir, 'test');

// テスト用ディレクトリが存在しない場合は作成
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// コンソール入力用のインターフェース
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// テスト対象のコンポーネント一覧を取得
function getComponentList() {
  const components = [];
  
  // componentsディレクトリからコンポーネントを収集
  if (fs.existsSync(componentsDir)) {
    fs.readdirSync(componentsDir)
      .filter(file => file.endsWith('.tsx') || file.endsWith('.jsx'))
      .forEach(file => {
        components.push({
          name: path.basename(file, path.extname(file)),
          path: path.join(componentsDir, file),
          type: 'component'
        });
      });
  }
  
  // appディレクトリからページコンポーネントを収集
  if (fs.existsSync(appDir)) {
    const collectPages = (dir, prefix = '') => {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
          collectPages(fullPath, `${prefix}/${dirent.name}`);
        } else if (dirent.name === 'page.tsx' || dirent.name === 'page.jsx') {
          components.push({
            name: `Page${prefix}`,
            path: fullPath,
            type: 'page',
            route: prefix || '/'
          });
        }
      });
    };
    
    collectPages(appDir);
  }
  
  return components;
}

// テスト用のコンポーネントを作成
function createTestComponent(component) {
  console.log(`🧪 ${component.name}のテスト用コンポーネントを作成します...`);
  
  const testComponentPath = path.join(testDir, `${component.name}Test.tsx`);
  const componentImportPath = path.relative(testDir, component.path)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '');
  
  const testComponentContent = `'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// 動的インポートでSSRを無効化
const ${component.name} = dynamic(
  () => import('${componentImportPath}'),
  { ssr: false }
);

export default function ${component.name}Test() {
  return (
    <div className="test-container" style={{ 
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
        ${component.name} テスト
      </h1>
      
      <div style={{ 
        border: '1px dashed #ccc',
        padding: '20px',
        borderRadius: '5px',
        backgroundColor: '#f9f9f9'
      }}>
        <${component.name} />
      </div>
      
      <div style={{ 
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <p>コンポーネントパス: ${component.path}</p>
        <p>テスト時刻: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
`;

  fs.writeFileSync(testComponentPath, testComponentContent);
  console.log(`✅ ${testComponentPath}を作成しました`);
  
  // テストページを作成
  const testPagePath = path.join(appDir, 'test', component.name.toLowerCase(), 'page.tsx');
  const testPageDir = path.dirname(testPagePath);
  
  if (!fs.existsSync(testPageDir)) {
    fs.mkdirSync(testPageDir, { recursive: true });
  }
  
  const testPageContent = `'use client';

import ${component.name}Test from '../../../../test/${component.name}Test';

export default function TestPage() {
  return <${component.name}Test />;
}
`;

  fs.writeFileSync(testPagePath, testPageContent);
  console.log(`✅ テストページを作成しました: /test/${component.name.toLowerCase()}`);
  
  return `/test/${component.name.toLowerCase()}`;
}

// コンポーネントを選択してテスト
function selectComponentForTest() {
  const components = getComponentList();
  
  if (components.length === 0) {
    console.log('❌ テスト可能なコンポーネントが見つかりませんでした');
    rl.close();
    return;
  }
  
  console.log('\n=== テスト可能なコンポーネント ===');
  components.forEach((component, index) => {
    console.log(`${index + 1}. ${component.name} (${component.type})`);
  });
  
  rl.question('\n📝 テストするコンポーネントの番号を入力してください: ', (answer) => {
    const index = parseInt(answer) - 1;
    
    if (isNaN(index) || index < 0 || index >= components.length) {
      console.log('❌ 無効な番号です。再試行してください。');
      selectComponentForTest();
      return;
    }
    
    const component = components[index];
    const testUrl = createTestComponent(component);
    
    console.log(`\n🌐 ブラウザで以下のURLを開いてテストしてください: http://localhost:3000${testUrl}`);
    
    // 開発サーバーが既に起動している場合は、ブラウザを開く
    const openBrowserCommand = process.platform === 'darwin' 
      ? `open http://localhost:3000${testUrl}`
      : process.platform === 'win32'
        ? `start http://localhost:3000${testUrl}`
        : `xdg-open http://localhost:3000${testUrl}`;
    
    rl.question('\n🚀 ブラウザでテストページを開きますか？ (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        spawn(openBrowserCommand, [], { shell: true });
      }
      
      rl.question('\n🔄 別のコンポーネントをテストしますか？ (y/n): ', (answer) => {
        if (answer.toLowerCase() === 'y') {
          selectComponentForTest();
        } else {
          console.log('👋 テストを終了します');
          rl.close();
        }
      });
    });
  });
}

// メイン処理
function main() {
  console.log('🧪 GTO Vantageコンポーネントテスターを開始します...');
  selectComponentForTest();
}

main(); 
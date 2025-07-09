#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// プロジェクトディレクトリ
const projectDir = path.resolve('/Users/kensuke/Desktop/gto-vantage');
const srcDir = path.join(projectDir, 'src');
const appDir = path.join(srcDir, 'app');

// 問題のファイルパス
const problematicPaths = [
  path.join(appDir, 'loading.tsx/loading.tsx'),
  path.join(appDir, 'error.tsx/error.tsx'),
  path.join(appDir, 'trainer/global-error.tsx/global-error.tsx'),
  path.join(appDir, 'trainer/not-found.tsx/not-found.tsx')
];

// 正しいファイルパス
const correctPaths = [
  path.join(appDir, 'loading.tsx'),
  path.join(appDir, 'error.tsx'),
  path.join(appDir, 'trainer/global-error.tsx'),
  path.join(appDir, 'trainer/not-found.tsx')
];

// ディレクトリ構造を修正する関数
function fixDirectoryStructure() {
  console.log('🔧 ディレクトリ構造の修正を開始します...');
  
  // 問題のパスを確認して削除
  problematicPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`🗑️ 問題のファイルを削除します: ${filePath}`);
      try {
        fs.rmSync(filePath, { recursive: true, force: true });
      } catch (error) {
        console.error(`❌ 削除中にエラーが発生しました: ${error.message}`);
      }
    }
  });
  
  // 正しいファイルパスを確認して、存在しない場合は空のファイルを作成
  correctPaths.forEach(filePath => {
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      console.log(`📁 ディレクトリを作成します: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      console.log(`📄 空のファイルを作成します: ${filePath}`);
      const fileContent = `'use client';\n\nexport default function ${path.basename(filePath, '.tsx')}() {\n  return null;\n}\n`;
      fs.writeFileSync(filePath, fileContent);
    }
  });
  
  console.log('✅ ディレクトリ構造の修正が完了しました');
}

// Next.jsのバージョンを14.0.1にダウングレードする関数
function downgradeNextJs() {
  console.log('🔄 Next.jsのバージョンを14.0.1にダウングレードします...');
  
  try {
    execSync('npm install next@14.0.1 react react-dom --legacy-peer-deps', {
      cwd: projectDir,
      stdio: 'inherit'
    });
    console.log('✅ Next.jsのダウングレードが完了しました');
  } catch (error) {
    console.error('❌ Next.jsのダウングレード中にエラーが発生しました');
  }
}

// .nextディレクトリをクリアする関数
function clearNextCache() {
  console.log('🧹 .nextディレクトリをクリアしています...');
  
  const nextCacheDir = path.join(projectDir, '.next');
  if (fs.existsSync(nextCacheDir)) {
    try {
      fs.rmSync(nextCacheDir, { recursive: true, force: true });
      console.log('✅ .nextディレクトリのクリアが完了しました');
    } catch (error) {
      console.error(`❌ .nextディレクトリのクリア中にエラーが発生しました: ${error.message}`);
    }
  } else {
    console.log('ℹ️ .nextディレクトリは存在しません');
  }
}

// 必要なパッケージをインストールする関数
function installRequiredPackages() {
  console.log('📦 必要なパッケージをインストールしています...');
  
  try {
    execSync('npm install @chakra-ui/react @emotion/react @emotion/styled framer-motion --legacy-peer-deps', {
      cwd: projectDir,
      stdio: 'inherit'
    });
    console.log('✅ パッケージのインストールが完了しました');
  } catch (error) {
    console.error('❌ パッケージのインストール中にエラーが発生しました');
  }
}

// メイン処理
function main() {
  console.log('🚀 エラー修正スクリプトを開始します...');
  
  // ディレクトリ構造を修正
  fixDirectoryStructure();
  
  // Next.jsのバージョンを確認して、必要に応じてダウングレード
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`📦 現在のNext.jsバージョン: ${packageJson.dependencies.next}`);
    
    if (packageJson.dependencies.next !== '14.0.1') {
      downgradeNextJs();
    }
    
    // 必要なパッケージをインストール
    installRequiredPackages();
  }
  
  // .nextディレクトリをクリア
  clearNextCache();
  
  console.log('🎉 エラー修正が完了しました！自動テスト環境を開始します。');
}

main(); 
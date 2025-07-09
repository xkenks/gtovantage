#!/usr/bin/env node

const { spawn } = require('child_process');
const { watch } = require('fs');
const path = require('path');
const fs = require('fs');

// プロジェクトディレクトリ
const projectDir = path.resolve('/Users/kensuke/Desktop/gto-vantage');
const srcDir = path.join(projectDir, 'src');
const appDir = path.join(srcDir, 'app');
const componentsDir = path.join(srcDir, 'components');

// 監視対象のディレクトリとファイル
const watchDirs = [
  componentsDir,
  appDir
];

// プロセス変数
let devProcess = null;
let watchers = [];
let port = 3000;

// 開発サーバーを起動する関数
function startDevServer() {
  console.log('🚀 開発サーバーを起動中...');
  
  if (devProcess) {
    console.log('🛑 既存のプロセスを終了します...');
    devProcess.kill('SIGTERM');
  }
  
  // キャッシュをクリア
  try {
    const nextCacheDir = path.join(projectDir, '.next');
    if (fs.existsSync(nextCacheDir)) {
      console.log('🧹 .nextディレクトリをクリアしています...');
      fs.rmSync(nextCacheDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('❌ キャッシュクリア中にエラーが発生しました:', error.message);
  }
  
  // 環境変数を設定してブラウザを自動オープン
  const env = Object.assign({}, process.env);
  env.BROWSER = 'none'; // 開発サーバーのデフォルトブラウザ起動を無効化
  
  // 開発サーバーを起動
  devProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectDir,
    stdio: 'inherit',
    shell: true,
    env
  });
  
  devProcess.on('error', (error) => {
    console.error('❌ 開発サーバーの起動に失敗しました:', error.message);
  });
  
  devProcess.on('exit', (code, signal) => {
    if (code !== null) {
      console.log(`🛑 開発サーバーが終了しました (コード: ${code})`);
    } else if (signal) {
      console.log(`🛑 開発サーバーが終了しました (シグナル: ${signal})`);
    }
  });
  
  // サーバー起動後、ブラウザで開く
  setTimeout(() => {
    openBrowser();
  }, 5000); // 5秒後にブラウザを開く
  
  console.log('✅ 開発サーバーが起動しました。ファイルの変更を監視しています...');
}

// ブラウザでURLを開く関数
function openBrowser() {
  const url = `http://localhost:${port}`;
  console.log(`🌐 ブラウザで開いています: ${url}`);
  
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
  
  try {
    spawn(command, [], { shell: true });
  } catch (error) {
    console.error('❌ ブラウザを開く際にエラーが発生しました:', error.message);
  }
}

// ファイルの変更を監視する関数
function watchForChanges() {
  // 既存のウォッチャーをクリア
  if (watchers.length > 0) {
    watchers.forEach(watcher => watcher.close());
    watchers = [];
  }
  
  watchDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    console.log(`👀 ディレクトリを監視中: ${dir}`);
    
    const watcher = watch(dir, { recursive: true }, (eventType, filename) => {
      if (filename) {
        console.log(`🔄 ${filename} が変更されました。サーバーを再起動します...`);
        startDevServer();
      }
    });
    
    watchers.push(watcher);
  });
  
  process.on('SIGINT', () => {
    console.log('👋 監視を終了します...');
    watchers.forEach(watcher => watcher.close());
    if (devProcess) {
      devProcess.kill('SIGTERM');
    }
    process.exit();
  });
}

// テスト情報を表示する関数
function showTestInfo() {
  console.log('\n===================================');
  console.log('🧪 テスト環境情報');
  console.log('===================================');
  console.log(`📂 プロジェクトディレクトリ: ${projectDir}`);
  console.log(`🌐 アクセスURL: http://localhost:${port}`);
  console.log(`👀 監視中のディレクトリ: ${watchDirs.join(', ')}`);
  console.log('===================================\n');
}

// メイン処理
function main() {
  console.log('🚀 GTOプロジェクト自動テスト環境を開始します...');
  
  // Next.jsのバージョンを確認中
  console.log('🔄 Next.jsのバージョンを確認中...');
  
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log(`📦 現在のNext.jsバージョン: ${packageJson.dependencies.next}`);
  }
  
  // ポート設定
  port = 3000; // デフォルトポート
  console.log(`🔍 ポート ${port} を使用します。別のポートが使用されている場合は自動的に変更されます。`);
  
  startDevServer();
  watchForChanges();
  
  // テスト情報を表示
  setTimeout(() => {
    showTestInfo();
  }, 2000);
}

main(); 
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// GTOデータファイルの型定義
interface GTODataFile {
  filename: string;
  position: string;
  stackSize: string;
  scenario: string;
  size: number;
  modified: string;
}

export default function GTODataManagementPage() {
  const [files, setFiles] = useState<GTODataFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // ページ読み込み時にデータを取得
  useEffect(() => {
    fetchGTODataFiles();
  }, []);
  
  // GTOデータファイルの一覧を取得
  const fetchGTODataFiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/gto/upload');
      const data = await response.json();
      
      if (data.files) {
        setFiles(data.files);
      } else {
        setFiles([]);
      }
    } catch (error) {
      console.error('GTOデータの取得に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ファイルアップロードハンドラー
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    const fileInput = event.target;
    if (!fileInput.files || fileInput.files.length === 0) {
      return;
    }
    
    const file = fileInput.files[0];
    
    // ファイル形式の検証
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      setUploadResult({
        success: false,
        error: '対応していないファイル形式です。CSVまたはJSONファイルをアップロードしてください。'
      });
      return;
    }
    
    // フォームデータの作成
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const response = await fetch('/api/gto/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setUploadResult({
          success: true,
          message: `${result.filename} を正常にアップロードしました。${result.handCount}個のハンドデータを含みます。`
        });
        // ファイル一覧を更新
        fetchGTODataFiles();
      } else {
        setUploadResult({
          success: false,
          error: result.error || 'アップロードに失敗しました。'
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        error: 'サーバーとの通信に失敗しました。'
      });
    } finally {
      setIsUploading(false);
      // フォームをリセット
      fileInput.value = '';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">GTOデータ管理</h1>
          <Link href="/trainer" className="text-blue-400 hover:text-blue-300">
            ← トレーナーに戻る
          </Link>
        </div>
        
        {/* アップロードセクション */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">PioSolverデータのアップロード</h2>
          
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              PioSolverからエクスポートしたCSVファイルまたはJSONファイルをアップロードしてください。
              ファイル名は「ポジション_スタックサイズ_シナリオ.csv」の形式を推奨します（例: BTN_100BB_openraise.csv）。
            </p>
            
            <div className="flex flex-col md:flex-row items-center gap-4">
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg cursor-pointer">
                ファイルを選択
                <input
                  type="file"
                  accept=".csv,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </label>
              
              {isUploading && (
                <div className="text-gray-300 flex items-center">
                  <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  アップロード中...
                </div>
              )}
            </div>
            
            {uploadResult && (
              <div className={`mt-4 p-3 rounded-lg ${uploadResult.success ? 'bg-green-800' : 'bg-red-800'}`}>
                {uploadResult.success ? uploadResult.message : uploadResult.error}
              </div>
            )}
          </div>
          
          <div className="text-sm text-gray-400">
            <h3 className="font-semibold mb-2">対応フォーマット:</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>PioSolverのCSVエクスポート（ハンド毎のアクション頻度とEV）</li>
              <li>標準的なGTOソルバーのJSONフォーマット</li>
            </ul>
          </div>
        </div>
        
        {/* データ一覧セクション */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">利用可能なGTOデータ</h2>
          
          {isLoading ? (
            <div className="text-center py-8">
              <svg className="animate-spin h-8 w-8 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              データを読み込み中...
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              GTOデータがありません。PioSolverのCSVファイルをアップロードしてください。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ファイル名</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">ポジション</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">スタック</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">シナリオ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">サイズ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">更新日</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {files.map((file, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{file.filename}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{file.position || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{file.stackSize || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{file.scenario || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{formatFileSize(file.size)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">{formatDate(file.modified)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ファイルサイズのフォーマット（バイト → 読みやすい単位）
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 日付のフォーマット
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
} 
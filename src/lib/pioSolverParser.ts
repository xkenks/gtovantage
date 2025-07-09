'use client';

import { ActionFrequency, HandGTOStrategy, PositionStrategy } from './gtoDatabase';

/**
 * PioSolverのCSVエクスポートフォーマットを解析する
 * PioSolverのファイル構造：
 * - 1行目: ヘッダー情報（カラム名）
 * - 2行目以降: ハンド情報とアクション頻度
 */
export function parsePioSolverCSV(csvContent: string): PositionStrategy | null {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return null;
    
    // ヘッダー情報を解析
    const header = lines[0].split(',');
    
    // 戦略情報を初期化
    const positionStrategy: PositionStrategy = {
      position: '',  // これらはCSVから解析するか、ファイル名から抽出する必要がある
      stackSize: '',
      scenario: '',
      strategies: []
    };
    
    // CSVの各行を処理
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length < header.length) continue;
      
      // ハンドタイプを取得（通常は最初のカラム）
      const handType = columns[0].trim();
      
      // アクション頻度を解析
      const actionFrequencies: ActionFrequency[] = [];
      
      // PioSolverのCSVは通常、Raise頻度、Call頻度、Fold頻度といった列を含む
      const raiseFreq = parseFloat(columns[1] || '0');
      const callFreq = parseFloat(columns[2] || '0');
      const foldFreq = parseFloat(columns[3] || '0');
      const raiseEV = parseFloat(columns[4] || '0');
      const callEV = parseFloat(columns[5] || '0');
      const foldEV = parseFloat(columns[6] || '0');
      
      // ベットサイズが指定されている場合の処理
      const raiseSizing: number[] = [];
      if (columns.length > 7) {
        const sizingStr = columns[7].trim();
        if (sizingStr) {
          const sizes = sizingStr.split('/').map(s => parseFloat(s.trim()));
          raiseSizing.push(...sizes.filter(s => !isNaN(s)));
        }
      }
      
      // アクション頻度をActionFrequencyオブジェクトに変換
      if (raiseFreq > 0 || raiseEV !== 0) {
        actionFrequencies.push({
          action: 'RAISE',
          frequency: raiseFreq,
          ev: raiseEV,
          sizing: raiseSizing.length > 0 ? raiseSizing : undefined
        });
      }
      
      if (callFreq > 0 || callEV !== 0) {
        actionFrequencies.push({
          action: 'CALL',
          frequency: callFreq,
          ev: callEV
        });
      }
      
      if (foldFreq > 0 || foldEV !== 0) {
        actionFrequencies.push({
          action: 'FOLD',
          frequency: foldFreq,
          ev: foldEV
        });
      }
      
      // ハンド戦略をデータベースに追加
      positionStrategy.strategies.push({
        handType,
        actionFrequencies
      });
    }
    
    return positionStrategy;
  } catch (error) {
    console.error('PioSolver CSVの解析に失敗しました:', error);
    return null;
  }
}

/**
 * PioSolverのファイル名から戦略の情報を抽出する
 * 例: "BTN_100BB_vs3bet.csv" => { position: "BTN", stackSize: "100BB", scenario: "vs3bet" }
 */
export function extractStrategyInfoFromFilename(filename: string): { 
  position: string;
  stackSize: string;
  scenario: string;
} {
  // ファイル名からパターンを抽出する正規表現
  const regex = /([A-Z]+)_(\d+BB)_(\w+)\.csv/i;
  const match = filename.match(regex);
  
  if (match && match.length >= 4) {
    return {
      position: match[1],
      stackSize: match[2],
      scenario: match[3]
    };
  }
  
  // デフォルト値を返す
  return {
    position: 'UNKNOWN',
    stackSize: '100BB',
    scenario: 'openraise'
  };
}

/**
 * PioSolverのJSONエクスポートフォーマットを解析する
 * これはPioSolverの新しいバージョン向け
 */
export function parsePioSolverJSON(jsonContent: string): PositionStrategy | null {
  try {
    const data = JSON.parse(jsonContent);
    
    // 戦略情報を初期化
    const positionStrategy: PositionStrategy = {
      position: data.position || 'UNKNOWN',
      stackSize: data.stackSize || '100BB',
      scenario: data.scenario || 'openraise',
      strategies: []
    };
    
    // ハンド戦略を処理
    if (data.strategies && Array.isArray(data.strategies)) {
      for (const handStrategy of data.strategies) {
        const handType = handStrategy.hand;
        const actionFrequencies: ActionFrequency[] = [];
        
        // アクション頻度を処理
        if (handStrategy.actions && Array.isArray(handStrategy.actions)) {
          for (const action of handStrategy.actions) {
            actionFrequencies.push({
              action: action.type.toUpperCase(), // 'raise', 'call', 'fold' などを大文字に
              frequency: action.frequency,
              ev: action.ev,
              sizing: action.sizing
            });
          }
        }
        
        positionStrategy.strategies.push({
          handType,
          actionFrequencies
        });
      }
    }
    
    return positionStrategy;
  } catch (error) {
    console.error('PioSolver JSONの解析に失敗しました:', error);
    return null;
  }
} 
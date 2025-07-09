import { NextRequest, NextResponse } from 'next/server';
import { extractStrategyInfoFromFilename, parsePioSolverCSV, parsePioSolverJSON } from '@/lib/pioSolverParser';
import fs from 'fs';
import path from 'path';

// GTOデータをアップロードするAPIエンドポイント
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 400 });
    }
    
    // ファイルの拡張子をチェック
    const filename = file.name;
    const fileExtension = path.extname(filename).toLowerCase();
    
    // ファイルの内容を文字列として取得
    const arrayBuffer = await file.arrayBuffer();
    const fileContent = Buffer.from(arrayBuffer).toString('utf-8');
    
    // ファイル形式に応じたパーサーを使用
    let positionStrategy;
    if (fileExtension === '.csv') {
      positionStrategy = parsePioSolverCSV(fileContent);
      
      // ファイル名から戦略情報を抽出
      const strategyInfo = extractStrategyInfoFromFilename(filename);
      if (positionStrategy && strategyInfo) {
        positionStrategy.position = strategyInfo.position;
        positionStrategy.stackSize = strategyInfo.stackSize;
        positionStrategy.scenario = strategyInfo.scenario;
      }
    } else if (fileExtension === '.json') {
      positionStrategy = parsePioSolverJSON(fileContent);
    } else {
      return NextResponse.json({ error: '対応していないファイル形式です。CSVまたはJSONファイルをアップロードしてください。' }, { status: 400 });
    }
    
    if (!positionStrategy) {
      return NextResponse.json({ error: 'ファイルの解析に失敗しました' }, { status: 400 });
    }
    
    // 保存用ディレクトリを作成
    const dataDir = path.join(process.cwd(), 'data', 'gto');
    fs.mkdirSync(dataDir, { recursive: true });
    
    // 戦略情報を使ってファイル名を生成
    const saveFilename = `${positionStrategy.position}_${positionStrategy.stackSize}_${positionStrategy.scenario}.json`;
    const savePath = path.join(dataDir, saveFilename);
    
    // JSONとして保存
    fs.writeFileSync(savePath, JSON.stringify(positionStrategy, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'GTOデータを正常にアップロードしました',
      filename: saveFilename,
      position: positionStrategy.position,
      stackSize: positionStrategy.stackSize,
      scenario: positionStrategy.scenario,
      handCount: positionStrategy.strategies.length
    });
  } catch (error) {
    console.error('GTOデータのアップロードに失敗しました:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// 使用可能なGTOデータのリストを取得するAPIエンドポイント
export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data', 'gto');
    
    // ディレクトリが存在しない場合は作成
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      return NextResponse.json({ files: [] });
    }
    
    // ディレクトリ内のJSONファイルを取得
    const files = fs.readdirSync(dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        
        // ファイル名からメタデータを抽出
        const match = file.match(/([A-Z]+)_(\d+BB)_(\w+)\.json/i);
        let position = '', stackSize = '', scenario = '';
        
        if (match && match.length >= 4) {
          position = match[1];
          stackSize = match[2];
          scenario = match[3];
        }
        
        return {
          filename: file,
          position,
          stackSize,
          scenario,
          size: stats.size,
          modified: stats.mtime
        };
      });
    
    return NextResponse.json({ files });
  } catch (error) {
    console.error('GTOデータのリスト取得に失敗しました:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
} 
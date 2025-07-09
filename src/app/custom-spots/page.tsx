'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FaSave, FaSpinner, FaTimes } from 'react-icons/fa';

// カスタムパラメータの型
type CustomParameter = {
  name: string;
  value: string | number;
};

// シナリオの型
type CustomScenario = {
  id: string;
  name: string;
  position: string;
  action: string;
  stack: number;
  pot: number;
  customParameters: CustomParameter[];
  handEvaluation?: any;
  createdAt: Timestamp;
};

// SearchParamsを使用するコンポーネント
function CustomSpotsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, userProfile, loading } = useAuth();
  
  // URLからシナリオIDを取得（編集モードのとき）
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // フォームの状態
  const [name, setName] = useState('');
  const [position, setPosition] = useState('SB');
  const [action, setAction] = useState('OPEN');
  const [stack, setStack] = useState(100);
  const [pot, setPot] = useState(1.5);
  const [customParameters, setCustomParameters] = useState<CustomParameter[]>([]);
  const [newParamName, setNewParamName] = useState('');
  const [newParamValue, setNewParamValue] = useState('');
  
  // 状態管理
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 編集モードの場合、シナリオを読み込む
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setScenarioId(id);
      setIsEditing(true);
    }
  }, [searchParams]);
  
  // ユーザー情報とシナリオ情報の読み込み
  useEffect(() => {
    if (!loading) {
      if (!user) {
        // 未ログイン時はログインページへリダイレクト
        router.push('/auth');
        return;
      }
      
      if (isEditing && scenarioId && userProfile) {
        // 編集モードの場合、シナリオ情報を読み込む
        const scenario = userProfile.saved_scenarios?.find(s => s.id === scenarioId);
        
        if (scenario) {
          setName(scenario.name);
          setPosition(scenario.position);
          setAction(scenario.action);
          setStack(scenario.stack);
          setPot(scenario.pot || 1.5);
          setCustomParameters(scenario.customParameters || []);
        } else {
          setError('指定されたシナリオが見つかりませんでした。');
        }
      }
    }
  }, [loading, user, userProfile, isEditing, scenarioId, router]);
  
  // カスタムパラメータの追加
  const addCustomParameter = () => {
    if (!newParamName.trim()) {
      setError('パラメータ名を入力してください。');
      return;
    }
    
    // 数値の場合は数値型に変換
    const value = !isNaN(Number(newParamValue)) ? Number(newParamValue) : newParamValue;
    
    setCustomParameters([
      ...customParameters,
      { name: newParamName, value }
    ]);
    
    // 入力フィールドをクリア
    setNewParamName('');
    setNewParamValue('');
  };
  
  // カスタムパラメータの削除
  const removeCustomParameter = (index: number) => {
    setCustomParameters(customParameters.filter((_, i) => i !== index));
  };
  
  // Firestoreにシナリオを保存
  const saveScenarioToFirestore = async () => {
    if (!user) {
      setError('ログインが必要です。');
      return;
    }
    
    if (!name.trim()) {
      setError('シナリオ名を入力してください。');
      return;
    }
    
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setError('ユーザープロファイルが見つかりません。');
        setSaving(false);
        return;
      }
      
      // 新しいシナリオオブジェクト
      const newScenario: CustomScenario = {
        id: scenarioId || Date.now().toString(),
        name,
        position,
        action,
        stack,
        pot,
        customParameters,
        createdAt: Timestamp.now()
      };
      
      if (isEditing && scenarioId) {
        // 編集モードの場合、既存のシナリオを更新
        const userData = userDoc.data();
        const savedScenarios = userData.saved_scenarios || [];
        const updatedScenarios = savedScenarios.map((s: any) => 
          s.id === scenarioId ? newScenario : s
        );
        
        await updateDoc(userDocRef, {
          saved_scenarios: updatedScenarios
        });
        
        setSuccess('シナリオを更新しました。');
      } else {
        // 新規作成モードの場合、新しいシナリオを追加
        await updateDoc(userDocRef, {
          saved_scenarios: arrayUnion(newScenario)
        });
        
        setSuccess('シナリオを保存しました。');
      }
      
      // フォームをリセット（編集モードでない場合）
      if (!isEditing) {
        setName('');
        setPosition('SB');
        setAction('OPEN');
        setStack(100);
        setPot(1.5);
        setCustomParameters([]);
      }
    } catch (err) {
      console.error('シナリオ保存エラー:', err);
      setError('シナリオの保存中にエラーが発生しました。');
    } finally {
      setSaving(false);
    }
  };
  
  // 戻るボタンのハンドラ
  const handleBack = () => {
    router.push('/custom-spots/saved');
  };
  
  // ローディング中
  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-blue-600 text-white flex justify-between items-center">
            <h1 className="text-xl font-bold">
              {isEditing ? 'カスタムスポットを編集' : 'カスタムスポットを作成'}
            </h1>
            {isEditing && (
              <button 
                onClick={handleBack}
                className="px-3 py-1 bg-white text-blue-600 rounded hover:bg-blue-50 transition-colors"
              >
                保存済みスポットへ戻る
              </button>
            )}
          </div>
          
          <div className="p-6">
            {(error || success) && (
              <div className={`mb-6 p-4 rounded-md ${error ? 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>
                {error || success}
              </div>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); saveScenarioToFirestore(); }}>
              {/* シナリオ名 */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  シナリオ名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="例: SB vs BB 3bet pot"
                  required
                />
              </div>
              
              {/* ポジションとアクション */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ポジション
                  </label>
                  <select
                    id="position"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="input"
                  >
                    <option value="SB">SB (スモールブラインド)</option>
                    <option value="BB">BB (ビッグブラインド)</option>
                    <option value="BU">BU (ボタン)</option>
                    <option value="CO">CO (カットオフ)</option>
                    <option value="HJ">HJ (ハイジャック)</option>
                    <option value="LJ">LJ (ロージャック)</option>
                    <option value="UTG">UTG (アンダーザガン)</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="action" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    アクション
                  </label>
                  <select
                    id="action"
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    className="input"
                  >
                    <option value="OPEN">オープン</option>
                    <option value="3BET">3ベット</option>
                    <option value="4BET">4ベット</option>
                    <option value="CALL">コール</option>
                    <option value="CHECK">チェック</option>
                    <option value="BET">ベット</option>
                    <option value="RAISE">レイズ</option>
                  </select>
                </div>
              </div>
              
              {/* スタックとポット */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="stack" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    スタック (BB)
                  </label>
                  <input
                    type="number"
                    id="stack"
                    value={stack}
                    onChange={(e) => setStack(Number(e.target.value))}
                    min="1"
                    className="input"
                  />
                </div>
                
                <div>
                  <label htmlFor="pot" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ポットサイズ (BB)
                  </label>
                  <input
                    type="number"
                    id="pot"
                    value={pot}
                    onChange={(e) => setPot(Number(e.target.value))}
                    min="0.5"
                    step="0.5"
                    className="input"
                  />
                </div>
              </div>
              
              {/* カスタムパラメータ */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">カスタムパラメータ</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  特定のシナリオに固有のパラメータを追加できます。
                </p>
                
                {/* 既存のパラメータ一覧 */}
                {customParameters.length > 0 && (
                  <div className="mb-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">追加済みパラメータ</h4>
                    <ul className="space-y-2">
                      {customParameters.map((param, index) => (
                        <li 
                          key={index}
                          className="flex justify-between items-center p-2 bg-white dark:bg-gray-800 rounded shadow-sm"
                        >
                          <div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{param.name}:</span>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">{param.value}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeCustomParameter(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <FaTimes />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 新規パラメータ追加フォーム */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label htmlFor="newParamName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      パラメータ名
                    </label>
                    <input
                      type="text"
                      id="newParamName"
                      value={newParamName}
                      onChange={(e) => setNewParamName(e.target.value)}
                      className="input"
                      placeholder="例: ボードテクスチャ"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="newParamValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      値
                    </label>
                    <input
                      type="text"
                      id="newParamValue"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      className="input"
                      placeholder="例: ドライ"
                    />
                  </div>
                  
                  <button
                    type="button"
                    onClick={addCustomParameter}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    パラメータを追加
                  </button>
                </div>
              </div>
              
              {/* 送信ボタン */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md shadow-sm flex items-center disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      {isEditing ? 'スポットを更新' : 'スポットを保存'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// メインコンポーネント
export default function CustomSpotsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-700 dark:text-gray-300">読み込み中...</p>
        </div>
      </div>
    }>
      <CustomSpotsContent />
    </Suspense>
  );
} 
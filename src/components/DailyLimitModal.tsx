'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/FirebaseAuthContext';

interface DailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DailyLimitModal: React.FC<DailyLimitModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { subscriptionStatus } = useAuth();

  if (!isOpen) return null;

  // プランに応じたメッセージを設定
  const isFreePlan = subscriptionStatus === 'free';
  const limitMessage = isFreePlan ? '1日10回まで' : '1日50回まで';
  const planName = isFreePlan ? '無料プラン' : 'ライトプラン';

  const handleGoHome = () => {
    onClose();
    router.push('/');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl border border-gray-700">
        {/* ヘッダー */}
        <div className="p-6 text-center border-b border-gray-700">
          <div className="w-16 h-16 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">1日の練習上限に達しました</h2>
          <p className="text-gray-400 text-sm">
            {planName}では{limitMessage}練習が可能です。<br />
            明日になると再び練習できるようになります。
          </p>
        </div>

        {/* コンテンツ */}
        <div className="p-6">
          <div className="space-y-4">
            {/* アップグレードボタン */}
            <Link
              href="/subscription"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
              onClick={onClose}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              アップグレード
            </Link>

            {/* トップページに戻るボタン */}
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              トップページに戻る
            </button>
          </div>
        </div>

        {/* プレミアムプランの特典 */}
        <div className="p-6 bg-gray-800 rounded-b-2xl border-t border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-2">プレミアムプランの特典</h3>
          <ul className="text-xs text-gray-400 space-y-1">
            <li className="flex items-center gap-2">
              <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              無制限の練習回数
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              全スタックサイズ利用可能
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-3 w-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              高度な分析機能
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DailyLimitModal;

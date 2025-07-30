'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaEnvelope, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationEmail, user, isEmailVerified, isAuthenticated } = useAuth();
  
  // ログイン済みでメール確認済みのユーザーはトレーニングページにリダイレクト
  if (isAuthenticated && isEmailVerified) {
    router.push('/trainer/mtt');
    return null;
  }
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'success' | 'error' | 'invalid'>('idle');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const token = searchParams.get('token');

  useEffect(() => {
    // 既にメール確認済みの場合はリダイレクト
    if (isEmailVerified) {
      router.push('/trainer/mtt');
      return;
    }

    // トークンがある場合は自動的に確認を実行
    if (token) {
      handleVerification();
    }
  }, [token, isEmailVerified, router]);

  const handleVerification = async () => {
    if (!token) return;

    setIsVerifying(true);
    setVerificationStatus('idle');

    try {
      const success = await verifyEmail(token);
      
      if (success) {
        setVerificationStatus('success');
        // 3秒後にトレーナーページにリダイレクト
        setTimeout(() => {
          router.push('/trainer/mtt');
        }, 3000);
      } else {
        setVerificationStatus('error');
      }
    } catch (error) {
      setVerificationStatus('error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!user?.email) return;

    setIsResending(true);
    setResendStatus('idle');

    try {
      const success = await resendVerificationEmail(user.email);
      setResendStatus(success ? 'success' : 'error');
    } catch (error) {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  if (isEmailVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <FaCheckCircle className="text-green-400 text-6xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">メール確認済み</h1>
          <p className="text-gray-300 mb-4">既にメール確認が完了しています</p>
          <Link 
            href="/trainer/mtt"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            トレーニングを開始
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link 
              href="/"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
            >
              <FaArrowLeft className="text-sm" />
              トップページに戻る
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
              メールアドレス確認
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              アカウントを有効化するためにメールアドレスを確認してください
            </p>
          </div>

          {/* Verification Status */}
          <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
            {verificationStatus === 'success' && (
              <div className="text-center">
                <FaCheckCircle className="text-green-400 text-5xl mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">メール確認完了！</h2>
                <p className="text-gray-300 mb-4">
                  メールアドレスの確認が完了しました。まもなくトレーニングページに移動します。
                </p>
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="text-center">
                <FaExclamationTriangle className="text-red-400 text-5xl mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">確認に失敗しました</h2>
                <p className="text-gray-300 mb-4">
                  トークンが無効または期限切れです。新しい確認メールを送信してください。
                </p>
                <button
                  onClick={handleResendEmail}
                  disabled={isResending}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                >
                  {isResending ? '送信中...' : '確認メールを再送信'}
                </button>
              </div>
            )}

            {verificationStatus === 'idle' && !token && (
              <div className="text-center">
                <FaEnvelope className="text-blue-400 text-5xl mx-auto mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">確認メールを送信しました</h2>
                <p className="text-gray-300 mb-4">
                  {user?.email} に確認メールを送信しました。
                  メール内のリンクをクリックしてアカウントを有効化してください。
                </p>
                
                {/* 開発モード用の情報 */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
                    <p className="text-yellow-300 text-sm mb-2">
                      <strong>開発モード:</strong> メール送信はコンソールにログ出力されます
                    </p>
                    <p className="text-yellow-300 text-xs">
                      ブラウザの開発者ツール（F12）のコンソールタブで確認URLを確認してください
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                  >
                    {isResending ? '送信中...' : '確認メールを再送信'}
                  </button>
                  <Link 
                    href="/trainer/mtt"
                    className="block w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors text-center"
                  >
                    後で確認する
                  </Link>
                </div>
              </div>
            )}

            {isVerifying && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-300">メールアドレスを確認中...</p>
              </div>
            )}

            {/* Resend Status */}
            {resendStatus === 'success' && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-600/50 rounded-lg">
                <p className="text-green-300 text-sm">
                  確認メールを再送信しました。メールボックスをご確認ください。
                </p>
              </div>
            )}

            {resendStatus === 'error' && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
                <p className="text-red-300 text-sm">
                  確認メールの再送信に失敗しました。しばらく時間をおいて再度お試しください。
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400">
                メールが届かない場合は、迷惑メールフォルダもご確認ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
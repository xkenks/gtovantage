'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FaArrowLeft, FaEnvelope, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuth();
  
  // リダイレクト先を取得
  const redirectTo = searchParams.get('redirect') || '/trainer/mtt';
  
  // ログイン済みユーザーは適切なページにリダイレクト
  if (isAuthenticated) {
    router.push(redirectTo);
    return null;
  }
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // エラーをクリア
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // バリデーション
    if (!formData.email.trim()) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!formData.password.trim()) {
      setError('パスワードを入力してください');
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await login(formData.email, formData.password);
      
      if (success) {
        router.push(redirectTo);
      } else {
        setError('メールアドレスまたはパスワードが正しくありません');
      }
    } catch (error) {
      setError('ログイン中にエラーが発生しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              ログイン
            </h1>
            <p className="text-gray-300 text-sm md:text-base">
              GTO Vantageにログインして、トレーニングを開始しましょう
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  メールアドレス <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  パスワード <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="パスワードを入力してください"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ログイン中...
                    </>
                  ) : (
                    'ログイン'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <p className="text-sm text-gray-400">
                アカウントをお持ちでないですか？{' '}
                <Link href="/register" className="text-blue-400 hover:text-blue-300 underline">
                  新規登録
                </Link>
              </p>
            </div>

            {/* マスターアカウント情報 */}
            <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600/50 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-400 mb-2">🔑 マスターアカウント</h3>
              <div className="text-xs text-yellow-300 space-y-1">
                <div>メール: admin@gtovantage.com</div>
                <div>パスワード: master123</div>
                <div className="mt-2 text-yellow-200">
                  または: master@gtovantage.com / master123
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
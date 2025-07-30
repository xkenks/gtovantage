'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaArrowLeft, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePasswordPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    setIsSubmitting(true);
    setError('');

    // バリデーション
    if (formData.newPassword !== formData.confirmPassword) {
      setError('新しいパスワードと確認パスワードが一致しません');
      setIsSubmitting(false);
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('新しいパスワードは6文字以上で入力してください');
      setIsSubmitting(false);
      return;
    }

    try {
      // 現在のパスワードを確認
      const users = JSON.parse(localStorage.getItem('gto-vantage-users') || '[]');
      const currentUser = users.find((u: any) => u.email === user?.email);
      
      if (!currentUser) {
        setError('ユーザー情報が見つかりません');
        setIsSubmitting(false);
        return;
      }

      // 簡単なハッシュ関数（AuthContextと同じ）
      const simpleHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return hash.toString();
      };

      if (currentUser.password !== simpleHash(formData.currentPassword)) {
        setError('現在のパスワードが正しくありません');
        setIsSubmitting(false);
        return;
      }

      // パスワードを更新
      const updatedUsers = users.map((u: any) => 
        u.email === user?.email 
          ? { ...u, password: simpleHash(formData.newPassword) }
          : u
      );
      localStorage.setItem('gto-vantage-users', JSON.stringify(updatedUsers));

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // 3秒後にマイページに戻る
      setTimeout(() => {
        router.push('/mypage');
      }, 3000);

    } catch (error) {
      setError('パスワードの変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!user && typeof window !== 'undefined') {
      router.push('/login');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/mypage"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <FaArrowLeft className="text-sm" />
            マイページに戻る
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            パスワード変更
          </h1>
          <p className="text-gray-300 text-sm md:text-base">
            セキュリティのため、定期的にパスワードを変更することをお勧めします
          </p>
        </div>

        {/* Change Password Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-gray-800 rounded-xl p-6 md:p-8 shadow-lg">
            {success && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-600/50 rounded-lg">
                <p className="text-green-300 text-sm">
                  パスワードを正常に変更しました。3秒後にマイページに戻ります。
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  現在のパスワード <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    id="currentPassword"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="現在のパスワードを入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showCurrentPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  新しいパスワード <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    id="newPassword"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="新しいパスワードを入力（6文字以上）"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showNewPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  新しいパスワード（確認） <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-10 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="新しいパスワードを再入力"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                  >
                    {showConfirmPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || success}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      変更中...
                    </>
                  ) : (
                    'パスワードを変更'
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4">
                <h3 className="text-yellow-300 font-semibold text-sm mb-2">セキュリティのヒント</h3>
                <ul className="text-yellow-300 text-xs space-y-1">
                  <li>• 6文字以上のパスワードを使用してください</li>
                  <li>• 英数字と記号を組み合わせることをお勧めします</li>
                  <li>• 他のサービスで使用していないパスワードを使用してください</li>
                  <li>• 定期的にパスワードを変更してください</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
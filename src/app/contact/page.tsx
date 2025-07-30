'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaEnvelope, FaUser, FaComment } from 'react-icons/fa';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      // 実際の送信処理はここに実装
      // 現在はダミーの処理として、1秒後に成功を返す
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: ''
      });
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors mb-4"
          >
            <FaArrowLeft className="text-sm" />
            トップページに戻る
          </Link>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            お問い合わせ
          </h1>
          <p className="text-gray-300 text-sm md:text-base">
            GTO Vantageに関するご質問やご意見がございましたら、お気軽にお問い合わせください。
          </p>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto">
          {/* Contact Info */}
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg mb-6 md:mb-8">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-4">
              お問い合わせ方法
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-300">
                <FaEnvelope className="text-blue-400 flex-shrink-0" />
                <span>お問い合わせフォーム（推奨）</span>
              </div>
              <p className="text-sm text-gray-400 ml-8">
                下記のフォームからお問い合わせいただけます。通常2-3営業日以内にご返信いたします。
              </p>
              <div className="flex items-center gap-3 text-gray-300">
                <FaEnvelope className="text-blue-400 flex-shrink-0" />
                <span>メールアドレス</span>
              </div>
              <p className="text-sm text-gray-400 ml-8">
                <a href="mailto:gtovantage@gmail.com" className="text-blue-400 hover:text-blue-300">
                  gtovantage@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-800 rounded-xl p-4 md:p-6 shadow-lg">
            <h2 className="text-lg md:text-xl font-semibold text-white mb-4">
              お問い合わせフォーム
            </h2>

            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-600/50 rounded-lg">
                <p className="text-green-300 text-sm md:text-base">
                  お問い合わせを送信いたしました。ありがとうございます。
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
                <p className="text-red-300 text-sm md:text-base">
                  送信に失敗しました。しばらく時間をおいて再度お試しください。
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  お名前 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-3 py-2 md:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="お名前を入力してください"
                  />
                </div>
              </div>

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
                    className="w-full pl-10 pr-3 py-2 md:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="example@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                  件名 <span className="text-red-400">*</span>
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 md:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
                >
                  <option value="">件名を選択してください</option>
                  <option value="general">一般的なお問い合わせ</option>
                  <option value="technical">技術的な問題</option>
                  <option value="feature">機能のご要望</option>
                  <option value="bug">バグの報告</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                  お問い合わせ内容 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <FaComment className="absolute left-3 top-3 text-gray-400 text-sm" />
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    className="w-full pl-10 pr-3 py-2 md:py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors resize-vertical"
                    placeholder="お問い合わせ内容を詳しく入力してください"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-3 md:py-4 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      送信中...
                    </>
                  ) : (
                    <>
                      <FaEnvelope />
                      送信する
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs text-gray-400">
                <span className="text-red-400">*</span> は必須項目です。
              </p>
              <p className="text-xs text-gray-400 mt-2">
                お送りいただいた個人情報は、お問い合わせへの対応以外には使用いたしません。
                詳細は<Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline">プライバシーポリシー</Link>をご確認ください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
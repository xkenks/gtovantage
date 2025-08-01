'use client';

import Link from 'next/link';

export default function OperatorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <main className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          {/* ヘッダー */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                運営者情報
              </span>
            </h1>
            <p className="text-gray-300 text-lg">
              GTO Vantageを運営する株式会社VELMELについて
            </p>
          </div>
          
          {/* 会社概要カード */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 md:p-10 mb-8 border border-gray-700/50 shadow-2xl">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold mb-2">
                株式会社VELMEL
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-400 mx-auto rounded-full"></div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-400 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  会社概要
                </h3>
                <div className="space-y-4 text-gray-300">
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="font-medium">会社名</span>
                    <span>株式会社VELMEL</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="font-medium">事業内容</span>
                    <span>オンラインゲーム・アプリケーション開発</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                    <span className="font-medium">サービス</span>
                    <span>GTO Vantage</span>
                  </div>
                </div>
              </div>
              
                             <div>
                 <h3 className="text-xl font-semibold mb-4 text-blue-400 flex items-center">
                   <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                   </svg>
                   公式サイト
                 </h3>
                 <div className="space-y-4 text-gray-300">
                   <div className="flex justify-between items-center py-2 border-b border-gray-700/50">
                     <span className="font-medium">URL</span>
                     <a 
                       href="https://velmel.co.jp/" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       className="text-blue-400 hover:text-blue-300 transition-colors"
                     >
                       velmel.co.jp
                     </a>
                   </div>
                 </div>
               </div>
            </div>
          </div>
          
          {/* GTO Vantageについて */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 md:p-10 mb-8 border border-gray-700/50 shadow-2xl">
            <h3 className="text-2xl font-semibold mb-6 text-blue-400 flex items-center">
              <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              GTO Vantageについて
            </h3>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                GTO Vantageは、ポーカープレイヤーの皆様がより効果的にGTO（Game Theory Optimal）戦略を学び、
                実践できるように開発されたトレーニングアプリケーションです。
              </p>
              <p>
                私たちは、最新のポーカーテクノロジーと教育理論を組み合わせ、
                初心者から上級者まで、すべてのプレイヤーが成長できる環境を提供することを目指しています。
              </p>
            </div>
          </div>
          
          {/* ナビゲーション */}
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              トップページに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
} 
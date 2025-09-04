'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaChalkboardTeacher, FaClipboardList, FaGraduationCap, FaUsers, FaTrophy, FaChartLine, FaBrain, FaRocket, FaPlay, FaUser, FaCrown, FaInfinity, FaLock, FaCheck } from 'react-icons/fa';
import { useAuth } from '@/contexts/FirebaseAuthContext';

export default function Home() {
  const { user, isAuthenticated, hasActiveSubscription, practiceCount } = useAuth();
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-15" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="relative z-10 container mx-auto px-4 py-12 md:py-20 lg:py-32">
          <div className="text-center">
            {/* Main Headline */}
            {isAuthenticated ? (
              <div className="mb-4 md:mb-6">
                <div className="text-lg md:text-xl text-green-400 mb-2">ようこそ、{user?.displayName || user?.email}さん！</div>
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-4 md:mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                今日も
              </span>
              <span className="text-white">GTOトレーニングで</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                スキルアップ
              </span>
              <span className="text-white">しましょう。</span>
                </h1>
              </div>
            ) : (
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white mb-4 md:mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  GTO
                </span>
                <span className="text-white">を知る者が、</span>
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  アドバンテージ
                </span>
                <span className="text-white">を得る。</span>
              </h1>
            )}
            
            {/* Subtitle */}
            <p className="text-base md:text-xl lg:text-2xl text-gray-300 mb-6 md:mb-8 max-w-3xl mx-auto leading-relaxed px-2">
              {isAuthenticated ? (
                <>
                  今日の練習回数: {practiceCount}回
                  {!hasActiveSubscription && (
                    <>
                      <br className="hidden sm:block" />
                      プランアップグレードでより多くの練習が可能です。
                    </>
                  )}
                </>
              ) : (
                <>
                  ポーカーのゲーム理論最適戦略を学び、実践する。
                  <br className="hidden sm:block" />
                  最先端のGTOツールで、あなたのポーカースキルを次のレベルへ。
                </>
              )}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center mb-12 md:mb-16">
              {isAuthenticated ? (
                <>
                  <Link 
                    href="/trainer/mtt"
                    className="group bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center"
                  >
                    <FaPlay className="group-hover:animate-pulse" />
                    トレーニング開始
                  </Link>
                  <Link 
                    href="/mypage"
                    className="group bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center"
                  >
                    <FaUser />
                    マイページ
                  </Link>
                </>
              ) : (
                <>
                  <Link 
                    href="/register"
                    className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center"
                  >
                    <FaTrophy className="group-hover:animate-bounce" />
                    無料で始める
                  </Link>
                  <Link 
                    href="/login"
                    className="group bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white px-6 md:px-8 py-3 md:py-4 rounded-lg text-base md:text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center"
                  >
                    ログイン
                  </Link>
                </>
              )}
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-blue-400 mb-1 md:mb-2">500+</div>
                <div className="text-xs md:text-base text-gray-300">GTOシナリオ</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-purple-400 mb-1 md:mb-2">最新</div>
                <div className="text-xs md:text-base text-gray-300">GTO Solver</div>
              </div>
              <div className="text-center">
                <div className="text-2xl md:text-4xl font-bold text-pink-400 mb-1 md:mb-2">200%</div>
                <div className="text-xs md:text-base text-gray-300">勝率向上</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Appeal Section */}
      <section className="py-12 md:py-20 bg-black bg-opacity-40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">GTO Vantage</span>の魅力
            </h2>
            <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto px-2">
              最新のGTO Solver技術と圧倒的なコスパで、あなたのポーカースキルを次のレベルへ
            </p>
          </div>
          
          <div className="max-w-7xl mx-auto">
            {/* Main Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12">
              {/* Feature 1: Cost Performance */}
              <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 p-6 md:p-8 rounded-xl hover:border-green-400/50 transition-all duration-300">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCrown className="text-2xl md:text-3xl text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">圧倒的なコスパ</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 text-center">
                  高品質なGTOトレーニングを手頃な価格で提供。他のGTOツールと比較して、圧倒的なコストパフォーマンスを実現しています。
                </p>
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 bg-green-800/30 px-4 py-2 rounded-full">
                    <span className="text-green-400 font-bold text-lg">980円〜</span>
                    <span className="text-gray-300 text-sm">従来の1/10の価格</span>
                  </div>
                </div>
              </div>

              {/* Feature 2: GTO Solver */}
              <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-500/30 p-6 md:p-8 rounded-xl hover:border-blue-400/50 transition-all duration-300">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaBrain className="text-2xl md:text-3xl text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">最新GTO Solver技術</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 text-center">
                  最新のゲーム理論最適化エンジンを搭載。感情に左右されない、科学的な意思決定をサポートします。
                </p>
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 bg-blue-800/30 px-4 py-2 rounded-full">
                    <span className="text-blue-400 font-semibold">感情排除</span>
                    <span className="text-gray-300 text-sm">科学的アプローチ</span>
                  </div>
                </div>
              </div>

              {/* Feature 3: Preflop Training */}
              <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6 md:p-8 rounded-xl hover:border-purple-400/50 transition-all duration-300">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaChartLine className="text-2xl md:text-3xl text-white" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-white mb-3">勝負を決める初手戦略</h3>
                </div>
                <p className="text-gray-300 leading-relaxed mb-6 text-center">
                  プリフロップこそが勝負の分かれ道。正確なレンジ戦略で、ゲーム開始から圧倒的アドバンテージを構築。科学的根拠に基づいた最適解を身につけましょう。
                </p>
                <div className="text-center">
                  <div className="inline-flex items-center gap-3 bg-purple-800/30 px-4 py-2 rounded-full">
                    <span className="text-purple-400 font-semibold">プリフロップGTO</span>
                    <span className="text-gray-300 text-sm">完全習得</span>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </section>

      {/* Training Types Section */}
      <section className="py-12 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
              トレーニング<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">メニュー</span>
            </h2>
            <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto px-2">
              あなたの目標に合わせて、最適なトレーニングを選択してください。
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-4 md:p-8 rounded-xl hover:border-purple-400/50 transition-all duration-300">
              <div className="flex items-center mb-4 md:mb-6">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center mr-3 md:mr-4">
                  <FaTrophy className="text-lg md:text-xl text-white" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white">MTTプリフロップトレーニング</h3>
              </div>
              <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6 leading-relaxed">
                トーナメントに特化したプリフロップ戦略を学び、MTTでの勝率を向上させます。このトレーニングではチップEVを考慮しており、ICMは考慮していません。スタックサイズに応じた戦略調整や、ポジション別の最適プレイを習得。プリフロップGTO戦略を実践的に学習できます。
              </p>
              <Link 
                href="/trainer/mtt"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg text-sm md:text-base font-semibold transition-all duration-300"
              >
                トレーニング開始
                <FaPlay className="text-sm" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Premium Upgrade Section - Only show for non-premium users */}
      {isAuthenticated && !hasActiveSubscription && (
        <section className="py-12 md:py-20 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-y border-yellow-600/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                <FaCrown className="text-sm" />
                プレミアムプラン
              </div>
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
                もっと<span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">上達</span>したいですか？
              </h2>
              <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto px-2">
                プレミアムプランにアップグレードして、無制限の練習と高度な機能を体験してください。
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
              {/* Current Plan */}
              <div className="bg-gray-800/50 border border-gray-600/50 p-6 md:p-8 rounded-xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaLock className="text-2xl text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">現在のプラン</h3>
                  <p className="text-gray-400 text-sm">制限付き</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>基本トレーニング</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>30BBモード</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-500">
                    <span className="text-red-400">×</span>
                    <span>練習回数制限</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-500">
                    <span className="text-red-400">×</span>
                    <span>全スタックサイズ</span>
                  </li>
                </ul>
              </div>

              {/* Premium Plan */}
              <div className="bg-gradient-to-br from-yellow-900/50 to-orange-900/50 border-2 border-yellow-500/50 p-6 md:p-8 rounded-xl relative transform scale-105">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-gradient-to-r from-yellow-600 to-orange-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    おすすめ
                  </div>
                </div>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaCrown className="text-2xl text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">プレミアム</h3>
                  <p className="text-yellow-400 font-semibold">¥1,980/月</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>無制限練習</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>全スタックサイズ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>高度な分析</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>優先サポート</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link 
                    href="/subscription"
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 block text-center"
                  >
                    アップグレード
                  </Link>
                </div>
              </div>

              {/* Light Plan */}
              <div className="bg-gray-800/50 border border-gray-600/50 p-6 md:p-8 rounded-xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaInfinity className="text-2xl text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">ライト</h3>
                  <p className="text-blue-400 font-semibold">¥980/月</p>
                </div>
                <ul className="space-y-3 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>50回/日練習</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>全スタックサイズ</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <FaCheck className="text-green-400 text-xs" />
                    <span>基本分析</span>
                  </li>
                  <li className="flex items-center gap-2 text-gray-500">
                    <span className="text-red-400">×</span>
                    <span>優先サポート</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link 
                    href="/subscription"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-300 block text-center"
                  >
                    選択
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section - Only show for non-authenticated users */}
      {!isAuthenticated && (
        <section className="py-12 md:py-20 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6">
              今すぐ<span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">始めよう</span>
            </h2>
            <p className="text-base md:text-xl text-gray-300 mb-6 md:mb-8 max-w-2xl mx-auto px-2">
              GTOを知ることで、あなたのポーカープレイは劇的に変わります。
              <br className="hidden sm:block" />
              科学的アプローチで、確実にアドバンテージを手に入れましょう。
            </p>
            <Link 
              href="/register"
              className="group bg-white text-gray-900 px-6 md:px-10 py-3 md:py-5 rounded-lg text-base md:text-xl font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-2xl inline-flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-center"
            >
              <FaRocket className="group-hover:animate-bounce" />
              無料でアカウント作成
            </Link>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-black bg-opacity-60 border-t border-gray-700 py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="text-xl md:text-2xl font-bold text-white mb-3 md:mb-4">
            GTO Vantage
          </div>
          <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6">
            GTOを知る者が、アドバンテージを得る。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-6 text-gray-400 text-sm md:text-base">
            <Link href="/register" className="hover:text-white transition-colors">
              新規登録
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              ログイン
            </Link>
          </div>
                          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-6 text-gray-400 text-xs md:text-sm mt-4 md:mt-6">
                  <Link href="/terms" className="hover:text-white transition-colors">
                    利用規約
                  </Link>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    プライバシーポリシー
                  </Link>
                  <Link href="/operator" className="hover:text-white transition-colors">
                    運営者情報
                  </Link>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    お問い合わせ
                  </Link>
                </div>
          
          <div className="mt-6 md:mt-8 text-xs md:text-sm text-gray-500">
            © 2025 GTO Vantage. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
} 
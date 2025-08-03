import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function PrivacyPage() {
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
            プライバシーポリシー
          </h1>
          <p className="text-gray-300 text-sm md:text-base">
            最終更新日: 2025年8月1日
          </p>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-xl p-4 md:p-8 shadow-lg max-w-4xl mx-auto">
          <div className="space-y-6 md:space-y-8 text-sm md:text-base leading-relaxed">
            
            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                1. 個人情報の収集について
              </h2>
              <p className="text-gray-300 mb-3">
                GTO Vantage（以下「当サービス」）では、サービス提供のために以下の個人情報を収集する場合があります：
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>お問い合わせ時のメールアドレス</li>
                <li>ブラウザの種類、IPアドレス、アクセス日時などの技術的情報</li>
                <li>サービス利用時の設定情報（トレーニング設定、ハンド選択など）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                2. 個人情報の利用目的
              </h2>
              <p className="text-gray-300 mb-3">
                収集した個人情報は、以下の目的で利用いたします：
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>サービスの提供・運営</li>
                <li>お問い合わせへの対応</li>
                <li>サービスの改善・開発</li>
                <li>不正利用の防止</li>
                <li>統計情報の作成（個人を特定できない形で）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                3. 個人情報の管理
              </h2>
              <p className="text-gray-300">
                当サービスは、個人情報の正確性及び安全性を確保するために、セキュリティの向上及び個人情報の漏洩、滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                4. 個人情報の第三者提供
              </h2>
              <p className="text-gray-300">
                当サービスは、以下の場合を除き、個人情報を第三者に提供いたしません：
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>ご本人の同意がある場合</li>
                <li>法令に基づき開示することが必要である場合</li>
                <li>人の生命、身体または財産の保護のために必要な場合であって、ご本人の同意を得ることが困難である場合</li>
                <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要な場合であって、ご本人の同意を得ることが困難である場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                5. クッキー（Cookie）の使用
              </h2>
              <p className="text-gray-300">
                当サービスでは、ユーザーの利便性向上のため、クッキーを使用することがあります。クッキーは、ユーザーの設定情報やセッション情報を保存するために使用されます。ブラウザの設定により、クッキーの受け取りを拒否することができます。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                6. アクセス解析ツールについて
              </h2>
              <p className="text-gray-300">
                当サービスでは、Googleによるアクセス解析ツール「Googleアナリティクス」を使用しています。このGoogleアナリティクスはデータの収集のためにCookieを使用しています。このデータは匿名で収集されており、個人を特定するものではありません。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                7. 個人情報の開示・訂正・削除
              </h2>
              <p className="text-gray-300">
                ご本人からの個人情報の開示、訂正、削除、利用停止のご要望については、法令に基づき対応いたします。お問い合わせは、<Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">お問い合わせフォーム</Link>からお願いいたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                8. プライバシーポリシーの変更
              </h2>
              <p className="text-gray-300">
                当サービスは、必要に応じて、このプライバシーポリシーの内容を変更することがあります。その場合、変更内容を当サービス上でお知らせいたします。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                9. お問い合わせ
              </h2>
              <p className="text-gray-300">
                本プライバシーポリシーに関するお問い合わせは、<Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">お問い合わせフォーム</Link>からお願いいたします。
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
} 
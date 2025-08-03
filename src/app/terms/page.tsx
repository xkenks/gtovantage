import Link from 'next/link';
import { FaArrowLeft } from 'react-icons/fa';

export default function TermsPage() {
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
            利用規約
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
                第1条（適用）
              </h2>
              <p className="text-gray-300">
                本規約は、GTO Vantage（以下「当サービス」）の利用に関して適用されます。ユーザーは本規約に同意した上で当サービスを利用するものとします。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第2条（利用登録）
              </h2>
              <p className="text-gray-300">
                当サービスの利用にあたり、ユーザーは真実、正確かつ完全な情報を提供するものとします。虚偽の情報提供があった場合、当サービスは利用を停止することがあります。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第3条（禁止事項）
              </h2>
              <p className="text-gray-300 mb-3">
                ユーザーは、当サービスの利用にあたり、以下の行為をしてはなりません：
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>当サービスのサーバーまたはネットワークの機能を破壊したり、妨害したりする行為</li>
                <li>当サービスの運営を妨害するおそれのある行為</li>
                <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
                <li>他のユーザーに成りすます行為</li>
                <li>当サービスに関連して、反社会的勢力に対して直接または間接に利益を供与する行為</li>
                <li>その他、当サービスが不適切と判断する行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第4条（当サービスの提供の停止等）
              </h2>
              <p className="text-gray-300">
                当サービスは、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく当サービスの全部または一部の提供を停止または中断することができるものとします：
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4 mt-3">
                <li>当サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
                <li>地震、落雷、火災、停電または天災などの不可抗力により、当サービスの提供が困難となった場合</li>
                <li>その他、当サービスが当サービスの提供が困難と判断した場合</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第5条（免責事項）
              </h2>
              <p className="text-gray-300">
                当サービスは、当サービスに起因してユーザーに生じたあらゆる損害について一切の責任を負いません。ただし、当サービスとユーザーとの間の契約（本規約を含みます）が消費者契約法に定める消費者契約となる場合、この免責規定は適用されません。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第6条（サービス内容の変更等）
              </h2>
              <p className="text-gray-300">
                当サービスは、ユーザーに通知することなく、本規約を変更することができるものとします。なお、本規約の変更後、当サービスの利用を継続した場合には、変更後の規約に同意したものとみなします。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                第7条（準拠法・裁判管轄）
              </h2>
              <p className="text-gray-300">
                本規約の解釈にあたっては、日本法を準拠法とします。本規約に関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
              </p>
            </section>

            <section>
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4">
                お問い合わせ
              </h2>
              <p className="text-gray-300">
                本規約に関するお問い合わせは、<Link href="/contact" className="text-blue-400 hover:text-blue-300 underline">お問い合わせフォーム</Link>からお願いいたします。
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
} 
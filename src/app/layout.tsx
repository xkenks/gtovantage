import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/AuthContext';
import { FirebaseAuthProvider } from '@/contexts/FirebaseAuthContext';
import Header from '@/components/Header';
import { ChakraWrapper } from '@/components/ChakraWrapper';
import { AdminProvider } from '@/contexts/AdminContext';
import Analytics, { GoogleAnalyticsScript } from '@/components/Analytics';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GTO Vantage - ポーカーGTOトレーナー | ゲーム理論最適戦略を学ぶ',
  description: 'ポーカーのゲーム理論最適戦略を学び、実践するためのGTOツール。MTT特化トレーニングで、あなたのポーカースキルを次のレベルへ。GTOを知る者が、アドバンテージを得る。',
  keywords: 'ポーカー,GTO,ツール,ゲーム理論,MTT,トーナメント,ポーカートレーニング,ポーカー戦略,ポーカースキル',
  authors: [{ name: 'GTO Vantage' }],
  creator: 'GTO Vantage',
  publisher: 'GTO Vantage',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://gtovantage-n43qu2kms-velmel.vercel.app'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'GTO Vantage - ポーカーGTOトレーナー',
    description: 'ポーカーのゲーム理論最適戦略を学び、実践するためのGTOツール。GTOを知る者が、アドバンテージを得る。',
    url: 'https://gtovantage-n43qu2kms-velmel.vercel.app',
    siteName: 'GTO Vantage',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'GTO Vantage - ポーカーGTOトレーナー',
      },
    ],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GTO Vantage - ポーカーGTOトレーナー',
    description: 'ポーカーのゲーム理論最適戦略を学び、実践するためのGTOツール。GTOを知る者が、アドバンテージを得る。',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Firebase使用フラグ（環境変数で制御、デフォルトでFirebase有効）
  const useFirebase = process.env.NEXT_PUBLIC_USE_FIREBASE !== 'false';
  
  const AuthContextProvider = useFirebase ? FirebaseAuthProvider : AuthProvider;

  return (
    <html lang="ja">
      <head>
        <GoogleAnalyticsScript />
      </head>
      <body className={inter.className}>
        <ChakraWrapper>
          <AdminProvider>
            <AuthContextProvider>
              <div className="bg-black md:bg-gray-900 text-white">
                <Header />
                {children}
              </div>
              <Analytics />
            </AuthContextProvider>
          </AdminProvider>
        </ChakraWrapper>
      </body>
    </html>
  );
} 
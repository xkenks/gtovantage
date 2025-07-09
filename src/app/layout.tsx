import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/authContext';
import Header from '@/components/Header';
import { ChakraWrapper } from '@/components/ChakraWrapper';
import { AdminProvider } from '@/contexts/AdminContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GTO Vantage - ポーカーGTOトレーナー',
  description: 'ポーカーのゲーム理論最適戦略を学び、実践するためのトレーニングアプリ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} bg-black md:bg-gray-900 text-white`}>
        <ChakraWrapper>
          <AdminProvider>
            <AuthProvider>
              <div className="hidden md:block">
                <Header />
              </div>
              {children}
            </AuthProvider>
          </AdminProvider>
        </ChakraWrapper>
      </body>
    </html>
  );
} 
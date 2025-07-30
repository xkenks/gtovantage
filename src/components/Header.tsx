'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggle = () => setIsOpen(!isOpen);

  return (
    <header className="bg-blue-700 text-white p-4 shadow-md">
      <div className="container mx-auto flex flex-wrap items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          GTO Vantage
        </Link>

        <button
          className="md:hidden p-2 text-white focus:outline-none"
          onClick={toggle}
          aria-label="メニュー"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <nav className={`w-full md:w-auto md:flex ${isOpen ? 'block' : 'hidden'} mt-4 md:mt-0`}>
          <ul className="flex flex-col md:flex-row md:items-center md:space-x-6">
            <li>
              <Link href="/" className={`block py-2 md:py-0 ${pathname === '/' ? 'font-bold' : 'hover:text-blue-200'}`}>
                ホーム
              </Link>
            </li>
            {user && (
              <li>
                <Link href="/trainer/mtt" className={`block py-2 md:py-0 ${pathname.startsWith('/trainer') ? 'font-bold' : 'hover:text-blue-200'}`}>
                  GTOトレーナー
                </Link>
              </li>
            )}
            {user && (
              <li>
                <Link href="/subscription" className={`block py-2 md:py-0 ${pathname === '/subscription' ? 'font-bold' : 'hover:text-blue-200'}`}>
                  サブスクリプション
                </Link>
              </li>
            )}
            {user && (
              <li>
                <Link href="/mypage" className={`block py-2 md:py-0 ${pathname === '/mypage' ? 'font-bold' : 'hover:text-blue-200'}`}>
                  マイページ
                </Link>
              </li>
            )}

            {user ? (
              <li className="mt-4 md:mt-0 md:ml-6">
                <button onClick={logout} className="block bg-transparent border border-white text-white px-4 py-1 rounded hover:bg-blue-600">
                  ログアウト
                </button>
              </li>
            ) : (
              <li className="mt-4 md:mt-0 md:ml-6 flex flex-col md:flex-row">
                <Link href="/login" className="block bg-transparent border border-white text-white px-4 py-1 rounded mb-2 md:mb-0 md:mr-2 text-center hover:bg-blue-600">
                  ログイン
                </Link>
                <Link href="/register" className="block bg-white text-blue-700 px-4 py-1 rounded text-center hover:bg-gray-100">
                  新規登録
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;

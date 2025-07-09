'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';

const Header = () => {
  const { user, signOut } = useAuth();
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
            <li>
              <Link href="/trainer" className={`block py-2 md:py-0 ${pathname === '/trainer' ? 'font-bold' : 'hover:text-blue-200'}`}>
                GTOトレーナー
              </Link>
            </li>

            {user ? (
              <li className="relative group mt-4 md:mt-0 md:ml-6">
                <button className="flex items-center font-medium">
                  {user.name}
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <ul className="absolute hidden group-hover:block right-0 bg-white text-gray-800 shadow-lg rounded py-2 mt-2 w-48 z-10">
                  <li>
                    <Link href="/profile" className="block px-4 py-2 hover:bg-gray-200">
                      プロフィール
                    </Link>
                  </li>
                  <li>
                    <Link href="/settings" className="block px-4 py-2 hover:bg-gray-200">
                      設定
                    </Link>
                  </li>
                  <li>
                    <button onClick={signOut} className="block w-full text-left px-4 py-2 hover:bg-gray-200">
                      ログアウト
                    </button>
                  </li>
                </ul>
              </li>
            ) : (
              <li className="mt-4 md:mt-0 md:ml-6 flex flex-col md:flex-row">
                <Link href="/auth/login" className="block bg-transparent border border-white text-white px-4 py-1 rounded mb-2 md:mb-0 md:mr-2 text-center hover:bg-blue-600">
                  ログイン
                </Link>
                <Link href="/auth/signup" className="block bg-white text-blue-700 px-4 py-1 rounded text-center hover:bg-gray-100">
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

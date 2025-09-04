'use client';

import { useAuth } from '@/contexts/FirebaseAuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireEmailVerification?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireEmailVerification = true }) => {
  const { isAuthenticated, loading, isEmailVerified, isMasterUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // サーバーサイドレンダリング時はwindow.locationが利用できないため、デフォルトパスを使用
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
      router.push('/login?redirect=' + encodeURIComponent(currentPath));
      return;
    }

    if (!loading && isAuthenticated && requireEmailVerification && !isEmailVerified && !isMasterUser) {
      router.push('/verify-email');
      return;
    }
  }, [isAuthenticated, loading, isEmailVerified, isMasterUser, requireEmailVerification, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-300">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}; 
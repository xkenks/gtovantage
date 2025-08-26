'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initGA, trackPageView, GA_MEASUREMENT_ID } from '@/lib/analytics';

export default function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    // GA4の初期化
    if (GA_MEASUREMENT_ID) {
      initGA();
    }
  }, []);

  useEffect(() => {
    // ページ変更時のページビュー追跡
    if (GA_MEASUREMENT_ID) {
      trackPageView(pathname);
    }
  }, [pathname]);

  // このコンポーネントは何もレンダリングしない
  return null;
}

// GA4スクリプトタグを生成するコンポーネント
export function GoogleAnalyticsScript() {
  if (!GA_MEASUREMENT_ID) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <script
        id="google-analytics"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

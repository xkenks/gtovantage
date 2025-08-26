// Google Analytics 4 implementation
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// GA4の初期化
export const initGA = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('GA4 Measurement ID is not set');
    return;
  }

  // gtag.jsの動的読み込み
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
    });
  }
};

// ページビューの追跡
export const trackPageView = (url: string, title?: string) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
    page_title: title || document.title,
  });
};

// カスタムイベントの追跡
export const trackEvent = (
  action: string,
  category: string,
  label?: string,
  value?: number,
  customParameters?: Record<string, any>
) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
    ...customParameters,
  });
};

// GTOVantage専用のイベント追跡関数
export const gtoEvents = {
  // トレーニング開始
  startTraining: (position: string, stackSize: string, actionType: string) => {
    trackEvent('start_training', 'training', `${position}_${stackSize}_${actionType}`, undefined, {
      position,
      stack_size: stackSize,
      action_type: actionType,
    });
  },

  // アクション選択
  selectAction: (action: string, isCorrect: boolean, position: string) => {
    trackEvent('select_action', 'training', action, isCorrect ? 1 : 0, {
      action,
      is_correct: isCorrect,
      position,
    });
  },

  // トレーニング完了
  completeTraining: (correctCount: number, totalCount: number, accuracy: number) => {
    trackEvent('complete_training', 'training', 'session_complete', totalCount, {
      correct_count: correctCount,
      total_count: totalCount,
      accuracy_percentage: Math.round(accuracy * 100),
    });
  },

  // カスタムレンジ使用
  useCustomRange: (position: string, stackSize: string, actionType: string) => {
    trackEvent('use_custom_range', 'feature', `${position}_${stackSize}_${actionType}`, undefined, {
      position,
      stack_size: stackSize,
      action_type: actionType,
    });
  },

  // レンジ保存
  saveRange: (position: string, stackSize: string, actionType: string, handCount: number) => {
    trackEvent('save_range', 'feature', `${position}_${stackSize}_${actionType}`, handCount, {
      position,
      stack_size: stackSize,
      action_type: actionType,
      hand_count: handCount,
    });
  },

  // ログイン
  login: (userType: 'user' | 'admin' | 'master') => {
    trackEvent('login', 'auth', userType, undefined, {
      user_type: userType,
    });
  },

  // ユーザー登録
  register: () => {
    trackEvent('sign_up', 'auth', 'user_registration');
  },

  // サブスクリプション関連
  viewSubscription: () => {
    trackEvent('view_subscription', 'engagement', 'subscription_page');
  },

  // エラー追跡
  trackError: (errorType: string, errorMessage: string, page: string) => {
    trackEvent('error', 'system', errorType, undefined, {
      error_message: errorMessage,
      page,
    });
  },
};

// ユーザープロパティの設定
export const setUserProperties = (properties: Record<string, any>) => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;

  window.gtag('config', GA_MEASUREMENT_ID, {
    custom_map: properties,
  });
};

// デバッグモード（開発環境用）
export const enableDebugMode = () => {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return;
  
  window.gtag('config', GA_MEASUREMENT_ID, {
    debug_mode: true,
  });
};

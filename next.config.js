/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Firebaseとundiciパッケージを正しく処理するための設定
  transpilePackages: ['undici', 'firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore', '@firebase/storage'],
  webpack: (config, { isServer }) => {
    // 問題のあるモジュールをエイリアス設定
    config.resolve.alias = {
      ...config.resolve.alias,
      './runtimeConfig': './runtimeConfig.browser',
    }
    
    // クライアントサイドでfirebase-adminを無効化
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'firebase-admin': false,
        'fs': false,
        'net': false,
        'http2': false,
        'crypto': false,
      }
    }
    
    return config
  },
}

module.exports = nextConfig 
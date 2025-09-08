/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Firebaseとundiciパッケージを正しく処理するための設定
  transpilePackages: ['undici', 'firebase', '@firebase/app', '@firebase/auth', '@firebase/firestore', '@firebase/storage'],
  webpack: (config) => {
    // 問題のあるモジュールをエイリアス設定
    config.resolve.alias = {
      ...config.resolve.alias,
      './runtimeConfig': './runtimeConfig.browser',
    }
    return config
  },
}

module.exports = nextConfig 
'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // ログにエラーを出力
    console.error('エラーが発生しました:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-lg">
        <h2 className="mb-4 text-2xl font-bold text-red-600">エラーが発生しました</h2>
        <p className="mb-4 text-gray-700">
          申し訳ありませんが、予期しないエラーが発生しました。
        </p>
        <div className="p-3 mb-4 overflow-auto text-sm bg-gray-100 rounded">
          <code>{error.message || 'アプリケーションエラー'}</code>
        </div>
        <button
          onClick={() => reset()}
          className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 focus:outline-none"
        >
          もう一度試す
        </button>
      </div>
    </div>
  )
}

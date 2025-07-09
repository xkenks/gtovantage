export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin"></div>
      <p className="mt-4 text-lg font-medium text-gray-700">ロード中...</p>
    </div>
  )
}

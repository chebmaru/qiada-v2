export default function RootNotFound() {
  return (
    <html lang="it">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-900">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <p className="text-lg text-gray-500 mb-6">Pagina non trovata / الصفحة غير موجودة</p>
        <a
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Home
        </a>
      </body>
    </html>
  );
}

import Link from 'next/link'
import Navigation from '../components/Navigation'

export default function Custom404() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center py-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="space-x-4">
            <Link 
              href="/"
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Go Home
            </Link>
            <Link 
              href="/tasteboard"
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Browse Tasteboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 
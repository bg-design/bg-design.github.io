import { useState, useEffect } from 'react'
import TasteboardItem from '../components/TasteboardItem'
import AddTasteboardForm from '../components/AddTasteboardForm'
import Navigation from '../components/Navigation'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'

interface TasteboardItem {
  id: string
  category: 'BOOK' | 'MOVIE' | 'SHOW' | 'MUSIC' | 'PODCAST' | 'ARTICLE'
  item: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

export default function TasteboardPage() {
  const { user, dbUser } = useAuth()
  const [tasteboards, setTasteboards] = useState<TasteboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my')

  useEffect(() => {
    fetchTasteboards()
  }, [viewMode])

  const fetchTasteboards = async () => {
    try {
      let url = '/api/tasteboards'
      if (viewMode === 'my' && dbUser) {
        url += `?userId=${dbUser.id}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setTasteboards(data)
    } catch (error) {
      console.error('Failed to fetch tasteboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTasteboard = async (data: { category: string; item: string }) => {
    if (!dbUser) return

    try {
      const response = await fetch('/api/tasteboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          userId: dbUser.id
        }),
      })

      if (response.ok) {
        const newTasteboard = await response.json()
        setTasteboards(prev => [newTasteboard, ...prev])
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to add tasteboard:', error)
    }
  }

  const filteredTasteboards = selectedCategory === 'ALL' 
    ? tasteboards 
    : tasteboards.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading tasteboard...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Tasteboard</h1>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Item
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setViewMode('my')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'my'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  My Items
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-700 hover:text-gray-900'
                  }`}
                >
                  All Items
                </button>
              </div>
            </div>
          </div>

          {/* Category Filter */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {['ALL', 'BOOK', 'MOVIE', 'SHOW', 'MUSIC', 'PODCAST', 'ARTICLE'].map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {category === 'ALL' ? 'All' : category}
                </button>
              ))}
            </div>
          </div>

          {/* Add Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <AddTasteboardForm
                  onSubmit={handleAddTasteboard}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            </div>
          )}

          {/* Tasteboard Items */}
          <div className="space-y-4">
            {filteredTasteboards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {viewMode === 'my' 
                    ? "You haven't added any items to your tasteboard yet." 
                    : "No items found."
                  }
                </p>
                {viewMode === 'my' && (
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-4 text-blue-500 hover:text-blue-600"
                  >
                    Add your first item
                  </button>
                )}
              </div>
            ) : (
              filteredTasteboards.map((item) => (
                <TasteboardItem
                  key={item.id}
                  id={item.id}
                  category={item.category}
                  item={item.item}
                  user={item.user}
                  createdAt={item.createdAt}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 
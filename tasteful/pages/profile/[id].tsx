import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navigation from '../../components/Navigation'
import TasteboardItem from '../../components/TasteboardItem'
import { useAuth } from '../../contexts/AuthContext'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
  createdAt: string
  _count: {
    tasteboards: number
    followers: number
    following: number
  }
}

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

export default function UserProfile() {
  const router = useRouter()
  const { id } = router.query
  const { user: currentUser, dbUser: currentDbUser } = useAuth()
  const [user, setUser] = useState<User | null>(null)
  const [tasteboards, setTasteboards] = useState<TasteboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({ category: 'BOOK', item: '' })

  useEffect(() => {
    if (id) {
      fetchUserProfile()
      fetchUserTasteboards()
      checkFollowStatus()
    }
  }, [id])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${id}`)
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push('/404')
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error)
      router.push('/404')
    }
  }

  const fetchUserTasteboards = async () => {
    try {
      const response = await fetch(`/api/tasteboards?userId=${id}`)
      const data = await response.json()
      setTasteboards(data)
    } catch (error) {
      console.error('Failed to fetch user tasteboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkFollowStatus = async () => {
    if (!currentDbUser) return
    
    try {
      const response = await fetch(`/api/follow/status?followerId=${currentDbUser.id}&followeeId=${id}`)
      if (response.ok) {
        const { isFollowing: status } = await response.json()
        setIsFollowing(status)
      }
    } catch (error) {
      console.error('Failed to check follow status:', error)
    }
  }

  const handleFollow = async () => {
    if (!currentDbUser) {
      router.push('/signin')
      return
    }

    try {
      const response = await fetch('/api/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          followerId: currentDbUser.id,
          followeeId: id
        }),
      })

      if (response.ok) {
        setIsFollowing(!isFollowing)
        // Update follower count
        if (user) {
          setUser(prev => prev ? {
            ...prev,
            _count: {
              ...prev._count,
              followers: isFollowing ? prev._count.followers - 1 : prev._count.followers + 1
            }
          } : null)
        }
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error)
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentDbUser || !newItem.item.trim()) return

    try {
      const response = await fetch('/api/tasteboards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: newItem.category,
          item: newItem.item.trim(),
          userId: currentDbUser.id
        }),
      })

      if (response.ok) {
        const newTasteboardItem = await response.json()
        setTasteboards(prev => [newTasteboardItem, ...prev])
        setNewItem({ category: 'BOOK', item: '' })
        setShowAddForm(false)
        
        // Update the count
        if (user) {
          setUser(prev => prev ? {
            ...prev,
            _count: {
              ...prev._count,
              tasteboards: prev._count.tasteboards + 1
            }
          } : null)
        }
      }
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  const filteredTasteboards = selectedCategory === 'ALL' 
    ? tasteboards 
    : tasteboards.filter(item => item.category === selectedCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">User not found</div>
      </div>
    )
  }

  const isOwnProfile = currentDbUser?.id === user.id

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      
      {/* Profile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.name || user.email}</h1>
              <p className="text-gray-600 mt-1">Member since {new Date(user.createdAt).toLocaleDateString()}</p>
              
              <div className="flex items-center space-x-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{user._count.tasteboards}</div>
                  <div className="text-sm text-gray-600">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{user._count.followers}</div>
                  <div className="text-sm text-gray-600">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{user._count.following}</div>
                  <div className="text-sm text-gray-600">Following</div>
                </div>
              </div>
            </div>
            
            {!isOwnProfile && currentDbUser && (
              <button
                onClick={handleFollow}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isFollowing
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tasteboard Section */}
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {isOwnProfile ? 'Your Tasteboard' : `${user.name || user.email}'s Tasteboard`}
          </h2>
          
          {isOwnProfile && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {showAddForm ? 'Cancel' : 'Add Item'}
            </button>
          )}
        </div>

        {/* Add Item Form */}
        {showAddForm && isOwnProfile && (
          <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">Add New Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="BOOK">Book</option>
                  <option value="MOVIE">Movie</option>
                  <option value="SHOW">Show</option>
                  <option value="MUSIC">Music</option>
                  <option value="PODCAST">Podcast</option>
                  <option value="ARTICLE">Article</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item
                </label>
                <input
                  type="text"
                  value={newItem.item}
                  onChange={(e) => setNewItem(prev => ({ ...prev, item: e.target.value }))}
                  placeholder="Enter the title, artist, author, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Add Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setNewItem({ category: 'BOOK', item: '' })
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

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

        {/* Tasteboard Items */}
        <div className="space-y-4">
          {filteredTasteboards.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500 text-lg">
                {isOwnProfile 
                  ? "You haven't added any items to your tasteboard yet." 
                  : `${user.name || user.email} hasn't added any items yet.`
                }
              </p>
              {isOwnProfile && !showAddForm && (
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
  )
} 
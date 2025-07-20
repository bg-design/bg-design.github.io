import { useState, useEffect } from 'react'
import Navigation from '../components/Navigation'
import ProtectedRoute from '../components/ProtectedRoute'
import Link from 'next/link'

interface LeaderboardUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
  _count: {
    tasteboards: number
    followers: number
    following: number
  }
}

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        // Sort by number of tasteboard items (descending)
        const sortedUsers = data.sort((a: LeaderboardUser, b: LeaderboardUser) => 
          b._count.tasteboards - a._count.tasteboards
        )
        setUsers(sortedUsers)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-100">
        <Navigation />
        <div className="max-w-4xl mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Most Tasty Leaderboard</h1>
            <p className="text-gray-600">Users ranked by their tasteboard items</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Top Tasters</h2>
            </div>
            
            <div className="divide-y divide-gray-200">
              {users.map((user, index) => (
                <div key={user.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                        {index + 1}
                      </div>
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <Link 
                        href={`/profile/${user.id}`}
                        className="text-lg font-medium text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {user.name || user.email}
                      </Link>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-sm text-gray-600">
                          {user._count.tasteboards} items
                        </span>
                        <span className="text-sm text-gray-600">
                          {user._count.followers} followers
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {user._count.tasteboards}
                      </div>
                      <div className="text-xs text-gray-500">items</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {users.length === 0 && (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No users found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 
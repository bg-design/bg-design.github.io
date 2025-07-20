import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Navigation from '../components/Navigation'
import ProtectedRoute from '../components/ProtectedRoute'
import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'
import TasteboardItem from '../components/TasteboardItem'
import AddTasteboardForm from '../components/AddTasteboardForm'

// Add interfaces for leaderboard and user profile
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

// Define TasteboardItem type locally to avoid linter error
interface TasteboardItemType {
  id: string
  category: 'BOOK' | 'MOVIE' | 'SHOW' | 'MUSIC' | 'PODCAST' | 'ARTICLE'
  item: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  author?: string
  year?: string
  snippet?: string
  imageUrl?: string
  reviewScore?: number
  reviewText?: string
}

function RecentActivityItem({ user, item, category, imageUrl, reviewScore, reviewText }: { user: { id: string; name: string; email: string }, item: string, category: string, imageUrl?: string, reviewScore?: number, reviewText?: string }) {
  return (
    <div className="flex items-center space-x-3 py-2">
      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="thumb" className="w-8 h-8 object-cover" />
        ) : (
          <span className="text-xl">+</span>
        )}
      </div>
      <div className="text-sm flex-1">
        <div>
          <span className="font-semibold">{user.name || user.email}</span> added <span className="font-medium">{item}</span> <span className="text-gray-500">({category.charAt(0) + category.slice(1).toLowerCase()})</span>
        </div>
        {(typeof reviewScore === 'number' || reviewText) && (
          <div className="ml-1 mt-1 text-xs text-gray-700">
            {typeof reviewScore === 'number' && (
              <span className="font-bold text-blue-700">{reviewScore}/10</span>
            )}
            {reviewText && (
              <span className="ml-2 italic text-gray-600">{reviewText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter()
  const { user, dbUser, loading } = useAuth()
  // Tasteboard state
  const [tasteboards, setTasteboards] = useState<TasteboardItemType[]>([])
  const [loadingTasteboards, setLoadingTasteboards] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [viewMode, setViewMode] = useState<'my' | 'all'>('my')
  // Leaderboard state
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true)
  // Profile state
  // (Profile is just the current dbUser and their tasteboards)
  // Recent Activity state
  const [recentActivity, setRecentActivity] = useState<TasteboardItemType[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [recentLimit, setRecentLimit] = useState(10);
  const recentLoadingRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    console.log('Tasteboard effect:', { user, dbUser, viewMode });
    if (user && dbUser) {
      setLoadingTasteboards(true);
      fetchTasteboards();
    }
  }, [user, dbUser, viewMode]);

  useEffect(() => {
    if (user) {
      fetchLeaderboard()
    }
  }, [user])

  useEffect(() => {
    // Fetch all recent activity once
    const fetchRecent = async () => {
      setLoadingRecent(true);
      try {
        const response = await fetch('/api/tasteboards');
        const data = await response.json();
        if (Array.isArray(data)) {
          setRecentActivity(data);
        } else {
          console.error('Expected array for recent activity, got:', data);
          setRecentActivity([]);
        }
      } catch (error) {
        console.error('Failed to fetch recent activity:', error);
      } finally {
        setLoadingRecent(false);
      }
    };
    fetchRecent();
  }, []);

  // Infinite scroll for recent activity
  useEffect(() => {
    const handleScroll = () => {
      if (recentLoadingRef.current) return;
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 200 &&
        recentActivity.length > recentLimit
      ) {
        recentLoadingRef.current = true;
        setTimeout(() => {
          setRecentLimit((prev) => Math.min(prev + 10, recentActivity.length));
          recentLoadingRef.current = false;
        }, 100);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [recentActivity, recentLimit]);

  const fetchTasteboards = async () => {
    setLoadingTasteboards(true);
    try {
      let url = '/api/tasteboards';
      if (viewMode === 'my' && dbUser) {
        url += `?userId=${dbUser.id}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setTasteboards(data);
    } catch (error) {
      console.error('Failed to fetch tasteboards:', error);
    } finally {
      setLoadingTasteboards(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        const sortedUsers = data.sort((a: LeaderboardUser, b: LeaderboardUser) => b._count.tasteboards - a._count.tasteboards)
        setUsers(sortedUsers)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    } finally {
      setLoadingLeaderboard(false)
    }
  }

  const handleAddTasteboard = async (data: any) => {
    if (!dbUser) return
    try {
      const response = await fetch('/api/tasteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: dbUser.id }),
      })
      if (response.ok) {
        setShowAddForm(false)
        fetchTasteboards();
      }
    } catch (error) {
      console.error('Failed to add tasteboard:', error)
    }
  }

  // Add a callback to always fetch after add (form)
  const handleAddAndRefresh = async (data: any) => {
    await handleAddTasteboard(data);
  };

  // Delete tasteboard item
  const handleDeleteTasteboard = async (id: string) => {
    try {
      await fetch(`/api/tasteboards?id=${id}`, { method: 'DELETE' });
      fetchTasteboards();
    } catch (error) {
      console.error('Failed to delete tasteboard item:', error);
    }
  };

  // Compute set of item/category pairs the current user owns
  const ownedPairs = new Set(
    tasteboards
      .filter(item => dbUser && item.user.id === dbUser.id)
      .map(item => `${item.category}::${item.item.toLowerCase()}`)
  );

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/signin';
    }
    return null;
  }

  // Desktop sidebar (placeholder, not functional yet)
  // For now, just stack everything

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Navigation />
      <main className="max-w-4xl mx-auto p-8 space-y-12">
        {/* Welcome Section */}
        <section>
          <h1 className="text-4xl font-bold mb-4">Welcome to Tasteful</h1>
          <p className="text-lg mb-8">Share your favorite things and follow people who inspire your taste.</p>
        </section>

        {/* Tasteboard Section */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Tasteboard</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Add Item
            </button>
          </div>
          {/* View Mode Toggle */}
          <div className="mb-4 flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <button
              onClick={() => setViewMode('my')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'my' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:text-gray-900'}`}
            >
              My Items
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'all' ? 'bg-blue-500 text-white' : 'text-gray-700 hover:text-gray-900'}`}
            >
              All Items
            </button>
          </div>
          {/* Category Filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {['ALL', 'BOOK', 'MOVIE', 'SHOW', 'MUSIC', 'PODCAST', 'ARTICLE'].map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {category === 'ALL' ? 'All' : category}
              </button>
            ))}
          </div>
          {/* Add Form Modal */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg max-w-md w-full">
                <AddTasteboardForm
                  onSubmit={handleAddAndRefresh}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            </div>
          )}
          {/* Tasteboard Items */}
          <div className="space-y-4">
            {loadingTasteboards ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading tasteboard...</div>
              </div>
            ) : tasteboards.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">
                  {viewMode === 'my' ? "You haven't added any items to your tasteboard yet." : "No items found."}
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
              tasteboards
                .filter(item => selectedCategory === 'ALL' || item.category === selectedCategory)
                .length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg">
                      {selectedCategory === 'BOOK' && 'No books found in this view.'}
                      {selectedCategory === 'MOVIE' && 'No movies found in this view.'}
                      {selectedCategory === 'SHOW' && 'No shows found in this view.'}
                      {selectedCategory === 'MUSIC' && 'No music found in this view.'}
                      {selectedCategory === 'PODCAST' && 'No podcasts found in this view.'}
                      {selectedCategory === 'ARTICLE' && 'No articles found in this view.'}
                      {selectedCategory === 'APP' && 'No apps or websites found in this view.'}
                    </p>
                  </div>
                ) : (
                  tasteboards
                    .filter(item => selectedCategory === 'ALL' || item.category === selectedCategory)
                    .map((item) => (
                      <TasteboardItem
                        key={item.id}
                        id={item.id}
                        category={item.category}
                        item={item.item}
                        user={item.user}
                        createdAt={item.createdAt}
                        onDelete={handleDeleteTasteboard}
                        alreadyOwned={ownedPairs.has(`${item.category}::${item.item.toLowerCase()}`)}
                        onAdd={fetchTasteboards}
                        author={item.author}
                        year={item.year}
                        snippet={item.snippet}
                        imageUrl={item.imageUrl}
                        reviewScore={item.reviewScore}
                        reviewText={item.reviewText}
                      />
                    ))
                )
            )}
          </div>
        </section>

        {/* Leaderboard Section */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Most Tasty Leaderboard</h2>
          {loadingLeaderboard ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading leaderboard...</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {users.map((user, index) => (
                <div key={user.id} className="py-4 flex items-center space-x-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                      {index + 1}
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                      {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-lg font-medium text-gray-900">
                      {user.name || user.email}
                    </span>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-600">{user._count.tasteboards} items</span>
                      <span className="text-sm text-gray-600">{user._count.followers} followers</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{user._count.tasteboards}</div>
                    <div className="text-xs text-gray-500">items</div>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No users found.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Profile Section */}
        {dbUser && (
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Your Profile</h2>
            <div className="flex items-center space-x-6 mb-6">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {dbUser.name ? dbUser.name[0].toUpperCase() : dbUser.email[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900">{dbUser.name || dbUser.email}</h3>
                <p className="text-gray-600 mt-1">Member since {dbUser.createdAt ? new Date(dbUser.createdAt).toLocaleDateString() : ''}</p>
                <div className="flex items-center space-x-6 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{tasteboards.filter(item => item.user.id === dbUser.id).length}</div>
                    <div className="text-sm text-gray-600">Items</div>
                  </div>
                  {/* Follower/following counts would require more API calls or state */}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recent Activity Section */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          {loadingRecent ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading recent activity...</div>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No recent activity yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, recentLimit).map((item) => (
                <RecentActivityItem
                  key={item.id}
                  user={item.user}
                  item={item.item}
                  category={item.category}
                  imageUrl={item.imageUrl}
                  reviewScore={item.reviewScore}
                  reviewText={item.reviewText}
                />
              ))}
              {recentLimit < recentActivity.length && (
                <div className="text-center py-4 text-gray-400 text-sm">Scroll down to load more…</div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

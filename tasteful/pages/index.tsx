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

function RecentActivityItem({ user, item, category, imageUrl, reviewScore, reviewText, createdAt }: { user: { id: string; name: string; email: string }, item: string, category: string, imageUrl?: string, reviewScore?: number, reviewText?: string, createdAt: string }) {
  const slug = item.replace(/\s+/g, '-').toLowerCase();
  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) return 'just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hr${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };
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
          <Link href={`/profile/${user.id}`} className="font-semibold text-blue-700 hover:underline">{user.name || user.email}</Link> added{' '}
          <Link href={`/content/${category.toLowerCase()}/${slug}`} className="font-medium text-blue-700 hover:underline">{item}</Link>{' '}
          <span className="text-gray-500">({category.charAt(0) + category.slice(1).toLowerCase()})</span>
          <span className="ml-2 text-xs text-gray-400">{formatTimeAgo(createdAt)}</span>
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
  // Leaderboard show more/less toggle (must be at top level)
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);

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

  // Leaderboard Section
  // Only show users with at least 15 tasteboards
  const leaderboardUsers = users.filter(u => u._count.tasteboards >= 15).sort((a, b) => b._count.tasteboards - a._count.tasteboards);
  const displayedUsers = showAllLeaderboard ? leaderboardUsers : leaderboardUsers.slice(0, 5);

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <Navigation />
      <main className="max-w-4xl mx-auto p-8 space-y-12">
        {/* Welcome Section */}
        <section>
          <h1 className="text-4xl font-bold mb-4">Welcome to Tasteful</h1>
          <p className="text-lg mb-8">Share your favorite things and follow people who inspire your taste.</p>
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
              {displayedUsers.map((user, index) => (
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
                    <Link href={`/profile/${user.id}`} className="text-lg font-medium text-blue-700 hover:underline">
                      {user.name || user.email}
                    </Link>
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
              {leaderboardUsers.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No users found.</p>
                </div>
              )}
            </div>
          )}
          {leaderboardUsers.length > 5 && (
            <div className="text-center mt-4">
              <button
                className="text-blue-600 hover:underline font-medium"
                onClick={() => setShowAllLeaderboard(v => !v)}
              >
                {showAllLeaderboard ? 'Show Top 5' : `Show All (${leaderboardUsers.length})`}
              </button>
            </div>
          )}
        </section>

        {/* Recent Activity Section */}
        <section className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Recent Activity</h2>
            <div className="flex gap-2">
              {["ALL", "BOOK", "MOVIE", "SHOW", "MUSIC", "PODCAST", "ARTICLE"].map((cat) => (
                <button
                  key={cat}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${selectedCategory === cat ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          {loadingRecent ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading recent activity...</div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {(selectedCategory === 'ALL' ? recentActivity : recentActivity.filter(a => a.category === selectedCategory)).slice(0, recentLimit).map((a, idx) => (
                <RecentActivityItem key={a.id + idx} {...a} />
              ))}
              {recentActivity.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-gray-500">No recent activity found.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

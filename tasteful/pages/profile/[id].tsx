import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Navigation from '../../components/Navigation'
import TasteboardItem from '../../components/TasteboardItem'
import { useAuth } from '../../contexts/AuthContext'
import AddTasteboardForm from '../../components/AddTasteboardForm';
import { createClient } from '../../lib/supabase';

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
  bio?: string;
  profilePhoto?: string;
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
  const [editMode, setEditMode] = useState(false);
  // Add state for editing bio and profile photo
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [photoInput, setPhotoInput] = useState(user?.profilePhoto || '');
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const supabase = createClient();

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

  const handleAddTasteboard = async (data: any) => {
    if (!currentDbUser) return;
    try {
      const response = await fetch('/api/tasteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: currentDbUser.id }),
      });
      if (response.ok) {
        setShowAddForm(false);
        fetchUserTasteboards();
        fetchUserProfile(); // Refresh profile to update item count
      }
    } catch (error) {
      console.error('Failed to add tasteboard:', error);
    }
  };

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
              {/* Bio section */}
              <div className="mt-2">
                {isOwnProfile && editingBio ? (
                  <div className="flex items-center gap-2">
                    <textarea
                      className="border rounded px-2 py-1 w-full text-gray-900 placeholder-gray-900"
                      value={bioInput}
                      onChange={e => setBioInput(e.target.value)}
                      rows={2}
                    />
                    <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={async () => {
                      await fetch(`/api/users/${user.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ bio: bioInput })
                      });
                      setEditingBio(false);
                      fetchUserProfile();
                    }}>Save</button>
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded" onClick={() => { setEditingBio(false); setBioInput(user.bio || ''); }}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 text-base whitespace-pre-line">{user.bio || (isOwnProfile ? 'Add a bio...' : '')}</span>
                    {isOwnProfile && (
                      <button className="text-xs text-blue-500 underline ml-2" onClick={() => setEditingBio(true)}>Edit Bio</button>
                    )}
                  </div>
                )}
              </div>
              {/* Profile photo section */}
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={user.profilePhoto || user.avatarUrl || '/window.svg'}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border"
                />
                {isOwnProfile && (editingPhoto ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id="profile-photo-upload"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Get Supabase Auth user ID
                          const { data: { user: authUser } } = await supabase.auth.getUser();
                          if (!authUser) {
                            alert('You must be signed in to upload a photo.');
                            return;
                          }
                          setSelectedFileName(file.name);
                          // Upload to Supabase Storage using Supabase Auth user ID
                          const filePath = `profile-photos/${authUser.id}/${Date.now()}-${file.name}`;
                          const { data, error } = await supabase.storage.from('profile-photos').upload(filePath, file, { upsert: true });
                          if (!error) {
                            // Get public URL
                            const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
                            if (urlData?.publicUrl) {
                              setPhotoInput(urlData.publicUrl);
                            }
                          } else {
                            alert('Upload failed: ' + error.message);
                          }
                        } else {
                          setSelectedFileName("");
                        }
                      }}
                    />
                    <label
                      htmlFor="profile-photo-upload"
                      className="bg-blue-500 text-white px-3 py-1 rounded cursor-pointer"
                    >
                      Choose File
                    </label>
                    <span className="text-gray-900">
                      {selectedFileName || "No file chosen"}
                    </span>
                    <div className="text-xs text-gray-500 mt-1">Max file size: 2MB. Only images are allowed.</div>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 placeholder-black focus:placeholder-gray-400"
                      value={photoInput}
                      onChange={e => setPhotoInput(e.target.value)}
                      placeholder="Paste image URL..."
                    />
                    <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={async () => {
                      await fetch(`/api/users/${user.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profilePhoto: photoInput })
                      });
                      setEditingPhoto(false);
                      fetchUserProfile();
                      setSelectedFileName("");
                    }}>Save</button>
                    <button className="bg-gray-200 text-gray-700 px-3 py-1 rounded" onClick={() => { setEditingPhoto(false); setPhotoInput(user.profilePhoto || ''); setSelectedFileName(""); }}>Cancel</button>
                  </div>
                ) : (
                  <button className="text-xs text-blue-500 underline ml-2" onClick={() => setEditingPhoto(true)}>Edit Photo</button>
                ))}
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
            <div className="flex space-x-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {editMode ? 'Done' : 'Edit'}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                {showAddForm ? 'Cancel' : 'Add Item'}
              </button>
            </div>
          )}
        </div>
        {/* Add Item Modal */}
        {showAddForm && isOwnProfile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <AddTasteboardForm
                onSubmit={handleAddTasteboard}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        )}
        {/* Category Filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            { key: 'ALL', label: 'All' },
            { key: 'BOOK', label: 'Books' },
            { key: 'MOVIE', label: 'Movies' },
            { key: 'SHOW', label: 'TV Shows' },
            { key: 'MUSIC', label: 'Music' },
            { key: 'PODCAST', label: 'Podcasts' },
            { key: 'ARTICLE', label: 'Articles' },
            { key: 'APP', label: 'Apps' },
          ].map(({ key, label }) => {
            const isEmpty =
              key === 'ALL'
                ? tasteboards.length === 0
                : tasteboards.filter(item => item.category === key).length === 0;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === key
                  ? 'bg-blue-500 text-white'
                  : isEmpty
                    ? 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                style={{ cursor: 'pointer' }}
              >
                {label}
              </button>
            );
          })}
        </div>
        {/* Tasteboard Items */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading tasteboard...</div>
            </div>
          ) : filteredTasteboards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {selectedCategory === 'ALL' && isOwnProfile ? (
                  <>
                    You haven't added any items to your tasteboard yet.
                    <br />
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-4 text-blue-500 hover:text-blue-600 underline text-base"
                    >
                      Add your first item
                    </button>
                  </>
                ) : null}
                {selectedCategory === 'ALL' && !isOwnProfile && "No items found."}
                {selectedCategory === 'BOOK' && 'No books found in this tasteboard.'}
                {selectedCategory === 'MOVIE' && 'No movies found in this tasteboard.'}
                {selectedCategory === 'SHOW' && 'No shows found in this tasteboard.'}
                {selectedCategory === 'MUSIC' && 'No music found in this tasteboard.'}
                {selectedCategory === 'PODCAST' && 'No podcasts found in this tasteboard.'}
                {selectedCategory === 'ARTICLE' && 'No articles found in this tasteboard.'}
                {selectedCategory === 'APP' && 'No apps or websites found in this tasteboard.'}
              </p>
            </div>
          ) : (
            filteredTasteboards.map((item) => (
              <div key={item.id} className="relative group">
                <TasteboardItem {...item} />
                {isOwnProfile && editMode && (
                  <div className="absolute top-2 right-2 flex space-x-2 z-10">
                    <button
                      onClick={() => {
                        const event = new CustomEvent('edit-tasteboard-item', { detail: { id: item.id } });
                        window.dispatchEvent(event);
                      }}
                      className="bg-white bg-opacity-80 rounded-full p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-colors flex items-center"
                      title="Edit"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213l-4.182.465a.75.75 0 0 1-.82-.82l.465-4.182 12.899-12.899z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-900">Edit</span>
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/tasteboards?id=${item.id}`, { method: 'DELETE' });
                        fetchUserTasteboards();
                      }}
                      className="bg-white bg-opacity-80 rounded-full p-1 text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors"
                      title="Delete"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
} 
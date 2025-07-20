import React, { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext';

interface TasteboardItemProps {
  id: string
  category: 'BOOK' | 'MOVIE' | 'SHOW' | 'MUSIC' | 'PODCAST' | 'ARTICLE'
  item: string
  user: {
    id: string
    name: string
    email: string
  }
  createdAt: string
  onAdd?: () => void
  onDelete?: (id: string) => void
  alreadyOwned?: boolean
  author?: string
  year?: string
  snippet?: string
  imageUrl?: string
  reviewScore?: number
  reviewText?: string
}

const categoryColors = {
  BOOK: 'bg-blue-100 text-blue-800',
  MOVIE: 'bg-purple-100 text-purple-800',
  SHOW: 'bg-green-100 text-green-800',
  MUSIC: 'bg-yellow-100 text-yellow-800',
  PODCAST: 'bg-red-100 text-red-800',
  ARTICLE: 'bg-gray-100 text-gray-800'
}

const categoryIcons = {
  BOOK: '📚',
  MOVIE: '🎬',
  SHOW: '📺',
  MUSIC: '🎵',
  PODCAST: '🎧',
  ARTICLE: '📄'
}

export default function TasteboardItem({ id, category, item, user, createdAt, onAdd, onDelete, alreadyOwned, author, year, snippet, imageUrl, reviewScore, reviewText }: TasteboardItemProps) {
  const { dbUser } = useAuth();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editScore, setEditScore] = useState<number | ''>(reviewScore ?? '');
  const [editText, setEditText] = useState(reviewText ?? '');
  const [saving, setSaving] = useState(false);

  // Check if this item is already on the user's tasteboard (by item name and category)
  // In a real app, you'd want to check by unique item id or a better deduplication method
  // For now, we assume the parent page prevents duplicates, so we just track local state

  const handleAdd = async () => {
    if (!dbUser) return;
    setAdding(true);
    try {
      const res = await fetch('/api/tasteboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          item,
          userId: dbUser.id
        })
      });
      if (res.ok) {
        if (onAdd) onAdd();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleComment = () => {
    alert('Comment feature coming soon!');
  };

  const handleEdit = () => {
    setEditScore(reviewScore ?? '');
    setEditText(reviewText ?? '');
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setEditScore(reviewScore ?? '');
    setEditText(reviewText ?? '');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasteboards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, reviewScore: editScore === '' ? null : Number(editScore), reviewText: editText })
      });
      if (res.ok) {
        setEditing(false);
        // Optionally, trigger a refresh or update local state if needed
        window.location.reload(); // quick solution for now
      }
    } finally {
      setSaving(false);
    }
  };

  const isOwnItem = dbUser && dbUser.id === user.id;

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-start justify-between items-start">
        {/* Left: Larger Thumbnail */}
        <div className="flex-shrink-0">
          {isOwnItem && imageUrl ? (
            <img src={imageUrl} alt="cover" className="w-20 h-28 object-cover rounded shadow" />
          ) : (
            <div className={`w-12 h-16 rounded flex items-center justify-center text-2xl font-medium ${categoryColors[category]} bg-white overflow-hidden`}>
              {imageUrl ? (
                <img src={imageUrl} alt="cover" className="w-12 h-16 object-cover rounded" />
              ) : (
                categoryIcons[category]
              )}
            </div>
          )}
        </div>
        {/* Middle: Details, flex-grow to fill space */}
        <div className="flex flex-col flex-grow justify-between ml-6">
          <div>
            <h3 className="font-medium text-gray-900 text-lg">{item}</h3>
            {!isOwnItem && (
              <Link
                href={`/profile/${user.id}`}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                by {user.name || user.email}
              </Link>
            )}
            {isOwnItem && (
              <div className="mt-1 text-sm text-gray-700">
                {author && <div>by {author}</div>}
                {year && <div>Year: {year}</div>}
                {snippet && <div className="text-xs text-gray-500 mt-1" dangerouslySetInnerHTML={{__html: snippet}} />}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 mt-4 block">
            Added on {new Date(createdAt).toLocaleDateString()}
          </span>
        </div>
        {/* Right: My Score and My Review for own items, always rendered with fixed width */}
        {isOwnItem && (
          <div className="ml-8 flex flex-col w-56 relative items-start">
            {/* Edit pencil icon */}
            {!editing && (
              <button
                className="absolute top-0 right-0 text-gray-400 hover:text-blue-600"
                title="Edit"
                onClick={handleEdit}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L7.5 20.213l-4.182.465a.75.75 0 0 1-.82-.82l.465-4.182 12.899-12.899z" />
                </svg>
              </button>
            )}
            {editing ? (
              <>
                <div className="mb-2">
                  <span className="block text-xs font-semibold text-gray-500">My Score:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editScore}
                    onChange={e => setEditScore(e.target.value === '' ? '' : Math.max(1, Math.min(10, Number(e.target.value))))}
                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-1 text-gray-500">/10</span>
                </div>
                <div className="mb-2">
                  <span className="block text-xs font-semibold text-gray-500 mb-1">My Review:</span>
                  <textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2 mt-1">
                  <button
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                    onClick={handleSave}
                    disabled={saving || (editScore !== '' && (editScore < 1 || editScore > 10))}
                  >
                    Save
                  </button>
                  <button
                    className="bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-2">
                  <span className="block text-xs font-semibold text-gray-500">My Score:</span>
                  {typeof reviewScore === 'number' ? (
                    <span className="text-lg font-bold text-blue-700">{reviewScore}/10</span>
                  ) : (
                    <span className="text-gray-400 italic">No score</span>
                  )}
                </div>
                <div>
                  <span className="block text-xs font-semibold text-gray-500 mb-1">My Review:</span>
                  {reviewText ? (
                    <span className="text-gray-800 italic">{reviewText}</span>
                  ) : (
                    <span className="text-gray-400 italic">No review</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {/* End right column */}
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[category]}`}>{category}</span>
          {isOwnItem && onDelete && (
            <button
              className="ml-2 text-gray-400 hover:text-red-600"
              title="Delete"
              onClick={() => onDelete(id)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        {!isOwnItem && (
          <div className="flex space-x-2">
            <button
              className="text-sm text-green-600 hover:text-green-800 flex items-center disabled:opacity-50"
              onClick={handleAdd}
              disabled={adding || alreadyOwned}
              title={alreadyOwned ? 'Already on your tasteboard' : 'Add to My Tasteboard'}
            >
              <span className="text-lg font-bold mr-1">+</span> Add to My Tasteboard
            </button>
            <button className="text-sm text-gray-600 hover:text-gray-800" onClick={handleComment}>Comment</button>
          </div>
        )}
      </div>
    </div>
  )
} 
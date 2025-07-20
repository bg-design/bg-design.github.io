import React from 'react'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

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

export default function TasteboardItem({ id, category, item, user, createdAt }: TasteboardItemProps) {
  const { dbUser } = useAuth();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Check if this item is already on the user's tasteboard (by item name and category)
  // In a real app, you'd want to check by unique item id or a better deduplication method
  // For now, we assume the parent page prevents duplicates, so we just track local state

  const handleAdd = async () => {
    if (!dbUser || added) return;
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
        setAdded(true);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleComment = () => {
    alert('Comment feature coming soon!');
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${categoryColors[category]}`}>
            {categoryIcons[category]}
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{item}</h3>
            <Link 
              href={`/profile/${user.id}`}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              by {user.name || user.email}
            </Link>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[category]}`}>
          {category}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {new Date(createdAt).toLocaleDateString()}
        </span>
        <div className="flex space-x-2">
          <button
            className="text-sm text-green-600 hover:text-green-800 flex items-center disabled:opacity-50"
            onClick={handleAdd}
            disabled={adding || added || (dbUser && dbUser.id === user.id)}
            title={added ? 'Already added' : dbUser && dbUser.id === user.id ? 'This is your item' : 'Add to My Tasteboard'}
          >
            <span className="text-lg font-bold mr-1">+</span> {added ? 'Added!' : 'Add to My Tasteboard'}
          </button>
          <button className="text-sm text-gray-600 hover:text-gray-800" onClick={handleComment}>Comment</button>
        </div>
      </div>
    </div>
  )
} 
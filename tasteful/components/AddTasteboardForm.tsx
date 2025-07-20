import React, { useState } from 'react'

interface AddTasteboardFormProps {
  onSubmit: (data: { category: string; item: string }) => void
  onCancel: () => void
}

export default function AddTasteboardForm({ onSubmit, onCancel }: AddTasteboardFormProps) {
  const [category, setCategory] = useState('BOOK')
  const [item, setItem] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (item.trim()) {
      onSubmit({ category, item: item.trim() })
      setItem('')
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Add to Your Tasteboard</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="BOOK">📚 Book</option>
            <option value="MOVIE">🎬 Movie</option>
            <option value="SHOW">📺 Show</option>
            <option value="MUSIC">🎵 Music</option>
            <option value="PODCAST">🎧 Podcast</option>
            <option value="ARTICLE">📄 Article</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="item"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="Enter the title..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add to Tasteboard
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
} 
import React, { useState, useEffect, useRef } from 'react'

interface AddTasteboardFormProps {
  onSubmit: (data: { category: string; item: string }) => void
  onCancel: () => void
}

export default function AddTasteboardForm({ onSubmit, onCancel }: AddTasteboardFormProps) {
  const [category, setCategory] = useState('BOOK')
  const [item, setItem] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<any | null>(null);
  const [reviewScore, setReviewScore] = useState<number | ''>('');
  const [reviewText, setReviewText] = useState('');
  const reviewScoreRef = useRef<HTMLInputElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    if (!item || !category) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLoadingSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        let data;
        if (category === 'ARTICLE' || category === 'APP') {
          const res = await fetch(`/api/autocomplete?category=${encodeURIComponent(category)}&query=${encodeURIComponent(item)}`);
          data = await res.json();
          setSuggestions(data.results || []);
          setShowSuggestions(true);
          // Auto-select the first suggestion for ARTICLE/APP if valid
          if (data.results && data.results.length > 0) {
            setSelectedSuggestion(data.results[0]);
          } else {
            setSelectedSuggestion(null);
          }
          return;
        } else {
          const res = await fetch(`/api/autocomplete?category=${encodeURIComponent(category)}&query=${encodeURIComponent(item)}`);
          data = await res.json();
        }
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
        setShowSuggestions(false);
        setSelectedSuggestion(null);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [item, category]);

  const handleSuggestionClick = (suggestion: any) => {
    setItem(suggestion.title);
    setSelectedSuggestion(suggestion);
    setShowSuggestions(false);
    setInputFocused(false);
    setTimeout(() => {
      reviewScoreRef.current?.focus();
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedSuggestion && reviewScore !== '' && reviewScore >= 1 && reviewScore <= 10) {
      let suggestionToSubmit = { ...selectedSuggestion };
      if (!suggestionToSubmit.imageUrl && suggestionToSubmit.cover_i) {
        suggestionToSubmit.imageUrl = `https://covers.openlibrary.org/b/id/${suggestionToSubmit.cover_i}-M.jpg`;
      }
      onSubmit({
        category,
        item: suggestionToSubmit.title,
        ...suggestionToSubmit,
        reviewScore: Number(reviewScore),
        reviewText: reviewText.trim() || undefined
      })
      setItem('')
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedSuggestion(null)
      setReviewScore('')
      setReviewText('')
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
            <option value="APP">🖥️ App/Website</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="item" className="block text-sm font-medium text-gray-700 mb-1">
            {category === 'ARTICLE' ? 'Link' : category === 'APP' ? 'App/Website Link' : 'Title'}
          </label>
          <input
            type={category === 'ARTICLE' || category === 'APP' ? 'url' : 'text'}
            id="item"
            value={item}
            onChange={(e) => {
              setItem(e.target.value);
              setSelectedSuggestion(null);
              setShowSuggestions(true);
            }}
            placeholder={category === 'ARTICLE' ? 'Paste the article URL...' : category === 'APP' ? 'Paste the app or website URL...' : 'Enter the title...'}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoComplete="off"
            onFocus={() => {
              setInputFocused(true);
              if (!selectedSuggestion && suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => { setInputFocused(false); setShowSuggestions(false); }, 150)}
            disabled={false}
          />
          {showSuggestions && inputFocused && !selectedSuggestion && (
            <ul className="absolute z-10 bg-white border border-gray-200 rounded-md mt-1 w-full max-h-56 overflow-y-auto shadow-lg">
              {loadingSuggestions && (
                <li className="px-4 py-2 text-gray-400">Loading...</li>
              )}
              {!loadingSuggestions && suggestions.length === 0 && item.length > 1 && (
                <li className="px-4 py-2 text-gray-400">No results found</li>
              )}
              {suggestions.map((s, idx) => {
                // Try to get a thumbnail from known fields
                // let thumb = s.imageUrl || s.artworkUrl100;
                // if (!thumb && s.cover_i) {
                //   thumb = `https://covers.openlibrary.org/b/id/${s.cover_i}-S.jpg`;
                // }
                return (
                  <li
                    key={s.title + idx}
                    className="px-4 py-2 hover:bg-blue-100 cursor-pointer flex items-center"
                    onMouseDown={() => handleSuggestionClick(s)}
                  >
                    {/* Remove thumbnail from suggestions */}
                    <span className="font-medium">{s.title}</span>
                    {s.author && <span className="ml-2 text-xs text-gray-500">by {s.author}</span>}
                    {s.year && <span className="ml-2 text-xs text-gray-400">({s.year})</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {selectedSuggestion && (
            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded flex items-center">
              {/* Show thumbnail in preview for all categories */}
              {(() => {
                let thumb = selectedSuggestion.imageUrl || selectedSuggestion.artworkUrl100 || selectedSuggestion.image;
                if (!thumb && selectedSuggestion.cover_i) {
                  thumb = `https://covers.openlibrary.org/b/id/${selectedSuggestion.cover_i}-M.jpg`;
                }
                return thumb ? <img src={thumb} alt="cover" className="w-12 h-16 object-cover rounded shadow mr-3" /> : null;
              })()}
              <div>
                <div className="font-semibold">{selectedSuggestion.title}</div>
                {selectedSuggestion.author && <div className="text-sm text-gray-600">by {selectedSuggestion.author}</div>}
                {selectedSuggestion.year && <div className="text-sm text-gray-400">Year: {selectedSuggestion.year}</div>}
                {selectedSuggestion.snippet && <div className="text-xs text-gray-500 mt-1" dangerouslySetInnerHTML={{__html: selectedSuggestion.snippet}} />}
                {selectedSuggestion.description && <div className="text-sm text-gray-600">{selectedSuggestion.description}</div>}
                {selectedSuggestion.url && (
                  <a href={selectedSuggestion.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mt-1 block">{selectedSuggestion.url}</a>
                )}
              </div>
            </div>
          )}
        </div>
        {/* Review fields */}
        <div className="mt-4">
          <label htmlFor="reviewScore" className="block text-sm font-medium text-gray-700 mb-1">
            Your Score (1-10)
          </label>
          <input
            type="number"
            id="reviewScore"
            min={1}
            max={10}
            value={reviewScore}
            onChange={e => setReviewScore(e.target.value === '' ? '' : Math.max(1, Math.min(10, Number(e.target.value))))}
            className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            ref={reviewScoreRef}
          />
        </div>
        <div className="mt-2">
          <label htmlFor="reviewText" className="block text-sm font-medium text-gray-700 mb-1">
            Your Review (optional)
          </label>
          <textarea
            id="reviewText"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write your thoughts..."
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            type="submit"
            className={`flex-1 bg-blue-500 text-white py-2 px-4 rounded-md transition-colors ${!selectedSuggestion || reviewScore === '' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'}`}
            disabled={!selectedSuggestion || reviewScore === ''}
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
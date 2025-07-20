import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import { useState, useRef, useEffect } from 'react';

export default function Navigation() {
  const router = useRouter()
  const { user, dbUser, signOut } = useAuth()
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<any[]>([]);
  const [contentSuggestions, setContentSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (search.length < 2) {
      setUserSuggestions([]);
      setContentSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const fetchSuggestions = async () => {
      const [userRes, contentRes] = await Promise.all([
        fetch(`/api/users?q=${encodeURIComponent(search)}`),
        fetch(`/api/autocomplete?type=CONTENT&query=${encodeURIComponent(search)}`)
      ]);
      let users = [];
      let content = [];
      if (userRes.ok) users = await userRes.json();
      if (contentRes.ok) content = (await contentRes.json()).results;
      // Filter content by type if a type keyword is present in the search
      const typeMap: Record<string, string> = {
        book: 'BOOK', books: 'BOOK',
        movie: 'MOVIE', movies: 'MOVIE',
        show: 'SHOW', shows: 'SHOW', 'tv show': 'SHOW', 'tv shows': 'SHOW',
        music: 'MUSIC',
        podcast: 'PODCAST', podcasts: 'PODCAST',
        article: 'ARTICLE', articles: 'ARTICLE',
        app: 'APP', apps: 'APP',
      };
      let filteredContent = content;
      const lowerSearch = search.toLowerCase().trim();
      // Improved type keyword extraction and filtering
      const words = lowerSearch.split(/\s+/).filter(Boolean);
      let foundType = null;
      let restWords: string[] = [];
      for (const word of words) {
        if (typeMap[word]) {
          foundType = typeMap[word];
        } else {
          restWords.push(word);
        }
      }
      if (foundType) {
        const queryPart = restWords.join(' ');
        if (!queryPart) {
          filteredContent = content.filter((c: any) => (c.type && c.type.toUpperCase()) === foundType);
          console.log('Type filter:', foundType, 'Content types:', content.map((c: any) => c.type));
        } else {
          filteredContent = content.filter((c: any) => (c.type && c.type.toUpperCase()) === foundType && c.title.toLowerCase().includes(queryPart));
          console.log('Type+query filter:', foundType, 'Query:', queryPart, 'Content types:', content.map((c: any) => c.type));
        }
      } else if (lowerSearch.length > 0) {
        filteredContent = content.filter((c: any) => c.title.toLowerCase().includes(lowerSearch));
      }
      setUserSuggestions(users);
      setContentSuggestions(filteredContent);
      setShowSuggestions(true);
    };
    fetchSuggestions();
  }, [search]);

  const handleUserClick = (userId: string) => {
    setShowSuggestions(false);
    setSearch('');
    router.push(`/profile/${userId}`);
  };
  const handleContentClick = (type: string, id: string) => {
    setShowSuggestions(false);
    setSearch('');
    router.push(`/content/${type.toLowerCase()}/${id}`);
  };

  const handleSignOut = async () => {
    await signOut()
    router.push('/signin')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-8 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
            Tasteful
          </Link>
          <div className="flex items-center space-x-6">
            {/* Search for Tastemakers and Content */}
            <div className="flex items-center justify-center flex-1">
              <div className="relative w-full max-w-md">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </span>
                <input
                  type="text"
                  placeholder="Find Tastemakers or Content"
                  className="pl-10 pr-3 py-2 w-full rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 placeholder:text-gray-900 text-gray-900 mx-auto"
                  style={{ width: 320, margin: '0 auto', display: 'block' }}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => { if (userSuggestions.length > 0 || contentSuggestions.length > 0) setShowSuggestions(true); }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  ref={searchRef}
                />
                {showSuggestions && (userSuggestions.length > 0 || contentSuggestions.length > 0) && (
                  <ul className="absolute left-0 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-50 max-h-80 overflow-y-auto">
                    {userSuggestions.length > 0 && (
                      <li className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Tastemakers</li>
                    )}
                    {userSuggestions.map((s: any) => (
                      <li
                        key={s.id}
                        className="px-4 py-2 hover:bg-blue-100 cursor-pointer text-gray-900"
                        onMouseDown={() => handleUserClick(s.id)}
                      >
                        <span className="font-medium">{s.name || 'Tastemaker'}</span>
                      </li>
                    ))}
                    {contentSuggestions.length > 0 && (
                      <li className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wider">Content</li>
                    )}
                    {contentSuggestions.map((c: any, idx: number) => (
                      <li
                        key={`${c.id}-${c.type}-${idx}`}
                        className="px-4 py-2 hover:bg-green-100 cursor-pointer flex items-center text-gray-900"
                        onMouseDown={() => handleContentClick(c.type, c.id)}
                      >
                        {c.imageUrl || c.image ? (
                          <img src={c.imageUrl || c.image} alt="thumb" className="w-6 h-6 object-cover rounded mr-2" />
                        ) : (
                          <span className="w-6 h-6 mr-2 flex items-center justify-center text-lg">+</span>
                        )}
                        <span className="font-medium">{c.title}</span>
                        <span className="ml-2 text-xs text-gray-500">{c.type.charAt(0) + c.type.slice(1).toLowerCase()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {/* Removed Home, Tasteboard, and Leaderboard links for single-page layout */}
            {user && dbUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen((open) => !open)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {dbUser.name ? dbUser.name[0].toUpperCase() : dbUser.email[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {dbUser.name || dbUser.email}
                  </span>
                  <svg className="w-4 h-4 ml-1 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-50">
                    <Link
                      href={`/profile/${dbUser.id}`}
                      className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                      onClick={() => setDropdownOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                href="/signin"
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
} 
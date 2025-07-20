import type { NextApiRequest, NextApiResponse } from 'next';

const fetchOpenLibrary = async (query: string) => {
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`);
  const data = await res.json();
  return (data.docs || []).map((doc: any) => ({
    title: doc.title,
    author: doc.author_name ? doc.author_name.join(', ') : undefined,
    year: doc.first_publish_year,
    type: 'BOOK',
    cover_i: doc.cover_i // add cover_i for thumbnail
  }));
};

const fetchITunes = async (query: string, media: string) => {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=${media}&limit=10`);
  const data = await res.json();
  return (data.results || []).map((item: any) => ({
    title: item.trackName || item.collectionName,
    author: item.artistName,
    year: item.releaseDate ? item.releaseDate.slice(0, 4) : undefined,
    type: media === 'music' ? 'MUSIC' : 'PODCAST',
  }));
};

const fetchWikipedia = async (query: string) => {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=10`);
  const data = await res.json();
  return (data.query?.search || []).map((item: any) => ({
    title: item.title,
    snippet: item.snippet,
    type: 'ARTICLE',
  }));
};

const fetchTMDB = async (query: string, type: 'movie' | 'tv') => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return [];
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((item: any) => ({
    title: type === 'movie' ? item.title : item.name,
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    type: type === 'movie' ? 'MOVIE' : 'SHOW',
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined,
  }));
};

const fetchMicrolink = async (url: string) => {
  const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
  const data = await res.json();
  if (data.status === 'success') {
    return [{
      title: data.data.title,
      description: data.data.description,
      image: data.data.image?.url,
      url: data.data.url,
      type: 'APP_OR_ARTICLE',
    }];
  }
  return [];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category, query, type } = req.query;
  if ((!category && !type) || !query || (category && typeof category !== 'string') || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing category/type or query' });
  }

  try {
    let results: any[] = [];
    if (type === 'CONTENT') {
      // Search all categories for content
      const bookResults = await fetchOpenLibrary(query);
      const movieResults = await fetchTMDB(query, 'movie');
      const showResults = await fetchTMDB(query, 'tv');
      const musicResults = await fetchITunes(query, 'music');
      const podcastResults = await fetchITunes(query, 'podcast');
      const articleResults = await fetchWikipedia(query);
      // For apps, just use Microlink on the query if it looks like a URL
      let appResults: any[] = [];
      if (/^https?:\/\//.test(query)) {
        appResults = await fetchMicrolink(query);
      }
      // Add a type and a unique id/slug for each
      results = [
        ...(bookResults.map((r: any) => ({ ...r, type: 'BOOK', id: r.cover_i ? `book-${r.cover_i}` : `book-${r.title.replace(/\s+/g, '-').toLowerCase()}` }))),
        ...(movieResults.map((r: any) => ({ ...r, type: 'MOVIE', id: r.title ? `movie-${r.title.replace(/\s+/g, '-').toLowerCase()}` : undefined }))),
        ...(showResults.map((r: any) => ({ ...r, type: 'SHOW', id: r.title ? `show-${r.title.replace(/\s+/g, '-').toLowerCase()}` : undefined }))),
        ...(musicResults.map((r: any) => ({ ...r, type: 'MUSIC', id: r.title ? `music-${r.title.replace(/\s+/g, '-').toLowerCase()}` : undefined }))),
        ...(podcastResults.map((r: any) => ({ ...r, type: 'PODCAST', id: r.title ? `podcast-${r.title.replace(/\s+/g, '-').toLowerCase()}` : undefined }))),
        ...(articleResults.map((r: any) => ({ ...r, type: 'ARTICLE', id: r.title ? `article-${r.title.replace(/\s+/g, '-').toLowerCase()}` : undefined }))),
        ...(appResults.map((r: any) => ({ ...r, type: 'APP', id: r.url ? `app-${encodeURIComponent(r.url)}` : undefined }))),
      ].filter((r: any) => r.id);
    } else if (category === 'BOOK') {
      results = await fetchOpenLibrary(query);
    } else if (category === 'MOVIE') {
      results = await fetchTMDB(query, 'movie');
    } else if (category === 'SHOW') {
      results = await fetchTMDB(query, 'tv');
    } else if (category === 'MUSIC') {
      results = await fetchITunes(query, 'music');
    } else if (category === 'PODCAST') {
      results = await fetchITunes(query, 'podcast');
    } else if (category === 'ARTICLE' || category === 'APP') {
      results = await fetchMicrolink(query);
    }
    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
} 
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import TasteboardItem from '../../../components/TasteboardItem';
import Navigation from '../../../components/Navigation';
import Link from 'next/link';

export default function ContentPage() {
  const router = useRouter();
  const { type, id } = router.query;
  const [metadata, setMetadata] = useState<any>(null);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type || !id) return;
    let titleQuery = id as string;
    if (typeof titleQuery === 'string') {
      titleQuery = titleQuery.replace(/^[a-z]+-/, '').replace(/-/g, ' ');
    }
    const fetchData = async () => {
      setLoading(true);
      // Fetch all Tasteful activity for this content
      const activityRes = await fetch(`/api/tasteboards`);
      const allActivity = await activityRes.json();
      // Filter by type and id (slug or cover_i match)
      const filtered = allActivity.filter((item: any) => {
        if (type === 'book' && item.category === 'BOOK' && item.imageUrl && id && item.imageUrl.includes(id.toString().replace('book-', ''))) return true;
        if (item.category.toLowerCase() === type && (item.item.replace(/\s+/g, '-').toLowerCase() === id || item.id === id)) return true;
        return false;
      });
      setActivity(filtered);
      // Use the first matching tasteboard item as metadata
      if (filtered.length > 0) {
        setMetadata(filtered[0]);
      } else {
        // Fallback: fetch metadata from autocomplete API using parsed title
        const metaRes = await fetch(`/api/autocomplete?category=${type.toString().toUpperCase()}&query=${encodeURIComponent(titleQuery)}`);
        const metaData = await metaRes.json();
        setMetadata(metaData.results && metaData.results[0]);
      }
      setLoading(false);
    };
    fetchData();
  }, [type, id]);

  if (loading) return <div className="min-h-screen bg-gray-100 p-8 text-center">Loading...</div>;
  // Always show the title at the top, fallback to activity[0]?.item if metadata.title is missing
  const displayTitle = metadata?.title || (activity[0] && activity[0].item) || '';
  if (!displayTitle) return <div className="min-h-screen bg-gray-100 p-8 text-center text-gray-500">Content not found.</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />
      <div className="max-w-2xl mx-auto p-8">
        <div className="flex items-start space-x-6 mb-8">
          {metadata?.imageUrl || metadata?.image ? (
            <img src={metadata.imageUrl || metadata.image} alt="cover" className="w-32 h-44 object-cover rounded shadow" />
          ) : null}
          <div>
            <h1 className="text-3xl font-bold mb-2 text-gray-900">{displayTitle}</h1>
            {metadata?.author && <div className="text-lg text-gray-800 mb-1">by {metadata.author}</div>}
            {metadata?.year && <div className="text-gray-700 mb-1">Year: {metadata.year}</div>}
            {metadata?.snippet && <div className="text-xs text-gray-700 mb-2" dangerouslySetInnerHTML={{__html: metadata.snippet}} />}
            {metadata?.description && <div className="text-sm text-gray-800 mb-2">{metadata.description}</div>}
            {/* External ratings placeholders */}
            <div className="flex space-x-4 mt-2">
              <span className="text-xs text-gray-600">Rotten Tomatoes: <span className="font-semibold">N/A</span></span>
              <span className="text-xs text-gray-600">IMDb: <span className="font-semibold">N/A</span></span>
              <span className="text-xs text-gray-600">Metacritic: <span className="font-semibold">N/A</span></span>
            </div>
          </div>
        </div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Tasteful Activity</h2>
        {activity.length === 0 ? (
          <div className="text-gray-600">No activity yet for this content.</div>
        ) : (
          <div className="space-y-4">
            {activity.map((item: any) => (
              <div key={item.id} className="bg-white rounded p-4 shadow flex flex-col">
                <div className="flex items-center space-x-2 mb-1">
                  <Link href={`/profile/${item.user.id}`} className="font-semibold text-blue-700 hover:underline">{item.user.name || item.user.email}</Link>
                  {typeof item.reviewScore === 'number' && (
                    <span className="text-sm text-blue-700 font-bold">{item.reviewScore}/10</span>
                  )}
                </div>
                {item.reviewText && (
                  <div className="text-gray-800 italic text-sm">{item.reviewText}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 
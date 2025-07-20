import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// --- Fetchers from autocomplete logic ---
const fetchOpenLibrary = async (query: string) => {
  const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=1`);
  const data = await res.json();
  const doc = (data.docs || [])[0];
  if (!doc) return null;
  return {
    title: doc.title,
    author: doc.author_name ? doc.author_name.join(', ') : undefined,
    year: doc.first_publish_year,
    type: 'BOOK',
    cover_i: doc.cover_i,
    imageUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined
  };
};
const fetchTMDB = async (query: string, type: 'movie' | 'tv') => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.themoviedb.org/3/search/${type}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=en-US&page=1&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();
  const item = (data.results || [])[0];
  if (!item) return null;
  return {
    title: type === 'movie' ? item.title : item.name,
    year: (item.release_date || item.first_air_date || '').slice(0, 4),
    type: type === 'movie' ? 'MOVIE' : 'SHOW',
    imageUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined
  };
};
const fetchITunes = async (query: string, media: string) => {
  const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=${media}&limit=1`);
  const data = await res.json();
  const item = (data.results || [])[0];
  if (!item) return null;
  return {
    title: item.trackName || item.collectionName,
    author: item.artistName,
    year: item.releaseDate ? item.releaseDate.slice(0, 4) : undefined,
    type: media === 'music' ? 'MUSIC' : 'PODCAST',
    imageUrl: item.artworkUrl100
  };
};
const fetchWikipedia = async (query: string) => {
  const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`);
  const data = await res.json();
  const item = (data.query?.search || [])[0];
  if (!item) return null;
  return {
    title: item.title,
    snippet: item.snippet,
    type: 'ARTICLE',
    // No imageUrl from Wikipedia search
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Clear existing followers and tasteboards to avoid unique constraint errors
    await prisma.follower.deleteMany({});
    await prisma.tasteboard.deleteMany({});
    // Generate 50 unique, realistic users
    const firstNames = [
      'Olivia', 'Liam', 'Emma', 'Noah', 'Ava', 'Elijah', 'Sophia', 'Lucas', 'Mia', 'Mason',
      'Isabella', 'Logan', 'Charlotte', 'Ethan', 'Amelia', 'James', 'Harper', 'Benjamin', 'Evelyn', 'Jacob',
      'Henry', 'Ella', 'Alexander', 'Scarlett', 'Sebastian', 'Grace', 'Jack', 'Chloe', 'Owen', 'Penelope',
      'Leo', 'Layla', 'William', 'Zoe', 'Daniel', 'Lily', 'Matthew', 'Nora', 'Jackson', 'Hazel',
      'Carter', 'Aurora', 'Wyatt', 'Violet', 'Julian', 'Riley', 'Luke', 'Aria', 'David', 'Ellie'
    ];
    const lastNames = [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Hernandez',
      'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
      'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
      'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
      'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez'
    ];
    // Shuffle and pair first/last names for uniqueness
    function shuffle(arr: string[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }
    const shuffledFirst = shuffle([...firstNames]);
    const shuffledLast = shuffle([...lastNames]);
    const userObjs = Array.from({ length: 50 }).map((_, i) => {
      const first = shuffledFirst[i % shuffledFirst.length];
      const last = shuffledLast[i % shuffledLast.length];
      const name = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;
      return { name, email, avatarUrl: `https://api.dicebear.com/7.x/personas/svg?seed=${first}${last}` };
    });
    // Upsert users
    const userRecords = await Promise.all(userObjs.map(u =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: u
      })
    ));
    // Helper to get a random date in the last month
    function randomDateInLastMonth() {
      const now = new Date();
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
    }
    // Curated, trending, and award-winning content for 2023-2024, with reviews
    const categories = [
      { category: 'BOOK', items: [
        { item: 'Tomorrow, and Tomorrow, and Tomorrow', author: 'Gabrielle Zevin', year: '2022', reviews: [
          { score: 10, text: 'A moving, original story about friendship and creativity.' },
          { score: 9, text: 'Beautifully written and full of heart.' },
          { score: 8, text: 'A unique take on gaming and relationships.' }
        ]},
        { item: 'Fourth Wing', author: 'Rebecca Yarros', year: '2023', reviews: [
          { score: 9, text: 'Dragons, romance, and action—what more could you want?' },
          { score: 8, text: 'A fun, fast-paced fantasy adventure.' },
          { score: 7, text: 'Enjoyable, but a bit predictable.' }
        ]},
        { item: 'The Covenant of Water', author: 'Abraham Verghese', year: '2023', reviews: [
          { score: 10, text: 'Epic, lush, and deeply human.' },
          { score: 9, text: 'A sweeping family saga with beautiful prose.' },
          { score: 8, text: 'Richly detailed and emotional.' }
        ]},
        { item: 'Demon Copperhead', author: 'Barbara Kingsolver', year: '2022', reviews: [
          { score: 10, text: 'A powerful, modern retelling of David Copperfield.' },
          { score: 9, text: 'Raw, honest, and unforgettable.' },
          { score: 8, text: 'Kingsolver at her best.' }
        ]},
        { item: 'Lessons in Chemistry', author: 'Bonnie Garmus', year: '2022', reviews: [
          { score: 9, text: 'Funny, smart, and empowering.' },
          { score: 8, text: 'A delightful read with a memorable heroine.' },
          { score: 7, text: 'Charming, but a bit quirky.' }
        ]},
        { item: 'The Heaven & Earth Grocery Store', author: 'James McBride', year: '2023', reviews: [
          { score: 9, text: 'A vibrant, compassionate portrait of community.' },
          { score: 8, text: 'Richly drawn characters and setting.' },
          { score: 7, text: 'Heartwarming and hopeful.' }
        ]},
        { item: 'The Wager', author: 'David Grann', year: '2023', reviews: [
          { score: 9, text: 'A gripping tale of survival and betrayal.' },
          { score: 8, text: 'Fascinating history, well told.' },
          { score: 7, text: 'A bit dense, but rewarding.' }
        ]},
        { item: 'Supercommunicators', author: 'Charles Duhigg', year: '2024', reviews: [
          { score: 8, text: 'Insightful and practical advice for better conversations.' },
          { score: 7, text: 'Useful, but a bit repetitive.' },
          { score: 9, text: 'A must-read for anyone who wants to connect.' }
        ]},
        { item: 'After the Spike', author: 'Dean Spears & Michael Geruso', year: '2025', reviews: [
          { score: 8, text: 'Thought-provoking and timely.' },
          { score: 7, text: 'Dense but rewarding.' },
          { score: 9, text: 'A fascinating look at the future of humanity.' }
        ]},
        { item: 'The Great Awakening of 2025', author: 'Tyler Bach', year: '2025', reviews: [
          { score: 7, text: 'Interesting ideas, but a bit speculative.' },
          { score: 8, text: 'A bold vision of the future.' },
          { score: 6, text: 'Not for everyone, but worth a look.' }
        ]}
      ]},
      { category: 'MOVIE', items: [
        { item: 'Oppenheimer', year: '2023', reviews: [
          { score: 10, text: 'A masterful biopic with stunning visuals and a haunting score.' },
          { score: 9, text: 'Nolan at his best—intense, cerebral, and beautifully shot.' },
          { score: 7, text: 'Great acting, but a bit too long for my taste.' }
        ]},
        { item: 'Barbie', year: '2023', reviews: [
          { score: 9, text: 'Clever, funny, and surprisingly deep.' },
          { score: 8, text: 'A visual treat with a strong message.' },
          { score: 7, text: 'Fun, but a bit overhyped.' }
        ]},
        { item: 'Everything Everywhere All at Once', year: '2022', reviews: [
          { score: 10, text: 'Wild, inventive, and deeply moving.' },
          { score: 9, text: 'A genre-bending masterpiece.' },
          { score: 8, text: 'Confusing at times, but worth it.' }
        ]},
        { item: 'Dune: Part Two', year: '2024', reviews: [
          { score: 9, text: 'Epic sci-fi done right.' },
          { score: 8, text: 'Visually stunning and immersive.' },
          { score: 7, text: 'A bit slow, but gorgeous.' }
        ]},
        { item: 'Poor Things', year: '2023', reviews: [
          { score: 9, text: 'Weird, wonderful, and unforgettable.' },
          { score: 8, text: 'Emma Stone is phenomenal.' },
          { score: 7, text: 'Not for everyone, but unique.' }
        ]},
        { item: 'Killers of the Flower Moon', year: '2023', reviews: [
          { score: 9, text: 'A powerful, haunting true story.' },
          { score: 8, text: 'Scorsese delivers another classic.' },
          { score: 7, text: 'Long, but worth it.' }
        ]},
        { item: 'The Holdovers', year: '2023', reviews: [
          { score: 8, text: 'Heartfelt and funny.' },
          { score: 7, text: 'A charming holiday film.' },
          { score: 9, text: 'Paul Giamatti shines.' }
        ]},
        { item: 'Past Lives', year: '2023', reviews: [
          { score: 9, text: 'A beautiful, bittersweet love story.' },
          { score: 8, text: 'Poignant and deeply felt.' },
          { score: 7, text: 'Slow, but moving.' }
        ]},
        { item: 'Spider-Man: Across the Spider-Verse', year: '2023', reviews: [
          { score: 10, text: 'Visually groundbreaking and thrilling.' },
          { score: 9, text: 'A worthy sequel with heart.' },
          { score: 8, text: 'Great animation, fun story.' }
        ]},
        { item: 'Maestro', year: '2023', reviews: [
          { score: 8, text: 'A moving portrait of Leonard Bernstein.' },
          { score: 7, text: 'Well-acted and stylish.' },
          { score: 9, text: 'Bradley Cooper impresses as director and star.' }
        ]}
      ]},
      { category: 'SHOW', items: [
        { item: 'Succession', year: '2018-2023', reviews: [
          { score: 9, text: 'Complex, dark, and addictive.' },
          { score: 8, text: 'A masterclass in storytelling.' },
          { score: 7, text: 'A bit too soap opera-ish for my taste.' }
        ]},
        { item: 'The Bear', year: '2022-2024', reviews: [
          { score: 9, text: 'Raw, gritty, and brutally honest.' },
          { score: 8, text: 'A brilliant exploration of masculinity.' },
          { score: 7, text: 'A bit too violent for my liking.' }
        ]},
        { item: 'The Last of Us', year: '2023', reviews: [
          { score: 9, text: 'A tense, emotional, and well-acted adaptation.' },
          { score: 8, text: 'A chilling, realistic portrayal of a post-apocalyptic world.' },
          { score: 7, text: 'A bit slow, but compelling.' }
        ]},
        { item: 'Ted Lasso', year: '2020-2023', reviews: [
          { score: 9, text: 'Hilarious, heartwarming, and surprisingly deep.' },
          { score: 8, text: 'A feel-good show with a great message.' },
          { score: 7, text: 'A bit predictable, but enjoyable.' }
        ]},
        { item: 'Beef', year: '2023', reviews: [
          { score: 8, text: 'A dark comedy with a lot of heart.' },
          { score: 7, text: 'A bit too violent for my taste.' },
          { score: 9, text: 'A unique, thought-provoking story.' }
        ]},
        { item: 'The Crown', year: '2016-2023', reviews: [
          { score: 9, text: 'Beautifully shot and acted.' },
          { score: 8, text: 'A fascinating look at British royalty.' },
          { score: 7, text: 'A bit too soap opera-ish.' }
        ]},
        { item: 'Only Murders in the Building', year: '2021-2024', reviews: [
          { score: 9, text: 'Hilarious, clever, and surprisingly smart.' },
          { score: 8, text: 'A fun, quirky murder mystery.' },
          { score: 7, text: 'A bit too campy for my taste.' }
        ]},
        { item: 'The Diplomat', year: '2023', reviews: [
          { score: 8, text: 'Intriguing, well-paced, and thought-provoking.' },
          { score: 7, text: 'A bit too political for my taste.' },
          { score: 9, text: 'A fascinating look at diplomacy.' }
        ]},
        { item: 'Wednesday', year: '2022', reviews: [
          { score: 9, text: 'A dark, quirky, and fun take on Wednesday Addams.' },
          { score: 8, text: 'A great, well-acted character study.' },
          { score: 7, text: 'A bit too campy for my taste.' }
        ]},
        { item: 'Severance', year: '2022', reviews: [
          { score: 8, text: 'A thought-provoking, well-executed experiment in identity.' },
          { score: 7, text: 'A bit too confusing for my taste.' },
          { score: 9, text: 'A fascinating look at the human condition.' }
        ]}
      ]},
      { category: 'MUSIC', items: [
        { item: 'Flowers', author: 'Miley Cyrus', year: '2023', reviews: [
          { score: 9, text: 'A catchy, upbeat, and empowering song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit repetitive, but enjoyable.' }
        ]},
        { item: 'Anti-Hero', author: 'Taylor Swift', year: '2022', reviews: [
          { score: 9, text: 'A powerful, emotional, and well-crafted song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too dark for my taste.' }
        ]},
        { item: 'As It Was', author: 'Harry Styles', year: '2022', reviews: [
          { score: 9, text: 'A catchy, upbeat, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too similar to other pop songs.' }
        ]},
        { item: 'Unholy', author: 'Sam Smith & Kim Petras', year: '2022', reviews: [
          { score: 9, text: 'A powerful, emotional, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too dark for my taste.' }
        ]},
        { item: 'Paint the Town Red', author: 'Doja Cat', year: '2023', reviews: [
          { score: 9, text: 'A catchy, upbeat, and empowering song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit repetitive, but enjoyable.' }
        ]},
        { item: 'Calm Down', author: 'Rema & Selena Gomez', year: '2022', reviews: [
          { score: 9, text: 'A catchy, upbeat, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too similar to other pop songs.' }
        ]},
        { item: 'Creepin’', author: 'Metro Boomin, The Weeknd & 21 Savage', year: '2022', reviews: [
          { score: 9, text: 'A powerful, emotional, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too dark for my taste.' }
        ]},
        { item: 'Vampire', author: 'Olivia Rodrigo', year: '2023', reviews: [
          { score: 9, text: 'A powerful, emotional, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too dark for my taste.' }
        ]},
        { item: 'Dance the Night', author: 'Dua Lipa', year: '2023', reviews: [
          { score: 9, text: 'A catchy, upbeat, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too similar to other pop songs.' }
        ]},
        { item: 'Last Night', author: 'Morgan Wallen', year: '2023', reviews: [
          { score: 9, text: 'A catchy, upbeat, and well-produced song.' },
          { score: 8, text: 'A great pop song with a strong message.' },
          { score: 7, text: 'A bit too similar to other pop songs.' }
        ]}
      ]},
      { category: 'PODCAST', items: [
        { item: 'The Daily', author: 'The New York Times', year: '2024', reviews: [
          { score: 9, text: 'Informative, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great way to start the day.' },
          { score: 7, text: 'A bit too political for my taste.' }
        ]},
        { item: 'SmartLess', author: 'Will Arnett, Jason Bateman, Sean Hayes', year: '2024', reviews: [
          { score: 9, text: 'Hilarious, smart, and entertaining.' },
          { score: 8, text: 'A great comedy podcast.' },
          { score: 7, text: 'A bit too raunchy for my taste.' }
        ]},
        { item: 'Crime Junkie', author: 'Ashley Flowers & Brit Prawat', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great true crime podcast.' },
          { score: 7, text: 'A bit too graphic for my taste.' }
        ]},
        { item: 'Radiolab', author: 'WNYC Studios', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great science and culture podcast.' },
          { score: 7, text: 'A bit too technical for my taste.' }
        ]},
        { item: 'The Retrievals', author: 'Serial Productions', year: '2023', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great true crime podcast.' },
          { score: 7, text: 'A bit too graphic for my taste.' }
        ]},
        { item: 'The Rest Is History', author: 'Tom Holland & Dominic Sandbrook', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great history podcast.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'The Ezra Klein Show', author: 'Vox Media', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great political podcast.' },
          { score: 7, text: 'A bit too political for my taste.' }
        ]},
        { item: 'The Daily Stoic', author: 'Ryan Holiday', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great philosophy podcast.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'The Mel Robbins Podcast', author: 'Mel Robbins', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great self-help podcast.' },
          { score: 7, text: 'A bit too self-promotional for my taste.' }
        ]},
        { item: 'On Purpose with Jay Shetty', author: 'Jay Shetty', year: '2024', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great self-help podcast.' },
          { score: 7, text: 'A bit too self-promotional for my taste.' }
        ]}
      ]},
      { category: 'ARTICLE', items: [
        { item: 'AI 2027: The Scenario Everyone’s Talking About', snippet: 'A detailed scenario about the impact of superhuman AI, widely discussed in 2025.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great technology article.' },
          { score: 7, text: 'A bit too technical for my taste.' }
        ]},
        { item: 'The Last Invention', snippet: 'Why Humanity’s Final Creation Changes Everything. A viral essay in 2025.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great science article.' },
          { score: 7, text: 'A bit too technical for my taste.' }
        ]},
        { item: 'Tomorrow, and Tomorrow, and Tomorrow (novel)', snippet: 'A 2022 novel by Gabrielle Zevin, one of the most borrowed books in 2024.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great literature article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'After the Spike: Population, Progress, and the Case for People', snippet: 'A 2025 book by Dean Spears and Michael Geruso, widely reviewed and discussed.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great non-fiction article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'Supercommunicators: How to Unlock the Secret Language of Connection', snippet: 'A 2024 book by Charles Duhigg, bestseller and widely cited.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great self-help article.' },
          { score: 7, text: 'A bit too self-promotional for my taste.' }
        ]},
        { item: 'The 100 Best Books of the 21st Century', snippet: 'A 2024 NYT feature, highly shared.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great literature article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'The Great Awakening of 2025', snippet: 'A 2025 book by Tyler Bach, trending on Amazon.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great non-fiction article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'Is It Good or Bad News If Humanity Depopulates?', snippet: 'A 2025 viral review of "After the Spike".', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great non-fiction article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]},
        { item: 'The Rise of AI', snippet: 'Exploring the impact of artificial intelligence, 2024.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great technology article.' },
          { score: 7, text: 'A bit too technical for my taste.' }
        ]},
        { item: 'Why We Sleep', snippet: 'A deep dive into the science of sleep, 2024.', reviews: [
          { score: 9, text: 'Intriguing, well-produced, and thought-provoking.' },
          { score: 8, text: 'A great non-fiction article.' },
          { score: 7, text: 'A bit too dry for my taste.' }
        ]}
      ]}
    ];
    // Expanded pool of unique review texts for variety
    const reviewTexts = [
      'Absolutely loved it!',
      'A must-experience for everyone.',
      'Didn’t quite live up to the hype.',
      'Would recommend to friends.',
      'Changed my perspective.',
      'A bit overrated, but still good.',
      'Masterpiece!',
      'Not my cup of tea.',
      'Brilliant and engaging.',
      'Couldn’t put it down.',
      'A tour de force.',
      'Left me speechless.',
      'A rollercoaster of emotions.',
      'A visual feast.',
      'A literary gem.',
      'A cinematic triumph.',
      'A moving performance.',
      'A story that stays with you.',
      'A must-see for fans.',
      'A fresh take on the genre.',
      'A true classic.',
      'A modern masterpiece.',
      'A delightful surprise.',
      'A bit too long, but worth it.',
      'A new favorite.',
      'A wild ride from start to finish.',
      'A beautiful exploration of humanity.',
      'A clever and witty script.',
      'A heartwarming journey.',
      'A powerful message.',
      'A stunning achievement.',
      'A fun and entertaining experience.',
      'A deeply emotional story.',
      'A bold and ambitious work.',
      'A thought-provoking narrative.',
      'A unique voice in the field.',
      'A must-listen for everyone.',
      'A fascinating look at the subject.',
      'A gripping tale.',
      'A charming and quirky adventure.',
      'A bit predictable, but enjoyable.',
      'A strong cast and direction.',
      'A visually stunning production.',
      'A story full of heart.',
      'A compelling character study.',
      'A rich and immersive world.',
      'A satisfying conclusion.',
      'A great addition to the series.',
      'A fun twist on expectations.',
      'A memorable soundtrack.',
      'A must-read for fans.',
      'A showstopper.',
      'A page-turner.',
      'A laugh-out-loud comedy.',
      'A tearjerker.',
      'A suspenseful thriller.',
      'A feel-good story.',
      'A dark and moody atmosphere.',
      'A lighthearted romp.',
      'A fascinating documentary.',
      'A groundbreaking work.',
      'A poetic and lyrical style.',
      'A masterclass in storytelling.',
      'A must-see event.',
      'A cultural phenomenon.',
      'A genre-defining piece.',
      'A bold experiment.',
      'A moving tribute.',
      'A sharp social commentary.',
      'A dazzling display of talent.',
      'A fun family adventure.',
      'A haunting and unforgettable tale.',
      'A clever satire.',
      'A riveting plot.',
      'A beautiful score.',
      'A must-have for collectors.',
      'A show with real heart.',
      'A podcast that inspires.',
      'A song that gets stuck in your head.',
      'A book that changed my life.',
      'A movie I’ll never forget.',
      'A show I binge-watched in one night.',
      'A podcast I recommend to everyone.',
      'A song I play on repeat.',
      'A book I’ll read again.',
      'A movie I’ll watch again and again.',
      'A show I can’t stop thinking about.',
      'A podcast that makes me think.',
      'A song that lifts my spirits.',
      'A book that made me cry.',
      'A movie that made me laugh.',
      'A show that made me feel seen.',
      'A podcast that changed my mind.',
      'A song that brings back memories.',
      'A book that opened my eyes.',
      'A movie that surprised me.',
      'A show that broke new ground.',
      'A podcast that’s always in my queue.',
      'A song that defines a generation.',
      'A book that’s a must-read.',
      'A movie that’s a must-see.',
      'A show that’s a must-watch.',
      'A podcast that’s a must-listen.',
      'A song that’s a must-hear.'
    ];
    // Assign unique reviews to each item
    let reviewIndex = 0;
    for (const cat of categories) {
      for (const item of cat.items) {
        if (!item.reviews) item.reviews = [];
        item.reviews = [];
        // Assign 3 unique reviews per item
        for (let i = 0; i < 3; i++) {
          item.reviews.push({
            score: Math.floor(Math.random() * 4) + 7, // 7-10
            text: reviewTexts[reviewIndex % reviewTexts.length]
          });
          reviewIndex++;
        }
      }
    }
    // Generate 700 fake tasteboard actions
    const tasteboards = await Promise.all(Array.from({ length: 700 }).map(async () => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const item = cat.items[Math.floor(Math.random() * cat.items.length)];
      const user = userRecords[Math.floor(Math.random() * userRecords.length)];
      // Pick a review for this item
      const review = item.reviews ? item.reviews[Math.floor(Math.random() * item.reviews.length)] : { score: 8, text: 'Interesting.' };
      // Type guards for optional fields
      const data: any = {
        category: cat.category as any,
        item: item.item,
        userId: user.id,
        reviewScore: review.score,
        reviewText: review.text,
        createdAt: randomDateInLastMonth(),
      };
      if ('author' in item) data.author = item.author;
      if ('year' in item) data.year = item.year;
      if ('snippet' in item) data.snippet = item.snippet;
      // Dynamically fetch imageUrl based on category and item title
      let fetchedMeta = null;
      if (cat.category === 'BOOK') {
        fetchedMeta = await fetchOpenLibrary(item.item);
      } else if (cat.category === 'MOVIE') {
        fetchedMeta = await fetchTMDB(item.item, 'movie');
      } else if (cat.category === 'SHOW') {
        fetchedMeta = await fetchTMDB(item.item, 'tv');
      } else if (cat.category === 'MUSIC') {
        fetchedMeta = await fetchITunes(item.item, 'music');
      } else if (cat.category === 'PODCAST') {
        fetchedMeta = await fetchITunes(item.item, 'podcast');
      } // For ARTICLE, keep placeholder or use Microlink if you have a URL
      if (fetchedMeta && fetchedMeta.imageUrl) {
        data.imageUrl = fetchedMeta.imageUrl;
      } else if ('imageUrl' in item && item.imageUrl) {
        // fallback to any legacy imageUrl in item (should be rare)
        data.imageUrl = item.imageUrl;
      } // else, no imageUrl, fallback to emoji/placeholder in UI
      return prisma.tasteboard.create({ data });
    }));

    // Create some follow relationships
    await Promise.all([
      prisma.follower.create({
        data: {
          followerId: userRecords[0].id, // Assuming user1 is the first user in userRecords
          followeeId: userRecords[1].id
        }
      }),
      prisma.follower.create({
        data: {
          followerId: userRecords[1].id,
          followeeId: userRecords[0].id
        }
      }),
      prisma.follower.create({
        data: {
          followerId: userRecords[2].id,
          followeeId: userRecords[0].id
        }
      })
    ])

    res.status(200).json({ 
      message: 'Seeded with real content',
      users: userRecords,
      tasteboards: tasteboards.length
    })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({ error: 'Failed to seed database' })
  }
} 
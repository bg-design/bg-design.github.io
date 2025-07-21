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

// Main seeding logic as an async function
async function seed() {
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
        ]},
        { item: 'Outlive: The Science and Art of Longevity', author: 'Peter Attia', year: '2023', reviews: [
          { score: 9, text: 'A science-based, practical guide to living longer.' },
          { score: 8, text: 'Insightful and actionable advice for healthspan.' },
          { score: 7, text: 'Dense but rewarding for those interested in longevity.' }
        ]},
        { item: 'Excellent Advice for Living', author: 'Kevin Kelly', year: '2023', reviews: [
          { score: 9, text: 'Packed with wisdom and practical life lessons.' },
          { score: 8, text: 'A book to revisit again and again.' },
          { score: 7, text: 'Short, punchy, and inspiring.' }
        ]},
        { item: 'The Fraud', author: 'Zadie Smith', year: '2023', reviews: [
          { score: 9, text: 'A brilliant historical novel with sharp wit.' },
          { score: 8, text: 'Smith’s prose is as dazzling as ever.' },
          { score: 7, text: 'A complex, rewarding read.' }
        ]},
        { item: 'Wellness', author: 'Nathan Hill', year: '2023', reviews: [
          { score: 9, text: 'A satirical look at modern life and relationships.' },
          { score: 8, text: 'Funny, poignant, and thought-provoking.' },
          { score: 7, text: 'A big, ambitious novel.' }
        ]},
        { item: 'The Bee Sting', author: 'Paul Murray', year: '2023', reviews: [
          { score: 9, text: 'A darkly comic family saga.' },
          { score: 8, text: 'Brilliantly written and deeply affecting.' },
          { score: 7, text: 'A tragicomic masterpiece.' }
        ]},
        { item: 'The Vaster Wilds', author: 'Lauren Groff', year: '2023', reviews: [
          { score: 9, text: 'A haunting survival story.' },
          { score: 8, text: 'Groff’s writing is mesmerizing.' },
          { score: 7, text: 'A powerful meditation on nature and humanity.' }
        ]},
        { item: 'The Last Devil to Die', author: 'Richard Osman', year: '2023', reviews: [
          { score: 9, text: 'A clever, twisty mystery.' },
          { score: 8, text: 'Osman’s best yet.' },
          { score: 7, text: 'Funny and full of heart.' }
        ]},
        { item: 'Yellowface', author: 'R.F. Kuang', year: '2023', reviews: [
          { score: 9, text: 'A razor-sharp satire of the publishing world.' },
          { score: 8, text: 'Provocative and unputdownable.' },
          { score: 7, text: 'A timely, thought-provoking read.' }
        ]},
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
        ]},
        { item: 'The Zone of Interest', year: '2023', reviews: [
          { score: 9, text: 'A chilling, unforgettable Holocaust drama.' },
          { score: 8, text: 'Stark, powerful, and deeply affecting.' },
          { score: 7, text: 'A unique cinematic experience.' }
        ]},
        { item: 'Anatomy of a Fall', year: '2023', reviews: [
          { score: 9, text: 'A gripping courtroom thriller.' },
          { score: 8, text: 'Brilliantly acted and written.' },
          { score: 7, text: 'Keeps you guessing until the end.' }
        ]},
        { item: 'The Boy and the Heron', year: '2023', reviews: [
          { score: 9, text: 'A stunning return from Studio Ghibli.' },
          { score: 8, text: 'Visually breathtaking and emotionally rich.' },
          { score: 7, text: 'A magical, moving film.' }
        ]},
        { item: 'American Fiction', year: '2023', reviews: [
          { score: 9, text: 'A sharp, satirical comedy.' },
          { score: 8, text: 'Smart, funny, and timely.' },
          { score: 7, text: 'A clever take on race and publishing.' }
        ]},
        { item: 'The Marvels', year: '2023', reviews: [
          { score: 8, text: 'A fun, action-packed superhero adventure.' },
          { score: 7, text: 'Entertaining and energetic.' },
          { score: 6, text: 'A solid addition to the MCU.' }
        ]},
        { item: 'Saltburn', year: '2023', reviews: [
          { score: 9, text: 'A dark, twisted drama.' },
          { score: 8, text: 'Stylish and provocative.' },
          { score: 7, text: 'A wild ride.' }
        ]},
        { item: 'May December', year: '2023', reviews: [
          { score: 9, text: 'A provocative, complex drama.' },
          { score: 8, text: 'Brilliant performances.' },
          { score: 7, text: 'Unsettling and fascinating.' }
        ]},
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
        ]},
        { item: 'The Fall of the House of Usher', year: '2023', reviews: [
          { score: 9, text: 'A gothic horror masterpiece.' },
          { score: 8, text: 'Dark, stylish, and addictive.' },
          { score: 7, text: 'A wild, spooky ride.' }
        ]},
        { item: 'Jury Duty', year: '2023', reviews: [
          { score: 9, text: 'A hilarious, inventive reality show.' },
          { score: 8, text: 'Surprisingly heartfelt and funny.' },
          { score: 7, text: 'A clever twist on reality TV.' }
        ]},
        { item: 'Blue Eye Samurai', year: '2023', reviews: [
          { score: 9, text: 'A visually stunning animated epic.' },
          { score: 8, text: 'Action-packed and beautifully crafted.' },
          { score: 7, text: 'A must-watch for animation fans.' }
        ]},
        { item: 'The Gilded Age', year: '2023', reviews: [
          { score: 9, text: 'A lavish period drama.' },
          { score: 8, text: 'Gorgeous costumes and sets.' },
          { score: 7, text: 'A feast for the eyes.' }
        ]},
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
        ]},
        { item: 'Snooze', author: 'SZA', year: '2023', reviews: [
          { score: 9, text: 'A smooth, sultry R&B hit.' },
          { score: 8, text: 'SZA’s vocals are mesmerizing.' },
          { score: 7, text: 'A standout track from the album.' }
        ]},
        { item: 'Fast Car', author: 'Luke Combs', year: '2023', reviews: [
          { score: 9, text: 'A heartfelt country cover.' },
          { score: 8, text: 'A fresh take on a classic.' },
          { score: 7, text: 'Luke Combs makes it his own.' }
        ]},
        { item: 'Cruel Summer', author: 'Taylor Swift', year: '2023', reviews: [
          { score: 9, text: 'A pop anthem for the summer.' },
          { score: 8, text: 'Catchy and energetic.' },
          { score: 7, text: 'Swift at her best.' }
        ]},
        { item: 'What Was I Made For?', author: 'Billie Eilish', year: '2023', reviews: [
          { score: 9, text: 'A haunting, emotional ballad.' },
          { score: 8, text: 'Billie Eilish delivers again.' },
          { score: 7, text: 'A beautiful, introspective song.' }
        ]},
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
          { score: 9, text: 'A gripping, true story.' },
          { score: 8, text: 'Well-produced and thought-provoking.' },
          { score: 7, text: 'A must-listen for true crime fans.' }
        ]},
        { item: 'The Rest Is Politics', author: 'Goalhanger Podcasts', year: '2023', reviews: [
          { score: 9, text: 'Insightful and timely political analysis.' },
          { score: 8, text: 'Engaging hosts and guests.' },
          { score: 7, text: 'A must-listen for politics junkies.' }
        ]},
        { item: 'The Mel Robbins Podcast', author: 'Mel Robbins', year: '2024', reviews: [
          { score: 9, text: 'Motivational and practical advice.' },
          { score: 8, text: 'Mel Robbins is inspiring.' },
          { score: 7, text: 'A great listen for self-improvement.' }
        ]},
        { item: 'The Ezra Klein Show', author: 'Vox Media', year: '2024', reviews: [
          { score: 9, text: 'Thoughtful interviews and analysis.' },
          { score: 8, text: 'Always relevant and insightful.' },
          { score: 7, text: 'A must-listen for news junkies.' }
        ]},
        { item: 'The Rest Is History', author: 'Tom Holland & Dominic Sandbrook', year: '2024', reviews: [
          { score: 9, text: 'Fascinating and entertaining history.' },
          { score: 8, text: 'Great chemistry between hosts.' },
          { score: 7, text: 'History made fun.' }
        ]},
        { item: 'The Witch Trials of J.K. Rowling', author: 'The Free Press', year: '2023', reviews: [
          { score: 9, text: 'A controversial, thought-provoking series.' },
          { score: 8, text: 'Well-researched and balanced.' },
          { score: 7, text: 'A fascinating look at cancel culture.' }
        ]},
        { item: 'Scamanda', author: 'Lionsgate Sound', year: '2023', reviews: [
          { score: 9, text: 'A wild, unbelievable true story.' },
          { score: 8, text: 'Addictive and shocking.' },
          { score: 7, text: 'A must-listen for podcast fans.' }
        ]},
        { item: 'Normal Gossip', author: 'Defector Media', year: '2023', reviews: [
          { score: 9, text: 'Funny, relatable, and addictive.' },
          { score: 8, text: 'A unique take on gossip.' },
          { score: 7, text: 'A fun, lighthearted listen.' }
        ]},
      ]},
      { category: 'APP', items: [
        { item: 'Notion', author: 'Notion Labs', year: '2023', reviews: [
          { score: 9, text: 'The all-in-one workspace that keeps my life organized.' },
          { score: 8, text: 'Flexible, powerful, and easy to use for teams and individuals.' },
          { score: 7, text: 'A bit of a learning curve, but worth it.' }
        ]},
        { item: 'Spotify', author: 'Spotify AB', year: '2023', reviews: [
          { score: 10, text: 'The best music streaming app with endless playlists.' },
          { score: 9, text: 'Great recommendations and seamless experience.' },
          { score: 8, text: 'Occasional ads, but the music library is unbeatable.' }
        ]},
        { item: 'Figma', author: 'Figma, Inc.', year: '2023', reviews: [
          { score: 9, text: 'Collaboration on design projects has never been easier.' },
          { score: 8, text: 'Intuitive interface and real-time editing.' },
          { score: 7, text: 'A must-have for designers.' }
        ]},
        { item: 'ChatGPT', author: 'OpenAI', year: '2024', reviews: [
          { score: 10, text: 'Incredible AI assistant for writing, coding, and more.' },
          { score: 9, text: 'A game-changer for productivity and creativity.' },
          { score: 8, text: 'Sometimes makes mistakes, but always helpful.' }
        ]},
        { item: 'Duolingo', author: 'Duolingo, Inc.', year: '2023', reviews: [
          { score: 9, text: 'Learning languages is fun and addictive.' },
          { score: 8, text: 'Great for daily practice and motivation.' },
          { score: 7, text: 'Some lessons feel repetitive, but it works.' }
        ]},
        { item: 'TikTok', author: 'ByteDance', year: '2023', reviews: [
          { score: 9, text: 'Endless entertainment and creativity in short videos.' },
          { score: 8, text: 'The algorithm is scarily good at knowing what I like.' },
          { score: 7, text: 'Can be a time sink, but so much fun.' }
        ]},
        { item: 'Discord', author: 'Discord Inc.', year: '2023', reviews: [
          { score: 9, text: 'The best app for community and group chats.' },
          { score: 8, text: 'Voice and video calls are smooth and reliable.' },
          { score: 7, text: 'A little overwhelming for new users.' }
        ]},
        { item: 'Canva', author: 'Canva Pty Ltd', year: '2023', reviews: [
          { score: 9, text: 'Designing graphics is easy and fun for everyone.' },
          { score: 8, text: 'Huge template library and simple tools.' },
          { score: 7, text: 'Some features are paywalled, but the free version is great.' }
        ]},
        { item: 'Obsidian', author: 'Obsidian.md', year: '2023', reviews: [
          { score: 9, text: 'The best app for personal knowledge management.' },
          { score: 8, text: 'Markdown support and linking notes is a game-changer.' },
          { score: 7, text: 'Takes time to master, but worth it for power users.' }
        ]},
        { item: 'Arc Browser', author: 'The Browser Company', year: '2024', reviews: [
          { score: 9, text: 'A fresh, innovative take on web browsing.' },
          { score: 8, text: 'Beautiful UI and great productivity features.' },
          { score: 7, text: 'Still missing some extensions, but improving fast.' }
        ]},
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
        ]},
        { item: 'Outlive: The Science and Art of Longevity', snippet: 'A 2023 bestseller by Peter Attia, exploring the science of living longer.', reviews: [
          { score: 9, text: 'A fascinating look at longevity science.' },
          { score: 8, text: 'Well-researched and practical.' },
          { score: 7, text: 'A must-read for health enthusiasts.' }
        ]},
        { item: 'Excellent Advice for Living', snippet: 'Kevin Kelly’s 2023 book of practical wisdom and life lessons.', reviews: [
          { score: 9, text: 'Packed with wisdom and practical advice.' },
          { score: 8, text: 'A book to revisit again and again.' },
          { score: 7, text: 'Short, punchy, and inspiring.' }
        ]},
        { item: 'The Last Invention', snippet: 'A 2025 essay on the impact of artificial general intelligence.', reviews: [
          { score: 9, text: 'A thought-provoking look at the future of AI.' },
          { score: 8, text: 'Balanced and insightful.' },
          { score: 7, text: 'A must-read for tech enthusiasts.' }
        ]},
        { item: 'The Fraud', snippet: 'Zadie Smith’s acclaimed 2023 novel, reviewed and discussed widely.', reviews: [
          { score: 9, text: 'A brilliant historical novel.' },
          { score: 8, text: 'Smith’s prose is dazzling.' },
          { score: 7, text: 'A complex, rewarding read.' }
        ]},
        { item: 'The Zone of Interest', snippet: 'A 2023 film reviewed for its chilling Holocaust drama.', reviews: [
          { score: 9, text: 'A chilling, unforgettable film.' },
          { score: 8, text: 'Stark, powerful, and deeply affecting.' },
          { score: 7, text: 'A unique cinematic experience.' }
        ]},
        { item: 'The Bee Sting', snippet: 'Paul Murray’s 2023 novel, a darkly comic family saga.', reviews: [
          { score: 9, text: 'A tragicomic masterpiece.' },
          { score: 8, text: 'Brilliantly written and deeply affecting.' },
          { score: 7, text: 'A darkly comic family saga.' }
        ]},
        { item: 'The Witch Trials of J.K. Rowling', snippet: 'A 2023 podcast series reviewed for its controversial exploration of cancel culture.', reviews: [
          { score: 9, text: 'A fascinating look at cancel culture.' },
          { score: 8, text: 'Well-researched and balanced.' },
          { score: 7, text: 'A controversial, thought-provoking series.' }
        ]},
        { item: 'The Marvels', snippet: 'A 2023 Marvel film reviewed for its fun, action-packed adventure.', reviews: [
          { score: 8, text: 'A fun superhero adventure.' },
          { score: 7, text: 'Entertaining and energetic.' },
          { score: 6, text: 'A solid addition to the MCU.' }
        ]},
        { item: 'Saltburn', snippet: 'A 2023 film reviewed for its dark, twisted drama.', reviews: [
          { score: 9, text: 'A dark, twisted drama.' },
          { score: 8, text: 'Stylish and provocative.' },
          { score: 7, text: 'A wild ride.' }
        ]},
        { item: 'The Boy and the Heron', snippet: 'A 2023 Studio Ghibli film reviewed for its stunning animation.', reviews: [
          { score: 9, text: 'A stunning animated film.' },
          { score: 8, text: 'Visually breathtaking and emotionally rich.' },
          { score: 7, text: 'A magical, moving film.' }
        ]},
      ]}
    ];
    // Adjust reviewTexts: make 3/4 of the short ones medium-length, keep some short, and retain long reviews
    const reviewTexts = [
      // Short (keep a few)
      'Absolutely loved it!',
      'A must-experience for everyone.',
      'Not my cup of tea.',
      'Masterpiece!',
      'A bit overrated, but still good.',
      // Medium (expanded from short)
      'A brilliant and engaging story that kept me hooked from start to finish. Highly recommended for anyone looking for something new.',
      'A fun and entertaining experience with a strong cast and direction. I would definitely watch it again.',
      'A clever and witty script with memorable characters. The pacing was just right and the ending was satisfying.',
      'A deeply emotional story that explores important themes with nuance and care. The writing is sharp and the performances are top-notch.',
      'A visually stunning production with a rich and immersive world. The soundtrack was a highlight for me.',
      'A show with real heart and a compelling character study. I found myself invested in every episode.',
      'A fascinating look at the subject, full of insight and thought-provoking moments. I learned a lot.',
      'A must-listen for everyone interested in the topic. The host does a great job of keeping things engaging.',
      'A book that changed my life. The author’s perspective is unique and the message is powerful.',
      'A movie I’ll never forget. The story stayed with me long after the credits rolled.',
      'A podcast I recommend to everyone. The guests are always interesting and the discussions are meaningful.',
      'A song I play on repeat. The melody is catchy and the lyrics are relatable.',
      'A show I binge-watched in one night. The plot twists kept me guessing.',
      'A podcast that makes me think. The topics are always relevant and well-researched.',
      'A book that made me cry. The emotional depth is incredible.',
      'A movie that made me laugh. The humor is spot-on and never feels forced.',
      'A show that made me feel seen. The representation is authentic and important.',
      'A podcast that changed my mind. I appreciate the balanced perspectives.',
      'A song that brings back memories. It’s nostalgic and uplifting.',
      // Long (keep as before)
      'This book completely changed the way I think about life and relationships. The author weaves together complex themes with such grace and insight that I found myself reflecting on the story long after I finished reading. Every character felt real, and the emotional journey was both challenging and rewarding. Highly recommended for anyone looking for a deep, thought-provoking read.',
      'A stunning achievement in filmmaking. The director’s vision is clear in every frame, and the performances are nothing short of extraordinary. I was captivated from start to finish, and the story lingered with me for days. This is the kind of movie that reminds you why you love cinema in the first place.',
      'As a long-time fan of the genre, I was blown away by the depth and nuance in this show. The writing is sharp, the characters are multi-dimensional, and the pacing keeps you hooked. There are moments of genuine surprise and emotional resonance that elevate it above most of its peers. I can’t wait to see where the story goes next season.',
      'This podcast episode was a revelation. The host’s ability to draw out honest, vulnerable conversations from their guests is unmatched. I found myself pausing to take notes and reflect on my own experiences. It’s rare to find content that feels both entertaining and genuinely helpful, but this show manages to do both.',
      'A powerful, moving article that sheds light on an important issue. The author’s research is thorough, and their storytelling is compelling. I learned so much and came away with a new perspective. This is journalism at its best—informative, empathetic, and deeply impactful.'
    ];
    // Helper to generate a unique, varied title
    function generateUniqueTitle(baseTitle: string, usedTitles: Set<string>, category: string) {
      let newTitle = baseTitle;
      let suffixes = [
        ' (Special Edition)',
        ' - Remix',
        ' [2024]',
        ' (Collector’s Cut)',
        ' - Extended',
        ' (Fan Favorite)',
        ' - Alt Version',
        ' (Award Winner)',
        ' - Trending',
        ' (Editor’s Pick)',
        ' - Deluxe',
        ' (Spotlight)',
        ' - Limited',
        ' (Anniversary)',
        ' - Encore',
        ' (Revisited)',
        ' - New Wave',
        ' (Fresh Take)',
        ' - Vol. 2',
        ' (Unplugged)'
      ];
      let attempt = 0;
      while (usedTitles.has(newTitle)) {
        // Try appending a suffix or remixing
        const suffix = suffixes[attempt % suffixes.length] || ` (Unique ${attempt})`;
        newTitle = `${baseTitle}${suffix}`;
        attempt++;
      }
      usedTitles.add(newTitle);
      return newTitle;
    }
    // Assign unique reviews to each item and prepare unique titles
    let reviewIndex = 0;
    const usedTitlesByCategory: Record<string, Set<string>> = {};
    // Map to store unique titles for each item reference
    const itemUniqueTitles = new Map<any, string>();
    for (const cat of categories) {
      usedTitlesByCategory[cat.category] = new Set();
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
        // Assign a unique, varied title for each item and store in the map
        const uniqueTitle = generateUniqueTitle(item.item, usedTitlesByCategory[cat.category], cat.category);
        itemUniqueTitles.set(item, uniqueTitle);
      }
    }
    // --- Assign tasteboards so every user has at least 3 and at most 25 ---
    const minTasteboardsPerUser = 3;
    const maxTasteboardsPerUser = 25;
    const totalUsers = userRecords.length;
    let tasteboardAssignments = Array(totalUsers).fill(minTasteboardsPerUser);
    let totalTasteboards = 700;
    // Calculate how many tasteboards remain to assign randomly
    let remaining = totalTasteboards - (minTasteboardsPerUser * totalUsers);
    // Distribute remaining tasteboards randomly, but cap at max per user
    while (remaining > 0) {
      const idx = Math.floor(Math.random() * totalUsers);
      if (tasteboardAssignments[idx] < maxTasteboardsPerUser) {
        tasteboardAssignments[idx]++;
        remaining--;
      }
    }
    // Build a flat array of user indices for tasteboard creation
    const userAssignmentList = tasteboardAssignments.flatMap((count, idx) => Array(count).fill(idx));
    // Shuffle the userAssignmentList to randomize order
    for (let i = userAssignmentList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userAssignmentList[i], userAssignmentList[j]] = [userAssignmentList[j], userAssignmentList[i]];
    }
    // Generate tasteboards, using the API fetchers for thumbnails as before
    const tasteboards = await Promise.all(userAssignmentList.map(async (userIdx) => {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const item = cat.items[Math.floor(Math.random() * cat.items.length)];
      const user = userRecords[userIdx];
      // Pick a review for this item
      const review = item.reviews ? item.reviews[Math.floor(Math.random() * item.reviews.length)] : { score: 8, text: 'Interesting.' };
      // Use the original item title only
      const title = item.item;
      const data: any = {
        category: cat.category as any,
        item: title,
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
      } else if (cat.category === 'APP') {
        data.imageUrl = '/window.svg';
      }
      if (fetchedMeta && fetchedMeta.imageUrl) {
        data.imageUrl = fetchedMeta.imageUrl;
      } else if ((cat.category === 'MOVIE' || cat.category === 'SHOW') && !data.imageUrl) {
        data.imageUrl = '/file.svg';
      } else if ('imageUrl' in item && item.imageUrl) {
        data.imageUrl = item.imageUrl;
      }
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

    // At the end, print summary to console
    console.log({
      message: 'Seeded with real content',
      users: userRecords.length,
      tasteboards: tasteboards.length
    });
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

// Only run if executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  seed();
} 
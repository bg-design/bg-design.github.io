# Tasteful - Social Media App for Taste Sharing

A social media app where users can follow people and rate/share their favorite books, movies, shows, music, podcasts, and articles.

## Tech Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma
- **Authentication**: Supabase Auth (planned)

## Features

- ✅ User profiles and following system
- ✅ Tasteboard items (books, movies, shows, music, podcasts, articles)
- ✅ API routes for CRUD operations
- ✅ Modern UI with Tailwind CSS
- 🔄 Authentication (in progress)
- 🔄 Real-time updates (planned)
- 🔄 Rating system (planned)

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.kncxfvgmzmdiwksuiypi.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://kncxfvgmzmdiwksuiypi.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR-ANON-KEY]"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# (Optional) Open Prisma Studio to view/edit data
npx prisma studio
```

### 3. Development

```bash
# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## API Endpoints

### Tasteboards
- `GET /api/tasteboards` - Get all tasteboard items
- `POST /api/tasteboards` - Create a new tasteboard item

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user

### Follow System
- `POST /api/follow` - Follow/unfollow a user

## Database Schema

The app uses the following main models:

- **User**: User profiles with email, name, and avatar
- **Tasteboard**: Items that users rate/share (books, movies, etc.)
- **Follower**: Many-to-many relationship for following users

## Next Steps

1. Set up Supabase authentication
2. Add rating system to tasteboard items
3. Implement real-time updates
4. Add search and filtering
5. Create user profiles page
6. Add comments and likes

## Project Structure

```
tasteful/
├── components/          # React components
├── pages/              # Next.js pages and API routes
├── prisma/             # Database schema and migrations
├── styles/             # Global styles
└── public/             # Static assets
```

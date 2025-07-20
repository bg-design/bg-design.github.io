import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create sample users
    const user1 = await prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        email: 'john@example.com',
        name: 'John Doe',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
      }
    })

    const user2 = await prisma.user.upsert({
      where: { email: 'sarah@example.com' },
      update: {},
      create: {
        email: 'sarah@example.com',
        name: 'Sarah Smith',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
      }
    })

    const user3 = await prisma.user.upsert({
      where: { email: 'mike@example.com' },
      update: {},
      create: {
        email: 'mike@example.com',
        name: 'Mike Johnson',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
      }
    })

    // Create sample tasteboard items
    const tasteboards = await Promise.all([
      prisma.tasteboard.create({
        data: {
          category: 'BOOK',
          item: 'The Great Gatsby',
          userId: user1.id
        }
      }),
      prisma.tasteboard.create({
        data: {
          category: 'PODCAST',
          item: 'Serial',
          userId: user2.id
        }
      }),
      prisma.tasteboard.create({
        data: {
          category: 'MOVIE',
          item: 'Inception',
          userId: user1.id
        }
      }),
      prisma.tasteboard.create({
        data: {
          category: 'MUSIC',
          item: 'Blonde - Frank Ocean',
          userId: user3.id
        }
      }),
      prisma.tasteboard.create({
        data: {
          category: 'SHOW',
          item: 'Breaking Bad',
          userId: user2.id
        }
      }),
      prisma.tasteboard.create({
        data: {
          category: 'ARTICLE',
          item: 'The Psychology of Money',
          userId: user1.id
        }
      })
    ])

    // Create some follow relationships
    await Promise.all([
      prisma.follower.create({
        data: {
          followerId: user1.id,
          followeeId: user2.id
        }
      }),
      prisma.follower.create({
        data: {
          followerId: user2.id,
          followeeId: user1.id
        }
      }),
      prisma.follower.create({
        data: {
          followerId: user3.id,
          followeeId: user1.id
        }
      })
    ])

    res.status(200).json({ 
      message: 'Sample data created successfully',
      users: [user1, user2, user3],
      tasteboards: tasteboards.length
    })
  } catch (error) {
    console.error('Seed error:', error)
    res.status(500).json({ error: 'Failed to seed database' })
  }
} 
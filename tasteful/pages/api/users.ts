import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: {
            tasteboards: true,
            followers: true,
            following: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    res.status(200).json(users)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
} 
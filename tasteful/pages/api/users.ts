import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { q } = req.query;
    const where = q && typeof q === 'string' ? {
      OR: [
        { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: q, mode: Prisma.QueryMode.insensitive } },
      ]
    } : {};
    const users = await prisma.user.findMany({
      where,
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
import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { userId } = req.query
      
      const whereClause = userId ? { userId: userId as string } : {}
      
      const tasteboards = await prisma.tasteboard.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      res.status(200).json(tasteboards)
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasteboards' })
    }
  } else if (req.method === 'POST') {
    try {
      const { category, item, userId } = req.body
      const tasteboard = await prisma.tasteboard.create({
        data: {
          category,
          item,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      })
      res.status(201).json(tasteboard)
    } catch (error) {
      res.status(500).json({ error: 'Failed to create tasteboard' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 
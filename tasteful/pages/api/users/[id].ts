import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'User ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          bio: true,
          profilePhoto: true,
          _count: {
            select: {
              tasteboards: true,
              followers: true,
              following: true
            }
          }
        }
      })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      res.status(200).json(user)
    } catch (error) {
      console.error('User fetch error:', error)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  } else if (req.method === 'PATCH') {
    try {
      const { bio, profilePhoto } = req.body;
      const updated = await prisma.user.update({
        where: { id },
        data: {
          bio,
          profilePhoto
        }
      });
      res.status(200).json({ success: true, user: updated });
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PATCH'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 
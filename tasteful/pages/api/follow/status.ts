import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { followerId, followeeId } = req.query

  if (!followerId || !followeeId || typeof followerId !== 'string' || typeof followeeId !== 'string') {
    return res.status(400).json({ error: 'Both followerId and followeeId are required' })
  }

  try {
    const follow = await prisma.follower.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId
        }
      }
    })

    res.status(200).json({ isFollowing: !!follow })
  } catch (error) {
    console.error('Follow status check error:', error)
    res.status(500).json({ error: 'Failed to check follow status' })
  }
} 
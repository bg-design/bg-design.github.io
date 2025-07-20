import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { followerId, followeeId } = req.body
      
      const existingFollow = await prisma.follower.findUnique({
        where: {
          followerId_followeeId: {
            followerId,
            followeeId
          }
        }
      })

      if (existingFollow) {
        // Unfollow
        await prisma.follower.delete({
          where: {
            followerId_followeeId: {
              followerId,
              followeeId
            }
          }
        })
        res.status(200).json({ message: 'Unfollowed successfully' })
      } else {
        // Follow
        const follow = await prisma.follower.create({
          data: {
            followerId,
            followeeId
          }
        })
        res.status(201).json(follow)
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to follow/unfollow' })
    }
  } else {
    res.setHeader('Allow', ['POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 
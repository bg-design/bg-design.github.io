import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { email, name, avatarUrl } = req.body
      
      const user = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          name,
          avatarUrl
        }
      })
      
      res.status(200).json(user)
    } catch (error) {
      console.error('User creation error:', error)
      res.status(500).json({ error: 'Failed to create user' })
    }
  } else if (req.method === 'GET') {
    try {
      const { email } = req.query
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' })
      }
      
      const user = await prisma.user.findUnique({
        where: { email }
      })
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      
      res.status(200).json(user)
    } catch (error) {
      console.error('User fetch error:', error)
      res.status(500).json({ error: 'Failed to fetch user' })
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 
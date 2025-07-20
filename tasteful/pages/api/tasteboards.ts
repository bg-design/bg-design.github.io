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
      console.log('Tasteboard POST body:', req.body); // Debug log
      const { category, item, userId, author, year, snippet, imageUrl, reviewScore, reviewText } = req.body
      // Ensure year is a string if present
      const yearStr = year !== undefined && year !== null ? String(year) : undefined;
      const tasteboard = await prisma.tasteboard.create({
        data: {
          category,
          item,
          userId,
          author,
          year: yearStr,
          snippet,
          imageUrl,
          reviewScore,
          reviewText
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
      console.error('Tasteboard POST error:', error);
      res.status(500).json({ error: 'Failed to create tasteboard' })
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Tasteboard id is required' });
      }
      await prisma.tasteboard.delete({ where: { id } });
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete tasteboard' });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { id, reviewScore, reviewText } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'Tasteboard id is required' });
      }
      const updated = await prisma.tasteboard.update({
        where: { id },
        data: {
          reviewScore,
          reviewText
        }
      });
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update tasteboard review' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
} 
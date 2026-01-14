import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB Connection
const getMongoClient = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI not configured');
  }
  const client = new MongoClient(uri);
  await client.connect();
  return client;
};

/**
 * API Endpoint: /api/data
 * Methods: GET (fetch data), POST (save data)
 *
 * This endpoint handles all data operations for the resort management system
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await getMongoClient();
    const db = client.db('resort');
    const collection = db.collection('data');

    if (req.method === 'GET') {
      // Fetch latest data
      const data = await collection
        .find({})
        .sort({ lastSync: -1 })
        .limit(1)
        .toArray();

      await client.close();

      return res.status(200).json({
        success: true,
        data: data.length > 0 ? data[0] : null
      });
    }

    if (req.method === 'POST') {
      // Save new data
      const { transactions, bookings, settings } = req.body;

      const document = {
        transactions: transactions || [],
        bookings: bookings || [],
        settings: settings || {},
        lastSync: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      const result = await collection.insertOne(document);
      await client.close();

      return res.status(200).json({
        success: true,
        id: result.insertedId,
        message: 'Data saved successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

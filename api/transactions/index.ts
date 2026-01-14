import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';

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
 * API Endpoint: /api/transactions
 * Methods: GET (list), POST (create), PUT (update), DELETE (delete)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await getMongoClient();
    const db = client.db('resort');
    const transactions = db.collection('transactions');

    // GET: Fetch transactions
    if (req.method === 'GET') {
      const { type, category, startDate, endDate, limit = 100 } = req.query;

      const query: any = {};
      if (type) query.type = type;
      if (category) query.category = category;
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const transactionsList = await transactions
        .find(query)
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit as string))
        .toArray();

      await client.close();

      return res.status(200).json({
        success: true,
        data: transactionsList,
        count: transactionsList.length
      });
    }

    // POST: Create transaction
    if (req.method === 'POST') {
      const transactionData = req.body;

      const newTransaction = {
        ...transactionData,
        id: transactionData.id || `TX${Date.now()}`,
        isReconciled: transactionData.isReconciled || false,
        createdAt: new Date().toISOString()
      };

      const result = await transactions.insertOne(newTransaction);
      await client.close();

      return res.status(201).json({
        success: true,
        data: { ...newTransaction, _id: result.insertedId },
        message: 'Transaction created successfully'
      });
    }

    // PUT: Update transaction
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        await client.close();
        return res.status(400).json({ error: 'Transaction ID required' });
      }

      const result = await transactions.updateOne(
        { id: id as string },
        { $set: { ...updateData, updatedAt: new Date().toISOString() } }
      );

      await client.close();

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Transaction updated successfully'
      });
    }

    // DELETE: Delete transaction
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        await client.close();
        return res.status(400).json({ error: 'Transaction ID required' });
      }

      const result = await transactions.deleteOne({ id: id as string });
      await client.close();

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Transaction deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Transactions API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

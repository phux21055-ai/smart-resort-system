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
 * API Endpoint: /api/bookings
 * Methods: GET (list bookings), POST (create booking), PUT (update booking), DELETE (delete booking)
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
    const bookings = db.collection('bookings');

    // GET: Fetch all bookings
    if (req.method === 'GET') {
      const { status, roomNumber, startDate, endDate } = req.query;

      const query: any = {};
      if (status) query.status = status;
      if (roomNumber) query.roomNumber = roomNumber;
      if (startDate || endDate) {
        query.checkIn = {};
        if (startDate) query.checkIn.$gte = startDate;
        if (endDate) query.checkIn.$lte = endDate;
      }

      const bookingsList = await bookings
        .find(query)
        .sort({ checkIn: -1 })
        .toArray();

      await client.close();

      return res.status(200).json({
        success: true,
        data: bookingsList,
        count: bookingsList.length
      });
    }

    // POST: Create new booking
    if (req.method === 'POST') {
      const bookingData = req.body;

      const newBooking = {
        ...bookingData,
        id: `BK${Date.now()}`,
        status: bookingData.status || 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await bookings.insertOne(newBooking);
      await client.close();

      return res.status(201).json({
        success: true,
        data: { ...newBooking, _id: result.insertedId },
        message: 'Booking created successfully'
      });
    }

    // PUT: Update booking
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        await client.close();
        return res.status(400).json({ error: 'Booking ID required' });
      }

      const result = await bookings.updateOne(
        { id: id as string },
        {
          $set: {
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        }
      );

      await client.close();

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Booking updated successfully'
      });
    }

    // DELETE: Delete booking
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        await client.close();
        return res.status(400).json({ error: 'Booking ID required' });
      }

      const result = await bookings.deleteOne({ id: id as string });
      await client.close();

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Booking deleted successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Bookings API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}

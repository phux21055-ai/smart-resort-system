import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MongoClient } from 'mongodb';
import { validateBooking, checkRoomAvailability, sanitizeString } from '../../utils/validation';
import { requireAuth } from '../../middleware/auth';

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
 * Secured API Endpoint: /api/bookings/secure
 * With authentication, validation, and concurrency control
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await getMongoClient();
    const db = client.db('resort');
    const bookings = db.collection('bookings');

    // GET: Fetch all bookings (public)
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
        .limit(1000) // Prevent huge queries
        .toArray();

      await client.close();

      return res.status(200).json({
        success: true,
        data: bookingsList,
        count: bookingsList.length
      });
    }

    // POST: Create new booking (requires validation)
    if (req.method === 'POST') {
      const bookingData = req.body;

      // Sanitize string inputs
      if (bookingData.guestName) {
        bookingData.guestName = sanitizeString(bookingData.guestName);
      }

      // Validate booking data
      const validation = validateBooking(bookingData);
      if (!validation.valid) {
        await client.close();
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors
        });
      }

      // Check room availability (prevent double booking)
      const existingBookings = await bookings
        .find({ roomNumber: bookingData.roomNumber })
        .toArray();

      const availability = await checkRoomAvailability(
        bookingData.roomNumber,
        bookingData.checkIn,
        bookingData.checkOut,
        existingBookings
      );

      if (!availability.available) {
        await client.close();
        return res.status(409).json({
          success: false,
          error: 'Room not available',
          message: `Room ${bookingData.roomNumber} is already booked for these dates`,
          conflictingBooking: availability.conflictingBooking
        });
      }

      // Create booking
      const newBooking = {
        ...bookingData,
        id: `BK${Date.now()}`,
        status: bookingData.status || 'confirmed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await bookings.insertOne(newBooking);
      await client.close();

      // TODO: Send Line notification
      // await sendLineNotification(`✅ New booking: ${newBooking.guestName} - Room ${newBooking.roomNumber}`);

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

      // Sanitize string inputs
      if (updateData.guestName) {
        updateData.guestName = sanitizeString(updateData.guestName);
      }

      // If updating dates/room, check availability
      if (updateData.checkIn || updateData.checkOut || updateData.roomNumber) {
        const currentBooking = await bookings.findOne({ id: id as string });
        if (!currentBooking) {
          await client.close();
          return res.status(404).json({ error: 'Booking not found' });
        }

        const roomNumber = updateData.roomNumber || currentBooking.roomNumber;
        const checkIn = updateData.checkIn || currentBooking.checkIn;
        const checkOut = updateData.checkOut || currentBooking.checkOut;

        const existingBookings = await bookings
          .find({ roomNumber: roomNumber })
          .toArray();

        const availability = await checkRoomAvailability(
          roomNumber,
          checkIn,
          checkOut,
          existingBookings,
          id as string // Exclude current booking
        );

        if (!availability.available) {
          await client.close();
          return res.status(409).json({
            success: false,
            error: 'Room not available',
            message: 'Room is already booked for the requested dates',
            conflictingBooking: availability.conflictingBooking
          });
        }
      }

      // Update booking
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

// Wrap with authentication
export default requireAuth(handler);

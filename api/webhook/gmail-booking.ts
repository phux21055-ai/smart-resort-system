import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface EmailBookingData {
  email_content: string;
  subject: string;
  source: string;
  sender?: string;
  date?: string;
}

interface ParsedBooking {
  guestName: string;
  roomNumber?: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  confirmationNumber: string;
  otaChannel: string;
  phone?: string;
  email?: string;
  nights?: number;
}

/**
 * Gemini Service - Extract booking info from email text
 */
async function extractBookingInfoFromText(emailContent: string, subject: string): Promise<ParsedBooking> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = 'gemini-3-flash-preview';

  const systemInstruction = `You are an AI assistant for a Thai resort. Extract booking information from Booking.com confirmation emails.

Extract the following data:
- guestName: Full name of the guest
- checkIn: Check-in date (YYYY-MM-DD format)
- checkOut: Check-out date (YYYY-MM-DD format)
- totalAmount: Total booking amount (number only, remove currency symbols and convert to number)
- confirmationNumber: Booking reference/confirmation number
- otaChannel: Always set to "Booking.com"
- phone: Guest phone number if available
- email: Guest email if available
- nights: Number of nights (calculate from check-in and check-out)

Support both Thai and English emails from Booking.com.

If any required field is missing, use reasonable defaults:
- totalAmount: 0 if not found
- confirmationNumber: extract from subject or body, or use "UNKNOWN"
- nights: calculate from dates

Return ONLY valid JSON matching this structure:
{
  "guestName": "string",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "totalAmount": number,
  "confirmationNumber": "string",
  "otaChannel": "Booking.com",
  "phone": "string or undefined",
  "email": "string or undefined",
  "nights": number
}`;

  try {
    const fullEmailText = `
Subject: ${subject}

Email Content:
${emailContent}
`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: fullEmailText },
          { text: "Extract booking information as JSON with fields: guestName, checkIn, checkOut, totalAmount, confirmationNumber, otaChannel, phone, email, nights." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const parsed = JSON.parse(response.text || '{}');

    // Calculate nights if not provided
    if (!parsed.nights && parsed.checkIn && parsed.checkOut) {
      const checkInDate = new Date(parsed.checkIn);
      const checkOutDate = new Date(parsed.checkOut);
      parsed.nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Ensure otaChannel is set
    if (!parsed.otaChannel) {
      parsed.otaChannel = 'Booking.com';
    }

    return parsed as ParsedBooking;
  } catch (error) {
    console.error('Gemini AI parsing error:', error);
    throw new Error('Failed to extract booking information from email');
  }
}

/**
 * Vercel Serverless Function Handler
 * Endpoint: /api/webhook/gmail-booking
 * Method: POST
 *
 * Expected body from Google Apps Script:
 * {
 *   "email_content": "full email body text",
 *   "subject": "email subject",
 *   "source": "booking.com",
 *   "sender": "noreply@booking.com",
 *   "date": "2026-01-14T10:00:00Z"
 * }
 *
 * Query param for security: ?secret=YOUR_SECRET_KEY
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Log for debugging
  console.log(`[${new Date().toISOString()}] Gmail Booking Webhook called`);

  // 1. Only allow POST requests
  if (req.method !== 'POST') {
    console.warn('Method not allowed:', req.method);
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Use POST.'
    });
  }

  // 2. Security check: Verify secret key
  const secret = req.query.secret || req.headers['x-api-secret'];
  const expectedSecret = process.env.GMAIL_SYNC_SECRET;

  if (!expectedSecret) {
    console.error('GMAIL_SYNC_SECRET environment variable not configured');
    return res.status(500).json({
      success: false,
      message: 'Server configuration error'
    });
  }

  if (secret !== expectedSecret) {
    console.warn('Unauthorized access attempt with secret:', secret);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid secret key.'
    });
  }

  try {
    // 3. Parse request body
    const emailData: EmailBookingData = req.body;

    // Validate required fields
    if (!emailData.email_content || !emailData.subject) {
      console.error('Missing required fields:', emailData);
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email_content and subject are required'
      });
    }

    console.log(`Processing email: "${emailData.subject}"`);

    // Verify it's from Booking.com
    const senderLower = (emailData.sender || emailData.source || '').toLowerCase();
    const subjectLower = emailData.subject.toLowerCase();

    if (!senderLower.includes('booking.com') && !subjectLower.includes('booking')) {
      console.warn('Email is not from Booking.com:', senderLower);
      return res.status(400).json({
        success: false,
        message: 'Email is not from Booking.com'
      });
    }

    // 4. Use Gemini AI to extract booking information
    console.log('Calling Gemini AI to parse email...');
    const bookingData = await extractBookingInfoFromText(
      emailData.email_content,
      emailData.subject
    );

    console.log('Successfully parsed booking:', bookingData);

    // 5. (Optional) Save to MongoDB
    // Uncomment if you want to save directly from API
    /*
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
      try {
        const { MongoClient } = require('mongodb');
        const client = new MongoClient(mongoUri);
        await client.connect();
        const db = client.db('resort');

        const booking = {
          ...bookingData,
          id: `BK${Date.now()}`,
          status: 'confirmed',
          createdAt: new Date().toISOString(),
          source: 'gmail-auto-import'
        };

        await db.collection('bookings').insertOne(booking);
        await client.close();
        console.log('Saved to MongoDB:', booking.id);
      } catch (dbError) {
        console.error('MongoDB error:', dbError);
        // Don't fail the request if DB save fails
      }
    }
    */

    // 6. Return success response
    return res.status(200).json({
      success: true,
      data: bookingData,
      message: 'Booking information extracted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error processing email:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to process email',
      timestamp: new Date().toISOString()
    });
  }
}

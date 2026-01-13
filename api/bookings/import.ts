import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

interface EmailBookingData {
  subject: string;
  body: string;
  from: string;
  date: string;
  attachments?: string[];
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

// Parse booking email using Gemini AI
async function parseBookingEmail(emailData: EmailBookingData): Promise<ParsedBooking> {
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
- totalAmount: Total booking amount (number only, remove currency symbols)
- confirmationNumber: Booking reference/confirmation number
- otaChannel: Always "Booking.com"
- phone: Guest phone number if available
- email: Guest email if available
- nights: Number of nights

If any required field is missing, use reasonable defaults:
- totalAmount: 0 if not found
- confirmationNumber: generate from subject line or use "UNKNOWN"

Return ONLY valid JSON matching the ParsedBooking interface.`;

  try {
    const emailContent = `
Subject: ${emailData.subject}
From: ${emailData.from}
Date: ${emailData.date}

Body:
${emailData.body}
`;

    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: emailContent },
          { text: "Extract booking information as JSON." }
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

    return parsed as ParsedBooking;
  } catch (error) {
    console.error('Gemini parsing error:', error);
    throw new Error('Failed to parse booking email');
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify secret key to prevent unauthorized access
  const secret = req.headers['x-api-secret'] as string;
  if (secret !== process.env.GMAIL_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const emailData: EmailBookingData = req.body;

    if (!emailData.subject || !emailData.body || !emailData.from) {
      return res.status(400).json({ error: 'Missing required email data' });
    }

    // Verify email is from Booking.com
    if (!emailData.from.toLowerCase().includes('booking.com')) {
      return res.status(400).json({ error: 'Email is not from Booking.com' });
    }

    // Parse booking using Gemini AI
    const booking = await parseBookingEmail(emailData);

    // Return parsed booking data
    return res.status(200).json({
      success: true,
      booking,
      processedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Booking import error:', error);
    return res.status(500).json({
      error: 'Failed to process booking email',
      message: error.message
    });
  }
}

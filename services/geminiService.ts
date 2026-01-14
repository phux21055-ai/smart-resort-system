
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, TransactionType, Category, GuestData } from "../types";

// Initialize AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processReceiptOCR = async (base64Image: string, intent: 'INCOME' | 'EXPENSE' | 'GENERAL' = 'GENERAL'): Promise<OCRResult> => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';

  const systemInstruction = `You are a professional accountant for a high-end resort in Thailand.
  Task: Extract financial data from receipt/slip images.
  Intent: ${intent}.

  Classification Logic:
  - INCOME: Receipts issued by the resort to guests (room fees, food, spa).
  - EXPENSE: Invoices/slips from suppliers (7-11, utilities, payroll).

  Available Categories (Thai):
  Income: 'ค่าห้องพัก', 'อาหารและเครื่องดื่ม', 'สปาและนวด', 'รายได้อื่นๆ'
  Expense: 'ค่าสาธารณูปโภค (น้ำ/ไฟ/เน็ต)', 'เงินเดือนและค่าแรง', 'การตลาด/ค่าคอมมิชชั่น OTA', 'ค่าซ่อมบำรุง', 'วัสดุอุปกรณ์/เครื่องใช้', 'ภาษีและค่าธรรมเนียม', 'ค่าซอฟต์แวร์/แอปพลิเคชัน', 'วัสดุสำนักงาน', 'วัสดุทำความสะอาด'

  Return ONLY valid JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "Extract details into JSON: date (YYYY-MM-DD), amount (number), type (INCOME/EXPENSE), category (from list), description (string), confidence (0-1)." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as OCRResult;
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("AI could not process this image. Please ensure it's a clear financial document.");
  }
};

export const processIDCardOCR = async (base64Image: string): Promise<GuestData> => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';

  const systemInstruction = `คุณคือผู้ช่วยจัดการฟรอนต์รีสอร์ต หน้าที่ของคุณคือดึงข้อมูลจากรูปถ่ายบัตรประชาชนไทยอย่างละเอียด
  กฎการดึงข้อมูล:
  1. แปลงปี พ.ศ. เป็น ค.ศ. (เช่น 2530 -> 1987)
  2. idNumber ต้องเป็นตัวเลข 13 หลัก
  3. แยก Title (นาย/นาง/นส), firstNameTH, lastNameTH ออกจากกัน
  4. ดึงข้อมูลที่อยู่ (address) ให้ครบถ้วนที่สุด
  5. nationality มักเป็น "ไทย"
  6. occupation ให้คาดเดาจากข้อมูล (ถ้าไม่มีให้ใส่ "รับจ้าง" หรือ "ทั่วไป")`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "ดึงข้อมูลจากบัตรประชาชนในรูปนี้เป็น JSON ตามโครงสร้างที่กำหนด" }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            idNumber: { type: Type.STRING },
            title: { type: Type.STRING },
            firstNameTH: { type: Type.STRING },
            lastNameTH: { type: Type.STRING },
            firstNameEN: { type: Type.STRING },
            lastNameEN: { type: Type.STRING },
            address: { type: Type.STRING },
            dob: { type: Type.STRING, description: 'Format YYYY-MM-DD (AD)' },
            issueDate: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            nationality: { type: Type.STRING },
            religion: { type: Type.STRING },
            occupation: { type: Type.STRING }
          },
          required: ['idNumber', 'firstNameTH', 'lastNameTH', 'address']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result as GuestData;
  } catch (error) {
    console.error("ID OCR Error:", error);
    throw new Error("ไม่สามารถอ่านข้อมูลจากบัตรได้ กรุณาถ่ายรูปให้ชัดเจนขึ้น");
  }
};

export interface EmailBookingData {
  subject: string;
  body: string;
  from: string;
  date: string;
}

export interface ParsedBooking {
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

export const parseBookingEmail = async (emailData: EmailBookingData): Promise<ParsedBooking> => {
  const ai = getAI();
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

Return ONLY valid JSON.`;

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
          { text: "Extract booking information as JSON with fields: guestName, checkIn (YYYY-MM-DD), checkOut (YYYY-MM-DD), totalAmount (number), confirmationNumber, otaChannel, phone, email, nights." }
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
    console.error("Booking Email Parse Error:", error);
    throw new Error("Failed to parse booking email. Please check the email content.");
  }
};

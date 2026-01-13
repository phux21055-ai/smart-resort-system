# Gmail Auto-Import Setup Guide

คู่มือการติดตั้งระบบ Auto-Import การจองจาก Booking.com ผ่าน Gmail

## 📋 ข้อกำหนดเบื้องต้น

- บัญชี Gmail ที่รับอีเมลจาก Booking.com
- โปรเจกต์ Deploy บน Vercel แล้ว
- API Keys: MongoDB และ Gemini AI

---

## 🚀 ขั้นตอนการติดตั้ง

### Step 1: Deploy โปรเจกต์ไปยัง Vercel

```bash
cd "C:\Users\innos\Downloads\smart-resort-accounting-(ocr) (6)"
vercel --prod
```

**หมายเหตุ:** บันทึก URL ที่ได้ เช่น `https://your-domain.vercel.app`

---

### Step 2: ตั้งค่า Environment Variables ใน Vercel

เข้าไปที่ Vercel Dashboard → Project Settings → Environment Variables

เพิ่มตัวแปรต่อไปนี้:

| Variable Name | Value | Example |
|--------------|-------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `GEMINI_API_KEY` | Gemini AI API key | `AIzaSy...` |
| `GMAIL_SYNC_SECRET` | Random secret key (สร้างใหม่) | `gmail_sync_2026_xyz123` |

**วิธีสร้าง Secret Key:**
```bash
# Windows PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})

# หรือใช้ online tool
# https://randomkeygen.com/
```

หลังจากเพิ่ม Environment Variables แล้ว ให้ **Redeploy** โปรเจกต์:
```bash
vercel --prod
```

---

### Step 3: ตรวจสอบ API Endpoint

ทดสอบว่า API ทำงาน:

```bash
curl -X POST "https://your-domain.vercel.app/api/webhook/gmail-booking?secret=YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "email_content": "Booking confirmation for John Doe. Check-in: 2026-01-20. Check-out: 2026-01-22. Total: THB 3000. Confirmation: TEST123",
    "subject": "Booking Confirmation",
    "source": "booking.com",
    "sender": "noreply@booking.com"
  }'
```

**ผลลัพธ์ที่คาดหวัง:**
```json
{
  "success": true,
  "data": {
    "guestName": "John Doe",
    "checkIn": "2026-01-20",
    "checkOut": "2026-01-22",
    "totalAmount": 3000,
    "confirmationNumber": "TEST123",
    "otaChannel": "Booking.com"
  }
}
```

---

### Step 4: ตั้งค่าใน Resort System

1. เปิดระบบ Smart Resort ที่ URL: `https://your-domain.vercel.app`
2. ไปที่เมนู **PMS Integration**
3. ในส่วน **Gmail Auto-Import** คลิก **"ตั้งค่า"**
4. กรอกข้อมูล:
   - **API Endpoint URL:** `https://your-domain.vercel.app/api/webhook/gmail-booking`
   - **API Secret Key:** ใช้ค่าเดียวกับที่ตั้งใน Vercel (`GMAIL_SYNC_SECRET`)
5. คลิก **"บันทึกการตั้งค่า"**
6. คลิก **"📋 คัดลอกโค้ด"** เพื่อคัดลอก Google Apps Script

---

### Step 5: ตั้งค่า Google Apps Script

#### 5.1 สร้าง Project ใหม่

1. ไปที่ [https://script.google.com](https://script.google.com)
2. คลิก **"New Project"**
3. ตั้งชื่อโปรเจกต์: `Resort Gmail Sync`

#### 5.2 วางโค้ด

1. ลบโค้ดเดิมทั้งหมดออก
2. วางโค้ดที่คัดลอกมาจากระบบ (หรือใช้ไฟล์ `google-apps-script-webhook.js`)
3. **สำคัญ:** แก้ไขค่าต่อไปนี้ในโค้ด:

```javascript
const API_BASE_URL = 'https://your-domain.vercel.app';  // ← เปลี่ยนเป็น URL จริง
const API_SECRET = 'gmail_sync_2026_xyz123';            // ← เปลี่ยนเป็น secret จริง
```

4. บันทึก (Ctrl+S หรือ File → Save)

#### 5.3 ทดสอบการทำงาน

1. เลือกฟังก์ชัน `testConfiguration` จาก dropdown
2. คลิก **Run** (▶️)
3. **ครั้งแรก:** จะขออนุญาต Gmail permissions
   - คลิก **Review Permissions**
   - เลือกบัญชี Gmail
   - คลิก **Advanced** → **Go to Resort Gmail Sync (unsafe)**
   - คลิก **Allow**
4. ดูผลลัพธ์ใน **Execution log** (ด้านล่าง)

**ผลลัพธ์ที่ดี:**
```
✅ Gmail access OK - Found X email(s)
✅ API connection OK
```

#### 5.4 ตั้ง Trigger (Auto-run)

1. คลิกไอคอน **นาฬิกา** (Triggers) ที่ sidebar ซ้าย
2. คลิก **+ Add Trigger** (ล่างขวา)
3. ตั้งค่าดังนี้:
   - **Choose which function to run:** `syncBookingEmails`
   - **Select event source:** `Time-driven`
   - **Select type of time based trigger:** `Minutes timer`
   - **Select minute interval:** `Every 5 minutes` หรือ `Every 10 minutes`
4. คลิก **Save**
5. ยืนยัน permissions อีกครั้งถ้าถูกถาม

---

### Step 6: ทดสอบระบบจริง

#### วิธีที่ 1: ใช้อีเมลจริงจาก Booking.com

1. ค้นหาอีเมล Booking.com ในกล่องจดหมาย Gmail
2. **ทำให้เป็น Unread** (Mark as unread)
3. รอ 5-10 นาที (ตาม trigger interval)
4. ตรวจสอบผลลัพธ์:
   - **Gmail:** อีเมลจะถูก mark as read และมี label "Resort/Processed"
   - **Google Apps Script:** ดู Executions log (ไอคอนนาฬิกา → Executions)
   - **Resort System:** ไปที่ PMS Integration → ดูประวัติการนำเข้า

#### วิธีที่ 2: ทดสอบด้วยฟังก์ชัน Manual

ใน Google Apps Script:

```javascript
// ทดสอบประมวลผล 1 อีเมล
function processOneEmail() {
  // จะเลือกอีเมล unread จาก Booking.com อันแรก
}
```

1. เลือกฟังก์ชัน `processOneEmail`
2. คลิก **Run**
3. ดูผลใน Execution log

#### วิธีที่ 3: ทดสอบกับอีเมลเฉพาะ

```javascript
testWithEmailSubject("confirmation")  // ค้นหาอีเมลที่มีคำว่า confirmation
```

---

## 📊 ตรวจสอบสถานะการทำงาน

### ใน Resort System

1. ไปที่ **PMS Integration**
2. ดูส่วน **Gmail Auto-Import**
   - **สถิติ:** นำเข้าทั้งหมด / สำเร็จ / ล้มเหลว
   - **ประวัติ:** รายการที่นำเข้าล่าสุด

### ใน Google Apps Script

1. คลิกไอคอน **นาฬิกา** (Triggers)
2. คลิก **Executions**
3. ดู log ของการรันแต่ละครั้ง

### ใน Gmail

- อีเมลที่ประมวลผลแล้วจะ:
  - ✅ Mark as read
  - 🏷️ มี label "Resort/Processed"

---

## 🛠️ Troubleshooting

### ❌ Problem: API returns 401 Unauthorized

**สาเหตน:** Secret key ไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบ `GMAIL_SYNC_SECRET` ใน Vercel
2. ตรวจสอบ `API_SECRET` ใน Google Apps Script
3. ต้องเหมือนกันทุกตัวอักษร (case-sensitive)

### ❌ Problem: API returns 500 Internal Server Error

**สาเหตน:** Gemini API key ไม่ถูกต้องหรือหมดโควต้า

**วิธีแก้:**
1. ตรวจสอบ `GEMINI_API_KEY` ใน Vercel
2. ทดสอบ API key ที่ [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
3. ตรวจสอบโควต้าการใช้งาน

### ❌ Problem: Gmail permission denied

**วิธีแก้:**
1. ใน Google Apps Script → Settings (⚙️)
2. Show "appsscript.json" manifest file in editor: **เปิด**
3. เพิ่ม scopes:
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.labels"
  ]
}
```
4. บันทึกและรัน `testConfiguration` อีกครั้ง

### ❌ Problem: ไม่มีการประมวลผลอีเมล

**ตรวจสอบ:**
1. Trigger ถูกตั้งค่าแล้วหรือไม่? (ไอคอนนาฬิกา → Triggers)
2. อีเมลเป็น **unread** และมาจาก **booking.com** หรือไม่?
3. ดู Executions log มี error อะไรบ้าง

### ❌ Problem: Gemini AI แยกข้อมูลผิด

**วิธีแก้:**
1. ส่งตัวอย่างอีเมลที่แยกผิดมาดู
2. ปรับ system instruction ใน `api/webhook/gmail-booking.ts`
3. Redeploy: `vercel --prod`

---

## 📄 ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | คำอธิบาย |
|------|----------|
| `api/webhook/gmail-booking.ts` | Vercel API endpoint (รับข้อมูลจาก Gmail) |
| `api/bookings/import.ts` | Legacy API endpoint (รูปแบบเดิม) |
| `components/GmailSync.tsx` | UI component สำหรับตั้งค่า |
| `google-apps-script-webhook.js` | Google Apps Script (Webhook version) |
| `google-apps-script.js` | Google Apps Script (Legacy version) |
| `services/geminiService.ts` | Gemini AI service (แยกข้อมูล) |
| `vercel.json` | Vercel configuration |

---

## 🔗 API Endpoints

### Webhook Endpoint (แนะนำ)

**URL:** `POST /api/webhook/gmail-booking?secret=YOUR_SECRET`

**Headers:**
```
Content-Type: application/json
X-Api-Secret: YOUR_SECRET
```

**Body:**
```json
{
  "email_content": "full email body text",
  "subject": "email subject line",
  "source": "booking.com",
  "sender": "noreply@booking.com",
  "date": "2026-01-14T10:00:00Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "guestName": "John Doe",
    "checkIn": "2026-01-20",
    "checkOut": "2026-01-22",
    "totalAmount": 3000,
    "confirmationNumber": "ABC123",
    "otaChannel": "Booking.com",
    "nights": 2
  },
  "timestamp": "2026-01-14T10:05:00Z"
}
```

---

## 🎯 ข้อดีของระบบนี้

✅ **อัตโนมัติ 100%** - ไม่ต้องนำเข้าข้อมูลด้วยตนเอง
✅ **Real-time** - ประมวลผลทุก 5-10 นาที
✅ **AI-Powered** - ใช้ Gemini AI แยกข้อมูลอัจฉริยะ
✅ **ปลอดภัย** - มี Secret Key ป้องกัน
✅ **ฟรี** - ไม่มีค่าใช้จ่ายเพิ่ม (ใช้ Google Apps Script ฟรี)
✅ **รองรับหลายภาษา** - ทั้งไทยและอังกฤษ

---

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือข้อสงสัย สามารถตรวจสอบ:
- Execution logs ใน Google Apps Script
- Logs ใน Vercel Dashboard → Functions
- ประวัติการนำเข้าใน PMS Integration page

---

**Happy Automating! 🚀**
